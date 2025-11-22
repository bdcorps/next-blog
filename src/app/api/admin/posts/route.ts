import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import matter from 'gray-matter'
import yaml from 'js-yaml'

const POSTS_DIR = path.join(process.cwd(), 'content/posts')

// GET - List all posts
export async function GET() {
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
    
    return NextResponse.json(posts)
  } catch (error) {
    console.error('Error reading posts:', error)
    return NextResponse.json({ error: 'Failed to read posts' }, { status: 500 })
  }
}

// POST - Create new post
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, date, tags, description, enableComment, content } = body
    
    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }
    
    // Generate slug from title
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
    
    const fileName = `${slug}.mdx`
    const filePath = path.join(POSTS_DIR, fileName)
    
    // Check if file already exists
    try {
      await fs.access(filePath)
      return NextResponse.json({ error: 'Post with this title already exists' }, { status: 400 })
    } catch {
      // File doesn't exist, proceed
    }
    
    // Create frontmatter
    const frontmatter = {
      title,
      date: date || new Date().toISOString().split('T')[0],
      tags: tags || [],
      description: description || '',
      enableComment: enableComment !== undefined ? enableComment : true
    }
    
    // Write file using YAML for proper formatting
    const yamlFrontmatter = yaml.dump(frontmatter, {
      lineWidth: -1,
      noRefs: true,
      quotingType: '"',
    }).trim()
    const fileContent = `---\n${yamlFrontmatter}\n---\n\n${content}`
    
    await fs.writeFile(filePath, fileContent, 'utf-8')
    
    return NextResponse.json({ success: true, slug, fileName })
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
  }
}
