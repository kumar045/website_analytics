// Utility to ensure we have access to the Gemini API key
export function getGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set")
  }

  return apiKey
}

