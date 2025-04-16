import { useState, useEffect, useCallback } from 'react';
import { Message, MessageContent } from '@shared/schema';
import { getMessages, saveMessage, generateAIResponse } from '@/lib/gemini';
import { useToast } from '@/hooks/use-toast';
import usePlantDetection from './usePlantDetection';

export default function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  // Chave API inserida diretamente no código
  const [perenualApiKey, setPerenualApiKey] = useState<string>("sk-BTT9644b98b0ea3ee2147");
  const { toast } = useToast();
  const { detectPlantCommand, enrichPromptWithPlantInfo } = usePlantDetection();

  // Load messages from session storage on mount
  useEffect(() => {
    const storedMessages = getMessages();
    // Sempre começa com uma lista de mensagens vazia para que a mensagem de boas-vindas 
    // seja mostrada toda vez que o aplicativo for aberto
    setMessages([]);
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

  // A função de solicitação de API key foi removida porque agora usamos um valor fixo

  // Send a message to the AI and handle the response
  const sendMessage = useCallback(async (content: string | MessageContent) => {
    // Para conteúdo de texto
    if (typeof content === 'string') {
      if (!content.trim()) return;
      
      // Add user message
      addMessage(content, 'user');
      
      // Verificar se a mensagem contém comando relacionado a plantas
      const isPlantQuery = detectPlantCommand(content);
      let promptToSend = content;
      
      // Se for uma consulta sobre plantas, use a API Perenual para enriquecer o prompt
      if (isPlantQuery && perenualApiKey) {
        try {
          promptToSend = await enrichPromptWithPlantInfo(content, perenualApiKey);
        } catch (error) {
          console.error('Erro ao enriquecer prompt com informações de plantas:', error);
        }
      }
      
      // Get AI response
      setIsLoading(true);
      try {
        // Adicione instruções para que a IA responda como EVA
        const promptWithPersonality = `${promptToSend}\n\nLembre-se de responder como EVA, o assistente pessoal amigável em português brasileiro.`;
        const response = await generateAIResponse(promptWithPersonality);
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
    // Para conteúdo de imagem
    else if (content.type === 'image') {
      // Add user message with media content
      addMessage(content, 'user');
      
      // Pedir para o Gemini comentar sobre a imagem
      setIsLoading(true);
      try {
        const promptWithPersonality = "Acabei de enviar uma imagem. Analise e descreva o que você vê na imagem. Lembre-se de responder como EVA, o assistente pessoal em português brasileiro.";
        const response = await generateAIResponse(promptWithPersonality);
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
  }, [addMessage, toast, detectPlantCommand, enrichPromptWithPlantInfo, perenualApiKey]);

  return {
    messages,
    isLoading,
    sendMessage,
    addMessage
  };
}
