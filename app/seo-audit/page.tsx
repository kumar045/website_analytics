"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { performSEOAudit } from "@/app/actions/seo-audit-action"

export default function SEOAuditPage() {
  const router = useRouter()
  const [websiteUrl, setWebsiteUrl] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAnalyzing(true)
    setError("")

    try {
      if (!websiteUrl) {
        throw new Error("Please enter a website URL")
      }

      // Start the audit
      const auditId = await performSEOAudit(websiteUrl)

      // Redirect to results page
      router.push(`/seo-audit/results/${auditId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during the audit")
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Technical SEO Audit</h1>
          <p className="text-muted-foreground">Analyze your website for technical SEO issues and opportunities</p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Dashboard
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Run Technical SEO Audit</CardTitle>
          <CardDescription>Get a comprehensive analysis of your website's technical SEO health</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="website-url">Website URL</Label>
              <Input
                id="website-url"
                placeholder="https://example.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                disabled={isAnalyzing}
              />
            </div>

            {error && <p className="text-sm font-medium text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={isAnalyzing}>
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running Audit...
                </>
              ) : (
                "Start Technical SEO Audit"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What's Included in the Audit</CardTitle>
          <CardDescription>Our technical SEO audit checks for these important factors</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">Performance Analysis</h3>
                <p className="text-sm text-muted-foreground">Page speed, Core Web Vitals, and loading metrics</p>
              </div>
              <div>
                <h3 className="text-sm font-medium">Meta Tag Optimization</h3>
                <p className="text-sm text-muted-foreground">Title tags, meta descriptions, and other metadata</p>
              </div>
              <div>
                <h3 className="text-sm font-medium">Content Quality</h3>
                <p className="text-sm text-muted-foreground">Heading structure, word count, and content organization</p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">Mobile Friendliness</h3>
                <p className="text-sm text-muted-foreground">Responsive design, viewport settings, and tap targets</p>
              </div>
              <div>
                <h3 className="text-sm font-medium">Security & Accessibility</h3>
                <p className="text-sm text-muted-foreground">HTTPS, mixed content, and accessibility issues</p>
              </div>
              <div>
                <h3 className="text-sm font-medium">Structured Data</h3>
                <p className="text-sm text-muted-foreground">Schema markup and rich snippet opportunities</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

