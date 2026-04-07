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

function getPrompt(postSlug: string, postContent: string, title: string, tags: string[]): string {
  return `You are a technical reviewer for a software engineering blog. Your job is to review a blog post for technical accuracy and correctness, then create a validation.json file.

## Blog Post to Review

**Title:** ${title}
**Tags:** ${tags.join(', ')}
**Location:** posts/${postSlug}/README.md

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

IMPORTANT: You MUST create the validation.json file. This is the primary deliverable of your review.`;
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

    console.log(`\n[${i + 1}/${postsToValidate.length}] Reviewing: ${blog.title}`);
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

      // Verify validation.json was created
      const validationPath = path.join(postDir, VALIDATION_JSON);
      if (fs.existsSync(validationPath)) {
        console.log(`  ✓ ${VALIDATION_JSON} created successfully`);
      } else {
        console.log(`  ✗ ${VALIDATION_JSON} was NOT created — Codex may have failed`);
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
}

main();
