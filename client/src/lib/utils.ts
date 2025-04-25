import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { generateAIResponse } from "./gemini"; // Import generateAIResponse

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Function to extract plant name from a prompt using Gemini
export async function extractPlantName(prompt: string): Promise<string | null> {
  try {
    const geminiPrompt = `Analyze the following text and extract ONLY the scientific or common name of the plant being discussed. If no specific plant name is mentioned, return an empty string. Do not include any other text, explanations, or punctuation. Here is the text: ${prompt}`;
    const extractedName = await generateAIResponse(geminiPrompt);

    // Basic validation: check if the response is not empty and doesn't look like an error or irrelevant response
    if (extractedName && extractedName.trim() !== '' && !extractedName.includes('Sorry') && !extractedName.includes('error')) {
        return extractedName.trim();
    }
    return null; // Return null if extraction seems invalid or failed
  } catch (error) {
    console.error("Error extracting plant name with Gemini:", error);
    return null;
  }
}

export function generateUniqueId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
}
