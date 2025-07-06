"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { ExclamationTriangleIcon, ArrowRightIcon } from "@radix-ui/react-icons"

export default function FallacyDemo() {
  const [text, setText] = useState(
    "Since most experts agree that climate change is real, it must be true. Anyone who disagrees is clearly not educated enough to understand the science.",
  )
  const [analyzed, setAnalyzed] = useState(false)

  const handleAnalyze = () => {
    setAnalyzed(true)
  }

  const handleReset = () => {
    setAnalyzed(false)
  }

  return (
    <Card className="w-full max-w-md shadow-lg border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg">Try LogicLens</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          placeholder="Enter text to analyze for logical fallacies..."
          className="min-h-[120px] resize-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={analyzed}
        />

        {analyzed && (
          <div className="mt-4 space-y-3">
            <div className="p-3 bg-red-50 border border-red-100 rounded-md">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
                <div>
                  <h4 className="font-medium text-red-700">Appeal to Authority</h4>
                  <p className="text-sm text-gray-600">
                    Relying on "most experts agree" without presenting the evidence itself.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-red-50 border border-red-100 rounded-md">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
                <div>
                  <h4 className="font-medium text-red-700">Ad Hominem</h4>
                  <p className="text-sm text-gray-600">
                    Attacking the education level of those who disagree rather than their arguments.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-500 mt-2">
              <p>2 fallacies detected in this text.</p>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter>
        {!analyzed ? (
          <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleAnalyze}>
            Analyze Text
            <ArrowRightIcon className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" className="w-full" onClick={handleReset}>
            Try Another Example
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}

