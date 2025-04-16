import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Funcionalidade para API Perenual (será implementada quando a chave API for fornecida)
export async function searchPlants(query: string, apiKey: string): Promise<any> {
  try {
    const response = await fetch(`https://perenual.com/api/species-list?key=${apiKey}&q=${encodeURIComponent(query)}`);
    if (!response.ok) {
      throw new Error(`Error searching plants: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error searching plants:', error);
    throw error;
  }
}

export async function getPlantDetails(plantId: number, apiKey: string): Promise<any> {
  try {
    const response = await fetch(`https://perenual.com/api/species/details/${plantId}?key=${apiKey}`);
    if (!response.ok) {
      throw new Error(`Error getting plant details: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error getting plant details:', error);
    throw error;
  }
}
