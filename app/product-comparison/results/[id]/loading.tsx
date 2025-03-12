import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function Loading() {
  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-10 w-[300px]" />
          <Skeleton className="h-4 w-[200px] mt-1" />
        </div>
        <div className="text-right">
          <Skeleton className="h-4 w-[150px]" />
          <Skeleton className="h-4 w-[100px] mt-1" />
        </div>
      </div>

      <Alert className="bg-primary/10 border-primary/20">
        <div className="flex items-center">
          <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
          <AlertTitle className="text-primary">Loading Analysis Results</AlertTitle>
        </div>
        <AlertDescription className="pl-6">
          <p className="mb-2">Please wait while we load your product comparison results...</p>
        </AlertDescription>
      </Alert>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-6 w-[150px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[100px]" />
                <Skeleton className="h-4 w-[150px] mt-1" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[150px]" />
            <Skeleton className="h-4 w-[250px] mt-1" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-start">
                  <Skeleton className="h-5 w-5 mr-2" />
                  <Skeleton className="h-5 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

