"use server"

import { v4 as uuidv4 } from "uuid"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { storage } from "@/lib/storage"
import { getGeminiApiKey } from "@/lib/ai-config"

type CompetitorChange = {
  url: string
  type: "content" | "design" | "seo" | "performance" | "feature"
  description: string
  impact: "high" | "medium" | "low"
  date: string
}

type CompetitorTrackingResult = {
  id: string
  timestamp: number
  mainWebsite: string
  competitors: string[]
  changes: CompetitorChange[]
  insights: string[]
}

export async function trackCompetitorChanges(mainWebsiteUrl: string, competitorUrls: string[]): Promise<string> {
  try {
    console.log(`Starting competitor tracking for ${mainWebsiteUrl} and ${competitorUrls.length} competitors`)

    // Generate a unique ID for this tracking
    const trackingId = uuidv4()

    // Check if we have previous tracking data for these competitors
    const previousData = await getPreviousTrackingData(mainWebsiteUrl)

    // Use Apify to scrape the current state of competitor websites
    let currentData
    try {
      currentData = await scrapeCompetitorWebsites(competitorUrls)
      console.log(`Retrieved data for ${competitorUrls.length} competitors`)
    } catch (scrapeError) {
      console.error("Error scraping competitor websites:", scrapeError)

      // Create a minimal dataset with just the URLs
      currentData = competitorUrls.map((url) => ({
        url: url.startsWith("http") ? url : `https://${url}`,
        title: url,
        description: "",
        keywords: [],
        headings: [],
        content: "",
        links: [],
        images: [],
        timestamp: Date.now(),
        error: scrapeError instanceof Error ? scrapeError.message : String(scrapeError),
      }))
    }

    // Use Gemini to detect changes and generate insights
    const trackingResult = await analyzeCompetitorChanges(mainWebsiteUrl, competitorUrls, previousData, currentData)
    console.log(`Analyzed competitor changes and identified ${trackingResult.changes.length} changes`)

    // Add the ID and timestamp to the result
    trackingResult.id = trackingId
    trackingResult.timestamp = Date.now()
    trackingResult.mainWebsite = mainWebsiteUrl
    trackingResult.competitors = competitorUrls

    // Store the result
    await storage.set(`competitor-tracking:${trackingId}`, trackingResult)
    console.log(`Competitor tracking stored with ID: ${trackingId}`)

    // Also store the current data for future comparison
    await storeCurrentTrackingData(mainWebsiteUrl, competitorUrls, currentData)

    return trackingId
  } catch (error) {
    console.error("Error tracking competitor changes:", error)
    throw new Error(`Failed to track competitor changes: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function getPreviousTrackingData(mainWebsite: string): Promise<any> {
  try {
    // Generate a key for the tracking data - use a simple prefix
    const trackingKey = `tracking-data-${mainWebsite.replace(/https?:\/\//i, "").replace(/\./g, "-")}`

    // Try to get previous tracking data
    const previousData = await storage.get<any>(trackingKey)

    if (!previousData) {
      console.log(`No previous tracking data found for ${mainWebsite}`)
      return null
    }

    return previousData
  } catch (error) {
    console.error("Error getting previous tracking data:", error)
    return null
  }
}

async function storeCurrentTrackingData(mainWebsite: string, competitors: string[], currentData: any): Promise<void> {
  try {
    // Generate a key for the tracking data - use a simple prefix
    const trackingKey = `tracking-data-${mainWebsite.replace(/https?:\/\//i, "").replace(/\./g, "-")}`

    // Store the current data
    await storage.set(trackingKey, {
      timestamp: Date.now(),
      mainWebsite,
      competitors,
      data: currentData,
    })

    console.log(`Stored current tracking data for ${mainWebsite}`)
  } catch (error) {
    console.error("Error storing current tracking data:", error)
    // Don't throw here, as this is not critical for the main functionality
  }
}

async function scrapeCompetitorWebsites(competitorUrls: string[]): Promise<any> {
  try {
    // Check if we have the Apify API token
    const apifyToken = process.env.APIFY_API_TOKEN
    if (!apifyToken) {
      throw new Error("APIFY_API_TOKEN environment variable is not set")
    }

    console.log(`Using Apify to scrape ${competitorUrls.length} competitor websites`)

    // Normalize URLs and validate them
    const normalizedUrls = competitorUrls.map((url) => {
      if (!url.startsWith("http")) {
        return `https://${url}`
      }
      return url
    })

    // Try to use the Cheerio Scraper instead of HTTP Request
    try {
      console.log("Using Cheerio Scraper for website data")
      const response = await fetch(`https://api.apify.com/v2/acts/apify~cheerio-scraper/runs?token=${apifyToken}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startUrls: normalizedUrls.map((url) => ({ url })),
          runMode: "DEVELOPMENT", // Faster mode for development
          pageFunction: `async function pageFunction({ request, $, body, contentType, response }) {
              const title = $('title').text().trim();
              const description = $('meta[name="description"]').attr('content') || '';
              const keywords = $('meta[name="keywords"]').attr('content') || '';
              
              const headings = [];
              $('h1, h2, h3').each((i, el) => {
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
                const text = $(el).text().trim();
                if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                  links.push({ href, text });
                }
              });
              
              const images = [];
              $('img').each((i, el) => {
                const src = $(el).attr('src');
                const alt = $(el).attr('alt') || '';
                if (src) {
                  images.push({ src, alt });
                }
              });
              
              return {
                url: request.url,
                title,
                description,
                keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
                headings,
                content: paragraphs.join('\\n').substring(0, 5000),
                links,
                images,
                timestamp: new Date().getTime()
              };
            }`,
          proxyConfiguration: {
            useApifyProxy: true,
          },
          maxRequestsPerCrawl: competitorUrls.length * 2,
          maxConcurrency: 2,
        }),
      })

      // Log the full response for debugging
      const responseText = await response.text()
      console.log(`Apify API response: ${responseText}`)

      if (!response.ok) {
        throw new Error(`Failed to start Cheerio Scraper: ${response.statusText}. Response: ${responseText}`)
      }

      // Parse the response as JSON
      const data = JSON.parse(responseText)
      const runId = data.data.id

      console.log(`Cheerio Scraper task started with run ID: ${runId}`)

      // Wait for the task to complete
      let taskComplete = false
      let attempts = 0
      const maxAttempts = 15 // 5 minutes (20 seconds * 15)

      while (!taskComplete && attempts < maxAttempts) {
        attempts++
        await new Promise((resolve) => setTimeout(resolve, 20000)) // Wait 20 seconds

        console.log(`Checking Cheerio Scraper status (attempt ${attempts}/${maxAttempts})...`)

        const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`)

        if (!statusResponse.ok) {
          console.error(`Failed to check Cheerio Scraper status: ${statusResponse.statusText}`)
          continue
        }

        const statusData = await statusResponse.json()
        console.log(`Cheerio Scraper status: ${statusData.data.status}`)

        if (statusData.data.status === "SUCCEEDED") {
          taskComplete = true

          // Get the dataset items
          console.log(`Fetching Cheerio Scraper results...`)
          const datasetResponse = await fetch(
            `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apifyToken}`,
          )

          if (!datasetResponse.ok) {
            throw new Error(`Failed to fetch Cheerio Scraper results: ${datasetResponse.statusText}`)
          }

          const items = await datasetResponse.json()

          if (items.length === 0) {
            throw new Error("No data returned from Cheerio Scraper")
          }

          // Map the results to our expected format
          return mapScrapedDataToCompetitors(items, competitorUrls)
        } else if (
          statusData.data.status === "FAILED" ||
          statusData.data.status === "TIMED-OUT" ||
          statusData.data.status === "ABORTED"
        ) {
          throw new Error(`Cheerio Scraper task failed with status: ${statusData.data.status}`)
        }
      }

      throw new Error(`Cheerio Scraper task did not complete after ${maxAttempts} attempts`)
    } catch (cheerioError) {
      console.error("Error with Cheerio Scraper:", cheerioError)

      // Try a simpler approach with the Website Content Crawler
      console.log("Trying Website Content Crawler as fallback")
      const response = await fetch(
        `https://api.apify.com/v2/acts/apify~website-content-crawler/runs?token=${apifyToken}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startUrls: normalizedUrls.map((url) => ({ url })),
            maxCrawlDepth: 0, // Just crawl the start URLs
            maxCrawlPages: competitorUrls.length,
            maxRequestsPerCrawl: competitorUrls.length * 2,
            maxConcurrency: 2,
            proxyConfiguration: {
              useApifyProxy: true,
            },
          }),
        },
      )

      // Log the full response for debugging
      const responseText = await response.text()
      console.log(`Website Content Crawler API response: ${responseText}`)

      if (!response.ok) {
        throw new Error(`Failed to start Website Content Crawler: ${response.statusText}. Response: ${responseText}`)
      }

      // Parse the response as JSON
      const data = JSON.parse(responseText)
      const runId = data.data.id

      console.log(`Website Content Crawler task started with run ID: ${runId}`)

      // Wait for the task to complete
      let taskComplete = false
      let attempts = 0
      const maxAttempts = 15 // 5 minutes (20 seconds * 15)

      while (!taskComplete && attempts < maxAttempts) {
        attempts++
        await new Promise((resolve) => setTimeout(resolve, 20000)) // Wait 20 seconds

        console.log(`Checking Website Content Crawler status (attempt ${attempts}/${maxAttempts})...`)

        const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`)

        if (!statusResponse.ok) {
          console.error(`Failed to check Website Content Crawler status: ${statusResponse.statusText}`)
          continue
        }

        const statusData = await statusResponse.json()
        console.log(`Website Content Crawler status: ${statusData.data.status}`)

        if (statusData.data.status === "SUCCEEDED") {
          taskComplete = true

          // Get the dataset items
          console.log(`Fetching Website Content Crawler results...`)
          const datasetResponse = await fetch(
            `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apifyToken}`,
          )

          if (!datasetResponse.ok) {
            throw new Error(`Failed to fetch Website Content Crawler results: ${datasetResponse.statusText}`)
          }

          const items = await datasetResponse.json()

          if (items.length === 0) {
            throw new Error("No data returned from Website Content Crawler")
          }

          // Map the results to our expected format
          return mapScrapedDataToCompetitors(items, competitorUrls)
        } else if (
          statusData.data.status === "FAILED" ||
          statusData.data.status === "TIMED-OUT" ||
          statusData.data.status === "ABORTED"
        ) {
          throw new Error(`Website Content Crawler task failed with status: ${statusData.data.status}`)
        }
      }

      throw new Error(`Website Content Crawler task did not complete after ${maxAttempts} attempts`)
    }
  } catch (error) {
    console.error(`Error in scrapeCompetitorWebsites:`, error)
    throw error
  }
}

function mapScrapedDataToCompetitors(scrapedData: any[], competitorUrls: string[]): any[] {
  return competitorUrls.map((url) => {
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`

    // Try to find the exact URL match first
    let matchedData = scrapedData.find(
      (item) => item.url === normalizedUrl || item.url.replace(/\/$/, "") === normalizedUrl.replace(/\/$/, ""),
    )

    // If no exact match, try to find a partial match
    if (!matchedData) {
      const domain = extractDomain(url)
      matchedData = scrapedData.find(
        (item) => item.url.includes(domain) || (item.url && extractDomain(item.url).includes(domain)),
      )
    }

    // If still no match, use the first item or create a basic structure
    if (!matchedData) {
      console.log(`No scraped data found for ${url}, using basic structure`)
      return {
        url: normalizedUrl,
        title: url,
        description: `Website for ${url}`,
        keywords: [],
        headings: [],
        content: "",
        links: [],
        images: [],
        timestamp: Date.now(),
      }
    }

    // Normalize the data structure
    return {
      url: normalizedUrl,
      title: matchedData.title || url,
      description: matchedData.description || "",
      keywords: Array.isArray(matchedData.keywords) ? matchedData.keywords : [],
      headings: Array.isArray(matchedData.headings) ? matchedData.headings : [],
      content: matchedData.content || matchedData.text || "",
      links: Array.isArray(matchedData.links) ? matchedData.links : [],
      images: Array.isArray(matchedData.images) ? matchedData.images : [],
      timestamp: Date.now(),
    }
  })
}

function extractDomain(url: string): string {
  try {
    // Add protocol if missing
    if (!url.startsWith("http")) {
      url = "https://" + url
    }

    const domain = new URL(url).hostname
    return domain.startsWith("www.") ? domain.slice(4) : domain
  } catch (error) {
    // If URL parsing fails, return the original string
    return url
  }
}

async function analyzeCompetitorChanges(
  mainWebsite: string,
  competitors: string[],
  previousData: any,
  currentData: any,
): Promise<CompetitorTrackingResult> {
  try {
    // If no previous data, we can't detect changes
    if (!previousData) {
      return {
        id: "",
        timestamp: 0,
        mainWebsite,
        competitors,
        changes: [],
        insights: [
          "First time tracking these competitors, no changes to report yet.",
          "We'll detect changes on your next tracking check.",
          "Consider running a full analysis to get a baseline comparison.",
        ],
      }
    }

    // Get the API key
    const apiKey = getGeminiApiKey()

    // Initialize the Google Generative AI client
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })

    console.log(`Using Gemini to analyze competitor changes`)

    // Prepare data for Gemini
    const previousDataSimplified = previousData.data.map((site: any) => ({
      url: site.url,
      title: site.title,
      description: site.description,
      keywords: site.keywords,
      headings: site.headings?.slice(0, 5) || [],
      contentSample: site.content?.substring(0, 500) || "",
    }))

    const currentDataSimplified = currentData.map((site: any) => ({
      url: site.url,
      title: site.title,
      description: site.description,
      keywords: site.keywords,
      headings: site.headings?.slice(0, 5) || [],
      contentSample: site.content?.substring(0, 500) || "",
    }))

    // Generate analysis using Gemini
    const prompt = `
      I need you to analyze changes between previous and current versions of competitor websites.
      
      Main Website: ${mainWebsite}
      Competitors: ${competitors.join(", ")}
      
      Previous Data (from ${new Date(previousData.timestamp).toISOString()}):
      ${JSON.stringify(previousDataSimplified, null, 2)}
      
      Current Data (from ${new Date().toISOString()}):
      ${JSON.stringify(currentDataSimplified, null, 2)}
      
      Please identify significant changes between the previous and current versions, such as:
      - Content changes (new sections, removed content, etc.)
      - Design changes (based on headings and structure)
      - SEO changes (title, description, keywords)
      - New features or offerings
      
      Also provide strategic insights about what these changes might mean for the main website.
      
      Return your analysis in this JSON format:
      {
        "changes": [
          {
            "url": "competitor.com",
            "type": "content",
            "description": "Added new section about AI-powered analysis",
            "impact": "medium",
            "date": "2025-03-09"
          },
          ...
        ],
        "insights": [
          "Competitor X is focusing more on AI features, consider highlighting your AI capabilities",
          "Multiple competitors have updated their meta descriptions to emphasize speed",
          ...
        ]
      }
      
      Only return the JSON object, nothing else.
    `

    // Generate content using Gemini
    const result = await model.generateContent(prompt)
    const text = result.response.text()

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error(`Failed to extract JSON from Gemini response: ${text.substring(0, 200)}...`)
      throw new Error("Failed to parse Gemini response")
    }

    const analysisResult = JSON.parse(jsonMatch[0])

    // Create the full tracking result
    return {
      id: "",
      timestamp: 0,
      mainWebsite,
      competitors,
      changes: Array.isArray(analysisResult.changes) ? analysisResult.changes : [],
      insights: Array.isArray(analysisResult.insights)
        ? analysisResult.insights
        : [
            "Analysis completed, but no specific insights were generated.",
            "Consider running a more detailed analysis for better results.",
          ],
    }
  } catch (error) {
    console.error("Error analyzing competitor changes:", error)

    // Return a minimal result with no changes but an error message
    return {
      id: "",
      timestamp: 0,
      mainWebsite,
      competitors,
      changes: [],
      insights: [
        "Error analyzing changes: " + (error instanceof Error ? error.message : String(error)),
        "Try running the analysis again or check the competitor URLs.",
      ],
    }
  }
}

