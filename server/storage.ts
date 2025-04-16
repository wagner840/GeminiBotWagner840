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
  generateAIResponse(prompt: string): Promise<string>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async generateAIResponse(prompt: string): Promise<string> {
    try {
      // Access Google's Generative AI API
      const apiKey = process.env.GEMINI_API_KEY || '';
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not set");
      }

      const url =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";
      const response = await fetch(`${url}?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
          },
          // Especificando português brasileiro como idioma de resposta
          systemInstruction: {
            parts: [
              {
                text: "Você é uma assistente de IA útil e amigável chamada Gemini. Responda sempre em português brasileiro com um tom casual e amigável. Use expressões típicas do Brasil quando apropriado. Se o usuário perguntar em outro idioma, ainda assim responda em português brasileiro."
              }
            ]
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      throw error;
    }
  }
}

export const storage = new MemStorage();
