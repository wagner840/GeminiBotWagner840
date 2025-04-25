import { apiRequest } from "./queryClient";
import { Message, MessageContent } from "@shared/schema";

// Generate a response from Gemini AI
export async function generateAIResponse(prompt: string): Promise<string> {
  try {
    const response = await apiRequest("POST", "/api/chat/generate", { prompt });
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("Error generating AI response:", error);
    throw error;
  }
}

// Save a new message to session storage
export function saveMessage(message: Message): void {
  let messages = getMessages();
  messages.push(message);
  sessionStorage.setItem("gemini-messages", JSON.stringify(messages));
}

// Get all messages from session storage
export function getMessages(): Message[] {
  return JSON.parse(sessionStorage.getItem("gemini-messages") || "[]");
}

// Save username to local storage
export function saveUsername(username: string): void {
  localStorage.setItem("gemini-username", username);
}

//Get username from local storage
export function getUsername(): string | null {
  return localStorage.getItem("gemini-username");
}

// Format timestamp to MM/DD/YYYY HH:MM:SS
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = String(date.getFullYear());
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
}

// Translate plant name to English using Gemini AI (This function remains here as it uses generateAIResponse)
export async function translatePlantName(plantName: string): Promise<string | null> {
  try {
    const prompt = `Translate the following plant name from Portuguese to English. Only respond with the English translation and nothing else: ${plantName}`;
    const translatedName = await generateAIResponse(prompt);
    // Basic check to see if the response looks like a translation
    if (translatedName && translatedName.trim() !== '' && !translatedName.includes('Desculpe')) { // Add a check for the error message from generateAIResponse
        return translatedName.trim();
    }
    return null; // Return null if translation seems invalid or failed
  } catch (error) {
    console.error("Error translating plant name with Gemini:", error);
    return null;
  }
}
