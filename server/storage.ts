import {
  users,
  type User,
  type InsertUser,
  messages,
  type Message,
} from "@shared/schema";

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

// Definição da persona da IA (Instrução sobre imagem refinada)
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

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.log("Error: GEMINI_API_KEY environment variable is not set.");
        throw new Error("GEMINI_API_KEY environment variable is not set");
      }
      const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

      let conversationHistoryText = "";
      if (conversationId) {
        console.log(`Fetching conversation history for ID: ${conversationId}`);
        const history = await this.getConversationHistory(conversationId);
        // Exclude the last message which is the current user prompt
        const relevantHistory = history.slice(0, -1);
        if (relevantHistory.length > 0) {
          conversationHistoryText = `

Histórico da conversa anterior:
${relevantHistory.join("")}`;
          console.log("Conversation history fetched.");
        } else {
           console.log("No relevant conversation history found.");
        }
        // Add user's current message to history *before* generating AI response
        const userMessageContent = prompt + (imageBase64 ? " (imagem anexada)" : "");
        console.log(`Adding user message to history: ${userMessageContent}`);
        await this.addMessageToConversation(conversationId, userMessageContent, true);
      }

      let identifiedPlantName: string | null = null;
      let perenualDetails: any = null;

      // --- Step 1: Use Gemini to identify the plant from the image if present ---
      if (imageBase64) {
        console.log("Image detected. Attempting to identify plant with Gemini...");
        const identificationPrompt = `Identify the plant in the image. Respond with ONLY the common English name of the plant and nothing else. If you cannot identify the plant, respond with "unknown".`;
        console.log(`Gemini identification prompt: ${identificationPrompt}`);

        const identificationRequestBody = {
          contents: [
            {
              parts: [
                { text: identificationPrompt },
                { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }
              ]
            }
          ],
          generationConfig: {
            temperature: 0,
            topK: 1,
            topP: 1,
            maxOutputTokens: 50, // Keep identification response short
          },
        };

        console.log("Sending identification request to Gemini API...");
        const identificationResponse = await fetch(`${geminiUrl}?key=${apiKey}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(identificationRequestBody),
        });

        if (identificationResponse.ok) {
          const identificationData = await identificationResponse.json();
          console.log("Received identification response from Gemini.", JSON.stringify(identificationData));
          if (identificationData.candidates && identificationData.candidates.length > 0 && identificationData.candidates[0].content && identificationData.candidates[0].content.parts && identificationData.candidates[0].content.parts.length > 0) {
            const geminiIdentification = identificationData.candidates[0].content.parts[0].text.trim();
            console.log(`Gemini returned identification: "${geminiIdentification}"`);
            if (geminiIdentification.toLowerCase() !== "unknown") {
              identifiedPlantName = geminiIdentification;
              console.log(`Identified plant name set to: ${identifiedPlantName}`);
            } else {
              console.log("Gemini could not identify the plant. Identified as 'unknown'.");
            }
          } else {
            console.error("Invalid identification response structure from Gemini:", JSON.stringify(identificationData, null, 2));
          }
        } else {
           const errorText = await identificationResponse.text();
           console.error(`Gemini identification API error: ${identificationResponse.status} ${errorText}`);
        }
      } else {
         console.log("No image detected. Skipping Gemini identification step.");
      }

      // --- Step 2: If plant identified, use Perenual to get details ---
      if (identifiedPlantName) {
        console.log(`Plant identified as "${identifiedPlantName}". Querying Perenual for details...`);
        try {
           // Use backend endpoint to benefit from caching
           console.log(`Calling backend Perenual search endpoint with query: ${identifiedPlantName}`);
           const searchResponse = await fetch(`http://localhost:3000/api/perenual/search?q=${encodeURIComponent(identifiedPlantName)}`);

           if (searchResponse.ok) {
              const searchData = await searchResponse.json();
              console.log("Received search response from Perenual backend.", JSON.stringify(searchData));
              if (searchData.data && searchData.data.length > 0) {
                const firstResult = searchData.data[0];
                console.log(`Found search result in Perenual. Plant ID: ${firstResult.id}, Common Name: ${firstResult.common_name}`);
                 // Use backend endpoint to benefit from caching
                console.log(`Calling backend Perenual detail endpoint for ID: ${firstResult.id}`);
                const detailsResponse = await fetch(`http://localhost:3000/api/perenual/detail/${firstResult.id}`);

                if (detailsResponse.ok) {
                   perenualDetails = await detailsResponse.json();
                   console.log("Successfully fetched Perenual details from backend.", perenualDetails.common_name);
                   console.log("Perenual Details:", JSON.stringify(perenualDetails));
                } else {
                   const errorText = await detailsResponse.text();
                   console.error(`Perenual details API error from backend: ${detailsResponse.status} ${errorText}`);
                }
              } else {
                console.log(`Perenual search returned no results for "${identifiedPlantName}".`);
              }
           } else {
              const errorText = await searchResponse.text();
              console.error(`Perenual search API error from backend: ${searchResponse.status} ${errorText}`);
           }
        } catch (error) {
           console.error("Error during Perenual API call in storage:", error);
        }
      } else {
         console.log("No plant name identified by Gemini. Skipping Perenual lookup.");
      }

      // --- Step 3: Generate final response using Gemini with enriched prompt ---
      let finalPromptText = prompt;
      console.log(`Initial finalPromptText (based on original prompt): "${finalPromptText}"`);

      if (identifiedPlantName && perenualDetails) {
         console.log("Plant identified and Perenual details found. Enriching prompt.");
         // If plant was identified and details found, enrich the original prompt
         const detailsText = `

Informações adicionais sobre ${perenualDetails.common_name || identifiedPlantName} (Fonte: Perenual):
- Nome científico: ${perenualDetails.scientific_name || 'Não disponível'}
- Família: ${perenualDetails.family || 'Não disponível'}
- Gênero: ${perenualDetails.genus || 'Não disponível'}
- Tipo de planta: ${perenualDetails.type || 'Não disponível'}
- Tamanho médio: ${perenualDetails.height?.cm ? perenualDetails.height.cm + ' cm' : 'Não disponível'}
- Clima nativo: ${perenualDetails.native ? perenualDetails.native.join(', ') : 'Não disponível'}`;
        
         if (prompt && prompt.trim() !== "") {
             finalPromptText = `${prompt}${detailsText}`; // Append details to user's prompt
             console.log("Appended Perenual details to original prompt. finalPromptText:", finalPromptText);
         } else {
             finalPromptText = `Com base na imagem, identifiquei uma ${identifiedPlantName}.${detailsText}

Como posso te ajudar com isso?`; // Default prompt if user didn't provide one
              console.log("Created default prompt with Perenual details as original prompt was empty/vague. finalPromptText:", finalPromptText);
         }

      } else if (imageBase64 && !identifiedPlantName) {
          console.log("Image sent, but no plant identified by Gemini.");
          // Image was sent but Gemini couldn't identify
           finalPromptText = "Analisei a imagem, mas não consegui identificar a planta. Por favor, você pode me dizer o nome da planta ou fornecer mais detalhes?";
           console.log("Set finalPromptText for no identification:", finalPromptText);
      } else if (imageBase64 && identifiedPlantName && !perenualDetails) {
         console.log(`Image sent, Gemini identified "${identifiedPlantName}", but no Perenual details found.`);
         // Image was sent, Gemini identified, but Perenual found nothing
          finalPromptText = `Analisei a imagem e acredito que seja uma ${identifiedPlantName}. No entanto, não consegui encontrar informações detalhadas sobre ela no meu banco de dados. Posso tentar responder sua pergunta com base no que já sei, ou você pode me fornecer mais informações?`;
          console.log("Set finalPromptText for no Perenual details:", finalPromptText);
      } else {
         console.log("No image and no specific plant name extracted by frontend.");
         // No image and no specific plant name extracted by frontend logic
         // The original prompt is used as is.
         finalPromptText = prompt;
         console.log("Using original prompt as finalPromptText:", finalPromptText);
      }

      const finalRequestBody = {
        contents: [
           // Include persona, history, and the final enriched/adjusted prompt
           { parts: [{ text: `${EVA_PERSONA}${conversationHistoryText}

Usuário: ${finalPromptText}` }] }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        systemInstruction: {
           parts: [{ text: "" }] // System instruction handled in prompt text
        }
      };

      console.log("Sending final prompt to Gemini for response generation...");
      console.log("Final prompt sent to Gemini:", finalRequestBody.contents[0].parts[0].text);
      const finalResponse = await fetch(`${geminiUrl}?key=${apiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalRequestBody),
      });

      if (!finalResponse.ok) {
        const errorText = await finalResponse.text();
         console.error("Final Gemini API Request Body:", JSON.stringify(finalRequestBody, null, 2));
        throw new Error(`Final Gemini API error: ${finalResponse.status} ${errorText}`);
      }

      const finalData = await finalResponse.json();
      console.log("Received final response from Gemini.", JSON.stringify(finalData));

       if (!finalData.candidates || finalData.candidates.length === 0 || !finalData.candidates[0].content || !finalData.candidates[0].content.parts || finalData.candidates[0].content.parts.length === 0) {
        console.error("Invalid final response structure from Gemini API:", JSON.stringify(finalData, null, 2));
        throw new Error("Received invalid final response structure from Gemini API.");
      }

      const aiResponse = finalData.candidates[0].content.parts[0].text;
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
