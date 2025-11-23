'use client'

import BaseWriter from '@/components/base-writer'
import { useEffect, useState } from 'react'

export type Post = {
  slug: string
  title: string
  date: string
  tags: string[]
  description: string
  enableComment: boolean
  content: string
  filePath?: string
}

export default function AdminPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/admin/posts')
      if (response.ok) {
        const data = await response.json()
        setPosts(data)
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  const handleCreate = () => {
    setIsCreating(true)
    setEditingPost(null)
  }

  const handleEdit = (post: Post) => {
    setEditingPost(post)
    setIsCreating(false)
  }

  const handleSave = async () => {
    await fetchPosts()
    setEditingPost(null)
    setIsCreating(false)
  }

  const handleDelete = async () => {
    await fetchPosts()
    setEditingPost(null)
    setIsCreating(false)
  }

  const handleCancel = () => {
    setEditingPost(null)
    setIsCreating(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="bg-background">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <BaseWriter />
      </div>
    </div>
  )
}
