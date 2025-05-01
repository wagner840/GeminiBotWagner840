import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
// Removido tipo específico para argumentos, usaremos Record<string, unknown>
import type { CallToolResult } from "@modelcontextprotocol/sdk/types";
import { spawn, type ChildProcess } from "child_process";
import { log } from "./vite"; // Assuming log function is available for logging
import { ZodError } from "zod"; // Import ZodError

// --- Configuration ---
const EVA_SERVER_COMMAND = "node";
const EVA_SERVER_ARGS = [
  "W:\\mcp-perenual-eva\\mcp-perenual-eva\\custom-server\\index.js",
];
// ---------------------

class McpEvaClient {
  private client: Client;
  private transport: StdioClientTransport | null = null;
  private serverProcess: ChildProcess | null = null;
  private isInitialized = false;
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
      this.isInitialized = false;
      this.connectionPromise = null;
      this.serverProcess = null;
    });

    serverProcess.on("exit", (code, signal) => {
      log(
        `[MCP Client] EVA server process exited with code ${code}, signal ${signal}`
      );
      this.isInitialized = false;
      this.transport = null;
      this.serverProcess = null;
      this.connectionPromise = null;
    });

    return serverProcess;
  }

  async connect(): Promise<void> {
    if (this.isInitialized) {
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

        this.isInitialized = true;
        log("[MCP Client] Connection to EVA server successful.");
      } catch (error) {
        log(
          `[MCP Client] Connection failed: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        this.isInitialized = false;
        this.serverProcess?.kill();
        this.serverProcess = null;
        this.transport = null;
        this.connectionPromise = null;
        throw error;
      }
    })();

    return this.connectionPromise;
  }

  private async ensureConnected(): Promise<void> {
    if (!this.isInitialized) {
      if (this.connectionPromise) {
        await this.connectionPromise;
      } else {
        await this.connect();
      }
    }
    if (!this.isInitialized) {
      throw new Error("MCP Client is not connected to the EVA server.");
    }
  }

  /**
   * Calls a tool provided by the connected MCP server.
   * @param toolName The name of the tool to call.
   * @param args The arguments for the tool, conforming to the tool's input schema.
   * @returns The result of the tool call.
   */
  // Corrigido: Usar Record<string, unknown> para os argumentos
  async callTool(
    toolName: string,
    args: Record<string, unknown>
  ): Promise<CallToolResult> {
    await this.ensureConnected();
    log(
      `[MCP Client] Calling tool '${toolName}' with args: ${JSON.stringify(
        args
      )}`
    );
    try {
      // O tipo de 'arguments' aqui é inferido pela chamada,
      // e Record<string, unknown> é compatível com o que o SDK espera (um objeto JSON).
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
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isInitialized) {
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
        this.isInitialized = false;
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
