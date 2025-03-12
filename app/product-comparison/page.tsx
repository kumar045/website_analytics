"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState } from "react"
import { runProductComparison } from "../actions/product-comparison-action"
import { useRouter } from "next/navigation"

export default function ProductComparisonPage() {
  const router = useRouter()
  const [website, setWebsite] = useState<string>("")
  const [category, setCategory] = useState<string>("")
  const [customWebsite, setCustomWebsite] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsSubmitting(true)

    const form = e.currentTarget
    const formData = new FormData(form)

    // If custom website is selected, use the custom website value
    if (website === "custom" && customWebsite) {
      formData.set("website", customWebsite)
    }

    try {
      // Get the ID from the server action instead of letting it redirect
      const id = await runProductComparison(formData)

      // Handle the redirect on the client side
      router.push(`/product-comparison/results/${id}`)
    } catch (error) {
      console.error("Error running product comparison:", error)
      setError(error instanceof Error ? error.message : "An unexpected error occurred")
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Product Comparison</h1>
          <p className="text-muted-foreground mt-2">
            Compare products across e-commerce websites to gain competitive insights
          </p>
        </div>

        {error && (
          <div className="bg-destructive/15 text-destructive p-4 rounded-md">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Product Comparison Settings</CardTitle>
            <CardDescription>Select an e-commerce website and product category to analyze</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="website">E-commerce Website</Label>
                  <Select value={website} onValueChange={setWebsite} required>
                    <SelectTrigger id="website" name="website">
                      <SelectValue placeholder="Select a website" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amazon">Amazon</SelectItem>
                      <SelectItem value="flipkart">Flipkart</SelectItem>
                      <SelectItem value="ajio">Ajio</SelectItem>
                      <SelectItem value="nykaa">Nykaa</SelectItem>
                      <SelectItem value="custom">Custom Website</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {website === "custom" && (
                  <div>
                    <Label htmlFor="customWebsite">Custom Website URL or Name</Label>
                    <Input
                      id="customWebsite"
                      placeholder="e.g., bestbuy.com"
                      value={customWebsite}
                      onChange={(e) => setCustomWebsite(e.target.value)}
                      required={website === "custom"}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Enter a domain name (e.g., bestbuy.com) or brand name
                    </p>
                  </div>
                )}

                <div>
                  <Label htmlFor="category">Product Category (Optional)</Label>
                  <Input
                    id="category"
                    name="category"
                    placeholder="e.g., smartphones, laptops, headphones"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground mt-1">Leave empty to analyze the main page</p>
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Analyzing..." : "Compare Products"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2">
              <li>Select an e-commerce website or enter a custom website</li>
              <li>Enter a product category you want to analyze</li>
              <li>Our system will scrape product data from the selected website</li>
              <li>AI analysis will identify top products, price ranges, and competitive insights</li>
              <li>Use the insights to optimize your product strategy and pricing</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

