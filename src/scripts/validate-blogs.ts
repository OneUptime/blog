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
 * 7. Cross-validates README.md content against Blogs.json entries (title, description, author, tags)
 * 8. Validates author exists in Authors.json
 * 9. Validates directory name date format (YYYY-MM-DD prefix)
 * 10. Checks for duplicate posts
 * 11. Validates tags are not empty and have no duplicates
 * 12. Validates minimum description length
 * 13. Checks for broken internal cross-reference links between blog posts
 * 14. AUTO-FIX: Automatically adds missing entries to Blogs.json from README.md
 * 15. AUTO-FIX: Automatically generates missing social-media.png images
 * 16. AUTO-FIX: Fixes header spacing (ensures blank lines between metadata lines)
 *
 * Run with: npm run validate
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Constants
const POSTS_DIR = 'posts';
const BLOGS_JSON = 'Blogs.json';
const AUTHORS_JSON = 'Authors.json';
const TAGS_MD = 'Tags.md';
const MIN_DESCRIPTION_LENGTH = 50;
const DATE_PREFIX_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])-/;

// Types
interface BlogEntry {
  title: string;
  description: string;
  authorGitHubUsername: string;
  tags: string[];
  post: string;
}

interface AuthorEntry {
  authorName: string;
  authorBio: string;
}

interface AuthorsJson {
  [username: string]: AuthorEntry;
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

function logInfo(msg: string): void {
  console.log(`${colors.blue}${colors.bold}INFO:${colors.reset} ${msg}`);
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

  if (!fs.existsSync(AUTHORS_JSON)) {
    logError(`${AUTHORS_JSON} not found in the current directory.`);
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
 * Read and parse Authors.json
 */
function readAuthorsJson(): AuthorsJson {
  try {
    const content = fs.readFileSync(AUTHORS_JSON, 'utf8');
    return JSON.parse(content) as AuthorsJson;
  } catch (e) {
    const error = e as Error;
    logError(`Failed to parse ${AUTHORS_JSON}: ${error.message}`);
    logError('Make sure the JSON is valid. You can use a JSON validator to check for syntax errors.');
    process.exit(1);
  }
}

/**
 * Validate directory name format (must start with YYYY-MM-DD-)
 */
function validateDirectoryDateFormat(postsDir: string[]): void {
  logHeader('Validating directory name date format');
  const invalidDirs = postsDir.filter((dir) => !DATE_PREFIX_REGEX.test(dir));

  if (invalidDirs.length > 0) {
    hasErrors = true;
    logError(
      `Found ${invalidDirs.length} director${invalidDirs.length === 1 ? 'y' : 'ies'} with invalid date format:\n`
    );
    invalidDirs.forEach((dir) => {
      console.log(`  - ${colors.red}${dir}${colors.reset}`);
    });
    console.log(`
${colors.bold}How to fix:${colors.reset}
  Directory names must start with a valid date in YYYY-MM-DD format.
  Example: 2025-01-15-my-blog-post-title
`);
  } else {
    logSuccess('All directory names have valid date format (YYYY-MM-DD-)');
  }
}

/**
 * Check for duplicate posts in Blogs.json
 */
function checkDuplicatePosts(blogsJson: BlogEntry[]): void {
  logHeader('Checking for duplicate posts');
  const postCounts = new Map<string, number>();
  
  for (const blog of blogsJson) {
    postCounts.set(blog.post, (postCounts.get(blog.post) || 0) + 1);
  }
  
  const duplicates = Array.from(postCounts.entries()).filter(([_, count]) => count > 1);
  
  if (duplicates.length > 0) {
    hasErrors = true;
    logError(`Found ${duplicates.length} duplicate post${duplicates.length === 1 ? '' : 's'} in ${BLOGS_JSON}:\n`);
    duplicates.forEach(([post, count]) => {
      console.log(`  - ${colors.red}${post}${colors.reset} (appears ${count} times)`);
    });
    console.log(`
${colors.bold}How to fix:${colors.reset}
  Remove duplicate entries from ${BLOGS_JSON}. Each post should only appear once.
`);
  } else {
    logSuccess('No duplicate posts found in Blogs.json');
  }
}

/**
 * Validate authors exist in Authors.json
 */
function validateAuthors(blogsJson: BlogEntry[], authorsJson: AuthorsJson): void {
  logHeader('Validating authors against Authors.json');
  const invalidAuthors: Array<{ post: string; author: string }> = [];
  
  for (const blog of blogsJson) {
    if (!authorsJson[blog.authorGitHubUsername]) {
      invalidAuthors.push({ post: blog.post, author: blog.authorGitHubUsername });
    }
  }
  
  if (invalidAuthors.length > 0) {
    hasErrors = true;
    logError(`Found ${invalidAuthors.length} post${invalidAuthors.length === 1 ? '' : 's'} with invalid authors:\n`);
    invalidAuthors.forEach(({ post, author }) => {
      console.log(`  - ${colors.red}${post}${colors.reset}: author "${author}" not in ${AUTHORS_JSON}`);
    });
    console.log(`
${colors.bold}How to fix:${colors.reset}
  Either add the author to ${AUTHORS_JSON}:

  "${invalidAuthors[0]?.author || 'username'}": {
    "authorName": "Full Name",
    "authorBio": "Author bio text"
  }

  Or fix the authorGitHubUsername in ${BLOGS_JSON} to match an existing author.
`);
  } else {
    logSuccess('All authors are valid and exist in Authors.json');
  }
}

/**
 * Validate Blogs.json entry fields
 */
function validateBlogEntries(blogsJson: BlogEntry[]): void {
  logHeader('Validating Blogs.json entry fields');
  const issues: Array<{ post: string; problems: string[] }> = [];
  
  for (const blog of blogsJson) {
    const problems: string[] = [];
    
    // Check for empty or missing title
    if (!blog.title || blog.title.trim().length === 0) {
      problems.push('Missing or empty title');
    } else if (blog.title !== blog.title.trim()) {
      problems.push('Title has leading/trailing whitespace');
    }
    
    // Check for empty or short description
    if (!blog.description || blog.description.trim().length === 0) {
      problems.push('Missing or empty description');
    } else if (blog.description.trim().length < MIN_DESCRIPTION_LENGTH) {
      problems.push(`Description too short (${blog.description.trim().length} chars, minimum ${MIN_DESCRIPTION_LENGTH})`);
    } else if (blog.description !== blog.description.trim()) {
      problems.push('Description has leading/trailing whitespace');
    }
    
    // Check for empty tags
    if (!blog.tags || !Array.isArray(blog.tags) || blog.tags.length === 0) {
      problems.push('Missing or empty tags array');
    } else {
      // Check for empty tag strings
      const emptyTags = blog.tags.filter((t) => !t || t.trim().length === 0);
      if (emptyTags.length > 0) {
        problems.push(`Found ${emptyTags.length} empty tag${emptyTags.length === 1 ? '' : 's'}`);
      }
      
      // Check for duplicate tags (case-insensitive)
      const lowerTags = blog.tags.map((t) => t.toLowerCase());
      const uniqueLowerTags = new Set(lowerTags);
      if (lowerTags.length !== uniqueLowerTags.size) {
        problems.push('Tags contain duplicates (case-insensitive)');
      }
    }
    
    // Check for empty author
    if (!blog.authorGitHubUsername || blog.authorGitHubUsername.trim().length === 0) {
      problems.push('Missing or empty authorGitHubUsername');
    }
    
    // Check for empty post
    if (!blog.post || blog.post.trim().length === 0) {
      problems.push('Missing or empty post field');
    }
    
    if (problems.length > 0) {
      issues.push({ post: blog.post || '(unknown)', problems });
    }
  }
  
  if (issues.length > 0) {
    hasErrors = true;
    logError(`Found ${issues.length} post${issues.length === 1 ? '' : 's'} with field issues:\n`);
    issues.forEach(({ post, problems }) => {
      console.log(`  ${colors.bold}${post}${colors.reset}`);
      problems.forEach((p) => console.log(`    - ${colors.red}${p}${colors.reset}`));
    });
    console.log('');
  } else {
    logSuccess('All Blogs.json entries have valid fields');
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
 * Parse README.md and extract blog entry data
 */
function parseReadmeForBlogEntry(dir: string): BlogEntry | null {
  const readmePath = path.join(POSTS_DIR, dir, 'README.md');
  
  if (!fs.existsSync(readmePath)) {
    return null;
  }
  
  const content = fs.readFileSync(readmePath, 'utf8');
  const lines = content.split('\n');
  
  // Extract title (# Title)
  let title = '';
  if (lines[0] && lines[0].startsWith('# ')) {
    title = lines[0].substring(2).trim();
  }
  
  // Extract author
  let authorGitHubUsername = '';
  const authorLine = lines.find((l) => l.startsWith('Author:'));
  if (authorLine) {
    const authorMatch = authorLine.match(/\[([^\]]+)\]/);
    if (authorMatch) {
      authorGitHubUsername = authorMatch[1];
    }
  }
  
  // Extract tags
  let tags: string[] = [];
  const tagsLine = lines.find((l) => l.startsWith('Tags:'));
  if (tagsLine) {
    tags = tagsLine
      .substring(5)
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
  }
  
  // Extract description
  let description = '';
  const descLine = lines.find((l) => l.startsWith('Description:'));
  if (descLine) {
    description = descLine.substring(12).trim();
  }
  
  // Validate we have enough data
  if (!title || !authorGitHubUsername || tags.length === 0 || !description) {
    return null;
  }
  
  return {
    title,
    description,
    authorGitHubUsername,
    tags,
    post: dir,
  };
}

/**
 * Auto-add missing entries to Blogs.json from README.md
 */
function autoAddMissingEntries(missingDirs: string[], blogsJson: BlogEntry[]): { added: string[]; failed: string[] } {
  const added: string[] = [];
  const failed: string[] = [];
  
  for (const dir of missingDirs) {
    const entry = parseReadmeForBlogEntry(dir);
    if (entry) {
      blogsJson.push(entry);
      added.push(dir);
    } else {
      failed.push(dir);
    }
  }
  
  return { added, failed };
}

/**
 * Generate missing social media images using the generate-social-image script
 */
function generateMissingSocialImages(): void {
  logHeader('Generating missing social media images');
  
  try {
    logInfo('Running social media image generator with --all flag...');
    execSync('npx ts-node src/scripts/generate-social-image.ts --all', {
      cwd: process.cwd(),
      stdio: 'inherit',
    });
    logSuccess('Social media image generation completed');
  } catch (error) {
    const err = error as Error;
    logError(`Failed to generate social media images: ${err.message}`);
    hasErrors = true;
  }
}

/**
 * Check for directories missing from Blogs.json and auto-add them
 */
function checkMissingInJson(postsDir: string[], blogPosts: string[], blogsJson: BlogEntry[]): string[] {
  logHeader('Checking for directories missing from Blogs.json');
  const missingInJson = postsDir.filter((dir) => !blogPosts.includes(dir));

  if (missingInJson.length > 0) {
    logInfo(`Found ${missingInJson.length} director${missingInJson.length === 1 ? 'y' : 'ies'} not listed in ${BLOGS_JSON}`);
    console.log('');
    
    // Attempt to auto-add entries from README.md
    logInfo('Attempting to auto-add entries from README.md...\n');
    const { added, failed } = autoAddMissingEntries(missingInJson, blogsJson);
    
    if (added.length > 0) {
      logSuccess(`Auto-added ${added.length} entr${added.length === 1 ? 'y' : 'ies'} to ${BLOGS_JSON}:`);
      added.forEach((dir) => {
        console.log(`  - ${colors.green}${dir}${colors.reset}`);
      });
      console.log('');
    }
    
    if (failed.length > 0) {
      hasErrors = true;
      logError(`Could not auto-add ${failed.length} entr${failed.length === 1 ? 'y' : 'ies'} (missing or incomplete README.md):`);
      failed.forEach((dir) => {
        console.log(`  - ${colors.red}${dir}${colors.reset}`);
      });
      console.log(`
${colors.bold}How to fix:${colors.reset}
  Ensure each blog has a properly formatted README.md with:
  - Title (# Title on first line)
  - Author: [username](https://www.github.com/username)
  - Tags: Tag1, Tag2, Tag3
  - Description: One liner description

  Or manually add an entry to ${BLOGS_JSON}:

  {
    "title": "Your Blog Post Title",
    "description": "A one-liner description of the post",
    "authorGitHubUsername": "yourgithubusername",
    "tags": ["Tag1", "Tag2"],
    "post": "${failed[0] || 'YYYY-MM-DD-title-of-post'}"
  }
`);
    }
    
    // Return only the failed ones as truly missing
    return failed;
  } else {
    logSuccess('All directories are listed in Blogs.json');
  }

  return [];
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
 * Validate README.md format for a single blog post and cross-validate with Blogs.json
 */
function validateReadme(dir: string, blogEntry: BlogEntry | undefined): FormatIssue[] {
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
  } else {
    const readmeTitle = lines[0].substring(2).trim();
    
    // Cross-validate title with Blogs.json
    if (blogEntry && readmeTitle !== blogEntry.title) {
      issues.push({
        type: 'error',
        message: `Title mismatch: README has "${readmeTitle}" but Blogs.json has "${blogEntry.title}"`,
        fix: 'Update either README.md or Blogs.json so titles match exactly',
      });
    }
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
  } else if (blogEntry) {
    // Cross-validate author with Blogs.json
    const authorMatch = authorLine.match(/\[([^\]]+)\]/);
    if (authorMatch) {
      const readmeAuthor = authorMatch[1];
      if (readmeAuthor !== blogEntry.authorGitHubUsername) {
        issues.push({
          type: 'error',
          message: `Author mismatch: README has "${readmeAuthor}" but Blogs.json has "${blogEntry.authorGitHubUsername}"`,
          fix: 'Update either README.md or Blogs.json so authors match exactly',
        });
      }
    }
  }

  // Check for Tags line
  const tagsLine = lines.find((l) => l.startsWith('Tags:'));
  if (!tagsLine) {
    issues.push({
      type: 'error',
      message: 'Missing Tags line',
      fix: 'Add a line: Tags: Tag1, Tag2, Tag3',
    });
  } else if (blogEntry) {
    // Cross-validate tags with Blogs.json
    const readmeTags = tagsLine
      .substring(5)
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    const blogJsonTags = blogEntry.tags || [];
    
    // Sort both arrays for comparison
    const sortedReadmeTags = [...readmeTags].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    const sortedBlogTags = [...blogJsonTags].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    
    if (JSON.stringify(sortedReadmeTags) !== JSON.stringify(sortedBlogTags)) {
      issues.push({
        type: 'error',
        message: `Tags mismatch: README has [${readmeTags.join(', ')}] but Blogs.json has [${blogJsonTags.join(', ')}]`,
        fix: 'Update either README.md or Blogs.json so tags match exactly',
      });
    }
  }

  // Check for Description line
  const descLine = lines.find((l) => l.startsWith('Description:'));
  if (!descLine) {
    issues.push({
      type: 'error',
      message: 'Missing Description line',
      fix: 'Add a line: Description: One liner description of the post',
    });
  } else if (blogEntry) {
    // Cross-validate description with Blogs.json
    const readmeDesc = descLine.substring(12).trim();
    if (readmeDesc !== blogEntry.description) {
      issues.push({
        type: 'error',
        message: `Description mismatch between README and Blogs.json`,
        fix: 'Update either README.md or Blogs.json so descriptions match exactly',
      });
    }
  }

  // Check header spacing: each metadata line (title, Author, Tags, Description) must be followed by a blank line
  const metaPrefixes = ['# ', 'Author:', 'Tags:', 'Description:'];
  for (const prefix of metaPrefixes) {
    const metaLineIndex = lines.findIndex((l) => l.startsWith(prefix));
    if (metaLineIndex !== -1 && metaLineIndex + 1 < lines.length && lines[metaLineIndex + 1]?.trim() !== '') {
      issues.push({
        type: 'error',
        message: `Header line "${prefix.replace(':', '')}" must be followed by a blank line`,
        fix: 'Add a blank line after each header metadata line (title, Author, Tags, Description)',
      });
      break;
    }
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
function validateAllPosts(postsDir: string[], blogsJson: BlogEntry[]): BlogIssue[] {
  logHeader('Validating README.md format and cross-validation');
  const formatIssues: BlogIssue[] = [];
  
  // Create a map for quick lookup
  const blogMap = new Map<string, BlogEntry>();
  for (const blog of blogsJson) {
    blogMap.set(blog.post, blog);
  }

  for (const dir of postsDir) {
    const issues: FormatIssue[] = [];
    const blogEntry = blogMap.get(dir);

    // Validate README.md with cross-validation
    const readmeIssues = validateReadme(dir, blogEntry);
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
 * Check for broken internal cross-reference links in all blog posts.
 * Scans README.md files for links matching oneuptime.com/blog/post/<slug>
 * and verifies each slug corresponds to an existing post directory.
 */
function checkBrokenLinks(postsDir: string[]): void {
  logHeader('Checking for broken internal cross-reference links');

  // Build a set of all existing post directory names for fast lookup
  const existingPosts = new Set(postsDir);

  // Also build a set of slugs without the date prefix so we can detect
  // links that are missing the date prefix
  const slugWithoutDateMap = new Map<string, string>();
  for (const dir of postsDir) {
    const match = dir.match(/^\d{4}-\d{2}-\d{2}-(.+)$/);
    if (match) {
      slugWithoutDateMap.set(match[1], dir);
    }
  }

  // Regex to match internal blog links in various formats:
  //   oneuptime.com/blog/post/<slug>/view
  //   oneuptime.com/blog/post/<slug>)
  //   oneuptime.com/blog/post/<slug>
  const linkRegex = /oneuptime\.com\/blog\/post\/([a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9])(?:\/view)?/g;

  interface BrokenLink {
    sourcePost: string;
    line: number;
    slug: string;
    suggestion: string | null;
  }

  const brokenLinks: BrokenLink[] = [];
  const brokenSlugs = new Set<string>();

  for (const dir of postsDir) {
    const readmePath = path.join(POSTS_DIR, dir, 'README.md');
    if (!fs.existsSync(readmePath)) {
      continue;
    }

    const content = fs.readFileSync(readmePath, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      let match: RegExpExecArray | null;
      // Reset regex state for each line
      linkRegex.lastIndex = 0;

      while ((match = linkRegex.exec(lines[i])) !== null) {
        const slug = match[1];

        // Check if the slug directly matches an existing post directory
        if (existingPosts.has(slug)) {
          continue;
        }

        // Check if the slug is missing the date prefix
        const suggestedDir = slugWithoutDateMap.get(slug) || null;

        brokenLinks.push({
          sourcePost: dir,
          line: i + 1,
          slug,
          suggestion: suggestedDir,
        });
        brokenSlugs.add(slug);
      }
    }
  }

  if (brokenLinks.length > 0) {
    hasErrors = true;

    // Group by slug for a cleaner output
    const bySlug = new Map<string, BrokenLink[]>();
    for (const link of brokenLinks) {
      const existing = bySlug.get(link.slug) || [];
      existing.push(link);
      bySlug.set(link.slug, existing);
    }

    // Separate into missing-date-prefix vs truly missing
    const missingDatePrefix: Array<[string, BrokenLink[]]> = [];
    const trulyMissing: Array<[string, BrokenLink[]]> = [];

    for (const [slug, links] of bySlug) {
      if (links[0].suggestion) {
        missingDatePrefix.push([slug, links]);
      } else {
        trulyMissing.push([slug, links]);
      }
    }

    logError(
      `Found ${brokenLinks.length} broken internal link${brokenLinks.length === 1 ? '' : 's'} across ${brokenSlugs.size} unique slug${brokenSlugs.size === 1 ? '' : 's'}\n`
    );

    if (missingDatePrefix.length > 0) {
      console.log(`  ${colors.bold}Links missing date prefix (${missingDatePrefix.length} slugs):${colors.reset}`);
      for (const [slug, links] of missingDatePrefix) {
        console.log(`    ${colors.red}${slug}${colors.reset} -> should be ${colors.green}${links[0].suggestion}${colors.reset} (${links.length} reference${links.length === 1 ? '' : 's'})`);
      }
      console.log('');
    }

    if (trulyMissing.length > 0) {
      console.log(`  ${colors.bold}Links to non-existent posts (${trulyMissing.length} slugs):${colors.reset}`);
      for (const [slug, links] of trulyMissing) {
        console.log(`    ${colors.red}${slug}${colors.reset} (${links.length} reference${links.length === 1 ? '' : 's'})`);
        // Show up to 3 source files
        const shown = links.slice(0, 3);
        for (const link of shown) {
          console.log(`      - ${link.sourcePost}:${link.line}`);
        }
        if (links.length > 3) {
          console.log(`      ... and ${links.length - 3} more`);
        }
      }
      console.log('');
    }

    console.log(`${colors.bold}How to fix:${colors.reset}
  - For links missing date prefix: update the link to include the full directory name (e.g. 2025-01-01-slug)
  - For non-existent posts: either create the missing blog post, or update the link to point to an existing post
`);
  } else {
    logSuccess('All internal cross-reference links are valid');
  }
}

/**
 * Fix header spacing in a single README.md file
 * Ensures blank lines exist between title, Author:, Tags:, Description:, and ---
 * Only touches the 4 known metadata lines and the --- separator, nothing else.
 */
function fixHeaderSpacing(dir: string): boolean {
  const readmePath = path.join(POSTS_DIR, dir, 'README.md');

  if (!fs.existsSync(readmePath)) {
    return false;
  }

  const content = fs.readFileSync(readmePath, 'utf8');
  const lines = content.split('\n');

  // Find the 4 metadata lines and the --- separator by their prefixes
  let titleIndex = -1;
  let authorIndex = -1;
  let tagsIndex = -1;
  let descIndex = -1;
  let separatorIndex = -1;

  for (let i = 0; i < lines.length && i < 20; i++) {
    if (titleIndex === -1 && lines[i].startsWith('# ')) {
      titleIndex = i;
    } else if (authorIndex === -1 && lines[i].startsWith('Author:')) {
      authorIndex = i;
    } else if (tagsIndex === -1 && lines[i].startsWith('Tags:')) {
      tagsIndex = i;
    } else if (descIndex === -1 && lines[i].startsWith('Description:')) {
      descIndex = i;
    } else if (descIndex !== -1 && separatorIndex === -1 && lines[i].trim() === '---') {
      separatorIndex = i;
      break;
    }
  }

  // All 4 metadata lines and separator must be found
  if (titleIndex === -1 || authorIndex === -1 || tagsIndex === -1 || descIndex === -1 || separatorIndex === -1) {
    return false;
  }

  // Check if each metadata line is followed by a blank line
  const metaIndices = [titleIndex, authorIndex, tagsIndex, descIndex];
  let needsFix = false;

  for (const idx of metaIndices) {
    if (idx + 1 < lines.length && lines[idx + 1]?.trim() !== '') {
      needsFix = true;
      break;
    }
  }

  if (!needsFix) {
    return false;
  }

  // Rebuild: insert blank lines after each metadata line where missing
  // Work backwards to avoid index shifting
  const fixedLines = [...lines];
  const insertPositions: number[] = [];

  for (let j = metaIndices.length - 1; j >= 0; j--) {
    const idx = metaIndices[j];
    if (idx + 1 < fixedLines.length && fixedLines[idx + 1]?.trim() !== '') {
      insertPositions.push(idx + 1);
    }
  }

  // Sort insert positions in descending order and insert blank lines
  insertPositions.sort((a, b) => b - a);
  for (const pos of insertPositions) {
    fixedLines.splice(pos, 0, '');
  }

  const newContent = fixedLines.join('\n');
  if (newContent === content) {
    return false;
  }

  fs.writeFileSync(readmePath, newContent, 'utf8');
  return true;
}

/**
 * Fix header spacing in all README.md files
 */
function fixAllHeaderSpacing(postsDir: string[]): void {
  logHeader('Checking header spacing in README.md files');

  const fixed: string[] = [];

  for (const dir of postsDir) {
    if (fixHeaderSpacing(dir)) {
      fixed.push(dir);
    }
  }

  if (fixed.length > 0) {
    logSuccess(`Fixed header spacing in ${fixed.length} README.md file${fixed.length === 1 ? '' : 's'}:`);
    fixed.forEach((dir) => {
      console.log(`  - ${colors.green}${dir}${colors.reset}`);
    });
    console.log('');
  } else {
    logSuccess('All README.md files have correct header spacing');
  }
}

/**
 * Main function
 */
function main(): void {
  // Check required files
  checkRequiredFiles();

  // Read Blogs.json
  let blogsJson = readBlogsJson();
  
  // Read Authors.json
  const authorsJson = readAuthorsJson();

  // Get all directories in posts/
  const postsDir = getPostDirectories();

  // Validate directory name date format
  validateDirectoryDateFormat(postsDir);

  // Check for directories missing from Blogs.json and auto-add them
  // This modifies blogsJson in place to add new entries
  const blogPosts = blogsJson.map((b) => b.post);
  const missingInJson = checkMissingInJson(postsDir, blogPosts, blogsJson);

  // Sort Blogs.json by date (oldest first, newest last) and save
  // This ensures newly added entries are properly sorted
  const sortedBlogs = sortBlogsByDate(blogsJson);
  blogsJson = sortedBlogs;

  // Generate Tags.md from Blogs.json
  generateTagsMd(sortedBlogs);
  
  // Check for duplicate posts
  checkDuplicatePosts(sortedBlogs);
  
  // Validate authors against Authors.json
  validateAuthors(sortedBlogs, authorsJson);
  
  // Validate Blogs.json entry fields
  validateBlogEntries(sortedBlogs);

  // Check for Blogs.json entries missing directories
  const missingDirs = checkMissingDirs(postsDir, sortedBlogs.map((b) => b.post));
  
  // Check for broken internal cross-reference links
  checkBrokenLinks(postsDir);

  // Fix header spacing in README.md files
  fixAllHeaderSpacing(postsDir);

  // Generate missing social media images before final validation
  generateMissingSocialImages();

  // Run final validation for format issues
  const formatIssues = validateAllPosts(postsDir, sortedBlogs);

  // Display format issues
  displayFormatIssues(formatIssues);

  // Display summary and exit
  displaySummary(postsDir, sortedBlogs.map((b) => b.post), missingInJson, missingDirs, formatIssues);
}

// Run the script
main();
