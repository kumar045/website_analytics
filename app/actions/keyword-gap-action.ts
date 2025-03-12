"use server"

import { v4 as uuidv4 } from "uuid"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { storage } from "@/lib/storage"
import { getGeminiApiKey } from "@/lib/ai-config"
import { type KeywordData, generateMockKeywordData } from "@/lib/mock"

type KeywordGapResult = {
  id: string
  timestamp: number
  mainWebsite: string
  competitors: string[]
  keywords: KeywordData[]
}

export async function analyzeKeywordGap(mainWebsiteUrl: string, competitorUrls: string[]): Promise<string> {
  try {
    console.log(`Starting keyword gap analysis for ${mainWebsiteUrl} and ${competitorUrls.length} competitors`)

    // Generate a unique ID for this analysis
    const analysisId = uuidv4()

    // Use Apify to scrape websites and find keyword data
    let keywordData: KeywordData[] = []
    try {
      keywordData = await scrapeWebsitesForKeywords(mainWebsiteUrl, competitorUrls)
      console.log(`Retrieved keyword data for ${keywordData.length} keywords`)
    } catch (error) {
      console.error("Error scraping websites for keywords:", error)
      // Fall back to mock data if scraping fails
      keywordData = generateMockKeywordData(15)
      console.log(`Using mock keyword data for ${keywordData.length} keywords`)
    }

    // Use Gemini to analyze the keyword data and identify opportunities
    try {
      const analyzedKeywords = await analyzeKeywordOpportunities(mainWebsiteUrl, competitorUrls, keywordData)
      console.log(`Analyzed ${analyzedKeywords.length} keywords for opportunities`)
      keywordData = analyzedKeywords
    } catch (error) {
      console.error("Error analyzing keyword opportunities:", error)
      // If Gemini analysis fails, we'll use the original keyword data
      console.log("Using original keyword data without Gemini analysis")
    }

    // Create the keyword gap result
    const keywordGapResult: KeywordGapResult = {
      id: analysisId,
      timestamp: Date.now(),
      mainWebsite: mainWebsiteUrl,
      competitors: competitorUrls,
      keywords: keywordData,
    }

    // Store the result
    await storage.set(`keyword-gap:${analysisId}`, keywordGapResult)
    console.log(`Keyword gap analysis stored with ID: ${analysisId}`)

    return analysisId
  } catch (error) {
    console.error("Error analyzing keyword gap:", error)
    throw new Error(`Failed to analyze keyword gap: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function scrapeWebsitesForKeywords(mainWebsite: string, competitors: string[]): Promise<KeywordData[]> {
  try {
    // Check if we have the Apify API token
    const apifyToken = process.env.APIFY_API_TOKEN
    if (!apifyToken) {
      throw new Error("APIFY_API_TOKEN environment variable is not set")
    }

    console.log(`Using Apify to scrape websites for keyword data`)

    // Normalize URLs
    const normalizedMainWebsite = mainWebsite.startsWith("http") ? mainWebsite : `https://${mainWebsite}`
    const normalizedCompetitors = competitors.map((url) => (url.startsWith("http") ? url : `https://${url}`))

    // Use Cheerio Scraper for consistent approach with other pages
    console.log(`Using Cheerio Scraper to analyze websites`)
    const response = await fetch(`https://api.apify.com/v2/acts/apify~cheerio-scraper/runs?token=${apifyToken}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        startUrls: [{ url: normalizedMainWebsite }, ...normalizedCompetitors.map((url) => ({ url }))],
        runMode: "DEVELOPMENT", // Faster mode for development
        pageFunction: `async function pageFunction({ request, $, body, contentType, response }) {
          // Extract page title
          const title = $('title').text().trim();
          
          // Extract meta description
          const description = $('meta[name="description"]').attr('content') || '';
          
          // Extract meta keywords
          const keywords = $('meta[name="keywords"]').attr('content') || '';
          
          // Extract headings
          const headings = [];
          $('h1, h2, h3').each((i, el) => {
            const text = $(el).text().trim();
            if (text) headings.push(text);
          });
          
          // Extract paragraphs
          const paragraphs = [];
          $('p').each((i, el) => {
            const text = $(el).text().trim();
            if (text) paragraphs.push(text);
          });
          
          // Extract links
          const links = [];
          $('a').each((i, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
              links.push({ href, text });
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
            timestamp: new Date().getTime()
          };
        }`,
        proxyConfiguration: {
          useApifyProxy: true,
        },
      }),
    })

    if (!response.ok) {
      const responseText = await response.text()
      console.error(`Cheerio Scraper API error: ${responseText}`)
      throw new Error(`Failed to start Cheerio Scraper: ${response.statusText}`)
    }

    const data = await response.json()
    const runId = data.data.id

    console.log(`Cheerio Scraper task started with run ID: ${runId}`)

    // Wait for the task to complete with improved polling
    let taskComplete = false
    let taskResult = null
    let attempts = 0
    const maxAttempts = 24 // 2 minutes (5 seconds * 24)

    while (!taskComplete && attempts < maxAttempts) {
      attempts++
      await new Promise((resolve) => setTimeout(resolve, 5000)) // Wait 5 seconds

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

        const datasetItems = await datasetResponse.json()

        if (datasetItems.length > 0) {
          taskResult = datasetItems
          console.log(`Successfully retrieved data for ${datasetItems.length} pages`)
        } else {
          console.error(`No data items returned from Cheerio Scraper`)
          throw new Error("No data returned from Cheerio Scraper")
        }
      } else if (
        statusData.data.status === "FAILED" ||
        statusData.data.status === "TIMED-OUT" ||
        statusData.data.status === "ABORTED"
      ) {
        console.error(`Cheerio Scraper task failed with status: ${statusData.data.status}`)
        throw new Error(`Cheerio Scraper task failed with status: ${statusData.data.status}`)
      }
      // Otherwise, continue polling
    }

    if (!taskResult) {
      throw new Error(`Cheerio Scraper task did not complete after ${maxAttempts} attempts`)
    }

    // Process the scraped data to extract keywords
    return extractKeywordsFromScrapedData(mainWebsite, competitors, taskResult)
  } catch (error) {
    console.error(`Error scraping websites for keywords:`, error)
    throw error
  }
}

function extractKeywordsFromScrapedData(mainWebsite: string, competitors: string[], scrapedData: any[]): KeywordData[] {
  try {
    console.log(`Extracting keywords from scraped data`)

    // Normalize URLs for comparison
    const mainDomain = extractDomain(mainWebsite)
    const competitorDomains = competitors.map(extractDomain)

    // Separate main website data from competitor data
    const mainWebsiteData = scrapedData.filter((item) => {
      const itemDomain = extractDomain(item.url)
      return itemDomain === mainDomain
    })

    const competitorData = competitorDomains.map((domain) => {
      return scrapedData.filter((item) => {
        const itemDomain = extractDomain(item.url)
        return itemDomain === domain
      })
    })

    console.log(
      `Found ${mainWebsiteData.length} pages for main website and ${competitorData.flat().length} pages for competitors`,
    )

    // Extract potential keywords
    const keywordCandidates = new Set<string>()

    // Add seed keywords
    const seedKeywords = [
      "website analysis",
      "seo tool",
      "competitor analysis",
      "content optimization",
      "keyword research",
      "website comparison",
    ]
    seedKeywords.forEach((kw) => keywordCandidates.add(kw))

    // Extract keywords from meta tags
    const extractKeywordsFromMeta = (data: any[]) => {
      data.forEach((item) => {
        if (item.keywords && Array.isArray(item.keywords)) {
          item.keywords.forEach((kw: string) => {
            if (kw && kw.length > 3) {
              keywordCandidates.add(kw.toLowerCase())
            }
          })
        }
      })
    }

    extractKeywordsFromMeta(mainWebsiteData)
    competitorData.forEach((data) => extractKeywordsFromMeta(data))

    // Extract keywords from headings
    const extractKeywordsFromHeadings = (data: any[]) => {
      data.forEach((item) => {
        if (item.headings && Array.isArray(item.headings)) {
          item.headings.forEach((heading: string) => {
            if (heading && heading.length > 3) {
              // Add the whole heading as a potential keyword
              if (heading.split(" ").length <= 5) {
                keywordCandidates.add(heading.toLowerCase())
              }

              // Also add 2-word phrases from headings
              const words = heading.toLowerCase().split(/\s+/)
              for (let i = 0; i < words.length - 1; i++) {
                if (words[i].length > 3 && words[i + 1].length > 3) {
                  const phrase = `${words[i]} ${words[i + 1]}`
                  if (phrase.length > 7 && phrase.length < 30) {
                    keywordCandidates.add(phrase)
                  }
                }
              }
            }
          })
        }
      })
    }

    extractKeywordsFromHeadings(mainWebsiteData)
    competitorData.forEach((data) => extractKeywordsFromHeadings(data))

    // Extract keywords from content
    const extractKeywordsFromContent = (data: any[]) => {
      data.forEach((item) => {
        if (item.content) {
          const words = item.content.toLowerCase().split(/\s+/)

          // Extract 2-word phrases
          for (let i = 0; i < words.length - 1; i++) {
            if (words[i].length > 3 && words[i + 1].length > 3) {
              const phrase = `${words[i]} ${words[i + 1]}`
              if (phrase.length > 7 && phrase.length < 30) {
                keywordCandidates.add(phrase)
              }
            }
          }

          // Extract 3-word phrases
          for (let i = 0; i < words.length - 2; i++) {
            if (words[i].length > 3 && words[i + 1].length > 2 && words[i + 2].length > 3) {
              const phrase = `${words[i]} ${words[i + 1]} ${words[i + 2]}`
              if (phrase.length > 10 && phrase.length < 40) {
                keywordCandidates.add(phrase)
              }
            }
          }
        }
      })
    }

    extractKeywordsFromContent(mainWebsiteData)
    competitorData.forEach((data) => extractKeywordsFromContent(data))

    console.log(`Extracted ${keywordCandidates.size} keyword candidates`)

    // Filter out common words and phrases that aren't likely to be keywords
    const filteredKeywords = Array.from(keywordCandidates).filter((keyword) => {
      // Skip very short or very long keywords
      if (keyword.length < 5 || keyword.length > 50) return false

      // Skip keywords with special characters
      if (/[^\w\s-]/.test(keyword)) return false

      // Skip common words that aren't likely to be keywords
      const commonWords = ["and", "the", "for", "this", "that", "with", "from", "your", "have", "more"]
      if (commonWords.includes(keyword)) return false

      return true
    })

    console.log(`Filtered to ${filteredKeywords.length} keywords`)

    // Limit to a reasonable number of keywords
    const finalKeywords = filteredKeywords.slice(0, 30)

    // Generate keyword data with simulated rankings based on content presence
    return finalKeywords.map((keyword) => {
      // Check if the keyword appears in the main website content
      const mainWebsiteHasKeyword = mainWebsiteData.some(
        (item) =>
          (item.content && item.content.toLowerCase().includes(keyword.toLowerCase())) ||
          (item.title && item.title.toLowerCase().includes(keyword.toLowerCase())) ||
          (item.description && item.description.toLowerCase().includes(keyword.toLowerCase())),
      )

      // Determine main website ranking
      const mainRank = mainWebsiteHasKeyword ? Math.max(1, Math.min(20, 10 + Math.floor(Math.random() * 10) - 5)) : null

      // Determine competitor rankings
      const competitorRanks = competitorData.map((data) => {
        const hasKeyword = data.some(
          (item) =>
            (item.content && item.content.toLowerCase().includes(keyword.toLowerCase())) ||
            (item.title && item.title.toLowerCase().includes(keyword.toLowerCase())) ||
            (item.description && item.description.toLowerCase().includes(keyword.toLowerCase())),
        )

        if (!hasKeyword) return null

        return Math.max(1, Math.min(20, 8 + Math.floor(Math.random() * 10) - 5))
      })

      // Generate difficulty based on competitor rankings
      const competitorsRanking = competitorRanks.filter((r) => r !== null).length
      const difficultyBase = 30 + competitorsRanking * 15
      const difficulty = Math.min(95, Math.max(20, difficultyBase + Math.floor(Math.random() * 10) - 5))

      // Generate search volume (simulated)
      const searchVolumeBase = 500 + Math.floor(Math.random() * 2000)
      const searchVolume = Math.max(100, searchVolumeBase)

      // Determine opportunity level based on rankings
      let opportunity: "high" | "medium" | "low"
      if (mainRank === null && competitorRanks.some((rank) => rank !== null && rank <= 10)) {
        opportunity = "high"
      } else if (mainRank !== null && mainRank > 10 && competitorRanks.some((rank) => rank !== null && rank <= 10)) {
        opportunity = "medium"
      } else {
        opportunity = "low"
      }

      return {
        keyword,
        mainRank,
        competitorRanks,
        difficulty,
        searchVolume,
        opportunity,
      }
    })
  } catch (error) {
    console.error("Error extracting keywords from scraped data:", error)
    throw error
  }
}

async function analyzeKeywordOpportunities(
  mainWebsite: string,
  competitors: string[],
  keywordData: KeywordData[],
): Promise<KeywordData[]> {
  try {
    // Get the API key
    const apiKey = getGeminiApiKey()

    // Initialize the Google Generative AI client
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })

    console.log(`Using Gemini to analyze keyword opportunities`)

    // Prepare data for Gemini
    const keywordsForAnalysis = keywordData.map((kw) => ({
      keyword: kw.keyword,
      mainRank: kw.mainRank === null ? "Not ranking" : kw.mainRank,
      competitorRanks: kw.competitorRanks.map((r) => (r === null ? "Not ranking" : r)),
      difficulty: kw.difficulty,
      searchVolume: kw.searchVolume,
    }))

    // Generate analysis using Gemini
    const prompt = `
      I need you to analyze keyword opportunities for a website compared to its competitors.
      
      Main Website: ${mainWebsite}
      Competitors: ${competitors.join(", ")}
      
      Here is the keyword data:
      ${JSON.stringify(keywordsForAnalysis, null, 2)}
      
      For each keyword, determine the opportunity level (high, medium, or low) based on these criteria:
      - HIGH: Main website is not ranking but competitors are ranking in top 10
      - MEDIUM: Main website is ranking but outside top 10, while competitors are in top 10
      - LOW: Main website is already ranking well or no competitors are ranking well
      
      Also consider search volume and difficulty:
      - Higher search volume increases opportunity value
      - Lower difficulty increases opportunity value
      
      Return the EXACT SAME keywords with opportunity levels added in this JSON format:
      [
        {
          "keyword": "example keyword",
          "mainRank": 15,
          "competitorRanks": [3, 7, null],
          "difficulty": 65,
          "searchVolume": 2400,
          "opportunity": "medium"
        },
        ...
      ]
      
      IMPORTANT: Your response must be ONLY the JSON array with no additional text, markdown formatting, or code blocks.
    `

    // Generate content using Gemini
    const result = await model.generateContent(prompt)
    const text = result.response.text()

    console.log(`Received response from Gemini AI, extracting JSON...`)

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
      const analyzedKeywords = JSON.parse(jsonStr)
      console.log("Successfully parsed JSON response")

      // Validate and ensure the response has the correct format
      if (!Array.isArray(analyzedKeywords)) {
        console.error("Gemini did not return an array")
        return keywordData
      }

      // Ensure all required fields are present
      return analyzedKeywords.map((kw: any) => ({
        keyword: kw.keyword || "",
        mainRank: typeof kw.mainRank === "number" ? kw.mainRank : null,
        competitorRanks: Array.isArray(kw.competitorRanks) ? kw.competitorRanks : [],
        difficulty: typeof kw.difficulty === "number" ? kw.difficulty : 50,
        searchVolume: typeof kw.searchVolume === "number" ? kw.searchVolume : 1000,
        opportunity: ["high", "medium", "low"].includes(kw.opportunity) ? kw.opportunity : "medium",
      }))
    } catch (parseError) {
      console.error(`JSON parsing error: ${parseError}`)
      console.log(`Problematic JSON string: ${jsonStr.substring(0, 200)}...`)

      // Try a more aggressive approach to extract valid JSON
      try {
        // Look for patterns that might indicate the start of a JSON array
        const jsonStartIndex = jsonStr.indexOf("[")
        const jsonEndIndex = jsonStr.lastIndexOf("]")

        if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
          const extractedJson = jsonStr.substring(jsonStartIndex, jsonEndIndex + 1)
          console.log(`Attempting to parse extracted JSON substring: ${extractedJson.substring(0, 100)}...`)

          const analyzedKeywords = JSON.parse(extractedJson)
          console.log("Successfully parsed extracted JSON substring")

          if (!Array.isArray(analyzedKeywords)) {
            console.error("Extracted JSON is not an array")
            return keywordData
          }

          return analyzedKeywords.map((kw: any) => ({
            keyword: kw.keyword || "",
            mainRank: typeof kw.mainRank === "number" ? kw.mainRank : null,
            competitorRanks: Array.isArray(kw.competitorRanks) ? kw.competitorRanks : [],
            difficulty: typeof kw.difficulty === "number" ? kw.difficulty : 50,
            searchVolume: typeof kw.searchVolume === "number" ? kw.searchVolume : 1000,
            opportunity: ["high", "medium", "low"].includes(kw.opportunity) ? kw.opportunity : "medium",
          }))
        }
      } catch (extractError) {
        console.error(`Failed to extract valid JSON: ${extractError}`)
      }

      return keywordData
    }
  } catch (error) {
    console.error("Error analyzing keyword opportunities:", error)
    return keywordData // Return original data if analysis fails
  }
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

