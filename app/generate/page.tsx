import Link from "next/link"
import { ArrowRight, FileText } from "lucide-react"

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

export default async function GeneratePage() {
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
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Generate Content</h1>
          <p className="text-muted-foreground">Select an analysis to generate optimized content</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/analyze">New Analysis</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Analyses</CardTitle>
          <CardDescription>Select an analysis to generate content based on its results</CardDescription>
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
                        <Link href={`/generate/${analysis.id}`}>
                          Generate Content
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
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No analyses found</p>
              <Button asChild>
                <Link href="/analyze">Run Your First Analysis</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

