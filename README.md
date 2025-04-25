# Gemini + Perenual Chatbot

Um chatbot que combina o poder do Google Gemini para conversas e o Perenual para identificação de plantas.

## Visão Geral

Este projeto é um aplicativo web full-stack construído usando as seguintes tecnologias:

-   Frontend: React, TypeScript, Vite, Tailwind CSS
-   Backend: Node.js, TypeScript, Express
-   Banco de Dados: Drizzle ORM, SQLite
-   IA:	Google Gemini, Perenual

O aplicativo permite que os usuários participem de conversas e identifiquem plantas enviando imagens.

## Pré-requisitos

Antes de executar o aplicativo, você precisará ter o seguinte instalado:

-   [Node.js](https://nodejs.org/)
-   [npm](https://www.npmjs.com/)


## Executando o Aplicativo

1.  Instale as dependências:

    ```bash
    npm install
    ```

2.  Inicie o cliente e o servidor:

    ```bash
    npm run dev
    ```

    Este comando iniciará ambos os servidores simultaneamente. O frontend estará acessível em `http://localhost:5173` e o backend em `http://localhost:3000`.

## Uso

1.  Insira um nome de usuário no modal.
2.  Digite sua mensagem no campo de entrada e pressione Enter ou clique no botão Enviar.
3.  Para usar a detecção de plantas, carregue uma foto de uma planta.
4.  Veja a resposta gerada pela API Gemini.

## Contribuições

Contribuições são bem-vindas! Por favor, sinta-se à vontade para enviar pull requests.

## Licença

[MIT](LICENSE)
