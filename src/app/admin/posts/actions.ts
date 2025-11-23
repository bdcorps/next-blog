'use server'

import { AdminPost, getPosts } from '@/lib/get-posts'

export async function fetchAdminPosts(): Promise<AdminPost[]> {
  return await getPosts()
}

