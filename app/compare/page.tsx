"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { analyzeWebsites } from "@/app/actions/analyze-action"

export default function ComparePage() {
  const router = useRouter()
  const [websites, setWebsites] = useState(["", ""])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState("")

  const updateWebsite = (index: number, value: string) => {
    const newWebsites = [...websites]
    newWebsites[index] = value
    setWebsites(newWebsites)
  }

  const addWebsite = () => {
    if (websites.length < 5) {
      setWebsites([...websites, ""])
    }
  }

  const removeWebsite = (index: number) => {
    if (websites.length > 2) {
      const newWebsites = [...websites]
      newWebsites.splice(index, 1)
      setWebsites(newWebsites)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAnalyzing(true)
    setError("")

    try {
      // Validate that at least two websites are provided
      const validWebsites = websites.filter((url) => url.trim() !== "")

      if (validWebsites.length < 2) {
        throw new Error("Please enter at least two websites to compare")
      }

      // Use the first website as the main one and the rest as competitors
      const mainWebsite = validWebsites[0]
      const competitors = validWebsites.slice(1)

      // Start the analysis
      const analysisId = await analyzeWebsites(mainWebsite, competitors)

      // Redirect to results page
      router.push(`/results/${analysisId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during analysis")
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center mb-6">
        <Button asChild variant="outline" size="icon" className="mr-4">
          <Link href="/">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Compare Websites</h1>
      </div>

      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Website Comparison</CardTitle>
          <CardDescription>Enter multiple websites to compare their content and SEO factors</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {websites.map((website, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Label htmlFor={`website-${index}`} className="sr-only">
                      {index === 0 ? "Main Website" : `Website ${index + 1}`}
                    </Label>
                    <Input
                      id={`website-${index}`}
                      placeholder={index === 0 ? "Main Website URL" : `Website ${index + 1} URL`}
                      value={website}
                      onChange={(e) => updateWebsite(index, e.target.value)}
                      required
                    />
                  </div>
                  {websites.length > 2 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeWebsite(index)}>
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {websites.length < 5 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex items-center gap-1"
                onClick={addWebsite}
              >
                <Plus className="h-4 w-4" />
                Add Website
              </Button>
            )}

            {error && <p className="text-sm font-medium text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Compare Websites"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-gray-500">
          The first website will be considered the main one for comparison
        </CardFooter>
      </Card>
    </div>
  )
}

