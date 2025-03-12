import { type NextRequest, NextResponse } from "next/server"
import { storage } from "@/lib/storage"
import type { ProductComparisonResult } from "@/app/actions/product-comparison-action"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = params
    const result = await storage.get<ProductComparisonResult>(`product-comparison:${id}`)

    if (!result) {
      return NextResponse.json({ error: "Product comparison not found" }, { status: 404 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error fetching product comparison:", error)
    return NextResponse.json({ error: "Failed to fetch product comparison" }, { status: 500 })
  }
}

