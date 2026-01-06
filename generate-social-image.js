const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

// Register system fonts for proper rendering
const FONT_PATHS = [
    '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    '/Library/Fonts/Arial Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    'C:\\Windows\\Fonts\\arialbd.ttf'
];

let fontRegistered = false;
for (const fontPath of FONT_PATHS) {
    if (fs.existsSync(fontPath)) {
        GlobalFonts.registerFromPath(fontPath, 'TitleFont');
        fontRegistered = true;
        break;
    }
}

if (!fontRegistered) {
    console.warn('Warning: Could not find a suitable system font. Text may not render correctly.');
}

// Configuration
const TEMPLATE_PATH = path.join(__dirname, 'social-media-image-template.png');
const TITLE_CONFIG = {
    x: 60,
    y: 280,
    maxWidth: 1160,
    lineHeight: 75,
    fontSize: 58,
    fontFamily: 'TitleFont',
    color: '#000000'
};

/**
 * Extract title from README.md file
 */
function extractTitle(readmePath) {
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
function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
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
async function generateSocialImage(blogFolderPath) {
    const absolutePath = path.isAbsolute(blogFolderPath)
        ? blogFolderPath
        : path.join(process.cwd(), blogFolderPath);

    const readmePath = path.join(absolutePath, 'README.md');
    const outputPath = path.join(absolutePath, 'social-media.png');

    // Extract title
    const title = extractTitle(readmePath);
    console.log(`Title: ${title}`);

    // Load template image
    const template = await loadImage(TEMPLATE_PATH);

    // Create canvas with template dimensions
    const canvas = createCanvas(template.width, template.height);
    const ctx = canvas.getContext('2d');

    // Draw template
    ctx.drawImage(template, 0, 0);

    // Configure text style
    ctx.font = `bold ${TITLE_CONFIG.fontSize}px ${TITLE_CONFIG.fontFamily}`;
    ctx.fillStyle = TITLE_CONFIG.color;
    ctx.textBaseline = 'top';

    // Wrap and draw title text
    const lines = wrapText(ctx, title, TITLE_CONFIG.maxWidth);

    lines.forEach((line, index) => {
        const y = TITLE_CONFIG.y + (index * TITLE_CONFIG.lineHeight);
        ctx.fillText(line, TITLE_CONFIG.x, y);
    });

    // Save the image
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);

    console.log(`Generated: ${outputPath}`);
    return outputPath;
}

/**
 * Generate social images for all blog posts missing them
 */
async function generateAllMissing() {
    const postsDir = path.join(__dirname, 'posts');
    const folders = fs.readdirSync(postsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    let generated = 0;
    let skipped = 0;
    let errors = 0;

    for (const folder of folders) {
        const folderPath = path.join(postsDir, folder);
        const socialMediaPath = path.join(folderPath, 'social-media.png');
        const readmePath = path.join(folderPath, 'README.md');

        // Skip if social-media.png already exists
        if (fs.existsSync(socialMediaPath)) {
            skipped++;
            continue;
        }

        // Skip if no README.md
        if (!fs.existsSync(readmePath)) {
            console.log(`Skipping ${folder}: No README.md`);
            skipped++;
            continue;
        }

        try {
            await generateSocialImage(folderPath);
            generated++;
        } catch (err) {
            console.error(`Error processing ${folder}: ${err.message}`);
            errors++;
        }
    }

    console.log(`\nSummary:`);
    console.log(`  Generated: ${generated}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Errors: ${errors}`);
}

// CLI handling
async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--all') {
        console.log('Generating social media images for all posts missing them...\n');
        await generateAllMissing();
    } else if (args[0] === '--help' || args[0] === '-h') {
        console.log(`
Usage: node generate-social-image.js [options] [blog-folder]

Options:
  --all         Generate images for all blog posts missing them (default)
  --help, -h    Show this help message

Arguments:
  blog-folder   Path to the blog post folder (e.g., posts/2025-01-01-my-post)

Examples:
  node generate-social-image.js posts/2025-01-01-my-post
  node generate-social-image.js --all
  npm run generate-social-image -- posts/2025-01-01-my-post
`);
    } else {
        // Single folder mode
        try {
            await generateSocialImage(args[0]);
        } catch (err) {
            console.error(`Error: ${err.message}`);
            process.exit(1);
        }
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
