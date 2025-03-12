import { storage } from "@/lib/storage"
import type { ProductComparisonResult } from "@/app/actions/product-comparison-action"
import { notFound } from "next/navigation"
import ClientResults from "./client-results"

export default async function ProductComparisonResultsPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const result = await storage.get<ProductComparisonResult>(`product-comparison:${id}`)

  if (!result) {
    notFound()
  }

  console.log(`Server: Found ${result.products?.length || 0} products to pass to client component`)

  return (
    <div className="container mx-auto py-10">
      <ClientResults initialData={result} />
    </div>
  )
}

