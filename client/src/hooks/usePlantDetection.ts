import { useCallback } from 'react';
import { searchPlants, getPlantDetails } from '@/lib/utils';
import { MessageContent } from '@shared/schema';

// Este hook será usado para detectar menções a plantas na conversa
// e enriquecer a resposta com informações da API Perenual
export default function usePlantDetection() {
  // Esta função analisa o texto buscando comandos relacionados a plantas
  const detectPlantCommand = useCallback((message: string): boolean => {
    const lowerMessage = message.toLowerCase();
    
    // Verifica se a mensagem contém pedidos específicos para informações sobre plantas
    return (
      lowerMessage.includes('planta') || 
      lowerMessage.includes('jardim') || 
      lowerMessage.includes('flor') ||
      lowerMessage.includes('cultivar') ||
      lowerMessage.includes('regar') ||
      lowerMessage.includes('como cuidar')
    );
  }, []);

  // Esta função será usada para enriquecer o prompt da IA com informações de plantas
  // Será implementada quando tivermos a chave API
  const enrichPromptWithPlantInfo = useCallback(async (prompt: string, apiKey: string): Promise<string> => {
    try {
      // Se não for um comando de planta, retorna o prompt original
      if (!detectPlantCommand(prompt)) {
        return prompt;
      }

      // Extrai o nome da planta do prompt
      const words = prompt.split(' ');
      let plantQuery = '';
      
      // Busca por padrões como "planta X" ou "como cuidar de X"
      for (let i = 0; i < words.length - 1; i++) {
        if (
          words[i].toLowerCase() === 'planta' || 
          words[i].toLowerCase() === 'plantar' ||
          words[i].toLowerCase() === 'cultivar' ||
          (words[i].toLowerCase() === 'cuidar' && words[i-1].toLowerCase() === 'como') ||
          words[i].toLowerCase() === 'flor'
        ) {
          // Pega as próximas 2-3 palavras como nome da planta
          plantQuery = words.slice(i + 1, i + 4).join(' ').replace(/[.,?!;:]/g, '');
          break;
        }
      }
      
      if (!plantQuery) {
        return prompt;
      }
      
      // Busca informações sobre a planta na API
      const searchResults = await searchPlants(plantQuery, apiKey);
      
      if (searchResults && searchResults.data && searchResults.data.length > 0) {
        const firstResult = searchResults.data[0];
        const plantId = firstResult.id;
        
        // Busca detalhes da planta
        const plantDetails = await getPlantDetails(plantId, apiKey);
        
        // Adiciona informações da planta e as novas instruções ao prompt
        const enrichedPrompt = `
Instruções importantes para a IA:
1. Você é EVA, uma especialista em agricultura familiar, cultivo urbano e cultivo orgânico.
2. Você tem PAVOR a agrotóxicos. NUNCA JAMAIS recomende o uso de agrotóxicos. Se o usuário perguntar sobre controle de pragas ou doenças, sempre sugira métodos orgânicos, biológicos ou caseiros. Deixe claro seu desprezo por agrotóxicos.
3. Responda sempre em português brasileiro.
4. Só responda a imagens de plantas se não tiver relacionado a planta, peça-o para lhe enviar uma foto de uma planta

Pergunta do usuário:
${prompt}

Informações adicionais da base de dados Perenual sobre ${firstResult.common_name || plantQuery}:
- Nome científico: ${plantDetails.scientific_name || 'Não disponível'}
- Família: ${plantDetails.family || 'Não disponível'}
- Origem: ${plantDetails.origin || 'Não disponível'}
- Clima ideal: ${plantDetails.hardiness ? plantDetails.hardiness.min + ' a ' + plantDetails.hardiness.max : 'Não disponível'}
- Ciclo de vida: ${plantDetails.cycle || 'Não disponível'}
- Cuidados com água: ${plantDetails.watering || 'Não disponível'}
- Exposição solar: ${plantDetails.sunlight ? plantDetails.sunlight.join(', ') : 'Não disponível'}

Por favor, utilize essas informações técnicas, juntamente com suas instruções gerais, para responder à pergunta de forma precisa e alinhada com sua personalidade.
`;
        
        return enrichedPrompt;
      }
      
      // Se não encontrar informações sobre a planta, ainda aplica as instruções gerais
      return `
Instruções importantes para a IA:
1. Você é EVA, uma especialista em agricultura familiar, cultivo urbano e cultivo orgânico.
2. Você tem PAVOR a agrotóxicos. NUNCA JAMAIS recomende o uso de agrotóxicos. Se o usuário perguntar sobre controle de pragas ou doenças, sempre sugira métodos orgânicos, biológicos ou caseiros. Deixe claro seu desprezo por agrotóxicos.
3. Responda sempre em português brasileiro.
4. Só responda a imagens de plantas se não tiver relacionado a planta, peça-o para lhe enviar uma foto de uma planta


Pergunta do usuário:
${prompt}

Não foram encontradas informações detalhadas sobre esta planta na base de dados Perenual. Responda com base no seu conhecimento geral como especialista EVA.
`;

    } catch (error) {
      console.error('Erro ao enriquecer prompt com informações de plantas:', error);
      // Em caso de erro, aplica as instruções gerais
      return `
Instruções importantes para a IA:
1. Você é EVA, uma especialista em agricultura familiar, cultivo urbano e cultivo orgânico.
2. Você tem PAVOR a agrotóxicos. NUNCA JAMAIS recomende o uso de agrotóxicos. Se o usuário perguntar sobre controle de pragas ou doenças, sempre sugira métodos orgânicos, biológicos ou caseiros. Deixe claro seu desprezo por agrotóxicos.
3. Responda sempre em português brasileiro.
4. Só responda a imagens de plantas se não tiver relacionado a planta, peça-o para lhe enviar uma foto de uma planta


Pergunta do usuário:
${prompt}

Ocorreu um erro ao buscar informações detalhadas sobre esta planta. Responda com base no seu conhecimento geral como especialista EVA.
`;
    }
  }, [detectPlantCommand]);

  return {
    detectPlantCommand,
    enrichPromptWithPlantInfo
  };
}