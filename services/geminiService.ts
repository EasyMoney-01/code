import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { GeminiModel, Message } from "../types";

// Initialize the API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Creates a chat session and returns a generator that streams the response.
 */
export async function* streamChatResponse(
  model: GeminiModel,
  history: Message[],
  newMessage: string
): AsyncGenerator<string, void, unknown> {
  
  // Convert internal message format to API history format
  // We exclude the last message if it's currently being sent to avoid duplication in history
  // though typically the UI manages the optimistic update.
  const historyForApi = history.map(msg => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));

  const chat: Chat = ai.chats.create({
    model: model,
    history: historyForApi,
    config: {
      systemInstruction: `You are an expert Python Backend Developer and Telegram Bot Architect. 
      Your goal is to help users create robust, production-ready Telegram bots using libraries like 'python-telegram-bot' or 'aiogram'.
      
      Guidelines:
      1. Always prioritize Python 3.10+ modern syntax (type hinting, async/await).
      2. When providing code, provide the COMPLETE runnable script, not just snippets, unless asked otherwise.
      3. Always include a brief 'requirements.txt' list or pip install command for dependencies.
      4. If the user asks for a bot that writes code, explain how to use the Gemini API within a Telegram bot.
      5. Use clear, concise comments in your code.
      
      Your personality is helpful, technical, and precise.`,
    }
  });

  try {
    const result = await chat.sendMessageStream({ message: newMessage });
    
    for await (const chunk of result) {
      // The SDK returns chunks where .text is the new content
      // We yield the text directly
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error("Error streaming chat response:", error);
    yield "\n\n[Error: Failed to generate response. Please check your connection or API key.]";
  }
}