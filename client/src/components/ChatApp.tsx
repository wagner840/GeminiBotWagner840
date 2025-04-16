import { useEffect, useRef } from 'react';
import Header from './Header';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UsernameModal from './UsernameModal';
import useUsername from '@/hooks/useUsername';
import useMessages from '@/hooks/useMessages';
import useTheme from '@/hooks/useTheme';
import { MessageContent } from '@shared/schema';

export default function ChatApp() {
  const { username, showModal, handleUsernameSubmit } = useUsername();
  const { messages, isLoading, sendMessage, addMessage } = useMessages();
  const { theme, toggleTheme } = useTheme();
  const initialized = useRef(false);

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
      <MessageList messages={messages} isLoading={isLoading} />
      <MessageInput onSendMessage={sendMessage} isLoading={isLoading} />
      {showModal && <UsernameModal onSubmit={handleUsernameSubmit} />}
    </div>
  );
}
