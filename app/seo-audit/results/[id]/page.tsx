import { notFound } from "next/navigation"
import Link from "next/link"
import { AlertCircle, AlertTriangle, ArrowLeft, Download, ExternalLink, Info } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { storage } from "@/lib/storage"

type SEOIssue = {
  type: "critical" | "warning" | "info"
  title: string
  description: string
  impact: string
  recommendation: string
}

type SEOAuditResult = {
  id: string
  timestamp: number
  url: string
  performance: {
    score: number
    loadTime: number
    firstContentfulPaint: number
    largestContentfulPaint: number
    cumulativeLayoutShift: number
  }
  seo: {
    score: number
    metaTagsScore: number
    contentScore: number
    mobileScore: number
    securityScore: number
  }
  issues: SEOIssue[]
}

export default async function SEOAuditResultsPage({ params }: { params: { id: string } }) {
  const { id } = params

  // Fetch SEO audit results from storage
  const auditResult = await storage.get<SEOAuditResult>(`seo-audit:${id}`)

  if (!auditResult) {
    notFound()
  }

  const { url, performance, seo, issues } = auditResult

  // Format timestamp
  const date = new Date(auditResult.timestamp)
  const formattedDate = date.toLocaleString()

  // Group issues by type
  const criticalIssues = issues.filter((issue) => issue.type === "critical")
  const warningIssues = issues.filter((issue) => issue.type === "warning")
  const infoIssues = issues.filter((issue) => issue.type === "info")

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 70) return "text-amber-600"
    return "text-red-600"
  }

  const getProgressColor = (score: number) => {
    if (score >= 90) return "bg-green-600"
    if (score >= 70) return "bg-amber-600"
    return "bg-red-600"
  }

  const getIssueIcon = (type: "critical" | "warning" | "info") => {
    switch (type) {
      case "critical":
        return <AlertCircle className="h-5 w-5 text-red-600" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-amber-600" />
      case "info":
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Technical SEO Audit Results</h1>
          <p className="text-muted-foreground">Audit completed on {formattedDate}</p>
        </div>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link href="/seo-audit">
              <ArrowLeft className="mr-2 h-4 w-4" />
              New Audit
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
          <CardTitle>Audit Summary</CardTitle>
          <CardDescription>
            <a
              href={url.startsWith("http") ? url : `https://${url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center hover:underline"
            >
              {url} <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium mb-4">Overall SEO Score</h3>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full border-4 flex items-center justify-center">
                  <span className={`text-2xl font-bold ${getScoreColor(seo.score)}`}>{seo.score}</span>
                </div>
                <div className="flex-1">
                  <Progress value={seo.score} className={getProgressColor(seo.score)} />
                  <div className="flex justify-between mt-1 text-sm">
                    <span>0</span>
                    <span>50</span>
                    <span>100</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium mb-4">Issues Found</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center p-3 border rounded-md">
                  <AlertCircle className="h-6 w-6 text-red-600 mb-1" />
                  <span className="text-xl font-bold">{criticalIssues.length}</span>
                  <span className="text-xs text-muted-foreground">Critical</span>
                </div>
                <div className="flex flex-col items-center p-3 border rounded-md">
                  <AlertTriangle className="h-6 w-6 text-amber-600 mb-1" />
                  <span className="text-xl font-bold">{warningIssues.length}</span>
                  <span className="text-xs text-muted-foreground">Warnings</span>
                </div>
                <div className="flex flex-col items-center p-3 border rounded-md">
                  <Info className="h-6 w-6 text-blue-600 mb-1" />
                  <span className="text-xl font-bold">{infoIssues.length}</span>
                  <span className="text-xs text-muted-foreground">Info</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="issues">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="scores">Detailed Scores</TabsTrigger>
        </TabsList>

        <TabsContent value="issues" className="space-y-6">
          {criticalIssues.length > 0 && (
            <Card>
              <CardHeader className="bg-red-50">
                <CardTitle className="text-red-800 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Critical Issues
                </CardTitle>
                <CardDescription className="text-red-700">
                  These issues have a significant negative impact on your SEO
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                {criticalIssues.map((issue, index) => (
                  <div key={index} className="py-4">
                    <div className="flex items-start gap-3">
                      {getIssueIcon(issue.type)}
                      <div>
                        <h4 className="font-medium">{issue.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{issue.description}</p>
                        <div className="mt-3 grid gap-2 text-sm">
                          <div>
                            <span className="font-medium">Impact: </span>
                            <span>{issue.impact}</span>
                          </div>
                          <div>
                            <span className="font-medium">Recommendation: </span>
                            <span>{issue.recommendation}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {warningIssues.length > 0 && (
            <Card>
              <CardHeader className="bg-amber-50">
                <CardTitle className="text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Warnings
                </CardTitle>
                <CardDescription className="text-amber-700">
                  These issues may impact your SEO and should be addressed
                </CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                {warningIssues.map((issue, index) => (
                  <div key={index} className="py-4">
                    <div className="flex items-start gap-3">
                      {getIssueIcon(issue.type)}
                      <div>
                        <h4 className="font-medium">{issue.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{issue.description}</p>
                        <div className="mt-3 grid gap-2 text-sm">
                          <div>
                            <span className="font-medium">Impact: </span>
                            <span>{issue.impact}</span>
                          </div>
                          <div>
                            <span className="font-medium">Recommendation: </span>
                            <span>{issue.recommendation}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {infoIssues.length > 0 && (
            <Card>
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-blue-800 flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Information
                </CardTitle>
                <CardDescription className="text-blue-700">These are opportunities to improve your SEO</CardDescription>
              </CardHeader>
              <CardContent className="divide-y">
                {infoIssues.map((issue, index) => (
                  <div key={index} className="py-4">
                    <div className="flex items-start gap-3">
                      {getIssueIcon(issue.type)}
                      <div>
                        <h4 className="font-medium">{issue.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{issue.description}</p>
                        <div className="mt-3 grid gap-2 text-sm">
                          <div>
                            <span className="font-medium">Impact: </span>
                            <span>{issue.impact}</span>
                          </div>
                          <div>
                            <span className="font-medium">Recommendation: </span>
                            <span>{issue.recommendation}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Core Web Vitals and other performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Page Load Time</span>
                    <span className="text-sm">{performance.loadTime.toFixed(1)}s</span>
                  </div>
                  <Progress
                    value={Math.max(0, 100 - performance.loadTime * 20)}
                    className={
                      performance.loadTime < 2.5
                        ? "bg-green-600"
                        : performance.loadTime < 4
                          ? "bg-amber-600"
                          : "bg-red-600"
                    }
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">First Contentful Paint</span>
                    <span className="text-sm">{performance.firstContentfulPaint.toFixed(1)}s</span>
                  </div>
                  <Progress
                    value={Math.max(0, 100 - performance.firstContentfulPaint * 40)}
                    className={
                      performance.firstContentfulPaint < 1.8
                        ? "bg-green-600"
                        : performance.firstContentfulPaint < 3
                          ? "bg-amber-600"
                          : "bg-red-600"
                    }
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Largest Contentful Paint</span>
                    <span className="text-sm">{performance.largestContentfulPaint.toFixed(1)}s</span>
                  </div>
                  <Progress
                    value={Math.max(0, 100 - performance.largestContentfulPaint * 25)}
                    className={
                      performance.largestContentfulPaint < 2.5
                        ? "bg-green-600"
                        : performance.largestContentfulPaint < 4
                          ? "bg-amber-600"
                          : "bg-red-600"
                    }
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Cumulative Layout Shift</span>
                    <span className="text-sm">{performance.cumulativeLayoutShift.toFixed(2)}</span>
                  </div>
                  <Progress
                    value={Math.max(0, 100 - performance.cumulativeLayoutShift * 500)}
                    className={
                      performance.cumulativeLayoutShift < 0.1
                        ? "bg-green-600"
                        : performance.cumulativeLayoutShift < 0.25
                          ? "bg-amber-600"
                          : "bg-red-600"
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scores" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Detailed SEO Scores</CardTitle>
              <CardDescription>Breakdown of your SEO performance by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Meta Tags</span>
                    <span className={`text-sm ${getScoreColor(seo.metaTagsScore)}`}>{seo.metaTagsScore}/100</span>
                  </div>
                  <Progress value={seo.metaTagsScore} className={getProgressColor(seo.metaTagsScore)} />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Content Quality</span>
                    <span className={`text-sm ${getScoreColor(seo.contentScore)}`}>{seo.contentScore}/100</span>
                  </div>
                  <Progress value={seo.contentScore} className={getProgressColor(seo.contentScore)} />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Mobile Friendliness</span>
                    <span className={`text-sm ${getScoreColor(seo.mobileScore)}`}>{seo.mobileScore}/100</span>
                  </div>
                  <Progress value={seo.mobileScore} className={getProgressColor(seo.mobileScore)} />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">Security</span>
                    <span className={`text-sm ${getScoreColor(seo.securityScore)}`}>{seo.securityScore}/100</span>
                  </div>
                  <Progress value={seo.securityScore} className={getProgressColor(seo.securityScore)} />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

