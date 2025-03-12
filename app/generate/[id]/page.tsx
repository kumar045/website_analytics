"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Check, Copy, Loader2, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { generateContent } from "@/app/actions/generate-action"

type AnalysisResult = {
  id: string
  timestamp: number
  mainWebsite: {
    url: string
    title: string
    description: string
    keywords: string[]
    lastScraped?: number
  }
  competitors: Array<{
    url: string
    title: string
    description: string
    keywords: string[]
  }>
  comparison: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    threats: string[]
  }
}

type GeneratedContent = {
  metaTitle: string
  metaDescription: string
  keywords: string[]
  pageContent: string
}

export default function GenerateContentPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const { id } = params

  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState<Record<string, boolean>>({})
  const [lastScraped, setLastScraped] = useState<string>("")

  useEffect(() => {
    async function fetchAnalysisResult() {
      try {
        const response = await fetch(`/api/analysis/${id}`)

        if (!response.ok) {
          throw new Error("Failed to fetch analysis result")
        }

        const data = await response.json()
        setAnalysisResult(data)

        // Set the last scraped time
        const scrapedTime = data.mainWebsite.lastScraped || data.timestamp
        setLastScraped(new Date(scrapedTime).toLocaleString())
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalysisResult()
  }, [id])

  const handleGenerateContent = async () => {
    if (!analysisResult) return

    setIsGenerating(true)
    setError("")

    try {
      const content = await generateContent(id)
      setGeneratedContent(content)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate content")
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied({ ...copied, [key]: true })
    setTimeout(() => {
      setCopied({ ...copied, [key]: false })
    }, 2000)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-10 flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading analysis data...</p>
        </div>
      </div>
    )
  }

  if (error && !analysisResult) {
    return (
      <div className="container mx-auto py-10">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>Failed to load analysis data</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-red-500">{error}</p>
          </CardContent>
          <CardFooter>
            <Button asChild>
              <Link href="/analyze">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Analysis
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Generation</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-muted-foreground">
              Generate optimized content based on analysis of {analysisResult?.mainWebsite.url}
            </p>
            <Badge variant="outline" className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              <span className="text-xs">Data scraped: {lastScraped}</span>
            </Badge>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href={`/results/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Results
          </Link>
        </Button>
      </div>

      {!generatedContent ? (
        <Card>
          <CardHeader>
            <CardTitle>Generate Website Content</CardTitle>
            <CardDescription>
              Create SEO-optimized content based on fresh website data scraped at {lastScraped}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-primary/10 border-primary/20">
              <RefreshCw className="h-4 w-4 text-primary" />
              <AlertTitle className="text-primary">Fresh Data Analysis</AlertTitle>
              <AlertDescription>
                Content will be generated using the actual data scraped from your website and competitors, not from
                outdated information.
              </AlertDescription>
            </Alert>

            <p>Using the fresh analysis of your website and competitors, we'll generate optimized content including:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>SEO-friendly meta title based on your actual website content</li>
              <li>Compelling meta description derived from your website's purpose</li>
              <li>Targeted keywords extracted from your website and competitor analysis</li>
              <li>Page content that addresses your website's specific weaknesses and opportunities</li>
            </ul>

            {error && <p className="text-sm font-medium text-red-500">{error}</p>}
          </CardContent>
          <CardFooter>
            <Button onClick={handleGenerateContent} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Content from Fresh Data...
                </>
              ) : (
                "Generate Content from Fresh Data"
              )}
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <Tabs defaultValue="meta">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="meta">Meta Information</TabsTrigger>
            <TabsTrigger value="keywords">Keywords</TabsTrigger>
            <TabsTrigger value="content">Page Content</TabsTrigger>
          </TabsList>

          <TabsContent value="meta" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Meta Title</CardTitle>
                <CardDescription>Optimized title tag for your website (50-60 characters)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Textarea value={generatedContent.metaTitle} readOnly className="min-h-[80px] pr-10" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2"
                    onClick={() => copyToClipboard(generatedContent.metaTitle, "title")}
                  >
                    {copied.title ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span className="sr-only">Copy</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{generatedContent.metaTitle.length} characters</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Meta Description</CardTitle>
                <CardDescription>Compelling description for search results (150-160 characters)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Textarea value={generatedContent.metaDescription} readOnly className="min-h-[120px] pr-10" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2"
                    onClick={() => copyToClipboard(generatedContent.metaDescription, "description")}
                  >
                    {copied.description ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span className="sr-only">Copy</span>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {generatedContent.metaDescription.length} characters
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keywords" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Optimized Keywords</CardTitle>
                <CardDescription>
                  Recommended keywords based on fresh website data and competitor research
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {generatedContent.keywords.map((keyword, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex gap-2"
                    onClick={() => copyToClipboard(generatedContent.keywords.join(", "), "keywords")}
                  >
                    {copied.keywords ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    Copy All Keywords
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Generated Page Content</CardTitle>
                <CardDescription>SEO-optimized content based on fresh website data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Textarea value={generatedContent.pageContent} readOnly className="min-h-[400px] pr-10" />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-2"
                    onClick={() => copyToClipboard(generatedContent.pageContent, "content")}
                  >
                    {copied.content ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    <span className="sr-only">Copy</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

