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
    conversation.messages.push({ content: message, isUser });
    conversation.lastUpdated = new Date();
  }

  async generateAIResponse(
    prompt: string,
    imageBase64?: string,
    conversationId?: string
  ): Promise<string> {
    try {
      // Access Google's Generative AI API
      const apiKey =
        process.env.GEMINI_API_KEY || "AIzaSyDUDnCvT6juMfIHBWJJ7TjLsPGoWnEmdIk";
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not set");
      }

      const url =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

      // Build conversation history context
      let fullPrompt = prompt;
      if (conversationId) {
        const history = await this.getConversationHistory(conversationId);
        if (history.length > 0) {
          fullPrompt = `Histórico da conversa:\n${history.join(
            "\n"
          )}\n\nNova mensagem: ${prompt}`;
        }

        // Add user's current message to conversation history
        await this.addMessageToConversation(conversationId, prompt, true);
      }

      const contents: any[] = [
        {
          parts: [{ text: fullPrompt }],
        },
      ];

      if (imageBase64) {
        contents[0].parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBase64,
          },
        });
      }

      const response = await fetch(`${url}?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          // Especificando português brasileiro como idioma de resposta
          systemInstruction: {
            parts: [
              {
                text: "Você é uma assistente de IA útil e amigável chamada EVA 🌻. Responda sempre em português brasileiro com um tom casual e amigável. Use expressões típicas do Brasil quando apropriado. Se o usuário perguntar em outro idioma, ainda assim responda em português brasileiro. Você é especialmente habilidosa em fornecer informações sobre plantas, jardinagem e cultivo quando o usuário perguntar sobre esses temas. Lembre-se do histórico da conversa para manter o contexto da interação. Se o usuário enviar uma imagem, analise-a cuidadosamente e descreva o que você vê antes de responder à pergunta do usuário.",
              },
            ],
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      const aiResponse = data.candidates[0].content.parts[0].text;

      // Add AI response to conversation history if conversationId exists
      if (conversationId) {
        await this.addMessageToConversation(conversationId, aiResponse, false);
      }

      return aiResponse;
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      throw error;
    }
  }
}

export const storage = new MemStorage();
