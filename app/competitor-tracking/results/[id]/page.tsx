import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Calendar, Download, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { storage } from "@/lib/storage"

type CompetitorChange = {
  url: string
  type: "content" | "design" | "seo" | "performance" | "feature"
  description: string
  impact: "high" | "medium" | "low"
  date: string
}

type CompetitorTrackingResult = {
  id: string
  timestamp: number
  mainWebsite: string
  competitors: string[]
  changes: CompetitorChange[]
  insights: string[]
}

export default async function CompetitorTrackingResultsPage({ params }: { params: { id: string } }) {
  const { id } = params

  // Fetch competitor tracking results from storage
  const trackingResult = await storage.get<CompetitorTrackingResult>(`competitor-tracking:${id}`)

  if (!trackingResult) {
    notFound()
  }

  const { mainWebsite, competitors, changes, insights } = trackingResult

  // Format timestamp
  const date = new Date(trackingResult.timestamp)
  const formattedDate = date.toLocaleString()

  // Group changes by competitor
  const changesByCompetitor = competitors.map((competitor) => ({
    url: competitor,
    changes: changes.filter((change) => change.url === competitor || change.url === `https://${competitor}`),
  }))

  const getChangeTypeColor = (type: "content" | "design" | "seo" | "performance" | "feature") => {
    switch (type) {
      case "content":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200"
      case "design":
        return "bg-purple-100 text-purple-800 hover:bg-purple-200"
      case "seo":
        return "bg-green-100 text-green-800 hover:bg-green-200"
      case "performance":
        return "bg-amber-100 text-amber-800 hover:bg-amber-200"
      case "feature":
        return "bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
    }
  }

  const getImpactColor = (impact: "high" | "medium" | "low") => {
    switch (impact) {
      case "high":
        return "bg-red-100 text-red-800 hover:bg-red-200"
      case "medium":
        return "bg-amber-100 text-amber-800 hover:bg-amber-200"
      case "low":
        return "bg-green-100 text-green-800 hover:bg-green-200"
    }
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Competitor Movement Results</h1>
          <p className="text-muted-foreground">Tracking completed on {formattedDate}</p>
        </div>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link href="/competitor-tracking">
              <ArrowLeft className="mr-2 h-4 w-4" />
              New Tracking
            </Link>
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tracking Summary</CardTitle>
          <CardDescription>
            Competitor movement tracking for {mainWebsite} against {competitors.length} competitor
            {competitors.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium mb-2">Websites Tracked</h3>
              <div className="space-y-2">
                <div className="flex items-center">
                  <Badge className="mr-2">Main</Badge>
                  <a
                    href={mainWebsite.startsWith("http") ? mainWebsite : `https://${mainWebsite}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm flex items-center hover:underline"
                  >
                    {mainWebsite} <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </div>
                {competitors.map((competitor, index) => (
                  <div key={index} className="flex items-center">
                    <Badge variant="outline" className="mr-2">
                      Competitor {index + 1}
                    </Badge>
                    <a
                      href={competitor.startsWith("http") ? competitor : `https://${competitor}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm flex items-center hover:underline"
                    >
                      {competitor} <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-2">Changes Detected</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Total changes detected:</span>
                  <span className="font-medium">{changes.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">High impact changes:</span>
                  <span className="font-medium">{changes.filter((c) => c.impact === "high").length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Content changes:</span>
                  <span className="font-medium">{changes.filter((c) => c.type === "content").length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Feature changes:</span>
                  <span className="font-medium">{changes.filter((c) => c.type === "feature").length}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Strategic Insights</CardTitle>
          <CardDescription>What these competitor changes mean for your business</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {insights.map((insight, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{insight}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {changesByCompetitor.map((competitor, index) => (
        <Card key={index}>
          <CardHeader>
            <CardTitle>
              <a
                href={competitor.url.startsWith("http") ? competitor.url : `https://${competitor.url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center hover:underline"
              >
                {competitor.url} <ExternalLink className="ml-1 h-4 w-4" />
              </a>
            </CardTitle>
            <CardDescription>
              {competitor.changes.length} change{competitor.changes.length !== 1 ? "s" : ""} detected
            </CardDescription>
          </CardHeader>
          <CardContent>
            {competitor.changes.length > 0 ? (
              <div className="space-y-4">
                {competitor.changes.map((change, changeIndex) => (
                  <div key={changeIndex} className="flex items-start gap-4 p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getChangeTypeColor(change.type)}>
                          {change.type.charAt(0).toUpperCase() + change.type.slice(1)}
                        </Badge>
                        <Badge className={getImpactColor(change.impact)}>
                          {change.impact.charAt(0).toUpperCase() + change.impact.slice(1)} Impact
                        </Badge>
                      </div>
                      <p className="font-medium">{change.description}</p>
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {change.date}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-muted-foreground">No changes detected for this competitor</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

