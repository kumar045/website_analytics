import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function Loading() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col space-y-6">
        <div>
          <Skeleton className="h-10 w-[300px]" />
          <Skeleton className="h-4 w-[500px] mt-2" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[250px]" />
            <Skeleton className="h-4 w-[350px] mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Skeleton className="h-4 w-[100px] mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div>
                  <Skeleton className="h-4 w-[100px] mb-2" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <Skeleton className="h-10 w-[150px]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[150px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

