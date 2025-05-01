import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { mcpEvaClient } from "./mcpClient"; // Import the MCP client instance
import http from "http";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        const logMessage = `${req.method} ${path} ${duration}ms ${
          capturedJsonResponse ? JSON.stringify(capturedJsonResponse) : ""
        }`;
        log(logMessage);
      }
    });

    next();
  });

  registerRoutes(app);

  // Conectar ao cliente MCP EVA
  try {
    await mcpEvaClient.connect();
    log("[Server] Conexão com o servidor MCP EVA estabelecida.");
  } catch (error) {
    log(`[Server] Falha ao conectar ao servidor MCP EVA: ${error}`);
    // Decidir se o servidor deve continuar rodando sem a conexão MCP
    // Por enquanto, vamos logar o erro e continuar
  }

  const server = http.createServer(app);

  setupVite(app, server);

  server.listen(9002, () => {
    log(`Server started at http://localhost:9002`);
  });
}

startServer(); // Chamar a função assíncrona
