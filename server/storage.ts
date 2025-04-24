import {
  users,
  type User,
  type InsertUser,
  messages,
  type Message,
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  generateAIResponse(
    prompt: string,
    imageBase64?: string,
    conversationId?: string
  ): Promise<string>;
  getConversationHistory(conversationId: string): Promise<string[]>;
  addMessageToConversation(
    conversationId: string,
    message: string,
    isUser: boolean
  ): Promise<void>;
}

// Interface for tracking conversations
interface Conversation {
  messages: Array<{ content: string; isUser: boolean }>;
  lastUpdated: Date;
}

// Definição da persona da IA
const EVA_PERSONA = `Você é uma assistente de IA útil e amigável chamada EVA 🌻. Responda sempre em português brasileiro com um tom casual e amigável. Você jamais poderá recomendar uso de agrotoxicos ,você tem pavor de quimicos. Não recomendo a pessoa buscar um agronomo para lhe receitar um agrotoxico. Recomende a pessoa Buscar um agrotoxico para soluções naturais. Você é especialista em agricultura urbana, Agricultura Familiar, Agricultura organica. Use expressões típicas do Brasil quando apropriado. Se o usuário perguntar em outro idioma, ainda assim responda em português brasileiro. Você é especialmente habilidosa em fornecer informações sobre plantas, jardinagem e cultivo quando o usuário perguntar sobre esses temas. Lembre-se do histórico da conversa para manter o contexto da interação. Se o usuário enviar uma imagem responda somente a fotos de plantas, se a foto não for de planta peça ao usuario para lhe enviar somente fotos de cultivos,se o usuario mandar imagem de uma planta analise-a cuidadosamente e responde de acordo com à pergunta do usuário.`;

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private conversations: Map<string, Conversation>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getConversationHistory(conversationId: string): Promise<string[]> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return [];

    // Format the conversation history as a string array
    return conversation.messages.map(
      (msg) => `${msg.isUser ? "Usuário" : "EVA"}: ${msg.content}`
    );
  }

  async addMessageToConversation(
    conversationId: string,
    message: string,
    isUser: boolean
  ): Promise<void> {
    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, {
        messages: [],
        lastUpdated: new Date(),
      });
    }

    const conversation = this.conversations.get(conversationId)!;
    // Store the raw message without persona/history prefix for clean history
    conversation.messages.push({ content: message, isUser });
    conversation.lastUpdated = new Date();
  }

  async generateAIResponse(
    prompt: string,
    imageBase64?: string,
    conversationId?: string
  ): Promise<string> {
    try {
      if (!prompt && !imageBase64) {
        throw new Error("Prompt or image must be provided");
      }

      // Access Google's Generative AI API
      const apiKey =
        process.env.GEMINI_API_KEY || "AIzaSyDUDnCvT6juMfIHBWJJ7TjLsPGoWnEmdIk"; // Replace with your actual default key
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not set");
      }

      const url =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"; // Updated model

      let conversationHistoryText = "";
      if (conversationId) {
        const history = await this.getConversationHistory(conversationId);
        if (history.length > 0) {
          conversationHistoryText = `

Histórico da conversa anterior:
${history.join("")}`;
        } 
        // Add user's current message to conversation history
        await this.addMessageToConversation(conversationId, prompt, true);
      }

      // Construct the final prompt text including persona, history, and user message
      const finalPromptText = `${EVA_PERSONA}${conversationHistoryText}

Usuário: ${prompt}`;

      let contents: any[] = [];
      if (imageBase64) {
        // Include persona and prompt text along with the image
        contents = [{
          parts: [
            { text: `${EVA_PERSONA}${conversationHistoryText}

Usuário: analise essa imagem e depois responda de acordo com à pergunta: ${prompt}` },
            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
          ]
        }];
      } else {
        // Only text prompt
        contents = [{ parts: [{ text: finalPromptText }] }];
      }

      const requestBody: any = {
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        // Add system instruction for persona (optional but good practice)
        systemInstruction: {
          parts: [{ text: EVA_PERSONA }]
        }
      };

      const response = await fetch(`${url}?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API Request Body:", JSON.stringify(requestBody, null, 2));
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      // Error handling for empty or malformed response
      if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content || !data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
        console.error("Invalid response structure from Gemini API:", JSON.stringify(data, null, 2));
        throw new Error("Received invalid response structure from Gemini API.");
      }
      
      const aiResponse = data.candidates[0].content.parts[0].text;

      if (conversationId) {
        // Add AI's response to conversation history
        await this.addMessageToConversation(conversationId, aiResponse, false);
      }

      return aiResponse;
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      // Return a user-friendly error message
      return "Desculpe, não consegui processar sua solicitação no momento. Tente novamente mais tarde.";
    }
  }
}

export const storage = new MemStorage();
