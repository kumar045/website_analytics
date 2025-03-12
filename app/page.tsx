import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BarChart2, FileText, Search, ShoppingBag } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata: Metadata = {
  title: "Website Analysis Tool",
  description: "Analyze websites, compare competitors, and generate optimized content",
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
          <div className="flex gap-2 items-center text-xl font-bold">
            <Search className="h-5 w-5" />
            <span>Website Analyzer</span>
          </div>
          <div className="flex flex-1 items-center justify-end space-x-4">
            <nav className="flex items-center space-x-2">
              <Button asChild variant="ghost">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button asChild>
                <Link href="/analyze">Start Analysis</Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none">
                  Website Analysis & Content Generation
                </h1>
                <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                  Analyze your website against competitors and generate optimized content with AI
                </p>
              </div>
              <div className="space-x-4">
                <Button asChild className="px-8">
                  <Link href="/analyze">
                    Get Started <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-100 dark:bg-gray-800">
          <div className="container px-4 md:px-6">
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <Card>
                <CardHeader>
                  <Search className="h-10 w-10 mb-2 text-primary" />
                  <CardTitle>Website Analysis</CardTitle>
                  <CardDescription>Scrape and analyze your website and competitors using Apify</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Extract content, metadata, keywords, and structure from any website for comprehensive analysis.</p>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="ghost">
                    <Link href="/analyze">Start Analysis</Link>
                  </Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <BarChart2 className="h-10 w-10 mb-2 text-primary" />
                  <CardTitle>Competitor Comparison</CardTitle>
                  <CardDescription>
                    Compare your website against competitors to identify gaps and opportunities
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p>
                    Get detailed insights on how your website stacks up against the competition in terms of content and
                    SEO.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="ghost">
                    <Link href="/compare">Compare Sites</Link>
                  </Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <FileText className="h-10 w-10 mb-2 text-primary" />
                  <CardTitle>Content Generation</CardTitle>
                  <CardDescription>
                    Generate optimized content based on analysis results using Gemini AI
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p>
                    Create SEO-friendly content, meta descriptions, and metadata tailored to outperform your
                    competitors.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="ghost">
                    <Link href="/generate">Generate Content</Link>
                  </Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <ShoppingBag className="h-10 w-10 mb-2 text-primary" />
                  <CardTitle>Product Comparison</CardTitle>
                  <CardDescription>
                    Compare products across e-commerce websites to gain competitive insights
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Analyze product listings, prices, ratings, and reviews from major e-commerce platforms.</p>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="ghost">
                    <Link href="/product-comparison">Compare Products</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t py-6">
        <div className="container flex flex-col items-center justify-center gap-4 md:flex-row md:gap-8">
          <p className="text-center text-sm leading-loose text-gray-500 dark:text-gray-400">
            Built with Next.js, Apify, and Google Gemini AI
          </p>
        </div>
      </footer>
    </div>
  )
}

