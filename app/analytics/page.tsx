"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowUpRight, Calendar, ChevronDown, TrendingUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d")

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Analytics</h1>
          <p className="text-muted-foreground">Track your website's performance and SEO improvements</p>
        </div>
        <div className="flex gap-4">
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {dateRange === "7d" ? "Last 7 days" : dateRange === "30d" ? "Last 30 days" : "Last 90 days"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDateRange("7d")}>Last 7 days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateRange("30d")}>Last 30 days</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateRange("90d")}>Last 90 days</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Organic Traffic</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,543</div>
            <p className="text-xs text-green-500 flex items-center">
              <ArrowUpRight className="mr-1 h-3 w-3" />
              +15.3% from previous period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Keyword Rankings</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">187</div>
            <p className="text-xs text-green-500 flex items-center">
              <ArrowUpRight className="mr-1 h-3 w-3" />
              +23 new rankings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Position</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">14.2</div>
            <p className="text-xs text-green-500 flex items-center">
              <ArrowUpRight className="mr-1 h-3 w-3" />
              +2.1 positions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Speed</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89/100</div>
            <p className="text-xs text-green-500 flex items-center">
              <ArrowUpRight className="mr-1 h-3 w-3" />
              +7 points
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="rankings">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="rankings">Keyword Rankings</TabsTrigger>
          <TabsTrigger value="traffic">Traffic Sources</TabsTrigger>
          <TabsTrigger value="performance">Page Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="rankings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Keyword Rankings</CardTitle>
              <CardDescription>Your best performing keywords in search results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="grid grid-cols-4 border-b px-4 py-2 font-medium">
                  <div>Keyword</div>
                  <div className="text-center">Position</div>
                  <div className="text-center">Change</div>
                  <div className="text-center">Volume</div>
                </div>
                <div className="divide-y">
                  {[
                    { keyword: "website analysis tool", position: 3, change: 2, volume: 2400 },
                    { keyword: "compare websites", position: 5, change: 1, volume: 1800 },
                    { keyword: "website content generator", position: 7, change: 4, volume: 3200 },
                    { keyword: "SEO analysis", position: 8, change: -1, volume: 5400 },
                    { keyword: "competitor website comparison", position: 10, change: 3, volume: 1200 },
                  ].map((item, i) => (
                    <div key={i} className="grid grid-cols-4 px-4 py-3">
                      <div className="font-medium">{item.keyword}</div>
                      <div className="text-center">{item.position}</div>
                      <div
                        className={`text-center ${item.change > 0 ? "text-green-600" : item.change < 0 ? "text-red-600" : ""}`}
                      >
                        {item.change > 0 ? `+${item.change}` : item.change}
                      </div>
                      <div className="text-center">{item.volume.toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traffic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Traffic Sources</CardTitle>
              <CardDescription>Where your website visitors are coming from</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-md">
                <p className="text-muted-foreground">Traffic sources chart would appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Page Performance</CardTitle>
              <CardDescription>Core Web Vitals and other performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center bg-muted/20 rounded-md">
                <p className="text-muted-foreground">Performance metrics chart would appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

