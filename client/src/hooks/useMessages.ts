import { useState, useEffect, useCallback } from 'react';
import { Message, MessageContent } from '@shared/schema';
import { getMessages, saveMessage, generateAIResponse } from '@/lib/gemini';
import { useToast } from '@/hooks/use-toast';

export default function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Load messages from session storage on mount
  useEffect(() => {
    const storedMessages = getMessages();
    if (storedMessages.length > 0) {
      setMessages(storedMessages);
    }
  }, []);

  // Add a new message and save to session storage
  const addMessage = useCallback((content: string, sender: 'user' | 'ai') => {
    const newMessage: Message = {
      id: Date.now(),
      content,
      sender,
      timestamp: new Date().toISOString()
    };
    
    saveMessage(newMessage);
    setMessages(prev => [...prev, newMessage]);
  }, []);

  // Send a message to the AI and handle the response
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;
    
    // Add user message
    addMessage(content, 'user');
    
    // Get AI response
    setIsLoading(true);
    try {
      const response = await generateAIResponse(content);
      addMessage(response, 'ai');
    } catch (error) {
      console.error('Error getting AI response:', error);
      toast({
        title: "Error",
        description: "Failed to get a response from the AI. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [addMessage, toast]);

  return {
    messages,
    isLoading,
    sendMessage,
    addMessage
  };
}
