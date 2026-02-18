
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Sheep } from "../../types";

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const getSheepInsight = async (sheep: Sheep, breedName: string) => {
  try {
    const ai = getAIClient();
    const prompt = `Analise este animal: Nome ${sheep.nome} (#${sheep.brinco}), Raça ${breedName}, Peso ${sheep.peso}kg, Saúde Famacha ${sheep.famacha}, ECC ${sheep.ecc}. Forneça um parecer técnico curto.`;
    const response = await ai.models.generateContent({ model: "gemini-3-flash-preview", contents: prompt });
    return response.text;
  } catch (error) { return "Análise indisponível no momento."; }
};

export const getHerdDailyInsights = async (herd: any[]) => {
  if (herd.length === 0) return [];
  try {
    const ai = getAIClient();
    const prompt = `Analise este rebanho e gere insights técnicos em JSON: ${JSON.stringify(herd)}`;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  prioridade: { type: Type.STRING },
                  categoria: { type: Type.STRING },
                  titulo: { type: Type.STRING },
                  descricao: { type: Type.STRING },
                  fundamentacao: { type: Type.STRING },
                  alvos: { type: Type.ARRAY, items: { type: Type.STRING } },
                  fonte: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || '{"insights": []}').insights || [];
  } catch (error) { return []; }
};

export const generateAppLogo = async () => {
  try {
    const ai = getAIClient();
    const prompt = "A modern minimalist sheep head logo, emerald green and slate blue, vector style.";
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return null;
  } catch { return null; }
};

export const askKnowledgeAssistant = async (question: string) => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Responda como especialista em ovinocultura: ${question}`,
    });
    return response.text;
  } catch { return "Erro ao consultar guia."; }
};

export const getSpeechForText = async (text: string) => {
  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch { return null; }
};
