import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'
import matter from 'gray-matter'
import yaml from 'js-yaml'

const POSTS_DIR = path.join(process.cwd(), 'content/posts')

// GET - Get single post
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const filePath = path.join(POSTS_DIR, `${slug}.mdx`)
    
    try {
      const content = await fs.readFile(filePath, 'utf-8')
      const { data, content: body } = matter(content)
      
      return NextResponse.json({
        slug,
        title: data.title || '',
        date: data.date || '',
        tags: data.tags || [],
        description: data.description || '',
        enableComment: data.enableComment || false,
        content: body
      })
    } catch {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error reading post:', error)
    return NextResponse.json({ error: 'Failed to read post' }, { status: 500 })
  }
}

// PUT - Update post
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()
    const { title, date, tags, description, enableComment, content, newSlug } = body
    
    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }
    
    const oldFilePath = path.join(POSTS_DIR, `${slug}.mdx`)
    const newSlugValue = newSlug || slug
    const newFilePath = path.join(POSTS_DIR, `${newSlugValue}.mdx`)
    
    // Check if old file exists
    try {
      await fs.access(oldFilePath)
    } catch {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    
    // If slug changed, check if new file already exists
    if (newSlugValue !== slug) {
      try {
        await fs.access(newFilePath)
        return NextResponse.json({ error: 'Post with this slug already exists' }, { status: 400 })
      } catch {
        // New file doesn't exist, proceed
      }
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
    
    // If slug changed, delete old file
    if (newSlugValue !== slug) {
      await fs.unlink(oldFilePath)
    }
    
    await fs.writeFile(newFilePath, fileContent, 'utf-8')
    
    return NextResponse.json({ success: true, slug: newSlugValue })
  } catch (error) {
    console.error('Error updating post:', error)
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
  }
}

// DELETE - Delete post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const filePath = path.join(POSTS_DIR, `${slug}.mdx`)
    
    try {
      await fs.unlink(filePath)
      return NextResponse.json({ success: true })
    } catch {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error deleting post:', error)
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
}
