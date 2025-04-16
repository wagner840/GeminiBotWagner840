import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Moon, Sun } from 'lucide-react';

interface HeaderProps {
  username: string | null;
  toggleTheme: () => void;
  theme: 'light' | 'dark';
}

export default function Header({ username, toggleTheme, theme }: HeaderProps) {
  return (
    <header className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Avatar className="h-8 w-8 bg-primary">
          <AvatarFallback>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
            </svg>
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="font-semibold text-lg">Gemini Chat</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Chatting as <span className="font-medium text-primary dark:text-primary-400">{username || 'Guest'}</span>
          </p>
        </div>
      </div>
      <button 
        onClick={toggleTheme}
        className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 focus:outline-none transition-colors"
      >
        {theme === 'dark' ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
      </button>
    </header>
  );
}
