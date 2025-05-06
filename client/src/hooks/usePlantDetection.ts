import { useState } from "react";
// import { translatePlantName } from "../lib/gemini"; // No longer needed here
// import { apiRequest } from "../lib/queryClient"; // No longer needed here
// import { extractPlantName } from "../lib/utils"; // No longer needed here for separate calls

// Removed removeArticles as it's not needed for the simplified hook

const usePlantDetection = () => {
  const [isLoading, setIsLoading] = useState(false);
  // plantDetails state is no longer needed as details come from the main AI response
  // const [plantDetails, setPlantDetails] = useState<any>(null);

  // detectPlant is simplified to just indicate loading if needed, or future pre-processing
  const detectPlant = async (prompt: string): Promise<string> => {
    setIsLoading(true);
    console.log("Simplified detectPlant called with prompt:", prompt);
    // In this simplified version, we don't do external API calls here.
    // The backend handles the AI response and potential MCP interaction.

    // You could add minimal pre-processing here if necessary, 
    // but for now, we just return the original prompt.
    // A small delay to simulate work if needed:
    // await new Promise(resolve => setTimeout(resolve, 100));

    setIsLoading(false);
    return prompt; // Return the original prompt to be sent to the backend
  };

  // plantDetails is no longer returned
  return { detectPlant, isLoading };
};

export default usePlantDetection;
