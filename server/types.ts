import { type User, type InsertUser } from "@shared/schema";

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
