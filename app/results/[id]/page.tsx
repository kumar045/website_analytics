import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { storage } from "@/lib/storage"

type AnalysisResult = {
  id: string
  timestamp: number
  mainWebsite: {
    url: string
    title: string
    description: string
    keywords: string[]
    headings: string[]
    content: string
  }
  competitors: Array<{
    url: string
    title: string
    description: string
    keywords: string[]
    headings: string[]
    content: string
  }>
  comparison: {
    strengths: string[]
    weaknesses: string[]
    opportunities: string[]
    threats: string[]
  }
}

export default async function ResultsPage({ params }: { params: { id: string } }) {
  const { id } = params

  // Fetch analysis results from our custom storage
  const analysisResult = await storage.get<AnalysisResult>(`analysis:${id}`)

  if (!analysisResult) {
    notFound()
  }

  const { mainWebsite, competitors, comparison } = analysisResult

  // Format timestamp
  const date = new Date(analysisResult.timestamp)
  const formattedDate = date.toLocaleString()

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analysis Results</h1>
          <p className="text-muted-foreground">Analysis completed on {formattedDate}</p>
        </div>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link href="/analyze">
              <ArrowLeft className="mr-2 h-4 w-4" />
              New Analysis
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/generate/${id}`}>Generate Content</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="main-website">Main Website</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="swot">SWOT Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Analysis Summary</CardTitle>
              <CardDescription>
                Overview of the analysis between {mainWebsite.url} and {competitors.length} competitor
                {competitors.length !== 1 ? "s" : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-lg font-medium mb-2">Main Website</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    <a
                      href={mainWebsite.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center hover:underline"
                    >
                      {mainWebsite.url} <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </p>
                  <p className="text-sm font-medium">Title:</p>
                  <p className="text-sm mb-2">{mainWebsite.title}</p>
                  <p className="text-sm font-medium">Description:</p>
                  <p className="text-sm">{mainWebsite.description}</p>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Key Findings</h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">Top Strength:</span>{" "}
                      {comparison.strengths[0] || "No strengths identified"}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Main Weakness:</span>{" "}
                      {comparison.weaknesses[0] || "No weaknesses identified"}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Key Opportunity:</span>{" "}
                      {comparison.opportunities[0] || "No opportunities identified"}
                    </p>
                    <p className="text-sm">
                      <span className="font-medium">Primary Threat:</span>{" "}
                      {comparison.threats[0] || "No threats identified"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Keywords Comparison</CardTitle>
                <CardDescription>Keywords used by your website vs. competitors</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Your Keywords:</h4>
                    <div className="flex flex-wrap gap-2">
                      {mainWebsite.keywords.length > 0 ? (
                        mainWebsite.keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20"
                          >
                            {keyword}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No keywords found</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-1">Competitor Keywords:</h4>
                    <div className="flex flex-wrap gap-2">
                      {competitors.flatMap((comp) => comp.keywords).length > 0 ? (
                        [...new Set(competitors.flatMap((comp) => comp.keywords))]
                          .slice(0, 10)
                          .map((keyword, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs font-medium text-muted-foreground ring-1 ring-inset ring-muted-foreground/20"
                            >
                              {keyword}
                            </span>
                          ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No competitor keywords found</p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Length</CardTitle>
                <CardDescription>Comparison of content length between websites</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-medium">Your Website:</h4>
                      <span className="text-sm">{mainWebsite.content.length} characters</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5">
                      <div className="bg-primary h-2.5 rounded-full" style={{ width: "100%" }}></div>
                    </div>
                  </div>

                  {competitors.map((competitor, index) => (
                    <div key={index}>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium truncate max-w-[200px]">{competitor.url}:</h4>
                        <span className="text-sm">{competitor.content.length} characters</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div
                          className="bg-secondary h-2.5 rounded-full"
                          style={{
                            width: `${Math.min(100, (competitor.content.length / Math.max(1, mainWebsite.content.length)) * 100)}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="main-website" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{mainWebsite.title || "Main Website"}</CardTitle>
              <CardDescription>
                <a
                  href={mainWebsite.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center hover:underline"
                >
                  {mainWebsite.url} <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Metadata</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm font-medium">Title:</p>
                    <p className="text-sm mb-2">{mainWebsite.title}</p>
                    <p className="text-sm font-medium">Description:</p>
                    <p className="text-sm">{mainWebsite.description}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Keywords:</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {mainWebsite.keywords.length > 0 ? (
                        mainWebsite.keywords.map((keyword, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-1 ring-inset ring-primary/20"
                          >
                            {keyword}
                          </span>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No keywords found</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitors" className="space-y-6">
          {competitors.length > 0 ? (
            competitors.map((competitor, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>{competitor.title || `Competitor ${index + 1}`}</CardTitle>
                  <CardDescription>
                    <a
                      href={competitor.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center hover:underline"
                    >
                      {competitor.url} <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-2">Metadata</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm font-medium">Title:</p>
                        <p className="text-sm mb-2">{competitor.title}</p>
                        <p className="text-sm font-medium">Description:</p>
                        <p className="text-sm">{competitor.description}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Keywords:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {competitor.keywords.length > 0 ? (
                            competitor.keywords.map((keyword, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center rounded-md bg-secondary/10 px-2 py-1 text-xs font-medium text-secondary ring-1 ring-inset ring-secondary/20"
                              >
                                {keyword}
                              </span>
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">No keywords found</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No Competitors</CardTitle>
                <CardDescription>No competitor websites were analyzed</CardDescription>
              </CardHeader>
              <CardContent>
                <p>Try running a new analysis with competitor websites to see comparison data.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="swot" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>SWOT Analysis</CardTitle>
              <CardDescription>
                Strengths, Weaknesses, Opportunities, and Threats analysis for {mainWebsite.url}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-green-600 mb-2">Strengths</h3>
                  {comparison.strengths.length > 0 ? (
                    <ul className="space-y-2">
                      {comparison.strengths.map((strength, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <span className="text-green-600 mt-0.5">•</span>
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No strengths identified</p>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-red-600 mb-2">Weaknesses</h3>
                  {comparison.weaknesses.length > 0 ? (
                    <ul className="space-y-2">
                      {comparison.weaknesses.map((weakness, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <span className="text-red-600 mt-0.5">•</span>
                          <span>{weakness}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No weaknesses identified</p>
                  )}
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-blue-600 mb-2">Opportunities</h3>
                  {comparison.opportunities.length > 0 ? (
                    <ul className="space-y-2">
                      {comparison.opportunities.map((opportunity, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <span className="text-blue-600 mt-0.5">•</span>
                          <span>{opportunity}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No opportunities identified</p>
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-amber-600 mb-2">Threats</h3>
                  {comparison.threats.length > 0 ? (
                    <ul className="space-y-2">
                      {comparison.threats.map((threat, index) => (
                        <li key={index} className="text-sm flex items-start gap-2">
                          <span className="text-amber-600 mt-0.5">•</span>
                          <span>{threat}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No threats identified</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

