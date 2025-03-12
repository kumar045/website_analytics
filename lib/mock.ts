// Mock data generation functions for development and testing

export type KeywordData = {
  keyword: string
  mainRank: number | null
  competitorRanks: (number | null)[]
  difficulty: number
  searchVolume: number
  opportunity: "high" | "medium" | "low"
}

export function generateMockKeywordData(count: number): KeywordData[] {
  const keywords = [
    "website analysis tool",
    "competitor website analysis",
    "SEO content generator",
    "website comparison tool",
    "free website analyzer",
    "website SEO checker",
    "content optimization tool",
    "keyword gap analysis",
    "technical SEO audit",
    "backlink analyzer",
    "website performance checker",
    "SEO competitor analysis",
    "website content analyzer",
    "meta description generator",
    "website ranking tool",
  ]

  return Array.from({ length: count }, (_, i) => {
    const keyword = keywords[i % keywords.length]
    const mainRank = Math.random() > 0.2 ? Math.floor(Math.random() * 20) + 1 : null
    const competitorRanks = Array.from({ length: 3 }, () =>
      Math.random() > 0.3 ? Math.floor(Math.random() * 20) + 1 : null,
    )
    const difficulty = Math.floor(Math.random() * 60) + 20
    const searchVolume = Math.floor(Math.random() * 5000) + 500

    let opportunity: "high" | "medium" | "low"
    if (mainRank === null && competitorRanks.some((rank) => rank !== null && rank <= 10)) {
      opportunity = "high"
    } else if (mainRank !== null && mainRank > 10 && competitorRanks.some((rank) => rank !== null && rank <= 10)) {
      opportunity = "medium"
    } else {
      opportunity = "low"
    }

    return {
      keyword,
      mainRank,
      competitorRanks,
      difficulty,
      searchVolume,
      opportunity,
    }
  })
}

