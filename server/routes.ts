import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Generate AI response endpoint
  app.post('/api/chat/generate', async (req: Request, res: Response) => {
    try {
      // Validate request body
      const schema = z.object({
        prompt: z.string().min(1).max(1000),
      });

      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ 
          message: 'Invalid request body',
          errors: result.error.format() 
        });
      }

      const { prompt } = result.data;
      
      // Adiciona instrução para responder em português brasileiro
      const ptBrPrompt = prompt + "\n\nPor favor, responda em português brasileiro.";
      
      // Get AI response from Gemini
      const text = await storage.generateAIResponse(ptBrPrompt);
      
      // Return the generated text
      res.json({ text });
    } catch (error) {
      console.error('Error generating AI response:', error);
      res.status(500).json({ 
        message: 'Failed to generate AI response',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
