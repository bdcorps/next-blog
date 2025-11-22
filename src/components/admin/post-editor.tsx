'use client'

import { Post } from '@/app/admin/page'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Bold,
  ChevronDown,
  Code,
  Image,
  Info,
  Italic,
  Link,
  List,
  ListOrdered,
  Plus,
  Redo2,
  Settings,
  Strikethrough,
  Trash2,
  Undo2
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type PostEditorProps = {
  post: Post | null
  onSave: () => void
  onCancel: () => void
  onDelete?: () => void
}

export function PostEditor({ post, onSave, onCancel, onDelete }: PostEditorProps) {
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [authors, setAuthors] = useState<string[]>(['Sukhpal Saini'])
  const [tagInput, setTagInput] = useState('')
  const [enableComment, setEnableComment] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef(-1)

  useEffect(() => {
    let initialContent = ''
    if (post) {
      setTitle(post.title)
      setDate(post.date)
      setDescription(post.description)
      initialContent = post.content
      setContent(initialContent)
      setTags(post.tags || [])
      setEnableComment(post.enableComment !== undefined ? post.enableComment : true)
    } else {
      // New post defaults
      setTitle('')
      setDate(new Date().toISOString().split('T')[0])
      setDescription('')
      initialContent = ''
      setContent(initialContent)
      setTags([])
      setEnableComment(true)
    }
    // Initialize history
    historyRef.current = [initialContent]
    historyIndexRef.current = 0
  }, [post])

  const addToHistory = (text: string) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1)
    newHistory.push(text)
    historyRef.current = newHistory.slice(-50) // Keep last 50 states
    historyIndexRef.current = newHistory.length - 1
  }

  const handleUndo = () => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current--
      setContent(historyRef.current[historyIndexRef.current])
    }
  }

  const handleRedo = () => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      historyIndexRef.current++
      setContent(historyRef.current[historyIndexRef.current])
    }
  }

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = contentRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = content.substring(start, end)
    const newText =
      content.substring(0, start) + before + selectedText + after + content.substring(end)

    setContent(newText)
    addToHistory(newText)

    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      const newPos = start + before.length + selectedText.length + after.length
      textarea.setSelectionRange(newPos, newPos)
    }, 0)
  }


  const handleRemoveAuthor = (authorToRemove: string) => {
    setAuthors(authors.filter((author) => author !== authorToRemove))
  }

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleContentChange = (value: string) => {
    setContent(value)
    addToHistory(value)
  }

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Title and content are required')
      return
    }

    setSaving(true)
    try {
      const postData = {
        title: title.trim(),
        date,
        tags,
        description: description.trim(),
        enableComment,
        content: content.trim(),
      }

      if (post) {
        // Update existing post
        const response = await fetch(`/api/admin/posts/${post.slug}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(postData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to update post')
        }
      } else {
        // Create new post
        const response = await fetch('/api/admin/posts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(postData),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to create post')
        }
      }

      onSave()
    } catch (error) {
      console.error('Error saving post:', error)
      alert(error instanceof Error ? error.message : 'Failed to save post')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!post || !onDelete) return

    try {
      const response = await fetch(`/api/admin/posts/${post.slug}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setDeleteDialogOpen(false)
        onDelete()
      } else {
        throw new Error('Failed to delete post')
      }
    } catch (error) {
      console.error('Error deleting post:', error)
      alert('Failed to delete post')
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        {/* Top Bar */}
        <div className="border-b border-border px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-sm text-muted-foreground">Draft</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {saving ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </div>

        {/* Formatting Toolbar */}
        <div className="border-b border-border px-4 py-2 flex items-center justify-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleUndo}
              disabled={historyIndexRef.current <= 0}
            >
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRedo}
              disabled={historyIndexRef.current >= historyRef.current.length - 1}
            >
              <Redo2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          <Button variant="ghost" size="sm" className="h-8">
            Style <ChevronDown className="h-3 w-3 ml-1" />
          </Button>

          <div className="h-4 w-px bg-border mx-1" />

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => insertMarkdown('**', '**')}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => insertMarkdown('*', '*')}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => insertMarkdown('~~', '~~')}
              title="Strikethrough"
            >
              <Strikethrough className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => insertMarkdown('`', '`')}
              title="Code"
            >
              <Code className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => insertMarkdown('[', '](url)')}
              title="Link"
            >
              <Link className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => insertMarkdown('![', '](image-url)')}
              title="Image"
            >
              <Image className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => insertMarkdown('- ', '')}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => insertMarkdown('1. ', '')}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </Button>
          </div>

          <div className="h-4 w-px bg-border mx-1" />

          <Button variant="ghost" size="sm" className="h-8">
            Button <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8">
            More <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="space-y-2">
              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                  className="w-full text-2xl font-medium bg-transparent border-none outline-none placeholder:text-muted-foreground/50 focus:ring-0 p-0"
                />
              </div>

              <div>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a subtitle..."
                  className="w-full text-base text-muted-foreground bg-transparent border-none outline-none placeholder:text-muted-foreground/50 focus:ring-0 p-0"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {authors.map((author) => (
                  <Badge key={author} variant="secondary" className="text-xs px-2 py-0.5">
                    {author}
                    <button
                      onClick={() => handleRemoveAuthor(author)}
                      className="ml-1.5 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
                <button
                  onClick={() => {
                    const newAuthor = prompt('Enter author name:')
                    if (newAuthor && !authors.includes(newAuthor)) {
                      setAuthors([...authors, newAuthor])
                    }
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground px-1.5"
                >
                  +
                </button>
              </div>

              <div>
                <Textarea
                  ref={contentRef}
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Start writing..."
                  className="min-h-[300px] text-sm border-none outline-none resize-none focus:ring-0 p-0 placeholder:text-muted-foreground/50 bg-transparent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Undo2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Info className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                  placeholder="Add a tag and press Enter"
                />
                <Button type="button" onClick={handleAddTag} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="enableComment"
                checked={enableComment}
                onChange={(e) => setEnableComment(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="enableComment" className="text-sm cursor-pointer">
                Enable comments
              </label>
            </div>
            {post && onDelete && (
              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  onClick={() => {
                    setShowSettings(false)
                    setDeleteDialogOpen(true)
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Post
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{post?.title}&quot;? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
