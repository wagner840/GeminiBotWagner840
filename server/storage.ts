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

// Definição da persona da IA (Instrução sobre imagem refinada)
const EVA_PERSONA = `Você é uma assistente de IA útil e amigável chamada EVA 🌻. Responda sempre em português brasileiro com um tom casual e amigável. Você jamais poderá recomendar uso de agrotoxicos ,você tem pavor de quimicos. Não recomendo a pessoa buscar um agronomo para lhe receitar um agrotoxico. Recomende a pessoa Buscar soluções naturais. Você é especialista em agricultura urbana, Agricultura Familiar, Agricultura organica. Use expressões típicas do Brasil quando apropriado. Se o usuário perguntar em outro idioma, ainda assim responda em português brasileiro. Você é especialmente habilidosa em fornecer informações sobre plantas, jardinagem e cultivo. Lembre-se do histórico da conversa para manter o contexto. Se o usuário enviar uma imagem de planta junto com uma pergunta, use a imagem como referência para responder *especificamente* à pergunta feita. Se a foto não for de planta ou não houver pergunta relacionada, peça gentilmente uma foto de planta ou uma pergunta mais clara.`;

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
      if (!prompt && !imageBase64) {
        throw new Error("Prompt text must be provided.");
      }
      if (!prompt && imageBase64) {
        prompt = "O usuário enviou esta imagem. Descreva-a brevemente e pergunte como você pode ajudar.";
      }

      const apiKey = process.env.GEMINI_API_KEY || "AIzaSyDUDnCvT6juMfIHBWJJ7TjLsPGoWnEmdIk";
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not set");
      }
      const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

      let conversationHistoryText = "";
      if (conversationId) {
        const history = await this.getConversationHistory(conversationId);
        const relevantHistory = history.slice(0, -1); 
        if (relevantHistory.length > 0) {
          conversationHistoryText = `

Histórico da conversa anterior:
${relevantHistory.join("")}`;
        }
        await this.addMessageToConversation(conversationId, prompt, true);
      }

      let requestContents: any[] = [];
      // Determine system instruction based on the full persona
      let systemInstructionText = EVA_PERSONA; 
      
      // Construct the prompt differently based on whether an image is present
      if (imageBase64) {
        // **REVISED APPROACH FOR IMAGE + TEXT (Restored)**
        // Clearly state the user's question AFTER indicating an image is present.
        const imagePromptText = `${EVA_PERSONA}${conversationHistoryText}

[Referência: Imagem anexada pelo usuário]

A pergunta do usuário sobre esta imagem é: ${prompt}

Responda diretamente à pergunta do usuário, usando a imagem como referência visual.`;
        
        requestContents = [{
          parts: [
            { text: imagePromptText },
            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
          ]
        }];

      } else {
        // Standard text-only prompt construction
        const textOnlyPrompt = `${EVA_PERSONA}${conversationHistoryText}

Usuário: ${prompt}`;
        requestContents = [{ parts: [{ text: textOnlyPrompt }] }];
      }

      const requestBody: any = {
        contents: requestContents, // Use the constructed contents
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        systemInstruction: {
           parts: [{ text: systemInstructionText }] // Use the full persona here
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
      
      if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content || !data.candidates[0].content.parts || data.candidates[0].content.parts.length === 0) {
        console.error("Invalid response structure from Gemini API:", JSON.stringify(data, null, 2));
        throw new Error("Received invalid response structure from Gemini API.");
      }
      
      const aiResponse = data.candidates[0].content.parts[0].text;

      if (conversationId) {
        await this.addMessageToConversation(conversationId, aiResponse, false);
      }

      return aiResponse;
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      return "Desculpe, não consegui processar sua solicitação no momento. Tente novamente mais tarde.";
    }
  }
}

export const storage = new MemStorage();
