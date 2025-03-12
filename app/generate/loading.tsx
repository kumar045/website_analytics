import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="container mx-auto py-10 flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p>Loading analyses...</p>
      </div>
    </div>
  )
}

