# How to Build CLI Applications with Deno

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Deno, CLI, TypeScript, Developer Tools

Description: A comprehensive guide to building powerful command-line applications with Deno, covering argument parsing, subcommands, colors, user input, progress bars, and distribution.

---

Command-line interface (CLI) applications remain essential tools in every developer's toolkit. Whether you're automating workflows, building developer tools, or creating system utilities, a well-designed CLI can dramatically improve productivity. Deno, with its TypeScript-first approach, built-in tooling, and security model, has emerged as an excellent platform for building modern CLI applications.

In this comprehensive guide, we'll explore how to build professional-grade CLI applications with Deno. We'll cover everything from parsing arguments to compiling standalone binaries, with practical examples you can use in your own projects.

## Why Deno for CLI Applications?

Before diving into the code, let's understand why Deno is particularly well-suited for CLI development:

1. **TypeScript Out of the Box**: No configuration needed. Write type-safe code immediately.
2. **Single Executable Distribution**: Compile your CLI to a standalone binary with no runtime dependencies.
3. **Built-in Tooling**: Testing, formatting, linting, and documentation generation included.
4. **Secure by Default**: Explicit permissions prevent accidental system access.
5. **URL-based Imports**: No package.json or node_modules required.
6. **Standard Library**: A well-maintained standard library with common utilities.

## Setting Up Your First CLI

Let's start by creating a simple CLI application. Create a new file called `cli.ts`:

This basic example demonstrates the fundamental structure of a Deno CLI application with a main entry point.

```typescript
// cli.ts - Entry point for our CLI application
// Using Deno's built-in argument parsing

const args = Deno.args;

console.log("Welcome to MyCLI!");
console.log("Arguments received:", args);

// Exit with success code
Deno.exit(0);
```

Run this with:

```bash
deno run cli.ts hello world
```

## Parsing Command-Line Arguments

Real CLI applications need robust argument parsing. Deno's standard library provides the `parseArgs` function for this purpose.

This example shows how to parse flags, options with values, and positional arguments using Deno's standard library.

```typescript
// argument-parser.ts
// Import parseArgs from Deno's standard library
import { parseArgs } from "https://deno.land/std@0.224.0/cli/parse_args.ts";

// Define the structure of our parsed arguments
interface CliArgs {
  help: boolean;
  version: boolean;
  verbose: boolean;
  output: string;
  _: (string | number)[];  // Positional arguments
}

// Parse the command-line arguments with type definitions
const args = parseArgs<CliArgs>(Deno.args, {
  // Boolean flags (no value required)
  boolean: ["help", "version", "verbose"],
  // String options (require a value)
  string: ["output"],
  // Short aliases for convenience
  alias: {
    h: "help",
    v: "version",
    V: "verbose",
    o: "output",
  },
  // Default values when not provided
  default: {
    verbose: false,
    output: "./output",
  },
});

// Handle help flag
if (args.help) {
  console.log(`
Usage: mycli [options] <command>

Options:
  -h, --help      Show this help message
  -v, --version   Show version number
  -V, --verbose   Enable verbose output
  -o, --output    Specify output directory

Commands:
  init            Initialize a new project
  build           Build the project
  serve           Start development server
  `);
  Deno.exit(0);
}

// Handle version flag
if (args.version) {
  console.log("mycli v1.0.0");
  Deno.exit(0);
}

// Access parsed values
console.log("Verbose mode:", args.verbose);
console.log("Output directory:", args.output);
console.log("Positional arguments:", args._);
```

## Implementing Subcommands

Most CLI tools use subcommands to organize functionality. Here's a pattern for implementing subcommands cleanly.

This architecture separates each subcommand into its own handler function, making the code modular and maintainable.

```typescript
// subcommands.ts
// A clean pattern for organizing CLI subcommands

import { parseArgs } from "https://deno.land/std@0.224.0/cli/parse_args.ts";

// Define the type for subcommand handlers
type CommandHandler = (args: string[]) => Promise<void>;

// Registry of available subcommands
const commands: Record<string, CommandHandler> = {
  init: handleInit,
  build: handleBuild,
  serve: handleServe,
  deploy: handleDeploy,
};

// Handler for the 'init' subcommand
async function handleInit(args: string[]): Promise<void> {
  const parsed = parseArgs(args, {
    string: ["template", "name"],
    alias: { t: "template", n: "name" },
    default: { template: "default" },
  });

  const projectName = parsed.name || parsed._[0] || "my-project";
  console.log(`Initializing project: ${projectName}`);
  console.log(`Using template: ${parsed.template}`);
  
  // Create project directory
  await Deno.mkdir(projectName, { recursive: true });
  
  // Create initial files
  await Deno.writeTextFile(
    `${projectName}/deno.json`,
    JSON.stringify({ name: projectName, version: "0.1.0" }, null, 2)
  );
  
  console.log(`Project ${projectName} created successfully!`);
}

// Handler for the 'build' subcommand
async function handleBuild(args: string[]): Promise<void> {
  const parsed = parseArgs(args, {
    boolean: ["minify", "watch"],
    string: ["target"],
    alias: { m: "minify", w: "watch", t: "target" },
    default: { target: "es2022" },
  });

  console.log("Building project...");
  console.log(`Target: ${parsed.target}`);
  console.log(`Minify: ${parsed.minify}`);
  console.log(`Watch mode: ${parsed.watch}`);
  
  // Build logic would go here
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.log("Build complete!");
}

// Handler for the 'serve' subcommand
async function handleServe(args: string[]): Promise<void> {
  const parsed = parseArgs(args, {
    string: ["port", "host"],
    alias: { p: "port", H: "host" },
    default: { port: "3000", host: "localhost" },
  });

  console.log(`Starting server at http://${parsed.host}:${parsed.port}`);
  // Server logic would go here
}

// Handler for the 'deploy' subcommand
async function handleDeploy(args: string[]): Promise<void> {
  const parsed = parseArgs(args, {
    boolean: ["dry-run", "force"],
    string: ["environment"],
    alias: { d: "dry-run", f: "force", e: "environment" },
    default: { environment: "production" },
  });

  console.log(`Deploying to ${parsed.environment}...`);
  if (parsed["dry-run"]) {
    console.log("(Dry run - no changes will be made)");
  }
}

// Main entry point
async function main(): Promise<void> {
  const [command, ...args] = Deno.args;

  if (!command || command === "help") {
    showHelp();
    return;
  }

  const handler = commands[command];
  if (!handler) {
    console.error(`Unknown command: ${command}`);
    console.error('Run "mycli help" for available commands');
    Deno.exit(1);
  }

  await handler(args);
}

function showHelp(): void {
  console.log(`
mycli - A powerful CLI tool

Usage: mycli <command> [options]

Commands:
  init     Initialize a new project
  build    Build the project
  serve    Start development server
  deploy   Deploy to production
  help     Show this help message

Run "mycli <command> --help" for command-specific help.
  `);
}

// Run the CLI
main().catch((err) => {
  console.error("Error:", err.message);
  Deno.exit(1);
});
```

## Adding Colors and Formatting

Visual feedback makes CLI applications more user-friendly. Deno's standard library includes color utilities.

This module provides functions for colorful output that improves readability and user experience.

```typescript
// colors.ts
// Adding visual feedback with colors and formatting

import {
  bold,
  red,
  green,
  yellow,
  blue,
  cyan,
  gray,
  bgRed,
  bgGreen,
} from "https://deno.land/std@0.224.0/fmt/colors.ts";

// Utility functions for consistent messaging
const log = {
  // Success messages in green
  success: (msg: string) => console.log(green("✓ ") + msg),
  
  // Error messages in red
  error: (msg: string) => console.error(red("✗ ") + msg),
  
  // Warning messages in yellow
  warn: (msg: string) => console.warn(yellow("⚠ ") + msg),
  
  // Info messages in blue
  info: (msg: string) => console.log(blue("ℹ ") + msg),
  
  // Debug messages in gray (only when verbose)
  debug: (msg: string, verbose: boolean) => {
    if (verbose) console.log(gray("  " + msg));
  },
  
  // Step indicator with step number
  step: (num: number, total: number, msg: string) => {
    console.log(cyan(`[${num}/${total}]`) + " " + msg);
  },
  
  // Header for sections
  header: (msg: string) => {
    console.log("\n" + bold(msg));
    console.log(gray("─".repeat(msg.length)));
  },
};

// Example usage demonstrating the logging utilities
function demonstrateColors(): void {
  log.header("Installation Progress");
  
  log.step(1, 4, "Checking dependencies...");
  log.success("All dependencies satisfied");
  
  log.step(2, 4, "Downloading packages...");
  log.info("Fetching from registry...");
  log.debug("GET https://deno.land/x/module@1.0.0/mod.ts", true);
  log.success("Downloaded 3 packages");
  
  log.step(3, 4, "Compiling...");
  log.warn("Deprecated API usage detected in config.ts");
  log.success("Compilation complete");
  
  log.step(4, 4, "Running tests...");
  log.error("2 tests failed");
  
  // Status badges
  console.log("\n" + bgGreen(bold(" PASS ")) + " Unit tests");
  console.log(bgRed(bold(" FAIL ")) + " Integration tests");
}

demonstrateColors();
```

## Interactive User Input

Many CLI tools need to gather input from users. Here's how to implement interactive prompts.

This implementation provides various prompt types including text input, confirmations, and selection menus.

```typescript
// prompts.ts
// Interactive user input utilities

import {
  bold,
  cyan,
  green,
  yellow,
} from "https://deno.land/std@0.224.0/fmt/colors.ts";

// Read a line of text from stdin
async function readLine(): Promise<string> {
  const buf = new Uint8Array(1024);
  const n = await Deno.stdin.read(buf);
  if (n === null) return "";
  return new TextDecoder().decode(buf.subarray(0, n)).trim();
}

// Simple text prompt
async function prompt(question: string, defaultValue?: string): Promise<string> {
  const defaultHint = defaultValue ? ` (${defaultValue})` : "";
  Deno.stdout.writeSync(
    new TextEncoder().encode(cyan("? ") + question + defaultHint + ": ")
  );
  const answer = await readLine();
  return answer || defaultValue || "";
}

// Yes/No confirmation prompt
async function confirm(question: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? "[Y/n]" : "[y/N]";
  Deno.stdout.writeSync(
    new TextEncoder().encode(cyan("? ") + question + " " + hint + ": ")
  );
  const answer = (await readLine()).toLowerCase();
  
  if (answer === "") return defaultYes;
  return answer === "y" || answer === "yes";
}

// Selection prompt with numbered options
async function select(
  question: string,
  options: string[],
  defaultIndex = 0
): Promise<number> {
  console.log(cyan("? ") + question);
  
  options.forEach((opt, i) => {
    const marker = i === defaultIndex ? green(">") : " ";
    console.log(`  ${marker} ${i + 1}. ${opt}`);
  });
  
  Deno.stdout.writeSync(
    new TextEncoder().encode(`Enter choice (1-${options.length}): `)
  );
  
  const answer = await readLine();
  const index = parseInt(answer) - 1;
  
  if (isNaN(index) || index < 0 || index >= options.length) {
    return defaultIndex;
  }
  return index;
}

// Password input (hidden characters)
async function password(question: string): Promise<string> {
  // Note: True hidden input requires raw mode, this is simplified
  Deno.stdout.writeSync(
    new TextEncoder().encode(cyan("? ") + question + ": ")
  );
  
  // In a real implementation, you would use Deno.stdin.setRaw(true)
  // to hide the input characters
  const answer = await readLine();
  return answer;
}

// Example: Interactive project setup wizard
async function setupWizard(): Promise<void> {
  console.log(bold("\nProject Setup Wizard\n"));
  
  const name = await prompt("Project name", "my-awesome-app");
  const description = await prompt("Description", "A Deno application");
  
  const templateIndex = await select("Choose a template", [
    "Minimal - Basic project structure",
    "API Server - REST API with Oak",
    "CLI Tool - Command-line application",
    "Full Stack - Frontend and backend",
  ]);
  
  const useTypeScript = await confirm("Use strict TypeScript?", true);
  const initGit = await confirm("Initialize git repository?", true);
  
  console.log(yellow("\nProject Configuration:"));
  console.log(`  Name: ${name}`);
  console.log(`  Description: ${description}`);
  console.log(`  Template: ${["Minimal", "API", "CLI", "Full Stack"][templateIndex]}`);
  console.log(`  TypeScript: ${useTypeScript}`);
  console.log(`  Git: ${initGit}`);
  
  const proceed = await confirm("\nCreate project with these settings?");
  
  if (proceed) {
    console.log(green("\n✓ Project created successfully!"));
  } else {
    console.log(yellow("\n⚠ Project creation cancelled."));
  }
}

// Run the wizard
setupWizard();
```

## Progress Bars and Spinners

For long-running operations, visual progress indicators improve the user experience significantly.

This implementation provides both determinate progress bars and indeterminate spinners for different use cases.

```typescript
// progress.ts
// Progress indicators for long-running operations

import { bold, green, gray } from "https://deno.land/std@0.224.0/fmt/colors.ts";

// Progress bar class for determinate progress
class ProgressBar {
  private width: number;
  private current = 0;
  private total: number;
  private label: string;

  constructor(total: number, label = "Progress", width = 40) {
    this.total = total;
    this.label = label;
    this.width = width;
  }

  // Update the progress bar display
  update(current: number, suffix = ""): void {
    this.current = current;
    const percentage = Math.min(100, Math.floor((current / this.total) * 100));
    const filled = Math.floor((this.width * current) / this.total);
    const empty = this.width - filled;
    
    const bar = green("█".repeat(filled)) + gray("░".repeat(empty));
    const line = `\r${this.label}: ${bar} ${percentage}% ${suffix}`;
    
    Deno.stdout.writeSync(new TextEncoder().encode(line));
  }

  // Complete the progress bar
  complete(message?: string): void {
    this.update(this.total);
    console.log(message ? ` ${green("✓")} ${message}` : "");
  }
}

// Spinner class for indeterminate progress
class Spinner {
  private frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private frameIndex = 0;
  private intervalId: number | null = null;
  private message: string;

  constructor(message: string) {
    this.message = message;
  }

  // Start the spinner animation
  start(): void {
    this.intervalId = setInterval(() => {
      const frame = this.frames[this.frameIndex];
      Deno.stdout.writeSync(
        new TextEncoder().encode(`\r${green(frame)} ${this.message}`)
      );
      this.frameIndex = (this.frameIndex + 1) % this.frames.length;
    }, 80);
  }

  // Stop the spinner with a final message
  stop(finalMessage?: string): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    // Clear the line
    Deno.stdout.writeSync(new TextEncoder().encode("\r" + " ".repeat(60) + "\r"));
    if (finalMessage) {
      console.log(green("✓") + " " + finalMessage);
    }
  }
}

// Example: Simulating a download with progress bar
async function simulateDownload(): Promise<void> {
  console.log(bold("\nDownloading packages...\n"));
  
  const files = ["react@18.2.0", "typescript@5.0.0", "deno-std@0.224.0"];
  
  for (const file of files) {
    const progress = new ProgressBar(100, `  ${file}`);
    
    for (let i = 0; i <= 100; i += 5) {
      progress.update(i, `(${i}KB/${100}KB)`);
      await new Promise((r) => setTimeout(r, 50));
    }
    progress.complete();
  }
  
  console.log(green("\n✓ All packages downloaded!\n"));
}

// Example: Using spinner for unknown duration tasks
async function simulateProcessing(): Promise<void> {
  const spinner = new Spinner("Processing files...");
  spinner.start();
  
  // Simulate work
  await new Promise((r) => setTimeout(r, 3000));
  
  spinner.stop("Files processed successfully!");
}

// Run examples
async function main(): Promise<void> {
  await simulateDownload();
  await simulateProcessing();
}

main();
```

## File Generation and Templates

CLI tools often need to generate files from templates. Here's a robust approach to file generation.

This template engine supports variable substitution and conditional blocks for flexible file generation.

```typescript
// templates.ts
// File generation utilities with template support

import { ensureDir } from "https://deno.land/std@0.224.0/fs/ensure_dir.ts";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";

// Template data interface
interface TemplateData {
  [key: string]: string | number | boolean | string[];
}

// Simple template engine with variable substitution
function renderTemplate(template: string, data: TemplateData): string {
  let result = template;
  
  // Replace simple variables: {{variableName}}
  for (const [key, value] of Object.entries(data)) {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
    result = result.replace(regex, String(value));
  }
  
  // Handle conditional blocks: {{#if condition}}...{{/if}}
  result = result.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_, key, content) => {
      return data[key] ? content : "";
    }
  );
  
  // Handle array iteration: {{#each items}}...{{/each}}
  result = result.replace(
    /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g,
    (_, key, content) => {
      const items = data[key];
      if (Array.isArray(items)) {
        return items.map((item) => content.replace(/\{\{\s*this\s*\}\}/g, item)).join("");
      }
      return "";
    }
  );
  
  return result;
}

// Project template definitions
const templates: Record<string, Record<string, string>> = {
  cli: {
    "deno.json": `{
  "name": "{{ name }}",
  "version": "{{ version }}",
  "exports": "./mod.ts",
  "tasks": {
    "dev": "deno run --allow-read --allow-write mod.ts",
    "compile": "deno compile --allow-read --allow-write -o {{ name }} mod.ts"
  }
}`,
    "mod.ts": `#!/usr/bin/env -S deno run --allow-read --allow-write
/**
 * {{ name }} - {{ description }}
 * Version: {{ version }}
 */

import { parseArgs } from "https://deno.land/std@0.224.0/cli/parse_args.ts";

const VERSION = "{{ version }}";

function main(): void {
  const args = parseArgs(Deno.args, {
    boolean: ["help", "version"],
    alias: { h: "help", v: "version" },
  });

  if (args.help) {
    showHelp();
    return;
  }

  if (args.version) {
    console.log(\`{{ name }} v\${VERSION}\`);
    return;
  }

  console.log("Welcome to {{ name }}!");
}

function showHelp(): void {
  console.log(\`
{{ name }} - {{ description }}

Usage: {{ name }} [options]

Options:
  -h, --help     Show this help message
  -v, --version  Show version number
\`);
}

main();
`,
    "README.md": `# {{ name }}

{{ description }}

## Installation

\`\`\`bash
deno install --allow-read --allow-write -n {{ name }} ./mod.ts
\`\`\`

## Usage

\`\`\`bash
{{ name }} --help
\`\`\`

## Development

\`\`\`bash
deno task dev
\`\`\`

## Build

\`\`\`bash
deno task compile
\`\`\`
`,
  },
};

// Generate project from template
async function generateProject(
  templateName: string,
  outputDir: string,
  data: TemplateData
): Promise<void> {
  const template = templates[templateName];
  
  if (!template) {
    throw new Error(`Unknown template: ${templateName}`);
  }
  
  // Create output directory
  await ensureDir(outputDir);
  
  // Generate each file
  for (const [filename, content] of Object.entries(template)) {
    const renderedContent = renderTemplate(content, data);
    const filePath = join(outputDir, filename);
    
    // Ensure parent directory exists
    await ensureDir(join(outputDir, ...filename.split("/").slice(0, -1)));
    
    await Deno.writeTextFile(filePath, renderedContent);
    console.log(`  Created: ${filePath}`);
  }
}

// Example usage
async function main(): Promise<void> {
  console.log("Generating CLI project...\n");
  
  await generateProject("cli", "./my-cli-tool", {
    name: "my-cli-tool",
    version: "1.0.0",
    description: "A powerful command-line utility",
  });
  
  console.log("\n✓ Project generated successfully!");
}

main();
```

## Compiling to Standalone Binary

One of Deno's most powerful features is the ability to compile your CLI to a standalone executable.

This script demonstrates how to compile for multiple platforms and create a release-ready distribution.

```typescript
// build.ts
// Cross-platform compilation script

interface BuildTarget {
  name: string;
  target: string;
  extension: string;
}

// Define build targets for cross-platform compilation
const targets: BuildTarget[] = [
  { name: "linux-x64", target: "x86_64-unknown-linux-gnu", extension: "" },
  { name: "linux-arm64", target: "aarch64-unknown-linux-gnu", extension: "" },
  { name: "macos-x64", target: "x86_64-apple-darwin", extension: "" },
  { name: "macos-arm64", target: "aarch64-apple-darwin", extension: "" },
  { name: "windows-x64", target: "x86_64-pc-windows-msvc", extension: ".exe" },
];

// Build configuration
const config = {
  entryPoint: "./mod.ts",
  outputDir: "./dist",
  binaryName: "mycli",
  permissions: ["--allow-read", "--allow-write", "--allow-net"],
};

async function build(target: BuildTarget): Promise<void> {
  const outputPath = `${config.outputDir}/${config.binaryName}-${target.name}${target.extension}`;
  
  // Construct the compile command
  const command = new Deno.Command("deno", {
    args: [
      "compile",
      ...config.permissions,
      "--target", target.target,
      "--output", outputPath,
      config.entryPoint,
    ],
    stdout: "piped",
    stderr: "piped",
  });

  console.log(`Building for ${target.name}...`);
  
  const { code, stdout, stderr } = await command.output();
  
  if (code !== 0) {
    const errorText = new TextDecoder().decode(stderr);
    throw new Error(`Build failed for ${target.name}: ${errorText}`);
  }
  
  console.log(`  ✓ Built: ${outputPath}`);
}

async function buildAll(): Promise<void> {
  // Ensure output directory exists
  await Deno.mkdir(config.outputDir, { recursive: true });
  
  console.log("Starting multi-platform build...\n");
  
  for (const target of targets) {
    try {
      await build(target);
    } catch (error) {
      console.error(`  ✗ Failed: ${target.name}`);
      console.error(`    ${error.message}`);
    }
  }
  
  console.log("\nBuild complete!");
}

// Build for current platform only (faster for development)
async function buildCurrent(): Promise<void> {
  await Deno.mkdir(config.outputDir, { recursive: true });
  
  const command = new Deno.Command("deno", {
    args: [
      "compile",
      ...config.permissions,
      "--output", `${config.outputDir}/${config.binaryName}`,
      config.entryPoint,
    ],
  });

  const { code } = await command.output();
  
  if (code === 0) {
    console.log(`✓ Built: ${config.outputDir}/${config.binaryName}`);
  } else {
    console.error("Build failed!");
    Deno.exit(1);
  }
}

// Entry point
const buildType = Deno.args[0];

if (buildType === "all") {
  buildAll();
} else {
  buildCurrent();
}
```

To compile your CLI, run:

```bash
# Build for current platform
deno run --allow-run --allow-write --allow-read build.ts

# Build for all platforms
deno run --allow-run --allow-write --allow-read build.ts all
```

## Distributing Your CLI Tool

Once compiled, you can distribute your CLI through various channels.

### Method 1: Direct Installation from URL

Users can install directly from a URL using Deno's install command.

```bash
# Install from a URL (requires Deno runtime)
deno install --allow-read --allow-write -n mycli https://example.com/mycli/mod.ts
```

### Method 2: GitHub Releases

Create a release workflow that builds binaries for all platforms.

This GitHub Actions workflow automates the build and release process for multiple platforms.

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu
            name: linux-x64
          - os: macos-latest
            target: aarch64-apple-darwin
            name: macos-arm64
          - os: windows-latest
            target: x86_64-pc-windows-msvc
            name: windows-x64
            ext: .exe

    runs-on: ${{ matrix.os }}
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: denoland/setup-deno@v1
        with:
          deno-version: v1.x
      
      - name: Build
        run: |
          deno compile --allow-read --allow-write \
            --target ${{ matrix.target }} \
            --output mycli-${{ matrix.name }}${{ matrix.ext }} \
            mod.ts
      
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: mycli-${{ matrix.name }}
          path: mycli-${{ matrix.name }}${{ matrix.ext }}

  release:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
      
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          files: |
            mycli-linux-x64/mycli-linux-x64
            mycli-macos-arm64/mycli-macos-arm64
            mycli-windows-x64/mycli-windows-x64.exe
```

### Method 3: npm/JSR Distribution

Publish to JSR (JavaScript Registry) for easy discovery and installation.

```json
{
  "name": "@yourname/mycli",
  "version": "1.0.0",
  "exports": "./mod.ts",
  "publish": {
    "include": ["mod.ts", "src/**/*.ts", "README.md", "LICENSE"]
  }
}
```

## Complete Example: A File Scaffolding CLI

Let's put everything together into a complete, functional CLI tool that generates project scaffolds.

This complete example combines all the concepts we've covered into a practical, production-ready CLI tool.

```typescript
// scaffold-cli/mod.ts
// A complete CLI tool for generating project scaffolds

import { parseArgs } from "https://deno.land/std@0.224.0/cli/parse_args.ts";
import { ensureDir } from "https://deno.land/std@0.224.0/fs/ensure_dir.ts";
import { join } from "https://deno.land/std@0.224.0/path/mod.ts";
import {
  bold,
  green,
  red,
  yellow,
  cyan,
  gray,
} from "https://deno.land/std@0.224.0/fmt/colors.ts";

const VERSION = "1.0.0";

// Logging utilities
const log = {
  success: (msg: string) => console.log(green("✓") + " " + msg),
  error: (msg: string) => console.error(red("✗") + " " + msg),
  warn: (msg: string) => console.warn(yellow("⚠") + " " + msg),
  info: (msg: string) => console.log(cyan("ℹ") + " " + msg),
  step: (n: number, total: number, msg: string) =>
    console.log(gray(`[${n}/${total}]`) + " " + msg),
};

// Template definitions
const templates: Record<string, Record<string, string>> = {
  api: {
    "deno.json": `{
  "name": "{{ name }}",
  "version": "1.0.0",
  "tasks": {
    "dev": "deno run --watch --allow-net main.ts",
    "start": "deno run --allow-net main.ts"
  }
}`,
    "main.ts": `import { Application, Router } from "https://deno.land/x/oak@v12.6.1/mod.ts";

const router = new Router();

router.get("/", (ctx) => {
  ctx.response.body = { message: "Welcome to {{ name }}!" };
});

router.get("/health", (ctx) => {
  ctx.response.body = { status: "healthy" };
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

console.log("Server running on http://localhost:8000");
await app.listen({ port: 8000 });
`,
  },
  cli: {
    "deno.json": `{
  "name": "{{ name }}",
  "version": "1.0.0",
  "tasks": {
    "dev": "deno run --allow-all main.ts",
    "compile": "deno compile --allow-all -o {{ name }} main.ts"
  }
}`,
    "main.ts": `#!/usr/bin/env -S deno run --allow-all
import { parseArgs } from "https://deno.land/std@0.224.0/cli/parse_args.ts";

const args = parseArgs(Deno.args, {
  boolean: ["help", "version"],
  alias: { h: "help", v: "version" },
});

if (args.help) {
  console.log("{{ name }} - A CLI tool\\n\\nUsage: {{ name }} [options]");
  Deno.exit(0);
}

console.log("Hello from {{ name }}!");
`,
  },
};

// Read line from stdin
async function readLine(): Promise<string> {
  const buf = new Uint8Array(1024);
  const n = await Deno.stdin.read(buf);
  return n ? new TextDecoder().decode(buf.subarray(0, n)).trim() : "";
}

// Prompt for input
async function prompt(question: string, defaultVal?: string): Promise<string> {
  const hint = defaultVal ? ` (${defaultVal})` : "";
  Deno.stdout.writeSync(new TextEncoder().encode(cyan("? ") + question + hint + ": "));
  const answer = await readLine();
  return answer || defaultVal || "";
}

// Confirm prompt
async function confirm(question: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? "[Y/n]" : "[y/N]";
  Deno.stdout.writeSync(new TextEncoder().encode(cyan("? ") + question + " " + hint + ": "));
  const answer = (await readLine()).toLowerCase();
  return answer === "" ? defaultYes : answer === "y" || answer === "yes";
}

// Render template with data
function render(template: string, data: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(data)) {
    result = result.replace(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), value);
  }
  return result;
}

// Command handlers
async function handleNew(args: string[]): Promise<void> {
  const parsed = parseArgs(args, {
    string: ["template"],
    alias: { t: "template" },
  });

  console.log(bold("\n🚀 Create New Project\n"));

  const name = parsed._[0]?.toString() || await prompt("Project name", "my-project");
  const templateName = parsed.template || await prompt("Template (api, cli)", "cli");

  if (!templates[templateName]) {
    log.error(`Unknown template: ${templateName}`);
    log.info(`Available templates: ${Object.keys(templates).join(", ")}`);
    Deno.exit(1);
  }

  const outputDir = join(Deno.cwd(), name);

  console.log(yellow("\nConfiguration:"));
  console.log(`  Name: ${name}`);
  console.log(`  Template: ${templateName}`);
  console.log(`  Location: ${outputDir}`);

  if (!await confirm("\nProceed?")) {
    log.warn("Cancelled.");
    return;
  }

  console.log("");

  const template = templates[templateName];
  const totalSteps = Object.keys(template).length + 1;
  let step = 1;

  log.step(step++, totalSteps, "Creating directory...");
  await ensureDir(outputDir);

  for (const [filename, content] of Object.entries(template)) {
    log.step(step++, totalSteps, `Creating ${filename}...`);
    const rendered = render(content, { name });
    await Deno.writeTextFile(join(outputDir, filename), rendered);
  }

  console.log(green("\n✓ Project created successfully!\n"));
  console.log("Next steps:");
  console.log(gray(`  cd ${name}`));
  console.log(gray("  deno task dev"));
}

async function handleList(): Promise<void> {
  console.log(bold("\nAvailable Templates:\n"));
  for (const [name, files] of Object.entries(templates)) {
    console.log(cyan(`  ${name}`));
    console.log(gray(`    Files: ${Object.keys(files).join(", ")}`));
  }
  console.log("");
}

function showHelp(): void {
  console.log(`
${bold("scaffold")} - Project scaffolding CLI

${bold("USAGE:")}
  scaffold <command> [options]

${bold("COMMANDS:")}
  new [name]    Create a new project
  list          Show available templates
  help          Show this help message

${bold("OPTIONS:")}
  -h, --help      Show help
  -v, --version   Show version
  -t, --template  Specify template (for new command)

${bold("EXAMPLES:")}
  scaffold new my-api --template api
  scaffold new my-cli -t cli
  scaffold list
`);
}

// Main entry point
async function main(): Promise<void> {
  const args = parseArgs(Deno.args, {
    boolean: ["help", "version"],
    alias: { h: "help", v: "version" },
    stopEarly: true,
  });

  if (args.version) {
    console.log(`scaffold v${VERSION}`);
    return;
  }

  const [command, ...rest] = args._;

  switch (command) {
    case "new":
      await handleNew(rest.map(String));
      break;
    case "list":
      await handleList();
      break;
    case "help":
    case undefined:
      if (args.help || command === "help") {
        showHelp();
      } else {
        showHelp();
      }
      break;
    default:
      log.error(`Unknown command: ${command}`);
      showHelp();
      Deno.exit(1);
  }
}

main().catch((err) => {
  log.error(err.message);
  Deno.exit(1);
});
```

## Best Practices Summary

When building CLI applications with Deno, follow these best practices to create robust, user-friendly tools:

### Code Organization
- Separate commands into individual handler functions for maintainability
- Create a central registry for subcommands to enable easy extensibility
- Keep templates and configuration separate from logic
- Use TypeScript interfaces for type safety on parsed arguments

### User Experience
- Always provide a `--help` flag with clear usage instructions
- Include a `--version` flag showing the current version
- Use colors sparingly but effectively to highlight important information
- Show progress indicators for operations that take more than a second
- Provide sensible defaults but allow customization
- Give clear error messages that explain what went wrong and how to fix it

### Error Handling
- Wrap main logic in try-catch blocks to handle unexpected errors gracefully
- Use appropriate exit codes (0 for success, 1 for errors)
- Validate user input before processing
- Provide helpful suggestions when commands or arguments are incorrect

### Performance
- Use streaming for large file operations
- Compile to binary for faster startup times in production
- Lazy-load dependencies when possible

### Distribution
- Test on all target platforms before release
- Include clear installation instructions in your README
- Use semantic versioning for releases
- Automate builds and releases with CI/CD

## Conclusion

Deno provides an excellent foundation for building modern CLI applications. With TypeScript support out of the box, a comprehensive standard library, and the ability to compile to standalone binaries, Deno streamlines the entire development and distribution process.

In this guide, we covered the essential aspects of CLI development: parsing arguments, implementing subcommands, adding visual feedback with colors and progress indicators, handling user input interactively, generating files from templates, and compiling for distribution.

The combination of type safety, security by default, and modern JavaScript features makes Deno particularly well-suited for CLI development. Whether you're building internal tools, developer utilities, or public applications, these patterns and practices will help you create professional-grade command-line interfaces.

Start with a simple structure, add features incrementally, and focus on providing a great user experience. Your CLI tool can be as simple or as sophisticated as your use case demands, and Deno gives you the flexibility to grow your application over time.

The complete example we built demonstrates how these pieces fit together in a real-world application. Use it as a starting point for your own CLI projects, and customize it to match your specific requirements.

Happy coding!
