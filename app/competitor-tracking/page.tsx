"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { trackCompetitorChanges } from "@/app/actions/competitor-tracking-action"

export default function CompetitorTrackingPage() {
  const router = useRouter()
  const [mainWebsite, setMainWebsite] = useState("")
  const [competitors, setCompetitors] = useState(["", ""])
  const [isTracking, setIsTracking] = useState(false)
  const [error, setError] = useState("")

  const updateCompetitor = (index: number, value: string) => {
    const newCompetitors = [...competitors]
    newCompetitors[index] = value
    setCompetitors(newCompetitors)
  }

  const addCompetitor = () => {
    if (competitors.length < 5) {
      setCompetitors([...competitors, ""])
    }
  }

  const removeCompetitor = (index: number) => {
    if (competitors.length > 1) {
      const newCompetitors = [...competitors]
      newCompetitors.splice(index, 1)
      setCompetitors(newCompetitors)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsTracking(true)
    setError("")

    try {
      if (!mainWebsite) {
        throw new Error("Please enter your main website URL")
      }

      // Filter out empty competitor URLs
      const validCompetitors = competitors.filter((url) => url.trim() !== "")

      if (validCompetitors.length === 0) {
        throw new Error("Please enter at least one competitor website URL")
      }

      // Start tracking
      const trackingId = await trackCompetitorChanges(mainWebsite, validCompetitors)

      // Redirect to results page
      router.push(`/competitor-tracking/results/${trackingId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred during tracking")
      setIsTracking(false)
    }
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Competitor Movement Tracking</h1>
          <p className="text-muted-foreground">Monitor changes on competitor websites to stay ahead</p>
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
          <CardTitle>Track Competitor Changes</CardTitle>
          <CardDescription>Monitor your competitors for content, design, and feature changes</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="main-website">Your Website URL</Label>
              <Input
                id="main-website"
                placeholder="https://example.com"
                value={mainWebsite}
                onChange={(e) => setMainWebsite(e.target.value)}
                disabled={isTracking}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Competitor Websites to Track</Label>
                {competitors.length < 5 && (
                  <Button type="button" variant="outline" size="sm" onClick={addCompetitor} disabled={isTracking}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Competitor
                  </Button>
                )}
              </div>

              {competitors.map((competitor, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder={`https://competitor${index + 1}.com`}
                    value={competitor}
                    onChange={(e) => updateCompetitor(index, e.target.value)}
                    disabled={isTracking}
                  />
                  {competitors.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCompetitor(index)}
                      disabled={isTracking}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {error && <p className="text-sm font-medium text-red-500">{error}</p>}

            <Button type="submit" className="w-full" disabled={isTracking}>
              {isTracking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Tracking Competitors...
                </>
              ) : (
                "Start Tracking"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What We Track</CardTitle>
          <CardDescription>Our competitor tracking system monitors these key changes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">Content Changes</h3>
                <p className="text-sm text-muted-foreground">
                  New sections, updated messaging, and content strategy shifts
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium">Design Updates</h3>
                <p className="text-sm text-muted-foreground">
                  Visual changes, layout modifications, and UX improvements
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium">SEO Adjustments</h3>
                <p className="text-sm text-muted-foreground">
                  Meta tag updates, keyword targeting, and structure changes
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium">New Features</h3>
                <p className="text-sm text-muted-foreground">
                  Product or service additions and functionality enhancements
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium">Performance Improvements</h3>
                <p className="text-sm text-muted-foreground">Speed optimizations and technical enhancements</p>
              </div>
              <div>
                <h3 className="text-sm font-medium">Strategic Insights</h3>
                <p className="text-sm text-muted-foreground">
                  Analysis of what changes mean for your competitive position
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

