// client/src/hooks/useMessages.ts
import { useState, useCallback } from "react";
import { Message, MessageContent } from "@shared/schema";
import { generateUniqueId } from "@/lib/utils";

export default function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);

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

        // Add user message to state
        addMessage(content, "user");

        // Start loading
        setIsLoading(true);

        // Prepare data for API
        const formData = new FormData();
        let promptText = "";

        // Handle different message content types
        if (typeof content === "string") {
          promptText = content;
        } else if (content.type === "image") {
          // For image messages, we need to convert the dataURL back to a blob
          if (content.url.startsWith("data:")) {
            const response = await fetch(content.url);
            const blob = await response.blob();
            formData.append("image", blob, "image.jpg");
            promptText = "Analise esta imagem por favor.";
          }
        } else if (content.type === "text") {
          promptText = content.text;
        }

        formData.append("prompt", promptText);
        formData.append("conversationId", activeConversationId);

        // Send to API
        const response = await fetch("/api/chat/generate", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Add AI response to messages
        addMessage(data.text, "ai");
      } catch (error) {
        console.error("Failed to send message:", error);
        addMessage(
          "Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.",
          "ai"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [addMessage, initializeConversation]
  );

  return {
    messages,
    isLoading,
    sendMessage,
    addMessage,
    conversationId,
  };
}
