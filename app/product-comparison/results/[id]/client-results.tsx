"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Star } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { ProductComparisonResult } from "@/app/actions/product-comparison-action"

// Helper function to safely format numbers
function safeNumberFormat(value: any, decimals = 2): string {
  if (typeof value !== "number" || isNaN(value)) {
    return "0.00"
  }
  return value.toFixed(decimals)
}

// Helper function to clean HTML/CSS artifacts from product names
function cleanHtmlFromName(name: string): string {
  if (!name) return ""

  // First, remove HTML tags and CSS
  let cleanedName = name
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/\.css-[^{]*\{[^}]*\}/g, "") // Remove CSS class definitions
    .replace(/html\{[^}]*\}/g, "") // Remove HTML style blocks
    .replace(/-webkit-[^:]+:[^;]+;/g, "") // Remove webkit prefixed styles
    .replace(/[.#][a-zA-Z0-9_-]+\s*\{[^}]*\}/g, "") // Remove CSS selectors
    .replace(/style="[^"]*"/g, "") // Remove style attributes
    .replace(/class="[^"]*"/g, "") // Remove class attributes
    .trim()

  // Remove duplicate product names (common in scraped data)
  // This pattern looks for repeated text
  const duplicatePattern = /^(.+?)\s+\1/
  while (duplicatePattern.test(cleanedName)) {
    cleanedName = cleanedName.replace(duplicatePattern, "$1")
  }

  // Remove price information from product name
  cleanedName = cleanedName
    .replace(/Regular price\s+Rs\.\s+[\d,.]+/g, "")
    .replace(/Sale price\s+Rs\.\s+[\d,.]+/g, "")
    .replace(/Unit price\s+\/\s+/g, "")
    .replace(/-\d+%/g, "") // Remove discount percentages
    .replace(/Rs\.\s+[\d,.]+/g, "") // Remove price mentions
    .trim()

  // If the name is too long, truncate it
  if (cleanedName.length > 100) {
    cleanedName = cleanedName.substring(0, 100).trim() + "..."
  }

  return cleanedName
}

// Update the cleanProductData function to better handle image URLs
function cleanProductData(product: any) {
  if (!product) return null

  // Clean the product name
  const cleanedName = cleanHtmlFromName(product.name || "")

  // If after cleaning, the name is empty or too short, try to use the original name
  // or return null if that's also not available
  if (!cleanedName || cleanedName.length < 3) {
    if (product.name && product.name.length >= 3) {
      return {
        ...product,
        name: product.name,
        price: product.price || "Price not available",
        reviews: typeof product.reviews === "number" ? product.reviews : 0,
        rating: typeof product.rating === "number" ? Math.min(5, Math.max(0, product.rating)) : 0,
        url: product.url || "",
        imageUrl: product.imageUrl || "",
      }
    }
    return null
  }

  // Handle price formatting
  let price = product.price || ""
  // If price doesn't have a currency symbol, add one
  if (price && !price.match(/[$₹€£¥]/)) {
    price = `₹${price}`
  }

  // Preserve the original image URL without modification
  const imageUrl = product.imageUrl || ""

  return {
    ...product,
    name: cleanedName,
    price: price || "Price not available",
    reviews: typeof product.reviews === "number" ? product.reviews : 0,
    rating: typeof product.rating === "number" ? Math.min(5, Math.max(0, product.rating)) : 0,
    url: product.url || "",
    imageUrl: imageUrl,
  }
}

interface ClientResultsProps {
  initialData: ProductComparisonResult
}

export default function ClientResults({ initialData }: ClientResultsProps) {
  // Apply client-side cleaning to the initial data
  const cleanedInitialData = {
    ...initialData,
    products: Array.isArray(initialData.products) ? initialData.products.map(cleanProductData).filter(Boolean) : [],
    analysis: initialData.analysis
      ? {
          ...initialData.analysis,
          topRatedProducts: Array.isArray(initialData.analysis.topRatedProducts)
            ? initialData.analysis.topRatedProducts.map(cleanProductData).filter(Boolean)
            : [],
          mostReviewedProducts: Array.isArray(initialData.analysis.mostReviewedProducts)
            ? initialData.analysis.mostReviewedProducts.map(cleanProductData).filter(Boolean)
            : [],
          priceRanges: initialData.analysis.priceRanges || { min: 0, max: 0, average: 0 },
          recommendations: Array.isArray(initialData.analysis.recommendations)
            ? initialData.analysis.recommendations
            : [],
        }
      : null,
  }

  const [result, setResult] = useState<ProductComparisonResult>(cleanedInitialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { website, category, date, status, products } = result

  console.log(`Rendering ${products.length} products in client component`)

  // Log image URLs for debugging
  if (products.length > 0) {
    console.log("Sample image URLs from first 5 products:")
    products.slice(0, 5).forEach((product, index) => {
      console.log(`Product ${index + 1} image URL: ${product.imageUrl || "none"}`)
    })
  }

  const formattedDate = new Date(date).toLocaleString()
  const timeAgo = formatDistanceToNow(new Date(date), { addSuffix: true })

  // Function to fetch the latest data
  const fetchLatestData = async () => {
    if (status === "completed" || status === "failed") return

    setLoading(true)
    try {
      const response = await fetch(`/api/product-comparison/${result.id}`)
      if (!response.ok) {
        throw new Error("Failed to fetch latest data")
      }
      const data = await response.json()

      // Apply client-side cleaning to the fetched data
      const cleanedData = {
        ...data,
        products: Array.isArray(data.products) ? data.products.map(cleanProductData).filter(Boolean) : [],
        analysis: data.analysis
          ? {
              ...data.analysis,
              topRatedProducts: Array.isArray(data.analysis.topRatedProducts)
                ? data.analysis.topRatedProducts.map(cleanProductData).filter(Boolean)
                : [],
              mostReviewedProducts: Array.isArray(data.analysis.mostReviewedProducts)
                ? data.analysis.mostReviewedProducts.map(cleanProductData).filter(Boolean)
                : [],
              priceRanges: data.analysis.priceRanges || { min: 0, max: 0, average: 0 },
              recommendations: Array.isArray(data.analysis.recommendations) ? data.analysis.recommendations : [],
            }
          : null,
      }

      // Update state with cleaned data
      setResult(cleanedData)
      console.log("Fetched and cleaned latest data:", data.status)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      console.error("Error fetching latest data:", err)
    } finally {
      setLoading(false)
    }
  }

  // Poll for updates if the analysis is still running
  useEffect(() => {
    if (status !== "completed" && status !== "failed") {
      const interval = setInterval(() => {
        console.log("Polling for updates...")
        fetchLatestData()
      }, 5000) // Poll every 5 seconds

      return () => clearInterval(interval)
    }
  }, [status])

  // Manual refresh button handler
  const handleRefresh = () => {
    fetchLatestData()
  }

  const isRunning = status !== "completed" && status !== "failed"

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Comparison Results</h1>
          <p className="text-muted-foreground mt-1">
            Analysis for {category ? `${category} products on ` : ""}
            {website}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">{formattedDate}</p>
          <p className="text-sm text-muted-foreground">({timeAgo})</p>
        </div>
      </div>

      {isRunning && (
        <Alert className="bg-primary/10 border-primary/20">
          <div className="flex items-center">
            <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
            <AlertTitle className="text-primary">Analysis in Progress</AlertTitle>
          </div>
          <AlertDescription className="pl-6">
            <p className="mb-2">Your product comparison is currently being processed. This may take a few minutes.</p>
            <p className="text-sm text-muted-foreground mb-4">Status: {status}</p>
            <div className="flex items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                className="flex items-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Check for updates
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground ml-4">Automatically checking for updates every 5 seconds</p>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {status === "failed" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {result.error || "An error occurred while processing your product comparison."}
          </AlertDescription>
        </Alert>
      )}

      {status === "completed" && (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="products">All Products ({products.length})</TabsTrigger>
            <TabsTrigger value="top-rated">Top Rated</TabsTrigger>
            <TabsTrigger value="most-reviewed">Most Reviewed</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Products Found</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{products.length}</div>
                  <p className="text-sm text-muted-foreground">Total products analyzed from {website}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Price Range</CardTitle>
                </CardHeader>
                <CardContent>
                  {result.analysis?.priceRanges ? (
                    <>
                      <div className="text-3xl font-bold">
                        ₹{safeNumberFormat(result.analysis.priceRanges.min)} - ₹
                        {safeNumberFormat(result.analysis.priceRanges.max)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Average: ₹{safeNumberFormat(result.analysis.priceRanges.average)}
                      </p>
                    </>
                  ) : (
                    <div className="text-muted-foreground">No price data available</div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Top Product</CardTitle>
                </CardHeader>
                <CardContent>
                  {result.analysis?.topRatedProducts && result.analysis.topRatedProducts.length > 0 ? (
                    <>
                      <div className="text-lg font-medium line-clamp-1">{result.analysis.topRatedProducts[0].name}</div>
                      <div className="flex items-center mt-1">
                        <Star className="h-4 w-4 text-yellow-500 mr-1" />
                        <span className="font-medium">{result.analysis.topRatedProducts[0].rating}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({result.analysis.topRatedProducts[0].reviews} reviews)
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-muted-foreground">No top product data available</div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
                <CardDescription>AI-generated recommendations based on product analysis</CardDescription>
              </CardHeader>
              <CardContent>
                {result.analysis?.recommendations && result.analysis.recommendations.length > 0 ? (
                  <ul className="space-y-2">
                    {result.analysis.recommendations.map((recommendation, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                        <span>{recommendation}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-muted-foreground">No recommendations available</div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>All Products</CardTitle>
                <CardDescription>
                  Complete list of {products.length} products found {category ? `for ${category}` : ""} on {website}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {products && products.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {products.map((product, index) => (
                      <Card key={index} className="overflow-hidden">
                        <div className="aspect-video relative bg-muted">
                          {/* Direct img tag instead of Image component */}
                          {product.imageUrl ? (
                            <div className="w-full h-full flex items-center justify-center">
                              <img
                                src={product.imageUrl || "/placeholder.svg"}
                                alt={product.name || "Product"}
                                className="max-h-full max-w-full object-contain"
                                onError={(e) => {
                                  // If image fails to load, replace with placeholder
                                  const target = e.target as HTMLImageElement
                                  target.onerror = null // Prevent infinite error loop
                                  target.src = "/placeholder.svg"
                                }}
                              />
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                              <span className="text-muted-foreground text-sm text-center px-4">No image</span>
                            </div>
                          )}
                        </div>
                        <CardContent className="p-4">
                          <h3 className="font-medium line-clamp-2 h-12">{product.name}</h3>
                          <div className="flex justify-between items-center mt-2">
                            <div className="font-bold">{product.price}</div>
                            {product.rating > 0 && (
                              <div className="flex items-center">
                                <Star className="h-4 w-4 text-yellow-500 mr-1" />
                                <span>{product.rating}</span>
                              </div>
                            )}
                          </div>
                          {product.reviews > 0 && (
                            <div className="text-sm text-muted-foreground mt-1">{product.reviews} reviews</div>
                          )}
                          {product.url && (
                            <div className="mt-3">
                              <a
                                href={product.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 hover:underline"
                              >
                                View product
                              </a>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">No products found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="top-rated" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Rated Products</CardTitle>
                <CardDescription>Products with the highest customer ratings</CardDescription>
              </CardHeader>
              <CardContent>
                {result.analysis?.topRatedProducts && result.analysis.topRatedProducts.length > 0 ? (
                  <div className="space-y-6">
                    {result.analysis.topRatedProducts.map((product, index) => (
                      <div key={index} className="flex items-start space-x-4">
                        <div className="w-16 h-16 relative bg-muted flex-shrink-0">
                          {/* Direct img tag for top rated products */}
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl || "/placeholder.svg"}
                              alt={product.name || "Product"}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.onerror = null
                                target.src = "/placeholder.svg"
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                              <span className="text-muted-foreground text-xs">No image</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center">
                            <Badge variant="outline" className="mr-2">
                              #{index + 1}
                            </Badge>
                            <h3 className="font-medium">{product.name}</h3>
                          </div>
                          <div className="flex items-center mt-1">
                            <Star className="h-4 w-4 text-yellow-500 mr-1" />
                            <span className="font-bold">{product.rating}</span>
                            <span className="text-sm text-muted-foreground ml-2">({product.reviews} reviews)</span>
                            <span className="ml-auto font-medium">{product.price}</span>
                          </div>
                          {product.url && (
                            <a
                              href={product.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                            >
                              View product
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">No top rated products found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="most-reviewed" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Most Reviewed Products</CardTitle>
                <CardDescription>Products with the highest number of customer reviews</CardDescription>
              </CardHeader>
              <CardContent>
                {result.analysis?.mostReviewedProducts && result.analysis.mostReviewedProducts.length > 0 ? (
                  <div className="space-y-6">
                    {result.analysis.mostReviewedProducts.map((product, index) => (
                      <div key={index} className="flex items-start space-x-4">
                        <div className="w-16 h-16 relative bg-muted flex-shrink-0">
                          {/* Direct img tag for most reviewed products */}
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl || "/placeholder.svg"}
                              alt={product.name || "Product"}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.onerror = null
                                target.src = "/placeholder.svg"
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                              <span className="text-muted-foreground text-xs">No image</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center">
                            <Badge variant="outline" className="mr-2">
                              #{index + 1}
                            </Badge>
                            <h3 className="font-medium">{product.name}</h3>
                          </div>
                          <div className="flex items-center mt-1">
                            <span className="font-bold">{product.reviews} reviews</span>
                            <div className="flex items-center ml-2">
                              <Star className="h-4 w-4 text-yellow-500 mr-1" />
                              <span>{product.rating}</span>
                            </div>
                            <span className="ml-auto font-medium">{product.price}</span>
                          </div>
                          {product.url && (
                            <a
                              href={product.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline mt-1 inline-block"
                            >
                              View product
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">No reviewed products found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recommendations" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Strategic Recommendations</CardTitle>
                <CardDescription>
                  AI-generated insights to help you compete in the {category || "product"} market
                </CardDescription>
              </CardHeader>
              <CardContent>
                {result.analysis?.recommendations && result.analysis.recommendations.length > 0 ? (
                  <div className="space-y-6">
                    {result.analysis.recommendations.map((recommendation, index) => (
                      <Card key={index}>
                        <CardContent className="pt-6">
                          <div className="flex items-start">
                            <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{recommendation}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <p className="text-muted-foreground">No recommendations available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

