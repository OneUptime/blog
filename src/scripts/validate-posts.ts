import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

interface BlogEntry {
  title: string;
  description: string;
  authorGitHubUsername: string;
  tags: string[];
  post: string;
}

const BLOGS_JSON = 'Blogs.json';
const POSTS_DIR = 'posts';
const VALIDATION_JSON = 'validation.json';
const VALIDATION_SUMMARY_MD = 'validation-summary.md';

function getPrompt(postSlug: string, postContent: string, title: string, tags: string[]): string {
  return `You are a technical reviewer for a software engineering blog. Your job is to review a blog post for technical accuracy and correctness, then create a validation.json file.

## Blog Post to Review

**Title:** ${title}
**Tags:** ${tags.join(', ')}
**Location and post content:** posts/${postSlug}/README.md

Here is the full content of the blog post:

---
${postContent}
---

## Your Task

### Step 1: Determine the post type

- If the post has **no code examples, commands, configuration snippets, or technical implementation details** (e.g., it is an opinion piece, company update, or non-technical content), create the validation.json with status "not-code-blog" and skip to Step 4.
- If the post is **not technically relevant and should be removed** from the blog (e.g., spam, placeholder, completely outdated with no salvageable value), create the validation.json with status "not-technically-relevant" and skip to Step 4.
- Otherwise, proceed to Step 2.

### Step 2: Review the post for technical correctness

Go through the blog post carefully and verify every technical claim, code example, and command against official documentation. Specifically:

1. **Code examples**: Check that all code is syntactically correct, uses current (non-deprecated) APIs, and would actually work as described. Verify against the official documentation of the language/framework/library being used.
2. **Terminal commands**: Verify that CLI commands, flags, and options are correct and current. Check against official CLI documentation or --help output.
3. **Configuration snippets**: Verify that config file formats, field names, and values are accurate for the versions discussed.
4. **Technical claims and explanations**: Verify that explanations of how technologies work are accurate. Cross-reference with official docs, RFCs, or authoritative sources.
5. **URLs and links**: If the post references external URLs, verify they are plausible and point to the right resources.
6. **Version-specific information**: If the post mentions specific versions, check that the information is accurate for those versions and note if it has become outdated.

### Step 3: Fix any issues found

If you find ANY technical errors, outdated information, incorrect code, or inaccuracies:

- Edit the post's README.md directly to fix them.
- Make sure your fixes are accurate — verify against official documentation before making changes.
- Keep the author's writing style and tone intact. Only change what is technically wrong.
- Do not add new sections, restructure the post, or make stylistic changes. Only fix technical errors.
- Do not add or remove content beyond what is needed to correct errors.

### Step 4: Create validation.json

After your review (and any fixes), create the file posts/${postSlug}/validation.json with the appropriate content:

For a technically reviewed and correct post:
{
    "status": "validated",
    "validatedAt": "${new Date().toISOString().split('T')[0]}"
}

For a post with no code or technical implementation details:
{
    "status": "not-code-blog",
    "validatedAt": "${new Date().toISOString().split('T')[0]}"
}

For a post that is not technically relevant and should be removed:
{
    "status": "not-technically-relevant",
    "validatedAt": "${new Date().toISOString().split('T')[0]}"
}

### Step 5: Create validation-summary.md

After creating validation.json, create the file posts/${postSlug}/validation-summary.md with a detailed summary of your review. Use this exact format:

# Validation Summary: ${title}

## Status
<!-- One of: validated, not-code-blog, not-technically-relevant -->

## Post Type
<!-- e.g., Tutorial, Guide, Opinion piece, Company update, Reference, etc. -->

## Technologies Covered
<!-- Bulleted list of technologies, frameworks, languages discussed in the post -->

## Sources Consulted
<!-- Bulleted list of official documentation, RFCs, or authoritative sources you checked against. Include URLs where possible. -->

## Issues Found
<!-- If no issues: "No technical issues found." -->
<!-- If issues were found, list each one: what was wrong, what you changed, and why. -->

## Review Notes
<!-- Any additional observations: things that are technically correct but could be improved in the future, deprecation warnings, version-specific caveats, etc. If none, write "None." -->

IMPORTANT: You MUST create both the validation.json and validation-summary.md files. These are the primary deliverables of your review.`;
}

function main(): void {
  const blogsRaw = fs.readFileSync(BLOGS_JSON, 'utf-8');
  const blogs: BlogEntry[] = JSON.parse(blogsRaw);

  // Count already validated
  let alreadyValidated = 0;
  for (const blog of blogs) {
    const validationPath = path.join(POSTS_DIR, blog.post, VALIDATION_JSON);
    if (fs.existsSync(validationPath)) {
      alreadyValidated++;
    }
  }

  // Collect posts needing validation in reverse order of Blogs.json
  const postsToValidate: BlogEntry[] = [];

  for (let i = blogs.length - 1; i >= 0; i--) {
    const blog = blogs[i]!;
    const validationPath = path.join(POSTS_DIR, blog.post, VALIDATION_JSON);
    if (!fs.existsSync(validationPath)) {
      postsToValidate.push(blog);
    }
  }

  console.log(`Total posts:        ${blogs.length}`);
  console.log(`Already validated:   ${alreadyValidated}`);
  console.log(`Remaining to review: ${postsToValidate.length}\n`);

  if (postsToValidate.length === 0) {
    console.log('All posts already have validation.json. Nothing to do.');
    return;
  }

  for (let i = 0; i < postsToValidate.length; i++) {
    const blog = postsToValidate[i]!;
    const postDir = path.join(POSTS_DIR, blog.post);
    const readmePath = path.join(postDir, 'README.md');

    const current = i + 1;
    const total = postsToValidate.length;
    const percent = Math.round((current / total) * 100);
    const barWidth = 30;
    const filled = Math.round((current / total) * barWidth);
    const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);

    console.log(`\n${bar} ${percent}% (${current}/${total})`);
    console.log(`Reviewing: ${blog.title}`);
    console.log(`  Post: ${blog.post}`);

    if (!fs.existsSync(readmePath)) {
      console.log(`  ⚠ Skipping — README.md not found at ${readmePath}`);
      continue;
    }

    const postContent = fs.readFileSync(readmePath, 'utf-8');
    const prompt = getPrompt(blog.post, postContent, blog.title, blog.tags);

    try {
      const result = spawnSync(
        'codex',
        ['exec', '--full-auto', prompt],
        {
          cwd: process.cwd(),
          stdio: 'inherit',
          timeout: 5 * 60 * 1000, // 5 minute timeout per post
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        }
      );

      if (result.error) {
        throw result.error;
      }

      // Verify validation.json and validation-summary.md were created
      const validationPath = path.join(postDir, VALIDATION_JSON);
      const summaryPath = path.join(postDir, VALIDATION_SUMMARY_MD);
      if (fs.existsSync(validationPath)) {
        console.log(`  ✓ ${VALIDATION_JSON} created successfully`);
      } else {
        console.log(`  ✗ ${VALIDATION_JSON} was NOT created — Codex may have failed`);
      }
      if (fs.existsSync(summaryPath)) {
        console.log(`  ✓ ${VALIDATION_SUMMARY_MD} created successfully`);
      } else {
        console.log(`  ✗ ${VALIDATION_SUMMARY_MD} was NOT created`);
      }
    } catch (error) {
      console.error(`  ✗ Error reviewing ${blog.post}: ${(error as Error).message}`);
    }
  }

  // Summary
  let validated = 0;
  let missing = 0;
  for (const blog of postsToValidate) {
    const validationPath = path.join(POSTS_DIR, blog.post, VALIDATION_JSON);
    if (fs.existsSync(validationPath)) {
      validated++;
    } else {
      missing++;
    }
  }

  console.log(`\n--- Summary ---`);
  console.log(`  Validated: ${validated}`);
  console.log(`  Failed:    ${missing}`);
  console.log(`  Total:     ${postsToValidate.length}`);

  // Generate aggregated validation-summary.md at the repo root
  generateAggregatedSummary(blogs);
}

function generateAggregatedSummary(blogs: BlogEntry[]): void {
  const today = new Date().toISOString().split('T')[0];
  const lines: string[] = [];

  lines.push(`# Blog Validation Summary`);
  lines.push(``);
  lines.push(`Generated on: ${today}`);
  lines.push(``);

  let validatedCount = 0;
  let notCodeBlogCount = 0;
  let notRelevantCount = 0;
  let missingCount = 0;

  interface PostResult {
    blog: BlogEntry;
    status: string | null;
    hasSummary: boolean;
  }

  const results: PostResult[] = [];

  for (const blog of blogs) {
    const validationPath = path.join(POSTS_DIR, blog.post, VALIDATION_JSON);
    const summaryPath = path.join(POSTS_DIR, blog.post, VALIDATION_SUMMARY_MD);
    let status: string | null = null;

    if (fs.existsSync(validationPath)) {
      const raw = fs.readFileSync(validationPath, 'utf-8');
      const entry = JSON.parse(raw);
      status = entry.status || 'unknown';
      if (status === 'validated') validatedCount++;
      else if (status === 'not-code-blog') notCodeBlogCount++;
      else if (status === 'not-technically-relevant') notRelevantCount++;
    } else {
      missingCount++;
    }

    results.push({ blog, status, hasSummary: fs.existsSync(summaryPath) });
  }

  const totalPosts = blogs.length;

  lines.push(`## Overview`);
  lines.push(``);
  lines.push(`| Metric | Count |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total posts | ${totalPosts} |`);
  lines.push(`| Validated | ${validatedCount} |`);
  lines.push(`| Not a code blog | ${notCodeBlogCount} |`);
  lines.push(`| Not technically relevant | ${notRelevantCount} |`);
  lines.push(`| Missing validation | ${missingCount} |`);
  lines.push(``);

  // Posts table
  lines.push(`## All Posts`);
  lines.push(``);
  lines.push(`| # | Post | Status | Summary |`);
  lines.push(`|---|------|--------|---------|`);

  for (let i = 0; i < results.length; i++) {
    const r = results[i]!;
    const statusLabel = r.status || 'missing';
    const summaryLink = r.hasSummary ? `[View](posts/${r.blog.post}/${VALIDATION_SUMMARY_MD})` : '—';
    lines.push(`| ${i + 1} | ${r.blog.title} (\`${r.blog.post}\`) | ${statusLabel} | ${summaryLink} |`);
  }

  lines.push(``);

  // Per-post detailed summaries
  const postsWithSummaries = results.filter(r => r.hasSummary);
  if (postsWithSummaries.length > 0) {
    lines.push(`## Detailed Review Summaries`);
    lines.push(``);

    for (const r of postsWithSummaries) {
      const summaryPath = path.join(POSTS_DIR, r.blog.post, VALIDATION_SUMMARY_MD);
      const summaryContent = fs.readFileSync(summaryPath, 'utf-8');
      lines.push(`<details>`);
      lines.push(`<summary><strong>${r.blog.title}</strong> (<code>${r.blog.post}</code>) — ${r.status}</summary>`);
      lines.push(``);
      lines.push(summaryContent.trim());
      lines.push(``);
      lines.push(`</details>`);
      lines.push(``);
    }
  }

  fs.writeFileSync(VALIDATION_SUMMARY_MD, lines.join('\n') + '\n', 'utf-8');
  console.log(`\n✓ Generated ${VALIDATION_SUMMARY_MD}`);
}

main();
