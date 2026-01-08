#!/usr/bin/env npx ts-node

/**
 * Blog Validation Script
 *
 * This script validates that all blog posts follow the correct format:
 * 1. Each directory in posts/ has a corresponding entry in Blogs.json
 * 2. Each Blogs.json entry has a corresponding directory in posts/
 * 3. Each blog post has a README.md with correct format (Title, Author, Tags, Description)
 * 4. Each blog post has a social-media.png image
 * 5. Sorts Blogs.json by date (oldest first, newest last)
 * 6. Generates Tags.md automatically from all tags in Blogs.json (sorted alphabetically)
 *
 * Run with: npm run validate
 */

import * as fs from 'fs';
import * as path from 'path';

// Constants
const POSTS_DIR = 'posts';
const BLOGS_JSON = 'Blogs.json';
const TAGS_MD = 'Tags.md';

// Types
interface BlogEntry {
  title: string;
  description: string;
  authorGitHubUsername: string;
  tags: string[];
  post: string;
}

interface FormatIssue {
  type: 'error' | 'warning';
  message: string;
  fix: string;
}

interface BlogIssue {
  dir: string;
  issues: FormatIssue[];
}

// ANSI color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
} as const;

// Logging functions
function logError(msg: string): void {
  console.error(`${colors.red}${colors.bold}ERROR:${colors.reset} ${msg}`);
}

function logSuccess(msg: string): void {
  console.log(`${colors.green}${colors.bold}OK:${colors.reset} ${msg}`);
}

function logHeader(msg: string): void {
  console.log(`\n${colors.bold}=== ${msg} ===${colors.reset}\n`);
}

// Validation state
let hasErrors = false;
let hasWarnings = false;

/**
 * Check if required files exist
 */
function checkRequiredFiles(): void {
  if (!fs.existsSync(BLOGS_JSON)) {
    logError(`${BLOGS_JSON} not found in the current directory.`);
    process.exit(1);
  }

  if (!fs.existsSync(POSTS_DIR)) {
    logError(`${POSTS_DIR}/ directory not found.`);
    process.exit(1);
  }
}

/**
 * Read and parse Blogs.json
 */
function readBlogsJson(): BlogEntry[] {
  try {
    const content = fs.readFileSync(BLOGS_JSON, 'utf8');
    return JSON.parse(content) as BlogEntry[];
  } catch (e) {
    const error = e as Error;
    logError(`Failed to parse ${BLOGS_JSON}: ${error.message}`);
    logError('Make sure the JSON is valid. You can use a JSON validator to check for syntax errors.');
    process.exit(1);
  }
}

/**
 * Get all directories in posts/
 */
function getPostDirectories(): string[] {
  return fs.readdirSync(POSTS_DIR).filter((f) =>
    fs.statSync(path.join(POSTS_DIR, f)).isDirectory()
  );
}

/**
 * Check for directories missing from Blogs.json
 */
function checkMissingInJson(postsDir: string[], blogPosts: string[]): string[] {
  logHeader('Checking for directories missing from Blogs.json');
  const missingInJson = postsDir.filter((dir) => !blogPosts.includes(dir));

  if (missingInJson.length > 0) {
    hasErrors = true;
    logError(
      `Found ${missingInJson.length} director${missingInJson.length === 1 ? 'y' : 'ies'} not listed in ${BLOGS_JSON}:\n`
    );
    missingInJson.forEach((dir) => {
      console.log(`  - ${colors.red}${dir}${colors.reset}`);
    });
    console.log(`
${colors.bold}How to fix:${colors.reset}
  Add an entry to ${BLOGS_JSON} for each missing directory. Example:

  {
    "title": "Your Blog Post Title",
    "description": "A one-liner description of the post",
    "authorGitHubUsername": "yourgithubusername",
    "tags": ["Tag1", "Tag2"],
    "post": "${missingInJson[0] || 'YYYY-MM-DD-title-of-post'}"
  }
`);
  } else {
    logSuccess('All directories are listed in Blogs.json');
  }

  return missingInJson;
}

/**
 * Check for Blogs.json entries missing directories
 */
function checkMissingDirs(postsDir: string[], blogPosts: string[]): string[] {
  logHeader('Checking for Blogs.json entries missing directories');
  const missingDirs = blogPosts.filter((post) => !postsDir.includes(post));

  if (missingDirs.length > 0) {
    hasErrors = true;
    logError(
      `Found ${missingDirs.length} ${BLOGS_JSON} entr${missingDirs.length === 1 ? 'y' : 'ies'} with no corresponding directory:\n`
    );
    missingDirs.forEach((post) => {
      console.log(`  - ${colors.red}${post}${colors.reset}`);
    });
    console.log(`
${colors.bold}How to fix:${colors.reset}
  Either:
  1. Create the missing directory: mkdir -p ${POSTS_DIR}/${missingDirs[0] || 'YYYY-MM-DD-title-of-post'}
  2. Or remove the entry from ${BLOGS_JSON} if it was added by mistake
`);
  } else {
    logSuccess('All Blogs.json entries have corresponding directories');
  }

  return missingDirs;
}

/**
 * Validate README.md format for a single blog post
 */
function validateReadme(dir: string): FormatIssue[] {
  const readmePath = path.join(POSTS_DIR, dir, 'README.md');
  const issues: FormatIssue[] = [];

  if (!fs.existsSync(readmePath)) {
    issues.push({
      type: 'error',
      message: 'Missing README.md file',
      fix: `Create a README.md file in ${POSTS_DIR}/${dir}/ with the required format`,
    });
    return issues;
  }

  const content = fs.readFileSync(readmePath, 'utf8');
  const lines = content.split('\n');

  // Check for title (# Title)
  if (!lines[0] || !lines[0].startsWith('# ')) {
    issues.push({
      type: 'error',
      message: 'Missing or incorrect title format',
      fix: 'First line must be a title starting with "# " (hash followed by space)',
    });
  }

  // Check for Author line
  const authorLine = lines.find((l) => l.startsWith('Author:'));
  if (!authorLine) {
    issues.push({
      type: 'error',
      message: 'Missing Author line',
      fix: 'Add a line: Author: [githubusername](https://www.github.com/githubusername)',
    });
  } else if (!authorLine.includes('github.com')) {
    issues.push({
      type: 'warning',
      message: 'Author line may not have proper GitHub link format',
      fix: 'Use format: Author: [githubusername](https://www.github.com/githubusername)',
    });
  }

  // Check for Tags line
  const tagsLine = lines.find((l) => l.startsWith('Tags:'));
  if (!tagsLine) {
    issues.push({
      type: 'error',
      message: 'Missing Tags line',
      fix: 'Add a line: Tags: Tag1, Tag2, Tag3',
    });
  }

  // Check for Description line
  const descLine = lines.find((l) => l.startsWith('Description:'));
  if (!descLine) {
    issues.push({
      type: 'error',
      message: 'Missing Description line',
      fix: 'Add a line: Description: One liner description of the post',
    });
  }

  return issues;
}

/**
 * Check if social-media.png exists
 */
function checkSocialMedia(dir: string): FormatIssue | null {
  const socialMediaPath = path.join(POSTS_DIR, dir, 'social-media.png');

  if (!fs.existsSync(socialMediaPath)) {
    return {
      type: 'error',
      message: 'Missing social-media.png',
      fix: `Add a social-media.png image (1280x720 pixels) to ${POSTS_DIR}/${dir}/`,
    };
  }

  return null;
}

/**
 * Extract all unique tags from Blogs.json and generate Tags.md
 * Deduplicates tags case-insensitively (keeps first occurrence)
 */
function generateTagsMd(blogsJson: BlogEntry[]): void {
  logHeader('Generating Tags.md');

  // Extract all tags, deduplicating case-insensitively
  // Map key is lowercase tag, value is the original tag (first occurrence)
  const tagMap: Map<string, string> = new Map();
  for (const blog of blogsJson) {
    if (blog.tags && Array.isArray(blog.tags)) {
      for (const tag of blog.tags) {
        const lowerTag = tag.toLowerCase();
        if (!tagMap.has(lowerTag)) {
          tagMap.set(lowerTag, tag);
        }
      }
    }
  }

  // Get unique tags and sort alphabetically (case-insensitive)
  const sortedTags = Array.from(tagMap.values()).sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  // Generate Tags.md content
  const content = `# Tags\n\n${sortedTags.map((tag) => `- ${tag}`).join('\n')}\n`;

  // Write to Tags.md
  fs.writeFileSync(TAGS_MD, content, 'utf8');

  logSuccess(`Generated ${TAGS_MD} with ${sortedTags.length} unique tags`);
}

/**
 * Extract date from post field (format: YYYY-MM-DD-title)
 */
function extractDateFromPost(post: string): Date {
  const match = post.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) {
    return new Date(match[1]);
  }
  // Return a very old date if no date found, so it goes to the beginning
  return new Date('1970-01-01');
}

/**
 * Sort Blogs.json by date (oldest first, newest last) and save
 */
function sortBlogsByDate(blogsJson: BlogEntry[]): BlogEntry[] {
  logHeader('Sorting Blogs.json by date');

  const sortedBlogs = [...blogsJson].sort((a, b) => {
    const dateA = extractDateFromPost(a.post);
    const dateB = extractDateFromPost(b.post);
    return dateA.getTime() - dateB.getTime();
  });

  // Write sorted blogs back to Blogs.json
  fs.writeFileSync(BLOGS_JSON, JSON.stringify(sortedBlogs, null, 2) + '\n', 'utf8');

  logSuccess(`Sorted ${BLOGS_JSON} by date (oldest first, newest last)`);

  return sortedBlogs;
}

/**
 * Validate all blog posts format
 */
function validateAllPosts(postsDir: string[]): BlogIssue[] {
  logHeader('Validating README.md format');
  const formatIssues: BlogIssue[] = [];

  for (const dir of postsDir) {
    const issues: FormatIssue[] = [];

    // Validate README.md
    const readmeIssues = validateReadme(dir);
    issues.push(...readmeIssues);

    // Check social-media.png
    const socialMediaIssue = checkSocialMedia(dir);
    if (socialMediaIssue) {
      issues.push(socialMediaIssue);
    }

    if (issues.length > 0) {
      formatIssues.push({ dir, issues });
    }
  }

  return formatIssues;
}

/**
 * Display format issues
 */
function displayFormatIssues(formatIssues: BlogIssue[]): void {
  if (formatIssues.length > 0) {
    console.log(
      `Found issues in ${formatIssues.length} blog post${formatIssues.length === 1 ? '' : 's'}:\n`
    );

    formatIssues.forEach(({ dir, issues }) => {
      console.log(`${colors.bold}${dir}${colors.reset}`);
      issues.forEach(({ type, message, fix }) => {
        if (type === 'error') {
          hasErrors = true;
          console.log(`  ${colors.red}[ERROR]${colors.reset} ${message}`);
        } else {
          hasWarnings = true;
          console.log(`  ${colors.yellow}[WARNING]${colors.reset} ${message}`);
        }
        console.log(`    ${colors.blue}Fix:${colors.reset} ${fix}`);
      });
      console.log('');
    });

    console.log(`
${colors.bold}Expected README.md format:${colors.reset}

  # Title of the Post

  Author: [githubusername](https://www.github.com/githubusername)

  Tags: Tag1, Tag2, Tag3

  Description: One liner description of the post

  Rest of your post content in markdown...
`);
  } else {
    logSuccess('All README.md files have correct format');
    logSuccess('All social-media.png files are present');
  }
}

/**
 * Display summary and exit with appropriate code
 */
function displaySummary(
  postsDir: string[],
  blogPosts: string[],
  missingInJson: string[],
  missingDirs: string[],
  formatIssues: BlogIssue[]
): void {
  logHeader('Validation Summary');
  console.log(`Total directories in ${POSTS_DIR}/: ${postsDir.length}`);
  console.log(`Total entries in ${BLOGS_JSON}: ${blogPosts.length}`);
  console.log(`Directories missing from ${BLOGS_JSON}: ${missingInJson.length}`);
  console.log(`${BLOGS_JSON} entries missing directory: ${missingDirs.length}`);
  console.log(`Blog posts with format issues: ${formatIssues.length}`);

  if (hasErrors) {
    console.log(`\n${colors.red}${colors.bold}VALIDATION FAILED${colors.reset}`);
    console.log('Please fix the errors above before committing.\n');
    process.exit(1);
  } else if (hasWarnings) {
    console.log(`\n${colors.yellow}${colors.bold}VALIDATION PASSED WITH WARNINGS${colors.reset}`);
    console.log('Consider addressing the warnings above.\n');
    process.exit(0);
  } else {
    console.log(`\n${colors.green}${colors.bold}VALIDATION PASSED${colors.reset}`);
    console.log('All blog posts are correctly formatted.\n');
    process.exit(0);
  }
}

/**
 * Main function
 */
function main(): void {
  // Check required files
  checkRequiredFiles();

  // Read Blogs.json
  const blogsJson = readBlogsJson();

  // Sort Blogs.json by date (oldest first, newest last)
  const sortedBlogs = sortBlogsByDate(blogsJson);
  const blogPosts = sortedBlogs.map((b) => b.post);

  // Generate Tags.md from Blogs.json
  generateTagsMd(sortedBlogs);

  // Get all directories in posts/
  const postsDir = getPostDirectories();

  // Run validations
  const missingInJson = checkMissingInJson(postsDir, blogPosts);
  const missingDirs = checkMissingDirs(postsDir, blogPosts);
  const formatIssues = validateAllPosts(postsDir);

  // Display format issues
  displayFormatIssues(formatIssues);

  // Display summary and exit
  displaySummary(postsDir, blogPosts, missingInJson, missingDirs, formatIssues);
}

// Run the script
main();
