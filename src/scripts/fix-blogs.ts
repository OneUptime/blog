#!/usr/bin/env npx ts-node

/**
 * Blog Fix Script
 *
 * This script automatically fixes common blog validation issues:
 * 1. Removes duplicate entries from Blogs.json
 * 2. Trims whitespace from titles and descriptions
 * 3. Syncs Blogs.json with README.md content (README is source of truth)
 *
 * Run with: npx ts-node src/scripts/fix-blogs.ts
 */

import * as fs from 'fs';
import * as path from 'path';

// Constants
const POSTS_DIR = 'posts';
const BLOGS_JSON = 'Blogs.json';

// Types
interface BlogEntry {
  title: string;
  description: string;
  authorGitHubUsername: string;
  tags: string[];
  post: string;
}

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
} as const;

function logInfo(msg: string): void {
  console.log(`${colors.blue}INFO:${colors.reset} ${msg}`);
}

function logSuccess(msg: string): void {
  console.log(`${colors.green}FIXED:${colors.reset} ${msg}`);
}

function logWarning(msg: string): void {
  console.log(`${colors.yellow}WARNING:${colors.reset} ${msg}`);
}

/**
 * Read and parse Blogs.json
 */
function readBlogsJson(): BlogEntry[] {
  const content = fs.readFileSync(BLOGS_JSON, 'utf8');
  return JSON.parse(content) as BlogEntry[];
}

/**
 * Parse README.md to extract metadata
 */
function parseReadme(dir: string): { title: string; author: string; tags: string[]; description: string } | null {
  const readmePath = path.join(POSTS_DIR, dir, 'README.md');
  
  if (!fs.existsSync(readmePath)) {
    return null;
  }
  
  const content = fs.readFileSync(readmePath, 'utf8');
  const lines = content.split('\n');
  
  let title = '';
  let author = '';
  let tags: string[] = [];
  let description = '';
  
  // Extract title (first line starting with #)
  if (lines[0] && lines[0].startsWith('# ')) {
    title = lines[0].substring(2).trim();
  }
  
  // Extract author
  const authorLine = lines.find((l) => l.startsWith('Author:'));
  if (authorLine) {
    const authorMatch = authorLine.match(/\[([^\]]+)\]/);
    if (authorMatch) {
      author = authorMatch[1];
    }
  }
  
  // Extract tags
  const tagsLine = lines.find((l) => l.startsWith('Tags:'));
  if (tagsLine) {
    tags = tagsLine
      .substring(5)
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }
  
  // Extract description
  const descLine = lines.find((l) => l.startsWith('Description:'));
  if (descLine) {
    description = descLine.substring(12).trim();
  }
  
  return { title, author, tags, description };
}

/**
 * Remove duplicates from Blogs.json (keep first occurrence)
 */
function removeDuplicates(blogs: BlogEntry[]): { blogs: BlogEntry[]; removed: number } {
  const seen = new Set<string>();
  const uniqueBlogs: BlogEntry[] = [];
  let removed = 0;
  
  for (const blog of blogs) {
    if (!seen.has(blog.post)) {
      seen.add(blog.post);
      uniqueBlogs.push(blog);
    } else {
      removed++;
    }
  }
  
  return { blogs: uniqueBlogs, removed };
}

/**
 * Fix whitespace in titles and descriptions
 */
function fixWhitespace(blogs: BlogEntry[]): number {
  let fixed = 0;
  
  for (const blog of blogs) {
    const trimmedTitle = blog.title.trim();
    const trimmedDesc = blog.description.trim();
    
    if (blog.title !== trimmedTitle || blog.description !== trimmedDesc) {
      blog.title = trimmedTitle;
      blog.description = trimmedDesc;
      fixed++;
    }
  }
  
  return fixed;
}

/**
 * Sync Blogs.json entries with README content
 */
function syncWithReadme(blogs: BlogEntry[]): number {
  let synced = 0;
  
  for (const blog of blogs) {
    const readme = parseReadme(blog.post);
    
    if (!readme) {
      continue;
    }
    
    let changed = false;
    
    // Sync title
    if (readme.title && readme.title !== blog.title) {
      blog.title = readme.title;
      changed = true;
    }
    
    // Sync author
    if (readme.author && readme.author !== blog.authorGitHubUsername) {
      blog.authorGitHubUsername = readme.author;
      changed = true;
    }
    
    // Sync tags (if README has tags)
    if (readme.tags.length > 0) {
      const sortedReadmeTags = [...readme.tags].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      const sortedBlogTags = [...blog.tags].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
      
      if (JSON.stringify(sortedReadmeTags) !== JSON.stringify(sortedBlogTags)) {
        blog.tags = readme.tags;
        changed = true;
      }
    }
    
    // Sync description
    if (readme.description && readme.description !== blog.description) {
      blog.description = readme.description;
      changed = true;
    }
    
    if (changed) {
      synced++;
    }
  }
  
  return synced;
}

/**
 * Sort blogs by date
 */
function sortByDate(blogs: BlogEntry[]): BlogEntry[] {
  return [...blogs].sort((a, b) => {
    const dateA = a.post.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || '1970-01-01';
    const dateB = b.post.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || '1970-01-01';
    return new Date(dateA).getTime() - new Date(dateB).getTime();
  });
}

/**
 * Main function
 */
function main(): void {
  console.log(`\n${colors.bold}=== Blog Fix Script ===${colors.reset}\n`);
  
  // Read Blogs.json
  logInfo('Reading Blogs.json...');
  let blogs = readBlogsJson();
  logInfo(`Found ${blogs.length} entries`);
  
  // Remove duplicates
  logInfo('Removing duplicates...');
  const { blogs: uniqueBlogs, removed } = removeDuplicates(blogs);
  blogs = uniqueBlogs;
  if (removed > 0) {
    logSuccess(`Removed ${removed} duplicate entries`);
  } else {
    logInfo('No duplicates found');
  }
  
  // Fix whitespace
  logInfo('Fixing whitespace...');
  const whitespaceFixed = fixWhitespace(blogs);
  if (whitespaceFixed > 0) {
    logSuccess(`Fixed whitespace in ${whitespaceFixed} entries`);
  } else {
    logInfo('No whitespace issues found');
  }
  
  // Sync with README
  logInfo('Syncing with README files...');
  const synced = syncWithReadme(blogs);
  if (synced > 0) {
    logSuccess(`Synced ${synced} entries with README content`);
  } else {
    logInfo('All entries already in sync');
  }
  
  // Sort by date
  logInfo('Sorting by date...');
  blogs = sortByDate(blogs);
  logSuccess('Sorted entries by date');
  
  // Write back to Blogs.json
  logInfo('Writing Blogs.json...');
  fs.writeFileSync(BLOGS_JSON, JSON.stringify(blogs, null, 2) + '\n', 'utf8');
  logSuccess('Blogs.json updated successfully');
  
  console.log(`\n${colors.bold}=== Summary ===${colors.reset}`);
  console.log(`  Duplicates removed: ${removed}`);
  console.log(`  Whitespace fixed: ${whitespaceFixed}`);
  console.log(`  Entries synced with README: ${synced}`);
  console.log(`  Total entries: ${blogs.length}`);
  console.log(`\n${colors.green}${colors.bold}Done!${colors.reset} Run 'npm run validate' to verify.\n`);
}

main();
