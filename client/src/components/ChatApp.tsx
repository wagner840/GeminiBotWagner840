import { useEffect, useRef, useState } from 'react';
import Header from './Header';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UsernameModal from './UsernameModal';
import useUsername from '@/hooks/useUsername';
import useMessages from '@/hooks/useMessages';
import useTheme from '@/hooks/useTheme';
import { MessageContent } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { summarizeConversation } from '@/lib/gemini';

export default function ChatApp() {
  const { username, showModal, handleUsernameSubmit } = useUsername();
  const { messages, isLoading, sendMessage, addMessage } = useMessages();
  const { theme, toggleTheme } = useTheme();
  const initialized = useRef(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  // Função para solicitar um resumo da conversa atual
  const handleSummarize = async () => {
    if (messages.length === 0 || isSummarizing) return;
    
    setIsSummarizing(true);
    try {
      const summary = await summarizeConversation(messages);
      // Adiciona o resumo como uma mensagem da IA
      addMessage(`📋 **Resumo da Conversa:**\n\n${summary}`, 'ai');
    } catch (error) {
      console.error('Erro ao sumarizar conversa:', error);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Add welcome message on every load in Brazilian Portuguese
  useEffect(() => {
    if (username) {
      // Sempre mostre a mensagem de boas-vindas quando o componente for montado
      addMessage(
        "Olá, sou o seu assistente EVA 🌻. Como posso ajuda-lo?",
        'ai'
      );
      
      // Marca como inicializado para evitar duplicação durante o ciclo de vida do componente
      initialized.current = true;
    }
  }, [username, addMessage]);

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto shadow-xl bg-white dark:bg-gray-800 relative">
      <Header username={username} toggleTheme={toggleTheme} theme={theme} />
      
      {/* Botão de sumarização */}
      <div className="absolute top-16 right-4 z-10">
        <Button
          onClick={handleSummarize}
          disabled={messages.length === 0 || isSummarizing || isLoading}
          size="sm"
          variant="outline"
          className="flex items-center gap-1 bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
        >
          <FileText size={16} />
          <span>Resumir</span>
        </Button>
      </div>
      
      <MessageList messages={messages} isLoading={isLoading} />
      <MessageInput onSendMessage={sendMessage} isLoading={isLoading || isSummarizing} />
      {showModal && <UsernameModal onSubmit={handleUsernameSubmit} />}
    </div>
  );
}
