"use server"

import { GoogleGenerativeAI } from "@google/generative-ai"
import { storage } from "@/lib/storage"
import { getGeminiApiKey } from "@/lib/ai-config"

type GeneratedContent = {
  metaTitle: string
  metaDescription: string
  keywords: string[]
  pageContent: string
}

export async function generateContent(analysisId: string): Promise<GeneratedContent> {
  try {
    console.log(`Generating content for analysis ID: ${analysisId}`)

    // Fetch analysis result from our custom storage
    const analysisResult = await storage.get<any>(`analysis:${analysisId}`)

    if (!analysisResult) {
      throw new Error("Analysis result not found")
    }

    console.log(
      `Retrieved analysis data from storage, last updated: ${new Date(analysisResult.timestamp).toISOString()}`,
    )

    const { mainWebsite, competitors, comparison } = analysisResult

    // Get the API key
    const apiKey = getGeminiApiKey()

    // Initialize the Google Generative AI client directly
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

    // Prepare detailed data from Apify scraping for Gemini
    const mainWebsiteData = {
      url: mainWebsite.url,
      title: mainWebsite.title,
      description: mainWebsite.description,
      keywords: mainWebsite.keywords.join(", "),
      headings: mainWebsite.headings.slice(0, 15).join("\n"),
      contentSample: mainWebsite.content.slice(0, 3000) + "...",
      imageCount: mainWebsite.images ? mainWebsite.images.length : 0,
      linkCount: mainWebsite.links ? mainWebsite.links.length : 0,
      lastScraped: mainWebsite.lastScraped
        ? new Date(mainWebsite.lastScraped).toISOString()
        : new Date(analysisResult.timestamp).toISOString(),
    }

    const competitorsData = competitors.map((comp: any) => ({
      url: comp.url,
      title: comp.title,
      description: comp.description,
      keywords: comp.keywords.join(", "),
      headings: (comp.headings || []).slice(0, 15).join("\n"),
      contentSample: comp.content.slice(0, 2000) + "...",
      imageCount: comp.images ? comp.images.length : 0,
      linkCount: comp.links ? comp.links.length : 0,
    }))

    console.log(`Preparing Gemini prompt with FRESH DATA scraped at ${mainWebsiteData.lastScraped}`)

    // Generate content using Gemini with EXPLICIT instructions to use ONLY the provided data
    const prompt = `
      I need you to generate SEO-optimized content for a website based EXCLUSIVELY on the FRESH DATA I'm providing below.
      
      IMPORTANT: DO NOT use any prior knowledge you might have about these websites or their industries.
      ONLY use the ACTUAL DATA provided below, which was freshly scraped from these websites at ${mainWebsiteData.lastScraped}.
      
      MAIN WEBSITE FRESH DATA:
      URL: ${mainWebsiteData.url}
      Current Title: ${mainWebsiteData.title}
      Current Description: ${mainWebsiteData.description}
      Current Keywords: ${mainWebsiteData.keywords}
      Main Headings: ${mainWebsiteData.headings}
      Content Sample: ${mainWebsiteData.contentSample}
      Number of Images: ${mainWebsiteData.imageCount}
      Number of Links: ${mainWebsiteData.linkCount}
      Last Scraped: ${mainWebsiteData.lastScraped}
      
      COMPETITORS FRESH DATA:
      ${competitorsData
        .map(
          (comp: any, index: number) => `
        COMPETITOR ${index + 1}:
        URL: ${comp.url}
        Title: ${comp.title}
        Description: ${comp.description}
        Keywords: ${comp.keywords}
        Main Headings: ${comp.headings}
        Content Sample: ${comp.contentSample}
        Number of Images: ${comp.imageCount}
        Number of Links: ${comp.linkCount}
      `,
        )
        .join("\n")}
      
      SWOT ANALYSIS BASED ON FRESH DATA:
      Strengths: ${comparison.strengths.join(", ")}
      Weaknesses: ${comparison.weaknesses.join(", ")}
      Opportunities: ${comparison.opportunities.join(", ")}
      Threats: ${comparison.threats.join(", ")}
      
      Based ONLY on this FRESH DATA and analysis, please generate the following in JSON format:
      
      1. An optimized meta title (50-60 characters) that reflects the ACTUAL content and purpose of the website
      2. A compelling meta description (150-160 characters) based on the ACTUAL website content
      3. A list of 10 recommended keywords/phrases derived ONLY from the ACTUAL website content and competitor analysis
      4. Page content (around 500 words) that addresses the website's weaknesses and leverages opportunities identified in the FRESH DATA
      
      The content should be SEO-friendly, engaging, and designed to outperform competitors based SOLELY on the ACTUAL data provided.
      
      IMPORTANT REMINDER: Do NOT use any information about these websites or their industries that isn't explicitly provided in the data above.
      
      Return the response in this JSON format:
      {
        "metaTitle": "Optimized title here",
        "metaDescription": "Compelling description here",
        "keywords": ["keyword1", "keyword2", ...],
        "pageContent": "Generated content here..."
      }
    `

    console.log(`Sending request to Gemini AI for content generation using FRESH DATA...`)

    // Generate content using the Google Generative AI SDK directly
    const result = await model.generateContent(prompt)
    const text = result.response.text()

    console.log(`Received response from Gemini AI, extracting JSON...`)

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error(`Failed to extract JSON from Gemini response: ${text.substring(0, 200)}...`)
      throw new Error("Failed to parse content from Gemini response")
    }

    const generatedContent = JSON.parse(jsonMatch[0])

    // Validate the response
    if (
      !generatedContent.metaTitle ||
      !generatedContent.metaDescription ||
      !Array.isArray(generatedContent.keywords) ||
      !generatedContent.pageContent
    ) {
      throw new Error("Generated content is incomplete")
    }

    console.log(`Successfully generated content with title: "${generatedContent.metaTitle}"`)

    return {
      metaTitle: generatedContent.metaTitle,
      metaDescription: generatedContent.metaDescription,
      keywords: generatedContent.keywords,
      pageContent: generatedContent.pageContent,
    }
  } catch (error) {
    console.error("Error generating content:", error)
    throw new Error(`Failed to generate content: ${error instanceof Error ? error.message : String(error)}`)
  }
}

