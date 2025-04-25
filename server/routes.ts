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
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) { // Case-insensitive match
      // Use Error object for consistency
      return cb(new Error("Apenas arquivos de imagem (jpg, jpeg, png, gif) são permitidos!"));
    }
    cb(null, true);
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Simple in-memory cache for plant details
  const plantDetailsCache: { [key: string]: any } = {};
  const CACHE_TTL = 60 * 60 * 1000; // Cache for 1 hour (in milliseconds)

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
          return res.status(400).json({ message: `Erro no upload da imagem: ${err.message}` });
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
          prompt: z.string().max(2000).optional().default(''), // Increased max length, allow empty
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

        // Get AI response from storage (which now handles persona, history, image context)
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
        if (!conversationId || typeof conversationId !== 'string' || conversationId.length < 5) {
          return res.status(400).json({ message: "Formato inválido de ID de conversa." });
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

  // New endpoint for searching plants via Perenual API
  app.get("/api/perenual/search", async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.PERENUAL_API_KEY;
      const query = req.query.q as string; // Get search query from request parameters

      if (!apiKey) {
        console.error("PERENUAL_API_KEY environment variable is not set.");
        return res.status(500).json({ message: "API key for Perenual is not configured on the server." });
      }

      if (!query) {
        return res.status(400).json({ message: "Missing search query parameter 'q'." });
      }

      // Note: Caching is not implemented for search results in this example
      // as search results can be dynamic and less likely to be repeatedly requested
      // for the exact same query in quick succession.

      const perenualResponse = await fetch(
        `https://perenual.com/api/species-list?key=${apiKey}&q=${encodeURIComponent(query)}`
      );

      if (!perenualResponse.ok) {
        const errorText = await perenualResponse.text();
        console.error(`Error fetching from Perenual search API: ${perenualResponse.status} ${errorText}`);
        return res.status(perenualResponse.status).json({ message: "Error fetching data from external plant API." });
      }

      const data = await perenualResponse.json();
      res.json(data); // Return data from Perenual API to frontend
    } catch (error) {
      console.error("Error in /api/perenual/search route:", error);
      res.status(500).json({
        message: "Internal server error during plant search.",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // New endpoint for getting plant details via Perenual API with caching
  app.get("/api/perenual/detail/:id", async (req: Request, res: Response) => {
    try {
      const apiKey = process.env.PERENUAL_API_KEY;
      const plantId = req.params.id; // Get plant ID from URL parameters

       if (!apiKey) {
        console.error("PERENUAL_API_KEY environment variable is not set.");
        return res.status(500).json({ message: "API key for Perenual is not configured on the server." });
      }

      if (!plantId || typeof plantId !== 'string') {
         return res.status(400).json({ message: "Invalid or missing plant ID in URL." });
      }

      // Check if plant details are in cache and not expired
      const cachedDetails = plantDetailsCache[plantId];
      if (cachedDetails && cachedDetails.timestamp > Date.now() - CACHE_TTL) {
        console.log(`Serving plant details for ID ${plantId} from cache.`);
        return res.json(cachedDetails.data);
      }

      console.log(`Fetching plant details for ID ${plantId} from external API.`);
      const perenualResponse = await fetch(
        `https://perenual.com/api/species/details/${plantId}?key=${apiKey}`
      );

      if (!perenualResponse.ok) {
        const errorText = await perenualResponse.text();
        console.error(`Error fetching from Perenual details API: ${perenualResponse.status} ${errorText}`);
        // Do not cache error responses
        return res.status(perenualResponse.status).json({ message: "Error fetching plant details from external API." });
      }

      const data = await perenualResponse.json();
      
      // Store fetched data in cache with a timestamp
      plantDetailsCache[plantId] = { data, timestamp: Date.now() };
      console.log(`Cached plant details for ID ${plantId}.`);

      res.json(data); // Return data from Perenual API to frontend
    } catch (error) {
      console.error("Error in /api/perenual/detail/:id route:", error);
      res.status(500).json({
        message: "Internal server error fetching plant details.",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
