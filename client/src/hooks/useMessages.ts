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
  const addMessage = useCallback((content: string | MessageContent, sender: 'user' | 'ai') => {
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
  const sendMessage = useCallback(async (content: string | MessageContent) => {
    // Para conteúdo de texto
    if (typeof content === 'string') {
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
          title: "Erro",
          description: "Falha ao obter resposta da IA. Por favor, tente novamente.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    } 
    // Para conteúdo de imagem ou áudio
    else {
      // Add user message with media content
      addMessage(content, 'user');
      
      // Se for uma imagem, podemos adicionar um prompt específico para o Gemini
      if (content.type === 'image') {
        setIsLoading(true);
        try {
          const response = await generateAIResponse("Acabei de enviar uma imagem. Por favor, continue a conversa em português brasileiro.");
          addMessage(response, 'ai');
        } catch (error) {
          console.error('Error getting AI response:', error);
          toast({
            title: "Erro",
            description: "Falha ao obter resposta da IA. Por favor, tente novamente.",
            variant: "destructive"
          });
        } finally {
          setIsLoading(false);
        }
      }
      // Se for áudio, apenas adiciona sem pedir resposta da IA
      else if (content.type === 'audio') {
        // Não fazemos nada específico após enviar áudio
      }
    }
  }, [addMessage, toast]);

  return {
    messages,
    isLoading,
    sendMessage,
    addMessage
  };
}
