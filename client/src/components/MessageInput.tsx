import { useState, FormEvent, KeyboardEvent, useRef, ChangeEvent } from "react";
import { SendIcon, Image } from "lucide-react";
import { MessageContent } from "@shared/schema";

interface MessageInputProps {
  onSendMessage: (message: string | MessageContent) => void;
  isLoading: boolean;
}

export default function MessageInput({
  onSendMessage,
  isLoading,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (imagePreview) {
      // If there's an image preview, send that
      const imageContent: MessageContent = {
        type: "image",
        url: imagePreview,
        alt: "Imagem enviada pelo usuário",
      };

      // If there's also a text message, append it
      if (message.trim()) {
        imageContent.alt = message.trim();
      }

      onSendMessage(imageContent);
      setImagePreview(null);
      setMessage("");
    } else if (message.trim() && !isLoading) {
      // Otherwise just send the text message
      onSendMessage(message);
      setMessage("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && !isLoading) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Reset the input value so the same image can be uploaded again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const clearImagePreview = () => {
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
      {/* Image preview */}
      {imagePreview && (
        <div className="mb-4 relative">
          <img
            src={imagePreview}
            alt="Preview"
            className="rounded-lg max-h-36 mx-auto object-contain"
          />
          <button
            type="button"
            onClick={clearImagePreview}
            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}

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

        {/* Campo de texto */}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            imagePreview
              ? "Adicione uma descrição (opcional)..."
              : "Digite sua mensagem..."
          }
          className="flex-1 rounded-full px-4 py-2 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-primary dark:bg-gray-700 dark:text-white"
          disabled={isLoading}
        />

        {/* Botão de envio */}
        <button
          type="submit"
          disabled={isLoading || (!message.trim() && !imagePreview)}
          className="bg-primary text-white rounded-full p-2 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <SendIcon className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
