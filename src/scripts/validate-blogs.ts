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
 * 17. Checks for HTML-conflicting generic type parameters (<S>, <B>, <I>, <U>) in code blocks
 * 18. AUTO-FIX: Replaces double quotes with single quotes in titles and descriptions
 * 19. AUTO-FIX: Replaces em dashes (—) with regular dashes (-) in entire blog post content
 * 20. Duplicate titles — Flag posts with identical or near-identical titles
 * 21. Title max length — Cap at ~70 chars for SEO/rendering
 * 22. Description max length — Cap at ~160 chars for SEO (meta description best practice)
 * 23. Broken image references — Check that ![alt](path) images actually exist in the post directory
 * 24. Orphaned images — Files in the post directory not referenced in README.md (besides social-media.png)
 * 25. Missing image alt text — Flag ![](...) with empty alt text (accessibility)
 * 26. Unclosed code blocks — Detect mismatched ``` fences
 * 27. Code block language tags — Ensure fenced code blocks specify a language (for syntax highlighting)
 * 28. Heading hierarchy — Only one H1 (the title), no skipping levels (H2 → H4 without H3)
 * 29. Empty sections — Headings with no content beneath them
 * 30. Relative link validation — Check that relative markdown links resolve to real files
 * 31. Tag normalization — Detect near-duplicate tags across posts (e.g., "Docker" vs "docker" vs "Dockers")
 * 32. social-media.png dimensions — Verify the image is the expected size (1200x630)
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
const MAX_TITLE_LENGTH = 70;
const MAX_DESCRIPTION_LENGTH = 160;
const SOCIAL_MEDIA_EXPECTED_WIDTH = 1200;
const SOCIAL_MEDIA_EXPECTED_HEIGHT = 630;
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

  // Check for double quotes in title and description
  if (lines[0] && lines[0].startsWith('# ') && lines[0].includes('"')) {
    issues.push({
      type: 'error',
      message: 'Title contains double quotes',
      fix: 'Replace double quotes (") with single quotes (\') in the title',
    });
  }

  const descLineForQuotes = lines.find((l) => l.startsWith('Description:'));
  if (descLineForQuotes && descLineForQuotes.includes('"')) {
    issues.push({
      type: 'error',
      message: 'Description contains double quotes',
      fix: 'Replace double quotes (") with single quotes (\') in the description',
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
  - For non-existent posts: remove the link
`);
  } else {
    logSuccess('All internal cross-reference links are valid');
  }
}

/**
 * AUTO-FIX: Replace double quotes with single quotes in title and description lines.
 * Double quotes in titles/descriptions cause rendering issues in the blog platform.
 */
function fixDoubleQuotes(postsDir: string[], blogsJson: BlogEntry[]): void {
  logHeader('Checking for double quotes in titles and descriptions');

  const blogMap = new Map<string, BlogEntry>();
  for (const blog of blogsJson) {
    blogMap.set(blog.post, blog);
  }

  let fixedReadmeCount = 0;
  let fixedJsonCount = 0;

  for (const dir of postsDir) {
    const readmePath = path.join(POSTS_DIR, dir, 'README.md');
    if (!fs.existsSync(readmePath)) {
      continue;
    }

    const content = fs.readFileSync(readmePath, 'utf8');
    const lines = content.split('\n');
    let changed = false;

    // Fix title (first line starting with # )
    if (lines[0] && lines[0].startsWith('# ') && lines[0].includes('"')) {
      lines[0] = lines[0].replace(/"/g, "'");
      changed = true;
    }

    // Fix description line
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      if (lines[i]?.startsWith('Description:') && lines[i]!.includes('"')) {
        lines[i] = lines[i]!.replace(/"/g, "'");
        changed = true;
        break;
      }
    }

    if (changed) {
      fs.writeFileSync(readmePath, lines.join('\n'), 'utf8');
      fixedReadmeCount++;

      // Also update the corresponding Blogs.json entry
      const blogEntry = blogMap.get(dir);
      if (blogEntry) {
        // Re-parse the fixed README to get updated values
        const fixedTitle = lines[0]?.startsWith('# ') ? lines[0].substring(2).trim() : blogEntry.title;
        const descLine = lines.find((l) => l.startsWith('Description:'));
        const fixedDesc = descLine ? descLine.substring(12).trim() : blogEntry.description;

        if (blogEntry.title !== fixedTitle || blogEntry.description !== fixedDesc) {
          blogEntry.title = fixedTitle;
          blogEntry.description = fixedDesc;
          fixedJsonCount++;
        }
      }
    }
  }

  if (fixedReadmeCount > 0) {
    // Save updated Blogs.json
    fs.writeFileSync(BLOGS_JSON, JSON.stringify(blogsJson, null, 2) + '\n', 'utf8');
    logSuccess(`Fixed double quotes in ${fixedReadmeCount} README.md file${fixedReadmeCount === 1 ? '' : 's'} and ${fixedJsonCount} Blogs.json entr${fixedJsonCount === 1 ? 'y' : 'ies'}`);
  } else {
    logSuccess('No double quotes found in titles or descriptions');
  }
}

/**
 * AUTO-FIX: Replace em dashes (—) with regular dashes (-) in entire README.md files
 * and corresponding Blogs.json title/description fields.
 */
function fixEmDashes(postsDir: string[], blogsJson: BlogEntry[]): void {
  logHeader('Checking for em dashes in blog posts');

  const blogMap = new Map<string, BlogEntry>();
  for (const blog of blogsJson) {
    blogMap.set(blog.post, blog);
  }

  let fixedReadmeCount = 0;
  let fixedJsonCount = 0;

  for (const dir of postsDir) {
    const readmePath = path.join(POSTS_DIR, dir, 'README.md');
    if (!fs.existsSync(readmePath)) {
      continue;
    }

    const content = fs.readFileSync(readmePath, 'utf8');

    // Replace em dashes throughout the entire file
    if (!content.includes('\u2014')) {
      continue;
    }

    const fixedContent = content.replace(/\u2014/g, '-');
    fs.writeFileSync(readmePath, fixedContent, 'utf8');
    fixedReadmeCount++;

    // Also update the corresponding Blogs.json entry if title or description changed
    const blogEntry = blogMap.get(dir);
    if (blogEntry) {
      const fixedLines = fixedContent.split('\n');
      const fixedTitle = fixedLines[0]?.startsWith('# ') ? fixedLines[0].substring(2).trim() : blogEntry.title;
      const descLine = fixedLines.find((l) => l.startsWith('Description:'));
      const fixedDesc = descLine ? descLine.substring(12).trim() : blogEntry.description;

      if (blogEntry.title !== fixedTitle || blogEntry.description !== fixedDesc) {
        blogEntry.title = fixedTitle;
        blogEntry.description = fixedDesc;
        fixedJsonCount++;
      }
    }
  }

  if (fixedReadmeCount > 0) {
    fs.writeFileSync(BLOGS_JSON, JSON.stringify(blogsJson, null, 2) + '\n', 'utf8');
    logSuccess(`Fixed em dashes in ${fixedReadmeCount} README.md file${fixedReadmeCount === 1 ? '' : 's'} and ${fixedJsonCount} Blogs.json entr${fixedJsonCount === 1 ? 'y' : 'ies'}`);
  } else {
    logSuccess('No em dashes found in blog posts');
  }
}

/**
 * Check for HTML-conflicting generic type parameters in blog posts.
 * Single-letter uppercase generics like <S>, <B>, <I>, <U> get misinterpreted
 * as HTML tags (<s> strikethrough, <b> bold, <i> italic, <u> underline) by
 * the blog renderer, even inside code blocks.
 */
function checkHtmlConflictingGenerics(postsDir: string[]): void {
  logHeader('Checking for HTML-conflicting generic type parameters');

  // Match uppercase single-letter generics that conflict with HTML tags:
  // <S>, <S, <S: <S  (and same for B, I, U)
  const htmlGenericRegex = /<[SBIU][>,:\s]/g;

  interface GenericIssue {
    dir: string;
    line: number;
    content: string;
    match: string;
  }

  const issues: GenericIssue[] = [];

  for (const dir of postsDir) {
    const readmePath = path.join(POSTS_DIR, dir, 'README.md');
    if (!fs.existsSync(readmePath)) {
      continue;
    }

    const content = fs.readFileSync(readmePath, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      htmlGenericRegex.lastIndex = 0;
      let match: RegExpExecArray | null;

      while ((match = htmlGenericRegex.exec(lines[i]!)) !== null) {
        issues.push({
          dir,
          line: i + 1,
          content: lines[i]!.trim(),
          match: match[0],
        });
      }
    }
  }

  if (issues.length > 0) {
    hasErrors = true;

    // Group by directory
    const byDir = new Map<string, GenericIssue[]>();
    for (const issue of issues) {
      const existing = byDir.get(issue.dir) || [];
      existing.push(issue);
      byDir.set(issue.dir, existing);
    }

    logError(
      `Found ${issues.length} HTML-conflicting generic type parameter${issues.length === 1 ? '' : 's'} in ${byDir.size} file${byDir.size === 1 ? '' : 's'}\n`
    );

    for (const [dir, dirIssues] of byDir) {
      console.log(`  ${colors.bold}${dir}${colors.reset}`);
      const shown = dirIssues.slice(0, 5);
      for (const issue of shown) {
        const truncated = issue.content.length > 80 ? issue.content.substring(0, 80) + '...' : issue.content;
        console.log(`    Line ${issue.line}: ${colors.red}${issue.match}${colors.reset} in "${truncated}"`);
      }
      if (dirIssues.length > 5) {
        console.log(`    ... and ${dirIssues.length - 5} more`);
      }
    }

    console.log(`
${colors.bold}How to fix:${colors.reset}
  Rename single-letter generic type parameters that conflict with HTML tags:
    <S> (strikethrough) -> <Svc>, <Ser>, <St>
    <B> (bold)          -> <Bd>, <Body>
    <I> (italic)        -> <It>, <In>, <Inp>
    <U> (underline)     -> <R>, <Out>

  The blog renderer interprets these as HTML tags even inside code blocks,
  causing text to appear with strikethrough, bold, italic, or underline styling.
`);
  } else {
    logSuccess('No HTML-conflicting generic type parameters found');
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
 * Normalize a title for near-duplicate comparison.
 * Lowercases, strips punctuation, collapses whitespace.
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Read PNG dimensions from the IHDR chunk header.
 * Returns { width, height } or null if the file is not a valid PNG.
 */
function readPngDimensions(filePath: string): { width: number; height: number } | null {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(24);
    fs.readSync(fd, buffer, 0, 24, 0);
    fs.closeSync(fd);

    // Check PNG signature: 0x89 P N G
    if (buffer[0] !== 0x89 || buffer[1] !== 0x50 || buffer[2] !== 0x4E || buffer[3] !== 0x47) {
      return null;
    }

    // IHDR chunk: width at bytes 16-19, height at bytes 20-23 (big-endian)
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  } catch {
    return null;
  }
}

/**
 * Check for duplicate or near-identical titles across all posts.
 * Titles are normalized (lowercased, punctuation stripped) for comparison.
 */
function checkDuplicateTitles(blogsJson: BlogEntry[]): void {
  logHeader('Checking for duplicate or near-identical titles');

  const titleGroups = new Map<string, BlogEntry[]>();

  for (const blog of blogsJson) {
    if (!blog.title) continue;
    const normalized = normalizeTitle(blog.title);
    const existing = titleGroups.get(normalized) || [];
    existing.push(blog);
    titleGroups.set(normalized, existing);
  }

  const duplicates = Array.from(titleGroups.entries()).filter(([_, entries]) => entries.length > 1);

  if (duplicates.length > 0) {
    hasWarnings = true;
    console.log(
      `${colors.yellow}${colors.bold}WARNING:${colors.reset} Found ${duplicates.length} group${duplicates.length === 1 ? '' : 's'} of duplicate/near-identical titles:\n`
    );
    for (const [_, entries] of duplicates) {
      for (const entry of entries) {
        console.log(`  - ${colors.yellow}${entry.post}${colors.reset}: "${entry.title}"`);
      }
      console.log('');
    }
    console.log(
      `${colors.bold}How to fix:${colors.reset}\n  Ensure each blog post has a unique, distinguishable title.\n`
    );
  } else {
    logSuccess('No duplicate or near-identical titles found');
  }
}

/**
 * Check that titles do not exceed the SEO-recommended maximum length (~70 chars).
 */
function checkTitleMaxLength(blogsJson: BlogEntry[]): void {
  logHeader(`Checking title length (SEO max ~${MAX_TITLE_LENGTH} chars)`);

  const tooLong = blogsJson.filter((b) => b.title && b.title.length > MAX_TITLE_LENGTH);

  if (tooLong.length > 0) {
    hasWarnings = true;
    console.log(
      `${colors.yellow}${colors.bold}WARNING:${colors.reset} Found ${tooLong.length} title${tooLong.length === 1 ? '' : 's'} exceeding ${MAX_TITLE_LENGTH} characters:\n`
    );
    for (const blog of tooLong) {
      console.log(
        `  - ${colors.yellow}${blog.post}${colors.reset}: ${blog.title.length} chars - "${blog.title}"`
      );
    }
    console.log(
      `\n${colors.bold}How to fix:${colors.reset}\n  Shorten titles to ${MAX_TITLE_LENGTH} characters or fewer for optimal SEO and rendering.\n`
    );
  } else {
    logSuccess(`All titles are within ${MAX_TITLE_LENGTH} character limit`);
  }
}

/**
 * Check that descriptions do not exceed the SEO-recommended maximum length (~160 chars).
 */
function checkDescriptionMaxLength(blogsJson: BlogEntry[]): void {
  logHeader(`Checking description length (SEO max ~${MAX_DESCRIPTION_LENGTH} chars)`);

  const tooLong = blogsJson.filter((b) => b.description && b.description.length > MAX_DESCRIPTION_LENGTH);

  if (tooLong.length > 0) {
    hasWarnings = true;
    console.log(
      `${colors.yellow}${colors.bold}WARNING:${colors.reset} Found ${tooLong.length} description${tooLong.length === 1 ? '' : 's'} exceeding ${MAX_DESCRIPTION_LENGTH} characters:\n`
    );
    for (const blog of tooLong) {
      console.log(`  - ${colors.yellow}${blog.post}${colors.reset}: ${blog.description.length} chars`);
    }
    console.log(
      `\n${colors.bold}How to fix:${colors.reset}\n  Shorten descriptions to ${MAX_DESCRIPTION_LENGTH} characters or fewer for optimal SEO meta descriptions.\n`
    );
  } else {
    logSuccess(`All descriptions are within ${MAX_DESCRIPTION_LENGTH} character limit`);
  }
}

/**
 * Check that all image references in README.md (![alt](path)) point to existing files.
 * Skips external URLs and images inside code blocks.
 */
function checkBrokenImageReferences(postsDir: string[]): void {
  logHeader('Checking for broken image references');

  const imageRefRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
  const issues: Array<{ dir: string; line: number; ref: string }> = [];

  for (const dir of postsDir) {
    const readmePath = path.join(POSTS_DIR, dir, 'README.md');
    if (!fs.existsSync(readmePath)) continue;

    const content = fs.readFileSync(readmePath, 'utf8');
    const lines = content.split('\n');

    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (line.trimStart().startsWith('```') || line.trimStart().startsWith('~~~')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inCodeBlock) continue;

      imageRefRegex.lastIndex = 0;
      let match;
      while ((match = imageRefRegex.exec(line)) !== null) {
        const imgPath = match[1]!;

        // Skip external URLs
        if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) continue;

        // Resolve relative to the post directory
        const resolvedPath = path.resolve(POSTS_DIR, dir, imgPath);
        if (!fs.existsSync(resolvedPath)) {
          issues.push({ dir, line: i + 1, ref: imgPath });
        }
      }
    }
  }

  if (issues.length > 0) {
    hasErrors = true;
    logError(`Found ${issues.length} broken image reference${issues.length === 1 ? '' : 's'}:\n`);
    for (const issue of issues) {
      console.log(`  - ${colors.red}${issue.dir}${colors.reset} (line ${issue.line}): ${issue.ref}`);
    }
    console.log(
      `\n${colors.bold}How to fix:${colors.reset}\n  Ensure each referenced image file exists in the post directory, or fix the image path.\n`
    );
  } else {
    logSuccess('All image references point to existing files');
  }
}

/**
 * Check for image files in post directories that are not referenced in README.md.
 * social-media.png is excluded from this check.
 */
function checkOrphanedImages(postsDir: string[]): void {
  logHeader('Checking for orphaned images');

  const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp']);
  const issues: Array<{ dir: string; file: string }> = [];

  for (const dir of postsDir) {
    const postPath = path.join(POSTS_DIR, dir);
    const readmePath = path.join(postPath, 'README.md');

    if (!fs.existsSync(readmePath)) continue;

    const content = fs.readFileSync(readmePath, 'utf8');

    // Get all image files in the directory (excluding social-media.png)
    const files = fs.readdirSync(postPath);
    const imageFiles = files.filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return imageExtensions.has(ext) && f !== 'social-media.png';
    });

    for (const imageFile of imageFiles) {
      // Check if this image filename appears anywhere in the README
      if (!content.includes(imageFile)) {
        issues.push({ dir, file: imageFile });
      }
    }
  }

  if (issues.length > 0) {
    hasWarnings = true;
    console.log(
      `${colors.yellow}${colors.bold}WARNING:${colors.reset} Found ${issues.length} orphaned image${issues.length === 1 ? '' : 's'} (not referenced in README.md):\n`
    );
    for (const issue of issues) {
      console.log(`  - ${colors.yellow}${issue.dir}${colors.reset}: ${issue.file}`);
    }
    console.log(
      `\n${colors.bold}How to fix:${colors.reset}\n  Either reference the image in README.md or remove it from the post directory.\n  Note: social-media.png is excluded from this check.\n`
    );
  } else {
    logSuccess('No orphaned images found');
  }
}

/**
 * Check for images with missing alt text: ![](path).
 * Empty alt text is an accessibility concern for screen readers.
 */
function checkMissingImageAltText(postsDir: string[]): void {
  logHeader('Checking for missing image alt text');

  const emptyAltRegex = /!\[\]\([^)]+\)/g;
  const issues: Array<{ dir: string; line: number; ref: string }> = [];

  for (const dir of postsDir) {
    const readmePath = path.join(POSTS_DIR, dir, 'README.md');
    if (!fs.existsSync(readmePath)) continue;

    const content = fs.readFileSync(readmePath, 'utf8');
    const lines = content.split('\n');

    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (line.trimStart().startsWith('```') || line.trimStart().startsWith('~~~')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inCodeBlock) continue;

      emptyAltRegex.lastIndex = 0;
      let match;
      while ((match = emptyAltRegex.exec(line)) !== null) {
        issues.push({ dir, line: i + 1, ref: match[0] });
      }
    }
  }

  if (issues.length > 0) {
    hasWarnings = true;
    console.log(
      `${colors.yellow}${colors.bold}WARNING:${colors.reset} Found ${issues.length} image${issues.length === 1 ? '' : 's'} with missing alt text:\n`
    );
    for (const issue of issues) {
      console.log(`  - ${colors.yellow}${issue.dir}${colors.reset} (line ${issue.line}): ${issue.ref}`);
    }
    console.log(
      `\n${colors.bold}How to fix:${colors.reset}\n  Add descriptive alt text: ![description of image](path/to/image.png)\n  Alt text improves accessibility for screen readers.\n`
    );
  } else {
    logSuccess('All images have alt text');
  }
}

/**
 * Detect unclosed/mismatched fenced code blocks (``` or ~~~).
 */
function checkUnclosedCodeBlocks(postsDir: string[]): void {
  logHeader('Checking for unclosed code blocks');

  const issues: Array<{ dir: string; openLine: number }> = [];

  for (const dir of postsDir) {
    const readmePath = path.join(POSTS_DIR, dir, 'README.md');
    if (!fs.existsSync(readmePath)) continue;

    const content = fs.readFileSync(readmePath, 'utf8');
    const lines = content.split('\n');

    let inCodeBlock = false;
    let openLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i]!.trimStart();
      // Match ``` or ~~~ fences (with optional language tag for opening)
      if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          openLine = i + 1;
        } else {
          inCodeBlock = false;
        }
      }
    }

    if (inCodeBlock) {
      issues.push({ dir, openLine });
    }
  }

  if (issues.length > 0) {
    hasErrors = true;
    logError(`Found ${issues.length} unclosed code block${issues.length === 1 ? '' : 's'}:\n`);
    for (const issue of issues) {
      console.log(`  - ${colors.red}${issue.dir}${colors.reset} (opened at line ${issue.openLine})`);
    }
    console.log(
      `\n${colors.bold}How to fix:${colors.reset}\n  Add a closing \`\`\` fence to match every opening fence.\n`
    );
  } else {
    logSuccess('All code blocks are properly closed');
  }
}

/**
 * Ensure fenced code blocks specify a language tag for syntax highlighting.
 */
function checkCodeBlockLanguageTags(postsDir: string[]): void {
  logHeader('Checking code block language tags');

  const issues: Array<{ dir: string; line: number }> = [];

  for (const dir of postsDir) {
    const readmePath = path.join(POSTS_DIR, dir, 'README.md');
    if (!fs.existsSync(readmePath)) continue;

    const content = fs.readFileSync(readmePath, 'utf8');
    const lines = content.split('\n');

    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i]!.trimStart();
      if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          // Check if there's a language tag after the fence
          const fence = trimmed.startsWith('```') ? '```' : '~~~';
          const afterFence = trimmed.substring(fence.length).trim();
          if (!afterFence) {
            issues.push({ dir, line: i + 1 });
          }
        } else {
          inCodeBlock = false;
        }
      }
    }
  }

  if (issues.length > 0) {
    hasWarnings = true;
    console.log(
      `${colors.yellow}${colors.bold}WARNING:${colors.reset} Found ${issues.length} code block${issues.length === 1 ? '' : 's'} without a language tag:\n`
    );
    // Group by directory
    const byDir = new Map<string, number[]>();
    for (const issue of issues) {
      const existing = byDir.get(issue.dir) || [];
      existing.push(issue.line);
      byDir.set(issue.dir, existing);
    }
    for (const [dir, lineNums] of byDir) {
      console.log(
        `  - ${colors.yellow}${dir}${colors.reset}: line${lineNums.length > 1 ? 's' : ''} ${lineNums.join(', ')}`
      );
    }
    console.log(
      `\n${colors.bold}How to fix:${colors.reset}\n  Add a language identifier after the opening fence: \`\`\`javascript, \`\`\`python, etc.\n  Use \`\`\`text or \`\`\`plaintext for plain text blocks.\n`
    );
  } else {
    logSuccess('All code blocks have language tags');
  }
}

/**
 * Validate heading hierarchy:
 * - Only one H1 (the title) per post
 * - No skipping heading levels (e.g., H2 directly to H4 without H3)
 * Skips headings inside code blocks.
 */
function checkHeadingHierarchy(postsDir: string[]): void {
  logHeader('Checking heading hierarchy');

  interface HeadingIssue {
    dir: string;
    issue: string;
    line: number;
  }

  const issues: HeadingIssue[] = [];

  for (const dir of postsDir) {
    const readmePath = path.join(POSTS_DIR, dir, 'README.md');
    if (!fs.existsSync(readmePath)) continue;

    const content = fs.readFileSync(readmePath, 'utf8');
    const lines = content.split('\n');

    let inCodeBlock = false;
    let h1Count = 0;
    let lastLevel = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (line.trimStart().startsWith('```') || line.trimStart().startsWith('~~~')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inCodeBlock) continue;

      const headingMatch = line.match(/^(#{1,6})\s+/);
      if (!headingMatch) continue;

      const level = headingMatch[1]!.length;

      if (level === 1) {
        h1Count++;
        if (h1Count > 1) {
          issues.push({ dir, issue: `Multiple H1 headings (found ${h1Count})`, line: i + 1 });
        }
      }

      if (lastLevel > 0 && level > lastLevel + 1) {
        issues.push({
          dir,
          issue: `Heading level skipped: H${lastLevel} -> H${level}`,
          line: i + 1,
        });
      }

      lastLevel = level;
    }
  }

  if (issues.length > 0) {
    hasWarnings = true;
    console.log(
      `${colors.yellow}${colors.bold}WARNING:${colors.reset} Found ${issues.length} heading hierarchy issue${issues.length === 1 ? '' : 's'}:\n`
    );
    // Group by directory
    const byDir = new Map<string, HeadingIssue[]>();
    for (const issue of issues) {
      const existing = byDir.get(issue.dir) || [];
      existing.push(issue);
      byDir.set(issue.dir, existing);
    }
    for (const [dir, dirIssues] of byDir) {
      console.log(`  ${colors.bold}${dir}${colors.reset}`);
      for (const issue of dirIssues) {
        console.log(`    - Line ${issue.line}: ${colors.yellow}${issue.issue}${colors.reset}`);
      }
    }
    console.log(
      `\n${colors.bold}How to fix:${colors.reset}\n  Use only one H1 (# Title) per post. Don't skip heading levels (e.g., H2 -> H4 without H3).\n`
    );
  } else {
    logSuccess('All heading hierarchies are valid');
  }
}

/**
 * Check for empty sections: headings with no content beneath them
 * (only blank lines or --- separators before the next heading or EOF).
 * Skips headings inside code blocks.
 */
function checkEmptySections(postsDir: string[]): void {
  logHeader('Checking for empty sections');

  const issues: Array<{ dir: string; line: number; heading: string }> = [];

  for (const dir of postsDir) {
    const readmePath = path.join(POSTS_DIR, dir, 'README.md');
    if (!fs.existsSync(readmePath)) continue;

    const content = fs.readFileSync(readmePath, 'utf8');
    const lines = content.split('\n');

    let inCodeBlock = false;
    let lastHeadingLine = -1;
    let lastHeadingText = '';
    let hasContentAfterHeading = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const trimmed = line.trimStart();

      if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
        inCodeBlock = !inCodeBlock;
        if (inCodeBlock) hasContentAfterHeading = true;
        continue;
      }
      if (inCodeBlock) continue;

      const isHeading = /^#{1,6}\s+/.test(line);

      if (isHeading) {
        // If previous heading had no content, flag it
        if (lastHeadingLine !== -1 && !hasContentAfterHeading) {
          issues.push({ dir, line: lastHeadingLine, heading: lastHeadingText });
        }
        lastHeadingLine = i + 1;
        lastHeadingText = line.trim();
        hasContentAfterHeading = false;
      } else if (line.trim() !== '' && line.trim() !== '---') {
        hasContentAfterHeading = true;
      }
    }

    // Check last heading in the file
    if (lastHeadingLine !== -1 && !hasContentAfterHeading) {
      issues.push({ dir, line: lastHeadingLine, heading: lastHeadingText });
    }
  }

  if (issues.length > 0) {
    hasWarnings = true;
    console.log(
      `${colors.yellow}${colors.bold}WARNING:${colors.reset} Found ${issues.length} empty section${issues.length === 1 ? '' : 's'} (headings with no content):\n`
    );
    const byDir = new Map<string, Array<{ line: number; heading: string }>>();
    for (const issue of issues) {
      const existing = byDir.get(issue.dir) || [];
      existing.push({ line: issue.line, heading: issue.heading });
      byDir.set(issue.dir, existing);
    }
    for (const [dir, dirIssues] of byDir) {
      console.log(`  ${colors.bold}${dir}${colors.reset}`);
      for (const issue of dirIssues) {
        console.log(`    - Line ${issue.line}: ${colors.yellow}${issue.heading}${colors.reset}`);
      }
    }
    console.log(
      `\n${colors.bold}How to fix:${colors.reset}\n  Add content beneath each heading or remove empty headings.\n`
    );
  } else {
    logSuccess('No empty sections found');
  }
}

/**
 * Check that relative markdown links (not images, not external URLs) resolve to real files.
 * Skips links inside code blocks.
 */
function checkRelativeLinkValidation(postsDir: string[]): void {
  logHeader('Checking relative markdown links');

  // Match markdown links [text](path) but NOT images ![alt](path) and NOT URLs
  const linkRegex = /(?<!!)\[([^\]]*)\]\(([^)]+)\)/g;
  const issues: Array<{ dir: string; line: number; linkText: string; linkTarget: string }> = [];

  for (const dir of postsDir) {
    const readmePath = path.join(POSTS_DIR, dir, 'README.md');
    if (!fs.existsSync(readmePath)) continue;

    const content = fs.readFileSync(readmePath, 'utf8');
    const lines = content.split('\n');

    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (line.trimStart().startsWith('```') || line.trimStart().startsWith('~~~')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
      if (inCodeBlock) continue;

      linkRegex.lastIndex = 0;
      let match;
      while ((match = linkRegex.exec(line)) !== null) {
        const linkTarget = match[2]!;

        // Skip external URLs, anchors, and mailto
        if (
          linkTarget.startsWith('http://') ||
          linkTarget.startsWith('https://') ||
          linkTarget.startsWith('#') ||
          linkTarget.startsWith('mailto:')
        )
          continue;

        // Strip anchor from path
        const targetPath = linkTarget.split('#')[0]!;
        if (!targetPath) continue; // Pure anchor link

        // Resolve relative to the post directory
        const resolvedPath = path.resolve(POSTS_DIR, dir, targetPath);
        if (!fs.existsSync(resolvedPath)) {
          issues.push({ dir, line: i + 1, linkText: match[1]!, linkTarget });
        }
      }
    }
  }

  if (issues.length > 0) {
    hasErrors = true;
    logError(`Found ${issues.length} broken relative link${issues.length === 1 ? '' : 's'}:\n`);
    for (const issue of issues) {
      console.log(
        `  - ${colors.red}${issue.dir}${colors.reset} (line ${issue.line}): [${issue.linkText}](${issue.linkTarget})`
      );
    }
    console.log(
      `\n${colors.bold}How to fix:${colors.reset}\n  Ensure relative links point to existing files, or convert to absolute URLs.\n`
    );
  } else {
    logSuccess('All relative markdown links are valid');
  }
}

/**
 * Detect near-duplicate tags across all posts.
 * Checks for:
 * - Case-inconsistent tags (e.g., "Docker" vs "docker")
 * - Singular/plural variants (e.g., "Docker" vs "Dockers")
 */
function checkTagNormalization(blogsJson: BlogEntry[]): void {
  logHeader('Checking for near-duplicate tags across posts');

  // Group all tags by their normalized form (lowercase)
  const tagVariants = new Map<string, Set<string>>();

  for (const blog of blogsJson) {
    if (!blog.tags) continue;
    for (const tag of blog.tags) {
      const normalized = tag.toLowerCase().trim();
      const variants = tagVariants.get(normalized) || new Set();
      variants.add(tag);
      tagVariants.set(normalized, variants);
    }
  }

  // Check for singular/plural near-duplicates
  const normalizedKeys = Array.from(tagVariants.keys());
  const pluralGroups: Array<{ variants: string[] }> = [];
  const seen = new Set<string>();

  for (const key of normalizedKeys) {
    if (seen.has(key)) continue;

    // Check if adding/removing 's' matches another tag
    const potentialPlural = key.endsWith('s') ? key.slice(0, -1) : key + 's';
    if (tagVariants.has(potentialPlural) && !seen.has(potentialPlural)) {
      const allVariants = new Set([
        ...Array.from(tagVariants.get(key)!),
        ...Array.from(tagVariants.get(potentialPlural)!),
      ]);
      pluralGroups.push({ variants: Array.from(allVariants) });
      seen.add(key);
      seen.add(potentialPlural);
    }
  }

  // Find case-variant groups (same lowercase, different casing)
  const caseVariants = Array.from(tagVariants.entries()).filter(([_, variants]) => variants.size > 1);

  const hasIssues = caseVariants.length > 0 || pluralGroups.length > 0;

  if (hasIssues) {
    hasWarnings = true;

    if (caseVariants.length > 0) {
      console.log(
        `${colors.yellow}${colors.bold}WARNING:${colors.reset} Found ${caseVariants.length} tag${caseVariants.length === 1 ? '' : 's'} with inconsistent casing:\n`
      );
      for (const [_, variants] of caseVariants) {
        const variantList = Array.from(variants);
        console.log(`  - ${colors.yellow}${variantList.join(' vs ')}${colors.reset}`);
      }
      console.log('');
    }

    if (pluralGroups.length > 0) {
      console.log(
        `${colors.yellow}${colors.bold}WARNING:${colors.reset} Found ${pluralGroups.length} potential singular/plural tag duplicate${pluralGroups.length === 1 ? '' : 's'}:\n`
      );
      for (const group of pluralGroups) {
        console.log(`  - ${colors.yellow}${group.variants.join(' vs ')}${colors.reset}`);
      }
      console.log('');
    }

    console.log(
      `${colors.bold}How to fix:${colors.reset}\n  Normalize tags to use consistent casing and singular/plural forms across all posts.\n`
    );
  } else {
    logSuccess('All tags are consistently named across posts');
  }
}

/**
 * Verify social-media.png images have the expected dimensions (1200x630 for optimal social sharing).
 * Reads dimensions directly from the PNG IHDR chunk header without external dependencies.
 */
function checkSocialMediaDimensions(postsDir: string[]): void {
  logHeader(
    `Checking social-media.png dimensions (expected ${SOCIAL_MEDIA_EXPECTED_WIDTH}x${SOCIAL_MEDIA_EXPECTED_HEIGHT})`
  );

  const issues: Array<{ dir: string; width: number; height: number }> = [];
  const unreadable: string[] = [];

  for (const dir of postsDir) {
    const imgPath = path.join(POSTS_DIR, dir, 'social-media.png');
    if (!fs.existsSync(imgPath)) continue;

    const dims = readPngDimensions(imgPath);
    if (!dims) {
      unreadable.push(dir);
      continue;
    }

    if (dims.width !== SOCIAL_MEDIA_EXPECTED_WIDTH || dims.height !== SOCIAL_MEDIA_EXPECTED_HEIGHT) {
      issues.push({ dir, width: dims.width, height: dims.height });
    }
  }

  if (issues.length > 0 || unreadable.length > 0) {
    hasWarnings = true;

    if (issues.length > 0) {
      console.log(
        `${colors.yellow}${colors.bold}WARNING:${colors.reset} Found ${issues.length} social-media.png with unexpected dimensions:\n`
      );
      for (const issue of issues) {
        console.log(
          `  - ${colors.yellow}${issue.dir}${colors.reset}: ${issue.width}x${issue.height} (expected ${SOCIAL_MEDIA_EXPECTED_WIDTH}x${SOCIAL_MEDIA_EXPECTED_HEIGHT})`
        );
      }
      console.log('');
    }

    if (unreadable.length > 0) {
      console.log(
        `${colors.yellow}${colors.bold}WARNING:${colors.reset} Could not read dimensions for ${unreadable.length} social-media.png file${unreadable.length === 1 ? '' : 's'}:\n`
      );
      for (const dir of unreadable) {
        console.log(`  - ${colors.yellow}${dir}${colors.reset}`);
      }
      console.log('');
    }

    console.log(
      `${colors.bold}How to fix:${colors.reset}\n  Resize social-media.png to ${SOCIAL_MEDIA_EXPECTED_WIDTH}x${SOCIAL_MEDIA_EXPECTED_HEIGHT} pixels for optimal social media sharing.\n`
    );
  } else {
    logSuccess(
      `All social-media.png files have correct dimensions (${SOCIAL_MEDIA_EXPECTED_WIDTH}x${SOCIAL_MEDIA_EXPECTED_HEIGHT})`
    );
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

  // Auto-fix double quotes in titles and descriptions
  fixDoubleQuotes(postsDir, blogsJson);

  // Auto-fix em dashes in titles and descriptions
  fixEmDashes(postsDir, blogsJson);

  // Check for HTML-conflicting generic type parameters
  checkHtmlConflictingGenerics(postsDir);

  // Fix header spacing in README.md files
  fixAllHeaderSpacing(postsDir);

  // --- New validations ---

  // Check for duplicate or near-identical titles
  checkDuplicateTitles(sortedBlogs);

  // Check title max length (SEO)
  checkTitleMaxLength(sortedBlogs);

  // Check description max length (SEO)
  checkDescriptionMaxLength(sortedBlogs);

  // Check for broken image references
  checkBrokenImageReferences(postsDir);

  // Check for orphaned images
  checkOrphanedImages(postsDir);

  // Check for missing image alt text
  checkMissingImageAltText(postsDir);

  // Check for unclosed code blocks
  checkUnclosedCodeBlocks(postsDir);

  // Check code block language tags
  checkCodeBlockLanguageTags(postsDir);

  // Check heading hierarchy
  checkHeadingHierarchy(postsDir);

  // Check for empty sections
  checkEmptySections(postsDir);

  // Check relative link validation
  checkRelativeLinkValidation(postsDir);

  // Check tag normalization across posts
  checkTagNormalization(sortedBlogs);

  // Check social-media.png dimensions
  checkSocialMediaDimensions(postsDir);

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
