"use server"

import { v4 as uuidv4 } from "uuid"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { storage } from "@/lib/storage"
import { getGeminiApiKey } from "@/lib/ai-config"

// Type definitions
type WebsiteData = {
  url: string
  title: string
  description: string
  keywords: string[]
  headings: string[]
  content: string
  links: string[]
  images: string[]
  lastScraped: number
}

type AnalysisResult = {
  id: string
  timestamp: number
  mainWebsite: WebsiteData
  competitors: WebsiteData[]
  comparison: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    threats: string[]
  }
}

export async function analyzeWebsites(mainWebsiteUrl: string, competitorUrls: string[]): Promise<string> {
  try {
    console.log(`Starting analysis for ${mainWebsiteUrl} and ${competitorUrls.length} competitors`)

    // Generate a unique ID for this analysis
    const analysisId = uuidv4()

    // Scrape the main website using Apify
    console.log(`Scraping main website: ${mainWebsiteUrl}`)
    const mainWebsiteData = await scrapeWebsite(mainWebsiteUrl)
    console.log(`Main website scraped successfully: ${mainWebsiteData.title}`)

    // Scrape competitor websites
    console.log(`Scraping ${competitorUrls.length} competitor websites`)
    const competitorData = await Promise.all(
      competitorUrls.map(async (url) => {
        console.log(`Scraping competitor: ${url}`)
        return await scrapeWebsite(url)
      }),
    )
    console.log(`All competitors scraped successfully`)

    // Compare websites using Gemini AI
    console.log(`Comparing websites using Gemini AI`)
    const comparison = await compareWebsites(mainWebsiteData, competitorData)
    console.log(`Website comparison completed`)

    // Create the analysis result
    const analysisResult: AnalysisResult = {
      id: analysisId,
      timestamp: Date.now(),
      mainWebsite: mainWebsiteData,
      competitors: competitorData,
      comparison,
    }

    // Store the analysis result in our custom storage
    await storage.set(`analysis:${analysisId}`, analysisResult)
    console.log(`Analysis stored with ID: ${analysisId}`)

    return analysisId
  } catch (error) {
    console.error("Error analyzing websites:", error)
    throw new Error(`Failed to analyze websites: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function scrapeWebsite(url: string): Promise<WebsiteData> {
  try {
    // Normalize URL
    if (!url.startsWith("http")) {
      url = `https://${url}`
    }

    console.log(`Starting Apify scraping task for ${url}`)

    // Check if we have the Apify API token
    const apifyToken = process.env.APIFY_API_TOKEN
    if (!apifyToken) {
      throw new Error("APIFY_API_TOKEN environment variable is not set")
    }

    // First, try to use a simpler and faster approach with Apify's Cheerio Scraper
    // This is more likely to complete quickly for most websites
    console.log(`Using Cheerio Scraper for ${url} (faster method)`)

    const cheerioResponse = await fetch(
      `https://api.apify.com/v2/acts/apify~cheerio-scraper/runs?token=${apifyToken}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startUrls: [{ url }],
          runMode: "DEVELOPMENT", // Faster mode for development
          pageFunction: `async function pageFunction({ request, $, body, contentType, response }) {
          const title = $('title').text().trim();
          const description = $('meta[name="description"]').attr('content') || '';
          const keywords = $('meta[name="keywords"]').attr('content') || '';
          
          const headings = [];
          $('h1, h2, h3, h4, h5, h6').each((i, el) => {
            const text = $(el).text().trim();
            if (text) headings.push(text);
          });
          
          const paragraphs = [];
          $('p').each((i, el) => {
            const text = $(el).text().trim();
            if (text) paragraphs.push(text);
          });
          
          const links = [];
          $('a').each((i, el) => {
            const href = $(el).attr('href');
            if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
              links.push(href);
            }
          });
          
          const images = [];
          $('img').each((i, el) => {
            const src = $(el).attr('src');
            if (src) {
              images.push(src);
            }
          });
          
          return {
            url: request.url,
            title,
            description,
            keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
            headings,
            content: paragraphs.join('\\n'),
            links,
            images,
            timestamp: new Date().getTime()
          };
        }`,
          proxyConfiguration: {
            useApifyProxy: true,
          },
        }),
      },
    )

    if (!cheerioResponse.ok) {
      console.error(`Cheerio Scraper API error: ${await cheerioResponse.text()}`)
      throw new Error(`Failed to start Cheerio Scraper: ${cheerioResponse.statusText}`)
    }

    const cheerioData = await cheerioResponse.json()
    const cheerioRunId = cheerioData.data.id

    console.log(`Cheerio Scraper task started with run ID: ${cheerioRunId}`)

    // Wait for the Cheerio Scraper task to complete with improved polling
    let cheerioTaskComplete = false
    let cheerioTaskResult = null
    let cheerioAttempts = 0
    const maxCheerioAttempts = 24 // 2 minutes (5 seconds * 24)

    while (!cheerioTaskComplete && cheerioAttempts < maxCheerioAttempts) {
      cheerioAttempts++
      await new Promise((resolve) => setTimeout(resolve, 5000)) // Wait 5 seconds

      console.log(`Checking Cheerio Scraper status (attempt ${cheerioAttempts}/${maxCheerioAttempts})...`)

      const cheerioStatusResponse = await fetch(
        `https://api.apify.com/v2/actor-runs/${cheerioRunId}?token=${apifyToken}`,
      )

      if (!cheerioStatusResponse.ok) {
        console.error(`Failed to check Cheerio Scraper status: ${cheerioStatusResponse.statusText}`)
        continue
      }

      const cheerioStatusData = await cheerioStatusResponse.json()
      console.log(`Cheerio Scraper status: ${cheerioStatusData.data.status}`)

      if (cheerioStatusData.data.status === "SUCCEEDED") {
        cheerioTaskComplete = true

        // Get the dataset items
        console.log(`Fetching Cheerio Scraper results...`)
        const cheerioDatasetResponse = await fetch(
          `https://api.apify.com/v2/actor-runs/${cheerioRunId}/dataset/items?token=${apifyToken}`,
        )

        if (!cheerioDatasetResponse.ok) {
          throw new Error(`Failed to fetch Cheerio Scraper results: ${cheerioDatasetResponse.statusText}`)
        }

        const cheerioDatasetItems = await cheerioDatasetResponse.json()

        if (cheerioDatasetItems.length > 0) {
          cheerioTaskResult = cheerioDatasetItems[0]
          console.log(`Successfully retrieved data for ${url} using Cheerio Scraper`)
        } else {
          console.error(`No data items returned from Cheerio Scraper for ${url}`)
        }
      } else if (
        cheerioStatusData.data.status === "FAILED" ||
        cheerioStatusData.data.status === "TIMED-OUT" ||
        cheerioStatusData.data.status === "ABORTED"
      ) {
        console.error(`Cheerio Scraper task failed with status: ${cheerioStatusData.data.status}`)
        break // Break out of the loop, but don't throw an error yet - we'll try the Web Scraper as fallback
      }
      // Otherwise, continue polling
    }

    // If Cheerio Scraper was successful, return the result
    if (cheerioTaskResult) {
      return {
        url,
        title: cheerioTaskResult.title || "",
        description: cheerioTaskResult.description || "",
        keywords: Array.isArray(cheerioTaskResult.keywords) ? cheerioTaskResult.keywords : [],
        headings: Array.isArray(cheerioTaskResult.headings) ? cheerioTaskResult.headings : [],
        content: cheerioTaskResult.content || "",
        links: Array.isArray(cheerioTaskResult.links) ? cheerioTaskResult.links : [],
        images: Array.isArray(cheerioTaskResult.images) ? cheerioTaskResult.images : [],
        lastScraped: cheerioTaskResult.timestamp || Date.now(),
      }
    }

    // If Cheerio Scraper failed or timed out, fall back to a simpler approach
    console.log(`Cheerio Scraper did not complete successfully. Using fallback method for ${url}`)

    // Use Apify's HTTP Request actor as a simpler fallback
    // This just gets the HTML content without JavaScript rendering
    const httpResponse = await fetch(`https://api.apify.com/v2/acts/apify~http-request/runs?token=${apifyToken}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: url,
        method: "GET",
        timeoutSecs: 30,
        proxyConfiguration: {
          useApifyProxy: true,
        },
      }),
    })

    if (!httpResponse.ok) {
      throw new Error(`Failed to start HTTP Request: ${httpResponse.statusText}`)
    }

    const httpData = await httpResponse.json()
    const httpRunId = httpData.data.id

    console.log(`HTTP Request task started with run ID: ${httpRunId}`)

    // Wait for the HTTP Request task to complete
    let httpTaskComplete = false
    let httpTaskResult = null
    let httpAttempts = 0
    const maxHttpAttempts = 12 // 1 minute (5 seconds * 12)

    while (!httpTaskComplete && httpAttempts < maxHttpAttempts) {
      httpAttempts++
      await new Promise((resolve) => setTimeout(resolve, 5000)) // Wait 5 seconds

      console.log(`Checking HTTP Request status (attempt ${httpAttempts}/${maxHttpAttempts})...`)

      const httpStatusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${httpRunId}?token=${apifyToken}`)

      if (!httpStatusResponse.ok) {
        console.error(`Failed to check HTTP Request status: ${httpStatusResponse.statusText}`)
        continue
      }

      const httpStatusData = await httpStatusResponse.json()
      console.log(`HTTP Request status: ${httpStatusData.data.status}`)

      if (httpStatusData.data.status === "SUCCEEDED") {
        httpTaskComplete = true

        // Get the dataset items
        console.log(`Fetching HTTP Request results...`)
        const httpDatasetResponse = await fetch(
          `https://api.apify.com/v2/actor-runs/${httpRunId}/dataset/items?token=${apifyToken}`,
        )

        if (!httpDatasetResponse.ok) {
          throw new Error(`Failed to fetch HTTP Request results: ${httpDatasetResponse.statusText}`)
        }

        const httpDatasetItems = await httpDatasetResponse.json()

        if (httpDatasetItems.length > 0) {
          httpTaskResult = httpDatasetItems[0]
          console.log(`Successfully retrieved HTML for ${url} using HTTP Request`)
        } else {
          console.error(`No data items returned from HTTP Request for ${url}`)
        }
      } else if (
        httpStatusData.data.status === "FAILED" ||
        httpStatusData.data.status === "TIMED-OUT" ||
        httpStatusData.data.status === "ABORTED"
      ) {
        throw new Error(`HTTP Request task failed with status: ${httpStatusData.data.status}`)
      }
      // Otherwise, continue polling
    }

    if (!httpTaskResult) {
      throw new Error(`Failed to retrieve data for ${url} after multiple attempts`)
    }

    // Extract basic information from the HTML content
    const htmlContent = httpTaskResult.body || ""

    // Very basic parsing of HTML to extract title and meta tags
    const titleMatch = htmlContent.match(/<title[^>]*>(.*?)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : url

    const descriptionMatch = htmlContent.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    const description = descriptionMatch ? descriptionMatch[1].trim() : ""

    const keywordsMatch = htmlContent.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    const keywords = keywordsMatch
      ? keywordsMatch[1]
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean)
      : []

    // Extract some content from the HTML
    const contentMatches = htmlContent.match(/<p[^>]*>(.*?)<\/p>/gi)
    const content = contentMatches
      ? contentMatches.map((p) => p.replace(/<[^>]*>/g, "")).join("\n")
      : "No content could be extracted"

    return {
      url,
      title,
      description,
      keywords,
      headings: [],
      content,
      links: [],
      images: [],
      lastScraped: Date.now(),
    }
  } catch (error) {
    console.error(`Error scraping website ${url}:`, error)

    // Return a basic data structure with information about the website
    // This allows the analysis to continue even if one website fails
    return {
      url,
      title: url,
      description: `Could not scrape website: ${error instanceof Error ? error.message : String(error)}`,
      keywords: [],
      headings: [],
      content: "This website could not be scraped. Please check the URL and try again.",
      links: [],
      images: [],
      lastScraped: Date.now(),
    }
  }
}

async function compareWebsites(mainWebsite: WebsiteData, competitors: WebsiteData[]): Promise<any> {
  try {
    // Get the API key
    const apiKey = getGeminiApiKey()

    // Initialize the Google Generative AI client directly
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })

    // Prepare data for Gemini
    const mainWebsiteData = {
      url: mainWebsite.url,
      title: mainWebsite.title,
      description: mainWebsite.description,
      keywords: mainWebsite.keywords.join(", "),
      headings: mainWebsite.headings.slice(0, 15).join("\n"),
      contentSample: mainWebsite.content.slice(0, 2000) + "...",
      imageCount: mainWebsite.images.length,
      linkCount: mainWebsite.links.length,
      lastScraped: new Date(mainWebsite.lastScraped).toISOString(),
    }

    const competitorsData = competitors.map((comp) => ({
      url: comp.url,
      title: comp.title,
      description: comp.description,
      keywords: comp.keywords.join(", "),
      headings: comp.headings.slice(0, 15).join("\n"),
      contentSample: comp.content.slice(0, 2000) + "...",
      imageCount: comp.images.length,
      linkCount: comp.links.length,
      lastScraped: new Date(comp.lastScraped).toISOString(),
    }))

    console.log(`Preparing Gemini prompt with fresh data from Apify (scraped at ${mainWebsiteData.lastScraped})`)

    // Generate SWOT analysis using Gemini with the fresh data from Apify
    const prompt = `
      I need a detailed SWOT analysis (Strengths, Weaknesses, Opportunities, Threats) comparing a main website against its competitors.
      This analysis should be based on the FRESH DATA that was just scraped from these websites (scraped at ${mainWebsiteData.lastScraped}).
      
      MAIN WEBSITE:
      URL: ${mainWebsiteData.url}
      Title: ${mainWebsiteData.title}
      Description: ${mainWebsiteData.description}
      Keywords: ${mainWebsiteData.keywords}
      Main Headings: ${mainWebsiteData.headings}
      Content Sample: ${mainWebsiteData.contentSample}
      Number of Images: ${mainWebsiteData.imageCount}
      Number of Links: ${mainWebsiteData.linkCount}
      
      COMPETITORS:
      ${competitorsData
        .map(
          (comp, index) => `
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
      
      Please provide a comprehensive SWOT analysis in JSON format with the following structure:
      
      {
        "strengths": ["strength1", "strength2", ...],
        "weaknesses": ["weakness1", "weakness2", ...],
        "opportunities": ["opportunity1", "opportunity2", ...],
        "threats": ["threat1", "threat2", ...]
      }
      
      Focus on:
      1. Content quality, depth, and relevance
      2. SEO factors (meta tags, keywords, headings)
      3. Website structure and organization
      4. Unique selling points
      5. Content gaps and opportunities
      6. Competitive advantages and disadvantages
      
      Ensure your analysis is based on the ACTUAL DATA provided above, which was freshly scraped from these websites.
    `

    console.log(`Sending request to Gemini AI...`)

    // Generate content using the Google Generative AI SDK directly
    const result = await model.generateContent(prompt)
    const text = result.response.text()

    console.log(`Received response from Gemini AI, extracting JSON...`)

    // Log a preview of the response for debugging
    console.log(`Response preview (first 100 chars): ${text.substring(0, 100).replace(/\n/g, "\\n")}`)

    // Extract JSON from the response, handling markdown code blocks
    let jsonStr = text

    // Check if the response is wrapped in markdown code blocks
    if (text.includes("```json") || text.includes("```")) {
      console.log("Detected markdown code block in response, extracting JSON content")

      // Extract content between markdown code blocks
      const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (codeBlockMatch && codeBlockMatch[1]) {
        jsonStr = codeBlockMatch[1].trim()
        console.log(`Extracted JSON from code block, length: ${jsonStr.length}`)
      }
    }

    try {
      // Parse the extracted JSON
      const swotAnalysis = JSON.parse(jsonStr)
      console.log("Successfully parsed JSON response")

      return {
        strengths: Array.isArray(swotAnalysis.strengths) ? swotAnalysis.strengths : [],
        weaknesses: Array.isArray(swotAnalysis.weaknesses) ? swotAnalysis.weaknesses : [],
        opportunities: Array.isArray(swotAnalysis.opportunities) ? swotAnalysis.opportunities : [],
        threats: Array.isArray(swotAnalysis.threats) ? swotAnalysis.threats : [],
      }
    } catch (parseError) {
      console.error(`JSON parsing error: ${parseError}`)
      console.log(`Problematic JSON string: ${jsonStr.substring(0, 200)}...`)

      // Try a more aggressive approach to extract valid JSON
      try {
        // Look for patterns that might indicate the start of a JSON object
        const jsonStartIndex = jsonStr.indexOf("{")
        const jsonEndIndex = jsonStr.lastIndexOf("}")

        if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
          const extractedJson = jsonStr.substring(jsonStartIndex, jsonEndIndex + 1)
          console.log(`Attempting to parse extracted JSON substring: ${extractedJson.substring(0, 100)}...`)

          const swotAnalysis = JSON.parse(extractedJson)
          console.log("Successfully parsed extracted JSON substring")

          return {
            strengths: Array.isArray(swotAnalysis.strengths) ? swotAnalysis.strengths : [],
            weaknesses: Array.isArray(swotAnalysis.weaknesses) ? swotAnalysis.weaknesses : [],
            opportunities: Array.isArray(swotAnalysis.opportunities) ? swotAnalysis.opportunities : [],
            threats: Array.isArray(swotAnalysis.threats) ? swotAnalysis.threats : [],
          }
        }
      } catch (extractError) {
        console.error(`Failed to extract valid JSON: ${extractError}`)
      }

      // If all parsing attempts fail, return a fallback SWOT analysis
      console.log("Using fallback SWOT analysis")
      return generateFallbackSWOT(mainWebsite, competitors)
    }
  } catch (error) {
    console.error("Error comparing websites:", error)
    return generateFallbackSWOT(mainWebsite, competitors)
  }
}

// Add the fallback SWOT function if it doesn't exist
function generateFallbackSWOT(mainWebsite: WebsiteData, competitors: WebsiteData[]) {
  // Generate a basic SWOT analysis based on the available data
  const strengths = []
  const weaknesses = []
  const opportunities = []
  const threats = []

  // Add some basic strengths
  if (mainWebsite.title && mainWebsite.title.length > 5) {
    strengths.push(`Clear website title: "${mainWebsite.title}"`)
  }

  if (mainWebsite.description && mainWebsite.description.length > 10) {
    strengths.push(`Descriptive meta description that explains the website purpose`)
  }

  if (mainWebsite.keywords && mainWebsite.keywords.length > 0) {
    strengths.push(`Defined keywords that can help with SEO: ${mainWebsite.keywords.join(", ")}`)
  }

  // Add some basic weaknesses
  if (!mainWebsite.description || mainWebsite.description.length < 10) {
    weaknesses.push("Missing or very short meta description")
  }

  if (!mainWebsite.keywords || mainWebsite.keywords.length === 0) {
    weaknesses.push("No keywords defined for SEO")
  }

  if (mainWebsite.content.length < 1000) {
    weaknesses.push("Limited content length which may affect SEO rankings")
  }

  // Add some basic opportunities
  opportunities.push("Expand website content to improve search engine visibility")
  opportunities.push("Add more descriptive headings to improve content structure")
  opportunities.push("Optimize meta tags and descriptions for better SEO performance")

  // Add some basic threats
  if (competitors.length > 0) {
    threats.push(`Competition from ${competitors.length} similar websites in the same space`)
  }
  threats.push("Rapidly changing SEO algorithms requiring constant optimization")
  threats.push("Potential for competitors to target the same keywords and audience")

  return {
    strengths,
    weaknesses,
    opportunities,
    threats,
  }
}

