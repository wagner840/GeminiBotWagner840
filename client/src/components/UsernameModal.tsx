import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface UsernameModalProps {
  onSubmit: (username: string) => boolean;
}

export default function UsernameModal({ onSubmit }: UsernameModalProps) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate username
    if (username.length < 2 || username.length > 15) {
      setError(true);
      return;
    }

    const success = onSubmit(username);
    if (!success) {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-primary"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Bem-vindo ao Chat Gemini</h2>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Por favor, digite seu nome de usuário para continuar
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <Label htmlFor="username-input">Nome de usuário</Label>
              <Input
                id="username-input"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError(false);
                }}
                placeholder="Digite seu nome de usuário"
                className="mt-1"
                required
                minLength={2}
                maxLength={15}
              />
              {error && (
                <p className="text-red-500 text-xs mt-1">
                  Por favor, insira um nome de usuário válido (2-15 caracteres)
                </p>
              )}
            </div>

            <Button type="submit" className="w-full">
              Começar a Conversar
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
