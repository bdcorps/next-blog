'use client'

import { Post } from '@/app/admin/posts/[slug]/page'
import { PostList } from '@/components/admin/post-list'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { fetchAdminPosts } from './actions'

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const fetchPosts = async () => {
    try {
      const data = await fetchAdminPosts()
      setPosts(data)
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  const handleEdit = (post: Post) => {
    router.push(`/admin/posts/${post.slug}`)
  }

  const handleDelete = () => {
    fetchPosts()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Posts</h1>
        <Button onClick={() => router.push('/admin/posts/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Post
        </Button>
      </div>
      <PostList posts={posts} onEdit={handleEdit} onDelete={handleDelete} />
    </div>
  )
}

