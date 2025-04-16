import { apiRequest } from './queryClient';
import { Message, MessageContent } from '@shared/schema';

// Generate a response from Gemini AI
export async function generateAIResponse(prompt: string): Promise<string> {
  try {
    const response = await apiRequest('POST', '/api/chat/generate', { prompt });
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Error generating AI response:', error);
    throw error;
  }
}

// Save a new message to session storage
export function saveMessage(message: Message): void {
  let messages = getMessages();
  messages.push(message);
  sessionStorage.setItem('gemini-messages', JSON.stringify(messages));
}

// Get all messages from session storage
export function getMessages(): Message[] {
  return JSON.parse(sessionStorage.getItem('gemini-messages') || '[]');
}

// Save username to local storage
export function saveUsername(username: string): void {
  localStorage.setItem('gemini-username', username);
}

// Get username from local storage
export function getUsername(): string | null {
  return localStorage.getItem('gemini-username');
}

// Format timestamp as relative time
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins === 1) return '1 minute ago';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  return date.toLocaleDateString();
}

// Função para converter Blob de áudio para URL de dados
export function saveAudioBlob(audioBlob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.readAsDataURL(audioBlob);
  });
}
