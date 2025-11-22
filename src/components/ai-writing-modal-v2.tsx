import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { FunctionComponent, useEffect, useState } from "react";

interface AIWritingModalV2Props {
  generatedTextLength: number;
  id: string;
  isCurrentlyWriting: boolean;
  stopWriting: () => void;
}

const AIWritingModalV2: FunctionComponent<AIWritingModalV2Props> = ({ id, generatedTextLength, isCurrentlyWriting, stopWriting }: AIWritingModalV2Props) => {
  const [generatedWordCount, setGeneratedWordCount] = useState<number>(0)
  const [rating, setRating] = useState<number>()
  const [showSummary, setShowSummary] = useState<boolean>(false)
  const [message, setMessage] = useState<string>("")

  // const { mutate: updatePromptFeedbackMutation } =
  //   useUpdatePromptFeedback();

  const ratingMessagesArray = ["Terrible, complete waste of my time", "Meh, I could do better", "Good, it does the job", "Great, almost there", "Excellent, better than I would write this myself"]

  useEffect(() => {
    if (isCurrentlyWriting) {
      setShowSummary(true)
    }
  }, [isCurrentlyWriting])

  useEffect(() => {
    if (isCurrentlyWriting) {
      setGeneratedWordCount(generatedTextLength)
    }
  }, [isCurrentlyWriting, generatedTextLength])


  if (!showSummary) return null;


  return (
    <TooltipProvider>
      <div className="w-[400px] rounded-xl border border-border p-3 shadow-lg bg-card flex flex-col gap-3 items-start absolute bottom-10 right-10 z-10">
        <div className="w-full flex items-center justify-between">
          <p className="text-lg font-semibold">{isCurrentlyWriting ? `Writing with AI...` : `How did we do?`}</p>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setGeneratedWordCount(0);
              stopWriting();
              setShowSummary(false);
            }}
            className="h-6 w-6"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {isCurrentlyWriting ? (
          <Progress isIndeterminate className="w-full" />
        ) : (
          <Progress value={100} className="w-full" />
        )}

        <div className="w-full flex items-end justify-end">
          <p className="text-sm">{`${generatedWordCount} words written`}</p>
        </div>

        {!isCurrentlyWriting && (
          <>
            <div className="w-full flex flex-col gap-3 items-start">
              <div>
                <p className="text-sm font-semibold">How do you like the content we just wrote?</p>
                <p className="text-sm text-muted-foreground">This helps us improve our models to write better content for you</p>
              </div>

              <div className="w-full flex gap-2">
                {ratingMessagesArray.map((ratingMessage: string, i: number) => {
                  return (
                    <Tooltip key={`message_${i}`}>
                      <TooltipTrigger asChild>
                        <div
                          key={`star_${i}`}
                          className={cn(
                            "w-[30px] h-[30px] flex items-center justify-center rounded-sm cursor-pointer transition-colors shadow-sm group",
                            rating && i + 1 === rating
                              ? "bg-primary text-primary-foreground"
                              : "bg-background hover:bg-primary hover:text-primary-foreground"
                          )}
                          onClick={() => {
                            if (!rating) {
                              setRating(i + 1)
                            } else {
                              setRating(undefined)
                            }
                          }}
                        >
                          <span className={cn(
                            "text-sm font-medium transition-colors",
                            rating && i + 1 === rating
                              ? "text-primary-foreground"
                              : "text-foreground group-hover:text-primary-foreground"
                          )}>
                            {i + 1}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{ratingMessage}</p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
            </div>

            {rating && (
              <div className="w-full space-y-2">
                <Label htmlFor="feedback-textarea">What did you like/not like about this? (Optional)</Label>
                <Textarea
                  id="feedback-textarea"
                  value={message}
                  onChange={(evt) => {
                    setMessage(evt.target.value)
                  }}
                  placeholder="Share your feedback..."
                />
              </div>
            )}

            <div className="w-full flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowSummary(false)
                }}
              >
                Close
              </Button>
              <Button
                size="sm"
                disabled={!rating}
                onClick={() => {
                  // updatePromptFeedbackMutation({ id, rating, message })
                  setShowSummary(false)
                }}
              >
                Submit
              </Button>
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  )
}

export default AIWritingModalV2;
