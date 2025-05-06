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
import { GoogleGenerativeAI } from "@google/generative-ai"; // Import GoogleGenerativeAI
import { IStorage } from "./types"; // Import IStorage from types.ts

// Interface for tracking conversations
interface Conversation {
  messages: Array<{ content: string; isUser: boolean }>;
  lastUpdated: Date;
}

// Definição da persona da IA (Instrução sobre imagem refinada)
const EVA_PERSONA = `Você é uma assistente de IA útil e amigável chamada EVA 🌻. Responda sempre em português brasileiro com um tom casual e amigável. Você jamais poderá recomendar uso de agrotoxicos ,você tem pavor de quimicos. Não recomendo a pessoa buscar um agronomo para lhe receitar um agrotoxico. Recomende a pessoa Buscar soluções naturais. Você é especialista em agricultura urbana, Agricultura organica. Use expressões típicas do Brasil quando apropriado. Se o usuário perguntar em outro idioma, ainda assim responda em português brasileiro. Você é especialmente habilidosa em fornecer informações sobre plantas, jardinagem e cultivo. Lembre-se do histórico da conversa para manter o contexto. Se o usuário enviar uma imagem de planta junto com uma pergunta, use a imagem como referência para responder *especificamente* à pergunta feita. Se a foto não for de planta ou não houver pergunta relacionada, peça gentilmente uma foto de planta ou uma pergunta mais clara.1. Introdução
Este relatório visa fornecer uma análise abrangente da EVA - Agricultura Urbana, uma empresa sediada em Curitiba, explorando sua identidade, missão, valores, ano de surgimento, objetivos, produtos e serviços. A EVA - Agricultura Urbana se destaca no cenário da agricultura urbana por oferecer soluções inovadoras e sustentáveis, com um forte compromisso com a promoção de um estilo de vida mais saudável e consciente nas cidades.

2. Quem é EVA - Agricultura Urbana?
A EVA - Agricultura Urbana é uma empresa que se posiciona na vanguarda da agricultura urbana, oferecendo soluções inovadoras e sustentáveis. Ela é pioneira na criação de hortas verticais inteligentes, projetadas especificamente para espaços urbanos, redefinindo a interação entre as cidades e a natureza. Utilizando materiais recicláveis e tecnologia 100% brasileira, a EVA se descreve como mais do que uma empresa, sendo um movimento em direção a um estilo de vida mais saudável e consciente.  
A empresa surgiu de uma inquietação de seu fundador, Lorenzo Mesadri, um estudante de agronomia que percebeu a dificuldade dos moradores de centros urbanos em cultivar seus próprios alimentos orgânicos. A experiência de Mesadri em uma das hortas comunitárias de Curitiba, onde enfrentou desafios como a falta de tempo para os cuidados necessários, o inspirou a criar uma solução para ajudar as pessoas a manterem suas hortas saudáveis, mesmo com rotinas agitadas. A EVA - Agricultura Urbana foi concebida dentro do Programa Startup Garage da Universidade Federal do Paraná (UFPR), em parceria com o Sebrae/PR.  
A EVA - Agricultura Urbana oferece projetos personalizados de hortas urbanas para residências e empresas em Curitiba e região metropolitana. O processo de implementação envolve uma visita diagnóstica inicial para avaliar as necessidades do cliente, seguida pela apresentação de um orçamento personalizado. A EVA pode executar o projeto ou fornecer o plano para que o cliente o implemente. Além disso, oferece planos de manutenção. A empresa também fornece consultoria agronômica, suporte à produção e serviços de gestão de produção.  
Para entrar em contato com a EVA - Agricultura Urbana, o telefone disponível é +55 (41) 97400-6963 e o e-mail é [email protected]. O site da empresa é eva-au.com.  

3. Missão, Valores e Objetivos
A EVA - Agricultura Urbana está comprometida com a promoção da agricultura urbana e o bem-estar das pessoas. Seu objetivo principal é ajudar as pessoas a cultivarem seus próprios alimentos de forma sustentável, promovendo a conexão com a natureza e a alimentação saudável. A empresa busca ser uma parceira para aqueles que desejam integrar o cultivo em suas rotinas diárias.  
A visão da EVA se estende além da produção de alimentos, buscando promover um estilo de vida sustentável e saudável em áreas urbanas. A empresa acredita no poder transformador da agricultura urbana para criar ambientes mais verdes e sustentáveis. Ao combinar tecnologia, inovação e paixão pela natureza, a EVA está comprometida em criar um futuro mais verde e saudável para as cidades.  
Embora os valores específicos da empresa não estejam explicitamente detalhados nos documentos fornecidos, a ênfase em materiais recicláveis, tecnologia brasileira e a promoção da saúde e bem-estar sugerem valores como sustentabilidade, inovação, responsabilidade social e qualidade de vida. A dedicação em implementar hortas urbanas contribui para a transformação de espaços urbanos em zonas verdes que promovem a saúde e o bem-estar, garantindo a segurança alimentar e melhorando a qualidade de vida urbana.  

4. Ano de Surgimento
A EVA - Agricultura Urbana foi criada em 2020 pelo estudante de agronomia Lorenzo Mesadri. A empresa surgiu a partir de uma iniciativa dentro do Programa Startup Garage da Universidade Federal do Paraná (UFPR), em colaboração com o Sebrae/PR.  

5. Produtos e Serviços
A EVA - Agricultura Urbana oferece uma variedade de produtos e serviços focados em agricultura urbana e bem-estar.  

5.1. Produtos
O principal produto da EVA é a EVA Baby, uma horta vertical inteligente projetada para otimizar espaços urbanos e reduzir o tempo de produção de alimentos orgânicos. A EVA Baby utiliza tecnologia inovadora e 100% brasileira, permitindo o cultivo de vegetais volumosos até duas vezes mais rápido que uma horta convencional. Ela possui luz de LED Full Spectrum com ciclo automático de 10 horas e um sistema de auto irrigação com reservatório de água com duração de até duas semanas. A horta é bivolt, feita de polietileno reciclável com proteção UV e tem capacidade para três espécies de plantas. Acompanha pazinha e um kit de sementes, além de suporte exclusivo via aplicativo e acesso a materiais de apoio. A EVA Baby também se destaca pela economia de energia, com um sistema de compensação luminosa que reduz o gasto energético em até 50% em comparação com outros modelos indoor.  
Outro produto desenvolvido pela startup é a EVA Dália, uma luminária LED para cultivo de hortas maiores, que auxilia no crescimento das plantas e gera uma economia de até 90% em relação às lâmpadas convencionais.  
A EVA também oferece insumos para hortas urbanas.  

Tabela 1: Produtos da EVA - Agricultura Urbana

Produto	Principais Características	Público-Alvo
EVA Baby	Horta vertical inteligente, luz LED Full Spectrum, auto irrigação, materiais recicláveis, bivolt, capacidade para 3 espécies, economia de energia.	Usuários domésticos, espaços urbanos pequenos
EVA Dália	Luminária LED para cultivo, auxilia no crescimento das plantas, economia de até 90% de energia.	Hortas maiores, jardins urbanos
Insumos	Produtos para manutenção e cultivo de hortas urbanas.	Diversos

Exportar para as Planilhas
5.2. Serviços
A EVA - Agricultura Urbana oferece projetos personalizados de hortas urbanas, incluindo hortas verticais e projetos de hortoterapia. Os projetos são customizados para otimizar os espaços disponíveis e atender à demanda por vegetais frescos de famílias ou comunidades.  
A empresa se destaca na área de Hortoterapia, um projeto inovador que integra hortas orgânicas e jardins sensoriais para o desenvolvimento de habilidades psicossociais. Um exemplo de projeto de hortoterapia é o implementado no CERENA (Hospital Menino Deus), que incluiu um jardim sensorial e hortas verticais e horizontais para a produção de alimentos orgânicos. A EVA também criou um Espaço de Descompressão no mesmo hospital, com jardins verticais e horizontais para o relaxamento e atividades terapêuticas dos funcionários.  
A empresa oferece serviços de consultoria agronômica, suporte à produção e gestão de produção. A empresa se posiciona como um ecossistema de inovação e suporte, oferecendo suporte contínuo por meio de chatbots e uma comunidade de agricultores urbanos onde os clientes podem compartilhar experiências e melhores práticas.  
A empresa também realiza a instalação de hortas, como a instalada no terraço do Pinhão Hub, incentivando o cultivo de alimentos em espaços urbanos. Outro projeto notável é a horta vertical inteligente instalada na entrada do setor de orgânicos do Mercado Municipal de Curitiba, com irrigação automatizada em parceria com a Irrigate. A EVA também realiza a expansão e manutenção de hortas orgânicas e projetos de criação de galinhas, como o projeto com o Sr. Amaral, com foco em controle orgânico e agroecológico de pragas e doenças.  

Tabela 2: Serviços Oferecidos pela EVA - Agricultura Urbana

Categoria de Serviço	Descrição	Público-Alvo
Projetos de Horta Urbana	Criação de hortas em ambientes urbanos, incluindo hortas verticais.	Residências, empresas, comunidades
Hortoterapia	Projetos que integram hortas orgânicas e jardins sensoriais para o desenvolvimento de habilidades psicossociais.	Instituições de saúde, escolas, organizações
Consultoria e Suporte	Consultoria agronômica, suporte à produção, gestão de produção, suporte via chatbot e comunidade de agricultores urbanos.	Indivíduos, empresas, projetos
Instalação e Manutenção	Instalação de hortas urbanas (verticais e horizontais) e planos de manutenção.	Residências, empresas, instituições

Exportar para as Planilhas
6. Conclusão
A EVA - Agricultura Urbana de Curitiba demonstra ser uma empresa inovadora e com um forte compromisso com a sustentabilidade e o bem-estar urbano. Desde sua fundação em 2020, originada de uma necessidade identificada na prática da agricultura comunitária, a empresa tem evoluído para oferecer uma gama de produtos e serviços que facilitam a prática da agricultura em ambientes urbanos. A EVA Baby, seu principal produto, exemplifica a combinação de tecnologia e praticidade para o cultivo de alimentos saudáveis em espaços reduzidos. Além disso, os serviços de projetos personalizados e hortoterapia evidenciam a preocupação da empresa em promover benefícios que vão além da produção de alimentos, impactando positivamente a saúde física e mental dos moradores das cidades. A trajetória da EVA, desde uma startup universitária até uma empresa reconhecida no cenário da agricultura urbana, reflete seu potencial de crescimento e sua contribuição para a construção de cidades mais verdes e sustentáveis.

`;

// Initialize the Google Generative AI client
//const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!); // Use non-null assertion assuming API key is set

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private conversations: Map<string, Conversation>;
  currentId: number;
  private geminiApiKey: string;

  constructor(geminiApiKey: string) {
    this.users = new Map();
    this.conversations = new Map();
    this.currentId = 1;
    this.geminiApiKey = geminiApiKey;
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
      console.log("Attempting to upload image..."); // Added log
      // Assuming the upload server expects a POST request with the base64 string in the body
      const response = await axios.post("http://localhost:3030/upload", {
        image: imageBase64,
      });
      console.log("Image upload successful."); // Added log
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
    console.log(`Image present (before processing): ${!!imageBase64}`);

    // Read DISABLE_MCP environment variable
    const disableMcp =
      process.env.DISABLE_MCP === "true" || process.env.DISABLE_MCP === "1";
    console.log(`[Storage] Valor de DISABLE_MCP lido: ${process.env.DISABLE_MCP}, disableMcp é: ${disableMcp}`); // Log adicionado aqui

    // Log the status of the API key
    console.log('[Storage] GEMINI_API_KEY:', this.geminiApiKey ? 'Set' : 'Not set');

    if (disableMcp) {
      console.log("[Storage] MCP is disabled via environment variable.");
    }

    // Initialize the Google Generative AI client HERE
    const genAI = new GoogleGenerativeAI(this.geminiApiKey); // Use non-null assertion assuming API key is set

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

      let aiResponse = "";
      let mcpResult:
        | (CallToolResult & {
            resposta_eva?: string;
            input_usuario?: string;
            nome_detectado?: string;
            nome_ingles?: string;
            info_perenual?: any;
          })
        | undefined = undefined;

      // --- Prepare prompt for Gemini ---
      let geminiPrompt = `${EVA_PERSONA}

Usuário: ${prompt}`;

      // Check if the user is asking "quem é a eva" and add company info if so
      const lowerPrompt = prompt.toLowerCase();

      // --- Call Gemini Model for initial response ---
      try {
        // Changed model from "gemini-pro" to "gemini-1.5-flash-latest"
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash-latest",
        });
        const chat = model.startChat({
          history: conversationId
            ? this.conversations.get(conversationId)?.messages.map((msg) => ({
                role: msg.isUser ? "user" : "model",
                parts: [{ text: msg.content }],
              })) || []
            : [],
          // Add EVA_PERSONA to the system instructions or initial message if supported
          // For now, we'll prepend it to the prompt or handle it in a different way
        });

        // Prepare content for Gemini, including image if available
        const content: any[] = [{ text: geminiPrompt }];
        if (imageBase64) {
          content.push({
            inlineData: {
              mimeType: "image/png", // Assuming PNG, adjust if necessary
              data: imageBase64,
            },
          });
        }

        const result = await chat.sendMessage(content); // Send content array
        const response = await result.response;
        aiResponse = response.text();
        console.log(`Initial Gemini response generated: ${aiResponse}`);
      } catch (geminiError) {
        console.error("Error calling Gemini model:", geminiError);
        // If Gemini call fails, provide a generic fallback message internally
        aiResponse = "Desculpe, não consegui gerar uma resposta no momento.";
      }

      // --- Logic to conditionally call MCP Tool ---
      // Determine if the prompt or the presence of an image warrants calling the MCP tool.
      // This logic should be more sophisticated than just keyword matching.
      // It could involve analyzing the prompt's intent and the initial Gemini response.

      let shouldCallMcp = false;

      if (imageBase64) {
        // If an image is provided, it's highly likely the user wants plant identification
        shouldCallMcp = true;
        console.log(
          "Image detected. Will attempt to call MCP tool 'identificar_planta_imagem'."
        );
      } else {
        // Analyze prompt for clear intent related to plant search or details
        const plantSearchKeywords = [
          "que planta é",
          "identificar planta",
          "nome da planta",
          "detalhes sobre",
          "como cuidar de",
          "informações sobre",
          "características da",
          "praga", // Added more keywords
          "doença",
          "solo",
          "rega",
          "luz solar",
          "propagar",
          "cultivar",
          "plantar",
        ];

        shouldCallMcp = plantSearchKeywords.some((keyword) =>
          lowerPrompt.includes(keyword)
        );

        if (shouldCallMcp) {
          console.log(
            "Prompt indicates a need for plant search/details. Will attempt to call MCP tool 'buscar_planta'."
          );
        }
      }

      // --- Check MCP connection and DISABLE_MCP variable before calling tool ---
      if (shouldCallMcp && disableMcp) {
        console.log(
          "[Storage] MCP is disabled via environment variable. Skipping MCP tool call."
        );
        shouldCallMcp = false; // Ensure MCP is skipped
      } else if (shouldCallMcp && !mcpEvaClient.isConnected) {
        console.log(
          "[Storage] MCP client is not connected. Skipping MCP tool call."
        );
        shouldCallMcp = false; // Do not attempt to call MCP if not connected
        // Optionally, add a message to the AI response indicating MCP is unavailable
      }

      // --- Call MCP Tool ---
      if (shouldCallMcp && mcpEvaClient.isConnected && !disableMcp) {
        if (imageBase64) {
          console.log(
            "Image detected. Uploading image and calling MCP tool 'identificar_planta_imagem'..."
          );
          try {
            const imageUrl = await this.uploadImage(imageBase64); // Upload image
            console.log(`Image uploaded to: ${imageUrl}`);
            // NOTE: The 'identificar_planta_imagem' tool expects a local path, not a URL.
            // This call might fail or require adjustment in the MCP server to accept URLs.
            // For now, passing the URL as 'imagem'.
            mcpResult = await mcpEvaClient.callTool(
              "identificar_planta_imagem",
              { imagem: imageUrl } // Passando URL como 'imagem' - requer ajuste no servidor ou cliente
            );
            console.log(
              `Result from 'identificar_planta_imagem': ${JSON.stringify(
                mcpResult
              )}`
            ); // Added log for MCP result
          } catch (uploadError) {
            console.error("Image upload failed:", uploadError);
            // If image upload fails, we might still want to use Gemini's initial response
            console.log(
              "Image upload failed, relying on initial Gemini response."
            );
            shouldCallMcp = false; // Prevent further processing with MCP result
          }
        } else {
          console.log("Calling MCP tool 'buscar_planta'...");
          try {
            mcpResult = await mcpEvaClient.callTool("buscar_planta", {
              nome: prompt,
            });
            console.log(
              `Result from 'buscar_planta': ${JSON.stringify(mcpResult)}`
            ); // Added log for MCP result
          } catch (mcpError) {
            console.error("Error calling MCP tool 'buscar_planta':", mcpError);
            // If MCP call failed, we might still want to use Gemini's initial response
            console.log(
              "MCP tool call failed, relying on initial Gemini response."
            );
            shouldCallMcp = false; // Prevent further processing with MCP result
          }
        }
      }

      // --- Process MCP Result and Combine with AI Response ---
      // This block will now only execute if MCP was successfully called and returned a non-error result
      if (
        shouldCallMcp &&
        mcpResult &&
        !mcpResult.isError &&
        mcpEvaClient.isConnected &&
        !disableMcp
      ) {
        console.log(
          `Received result from MCP tool: ${JSON.stringify(mcpResult)}`
        );

        const nomeDetectado = mcpResult.nome_detectado || "a planta";
        const infoPerenual = mcpResult.info_perenual;

        let mcpFormattedResponse = "";

        if (infoPerenual) {
          mcpFormattedResponse += `

Informação adicional da EVA 🌻:`; // Indicate this is supplementary info

          // Tentar responder à pergunta do usuário usando as informações disponíveis
          // Esta é uma simulação de geração de texto livre
          if (prompt.toLowerCase().includes("como plantar")) {
            mcpFormattedResponse += ` Para plantar ${
              infoPerenual.common_name || nomeDetectado
            }, você precisará de ${
              infoPerenual.soil?.join(", ") || "um solo adequado"
            }. Ela geralmente prefere ${
              infoPerenual.sunlight?.join(", ") || "luz solar"
            }. A rega deve ser ${infoPerenual.watering || "regular"}.`;
            if (
              infoPerenual.propagation &&
              infoPerenual.pest_susceptibility.length > 0
            ) {
              mcpFormattedResponse += ` Você pode propagá-la por ${infoPerenual.propagation.join(
                ", "
              )}.`;
            }
            if (infoPerenual.description) {
              mcpFormattedResponse += ` É um ${
                infoPerenual.type || ""
              } descrito como: ${infoPerenual.description}.`;
            }
          } else if (
            prompt.toLowerCase().includes("que planta é") ||
            prompt.toLowerCase().includes("identificar")
          ) {
            mcpFormattedResponse += ` Pela sua descrição (ou imagem), parece ser a ${
              infoPerenual.common_name ||
              infoPerenual.scientific_name?.[0] ||
              "uma planta"
            }.`;
            if (infoPerenual.common_name && infoPerenual.scientific_name?.[0]) {
              mcpFormattedResponse += ` O nome científico é ${infoPerenual.scientific_name[0]}.`;
            }
            if (infoPerenual.description) {
              mcpFormattedResponse += ` Ela é descrita como: ${infoPerenual.description}.`;
            }
          } else {
            // Resposta mais geral se a pergunta não for específica sobre plantar ou identificar
            mcpFormattedResponse += ` Encontrei algumas informações sobre a ${
              infoPerenual.common_name ||
              infoPerenual.scientific_name?.[0] ||
              "esta planta"
            }:`;
            if (infoPerenual.description) {
              mcpFormattedResponse += ` ${infoPerenual.description}`;
            }
            mcpFormattedResponse += `

Alguns detalhes técnicos: Tipo: ${
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
              mcpFormattedResponse += `

Fique de olho em possíveis pragas ou doenças como: ${commonPestsDiseases.join(
                ", "
              )}. Lembre-se, prefira sempre soluções naturais!`;
            }
          }

          // Combine Gemini's initial response with the MCP result
          aiResponse = `${aiResponse}

${mcpFormattedResponse}`;
        } else {
          // If no infoPerenual from MCP, do not add a specific message about it
          console.log("MCP tool did not return specific plant info.");
          // aiResponse remains the initial Gemini response
        }
      } else if (shouldCallMcp && mcpResult && mcpResult.isError) {
        console.error("MCP tool call returned an error:", mcpResult.content);
        // If MCP call failed, do not add a specific error message to the user response
        console.log(
              "MCP tool call failed, relying on initial Gemini response."
            );
        // aiResponse remains the initial Gemini response
      }

      // Add AI response to history
      if (conversationId) {
        console.log(`Adding AI response to history: ${aiResponse}`);
        await this.addMessageToConversation(conversationId, aiResponse, false);
      }

      console.log("generateAIResponse finished.");
      return aiResponse;
    } catch (error) {
      console.error("Error in generateAIResponse:", error);
      // If any other error occurs, return a generic error message
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      // Add error message to history as AI response
      if (conversationId) {
        await this.addMessageToConversation(
          conversationId,
          `Ocorreu um erro ao processar sua solicitação: ${errorMessage}`,
          false
        );
      }
      throw new Error(`Failed to generate AI response: ${errorMessage}`);
    }
  }
}

// Export a singleton instance
//export const storage = new MemStorage();
