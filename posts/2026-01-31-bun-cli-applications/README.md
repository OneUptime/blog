# How to Build CLI Applications with Bun

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Bun, CLI, JavaScript, Developer Tools

Description: A comprehensive guide to building fast, cross-platform command-line applications using Bun with argument parsing, subcommands, colors, and single-executable compilation.

---

Command-line interface (CLI) applications remain a cornerstone of developer tooling. Whether you are building deployment scripts, code generators, or developer utilities, having a robust CLI framework is essential. Bun, the fast all-in-one JavaScript runtime, offers excellent capabilities for building CLI applications with minimal dependencies and blazing-fast execution times.

In this guide, we will walk through everything you need to know to build production-ready CLI applications with Bun, from basic argument parsing to compiling your tool into a single executable binary.

## Why Bun for CLI Applications?

Bun brings several advantages to CLI development:

- **Fast startup time**: Bun starts significantly faster than Node.js, making your CLI feel snappy
- **Built-in TypeScript support**: No transpilation step required
- **Single executable compilation**: Distribute your CLI as a standalone binary
- **Native APIs**: Built-in file system, HTTP, and process APIs optimized for performance
- **Minimal dependencies**: Many features that require packages in Node.js are built into Bun

## Setting Up Your CLI Project

Let us start by creating a new Bun project for our CLI application.

Create a new directory and initialize the project:

```bash
mkdir my-cli-tool
cd my-cli-tool
bun init
```

This creates a basic project structure. Now let us set up the entry point for our CLI.

Create the main CLI entry file with shebang support:

```typescript
#!/usr/bin/env bun

// cli.ts - Main entry point for our CLI application
// The shebang line above allows running this file directly: ./cli.ts

const args = Bun.argv.slice(2); // Remove 'bun' and script path
console.log("Arguments received:", args);
```

The shebang `#!/usr/bin/env bun` tells the system to use Bun to execute this file. After making the file executable with `chmod +x cli.ts`, you can run it directly.

## Argument Parsing

Bun provides access to command-line arguments through `Bun.argv` and the standard `process.argv`. For more sophisticated parsing, you can use `util.parseArgs` which is available in Bun.

Here is a basic argument parser using the built-in utility:

```typescript
#!/usr/bin/env bun

// Using Bun's built-in parseArgs for structured argument handling
import { parseArgs } from "util";

const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    help: {
      type: "boolean",
      short: "h",
    },
    version: {
      type: "boolean",
      short: "v",
    },
    output: {
      type: "string",
      short: "o",
      default: "./output",
    },
    verbose: {
      type: "boolean",
      default: false,
    },
  },
  strict: true,
  allowPositionals: true,
});

if (values.help) {
  console.log(`
Usage: my-cli [options] <command> [args]

Options:
  -h, --help     Show this help message
  -v, --version  Show version number
  -o, --output   Output directory (default: ./output)
  --verbose      Enable verbose logging
  `);
  process.exit(0);
}

if (values.version) {
  console.log("my-cli v1.0.0");
  process.exit(0);
}

console.log("Parsed values:", values);
console.log("Positional arguments:", positionals);
```

For more complex CLIs, you might want to create a reusable argument parser class:

```typescript
// lib/args.ts - Reusable argument parsing utility

interface ParsedArgs {
  flags: Record<string, boolean>;
  options: Record<string, string>;
  positionals: string[];
}

export function parseArguments(argv: string[]): ParsedArgs {
  const flags: Record<string, boolean> = {};
  const options: Record<string, string> = {};
  const positionals: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg.startsWith("--")) {
      // Long option: --name=value or --flag
      const [key, value] = arg.slice(2).split("=");
      if (value !== undefined) {
        options[key] = value;
      } else if (argv[i + 1] && !argv[i + 1].startsWith("-")) {
        options[key] = argv[++i];
      } else {
        flags[key] = true;
      }
    } else if (arg.startsWith("-")) {
      // Short option: -n value or -f
      const key = arg.slice(1);
      if (argv[i + 1] && !argv[i + 1].startsWith("-")) {
        options[key] = argv[++i];
      } else {
        flags[key] = true;
      }
    } else {
      positionals.push(arg);
    }
  }

  return { flags, options, positionals };
}
```

## Implementing Subcommands

Most CLI tools support subcommands like `git commit` or `npm install`. Here is how to structure a CLI with subcommands:

```typescript
#!/usr/bin/env bun

// cli.ts - CLI with subcommand support

type CommandHandler = (args: string[]) => Promise<void> | void;

interface Command {
  name: string;
  description: string;
  handler: CommandHandler;
}

// Define available commands with their handlers
const commands: Command[] = [
  {
    name: "init",
    description: "Initialize a new project",
    handler: handleInit,
  },
  {
    name: "build",
    description: "Build the project",
    handler: handleBuild,
  },
  {
    name: "deploy",
    description: "Deploy to production",
    handler: handleDeploy,
  },
];

async function handleInit(args: string[]) {
  const projectName = args[0] || "my-project";
  console.log(`Initializing project: ${projectName}`);
  // Implementation here
}

async function handleBuild(args: string[]) {
  const target = args[0] || "production";
  console.log(`Building for: ${target}`);
  // Implementation here
}

async function handleDeploy(args: string[]) {
  console.log("Deploying to production...");
  // Implementation here
}

function showHelp() {
  console.log(`
Usage: my-cli <command> [options]

Commands:`);
  
  for (const cmd of commands) {
    console.log(`  ${cmd.name.padEnd(12)} ${cmd.description}`);
  }
  
  console.log(`
Run 'my-cli <command> --help' for more information on a command.`);
}

// Main execution logic
async function main() {
  const args = Bun.argv.slice(2);
  const commandName = args[0];

  if (!commandName || commandName === "--help" || commandName === "-h") {
    showHelp();
    process.exit(0);
  }

  const command = commands.find((c) => c.name === commandName);

  if (!command) {
    console.error(`Unknown command: ${commandName}`);
    showHelp();
    process.exit(1);
  }

  try {
    await command.handler(args.slice(1));
  } catch (error) {
    console.error(`Error executing ${commandName}:`, error);
    process.exit(1);
  }
}

main();
```

## Adding Colors and Formatting

Colorful output makes CLI tools more user-friendly. Bun works seamlessly with ANSI escape codes for terminal styling.

Here is a utility module for terminal colors without any external dependencies:

```typescript
// lib/colors.ts - Terminal color utilities using ANSI escape codes

const isColorSupported = 
  process.env.FORCE_COLOR !== "0" && 
  (process.env.FORCE_COLOR || process.stdout.isTTY);

// ANSI color codes wrapped in a simple API
export const colors = {
  // Text colors
  red: (text: string) => isColorSupported ? `\x1b[31m${text}\x1b[0m` : text,
  green: (text: string) => isColorSupported ? `\x1b[32m${text}\x1b[0m` : text,
  yellow: (text: string) => isColorSupported ? `\x1b[33m${text}\x1b[0m` : text,
  blue: (text: string) => isColorSupported ? `\x1b[34m${text}\x1b[0m` : text,
  magenta: (text: string) => isColorSupported ? `\x1b[35m${text}\x1b[0m` : text,
  cyan: (text: string) => isColorSupported ? `\x1b[36m${text}\x1b[0m` : text,
  white: (text: string) => isColorSupported ? `\x1b[37m${text}\x1b[0m` : text,
  gray: (text: string) => isColorSupported ? `\x1b[90m${text}\x1b[0m` : text,

  // Text styles
  bold: (text: string) => isColorSupported ? `\x1b[1m${text}\x1b[0m` : text,
  dim: (text: string) => isColorSupported ? `\x1b[2m${text}\x1b[0m` : text,
  italic: (text: string) => isColorSupported ? `\x1b[3m${text}\x1b[0m` : text,
  underline: (text: string) => isColorSupported ? `\x1b[4m${text}\x1b[0m` : text,

  // Background colors
  bgRed: (text: string) => isColorSupported ? `\x1b[41m${text}\x1b[0m` : text,
  bgGreen: (text: string) => isColorSupported ? `\x1b[42m${text}\x1b[0m` : text,
  bgYellow: (text: string) => isColorSupported ? `\x1b[43m${text}\x1b[0m` : text,
  bgBlue: (text: string) => isColorSupported ? `\x1b[44m${text}\x1b[0m` : text,
};

// Semantic helpers for common CLI output patterns
export const log = {
  info: (msg: string) => console.log(colors.blue("ℹ"), msg),
  success: (msg: string) => console.log(colors.green("✓"), msg),
  warning: (msg: string) => console.log(colors.yellow("⚠"), msg),
  error: (msg: string) => console.error(colors.red("✗"), msg),
};
```

Using the colors module in your CLI:

```typescript
import { colors, log } from "./lib/colors";

log.info("Starting build process...");
log.success("Build completed successfully!");
log.warning("Some files were skipped");
log.error("Failed to connect to server");

// Direct color usage for custom formatting
console.log(`${colors.bold("Project:")} ${colors.cyan("my-app")}`);
console.log(`${colors.dim("Version:")} 1.0.0`);
```

## Handling User Input

Interactive CLIs need to read user input. Bun provides several ways to handle this.

Basic prompt implementation for user input:

```typescript
// lib/prompt.ts - Interactive prompt utilities

// Simple text input prompt
export async function prompt(question: string): Promise<string> {
  process.stdout.write(question);
  
  for await (const line of console) {
    return line;
  }
  
  return "";
}

// Yes/No confirmation prompt
export async function confirm(
  question: string, 
  defaultValue = false
): Promise<boolean> {
  const hint = defaultValue ? "[Y/n]" : "[y/N]";
  const answer = await prompt(`${question} ${hint} `);
  
  if (answer === "") return defaultValue;
  return answer.toLowerCase().startsWith("y");
}

// Select from a list of options
export async function select<T extends string>(
  question: string,
  options: T[]
): Promise<T> {
  console.log(question);
  
  options.forEach((opt, i) => {
    console.log(`  ${i + 1}. ${opt}`);
  });
  
  const answer = await prompt("Enter number: ");
  const index = parseInt(answer, 10) - 1;
  
  if (index >= 0 && index < options.length) {
    return options[index];
  }
  
  console.log("Invalid selection, please try again.");
  return select(question, options);
}
```

Using the prompt utilities:

```typescript
import { prompt, confirm, select } from "./lib/prompt";

async function interactiveSetup() {
  const projectName = await prompt("Project name: ");
  const useTypeScript = await confirm("Use TypeScript?", true);
  const framework = await select("Choose a framework:", [
    "React",
    "Vue",
    "Svelte",
    "None",
  ]);

  console.log(`
Creating project: ${projectName}
TypeScript: ${useTypeScript}
Framework: ${framework}
  `);
}
```

## Progress Indicators

For long-running operations, progress indicators improve user experience.

Spinner implementation for indeterminate progress:

```typescript
// lib/spinner.ts - Animated spinner for async operations

const spinnerFrames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export class Spinner {
  private message: string;
  private frameIndex = 0;
  private intervalId: Timer | null = null;

  constructor(message: string) {
    this.message = message;
  }

  start() {
    // Hide cursor for cleaner animation
    process.stdout.write("\x1b[?25l");
    
    this.intervalId = setInterval(() => {
      const frame = spinnerFrames[this.frameIndex];
      process.stdout.write(`\r${frame} ${this.message}`);
      this.frameIndex = (this.frameIndex + 1) % spinnerFrames.length;
    }, 80);
  }

  update(message: string) {
    this.message = message;
  }

  stop(finalMessage?: string) {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Clear line and show cursor
    process.stdout.write("\r\x1b[K");
    process.stdout.write("\x1b[?25h");
    
    if (finalMessage) {
      console.log(finalMessage);
    }
  }
}

// Helper function for running async tasks with a spinner
export async function withSpinner<T>(
  message: string,
  task: () => Promise<T>
): Promise<T> {
  const spinner = new Spinner(message);
  spinner.start();
  
  try {
    const result = await task();
    spinner.stop(`✓ ${message}`);
    return result;
  } catch (error) {
    spinner.stop(`✗ ${message}`);
    throw error;
  }
}
```

Progress bar for determinate progress:

```typescript
// lib/progress.ts - Progress bar for operations with known length

export class ProgressBar {
  private total: number;
  private current = 0;
  private width = 40;
  private label: string;

  constructor(total: number, label = "Progress") {
    this.total = total;
    this.label = label;
  }

  update(current: number) {
    this.current = current;
    this.render();
  }

  increment(amount = 1) {
    this.current += amount;
    this.render();
  }

  private render() {
    const percentage = Math.min(100, Math.round((this.current / this.total) * 100));
    const filled = Math.round((this.current / this.total) * this.width);
    const empty = this.width - filled;
    
    const bar = "█".repeat(filled) + "░".repeat(empty);
    const output = `\r${this.label}: [${bar}] ${percentage}% (${this.current}/${this.total})`;
    
    process.stdout.write(output);
    
    if (this.current >= this.total) {
      console.log(); // New line when complete
    }
  }

  complete() {
    this.current = this.total;
    this.render();
  }
}
```

Using progress indicators:

```typescript
import { withSpinner } from "./lib/spinner";
import { ProgressBar } from "./lib/progress";

// Using spinner for async operations
await withSpinner("Downloading dependencies", async () => {
  await Bun.sleep(2000); // Simulated work
});

// Using progress bar for file processing
const files = ["file1.ts", "file2.ts", "file3.ts", "file4.ts", "file5.ts"];
const progress = new ProgressBar(files.length, "Processing");

for (const file of files) {
  await processFile(file);
  progress.increment();
}
```

## Compiling to a Single Executable

One of Bun's most powerful features is the ability to compile your CLI into a standalone executable that does not require Bun to be installed.

The basic compile command creates a native binary:

```bash
bun build ./cli.ts --compile --outfile my-cli
```

For cross-platform distribution, you can target different operating systems:

```bash
# Compile for macOS ARM64 (Apple Silicon)
bun build ./cli.ts --compile --target=bun-darwin-arm64 --outfile my-cli-macos-arm64

# Compile for macOS x64 (Intel)
bun build ./cli.ts --compile --target=bun-darwin-x64 --outfile my-cli-macos-x64

# Compile for Linux x64
bun build ./cli.ts --compile --target=bun-linux-x64 --outfile my-cli-linux-x64

# Compile for Linux ARM64
bun build ./cli.ts --compile --target=bun-linux-arm64 --outfile my-cli-linux-arm64

# Compile for Windows x64
bun build ./cli.ts --compile --target=bun-windows-x64 --outfile my-cli-windows-x64.exe
```

You can also embed static assets and configuration files:

```bash
# Embed assets into the executable
bun build ./cli.ts --compile --outfile my-cli \
  --public-path=./assets \
  --asset-naming=[name].[ext]
```

## Distribution and Installation

Configure your package.json for npm distribution:

```json
{
  "name": "my-cli-tool",
  "version": "1.0.0",
  "description": "A powerful CLI tool built with Bun",
  "type": "module",
  "bin": {
    "my-cli": "./cli.ts"
  },
  "files": [
    "cli.ts",
    "lib/**/*.ts"
  ],
  "scripts": {
    "build": "bun build ./cli.ts --compile --outfile dist/my-cli",
    "build:all": "npm run build:macos && npm run build:linux && npm run build:windows",
    "build:macos": "bun build ./cli.ts --compile --target=bun-darwin-arm64 --outfile dist/my-cli-macos",
    "build:linux": "bun build ./cli.ts --compile --target=bun-linux-x64 --outfile dist/my-cli-linux",
    "build:windows": "bun build ./cli.ts --compile --target=bun-windows-x64 --outfile dist/my-cli.exe"
  },
  "keywords": ["cli", "bun", "tool"],
  "license": "MIT"
}
```

After configuring package.json, users can install your CLI globally:

```bash
# Install globally via npm
npm install -g my-cli-tool

# Or with bun
bun install -g my-cli-tool

# Or run directly without installing
bunx my-cli-tool
```

## Complete CLI Tool Example

Let us put everything together into a complete file scaffolding CLI tool:

```typescript
#!/usr/bin/env bun

// scaffold-cli.ts - A complete CLI tool for project scaffolding

import { parseArgs } from "util";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

// Color utilities
const c = {
  red: (t: string) => `\x1b[31m${t}\x1b[0m`,
  green: (t: string) => `\x1b[32m${t}\x1b[0m`,
  yellow: (t: string) => `\x1b[33m${t}\x1b[0m`,
  cyan: (t: string) => `\x1b[36m${t}\x1b[0m`,
  bold: (t: string) => `\x1b[1m${t}\x1b[0m`,
  dim: (t: string) => `\x1b[2m${t}\x1b[0m`,
};

// Logging utilities
const log = {
  info: (msg: string) => console.log(c.cyan("ℹ"), msg),
  success: (msg: string) => console.log(c.green("✓"), msg),
  warn: (msg: string) => console.log(c.yellow("⚠"), msg),
  error: (msg: string) => console.error(c.red("✗"), msg),
};

// Spinner for async operations
class Spinner {
  private frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
  private i = 0;
  private id: Timer | null = null;
  
  constructor(private msg: string) {}
  
  start() {
    process.stdout.write("\x1b[?25l");
    this.id = setInterval(() => {
      process.stdout.write(`\r${this.frames[this.i]} ${this.msg}`);
      this.i = (this.i + 1) % this.frames.length;
    }, 80);
  }
  
  stop(final?: string) {
    if (this.id) clearInterval(this.id);
    process.stdout.write("\r\x1b[K\x1b[?25h");
    if (final) console.log(final);
  }
}

// Prompt for user input
async function prompt(q: string): Promise<string> {
  process.stdout.write(q);
  for await (const line of console) return line;
  return "";
}

// Project templates
const templates = {
  typescript: {
    "package.json": JSON.stringify({
      name: "{{name}}",
      version: "1.0.0",
      type: "module",
      scripts: {
        dev: "bun run --watch src/index.ts",
        build: "bun build src/index.ts --outdir dist",
        test: "bun test"
      }
    }, null, 2),
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        target: "ESNext",
        module: "ESNext",
        moduleResolution: "bundler",
        strict: true,
        outDir: "dist"
      },
      include: ["src/**/*"]
    }, null, 2),
    "src/index.ts": `console.log("Hello from {{name}}!");`,
    ".gitignore": "node_modules/\ndist/\n.env",
    "README.md": "# {{name}}\n\nCreated with scaffold-cli"
  },
  "cli-tool": {
    "package.json": JSON.stringify({
      name: "{{name}}",
      version: "1.0.0",
      type: "module",
      bin: { "{{name}}": "./cli.ts" },
      scripts: {
        build: "bun build ./cli.ts --compile --outfile dist/{{name}}"
      }
    }, null, 2),
    "cli.ts": `#!/usr/bin/env bun
console.log("{{name}} CLI v1.0.0");`,
    ".gitignore": "node_modules/\ndist/"
  }
};

// Create project from template
async function createProject(name: string, template: keyof typeof templates) {
  const targetDir = join(process.cwd(), name);
  
  if (existsSync(targetDir)) {
    log.error(`Directory ${name} already exists`);
    process.exit(1);
  }
  
  const spinner = new Spinner(`Creating ${name}...`);
  spinner.start();
  
  try {
    mkdirSync(targetDir, { recursive: true });
    
    const files = templates[template];
    for (const [path, content] of Object.entries(files)) {
      const filePath = join(targetDir, path);
      const dir = join(filePath, "..");
      
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      
      const processed = content.replace(/\{\{name\}\}/g, name);
      writeFileSync(filePath, processed);
    }
    
    await Bun.sleep(500); // Brief pause for effect
    spinner.stop(c.green("✓") + ` Created ${name}`);
    
    console.log(`
${c.bold("Next steps:")}
  ${c.cyan("cd")} ${name}
  ${c.cyan("bun install")}
  ${c.cyan("bun run dev")}
`);
  } catch (error) {
    spinner.stop(c.red("✗") + ` Failed to create ${name}`);
    throw error;
  }
}

// Interactive mode
async function interactiveMode() {
  console.log(c.bold("\nProject Scaffolding Tool\n"));
  
  const name = await prompt("Project name: ");
  if (!name.trim()) {
    log.error("Project name is required");
    process.exit(1);
  }
  
  console.log("\nAvailable templates:");
  console.log("  1. typescript - TypeScript project");
  console.log("  2. cli-tool - CLI application");
  
  const choice = await prompt("\nSelect template (1-2): ");
  const templateMap: Record<string, keyof typeof templates> = {
    "1": "typescript",
    "2": "cli-tool"
  };
  
  const template = templateMap[choice.trim()];
  if (!template) {
    log.error("Invalid template selection");
    process.exit(1);
  }
  
  await createProject(name.trim(), template);
}

// Main CLI logic
async function main() {
  const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
      template: { type: "string", short: "t", default: "typescript" },
      interactive: { type: "boolean", short: "i" }
    },
    allowPositionals: true,
    strict: true
  });
  
  if (values.version) {
    console.log("scaffold-cli v1.0.0");
    process.exit(0);
  }
  
  if (values.help) {
    console.log(`
${c.bold("scaffold-cli")} - Project scaffolding tool

${c.bold("Usage:")}
  scaffold-cli [options] <project-name>
  scaffold-cli -i

${c.bold("Options:")}
  -h, --help         Show this help message
  -v, --version      Show version number
  -t, --template     Template to use (typescript, cli-tool)
  -i, --interactive  Interactive mode

${c.bold("Examples:")}
  scaffold-cli my-app
  scaffold-cli -t cli-tool my-tool
  scaffold-cli -i
`);
    process.exit(0);
  }
  
  if (values.interactive) {
    await interactiveMode();
    return;
  }
  
  const projectName = positionals[0];
  if (!projectName) {
    log.error("Project name is required. Use -h for help.");
    process.exit(1);
  }
  
  const template = values.template as keyof typeof templates;
  if (!templates[template]) {
    log.error(`Unknown template: ${template}`);
    process.exit(1);
  }
  
  await createProject(projectName, template);
}

main().catch((err) => {
  log.error(err.message);
  process.exit(1);
});
```

## Best Practices Summary

When building CLI applications with Bun, keep these best practices in mind:

**1. Always include help and version flags**
Users expect `-h/--help` and `-v/--version` to work. Make them available on both the main command and subcommands.

**2. Use exit codes properly**
Return 0 for success and non-zero values for errors. This enables your CLI to work correctly in scripts and CI/CD pipelines.

**3. Respect terminal capabilities**
Check for TTY and color support before outputting colors. Support `NO_COLOR` and `FORCE_COLOR` environment variables.

**4. Provide clear error messages**
When something fails, tell users what went wrong and how to fix it. Include the command they can run to get more help.

**5. Design for scriptability**
Allow non-interactive usage with flags. Support piping input and output. Output machine-readable formats like JSON when requested.

**6. Keep startup time fast**
Lazy-load heavy modules. Avoid unnecessary initialization. Users notice CLI sluggishness immediately.

**7. Handle signals gracefully**
Listen for SIGINT (Ctrl+C) and SIGTERM to clean up resources before exiting.

**8. Document everything**
Include a README, help text, and examples. Good documentation makes the difference between a tool people love and one they abandon.

**9. Test on all target platforms**
If you compile for multiple platforms, test on each one. Filesystem paths, line endings, and terminal behavior vary across operating systems.

**10. Version your CLI properly**
Follow semantic versioning. Breaking changes in CLI flags or output format should result in major version bumps.

## Conclusion

Bun provides an excellent foundation for building CLI applications. Its fast startup time, built-in TypeScript support, and ability to compile to standalone executables make it a compelling choice over traditional Node.js tooling.

We covered the essential components of CLI development: argument parsing, subcommands, colored output, user input, progress indicators, and distribution. The complete example demonstrates how these pieces fit together into a cohesive tool.

The ability to compile your CLI into a single executable that works without any runtime installed is particularly powerful for distribution. Users can download a binary and run it immediately, regardless of whether they have Bun, Node.js, or any JavaScript runtime installed.

As you build your own CLI tools, remember that the best CLIs are fast, helpful, and predictable. They provide clear feedback, handle errors gracefully, and respect the user's terminal environment.

Start with the patterns shown in this guide, and expand them based on your specific needs. Bun's excellent performance and developer experience make CLI development both productive and enjoyable.
