import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error("Only image files are allowed!"));
    }
    cb(null, true);
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
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
    upload.single("image"),
    async (req: Request, res: Response) => {
      try {
        // Validate request body
        const schema = z.object({
          prompt: z.string().min(1).max(1000),
          conversationId: z.string().optional(),
        });

        const result = schema.safeParse(req.body);
        if (!result.success) {
          return res.status(400).json({
            message: "Invalid request body",
            errors: result.error.format(),
          });
        }

        const { prompt, conversationId } = result.data;

        // Get uploaded image if available
        let imageBase64: string | undefined;
        if (req.file) {
          // Convert buffer to base64
          imageBase64 = req.file.buffer.toString("base64");
        }

        // Add instruction to respond in Brazilian Portuguese
        const ptBrPrompt =
          prompt + "\n\nPor favor, responda em português brasileiro.";

        // Get AI response from Gemini with conversation history
        const text = await storage.generateAIResponse(
          ptBrPrompt,
          imageBase64,
          conversationId
        );

        // Return the generated text
        res.json({ text, conversationId });
      } catch (error) {
        console.error("Error generating AI response:", error);
        res.status(500).json({
          message: "Failed to generate AI response",
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
        const history = await storage.getConversationHistory(conversationId);
        res.json({ history });
      } catch (error) {
        console.error("Error fetching conversation history:", error);
        res.status(500).json({
          message: "Failed to fetch conversation history",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  );

  const httpServer = createServer(app);

  return httpServer;
}
