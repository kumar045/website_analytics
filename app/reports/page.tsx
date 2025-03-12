"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Calendar, Download, FileText, Mail, Share2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

export default function ReportsPage() {
  const [selectedReports, setSelectedReports] = useState<string[]>([
    "keyword-rankings",
    "content-analysis",
    "technical-seo",
  ])
  const [email, setEmail] = useState("")

  const toggleReport = (reportId: string) => {
    if (selectedReports.includes(reportId)) {
      setSelectedReports(selectedReports.filter((id) => id !== reportId))
    } else {
      setSelectedReports([...selectedReports, reportId])
    }
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advanced Reports</h1>
          <p className="text-muted-foreground">Generate comprehensive SEO and content reports</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="generate">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate">Generate Report</TabsTrigger>
          <TabsTrigger value="history">Report History</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Custom Report</CardTitle>
              <CardDescription>Select the sections to include in your report</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="keyword-rankings"
                      checked={selectedReports.includes("keyword-rankings")}
                      onCheckedChange={() => toggleReport("keyword-rankings")}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="keyword-rankings" className="font-medium">
                        Keyword Rankings
                      </Label>
                      <p className="text-sm text-muted-foreground">Current rankings and changes over time</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="content-analysis"
                      checked={selectedReports.includes("content-analysis")}
                      onCheckedChange={() => toggleReport("content-analysis")}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="content-analysis" className="font-medium">
                        Content Analysis
                      </Label>
                      <p className="text-sm text-muted-foreground">Content quality, readability, and optimization</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="technical-seo"
                      checked={selectedReports.includes("technical-seo")}
                      onCheckedChange={() => toggleReport("technical-seo")}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="technical-seo" className="font-medium">
                        Technical SEO Audit
                      </Label>
                      <p className="text-sm text-muted-foreground">Site health, errors, and performance issues</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="competitor-analysis"
                      checked={selectedReports.includes("competitor-analysis")}
                      onCheckedChange={() => toggleReport("competitor-analysis")}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="competitor-analysis" className="font-medium">
                        Competitor Analysis
                      </Label>
                      <p className="text-sm text-muted-foreground">Comparison with top competitors</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="backlink-profile"
                      checked={selectedReports.includes("backlink-profile")}
                      onCheckedChange={() => toggleReport("backlink-profile")}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="backlink-profile" className="font-medium">
                        Backlink Profile
                      </Label>
                      <p className="text-sm text-muted-foreground">Link quality, sources, and growth</p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="action-plan"
                      checked={selectedReports.includes("action-plan")}
                      onCheckedChange={() => toggleReport("action-plan")}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="action-plan" className="font-medium">
                        Actionable Recommendations
                      </Label>
                      <p className="text-sm text-muted-foreground">Prioritized tasks to improve rankings</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Report To (Optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Button variant="outline" size="icon">
                    <Mail className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <div className="text-sm text-muted-foreground">{selectedReports.length} sections selected</div>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Weekly
                </Button>
                <Button>
                  <Download className="mr-2 h-4 w-4" />
                  Generate Report
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>Your previously generated reports</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Full SEO Audit", date: "Mar 8, 2025", sections: 6 },
                  { name: "Competitor Analysis", date: "Mar 1, 2025", sections: 3 },
                  { name: "Content Performance", date: "Feb 22, 2025", sections: 2 },
                  { name: "Technical SEO Audit", date: "Feb 15, 2025", sections: 4 },
                ].map((report, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">{report.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {report.date} • {report.sections} sections
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon">
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

