"use server"

import { v4 as uuidv4 } from "uuid"
import { GoogleGenerativeAI } from "@google/generative-ai"
import { storage } from "@/lib/storage"
import { getGeminiApiKey } from "@/lib/ai-config"
import { extractProductData } from "./extract-product-data-action"

export type ProductComparisonResult = {
  id: string
  date: number
  website: string
  category: string
  status: "running" | "completed" | "failed"
  products: any[]
  analysis: {
    priceRanges: {
      min: number
      max: number
      average: number
    }
    topRatedProducts: any[]
    mostReviewedProducts: any[]
    recommendations: string[]
  } | null
  error?: string
}

export async function runProductComparison(formData: FormData): Promise<string> {
  try {
    // Extract data from form
    const website = formData.get("website") as string
    const category = formData.get("category") as string

    if (!website) {
      throw new Error("Website is required")
    }

    // Generate a unique ID for this comparison
    const id = uuidv4()

    // Initialize the result
    const initialResult: ProductComparisonResult = {
      id,
      date: Date.now(),
      website,
      category,
      status: "running",
      products: [],
      analysis: null,
    }

    // Store the initial result
    await storage.set(`product-comparison:${id}`, initialResult)

    // Start the analysis in the background
    analyzeProducts(id, website, category)

    return id
  } catch (error) {
    console.error("Error running product comparison:", error)
    throw new Error(`Failed to run product comparison: ${error instanceof Error ? error.message : String(error)}`)
  }
}

async function analyzeProducts(id: string, website: string, category: string) {
  try {
    console.log(`Starting product analysis for ${website} - ${category} (ID: ${id})`)

    // Use Apify to scrape the website and collect product data
    const rawData = await scrapeWebsite(website, category)
    console.log(`Retrieved raw data for ${rawData.length} products`)

    // Log a sample of the raw data to debug image URLs
    if (rawData.length > 0) {
      console.log("Sample raw product data (first item):", JSON.stringify(rawData[0], null, 2))
    }

    // Extract structured product data using Gemini
    let structuredProducts: any[] = []
    try {
      structuredProducts = await extractProductData(rawData)
      console.log(`Extracted structured data for ${structuredProducts.length} products`)

      // Log a sample of the structured data to debug image URLs
      if (structuredProducts.length > 0) {
        console.log("Sample structured product data (first item):", JSON.stringify(structuredProducts[0], null, 2))
      }

      // If we didn't get any structured products, use the raw data
      if (structuredProducts.length === 0 && rawData.length > 0) {
        console.log("No structured products extracted, using raw data instead")
        structuredProducts = rawData
      }
    } catch (error) {
      console.error("Error extracting structured product data:", error)
      console.log("Using raw data due to extraction error")
      structuredProducts = rawData
    }

    // Ensure each product has a unique ID to prevent React key issues
    structuredProducts = structuredProducts.map((product, index) => ({
      ...product,
      id: `product-${index}-${Date.now()}`, // Add a unique ID
      imageKey: `img-${index}-${Date.now()}`, // Add a unique key for images
    }))

    // Perform AI analysis using Gemini
    const analysis = await analyzeProductData(structuredProducts)
    console.log("Product analysis completed")

    // Update the result with the analysis
    const updatedResult: ProductComparisonResult = {
      id,
      date: Date.now(),
      website,
      category,
      status: "completed",
      products: structuredProducts,
      analysis,
    }

    console.log(`Storing ${structuredProducts.length} products in the result`)
    await storage.set(`product-comparison:${id}`, updatedResult)
    console.log(`Product analysis completed and stored with ID: ${id}`)
  } catch (error) {
    console.error("Error analyzing products:", error)

    // Update the result with the error
    const failedResult: ProductComparisonResult = {
      id,
      date: Date.now(),
      website,
      category,
      status: "failed",
      products: [],
      analysis: null,
      error: error instanceof Error ? error.message : String(error),
    }

    await storage.set(`product-comparison:${id}`, failedResult)
  }
}

async function scrapeWebsite(website: string, category: string): Promise<any[]> {
  try {
    // Check if we have the Apify API token
    const apifyToken = process.env.APIFY_API_TOKEN
    if (!apifyToken) {
      throw new Error("APIFY_API_TOKEN environment variable is not set")
    }

    console.log(`Using Apify to scrape product data from ${website}`)

    // Construct the URL based on the website and category
    let startUrl = website.startsWith("http") ? website : `https://${website}`
    if (category) {
      // Handle different e-commerce sites' search URL patterns
      if (website.includes("amazon")) {
        startUrl = `${startUrl}/s?k=${encodeURIComponent(category)}`
      } else if (website.includes("flipkart")) {
        startUrl = `${startUrl}/search?q=${encodeURIComponent(category)}`
      } else if (website.includes("ajio")) {
        startUrl = `${startUrl}/s/search/?text=${encodeURIComponent(category)}`
      } else if (website.includes("nykaa")) {
        startUrl = `${startUrl}/search/result/?q=${encodeURIComponent(category)}`
      } else {
        // Generic search pattern
        startUrl = `${startUrl}/search?q=${encodeURIComponent(category)}`
      }
    }

    // Use Cheerio Scraper for consistent approach with other pages
    console.log(`Using Cheerio Scraper to analyze website: ${startUrl}`)
    const response = await fetchWithRetry(
      `https://api.apify.com/v2/acts/apify~cheerio-scraper/runs?token=${apifyToken}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startUrls: [{ url: startUrl }],
          runMode: "DEVELOPMENT", // Faster mode for development
          pageFunction: `async function pageFunction({ request, $, body, contentType, response }) {
            console.log('Scraping URL:', request.url);
            const products = [];
            
            // Define all selectors at the top level so they're available throughout the function
            const productSelectors = [
              '.product', '.item', '.card', '[data-component-type="s-search-result"]', 
              '.s-result-item', '.product-item', '.product-card', '.product-box',
              '[class*="product"]', '[class*="item"]', '[class*="card"]', '[class*="result"]',
              'li.a-carousel-card', '.a-carousel-card', '.sg-col-inner', '.sg-col',
              '.product-base', '.product-wrap', '.product-container', '.product-box',
              '.product-grid-item', '.product-list-item', '.product-tile',
              '.product-grid > div', 
              '.products-grid > li', 
              '.product-list > div',
              '.item-grid > div',
              '.product-listing > div',
              '.search-result-item',
              '[data-testid*="product"]',
              '[data-testid*="item"]',
              '[data-testid*="result"]',
              '[id*="product"]',
              '[id*="item"]',
              '[class*="ProductCard"]',
              '[class*="productCard"]',
              '[class*="product-card"]',
              '[class*="itemCard"]',
              '[class*="item-card"]',
              'div[data-component="product"]',
              'div.product-container',
              'li.product-item',
              'div.product-wrapper',
              'article.product',
              'div.item-container',
              'div.grid-item',
              'div.cell',
              'div.column',
            ];
            
            const nameSelectors = [
              '.name', '.title', 'h2', 'h3', 'h4', '.product-title', '.product-name',
              '.product-info', '.product-details', '[class*="title"]', '[class*="name"]',
              '.a-size-medium', '.a-size-base-plus', '.a-size-small', '.a-text-normal',
              '.product-title', '.product-name', '.product-info', '.product-details'
            ];
            
            const priceSelectors = [
              '.price', '.offer-price', '.selling-price', '.current-price', 
              '[class*="price"]', '[class*="Price"]', '.a-price', '.a-offscreen',
              '.a-price-whole', '.a-price-fraction', '.a-price-symbol',
              '.product-price', '.price-box', '.price-container', '.price-wrapper'
            ];
            
            const imageSelectors = [
              '.s-image', 
              '.product-image img', 
              '.product-img img', 
              '.image img',
              'img.primary-image', 
              'img.product-image', 
              'img.product-img', 
              'img.image',
              'img'
            ];
            
            const ratingSelectors = [
              '.rating', '.stars', '.star-rating', '[class*="rating"]', 
              '[class*="stars"]', '.a-star-rating', '.a-icon-star',
              '.product-rating', '.rating-box', '.rating-container'
            ];
            
            const reviewsSelectors = [
              '.reviews', '.review-count', '[class*="review"]', 
              '.a-size-base', '.a-link-normal', '.a-color-tertiary',
              '.product-reviews', '.review-box', '.review-container'
            ];
            
            const urlSelectors = ['a', '.product-link', '.product-url', '[class*="link"]'];
            
            const gridSelectors = [
              '.products-grid', '.product-grid', '.items-grid', '.search-results', 
              '[class*="product-list"]', '[class*="product-grid"]', '[class*="items-grid"]',
              '[class*="search-results"]', '[class*="results-list"]'
            ];
            
            // Join all selectors with commas for a single query
            const productSelector = productSelectors.join(', ');
            
            // Log how many potential product elements we found
            console.log('Found potential product elements:', $(productSelector).length);
            
            // Function to extract text and clean it
            const extractText = (el, selectors) => {
              for (const selector of selectors) {
                const text = $(el).find(selector).text().trim();
                if (text) return text;
              }
              return '';
            };
            
            // Function to extract attribute with multiple fallbacks
            const extractAttr = (el, selectors, attrs) => {
              // If attrs is a string, convert it to an array
              const attributes = Array.isArray(attrs) ? attrs : [attrs];
              
              for (const selector of selectors) {
                const element = $(el).find(selector);
                if (element.length) {
                  for (const attr of attributes) {
                    const value = element.attr(attr);
                    if (value) return value;
                  }
                }
              }
              return '';
            };
            
            // Process each potential product element
            $(productSelector).each((i, el) => {
              // Extract product data
              const name = extractText(el, nameSelectors);
              const price = extractText(el, priceSelectors);
              
              // Try multiple image attributes (src, data-src, data-original, etc.)
              let imageUrl = extractAttr(el, imageSelectors, ['src', 'data-src', 'data-original', 'data-lazy-src', 'data-img', 'data-image']);
              
              // If still no image, try looking for background-image in style
              if (!imageUrl) {
                const style = $(el).find('div[style*="background-image"]').attr('style');
                if (style) {
                  const match = style.match(/background-image:\\s*url\$$['"]?([^'"\$$]+)['"]?\\)/i);
                  if (match && match[1]) {
                    imageUrl = match[1];
                  }
                }
              }
              
              // Try to extract rating as a number
              let rating = 0;
              const ratingText = extractText(el, ratingSelectors);
              if (ratingText) {
                // Try to extract a number from the rating text
                const ratingMatch = ratingText.match(/([0-9]\\.[0-9])|([0-9])/);
                if (ratingMatch) {
                  rating = parseFloat(ratingMatch[0]);
                }
              }
              
              // Try to extract reviews count as a number
              let reviews = 0;
              const reviewsText = extractText(el, reviewsSelectors);
              if (reviewsText) {
                // Try to extract a number from the reviews text
                const reviewsMatch = reviewsText.match(/\\d+/);
                if (reviewsMatch) {
                  reviews = parseInt(reviewsMatch[0], 10);
                }
              }
              
              // Extract product URL
              let url = extractAttr(el, urlSelectors, 'href');
              
              // Make URL absolute if it's relative
              if (url && !url.startsWith('http')) {
                try {
                  url = new URL(url, request.url).href;
                } catch (e) {
                  console.log('Error making URL absolute:', e);
                }
              }
              
              // Make image URL absolute if it's relative
              if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
                try {
                  imageUrl = new URL(imageUrl, request.url).href;
                } catch (e) {
                  console.log('Error making image URL absolute:', e);
                }
              }
              
              // Add a unique timestamp to the image URL to prevent caching issues
              if (imageUrl) {
                // Add a cache-busting parameter if the URL doesn't already have parameters
                imageUrl = imageUrl.includes('?') 
                  ? imageUrl + '&_t=' + Date.now() + '_' + i 
                  : imageUrl + '?_t=' + Date.now() + '_' + i;
              }
              
              // Only add product if we have at least a name or price
              if (name || price) {
                // Log the image URL for debugging
                console.log(\`Product \${i+1} image URL: \${imageUrl}\`);
                
                products.push({ 
                  name, 
                  price, 
                  imageUrl, 
                  rating, 
                  reviews, 
                  url,
                  uniqueId: Date.now() + '_' + i // Add a unique ID to each product
                });
              }
            });
            
            // If we didn't find any products with the above selectors, try a more aggressive approach
            if (products.length === 0) {
              console.log('No products found with standard selectors, trying alternative approach');
              
              // Look for any elements that might contain product information
              $('div, li, article, section').each((i, el) => {
                // Check if this element might be a product
                const html = $(el).html();
                const text = $(el).text();
                
                // Skip very small elements or very large elements
                if (text.length < 10 || text.length > 1000) return;
                
                // Look for price patterns in the text
                const hasPricePattern = /\\$\\d+\\.\\d+|\\$\\d+|\\d+\\.\\d+|\\d+/.test(text);
                
                // Look for image within this element
                const hasImage = $(el).find('img').length > 0;
                
                // If it has both price pattern and image, it might be a product
                if (hasPricePattern && hasImage) {
                  const name = text.split('\\n')[0].trim();
                  const priceMatch = text.match(/\\$\\d+\\.\\d+|\\$\\d+|\\d+\\.\\d+|\\d+/);
                  const price = priceMatch ? priceMatch[0] : '';
                  
                  // Extract image URL with multiple fallbacks
                  let imageUrl = '';
                  const img = $(el).find('img');
                  if (img.length) {
                    imageUrl = img.attr('src') || img.attr('data-src') || img.attr('data-original') || '';
                  }
                  
                  // Make image URL absolute if it's relative
                  if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
                    try {
                      imageUrl = new URL(imageUrl, request.url).href;
                    } catch (e) {
                      console.log('Error making image URL absolute:', e);
                    }
                  }
                  
                  // Add a unique timestamp to the image URL
                  if (imageUrl) {
                    imageUrl = imageUrl.includes('?') 
                      ? imageUrl + '&_t=' + Date.now() + '_' + i 
                      : imageUrl + '?_t=' + Date.now() + '_' + i;
                  }
                  
                  const url = $(el).find('a').attr('href') || '';
                  
                  // Log the image URL for debugging
                  console.log(\`Alternative product \${i+1} image URL: \${imageUrl}\`);
                  
                  products.push({ 
                    name, 
                    price, 
                    imageUrl, 
                    rating: 0, 
                    reviews: 0, 
                    url,
                    uniqueId: Date.now() + '_alt_' + i
                  });
                }
              });
            }

            // If we found some products but not many, try an additional approach to find more
            if (products.length > 0 && products.length < 5) {
              console.log('Found only a few products, trying to find more with additional selectors');
              
              for (const gridSelector of gridSelectors) {
                const grid = $(gridSelector);
                if (grid.length > 0) {
                  console.log('Found product grid with selector: ' + gridSelector);
                  
                  // Find direct children that might be products
                  grid.children().each((i, el) => {
                    // Extract product data using the same approach as before
                    const name = extractText($(el), nameSelectors);
                    const price = extractText($(el), priceSelectors);
                    
                    // Try multiple image attributes
                    let imageUrl = extractAttr($(el), imageSelectors, ['src', 'data-src', 'data-original', 'data-lazy-src', 'data-img', 'data-image']);
                    
                    // Make image URL absolute if it's relative
                    if (imageUrl && !imageUrl.startsWith('http')) {
                      try {
                        imageUrl = new URL(imageUrl, request.url).href;
                      } catch (e) {
                        console.log('Error making image URL absolute:', e);
                      }
                    }
                    
                    // Add a unique timestamp to the image URL
                    if (imageUrl) {
                      imageUrl = imageUrl.includes('?') 
                        ? imageUrl + '&_t=' + Date.now() + '_grid_' + i 
                        : imageUrl + '?_t=' + Date.now() + '_grid_' + i;
                    }
                    
                    // Extract other data
                    const rating = 0; // Simplified for this fallback
                    const reviews = 0; // Simplified for this fallback
                    let url = extractAttr($(el), urlSelectors, 'href');
                    
                    // Make URL absolute if it's relative
                    if (url && !url.startsWith('http')) {
                      try {
                        url = new URL(url, request.url).href;
                      } catch (e) {
                        console.log('Error making URL absolute:', e);
                      }
                    }
                    
                    // Only add product if we have at least a name or price
                    if (name || price) {
                      // Log the image URL for debugging
                      console.log(\`Grid product \${i+1} image URL: \${imageUrl}\`);
                      
                      products.push({ 
                        name, 
                        price, 
                        imageUrl, 
                        rating, 
                        reviews, 
                        url,
                        uniqueId: Date.now() + '_grid_' + i
                      });
                    }
                  });
                }
              }
            }
            
            console.log('Total products found:', products.length);
            
            // Ensure each product has a unique image URL by logging and checking
            const imageUrls = new Set();
            products.forEach((product, index) => {
              if (product.imageUrl) {
                imageUrls.add(product.imageUrl);
                console.log(\`Product \${index+1} has image URL: \${product.imageUrl}\`);
              } else {
                console.log(\`Product \${index+1} has no image URL\`);
              }
            });
            console.log(\`Found \${imageUrls.size} unique image URLs out of \${products.length} products\`);
            
            return products;
          }`,
          proxyConfiguration: {
            useApifyProxy: true,
          },
          maxCrawlDepth: 2, // Increased to crawl deeper
          maxRequestsPerCrawl: 50, // Increased to fetch more pages
          maxConcurrency: 10, // Increased for faster scraping
          maxPagesPerCrawl: 5, // Added to ensure we get more pages
          maxOutputItems: 200, // Added to increase the maximum number of products returned
        }),
      },
    )

    if (!response.ok) {
      const responseText = await response.text()
      console.error(`Cheerio Scraper API error: ${responseText}`)
      throw new Error(`Failed to start Cheerio Scraper: ${response.status} ${response.statusText}`)
    }

    const data = await safeJsonParse(response)
    const runId = data.data.id

    console.log(`Cheerio Scraper task started with run ID: ${runId}`)

    // Wait for the task to complete with improved polling
    let taskComplete = false
    let taskResult = null
    let attempts = 0
    const maxAttempts = 30 // 2.5 minutes (5 seconds * 30)

    while (!taskComplete && attempts < maxAttempts) {
      attempts++
      await new Promise((resolve) => setTimeout(resolve, 5000)) // Wait 5 seconds

      console.log(`Checking Cheerio Scraper status (attempt ${attempts}/${maxAttempts})...`)

      const statusResponse = await fetchWithRetry(`https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`)

      if (!statusResponse.ok) {
        console.error(`Failed to check Cheerio Scraper status: ${statusResponse.statusText}`)
        continue
      }

      const statusData = await safeJsonParse(statusResponse)
      console.log(`Cheerio Scraper status: ${statusData.data.status}`)

      if (statusData.data.status === "SUCCEEDED") {
        taskComplete = true

        // Get the dataset items
        console.log(`Fetching Cheerio Scraper results...`)
        const datasetResponse = await fetchWithRetry(
          `https://api.apify.com/v2/actor-runs/${runId}/dataset/items?token=${apifyToken}`,
        )

        if (!datasetResponse.ok) {
          throw new Error(`Failed to fetch Cheerio Scraper results: ${datasetResponse.statusText}`)
        }

        const datasetItems = await safeJsonParse(datasetResponse)

        if (datasetItems.length > 0) {
          taskResult = datasetItems.flat() // Flatten in case we get nested arrays
          console.log(`Successfully retrieved data for ${taskResult.length} products`)

          // Log image URLs for debugging
          if (taskResult.length > 0) {
            console.log("Sample image URLs from first 5 products:")
            taskResult.slice(0, 5).forEach((product, index) => {
              console.log(`Product ${index + 1} image URL: ${product.imageUrl || "none"}`)
            })
          }
        } else {
          console.warn(`No data items returned from Cheerio Scraper`)
          return []
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

    return taskResult
  } catch (error) {
    console.error(`Error scraping website for product data:`, error)
    return []
  }
}

async function analyzeProductData(products: any[]): Promise<any> {
  try {
    // Get the API key
    const apiKey = getGeminiApiKey()

    // Initialize the Google Generative AI client
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" })

    console.log(`Using Gemini to analyze product data`)

    // Calculate price ranges with much more robust handling
    const prices = products
      .map((p) => {
        const priceStr = p.price || ""

        // Skip prices that are clearly invalid
        if (!priceStr || priceStr === "Price not available") return 0

        // Try to extract the numeric part of the price
        // This regex looks for numbers with optional decimal points
        const priceMatch = priceStr.match(/(\d+,)*\d+(\.\d+)?/)
        if (!priceMatch) return 0

        // Remove commas and convert to number
        const priceNum = Number.parseFloat(priceMatch[0].replace(/,/g, ""))

        // Apply a sanity check for realistic prices
        // If price is extremely low (like < 10), it's likely incorrect
        if (priceNum > 0 && priceNum < 10) {
          // Assume this is likely a price in hundreds or thousands
          return priceNum * 1000
        }

        // If price is still suspiciously low but not tiny
        if (priceNum >= 10 && priceNum < 100) {
          return priceNum * 10
        }

        return isNaN(priceNum) ? 0 : priceNum
      })
      .filter((p) => p > 0)

    const minPrice = prices.length > 0 ? Math.min(...prices) : 0
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0
    const averagePrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0

    // Sort products by rating and reviews
    const topRatedProducts = [...products]
      .filter((p) => typeof p.rating === "number" && p.rating > 0)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5)

    const mostReviewedProducts = [...products]
      .filter((p) => typeof p.reviews === "number" && p.reviews > 0)
      .sort((a, b) => b.reviews - a.reviews)
      .slice(0, 5)

    // Prepare data for Gemini
    const productsForAnalysis = products.map((p) => ({
      name: p.name,
      price: p.price,
      rating: p.rating,
      reviews: p.reviews,
    }))

    // Generate analysis using Gemini
    const prompt = `
      I need you to analyze product data and provide strategic recommendations.
      
      Products:
      ${JSON.stringify(productsForAnalysis, null, 2)}
      
      Based on this data, please provide 3-5 strategic recommendations for someone selling these products.
      
      Return your analysis in this JSON format:
      {
        "recommendations": [
          "Recommendation 1",
          "Recommendation 2",
          ...
        ]
      }
      
      IMPORTANT: Your response must be ONLY the JSON object with no additional text, markdown formatting, or code blocks.
    `

    // Generate content using Gemini
    const result = await model.generateContent(prompt)
    const text = result.response.text()

    // Extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error(`Failed to extract JSON from Gemini response: ${text.substring(0, 200)}...`)
    }

    const analysisResult = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

    return {
      priceRanges: {
        min: minPrice,
        max: maxPrice,
        average: averagePrice,
      },
      topRatedProducts,
      mostReviewedProducts,
      recommendations: Array.isArray(analysisResult.recommendations) ? analysisResult.recommendations : [],
    }
  } catch (error) {
    console.error("Error analyzing product data:", error)
    return {
      priceRanges: {
        min: 0,
        max: 0,
        average: 0,
      },
      topRatedProducts: [],
      mostReviewedProducts: [],
      recommendations: [],
    }
  }
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  backoff = 1000,
): Promise<Response> {
  try {
    return await fetch(url, options)
  } catch (error) {
    if (retries > 0) {
      console.log(`Retrying after ${backoff}ms (${retries} retries remaining)`)
      await new Promise((resolve) => setTimeout(resolve, backoff))
      return fetchWithRetry(url, options, retries - 1, backoff * 2)
    }
    throw error
  }
}

export async function safeJsonParse(response: Response): Promise<any> {
  try {
    return await response.json()
  } catch (error) {
    const text = await response.text()
    console.error("Failed to parse JSON, raw response text:", text)
    throw error
  }
}

