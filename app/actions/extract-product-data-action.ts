"use server"

import { fetchWithRetry, safeJsonParse } from "./product-comparison-action"

export async function extractProductData(rawData: any[]): Promise<any[]> {
  // Use Gemini to extract structured product data
  const geminiApiKey = process.env.GEMINI_API_KEY
  if (!geminiApiKey) {
    console.error("GEMINI_API_KEY is not set")
    return rawData // Return the raw data instead of empty array
  }

  // If no raw data, return empty array
  if (!rawData || rawData.length === 0) {
    console.log("No raw data to extract")
    return []
  }

  console.log(`Starting product extraction with ${rawData.length} raw data items`)

  // Prepare the raw data for Gemini analysis
  const rawDataSample = rawData
  console.log(`Sending raw data sample to Gemini for extraction. Sample size: ${rawDataSample.length} items`)

  // Call Gemini API for extraction with the raw data, requesting tabular format
  const prompt = `
  I'm sending you raw scraped data from an e-commerce website.
  This data contains product information but might be messy or unstructured.
  
  Raw Data Sample:
  ${JSON.stringify(rawDataSample, null, 0)}
  
  Please extract and clean the product information into a structured table format with these columns:
  - Product Name (clean, without duplications or price information)
  - Price
  - Image URL (if available)
  - Remove duplicate products from the table
  
  Format your response as a markdown table:
  
  | Product Name | Price | Image URL |
  | ------------ | ----- | --------- |
  | Product 1    | $X.XX | http://... |
  | Product 2    | $X.XX | http://... |
  ...
  
  Make sure to:
  - Clean product names (remove duplicates, HTML, CSS, price info)
  - Keep only the actual product name
  - Include the price with currency symbol
  - For image URLs, use the exact URL from the data without modification
  - Do not try to convert relative URLs to absolute URLs
`

  try {
    console.log("Calling Gemini API for product data extraction...")

    // Use the more explicit format for Gemini API request
    const response = await fetchWithRetry(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
          },
        }),
      },
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Gemini API error response:", errorText)
      console.log("Falling back to raw data due to Gemini API error")
      return rawData // Return the raw data instead of empty array
    }

    const data = await safeJsonParse(response)
    console.log("Gemini API response received for product data extraction")

    if (
      !data.candidates ||
      !data.candidates[0] ||
      !data.candidates[0].content ||
      !data.candidates[0].content.parts ||
      !data.candidates[0].content.parts[0]
    ) {
      console.error("Unexpected Gemini API response structure:", JSON.stringify(data, null, 2))
      console.log("Falling back to raw data due to unexpected Gemini response")
      return rawData // Return the raw data instead of empty array
    }

    const text = data.candidates[0].content.parts[0].text
    console.log("Gemini response text preview:", text.substring(0, 200) + "...")

    // Extract the table from the response
    const tableRows = text
      .split("\n")
      .map((row) => row.trim())
      .filter(
        (row) => row.startsWith("|") && row.endsWith("|") && !row.includes("---") && !row.includes("Product Name"),
      )

    console.log(`Found ${tableRows.length} product rows in Gemini response`)

    // Process the table rows to extract structured product data
    const structuredProducts = tableRows
      .map((row) => {
        const columns = row
          .split("|")
          .map((col) => col.trim())
          .filter(Boolean)
        if (columns.length >= 3) {
          return {
            name: columns[0],
            price: columns[1],
            imageUrl: columns[2],
            rating: 0,
            reviews: 0,
            url: "",
          }
        }
        return null
      })
      .filter(Boolean)

    console.log(`Extracted ${structuredProducts.length} structured products from Gemini table`)

    // If we got no structured products, return the raw data
    if (structuredProducts.length === 0) {
      console.log("No structured products extracted, falling back to raw data")
      return rawData
    }

    console.log(`Final extraction result: ${structuredProducts.length} structured products`)
    return structuredProducts
  } catch (error) {
    console.error("Error calling Gemini API for product data extraction:", error)
    console.log("Falling back to raw data due to extraction error")
    return rawData // Return the raw data instead of empty array
  }
}

