
import { GoogleGenAI } from "@google/genai";
import { GlobalConfig } from "../types";

export const rewriteDescription = async (description: string): Promise<string> => {
  if (!description) return "No description provided.";
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Rewrite the following image description to be more creative and professional for a social media post. Keep it under 20 words.
      
      Original: ${description}`,
    });
    return response.text || description;
  } catch (error) {
    console.error("Error rewriting text:", error);
    return description;
  }
};

export const editImage = async (
  base64Image: string,
  config: GlobalConfig
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const dataOnly = base64Image.split(',')[1];
    
    const wordReplacementInstructions = config.wordReplacements.length > 0
      ? `5. Perform the following text replacements: ${config.wordReplacements.map(r => `Find "${r.find}" and change it to "${r.replace}"`).join(', ')}. Ensure the new text uses the same font style and size as the original.`
      : '';

    // Enhanced prompt to include Face/Person transformation
    const prompt = `Please edit this image with these exact requirements:
    1. If there is a person in the image, modify their appearance or "swap" their face/look to match this description: "${config.targetFaceDescription}".
    2. Identify any logos in the image and replace them with the text "fan fc" in a clean, professional font.
    3. Identify all text in the image. Change its color to ${config.textColor}.
    4. Ensure the overall color theme of the image matches a ${config.colorCombination} palette.
    ${wordReplacementInstructions}
    5. Maintain high quality and the original composition structure.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: dataOnly,
              mimeType: 'image/png'
            }
          },
          { text: prompt }
        ]
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("No image data returned from API");
  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};
