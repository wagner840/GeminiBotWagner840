import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types";
import { spawn, type ChildProcess } from "child_process";
import { log } from "./vite";
import { ZodError } from "zod";
import path from "path"; // Import the path module
import { fileURLToPath } from 'url'; // Import fileURLToPath
import { dirname } from 'path'; // Import dirname

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// --- Configuration ---
const EVA_SERVER_COMMAND = "node";
// Construct the path to the EVA server index.js using path.join
const EVA_SERVER_ARGS = [
  path.join(__dirname, "..", "mcp-perenual-eva", "custom-server", "index.js"),
];
// ---------------------

class McpEvaClient {
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private serverProcess: ChildProcess | null = null;
  private _isConnected = false; // Internal state for connection status
  private connectionPromise: Promise<void> | null = null;

  constructor() {
    this.client = new Client({
      name: "chatbot-backend-client",
      version: "1.0.0",
      capabilities: {
        // Declare client capabilities if needed
      },
    });
  }

  // Public getter for connection status
  get isConnected(): boolean {
    return this._isConnected;
  }

  private startServerProcess(): ChildProcess {
    log(
      `[MCP Client] Spawning EVA server: ${EVA_SERVER_COMMAND} ${EVA_SERVER_ARGS.join(
        " "
      )}`
    );
    const serverProcess = spawn(EVA_SERVER_COMMAND, EVA_SERVER_ARGS, {
      stdio: ["pipe", "pipe", "pipe"], // stdin, stdout, stderr
    });

    serverProcess.stderr?.on("data", (data) => {
      log(`[EVA Server STDERR] ${data.toString().trim()}`);
    });

    serverProcess.on("error", (err) => {
      log(`[MCP Client] Failed to start EVA server process: ${err.message}`);
      this._isConnected = false; // Update status on error
      this.connectionPromise = null;
      this.serverProcess = null;
    });

    serverProcess.on("exit", (code, signal) => {
      log(
        `[MCP Client] EVA server process exited with code ${code}, signal ${signal}`
      );
      this._isConnected = false; // Update status on exit
      this.transport = null;
      this.serverProcess = null;
      this.connectionPromise = null;
    });

    return serverProcess;
  }

  async connect(): Promise<void> {
    if (this._isConnected) {
      log("[MCP Client] Already connected.");
      return;
    }
    if (this.connectionPromise) {
      log("[MCP Client] Connection already in progress.");
      return this.connectionPromise;
    }

    log("[MCP Client] Attempting to connect to EVA server...");
    this.connectionPromise = (async () => {
      try {
        this.serverProcess = this.startServerProcess();

        if (!this.serverProcess.stdin || !this.serverProcess.stdout) {
          throw new Error(
            "Server process stdin/stdout is not available after spawn."
          );
        }

        this.transport = new StdioClientTransport({
          command: EVA_SERVER_COMMAND,
          args: EVA_SERVER_ARGS,
        });

        await this.client.connect(this.transport);
        log("[MCP Client] Transport connected. MCP session initialized.");

        this._isConnected = true; // Update status on successful connection
        log("[MCP Client] Connection to EVA server successful.");
      } catch (error) {
        log(
          `[MCP Client] Connection failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        this._isConnected = false; // Ensure status is false on failure
        this.serverProcess?.kill();
        this.serverProcess = null;
        this.transport = null;
        this.connectionPromise = null;
        // Do NOT re-throw the error here. The server should handle the connection failure gracefully.
      }
    })();

    return this.connectionPromise;
  }

  /**
   * Calls a tool provided by the connected MCP server.
   * Returns a specific error result if the client is not connected.
   * @param toolName The name of the tool to call.
   * @param args The arguments for the tool, conforming to the tool's input schema.
   * @returns The result of the tool call or an error result if not connected.
   */
  async callTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<CallToolResult> {
    if (!this._isConnected) {
      log(
        `[MCP Client] Attempted to call tool '${toolName}' but client is not connected.`
      );
      // Return a predefined error result instead of throwing
      return {
        content: [
          {
            type: "text",
            text: "O serviço de processamento avançado (MCP) não está disponível no momento.",
          },
        ],
        isError: true,
        _meta: {
          error: "MCP_NOT_CONNECTED",
          message: "MCP client is not connected.",
        },
      } as CallToolResult;
    }

    // Ensure connection is fully established if it's in progress
    if (this.connectionPromise) {
      await this.connectionPromise;
      if (!this._isConnected) {
        // Re-check after waiting for connection promise
        log(
          `[MCP Client] Attempted to call tool '${toolName}' after waiting for connection, but client is still not connected.`
        );
        return {
          content: [
            {
              type: "text",
              text: "O serviço de processamento avançado (MCP) não está disponível no momento.",
            },
        ],
          isError: true,
          _meta: {
            error: "MCP_NOT_CONNECTED_AFTER_WAIT",
            message:
              "MCP client is not connected after waiting for connection promise.",
          },
        } as CallToolResult;
      }
    }

    log(
      `[MCP Client] Calling tool '${toolName}' with args: ${JSON.stringify(
        args
      )}`
    );
    try {
      const result = await this.client.callTool({
        name: toolName,
        arguments: args,
      });
      log(`[MCP Client] Result for '${toolName}': ${JSON.stringify(result)}`);
      return result as CallToolResult;
    } catch (error) {
      log(
        `[MCP Client] Error calling '${toolName}': ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      if (
        error instanceof ZodError &&
        error.issues.some(
          (issue) =>
            issue.path.join(".") === "content" &&
            issue.code === "invalid_type" &&
            issue.received === "undefined"
        )
      ) {
        log(
          `[MCP Client] Caught ZodError for missing 'content' during ${toolName} call. Formatting a custom error result.`
        );
        return {
          content: [
            {
              type: "text",
              text: `Erro ao processar a resposta da ferramenta '${toolName}'.`,
            },
          ],
          isError: true,
          _meta: {},
        } as CallToolResult;
      }
      // For other errors during tool call, re-throw or return a generic error result
      // Decided to return a generic error result for consistency when MCP is available but tool call fails
      return {
        content: [
          {
            type: "text",
            text: `Ocorreu um erro ao usar a ferramenta '${toolName}'.`,
          },
        ],
          isError: true,
          _meta: {
            error: "TOOL_CALL_FAILED",
            message: error instanceof Error ? error.message : String(error),
          },
        } as CallToolResult;
    }
  }

  async disconnect(): Promise<void> {
    if (this._isConnected) {
      log("[MCP Client] Disconnecting client...");
      try {
        await this.client.close();
        log("[MCP Client] Client closed.");
      } catch (error) {
        log(
          `[MCP Client] Error closing client: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      } finally {
        this.transport = null;
        this._isConnected = false; // Update status on disconnect
      }
    }

    if (this.serverProcess) {
      log("[MCP Client] Terminating originally spawned EVA server process...");
      try {
        const killed = this.serverProcess.kill();
        if (killed) {
          log("[MCP Client] Originally spawned EVA server process terminated.");
        } else {
          log(
            "[MCP Client] Failed to terminate originally spawned EVA server process (maybe already exited?)."
          );
        }
      } catch (error) {
        log(
          `[MCP Client] Error killing originally spawned server process: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      } finally {
        this.serverProcess = null;
      }
    } else {
      log(
        "[MCP Client] No originally spawned server process reference to terminate."
      );
    }

    this.connectionPromise = null;
    log("[MCP Client] Disconnect routine finished.");
  }
}

// Export a singleton instance
export const mcpEvaClient = new McpEvaClient();
