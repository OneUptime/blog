#!/usr/bin/env npx ts-node

/**
 * Social Media Image Generator
 *
 * This script generates social media images (1280x720) for blog posts
 * by overlaying the post title on a template image.
 *
 * Run with:
 *   npm run generate-social-image                    # Generate all missing
 *   npm run generate-social-image -- posts/2025-01-01-my-post  # Single post
 */

import { createCanvas, loadImage, GlobalFonts, SKRSContext2D, Image } from '@napi-rs/canvas';
import * as fs from 'fs';
import * as path from 'path';

// Types
interface TitleConfig {
  x: number;
  y: number;
  maxWidth: number;
  lineHeight: number;
  fontSize: number;
  fontFamily: string;
  color: string;
}

interface GenerationSummary {
  generated: number;
  skipped: number;
  errors: number;
}

// ANSI color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
} as const;

// Font configuration
const SCRIPT_DIR_FONTS = path.resolve(__dirname, '../fonts');
const FONT_FAMILY = 'Poppins';

// Load Poppins font from the fonts directory
function loadFont(): boolean {
  if (fs.existsSync(SCRIPT_DIR_FONTS)) {
    GlobalFonts.loadFontsFromDir(SCRIPT_DIR_FONTS);
    const families = GlobalFonts.families;
    const poppinsFont = families.find(f => f.family === FONT_FAMILY);
    if (poppinsFont) {
      console.log(`${colors.cyan}Font loaded:${colors.reset} ${FONT_FAMILY}`);
      return true;
    }
  }
  return false;
}

const fontLoaded = loadFont();
if (!fontLoaded) {
  console.error(
    `${colors.red}Error:${colors.reset} Poppins font not found. Please ensure Poppins-Bold.ttf exists in src/fonts/`
  );
  process.exit(1);
}

// Configuration
const SCRIPT_DIR = __dirname;
const ROOT_DIR = path.resolve(SCRIPT_DIR, '../..');
const TEMPLATE_PATH = path.join(ROOT_DIR, 'social-media-image-template.png');

const TITLE_CONFIG: TitleConfig = {
  x: 60,
  y: 260,
  maxWidth: 1160,
  lineHeight: 85,
  fontSize: 68,
  fontFamily: FONT_FAMILY,
  color: '#000000',
};

/**
 * Extract title from README.md file
 */
function extractTitle(readmePath: string): string {
  if (!fs.existsSync(readmePath)) {
    throw new Error(`README.md not found at: ${readmePath}`);
  }

  const content = fs.readFileSync(readmePath, 'utf-8');
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('# ')) {
      return trimmed.substring(2).trim();
    }
  }

  throw new Error('No title (# heading) found in README.md');
}

/**
 * Wrap text to fit within maxWidth
 */
function wrapText(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const metrics = ctx.measureText(testLine);

    if (metrics.width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Generate social media image for a blog post
 */
async function generateSocialImage(blogFolderPath: string): Promise<string> {
  const absolutePath = path.isAbsolute(blogFolderPath)
    ? blogFolderPath
    : path.join(process.cwd(), blogFolderPath);

  const readmePath = path.join(absolutePath, 'README.md');
  const outputPath = path.join(absolutePath, 'social-media.png');

  // Extract title
  const title = extractTitle(readmePath);
  console.log(`${colors.blue}Title:${colors.reset} ${title}`);

  // Check if template exists
  if (!fs.existsSync(TEMPLATE_PATH)) {
    throw new Error(`Template image not found at: ${TEMPLATE_PATH}`);
  }

  // Load template image
  const template: Image = await loadImage(TEMPLATE_PATH);

  // Create canvas with template dimensions
  const canvas = createCanvas(template.width, template.height);
  const ctx = canvas.getContext('2d');

  // Draw template
  ctx.drawImage(template, 0, 0);

  // Configure text style
  const fontString = `700 ${TITLE_CONFIG.fontSize}px "${TITLE_CONFIG.fontFamily}"`;
  ctx.font = fontString;
  ctx.fillStyle = TITLE_CONFIG.color;
  ctx.textBaseline = 'top';

  // Wrap and draw title text
  const lines = wrapText(ctx, title, TITLE_CONFIG.maxWidth);

  lines.forEach((line, index) => {
    const y = TITLE_CONFIG.y + index * TITLE_CONFIG.lineHeight;
    ctx.fillText(line, TITLE_CONFIG.x, y);
  });

  // Save the image
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);

  console.log(`${colors.green}Generated:${colors.reset} ${outputPath}`);
  return outputPath;
}

/**
 * Generate social images for all blog posts missing them
 */
async function generateAllMissing(): Promise<GenerationSummary> {
  const postsDir = path.join(ROOT_DIR, 'posts');

  if (!fs.existsSync(postsDir)) {
    throw new Error(`Posts directory not found at: ${postsDir}`);
  }

  const folders = fs
    .readdirSync(postsDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  const summary: GenerationSummary = {
    generated: 0,
    skipped: 0,
    errors: 0,
  };

  for (const folder of folders) {
    const folderPath = path.join(postsDir, folder);
    const socialMediaPath = path.join(folderPath, 'social-media.png');
    const readmePath = path.join(folderPath, 'README.md');

    // Skip if social-media.png already exists
    if (fs.existsSync(socialMediaPath)) {
      summary.skipped++;
      continue;
    }

    // Skip if no README.md
    if (!fs.existsSync(readmePath)) {
      console.log(`${colors.yellow}Skipping${colors.reset} ${folder}: No README.md`);
      summary.skipped++;
      continue;
    }

    try {
      await generateSocialImage(folderPath);
      summary.generated++;
    } catch (err) {
      const error = err as Error;
      console.error(`${colors.red}Error${colors.reset} processing ${folder}: ${error.message}`);
      summary.errors++;
    }
  }

  return summary;
}

/**
 * Display help message
 */
function showHelp(): void {
  console.log(`
${colors.bold}Social Media Image Generator${colors.reset}

Usage: npm run generate-social-image [options] [blog-folder]

${colors.bold}Options:${colors.reset}
  --all         Generate images for all blog posts missing them (default)
  --help, -h    Show this help message

${colors.bold}Arguments:${colors.reset}
  blog-folder   Path to the blog post folder (e.g., posts/2025-01-01-my-post)

${colors.bold}Examples:${colors.reset}
  npm run generate-social-image
  npm run generate-social-image -- posts/2025-01-01-my-post
  npm run generate-social-image -- --all

${colors.bold}Font:${colors.reset}
  Uses Poppins Bold (src/fonts/Poppins-Bold.ttf)
`);
}

/**
 * Display summary
 */
function displaySummary(summary: GenerationSummary): void {
  console.log(`
${colors.bold}Summary:${colors.reset}
  ${colors.green}Generated:${colors.reset} ${summary.generated}
  ${colors.yellow}Skipped:${colors.reset} ${summary.skipped}
  ${colors.red}Errors:${colors.reset} ${summary.errors}
`);
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  if (args.length === 0 || args[0] === '--all') {
    console.log(
      `${colors.bold}Generating social media images for all posts missing them...${colors.reset}\n`
    );
    const summary = await generateAllMissing();
    displaySummary(summary);

    if (summary.errors > 0) {
      process.exit(1);
    }
  } else {
    // Single folder mode
    try {
      await generateSocialImage(args[0]);
    } catch (err) {
      const error = err as Error;
      console.error(`${colors.red}Error:${colors.reset} ${error.message}`);
      process.exit(1);
    }
  }
}

// Run the script
main().catch((err: Error) => {
  console.error(`${colors.red}${colors.bold}Fatal error:${colors.reset} ${err.message}`);
  process.exit(1);
});
