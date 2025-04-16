import { useState, useEffect, FormEvent, KeyboardEvent, useRef, ChangeEvent } from 'react';
import { SendIcon, Image, Mic, MicOff, Headphones } from 'lucide-react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { MessageContent } from '@shared/schema';
import { saveAudioBlob } from '@/lib/gemini';
import { useToast } from '@/hooks/use-toast';

interface MessageInputProps {
  onSendMessage: (message: string | MessageContent) => void;
  isLoading: boolean;
}

export default function MessageInput({ onSendMessage, isLoading }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [audioRecorder, setAudioRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Speech recognition setup
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition
  } = useSpeechRecognition();

  // Efeito para atualizar o campo de mensagem quando o transcript mudar
  useEffect(() => {
    if (transcript) {
      setMessage(transcript);
    }
  }, [transcript]);
  
  // Iniciar gravação de áudio
  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/wav' });
        const audioUrl = await saveAudioBlob(audioBlob);
        
        // Enviar mensagem de áudio
        const audioContent: MessageContent = {
          type: 'audio',
          url: audioUrl
        };
        
        onSendMessage(audioContent);
        setAudioChunks([]);
      };
      
      recorder.start();
      setAudioRecorder(recorder);
      setIsRecordingAudio(true);
      setAudioChunks(chunks);
      
      toast({
        title: 'Gravando áudio',
        description: 'Clique novamente no botão para parar a gravação.',
      });
      
    } catch (error) {
      console.error('Erro ao acessar o microfone:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível acessar o microfone. Verifique as permissões.',
        variant: 'destructive'
      });
    }
  };
  
  // Parar gravação de áudio
  const stopAudioRecording = () => {
    if (audioRecorder) {
      audioRecorder.stop();
      // Encerrar todas as faixas do stream para liberar o microfone
      audioRecorder.stream.getTracks().forEach(track => track.stop());
      setIsRecordingAudio(false);
      setAudioRecorder(null);
      
      toast({
        title: 'Áudio gravado',
        description: 'Seu áudio foi enviado com sucesso.',
      });
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message);
      setMessage('');
      resetTranscript();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !isLoading) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageContent: MessageContent = {
          type: 'image',
          url: reader.result as string,
          alt: 'Imagem enviada pelo usuário'
        };
        onSendMessage(imageContent);
      };
      reader.readAsDataURL(file);
      
      // Reset the input value so the same image can be uploaded again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const toggleRecording = () => {
    if (listening) {
      SpeechRecognition.stopListening();
      setIsRecording(false);
      // Se tiver texto reconhecido, atualize o campo de mensagem
      if (transcript) {
        setMessage(transcript);
      }
    } else {
      resetTranscript();
      SpeechRecognition.startListening({ language: 'pt-BR', continuous: true });
      setIsRecording(true);
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        {/* Botão de upload de imagem */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-full p-2"
        >
          <Image className="h-5 w-5" />
        </button>
        
        {/* Input de arquivo oculto para upload de imagem */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
          disabled={isLoading}
        />
        
        {/* Botão de gravação de áudio para transcrição */}
        {browserSupportsSpeechRecognition && (
          <button
            type="button"
            onClick={toggleRecording}
            disabled={isLoading || isRecordingAudio}
            className={`text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-full p-2 ${
              isRecording ? 'bg-red-100 text-red-500' : ''
            }`}
          >
            {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>
        )}
        
        {/* Botão para gravação de áudio (mensagem de áudio) */}
        <button
          type="button"
          onClick={isRecordingAudio ? stopAudioRecording : startAudioRecording}
          disabled={isLoading || isRecording}
          className={`text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary rounded-full p-2 ${
            isRecordingAudio ? 'bg-red-100 text-red-500' : ''
          }`}
          title={isRecordingAudio ? "Parar gravação de áudio" : "Gravar mensagem de áudio"}
        >
          <Headphones className="h-5 w-5" />
        </button>
        
        {/* Campo de texto */}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          className="flex-1 rounded-full px-4 py-2 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
          disabled={isLoading}
        />
        
        {/* Botão de envio */}
        <button
          type="submit"
          disabled={isLoading || !message.trim()}
          className="bg-primary text-white rounded-full p-2 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <SendIcon className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
