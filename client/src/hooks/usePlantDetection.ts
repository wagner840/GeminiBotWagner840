import { useState } from "react";
import { translatePlantName } from "../lib/gemini"; // Keep translatePlantName
import { apiRequest } from "../lib/queryClient"; // Import apiRequest
import { extractPlantName } from "../lib/utils"; // Import the improved extractPlantName

const removeArticles = (query: string) => {
  const articles = ["uma", "um", "a", "o", "as", "os"];
  let cleanedQuery = query;
  articles.forEach(article => {
    cleanedQuery = cleanedQuery.replace(new RegExp(`^${article}\s+`, 'i'), "");
    cleanedQuery = cleanedQuery.replace(new RegExp(`\s+${article}$`, 'i'), "");
  });
  cleanedQuery = cleanedQuery.replace(/\?$/g, ""); // Remove trailing question mark
  return cleanedQuery.trim();
};

const usePlantDetection = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [plantDetails, setPlantDetails] = useState<any>(null);

  // detectPlant now only takes the full prompt as input
  const detectPlant = async (prompt: string) => {
    setIsLoading(true);
    let extractedPlantName = null; // Initialize extracted name

    try {
      // Attempt to extract a plant name from the prompt using the imported function
      extractedPlantName = await extractPlantName(prompt); // Await the promise

      if (extractedPlantName) {
        // Clean the extracted plant name
        const cleanedPlantQuery = removeArticles(extractedPlantName);
        console.log("Query de planta extraída para Perenual:", prompt, " -> ", cleanedPlantQuery);

        // --- Call backend API for search ---
        let searchResults = await apiRequest("GET", `/api/perenual/search?q=${encodeURIComponent(cleanedPlantQuery)}`).then(res => res.json());

        if (!searchResults || !searchResults.data || searchResults.data.length === 0) {
          console.log("Nenhum resultado encontrado na Perenual para:", cleanedPlantQuery);

          // Attempt to translate the plant name to English and search again.
          const translatedPlantName = await translatePlantName(cleanedPlantQuery);

          if (translatedPlantName) {
            console.log("Attempting search with translated name:", translatedPlantName);
            // --- Call backend API for search with translated name ---
            searchResults = await apiRequest("GET", `/api/perenual/search?q=${encodeURIComponent(translatedPlantName)}`).then(res => res.json());
          }
        }

        if (searchResults && searchResults.data && searchResults.data.length > 0) {
          console.log('Perenual foi usado: true');
          const firstResult = searchResults.data[0];
          const plantId = firstResult.id;

          // --- Call backend API for plant details ---
          const plantDetails = await apiRequest("GET", `/api/perenual/detail/${plantId}`).then(res => res.json());

          // Adiciona APENAS as informações técnicas encontradas ao prompt original
          const enrichedPrompt = `
${prompt}

[Informações técnicas adicionais sobre ${firstResult.common_name || cleanedPlantQuery} (Fonte: Perenual)]
- Nome científico: ${plantDetails.scientific_name || 'Não disponível'}
- Família: ${plantDetails.family || 'Não disponível'}
- Gênero: ${plantDetails.genus || 'Não disponível'}
- Tipo de planta: ${plantDetails.type || 'Não disponível'}
- Tamanho médio: ${plantDetails.height?.cm ? plantDetails.height.cm + ' cm' : 'Não disponível'}
- Clima nativo: ${plantDetails.native ? plantDetails.native.join(', ') : 'Não disponível'}
`;

          return enrichedPrompt;
        } else {
          console.log('Perenual foi usado: false');
          return prompt; // Return original prompt if no results after translation attempt
        }
      } else {
        // No plant name extracted, skip Perenual search
        console.log("Não foi possível extrair nome de planta do prompt para Perenual:", prompt);
        console.log('Perenual foi usado: false');
        return "Não foi possível identificar o nome da planta. Por favor, forneça o nome da planta."; // Tell the user we need more info
      }
    } catch (error) {
      console.error("Erro ao buscar detalhes da planta:", error);
      console.log('Perenual foi usado: false');
      return prompt; // Return original prompt on error
    } finally {
      setIsLoading(false);
    }
  };

  return { detectPlant, isLoading, plantDetails };
};

export default usePlantDetection;
