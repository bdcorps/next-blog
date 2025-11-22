"use client"

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  Bold,
  Brain,
  Code,
  ExternalLink,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  MessageSquare,
  MoreVertical,
  PictureInPicture,
  Quote,
  Search,
  Sparkles,
  Strikethrough
} from "lucide-react";
import { FunctionComponent, useRef, useState } from "react";

interface EditorialBuilderProps { }

const BaseWriter: FunctionComponent<EditorialBuilderProps> = ({ }) => {
  const [saveStatus, setSaveStatus] = useState<"Saved" | "Saving...">("Saved")
  const [postStatus, setPostStatus] = useState<"Draft" | "Published">("Draft")
  const [slug, setSlug] = useState("/blog/create-your-content-strategy")
  const [title, setTitle] = useState("How to create a winning content strategy for your B2B SaaS")
  const [description, setDescription] = useState("")
  const [content, setContent] = useState("")
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Helper function to insert text at cursor position
  const insertTextAtCursor = (before: string, after: string = "") => {
    const textarea = contentTextareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    const beforeText = content.substring(0, start)
    const afterText = content.substring(end)

    const newContent = beforeText + before + selectedText + after + afterText
    setContent(newContent)

    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + before.length + selectedText.length + after.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  // Helper function to insert text at the start of current line
  const insertAtLineStart = (prefix: string) => {
    const textarea = contentTextareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const textBeforeCursor = content.substring(0, start)
    const textAfterCursor = content.substring(start)

    // Find the start of the current line
    const lastNewlineIndex = textBeforeCursor.lastIndexOf('\n')
    const lineStart = lastNewlineIndex + 1
    const currentLine = textBeforeCursor.substring(lineStart)
    const beforeLine = content.substring(0, lineStart)

    // Get the rest of the line (until next newline or end)
    const nextNewlineIndex = textAfterCursor.indexOf('\n')
    const restOfLine = nextNewlineIndex === -1
      ? textAfterCursor
      : textAfterCursor.substring(0, nextNewlineIndex)
    const afterLine = nextNewlineIndex === -1
      ? ''
      : textAfterCursor.substring(nextNewlineIndex)

    const fullLine = currentLine + restOfLine
    const trimmedPrefix = prefix.trim()
    const cursorOffsetInLine = currentLine.length

    // Check if line already has the prefix
    if (fullLine.trim().startsWith(trimmedPrefix)) {
      // Remove prefix if it exists
      const prefixIndex = fullLine.indexOf(trimmedPrefix)
      const newLine = fullLine.substring(0, prefixIndex) + fullLine.substring(prefixIndex + trimmedPrefix.length).trimStart()
      const newContent = beforeLine + newLine + afterLine
      setContent(newContent)
      setTimeout(() => {
        textarea.focus()
        // Preserve cursor position relative to line start, adjusting for removed prefix
        const newCursorOffset = Math.max(0, cursorOffsetInLine - trimmedPrefix.length)
        const newPos = lineStart + Math.min(newCursorOffset, newLine.length)
        textarea.setSelectionRange(newPos, newPos)
      }, 0)
    } else {
      // Add prefix
      const newLine = prefix + fullLine
      const newContent = beforeLine + newLine + afterLine
      setContent(newContent)
      setTimeout(() => {
        textarea.focus()
        // Preserve cursor position, adjusting for added prefix
        const newPos = lineStart + prefix.length + cursorOffsetInLine
        textarea.setSelectionRange(newPos, newPos)
      }, 0)
    }
  }

  // Formatting functions
  const formatBold = () => insertTextAtCursor("**", "**")
  const formatItalic = () => insertTextAtCursor("*", "*")
  const formatStrikethrough = () => insertTextAtCursor("~~", "~~")
  const formatHeading2 = () => insertAtLineStart("## ")
  const formatHeading3 = () => insertAtLineStart("### ")
  const formatBulletList = () => insertAtLineStart("- ")
  const formatNumberedList = () => insertAtLineStart("1. ")
  const formatQuote = () => insertAtLineStart("> ")
  const formatCodeBlock = () => insertTextAtCursor("```\n", "\n```")
  const formatImage = () => {
    const textarea = contentTextareaRef.current
    if (!textarea) return
    const imageMarkdown = "![alt text](image-url)"
    insertTextAtCursor(imageMarkdown, "")
  }
  const formatTextColor = () => {
    // Text color in markdown isn't standard, but we can use HTML
    insertTextAtCursor('<span style="color: #000000">', '</span>')
  }

  return (
    <TooltipProvider>
      <div className="fixed inset-0 flex flex-col bg-white overflow-hidden">
        {/* Top Navigation Bar */}
        <div className="border-b border-gray-200 px-6 py-3 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="Back to Posts"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-gray-600">Posts</span>
          </div>

          {/* URL Bar */}
          <div className="flex-1 flex justify-center">
            <div className="flex h-8 w-[500px] items-center gap-2 rounded-full bg-gray-100 px-6 py-0.5">
              <Input
                className="h-auto border-0 bg-transparent p-0 text-sm text-gray-500 outline-none focus-visible:ring-0"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
              <div className="flex-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    aria-label="Preview your post"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Preview your post</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white h-8 px-4"
              size="sm"
            >
              Publish
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>


        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 bg-gray-50 overflow-hidden flex pt-8">
            <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col min-h-0 rounded-t-lg shadow-sm overflow-hidden">
              {/* Editor Toolbar */}
              <div className="border-b border-gray-200 px-6 py-2 flex items-center gap-1 bg-white">
                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-md text-gray-500"
                        aria-label="Text Color"
                        onClick={formatTextColor}
                      >
                        <span className="text-sm font-bold">A</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Text Color</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-md text-gray-500"
                        aria-label="Heading 2"
                        onClick={formatHeading2}
                      >
                        <Heading2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Heading 2</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-md text-gray-500"
                        aria-label="Heading 3"
                        onClick={formatHeading3}
                      >
                        <Heading3 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Heading 3</TooltipContent>
                  </Tooltip>
                </div>

                <div className="h-4 w-px bg-gray-200 mx-1" />

                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-md text-gray-500"
                        aria-label="Bold"
                        onClick={formatBold}
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Bold</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-md text-gray-500"
                        aria-label="Italic"
                        onClick={formatItalic}
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Italic</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-md text-gray-500"
                        aria-label="Strikethrough"
                        onClick={formatStrikethrough}
                      >
                        <Strikethrough className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Strikethrough</TooltipContent>
                  </Tooltip>
                </div>

                <div className="h-4 w-px bg-gray-200 mx-1" />

                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-md text-gray-500"
                        aria-label="Bullet List"
                        onClick={formatBulletList}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Bullet List</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-md text-gray-500"
                        aria-label="Numbered List"
                        onClick={formatNumberedList}
                      >
                        <ListOrdered className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Numbered List</TooltipContent>
                  </Tooltip>
                </div>

                <div className="h-4 w-px bg-gray-200 mx-1" />

                <div className="flex items-center gap-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-md text-gray-500"
                        aria-label="Quote"
                        onClick={formatQuote}
                      >
                        <Quote className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Quote</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-md text-gray-500"
                        aria-label="Code Block"
                        onClick={formatCodeBlock}
                      >
                        <Code className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Code Block</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-md text-gray-500"
                        aria-label="Image"
                        onClick={formatImage}
                      >
                        <ImageIcon className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Image</TooltipContent>
                  </Tooltip>
                </div>

                <div className="h-4 w-px bg-gray-200 mx-1" />

                <div className="flex-1" />
              </div>

              <div className="bg-white flex-1 flex flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Title */}
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-3xl font-medium mb-4 border-none outline-none bg-transparent placeholder:text-gray-400 focus:ring-0"
                    placeholder="Enter a title..."
                  />

                  {/* Description */}
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-lg text-gray-600 mb-6 border-none outline-none bg-transparent placeholder:text-gray-400 focus:ring-0"
                    placeholder="What will your readers learn?"
                  />

                  <div className="h-px w-full bg-gray-200 mb-6" />

                  {/* Content Editor */}
                  <div className="prose prose-lg max-w-none h-full">
                    <textarea
                      ref={contentTextareaRef}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full min-h-full border-none outline-none resize-none text-base text-gray-700 placeholder:text-gray-400 bg-transparent focus:ring-0"
                      placeholder="Start writing..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-12 border-l border-gray-200 bg-white flex flex-col items-center py-4 gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-md text-red-500 hover:bg-red-50"
                  aria-label="AI Assistant"
                >
                  <Sparkles className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">AI Assistant</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-md text-gray-500 hover:bg-gray-50"
                  aria-label="Media"
                >
                  <PictureInPicture className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Media</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-md text-gray-500 hover:bg-gray-50"
                  aria-label="SEO"
                >
                  <Brain className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">SEO</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-md text-gray-500 hover:bg-gray-50"
                  aria-label="Comments"
                >
                  <MessageSquare className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Comments</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-md text-gray-500 hover:bg-gray-50"
                  aria-label="Search"
                >
                  <Search className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Search</TooltipContent>
            </Tooltip>

            <div className="flex-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-md text-gray-500 hover:bg-gray-50"
                  aria-label="More Options"
                >
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">More Options</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

export default BaseWriter
