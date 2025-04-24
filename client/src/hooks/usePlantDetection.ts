import { useCallback } from 'react';
import { searchPlants, getPlantDetails } from '@/lib/utils';

// Este hook detecta menções a plantas e busca informações adicionais
export default function usePlantDetection() {
  // Esta função analisa o texto buscando comandos relacionados a plantas
  const detectPlantCommand = useCallback((message: string): boolean => {
    const lowerMessage = message.toLowerCase();
    return (
      lowerMessage.includes('planta') ||
      lowerMessage.includes('jardim') ||
      lowerMessage.includes('flor') ||
      lowerMessage.includes('cultivar') ||
      lowerMessage.includes('regar') ||
      lowerMessage.includes('como cuidar')
    );
  }, []);

  // Esta função tenta enriquecer o prompt do usuário APENAS com dados técnicos da Perenual
  // Adicionado parâmetro isImagePresent
  const enrichPromptWithPlantInfo = useCallback(async (
    prompt: string,
    apiKey: string,
    isImagePresent: boolean // Novo parâmetro
  ): Promise<string> => {

    // **Nova Condição:** Se uma imagem está presente, não enriquecer o prompt com dados da Perenual.
    // A lógica do backend (storage.ts) cuidará do prompt multimodal.
    if (isImagePresent) {
      console.log("Imagem presente, ignorando enriquecimento com Perenual.");
      return prompt; // Retorna o prompt original sem adicionar dados da Perenual
    }

    // Se não for um comando de planta detectado, retorna o prompt original sem modificações
    if (!detectPlantCommand(prompt)) {
      return prompt;
    }

    try {
      // Extrai o nome da planta do prompt (lógica simplificada)
      const words = prompt.split(' ');
      let plantQuery = '';
      const keywords = ['planta', 'plantar', 'cultivar', 'cuidar de', 'flor', 'regar'];

      for (let i = 0; i < words.length; i++) {
        const wordLower = words[i].toLowerCase();
        const combinedLower = i > 0 ? `${words[i-1].toLowerCase()} ${wordLower}` : wordLower;

        if (keywords.some(kw => wordLower === kw || combinedLower === kw)) {
          plantQuery = words.slice(i + 1, i + 4).join(' ').replace(/[.,?!;:]/g, '').trim();
          if (plantQuery) break;
        }
      }

      if (!plantQuery) {
        console.log("Não foi possível extrair nome de planta do prompt para Perenual:", prompt);
        return prompt;
      }

      console.log("Query de planta extraída para Perenual:", plantQuery);

      const searchResults = await searchPlants(plantQuery, apiKey);

      if (searchResults && searchResults.data && searchResults.data.length > 0) {
        const firstResult = searchResults.data[0];
        const plantId = firstResult.id;
        const plantDetails = await getPlantDetails(plantId, apiKey);

        // Adiciona APENAS as informações técnicas encontradas ao prompt original
        const enrichedPrompt = `
${prompt}

[Informações técnicas adicionais sobre ${firstResult.common_name || plantQuery} (Fonte: Perenual)]
- Nome científico: ${plantDetails.scientific_name || 'Não disponível'}
- Família: ${plantDetails.family || 'Não disponível'}
- Origem: ${plantDetails.origin?.join(', ') || 'Não disponível'}
- Clima ideal (Hardiness Zones): ${plantDetails.hardiness ? `Min: ${plantDetails.hardiness.min}, Max: ${plantDetails.hardiness.max}` : 'Não disponível'}
- Ciclo de vida: ${plantDetails.cycle || 'Não disponível'}
- Necessidade de água: ${plantDetails.watering || 'Não disponível'}
- Exposição solar: ${plantDetails.sunlight ? (Array.isArray(plantDetails.sunlight) ? plantDetails.sunlight.join(', ') : plantDetails.sunlight) : 'Não disponível'}
[Fim das informações técnicas]
`;

        console.log("Prompt enriquecido com dados da Perenual (sem imagem):");
        // console.log(enrichedPrompt); // Descomentar para ver o prompt completo no console
        return enrichedPrompt;
      }

      console.log("Nenhum resultado encontrado na Perenual para:", plantQuery);
      return prompt;

    } catch (error) {
      console.error('Erro ao buscar informações na API Perenual:', error);
      return prompt;
    }
  }, [detectPlantCommand]);

  return {
    enrichPromptWithPlantInfo
  };
}