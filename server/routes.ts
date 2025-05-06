import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./index";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (_req, file, cb) => {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
      // Case-insensitive match
      // Use Error object for consistency
      return cb(
        new Error(
          "Apenas arquivos de imagem (jpg, jpeg, png, gif) são permitidos!"
        )
      );
    }
    cb(null, true);
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Simple in-memory cache for plant details - No longer needed as Perenual API is not directly used
  // const plantDetailsCache: { [key: string]: any } = {};
  // const CACHE_TTL = 60 * 60 * 1000; // Cache for 1 hour (in milliseconds)

  // Create conversations endpoint
  app.post("/api/chat/conversation", async (_req: Request, res: Response) => {
    try {
      // Generate a random conversation ID
      const conversationId = Math.random().toString(36).substring(2, 15);
      res.json({ conversationId });
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({
        message: "Failed to create conversation",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Generate AI response endpoint with image upload support
  app.post(
    "/api/chat/generate",
    // Use multer middleware. Make error handling more robust.
    (req, res, next) => {
      upload.single("image")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          // Handle Multer-specific errors (e.g., file size limit)
          return res
            .status(400)
            .json({ message: `Erro no upload da imagem: ${err.message}` });
        } else if (err) {
          // Handle other errors during upload (e.g., file filter)
          return res.status(400).json({ message: err.message });
        }
        // If upload is successful, proceed to the next middleware/route handler
        next();
      });
    },
    async (req: Request, res: Response) => {
      try {
        // Validate request body
        const schema = z.object({
          // Allow empty prompt if image is provided, but handle it in storage.ts
          prompt: z.string().max(2000).optional().default(""), // Increased max length, allow empty
          conversationId: z.string().optional(),
        });

        const result = schema.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({
            message: "Invalid request body",
            errors: result.error.format(),
          });
        }

        // Get validated prompt and conversationId
        const { prompt, conversationId } = result.data;

        // Get uploaded image buffer if available
        let imageBase64: string | undefined;
        if (req.file) {
          // Convert buffer to base64
          imageBase64 = req.file.buffer.toString("base64");
        }

        // Ensure prompt is not undefined (though zod default handles this)
        const finalPrompt = prompt || "";

        // Get AI response from storage (which now handles persona, history, image context, and MCP integration)
        const text = await storage.generateAIResponse(
          finalPrompt,
          imageBase64,
          conversationId
        );

        // Return the generated text
        res.json({ text, conversationId });
      } catch (error) {
        console.error("Error generating AI response:", error);
        res.status(500).json({
          message: "Falha ao gerar resposta da IA", // User-friendly message
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // Get conversation history endpoint
  app.get(
    "/api/chat/history/:conversationId",
    async (req: Request, res: Response) => {
      try {
        const { conversationId } = req.params;
        // Basic validation for conversationId format (optional but good practice)
        if (
          !conversationId ||
          typeof conversationId !== "string" ||
          conversationId.length < 5
        ) {
          return res
            .status(400)
            .json({ message: "Formato inválido de ID de conversa." });
        }
        const history = await storage.getConversationHistory(conversationId);
        res.json({ history });
      } catch (error) {
        console.error("Error fetching conversation history:", error);
        res.status(500).json({
          message: "Falha ao buscar histórico da conversa", // User-friendly message
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  // Removed Perenual API routes as they are no longer used directly.
  // The MCP tool handles plant searches via the Trefle API.

  const httpServer = createServer(app);

  return httpServer;
}
