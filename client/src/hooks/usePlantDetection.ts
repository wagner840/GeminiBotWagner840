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
        
        // Adiciona informações da planta ao prompt
        const enrichedPrompt = `
${prompt}

Informações adicionais da base de dados Perenual sobre ${firstResult.common_name || plantQuery}:
- Nome científico: ${plantDetails.scientific_name || 'Não disponível'}
- Família: ${plantDetails.family || 'Não disponível'}
- Origem: ${plantDetails.origin || 'Não disponível'}
- Clima ideal: ${plantDetails.hardiness ? plantDetails.hardiness.min + ' a ' + plantDetails.hardiness.max : 'Não disponível'}
- Ciclo de vida: ${plantDetails.cycle || 'Não disponível'}
- Cuidados com água: ${plantDetails.watering || 'Não disponível'}
- Exposição solar: ${plantDetails.sunlight ? plantDetails.sunlight.join(', ') : 'Não disponível'}

Por favor, utilize essas informações técnicas para responder à pergunta de forma mais precisa. Lembre-se de responder em português brasileiro, como assistente EVA.
`;
        
        return enrichedPrompt;
      }
      
      return prompt;
    } catch (error) {
      console.error('Erro ao enriquecer prompt com informações de plantas:', error);
      return prompt;
    }
  }, [detectPlantCommand]);

  return {
    detectPlantCommand,
    enrichPromptWithPlantInfo
  };
}