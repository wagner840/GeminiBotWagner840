// client/src/hooks/useMessages.ts
import { useState, useCallback } from "react";
import { Message, MessageContent } from "@shared/schema";
import { generateUniqueId } from "@/lib/utils";
import usePlantDetection from './usePlantDetection'; // Import the hook

export default function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const { enrichPromptWithPlantInfo } = usePlantDetection(); // Use the hook

  // Initialize conversation if needed
  const initializeConversation = useCallback(async () => {
    if (!conversationId) {
      try {
        const response = await fetch("/api/chat/conversation", {
          method: "POST",
        });
        const data = await response.json();
        setConversationId(data.conversationId);
        return data.conversationId;
      } catch (error) {
        console.error("Failed to create conversation:", error);
        return null;
      }
    }
    return conversationId;
  }, [conversationId]);

  // Add message to the state
  const addMessage = useCallback(
    (content: string | MessageContent, sender: "user" | "ai") => {
      const newMessage: Message = {
        id: generateUniqueId(),
        content,
        sender,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, newMessage]);
      return newMessage;
    },
    []
  );

  // Send message to the server
  const sendMessage = useCallback(
    async (content: string | MessageContent) => {
      try {
        // Ensure we have a conversation ID
        const activeConversationId = await initializeConversation();
        if (!activeConversationId) {
          throw new Error("Failed to initialize conversation");
        }

        // Determine if an image is present and extract the user's text prompt
        let userPromptText = "";
        let isImagePresent = false;

        if (typeof content === "string") {
          userPromptText = content;
        } else if (content.type === "text") { // Should not happen based on MessageInput, but for safety
          userPromptText = content.text;
        } else if (content.type === "image") {
          isImagePresent = true;
          // The actual text prompt is stored in the 'alt' field when sending image + text from MessageInput
          userPromptText = content.alt || ""; 
        }

        // If there's no text prompt at all, throw an error or handle appropriately
        if (!userPromptText.trim() && !isImagePresent) {
             console.log("Attempted to send empty message without image.");
             // Optionally display a message to the user via a toast or similar
             return; // Stop the function execution
        }

        // Add user message to state *before* calling API to show it immediately
        // Use the original content here, not just the text
        addMessage(content, "user");

        // Start loading
        setIsLoading(true);

        // Call usePlantDetection hook to potentially enrich the prompt
        // Pass the actual user prompt and the isImagePresent flag
        const enrichedPrompt = await enrichPromptWithPlantInfo(
          userPromptText,
          // NOTE: API key is typically handled server-side, but this hook expects it.
          // We'll pass a dummy value or refactor if API key is truly needed here.
          // Assuming API key is only needed server-side for Perenual calls.
          "dummy-api-key-for-perenual", // Placeholder - Perenual call moved to client hook
          isImagePresent // Pass the flag
        );

        // Prepare data for API
        const formData = new FormData();
        
        // Use the enriched prompt as the text part of the request
        formData.append("prompt", enrichedPrompt); 

        // If image is present, add it to formData
        if (isImagePresent && typeof content !== 'string' && content.type === 'image') {
             if (content.url.startsWith("data:")) {
                const response = await fetch(content.url);
                const blob = await response.blob();
                formData.append("image", blob, "image.jpg");
             }
        }
        
        formData.append("conversationId", activeConversationId);

        // Send to API
        const response = await fetch("/api/chat/generate", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          // Try to read error response from backend
          const errorText = await response.text();
          console.error(`Error: ${response.status} ${response.statusText}`, errorText);
           let userErrorMessage = "Desculpe, ocorreu um erro ao processar sua mensagem.";
           try { // Attempt to parse backend error message
               const errorJson = JSON.parse(errorText);
               if (errorJson.message) userErrorMessage = `Erro: ${errorJson.message}`;
           } catch(e) { /* ignore parse error */ }
          throw new Error(userErrorMessage);
        }

        const data = await response.json();

        // Add AI response to messages
        // Ensure the response text is valid
        if (data && data.text) {
             addMessage(data.text, "ai");
        } else {
             console.error("Invalid response from API:", data);
             addMessage("Ops! A IA não retornou uma resposta válida.", "ai");
        }

      } catch (error) {
        console.error("Failed to send message:", error);
        // Display error message to the user
        addMessage(
          error instanceof Error ? error.message : "Desculpe, ocorreu um erro inesperado ao enviar sua mensagem. Por favor, tente novamente.",
          "ai"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [addMessage, initializeConversation, enrichPromptWithPlantInfo] // Added enrichPromptWithPlantInfo to dependencies
  );

  // Optional: Function to load history (if implementing history feature)
  // const loadHistory = useCallback(async (convId: string) => { ... }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    addMessage,
    conversationId,
  };
}
