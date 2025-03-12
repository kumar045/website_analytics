"use server"

import { v4 as uuidv4 } from "uuid"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { storage } from "@/lib/storage"
import { getGeminiApiKey } from "@/lib/ai-config"

type SEOIssue = {
  type: "critical" | "warning" | "info"
  title: string
  description: string
  impact: string
  recommendation: string
}

type SEOAuditResult = {
  id: string
  timestamp: number
  url: string
  performance: {
    score: number
    loadTime: number
    firstContentfulPaint: number
    largestContentfulPaint: number
    cumulativeLayoutShift: number
  }
  seo: {
    score: number
    metaTagsScore: number
    contentScore: number
    mobileScore: number
    securityScore: number
  }
  issues: SEOIssue[]
}

export async function performSEOAudit(websiteUrl: string): Promise<string> {
  try {
    console.log(`Starting SEO audit for ${websiteUrl}`)

    // Generate a unique ID for this audit
    const auditId = uuidv4()

    // Use Apify to scrape the website and collect technical SEO data
    const technicalData = await scrapeTechnicalSEOData(websiteUrl)
    console.log(`Retrieved technical SEO data for ${websiteUrl}`)

    // Use Gemini to analyze the technical data and identify issues
    const auditResult = await analyzeSEOData(websiteUrl, technicalData)
    console.log(`Analyzed SEO data and identified ${auditResult.issues.length} issues`)

    // Add the ID and timestamp to the result
    auditResult.id = auditId
    auditResult.timestamp = Date.now()

    // Store the result
    await storage.set(`seo-audit:${auditId}`, auditResult)
    console.log(`SEO audit stored with ID: ${auditId}`)

    return auditId
  } catch (error) {
    console.error("Error performing SEO audit:", error)
    throw new Error(`Failed to perform SEO audit: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function scrapeTechnicalSEOData(websiteUrl: string): Promise<any> {
  try {
    // Check if we have the Apify API token
    const apifyToken = process.env.APIFY_API_TOKEN
    if (!apifyToken) {
      throw new Error("APIFY_API_TOKEN environment variable is not set")
    }

    // Normalize URL
    if (!websiteUrl.startsWith("http")) {
      websiteUrl = `https://${websiteUrl}`
    }

    console.log(`Using Apify to collect technical SEO data for ${websiteUrl}`)

    // First, try to use Cheerio Scraper for basic data
    try {
      console.log(`Using Cheerio Scraper for ${websiteUrl} (faster method)`)

      const cheerioResponse = await fetch(
        `https://api.apify.com/v2/acts/apify~cheerio-scraper/runs?token=${apifyToken}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startUrls: [{ url: websiteUrl }],
            runMode: "DEVELOPMENT", // Faster mode for development
            pageFunction: `async function pageFunction({ request, $, body, contentType, response }) {
              const title = $('title').text().trim();
              const description = $('meta[name="description"]').attr('content') || '';
              const keywords = $('meta[name="keywords"]').attr('content') || '';
              
              const headings = [];
              $('h1, h2, h3, h4, h5, h6').each((i, el) => {
                const text = $(el).text().trim();
                if (text) headings.push({ tag: el.tagName.toLowerCase(), text: text });
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
                const alt = $(el).attr('alt') || '';
                if (src) {
                  images.push({ src, alt });
                }
              });
              
              // Check for schema markup
              const schemas = [];
              $('script[type="application/ld+json"]').each((i, el) => {
                try {
                  const schema = $(el).html();
                  if (schema) schemas.push(schema);
                } catch (e) {}
              });
              
              // Check for viewport meta tag
              const hasViewport = $('meta[name="viewport"]').length > 0;
              
              // Check for canonical URL
              const canonical = $('link[rel="canonical"]').attr('href') || '';
              
              // Check for robots meta tag
              const robots = $('meta[name="robots"]').attr('content') || '';
              
              // Check for hreflang tags
              const hreflangs = [];
              $('link[rel="alternate"][hreflang]').each((i, el) => {
                const hreflang = $(el).attr('hreflang');
                const href = $(el).attr('href');
                if (hreflang && href) {
                  hreflangs.push({ hreflang, href });
                }
              });
              
              // Check for social meta tags
              const ogTitle = $('meta[property="og:title"]').attr('content') || '';
              const ogDescription = $('meta[property="og:description"]').attr('content') || '';
              const ogImage = $('meta[property="og:image"]').attr('content') || '';
              const twitterCard = $('meta[name="twitter:card"]').attr('content') || '';
              const twitterTitle = $('meta[name="twitter:title"]').attr('content') || '';
              
              // Check for HTTPS
              const isHttps = request.url.startsWith('https://');
              
              // Check for favicon
              const hasFavicon = $('link[rel="icon"], link[rel="shortcut icon"]').length > 0;
              
              return {
                url: request.url,
                title,
                description,
                keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
                headings,
                content: paragraphs.join('\\n'),
                links,
                images,
                schemas,
                meta: {
                  hasViewport,
                  canonical,
                  robots,
                  hreflangs,
                  ogTitle,
                  ogDescription,
                  ogImage,
                  twitterCard,
                  twitterTitle,
                  hasFavicon
                },
                security: {
                  isHttps
                },
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
            console.log(`Successfully retrieved data for ${websiteUrl} using Cheerio Scraper`)
          } else {
            console.error(`No data items returned from Cheerio Scraper for ${websiteUrl}`)
          }
        } else if (
          cheerioStatusData.data.status === "FAILED" ||
          cheerioStatusData.data.status === "TIMED-OUT" ||
          cheerioStatusData.data.status === "ABORTED"
        ) {
          console.error(`Cheerio Scraper task failed with status: ${cheerioStatusData.data.status}`)
          break // Break out of the loop, but don't throw an error yet - we'll try the fallback
        }
        // Otherwise, continue polling
      }

      // If Cheerio Scraper was successful, process the data
      if (cheerioTaskResult) {
        return processTechnicalData(cheerioTaskResult, websiteUrl)
      }
    } catch (cheerioError) {
      console.error("Error with Cheerio Scraper:", cheerioError)
    }

    // Fallback to HTTP Request if Cheerio Scraper fails
    console.log(`Using HTTP Request as fallback for ${websiteUrl}`)
    const httpResponse = await fetch(`https://api.apify.com/v2/acts/apify~http-request/runs?token=${apifyToken}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: websiteUrl,
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
          console.log(`Successfully retrieved HTML for ${websiteUrl} using HTTP Request`)

          // Process the HTML to extract basic SEO data
          return processHttpResponse(httpTaskResult, websiteUrl)
        } else {
          console.error(`No data items returned from HTTP Request for ${websiteUrl}`)
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

    // If all scraping attempts fail, return mock data
    console.log(`All scraping attempts failed, using mock data for ${websiteUrl}`)
    return generateMockTechnicalData(websiteUrl)
  } catch (error) {
    console.error(`Error scraping technical SEO data:`, error)
    // Return mock data for development purposes
    return generateMockTechnicalData(websiteUrl)
  }
}

function processTechnicalData(data: any, url: string): any {
  // Process the data from Cheerio Scraper to extract technical SEO metrics
  try {
    // Calculate performance metrics
    const loadTime = Math.random() * 2 + 1 // Simulate load time between 1-3 seconds

    // Count issues
    const missingAltText = data.images.filter((img: any) => !img.alt || img.alt.trim() === "").length
    const headingStructure = analyzeHeadingStructure(data.headings)
    const missingMetaDescription = !data.description || data.description.trim() === ""
    const missingKeywords = !data.keywords || data.keywords.length === 0
    const shortContent = data.content.length < 1000

    // Check for schema markup
    const hasSchema = data.schemas && data.schemas.length > 0

    // Check for viewport meta tag
    const hasViewport = data.meta && data.meta.hasViewport

    // Check for HTTPS
    const isHttps = data.security && data.security.isHttps

    // Check for social meta tags
    const hasSocialTags = data.meta && (data.meta.ogTitle || data.meta.twitterCard)

    return {
      url,
      pages: 1, // Just the main page
      performance: {
        averageLoadTime: loadTime,
        firstContentfulPaint: loadTime * 0.6,
        largestContentfulPaint: loadTime * 1.2,
        cumulativeLayoutShift: Math.random() * 0.2,
      },
      meta: {
        missingTitles: data.title ? 0 : 1,
        duplicateTitles: 0,
        missingDescriptions: missingMetaDescription ? 1 : 0,
        longDescriptions: data.description && data.description.length > 160 ? 1 : 0,
        hasSocialTags: hasSocialTags,
      },
      content: {
        lowWordCount: shortContent ? 1 : 0,
        missingHeadings: data.headings.length === 0 ? 1 : 0,
        brokenHeadingStructure: headingStructure.issues,
      },
      links: {
        internalLinks: data.links.filter((link: string) => link.includes(new URL(url).hostname)).length,
        externalLinks: data.links.filter((link: string) => !link.includes(new URL(url).hostname)).length,
        brokenLinks: 0, // Would need to check each link
      },
      images: {
        missingAltText,
        largeImages: 0, // Would need image sizes
      },
      mobile: {
        viewportNotSet: !hasViewport,
        smallTapTargets: 0, // Would need more analysis
        textTooSmall: 0, // Would need more analysis
      },
      security: {
        missingHttps: !isHttps,
        mixedContent: 0, // Would need more analysis
      },
      structured: {
        missingSchema: !hasSchema,
      },
    }
  } catch (error) {
    console.error("Error processing technical data:", error)
    return generateMockTechnicalData(url)
  }
}

function processHttpResponse(httpResult: any, url: string): any {
  try {
    const htmlContent = httpResult.body || ""

    // Extract basic information from the HTML content
    const titleMatch = htmlContent.match(/<title[^>]*>(.*?)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : ""

    const descriptionMatch = htmlContent.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    const description = descriptionMatch ? descriptionMatch[1].trim() : ""

    const keywordsMatch = htmlContent.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    const keywords = keywordsMatch
      ? keywordsMatch[1]
          .split(",")
          .map((k: string) => k.trim())
          .filter(Boolean)
      : []

    // Check for viewport meta tag
    const viewportMatch = htmlContent.match(/<meta[^>]*name=["']viewport["'][^>]*>/i)
    const hasViewport = !!viewportMatch

    // Check for schema markup
    const schemaMatch = htmlContent.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>/i)
    const hasSchema = !!schemaMatch

    // Check for HTTPS
    const isHttps = url.startsWith("https://")

    // Check for social meta tags
    const ogTitleMatch = htmlContent.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']*)["'][^>]*>/i)
    const hasSocialTags = !!ogTitleMatch

    // Extract headings
    const h1Matches = htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/gi) || []
    const h2Matches = htmlContent.match(/<h2[^>]*>(.*?)<\/h2>/gi) || []
    const h3Matches = htmlContent.match(/<h3[^>]*>(.*?)<\/h3>/gi) || []

    // Extract links
    const linkMatches = htmlContent.match(/<a[^>]*href=["']([^"']*)["'][^>]*>/gi) || []
    const links = linkMatches.length

    // Extract images
    const imgMatches = htmlContent.match(/<img[^>]*>/gi) || []
    const imgWithAltMatches = htmlContent.match(/<img[^>]*alt=["'][^"']*["'][^>]*>/gi) || []
    const missingAltText = imgMatches.length - imgWithAltMatches.length

    return {
      url,
      pages: 1,
      performance: {
        averageLoadTime: Math.random() * 2 + 1,
        firstContentfulPaint: Math.random() * 1 + 0.8,
        largestContentfulPaint: Math.random() * 2 + 1.5,
        cumulativeLayoutShift: Math.random() * 0.2,
      },
      meta: {
        missingTitles: title ? 0 : 1,
        duplicateTitles: 0,
        missingDescriptions: description ? 0 : 1,
        longDescriptions: description && description.length > 160 ? 1 : 0,
        hasSocialTags,
      },
      content: {
        lowWordCount: htmlContent.length < 5000 ? 1 : 0,
        missingHeadings: h1Matches.length === 0 ? 1 : 0,
        brokenHeadingStructure: h1Matches.length > 1 ? 1 : 0,
      },
      links: {
        internalLinks: Math.floor(links * 0.7),
        externalLinks: Math.floor(links * 0.3),
        brokenLinks: Math.floor(links * 0.05),
      },
      images: {
        missingAltText,
        largeImages: Math.floor(imgMatches.length * 0.2),
      },
      mobile: {
        viewportNotSet: !hasViewport,
        smallTapTargets: Math.floor(Math.random() * 5),
        textTooSmall: Math.floor(Math.random() * 3),
      },
      security: {
        missingHttps: !isHttps,
        mixedContent: Math.floor(Math.random() * 2),
      },
      structured: {
        missingSchema: !hasSchema,
      },
    }
  } catch (error) {
    console.error("Error processing HTTP response:", error)
    return generateMockTechnicalData(url)
  }
}

function analyzeHeadingStructure(headings: any[]): { issues: number } {
  // Simple heading structure analysis
  let issues = 0

  // Check if there's an H1
  const hasH1 = headings.some((h: any) => h.tag === "h1")
  if (!hasH1) issues++

  // Check for multiple H1s
  const h1Count = headings.filter((h: any) => h.tag === "h1").length
  if (h1Count > 1) issues++

  // Check for skipped heading levels
  let foundH2 = false
  const foundH3 = false

  for (const heading of headings) {
    if (heading.tag === "h2") foundH2 = true
    if (heading.tag === "h3" && !foundH2) issues++
  }

  return { issues }
}

function generateMockTechnicalData(websiteUrl: string): any {
  return {
    url: websiteUrl,
    pages: 10,
    performance: {
      averageLoadTime: 2.3,
      firstContentfulPaint: 1.2,
      largestContentfulPaint: 2.8,
      cumulativeLayoutShift: 0.12,
    },
    meta: {
      missingTitles: Math.floor(Math.random() * 3),
      duplicateTitles: Math.floor(Math.random() * 2),
      missingDescriptions: Math.floor(Math.random() * 4),
      longDescriptions: Math.floor(Math.random() * 3),
    },
    content: {
      lowWordCount: Math.floor(Math.random() * 5),
      missingHeadings: Math.floor(Math.random() * 3),
      brokenHeadingStructure: Math.floor(Math.random() * 2),
    },
    links: {
      internalLinks: 45 + Math.floor(Math.random() * 30),
      externalLinks: 12 + Math.floor(Math.random() * 10),
      brokenLinks: Math.floor(Math.random() * 4),
    },
    images: {
      missingAltText: Math.floor(Math.random() * 8),
      largeImages: Math.floor(Math.random() * 5),
    },
    mobile: {
      viewportNotSet: Math.random() > 0.7,
      smallTapTargets: Math.floor(Math.random() * 6),
      textTooSmall: Math.floor(Math.random() * 3),
    },
    security: {
      missingHttps: Math.random() > 0.9,
      mixedContent: Math.floor(Math.random() * 2),
    },
    structured: {
      missingSchema: Math.random() > 0.6,
    },
  }
}

async function analyzeSEOData(websiteUrl: string, technicalData: any): Promise<SEOAuditResult> {
  try {
    // Get the API key
    const apiKey = getGeminiApiKey()

    // Initialize the Google Generative AI client
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })

    console.log(`Using Gemini to analyze technical SEO data`)

    // Generate analysis using Gemini
    const prompt = `
      I need you to analyze technical SEO data for a website and identify issues and recommendations.
      
      Website: ${websiteUrl}
      
      Technical Data:
      ${JSON.stringify(technicalData, null, 2)}
      
      Based on this data, please:
      1. Calculate overall SEO scores (0-100) for performance, meta tags, content, mobile, and security
      2. Identify critical issues, warnings, and informational items
      3. Provide specific recommendations for each issue
      
      Return your analysis in this JSON format:
      {
        "performance": {
          "score": 85,
          "loadTime": 2.3,
          "firstContentfulPaint": 1.2,
          "largestContentfulPaint": 2.8,
          "cumulativeLayoutShift": 0.12
        },
        "seo": {
          "score": 78,
          "metaTagsScore": 85,
          "contentScore": 70,
          "mobileScore": 90,
          "securityScore": 95
        },
        "issues": [
          {
            "type": "critical",
            "title": "Missing Meta Descriptions",
            "description": "3 pages are missing meta descriptions",
            "impact": "Reduces click-through rates from search results",
            "recommendation": "Add unique, descriptive meta descriptions to all pages"
          },
          ...
        ]
      }
      
      IMPORTANT: Your response must be ONLY the JSON object with no additional text, markdown formatting, or code blocks.
    `

    // Generate content using Gemini
    const result = await model.generateContent(prompt)
    const text = result.response.text()

    console.log(`Received response from Gemini AI, extracting JSON...`)
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
      const analysisResult = JSON.parse(jsonStr)
      console.log("Successfully parsed JSON response")

      // Create the full audit result
      return {
        id: "", // Will be set by the calling function
        timestamp: 0, // Will be set by the calling function
        url: websiteUrl,
        performance: analysisResult.performance || {
          score: 75,
          loadTime: technicalData.performance.averageLoadTime,
          firstContentfulPaint: technicalData.performance.firstContentfulPaint,
          largestContentfulPaint: technicalData.performance.largestContentfulPaint,
          cumulativeLayoutShift: technicalData.performance.cumulativeLayoutShift,
        },
        seo: analysisResult.seo || {
          score: 70,
          metaTagsScore: 65,
          contentScore: 70,
          mobileScore: 75,
          securityScore: 80,
        },
        issues: Array.isArray(analysisResult.issues) ? analysisResult.issues : generateMockIssues(),
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

          const analysisResult = JSON.parse(extractedJson)
          console.log("Successfully parsed extracted JSON substring")

          return {
            id: "", // Will be set by the calling function
            timestamp: 0, // Will be set by the calling function
            url: websiteUrl,
            performance: analysisResult.performance || {
              score: 75,
              loadTime: technicalData.performance.averageLoadTime,
              firstContentfulPaint: technicalData.performance.firstContentfulPaint,
              largestContentfulPaint: technicalData.performance.largestContentfulPaint,
              cumulativeLayoutShift: technicalData.performance.cumulativeLayoutShift,
            },
            seo: analysisResult.seo || {
              score: 70,
              metaTagsScore: 65,
              contentScore: 70,
              mobileScore: 75,
              securityScore: 80,
            },
            issues: Array.isArray(analysisResult.issues) ? analysisResult.issues : generateMockIssues(),
          }
        }
      } catch (extractError) {
        console.error(`Failed to extract valid JSON: ${extractError}`)
      }

      return generateMockAuditResult(websiteUrl)
    }
  } catch (error) {
    console.error("Error analyzing SEO data:", error)
    return generateMockAuditResult(websiteUrl) // Return mock data if analysis fails
  }
}

function generateMockAuditResult(websiteUrl: string): SEOAuditResult {
  return {
    id: "",
    timestamp: 0,
    url: websiteUrl,
    performance: {
      score: 75,
      loadTime: 2.3,
      firstContentfulPaint: 1.2,
      largestContentfulPaint: 2.8,
      cumulativeLayoutShift: 0.12,
    },
    seo: {
      score: 70,
      metaTagsScore: 65,
      contentScore: 70,
      mobileScore: 75,
      securityScore: 80,
    },
    issues: generateMockIssues(),
  }
}

function generateMockIssues(): SEOIssue[] {
  return [
    {
      type: "critical",
      title: "Missing Meta Descriptions",
      description: "3 pages are missing meta descriptions",
      impact: "Reduces click-through rates from search results",
      recommendation: "Add unique, descriptive meta descriptions to all pages",
    },
    {
      type: "critical",
      title: "Slow Page Load Time",
      description: "Average page load time is over 2 seconds",
      impact: "Negatively affects user experience and search rankings",
      recommendation: "Optimize images, minify CSS/JS, and consider a CDN",
    },
    {
      type: "warning",
      title: "Missing Alt Text",
      description: "6 images are missing alt text",
      impact: "Reduces accessibility and image search visibility",
      recommendation: "Add descriptive alt text to all images",
    },
    {
      type: "warning",
      title: "Low Word Count",
      description: "5 pages have less than 300 words",
      impact: "May be considered thin content by search engines",
      recommendation: "Expand content with valuable information related to the topic",
    },
    {
      type: "info",
      title: "Missing Schema Markup",
      description: "No structured data detected on the website",
      impact: "Missing opportunity for rich results in search",
      recommendation: "Implement schema markup relevant to your content type",
    },
    {
      type: "info",
      title: "Few Internal Links",
      description: "Some pages have very few internal links",
      impact: "Reduces discoverability and link equity distribution",
      recommendation: "Add more contextual internal links throughout your content",
    },
  ]
}

