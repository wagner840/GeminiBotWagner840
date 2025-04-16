import { useEffect, useRef } from 'react';
import Header from './Header';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UsernameModal from './UsernameModal';
import useUsername from '@/hooks/useUsername';
import useMessages from '@/hooks/useMessages';
import useTheme from '@/hooks/useTheme';

export default function ChatApp() {
  const { username, showModal, handleUsernameSubmit } = useUsername();
  const { messages, isLoading, sendMessage, addMessage } = useMessages();
  const { theme, toggleTheme } = useTheme();
  const initialized = useRef(false);

  // Add welcome message on first load
  useEffect(() => {
    if (!initialized.current && username) {
      initialized.current = true;
      
      if (messages.length === 0) {
        addMessage(
          "Hello! I'm Gemini, an AI assistant. I'm here to help answer your questions and have conversations. What would you like to talk about today?",
          'ai'
        );
      }
    }
  }, [username, messages.length, addMessage]);

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto shadow-xl bg-white dark:bg-gray-800 relative">
      <Header username={username} toggleTheme={toggleTheme} theme={theme} />
      <MessageList messages={messages} isLoading={isLoading} />
      <MessageInput onSendMessage={sendMessage} isLoading={isLoading} />
      {showModal && <UsernameModal onSubmit={handleUsernameSubmit} />}
    </div>
  );
}
