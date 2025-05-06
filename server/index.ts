import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { mcpEvaClient } from "./mcpClient"; // Import the MCP client instance
import http from "http";
import { MemStorage } from "./storage";

import { User, InsertUser } from "@shared/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, ".env") });

log("[Server] Gemini API Key from .env: " + process.env.GEMINI_API_KEY);

// Export a singleton instance
export const storage = new MemStorage(process.env.GEMINI_API_KEY || "");

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson: any, ...args: any) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson]);
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

  // --- Conectar ao cliente MCP EVA (CONDICIONAL) ---
  // Lê a variável de ambiente para decidir se desativa a MCP
  const disableMcp =
    process.env.DISABLE_MCP === "true" || process.env.DISABLE_MCP === "1";

  if (disableMcp) {
    log("[Server] MCP está desativada pela variável de ambiente DISABLE_MCP.");
    // Não tenta conectar se a MCP estiver desativada
  } else {
    try {
      await mcpEvaClient.connect();
      log("[Server] Conexão com o servidor MCP EVA estabelecida.");
    } catch (error) {
      log(`[Server] Falha ao conectar ao servidor MCP EVA: ${error}`);
      log("[Server] O chatbot continuará funcionando sem o serviço MCP.");
      // O servidor continua rodando mesmo se a conexão MCP falhar
    }
  }
  // --- Fim da Conexão Condicional ---


  const server = http.createServer(app);

  setupVite(app, server);

  server.listen(9002, () => {
    log(`Server started at http://localhost:9002`);
  });
}

startServer(); // Chamar a função assíncrona
