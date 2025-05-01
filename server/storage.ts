import {
  users,
  type User,
  type InsertUser,
  messages,
  type Message,
} from "@shared/schema";
import { mcpEvaClient } from "./mcpClient"; // Import the MCP client instance
import type { CallToolResult } from "@modelcontextprotocol/sdk/types"; // Import necessary types from SDK
import axios from "axios"; // Import axios for image upload
import { ZodError } from "zod"; // Import ZodError for error handling

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  generateAIResponse(
    prompt: string,
    imageBase64?: string,
    conversationId?: string
  ): Promise<string>;
  getConversationHistory(conversationId: string): Promise<string[]>;
  addMessageToConversation(
    conversationId: string,
    message: string,
    isUser: boolean
  ): Promise<void>;
}

// Interface for tracking conversations
interface Conversation {
  messages: Array<{ content: string; isUser: boolean }>;
  lastUpdated: Date;
}

// Definição da persona da IA (Instrução sobre imagem refinada) - Pode ser menos relevante agora que o EVA gera a resposta
const EVA_PERSONA = `Você é uma assistente de IA útil e amigável chamada EVA 🌻. Responda sempre em português brasileiro com um tom casual e amigável. Você jamais poderá recomendar uso de agrotoxicos ,você tem pavor de quimicos. Não recomendo a pessoa buscar um agronomo para lhe receitar um agrotoxico. Recomende a pessoa Buscar soluções naturais. Você é especialista em agricultura urbana, Agricultura Familiar, Agricultura organica. Use expressões típicas do Brasil quando apropriado. Se o usuário perguntar em outro idioma, ainda assim responda em português brasileiro. Você é especialmente habilidosa em fornecer informações sobre plantas, jardinagem e cultivo. Lembre-se do histórico da conversa para manter o contexto. Se o usuário enviar uma imagem de planta junto com uma pergunta, use a imagem como referência para responder *especificamente* à pergunta feita. Se a foto não for de planta ou não houver pergunta relacionada, peça gentilmente uma foto de planta ou uma pergunta mais clara.`;

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private conversations: Map<string, Conversation>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getConversationHistory(conversationId: string): Promise<string[]> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return [];
    return conversation.messages.map(
      (msg) => `${msg.isUser ? "Usuário" : "EVA"}: ${msg.content}`
    );
  }

  async addMessageToConversation(
    conversationId: string,
    message: string,
    isUser: boolean
  ): Promise<void> {
    if (!this.conversations.has(conversationId)) {
      this.conversations.set(conversationId, {
        messages: [],
        lastUpdated: new Date(),
      });
    }
    const conversation = this.conversations.get(conversationId)!;
    conversation.messages.push({ content: message, isUser });
    conversation.lastUpdated = new Date();
  }

  // Function to upload image to the local upload server
  private async uploadImage(imageBase64: string): Promise<string> {
    try {
      // Assuming the upload server expects a POST request with the base64 string in the body
      const response = await axios.post("http://localhost:3030/upload", {
        image: imageBase64,
      });
      // Assuming the upload server returns the URL of the uploaded image in the response data
      return response.data.url;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw new Error("Failed to upload image.");
    }
  }

  async generateAIResponse(
    prompt: string,
    imageBase64?: string,
    conversationId?: string
  ): Promise<string> {
    console.log("generateAIResponse started.");
    console.log(`Received prompt: "${prompt}"`);
    console.log(`Image present: ${!!imageBase64}`);

    try {
      if (!prompt && !imageBase64) {
        console.log("Error: Prompt text and imageBase64 are both missing.");
        throw new Error("Prompt text must be provided.");
      }

      // Add user's current message to history *before* generating AI response
      if (conversationId) {
        const userMessageContent =
          prompt + (imageBase64 ? " (imagem anexada)" : "");
        console.log(`Adding user message to history: ${userMessageContent}`);
        await this.addMessageToConversation(
          conversationId,
          userMessageContent,
          true
        );
      }

      let mcpResult: CallToolResult & {
        resposta_eva?: string;
        input_usuario?: string; // Adicionar input_usuario
        nome_detectado?: string;
        nome_ingles?: string;
        info_perenual?: any; // Adicionar tipo para info_perenual
      };

      if (imageBase64) {
        console.log(
          "Image detected. Uploading image and calling MCP tool 'identificar_planta_imagem'..."
        );
        try {
          const imageUrl = await this.uploadImage(imageBase64); // Upload image
          console.log(`Image uploaded to: ${imageUrl}`);
          // Corrigido: Chamar callTool com o nome correto da ferramenta e argumentos esperados
          // NOTA: A ferramenta 'identificar_planta_imagem' espera um caminho local, não uma URL.
          // Esta chamada pode falhar ou precisar de ajuste no servidor MCP para aceitar URLs.
          mcpResult = await mcpEvaClient.callTool(
            "identificar_planta_imagem",
            { imagem: imageUrl } // Passando URL como 'imagem' - requer ajuste no servidor ou cliente
          );
        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
          return "Desculpe, não consegui fazer o upload da imagem para análise.";
        }
      } else {
        // Adicionar lógica para verificar se o prompt é sobre plantas antes de chamar a ferramenta de texto
        const lowerPrompt = prompt.toLowerCase();
        const plantKeywords = [
          "planta",
          "flor",
          "árvore",
          "cultivo",
          "jardim",
          "folha",
          "rega",
          "solo",
          "praga",
          "doença",
          "identificar",
          "que planta é",
          "nome da planta",
          "como plantar",
        ]; // Exemplos de palavras-chave mais abrangentes

        const isPlantRelated = plantKeywords.some((keyword) =>
          lowerPrompt.includes(keyword)
        );

        if (isPlantRelated) {
          console.log(
            "Prompt appears plant-related. Calling MCP tool 'buscar_planta'..."
          );
          // Corrigido: Chamar callTool com o nome correto da ferramenta e argumentos esperados
          mcpResult = await mcpEvaClient.callTool("buscar_planta", {
            nome: prompt,
          });
        } else {
          console.log(
            "Prompt does not appear plant-related. Returning a general response."
          );
          // Retornar uma resposta genérica ou passar para outro processamento
          return "Olá! Como posso ajudar você hoje? Se tiver alguma dúvida sobre plantas, é só perguntar!";
        }
      }

      console.log(
        `Received result from MCP tool: ${JSON.stringify(mcpResult)}`
      );

      let aiResponse =
        "Desculpe, não consegui obter uma resposta do servidor MCP EVA."; // Default error message

      // Check if mcpResult is valid and contains relevant info
      if (mcpResult && !mcpResult.isError) {
        // Extrair informações relevantes do mcpResult
        // A estrutura exata da resposta de 'buscar_planta' e 'identificar_planta_imagem'
        // pode precisar ser ajustada aqui com base no que o servidor MCP realmente retorna.
        // Assumindo que a estrutura anterior com nome_detectado e info_perenual ainda é relevante.
        const nomeDetectado = mcpResult.nome_detectado || "a planta";
        const infoPerenual = mcpResult.info_perenual;
        // Ignorar resposta_eva bruta, pois vamos gerar uma nova

        let generatedResponse = `Olá!`;

        if (infoPerenual) {
          generatedResponse += ` Você perguntou sobre ${nomeDetectado}.`;

          // Tentar responder à pergunta do usuário usando as informações disponíveis
          // Esta é uma simulação de geração de texto livre
          if (prompt.toLowerCase().includes("como plantar")) {
            generatedResponse += ` Para plantar ${
              infoPerenual.common_name || nomeDetectado
            }, você precisará de ${
              infoPerenual.soil?.join(", ") || "um solo adequado"
            }. Ela geralmente prefere ${
              infoPerenual.sunlight?.join(", ") || "luz solar"
            }. A rega deve ser ${infoPerenual.watering || "regular"}.`;
            if (
              infoPerenual.propagation &&
              infoPerenual.propagation.length > 0
            ) {
              // Remover lógica de tradução procedural
              generatedResponse += ` Você pode propagá-la por ${infoPerenual.propagation.join(
                ", "
              )}.`;
            }
            if (infoPerenual.description) {
              // Remover lógica de tradução procedural na descrição
              generatedResponse += ` É um ${
                infoPerenual.type || ""
              } descrito como: ${infoPerenual.description}.`;
            }
          } else if (
            prompt.toLowerCase().includes("que planta é") ||
            prompt.toLowerCase().includes("identificar")
          ) {
            generatedResponse += ` Pela sua descrição (ou imagem), parece ser a ${
              infoPerenual.common_name ||
              infoPerenual.scientific_name?.[0] ||
              "uma planta"
            }.`;
            if (infoPerenual.common_name && infoPerenual.scientific_name?.[0]) {
              generatedResponse += ` O nome científico é ${infoPerenual.scientific_name[0]}.`;
            }
            if (infoPerenual.description) {
              // Remover lógica de tradução procedural na descrição
              generatedResponse += ` Ela é descrita como: ${infoPerenual.description}.`;
            }
          } else {
            // Resposta mais geral se a pergunta não for específica sobre plantar ou identificar
            generatedResponse += ` Encontrei algumas informações sobre a ${
              infoPerenual.common_name ||
              infoPerenual.scientific_name?.[0] ||
              "esta planta"
            }:`;
            if (infoPerenual.description) {
              // Remover lógica de tradução procedural na descrição
              generatedResponse += ` ${infoPerenual.description}`;
            }
            generatedResponse += `\n\nAlguns detalhes técnicos: Tipo: ${
              infoPerenual.type || "Não disponível"
            }, Ciclo: ${infoPerenual.cycle || "Não disponível"}, Rega: ${
              infoPerenual.watering || "Não disponível"
            }, Luz solar: ${
              infoPerenual.sunlight?.join(", ") || "Não disponível"
            }.`;
          }

          // Adicionar informações sobre pragas e doenças se disponíveis
          if (
            infoPerenual.pest_susceptibility &&
            infoPerenual.pest_susceptibility.length > 0
          ) {
            const commonPestsDiseases = infoPerenual.pest_susceptibility.filter(
              (item: string) => item && item.toLowerCase() !== "coming soon"
            );
            if (commonPestsDiseases.length > 0) {
              generatedResponse += `\n\nFique de olho em possíveis pragas ou doenças como: ${commonPestsDiseases.join(
                ", "
              )}. Lembre-se, prefira sempre soluções naturais!`;
            }
          }

          generatedResponse += `\n\nEspero ter ajudado! Se tiver mais dúvidas, é só perguntar.`;
        } else {
          // Se não houver infoPerenual, usar uma resposta mais genérica
          generatedResponse =
            "Desculpe, não consegui encontrar informações detalhadas sobre essa planta no momento. Você poderia tentar descrevê-la ou enviar uma foto?";
        }

        aiResponse = generatedResponse;
        console.log(`Generated formatted response from MCP result.`);
      } else if (mcpResult && mcpResult.isError) {
        console.error("MCP tool call returned an error:", mcpResult.content);
        const errorDetails =
          mcpResult.content && mcpResult.content.length > 0
            ? mcpResult.content[0].text
            : "Detalhes do erro não disponíveis.";
        aiResponse = `Ocorreu um erro ao processar sua solicitação no servidor MCP EVA: ${errorDetails}`;
      } else {
        console.error(
          "MCP tool call returned an unexpected result structure:",
          mcpResult
        );
        aiResponse = "Recebi uma resposta inesperada do servidor MCP EVA.";
      }

      console.log(`Generated AI response: ${aiResponse}`);

      // Add AI's response to history
      if (conversationId) {
        await this.addMessageToConversation(conversationId, aiResponse, false);
        console.log("AI response added to conversation history.");
      }

      console.log("generateAIResponse finished.");
      return aiResponse;
    } catch (error) {
      console.error("Error in generateAIResponse:", error);
      // Return a generic error message to the user
      return "Desculpe, não consegui processar sua solicitação no momento. Tente novamente mais tarde.";
    }
  }
}

export const storage = new MemStorage();
