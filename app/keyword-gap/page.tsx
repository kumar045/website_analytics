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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { analyzeKeywordGap } from "@/app/actions/keyword-gap-action"

export default function KeywordGapPage() {
  const router = useRouter()
  const [mainWebsite, setMainWebsite] = useState("")
  const [competitors, setCompetitors] = useState(["", ""])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState("")
  const [statusLog, setStatusLog] = useState<string[]>([])
  const [analysisStatus, setAnalysisStatus] = useState("")

  const updateCompetitor = (index: number, value: string) => {
    const newCompetitors = [...competitors]
    newCompetitors[index] = value
    setCompetitors(newCompetitors)
  }

  const addCompetitor = () => {
    if (competitors.length < 3) {
      setCompetitors([...competitors, ""])
    }
  }

  const removeCompetitor = (index: number) => {
    if (competitors.length > 1) {
      const newCompetitors = [...competitors]
      newCompetitors.splice(index, 1)
      setCompetitors(newCompetitors)
    }
  }

  const addStatusLog = (message: string) => {
    setStatusLog((prev) => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAnalyzing(true)
    setError("")
    setStatusLog([])
    setAnalysisStatus("Starting keyword gap analysis...")
    addStatusLog("Starting keyword gap analysis")

    try {
      if (!mainWebsite) {
        throw new Error("Please enter your main website URL")
      }

      // Filter out empty competitor URLs
      const validCompetitors = competitors.filter((url) => url.trim() !== "")

      if (validCompetitors.length === 0) {
        throw new Error("Please enter at least one competitor website URL")
      }

      setAnalysisStatus("Validating website URLs...")
      addStatusLog(`Analyzing main website: ${mainWebsite}`)
      addStatusLog(`Analyzing ${validCompetitors.length} competitor websites`)

      setAnalysisStatus("Scraping websites using Apify...")
      addStatusLog("Starting website scraping with Apify")

      // Start the analysis
      const analysisId = await analyzeKeywordGap(mainWebsite, validCompetitors)

      setAnalysisStatus("Analysis complete! Redirecting to results...")
      addStatusLog("Keyword gap analysis completed successfully")
      addStatusLog("Redirecting to results page")

      // Redirect to results page
      router.push(`/keyword-gap/results/${analysisId}`)
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
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Keyword Gap Analysis</h1>
          <p className="text-muted-foreground">Discover keyword opportunities your competitors are ranking for</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analyze Keyword Gap</CardTitle>
          <CardDescription>Compare your website against competitors to find keyword opportunities</CardDescription>
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
                disabled={isAnalyzing}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Competitor Websites</Label>
                {competitors.length < 3 && (
                  <Button type="button" variant="outline" size="sm" onClick={addCompetitor} disabled={isAnalyzing}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Competitor
                  </Button>
                )}
              </div>

              {competitors.map((competitor, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`https://competitor${index + 1}.com`}
                    value={competitor}
                    onChange={(e) => updateCompetitor(index, e.target.value)}
                    disabled={isAnalyzing}
                  />
                  {competitors.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCompetitor(index)}
                      disabled={isAnalyzing}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {error && (
              <Alert variant="destructive">
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
                  Analyzing Keywords...
                </>
              ) : (
                "Find Keyword Opportunities"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          Analysis may take a few minutes depending on website size and complexity
        </CardFooter>
      </Card>
    </div>
  )
}

