"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { analyzeWebsites } from "@/app/actions/analyze-action"

export default function AnalyzePage() {
  const router = useRouter()
  const [mainWebsite, setMainWebsite] = useState("")
  const [competitors, setCompetitors] = useState(["", "", ""])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisStatus, setAnalysisStatus] = useState("")
  const [error, setError] = useState("")
  const [statusLog, setStatusLog] = useState<string[]>([])

  const updateCompetitor = (index: number, value: string) => {
    const newCompetitors = [...competitors]
    newCompetitors[index] = value
    setCompetitors(newCompetitors)
  }

  const addStatusLog = (message: string) => {
    setStatusLog((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAnalyzing(true)
    setError("")
    setStatusLog([])
    setAnalysisStatus("Starting analysis...")
    addStatusLog("Starting website analysis")

    try {
      if (!mainWebsite) {
        throw new Error("Please enter your main website URL")
      }

      // Filter out empty competitor URLs
      const validCompetitors = competitors.filter((url) => url.trim() !== "")

      setAnalysisStatus("Validating website URLs...")
      addStatusLog(`Analyzing main website: ${mainWebsite}`)
      if (validCompetitors.length > 0) {
        addStatusLog(`Analyzing ${validCompetitors.length} competitor websites`)
      } else {
        addStatusLog("No competitor websites specified")
      }

      setAnalysisStatus("Scraping websites using Apify...")
      addStatusLog("Starting website scraping with Apify")

      // Start the analysis
      const analysisId = await analyzeWebsites(mainWebsite, validCompetitors)

      setAnalysisStatus("Analysis complete! Redirecting to results...")
      addStatusLog("Analysis completed successfully")
      addStatusLog("Redirecting to results page")

      // Redirect to results page
      router.push(`/results/${analysisId}`)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred during analysis"
      setError(errorMessage)
      setIsAnalyzing(false)
      setAnalysisStatus("")
      addStatusLog(`Error: ${errorMessage}`)

      // If the error is related to a specific website, provide more helpful guidance
      if (errorMessage.includes("scraping website")) {
        addStatusLog("Try again with a different website or check if the website is accessible")
      }
    }
  }

  return (
    <div className="container mx-auto py-10">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Website Analysis</CardTitle>
          <CardDescription>Enter your website URL and up to three competitor websites to analyze</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="main-website">Your Website URL</Label>
              <Input
                id="main-website"
                placeholder="https://example.com"
                value={mainWebsite}
                onChange={(e) => setMainWebsite(e.target.value)}
                required
                disabled={isAnalyzing}
              />
            </div>

            <div className="space-y-4">
              <Label>Competitor Websites (Optional)</Label>
              {competitors.map((competitor, index) => (
                <Input
                  key={index}
                  placeholder={`https://competitor${index + 1}.com`}
                  value={competitor}
                  onChange={(e) => updateCompetitor(index, e.target.value)}
                  disabled={isAnalyzing}
                />
              ))}
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isAnalyzing && (
              <div className="space-y-4">
                <div className="flex items-center justify-center p-4 bg-primary/10 rounded-md">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                  <p className="text-sm font-medium text-primary">{analysisStatus}</p>
                </div>

                <div className="bg-muted p-4 rounded-md max-h-40 overflow-y-auto">
                  <p className="text-xs font-medium mb-2">Analysis Log:</p>
                  <ul className="space-y-1">
                    {statusLog.map((log, index) => (
                      <li key={index} className="text-xs text-muted-foreground">
                        {log}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Start Analysis"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col text-sm text-gray-500 space-y-2">
          <p>Analysis may take a few minutes depending on website size</p>
          <p className="text-xs">For best results, use complete website URLs including https://</p>
        </CardFooter>
      </Card>
    </div>
  )
}

