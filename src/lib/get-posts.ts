import { promises as fs } from 'fs'
import matter from 'gray-matter'
import path from 'path'

const POSTS_DIR = path.join(process.cwd(), 'content/posts')

export type AdminPost = {
  slug: string
  title: string
  date: string
  tags: string[]
  description: string
  enableComment: boolean
  content: string
  filePath?: string
}

export async function getPosts(): Promise<AdminPost[]> {
  try {
    const files = await fs.readdir(POSTS_DIR)
    const posts = await Promise.all(
      files
        .filter(file => file.endsWith('.mdx') && file !== 'index.mdx')
        .map(async (file) => {
          const filePath = path.join(POSTS_DIR, file)
          const content = await fs.readFile(filePath, 'utf-8')
          const { data, content: body } = matter(content)
          const slug = file.replace('.mdx', '')

          return {
            slug,
            title: data.title || '',
            date: data.date || '',
            tags: data.tags || [],
            description: data.description || '',
            enableComment: data.enableComment || false,
            content: body,
            filePath: file
          }
        })
    )

    // Sort by date descending
    posts.sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      return dateB - dateA
    })

    return posts
  } catch (error) {
    console.error('Error reading posts:', error)
    return []
  }
}

