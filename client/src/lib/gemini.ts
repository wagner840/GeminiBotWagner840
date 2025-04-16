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

// Esta função foi removida por não ser utilizada

// Sumariza a conversa entre o usuário e a IA
export async function summarizeConversation(messages: Message[]): Promise<string> {
  if (messages.length === 0) return "Nenhuma conversa para sumarizar.";

  try {
    // Prepara o contexto da conversa para enviar ao Gemini
    const conversationContext = messages.map(msg => {
      const sender = msg.sender === 'user' ? 'Usuário' : 'EVA';
      const content = typeof msg.content === 'string' 
        ? msg.content 
        : (msg.content.type === 'image' ? '[Imagem]' : msg.content.text);
      return `${sender}: ${content}`;
    }).join('\n');

    // Solicita ao Gemini para sumarizar a conversa
    const prompt = `Por favor, sumarize a seguinte conversa em 3-5 pontos principais, mantendo o tom informal em português brasileiro:\n\n${conversationContext}`;
    const summary = await generateAIResponse(prompt);
    return summary;
  } catch (error) {
    console.error('Erro ao sumarizar conversa:', error);
    return "Não foi possível sumarizar a conversa. Por favor, tente novamente.";
  }
}
