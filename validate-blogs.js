#!/usr/bin/env node

/**
 * Blog Validation Script
 *
 * This script validates that all blog posts follow the correct format:
 * 1. Each directory in posts/ has a corresponding entry in Blogs.json
 * 2. Each Blogs.json entry has a corresponding directory in posts/
 * 3. Each blog post has a README.md with correct format (Title, Author, Tags, Description)
 * 4. Each blog post has a social-media.png image
 *
 * Run with: npm run validate
 */

const fs = require('fs');
const path = require('path');

const POSTS_DIR = 'posts';
const BLOGS_JSON = 'Blogs.json';

// ANSI color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function error(msg) {
  console.error(`${colors.red}${colors.bold}ERROR:${colors.reset} ${msg}`);
}

function warn(msg) {
  console.warn(`${colors.yellow}${colors.bold}WARNING:${colors.reset} ${msg}`);
}

function success(msg) {
  console.log(`${colors.green}${colors.bold}OK:${colors.reset} ${msg}`);
}

function info(msg) {
  console.log(`${colors.blue}${colors.bold}INFO:${colors.reset} ${msg}`);
}

function header(msg) {
  console.log(`\n${colors.bold}=== ${msg} ===${colors.reset}\n`);
}

let hasErrors = false;
let hasWarnings = false;

// Check if required files exist
if (!fs.existsSync(BLOGS_JSON)) {
  error(`${BLOGS_JSON} not found in the current directory.`);
  process.exit(1);
}

if (!fs.existsSync(POSTS_DIR)) {
  error(`${POSTS_DIR}/ directory not found.`);
  process.exit(1);
}

// Read Blogs.json
let blogsJson;
try {
  blogsJson = JSON.parse(fs.readFileSync(BLOGS_JSON, 'utf8'));
} catch (e) {
  error(`Failed to parse ${BLOGS_JSON}: ${e.message}`);
  error('Make sure the JSON is valid. You can use a JSON validator to check for syntax errors.');
  process.exit(1);
}

const blogPosts = blogsJson.map(b => b.post);

// Get all directories in posts/
const postsDir = fs.readdirSync(POSTS_DIR).filter(f =>
  fs.statSync(path.join(POSTS_DIR, f)).isDirectory()
);

// Check 1: Directories missing from Blogs.json
header('Checking for directories missing from Blogs.json');
const missingInJson = postsDir.filter(dir => !blogPosts.includes(dir));

if (missingInJson.length > 0) {
  hasErrors = true;
  error(`Found ${missingInJson.length} director${missingInJson.length === 1 ? 'y' : 'ies'} not listed in ${BLOGS_JSON}:\n`);
  missingInJson.forEach(dir => {
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
  success('All directories are listed in Blogs.json');
}

// Check 2: Blogs.json entries missing directory
header('Checking for Blogs.json entries missing directories');
const missingDirs = blogPosts.filter(post => !postsDir.includes(post));

if (missingDirs.length > 0) {
  hasErrors = true;
  error(`Found ${missingDirs.length} ${BLOGS_JSON} entr${missingDirs.length === 1 ? 'y' : 'ies'} with no corresponding directory:\n`);
  missingDirs.forEach(post => {
    console.log(`  - ${colors.red}${post}${colors.reset}`);
  });
  console.log(`
${colors.bold}How to fix:${colors.reset}
  Either:
  1. Create the missing directory: mkdir -p ${POSTS_DIR}/${missingDirs[0] || 'YYYY-MM-DD-title-of-post'}
  2. Or remove the entry from ${BLOGS_JSON} if it was added by mistake
`);
} else {
  success('All Blogs.json entries have corresponding directories');
}

// Check 3: README.md format validation
header('Validating README.md format');
const formatIssues = [];

for (const dir of postsDir) {
  const readmePath = path.join(POSTS_DIR, dir, 'README.md');
  const socialMediaPath = path.join(POSTS_DIR, dir, 'social-media.png');
  const issues = [];

  // Check if README.md exists
  if (!fs.existsSync(readmePath)) {
    issues.push({
      type: 'error',
      message: 'Missing README.md file',
      fix: `Create a README.md file in ${POSTS_DIR}/${dir}/ with the required format`
    });
  } else {
    // Read and validate README.md format
    const content = fs.readFileSync(readmePath, 'utf8');
    const lines = content.split('\n');

    // Check for title (# Title)
    if (!lines[0] || !lines[0].startsWith('# ')) {
      issues.push({
        type: 'error',
        message: 'Missing or incorrect title format',
        fix: 'First line must be a title starting with "# " (hash followed by space)'
      });
    }

    // Check for Author line
    const authorLine = lines.find(l => l.startsWith('Author:'));
    if (!authorLine) {
      issues.push({
        type: 'error',
        message: 'Missing Author line',
        fix: 'Add a line: Author: [githubusername](https://www.github.com/githubusername)'
      });
    } else if (!authorLine.includes('github.com')) {
      issues.push({
        type: 'warning',
        message: 'Author line may not have proper GitHub link format',
        fix: 'Use format: Author: [githubusername](https://www.github.com/githubusername)'
      });
    }

    // Check for Tags line
    const tagsLine = lines.find(l => l.startsWith('Tags:'));
    if (!tagsLine) {
      issues.push({
        type: 'error',
        message: 'Missing Tags line',
        fix: 'Add a line: Tags: Tag1, Tag2, Tag3'
      });
    }

    // Check for Description line
    const descLine = lines.find(l => l.startsWith('Description:'));
    if (!descLine) {
      issues.push({
        type: 'error',
        message: 'Missing Description line',
        fix: 'Add a line: Description: One liner description of the post'
      });
    }
  }

  // Check if social-media.png exists
  if (!fs.existsSync(socialMediaPath)) {
    issues.push({
      type: 'error',
      message: 'Missing social-media.png',
      fix: `Add a social-media.png image (1280x720 pixels) to ${POSTS_DIR}/${dir}/`
    });
  }

  if (issues.length > 0) {
    formatIssues.push({ dir, issues });
  }
}

if (formatIssues.length > 0) {
  console.log(`Found issues in ${formatIssues.length} blog post${formatIssues.length === 1 ? '' : 's'}:\n`);

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
  success('All README.md files have correct format');
  success('All social-media.png files are present');
}

// Summary
header('Validation Summary');
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
