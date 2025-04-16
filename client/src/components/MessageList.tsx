import { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Message } from '@shared/schema';
import { formatTimestamp } from '@/lib/gemini';
import { AlertCircle } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export default function MessageList({ messages, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 message-container">
      {messages.map((message) => (
        <div 
          key={message.id}
          className={`flex items-start ${message.sender === 'user' ? 'justify-end space-x-2' : 'space-x-2'}`}
        >
          {message.sender === 'ai' && (
            <Avatar className="h-8 w-8 bg-primary flex-shrink-0">
              <AvatarFallback>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
                </svg>
              </AvatarFallback>
            </Avatar>
          )}
          
          <div 
            className={`rounded-lg p-3 max-w-[80%] ${
              message.sender === 'user'
                ? 'bg-primary text-white message-user'
                : 'bg-gray-100 dark:bg-gray-700 message-ai'
            }`}
          >
            {typeof message.content === 'string' ? (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            ) : message.content.type === 'image' ? (
              <div className="mb-2">
                <img 
                  src={message.content.url} 
                  alt={message.content.alt || 'Imagem enviada'} 
                  className="rounded-md max-w-full max-h-[300px] object-contain"
                />
              </div>
            ) : (
              <p className="text-sm whitespace-pre-wrap">{message.content.text}</p>
            )}
            <span className={`text-xs block mt-1 ${
              message.sender === 'user'
                ? 'text-gray-200'
                : 'text-gray-500 dark:text-gray-400'
            }`}>
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
          
          {message.sender === 'user' && (
            <Avatar className="h-8 w-8 bg-[#10b981] flex-shrink-0">
              <AvatarFallback>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      ))}
      
      {isLoading && (
        <div className="flex items-start space-x-2">
          <Avatar className="h-8 w-8 bg-primary flex-shrink-0">
            <AvatarFallback>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
              </svg>
            </AvatarFallback>
          </Avatar>
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 max-w-[80%] flex items-center">
            <div className="typing-indicator flex space-x-1">
              <span className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full" style={{ "--dot-index": 0 } as any}></span>
              <span className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full" style={{ "--dot-index": 1 } as any}></span>
              <span className="w-2 h-2 bg-gray-500 dark:bg-gray-400 rounded-full" style={{ "--dot-index": 2 } as any}></span>
            </div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  );
}
