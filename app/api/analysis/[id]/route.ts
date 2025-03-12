import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params

    // Fetch analysis result from our custom storage
    const analysisResult = await storage.get<any>(`analysis:${id}`)

    if (!analysisResult) {
      return NextResponse.json({ error: "Analysis result not found" }, { status: 404 })
    }

    return NextResponse.json(analysisResult)
  } catch (error) {
    console.error("Error fetching analysis:", error)
    return NextResponse.json({ error: "Failed to fetch analysis result" }, { status: 500 })
  }
}

