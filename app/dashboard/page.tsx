import Link from "next/link"
import { ArrowRight, BarChart2, FileText, Search, Zap, Code, Activity } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { storage } from "@/lib/storage"

type AnalysisResult = {
  id: string
  timestamp: number
  mainWebsite: {
    url: string
  }
}

export default async function DashboardPage() {
  // Fetch recent analyses from storage
  const keys = await storage.keys("analysis:")
  const recentAnalyses: AnalysisResult[] = []

  if (keys.length > 0) {
    const analysisData = await Promise.all(
      keys.slice(0, 10).map(async (key) => {
        const data = await storage.get<AnalysisResult>(key)
        return data
      }),
    )

    recentAnalyses.push(...(analysisData.filter(Boolean) as AnalysisResult[]))
  }

  // Sort by timestamp (most recent first)
  recentAnalyses.sort((a, b) => b.timestamp - a.timestamp)

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link href="/analyze">
              <Search className="mr-2 h-4 w-4" />
              New Analysis
            </Link>
          </Button>
          <Button asChild>
            <Link href="/compare">
              <BarChart2 className="mr-2 h-4 w-4" />
              Compare Sites
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Analyses</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentAnalyses.length}</div>
            <p className="text-xs text-muted-foreground">Website analyses performed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Websites Analyzed</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{new Set(recentAnalyses.map((a) => a.mainWebsite.url)).size}</div>
            <p className="text-xs text-muted-foreground">Unique websites analyzed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Content Generated</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Content generation reports</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Keyword Gap Analysis</CardTitle>
            <CardDescription>Find keyword opportunities your competitors are ranking for</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <p className="text-sm">Discover untapped keyword opportunities</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/keyword-gap">
                Start Keyword Analysis
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Technical SEO Audit</CardTitle>
            <CardDescription>Analyze your website for technical SEO issues</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-4">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-blue-500" />
              <p className="text-sm">Identify and fix technical SEO problems</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/seo-audit">
                Run SEO Audit
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Competitor Tracking</CardTitle>
            <CardDescription>Monitor changes on competitor websites</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              <p className="text-sm">Stay ahead of competitor movements</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/competitor-tracking">
                Track Competitors
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Analyses</CardTitle>
          <CardDescription>Your most recent website analyses</CardDescription>
        </CardHeader>
        <CardContent>
          {recentAnalyses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Website</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentAnalyses.map((analysis) => (
                  <TableRow key={analysis.id}>
                    <TableCell className="font-medium">{analysis.mainWebsite.url}</TableCell>
                    <TableCell>{new Date(analysis.timestamp).toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/results/${analysis.id}`}>
                          View Results
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-muted-foreground mb-4">No analyses found</p>
              <Button asChild>
                <Link href="/analyze">Start Your First Analysis</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

