import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Download, ExternalLink } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { storage } from "@/lib/storage"

type KeywordData = {
  keyword: string
  mainRank: number | null
  competitorRanks: (number | null)[]
  difficulty: number
  searchVolume: number
  opportunity: "high" | "medium" | "low"
}

type KeywordGapResult = {
  id: string
  timestamp: number
  mainWebsite: string
  competitors: string[]
  keywords: KeywordData[]
}

export default async function KeywordGapResultsPage({ params }: { params: { id: string } }) {
  const { id } = params

  // Fetch keyword gap results from storage
  const keywordGapResult = await storage.get<KeywordGapResult>(`keyword-gap:${id}`)

  if (!keywordGapResult) {
    notFound()
  }

  const { mainWebsite, competitors, keywords } = keywordGapResult

  // Format timestamp
  const date = new Date(keywordGapResult.timestamp)
  const formattedDate = date.toLocaleString()

  // Group keywords by opportunity
  const highOpportunityKeywords = keywords.filter((kw) => kw.opportunity === "high")
  const mediumOpportunityKeywords = keywords.filter((kw) => kw.opportunity === "medium")
  const lowOpportunityKeywords = keywords.filter((kw) => kw.opportunity === "low")

  const getOpportunityColor = (opportunity: "high" | "medium" | "low") => {
    switch (opportunity) {
      case "high":
        return "bg-green-100 text-green-800 hover:bg-green-200"
      case "medium":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200"
      case "low":
        return "bg-gray-100 text-gray-800 hover:bg-gray-200"
    }
  }

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty < 40) return "text-green-600"
    if (difficulty < 70) return "text-amber-600"
    return "text-red-600"
  }

  const getRankDisplay = (rank: number | null) => {
    if (rank === null) return "—"
    return rank
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Keyword Gap Results</h1>
          <p className="text-muted-foreground">Analysis completed on {formattedDate}</p>
        </div>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link href="/keyword-gap">
              <ArrowLeft className="mr-2 h-4 w-4" />
              New Analysis
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
          <CardTitle>Analysis Summary</CardTitle>
          <CardDescription>
            Keyword gap analysis between {mainWebsite} and {competitors.length} competitor
            {competitors.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-lg font-medium mb-2">Websites Analyzed</h3>
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
              <h3 className="text-lg font-medium mb-2">Opportunity Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Badge className={`mr-2 ${getOpportunityColor("high")}`}>High</Badge>
                    <span className="text-sm">High-value keyword opportunities</span>
                  </div>
                  <span className="font-medium">{highOpportunityKeywords.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Badge className={`mr-2 ${getOpportunityColor("medium")}`}>Medium</Badge>
                    <span className="text-sm">Medium-value keyword opportunities</span>
                  </div>
                  <span className="font-medium">{mediumOpportunityKeywords.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Badge className={`mr-2 ${getOpportunityColor("low")}`}>Low</Badge>
                    <span className="text-sm">Low-value keyword opportunities</span>
                  </div>
                  <span className="font-medium">{lowOpportunityKeywords.length}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>High Opportunity Keywords</CardTitle>
          <CardDescription>Keywords your competitors are ranking for that you should target</CardDescription>
        </CardHeader>
        <CardContent>
          {highOpportunityKeywords.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead className="text-center">Your Rank</TableHead>
                  <TableHead className="text-center">Competitor Ranks</TableHead>
                  <TableHead className="text-center">Difficulty</TableHead>
                  <TableHead className="text-center">Volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {highOpportunityKeywords.map((keyword, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{keyword.keyword}</TableCell>
                    <TableCell className="text-center">
                      {keyword.mainRank ? (
                        <span className={keyword.mainRank <= 10 ? "text-green-600 font-medium" : "text-amber-600"}>
                          {keyword.mainRank}
                        </span>
                      ) : (
                        <span className="text-red-600">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-2">
                        {keyword.competitorRanks.map((rank, i) => (
                          <span key={i} className={rank && rank <= 10 ? "text-green-600" : "text-muted-foreground"}>
                            {getRankDisplay(rank)}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={getDifficultyColor(keyword.difficulty)}>{keyword.difficulty}/100</span>
                    </TableCell>
                    <TableCell className="text-center">{keyword.searchVolume.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-4 text-muted-foreground">No high opportunity keywords found</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Keyword Opportunities</CardTitle>
          <CardDescription>Complete list of keywords with opportunity analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Keyword</TableHead>
                <TableHead className="text-center">Your Rank</TableHead>
                <TableHead className="text-center">Competitor Ranks</TableHead>
                <TableHead className="text-center">Difficulty</TableHead>
                <TableHead className="text-center">Volume</TableHead>
                <TableHead className="text-center">Opportunity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {keywords.map((keyword, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{keyword.keyword}</TableCell>
                  <TableCell className="text-center">
                    {keyword.mainRank ? (
                      <span className={keyword.mainRank <= 10 ? "text-green-600 font-medium" : "text-amber-600"}>
                        {keyword.mainRank}
                      </span>
                    ) : (
                      <span className="text-red-600">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex justify-center gap-2">
                      {keyword.competitorRanks.map((rank, i) => (
                        <span key={i} className={rank && rank <= 10 ? "text-green-600" : "text-muted-foreground"}>
                          {getRankDisplay(rank)}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={getDifficultyColor(keyword.difficulty)}>{keyword.difficulty}/100</span>
                  </TableCell>
                  <TableCell className="text-center">{keyword.searchVolume.toLocaleString()}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={getOpportunityColor(keyword.opportunity)}>{keyword.opportunity}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

