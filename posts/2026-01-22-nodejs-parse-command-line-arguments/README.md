# How to Parse Command Line Arguments in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, CLI, CommandLine, Arguments, JavaScript

Description: Learn how to parse command line arguments in Node.js using process.argv, yargs, commander, and other libraries to build robust CLI tools.

---

Building command line tools is a common Node.js use case. Whether you are creating a build script, a deployment tool, or a full CLI application, you need to parse command line arguments. This guide covers all the approaches from basic to advanced.

## Using process.argv (Built-in)

Node.js provides `process.argv` containing command line arguments:

```javascript
// args.js
console.log(process.argv);
```

Running `node args.js hello world --flag`:

```javascript
[
  '/usr/local/bin/node',  // Node.js executable path
  '/path/to/args.js',     // Script path
  'hello',                // First argument
  'world',                // Second argument
  '--flag'                // Flag argument
]
```

### Extracting Arguments

```javascript
// cli.js
// Skip first two elements (node and script path)
const args = process.argv.slice(2);

console.log('Arguments:', args);

// Access specific arguments
const [command, target] = args;
console.log(`Command: ${command}`);
console.log(`Target: ${target}`);
```

```bash
node cli.js build ./src
# Arguments: [ 'build', './src' ]
# Command: build
# Target: ./src
```

### Basic Flag Parsing

```javascript
// cli.js
const args = process.argv.slice(2);

// Check for flags
const verbose = args.includes('--verbose') || args.includes('-v');
const dryRun = args.includes('--dry-run');

// Get value flags
const outputIndex = args.indexOf('--output');
const output = outputIndex !== -1 ? args[outputIndex + 1] : 'default';

console.log({ verbose, dryRun, output });
```

```bash
node cli.js --verbose --output ./dist
# { verbose: true, dryRun: false, output: './dist' }
```

### Simple Parser Function

```javascript
// parse-args.js
function parseArgs(args) {
  const result = {
    flags: {},
    positional: [],
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--')) {
      // Long flag
      const key = arg.slice(2);
      const nextArg = args[i + 1];
      
      if (nextArg && !nextArg.startsWith('-')) {
        result.flags[key] = nextArg;
        i++; // Skip next arg
      } else {
        result.flags[key] = true;
      }
    } else if (arg.startsWith('-')) {
      // Short flag
      const key = arg.slice(1);
      result.flags[key] = true;
    } else {
      // Positional argument
      result.positional.push(arg);
    }
  }
  
  return result;
}

// Usage
const { flags, positional } = parseArgs(process.argv.slice(2));
console.log('Flags:', flags);
console.log('Positional:', positional);
```

## Using util.parseArgs (Node.js 18.3+)

Node.js has a built-in argument parser:

```javascript
// cli.js
const { parseArgs } = require('util');

const { values, positionals } = parseArgs({
  options: {
    verbose: {
      type: 'boolean',
      short: 'v',
    },
    output: {
      type: 'string',
      short: 'o',
      default: './dist',
    },
    count: {
      type: 'string',
      multiple: true,
    },
  },
  allowPositionals: true,
});

console.log('Values:', values);
console.log('Positionals:', positionals);
```

```bash
node cli.js build --verbose -o ./out
# Values: { verbose: true, output: './out' }
# Positionals: [ 'build' ]
```

## Using Commander.js

Commander is one of the most popular CLI libraries:

```bash
npm install commander
```

### Basic Usage

```javascript
// cli.js
const { program } = require('commander');

program
  .name('myapp')
  .description('A sample CLI application')
  .version('1.0.0');

program
  .option('-v, --verbose', 'Enable verbose output')
  .option('-o, --output <path>', 'Output directory', './dist')
  .option('-c, --count <number>', 'Number of items', parseInt, 10);

program.parse();

const options = program.opts();
console.log('Options:', options);
console.log('Arguments:', program.args);
```

```bash
node cli.js --verbose --output ./build file1.js file2.js
# Options: { verbose: true, output: './build', count: 10 }
# Arguments: [ 'file1.js', 'file2.js' ]
```

### Subcommands

```javascript
// cli.js
const { program } = require('commander');

program
  .name('deploy')
  .description('Deployment CLI tool')
  .version('1.0.0');

// Subcommand: deploy start
program
  .command('start')
  .description('Start the application')
  .option('-p, --port <number>', 'Port number', '3000')
  .option('-e, --env <environment>', 'Environment', 'development')
  .action((options) => {
    console.log(`Starting on port ${options.port} in ${options.env} mode`);
  });

// Subcommand: deploy stop
program
  .command('stop')
  .description('Stop the application')
  .option('-f, --force', 'Force stop')
  .action((options) => {
    console.log(`Stopping application${options.force ? ' (forced)' : ''}`);
  });

// Subcommand: deploy status
program
  .command('status')
  .description('Check application status')
  .action(() => {
    console.log('Application is running');
  });

program.parse();
```

```bash
node cli.js start --port 8080 --env production
# Starting on port 8080 in production mode

node cli.js stop --force
# Stopping application (forced)
```

### Required Arguments

```javascript
const { program } = require('commander');

program
  .command('build <source>')
  .description('Build the project')
  .argument('[destination]', 'Output directory', './dist')
  .option('--minify', 'Minify output')
  .action((source, destination, options) => {
    console.log(`Building ${source} to ${destination}`);
    console.log('Minify:', options.minify);
  });

program.parse();
```

```bash
node cli.js build ./src
# Building ./src to ./dist
# Minify: undefined

node cli.js build ./src ./output --minify
# Building ./src to ./output
# Minify: true
```

## Using Yargs

Yargs provides a fluent API for argument parsing:

```bash
npm install yargs
```

### Basic Usage

```javascript
// cli.js
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const argv = yargs(hideBin(process.argv))
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Run with verbose logging',
  })
  .option('output', {
    alias: 'o',
    type: 'string',
    description: 'Output directory',
    default: './dist',
  })
  .option('count', {
    alias: 'c',
    type: 'number',
    description: 'Number of items',
    default: 10,
  })
  .help()
  .parse();

console.log('Arguments:', argv);
```

```bash
node cli.js --verbose --output ./build
# Arguments: { verbose: true, output: './build', count: 10, ... }

node cli.js --help
# Shows help text
```

### Commands with Yargs

```javascript
// cli.js
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

yargs(hideBin(process.argv))
  .command(
    'build [source]',
    'Build the project',
    (yargs) => {
      return yargs
        .positional('source', {
          describe: 'Source directory',
          default: './src',
        })
        .option('minify', {
          type: 'boolean',
          description: 'Minify output',
        });
    },
    (argv) => {
      console.log(`Building ${argv.source}`);
      console.log('Minify:', argv.minify);
    }
  )
  .command(
    'serve',
    'Start development server',
    (yargs) => {
      return yargs.option('port', {
        alias: 'p',
        type: 'number',
        default: 3000,
      });
    },
    (argv) => {
      console.log(`Server running on port ${argv.port}`);
    }
  )
  .demandCommand(1, 'You need to specify a command')
  .help()
  .parse();
```

```bash
node cli.js build ./app --minify
# Building ./app
# Minify: true

node cli.js serve --port 8080
# Server running on port 8080
```

### Validation

```javascript
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

yargs(hideBin(process.argv))
  .option('port', {
    type: 'number',
    description: 'Port number',
  })
  .check((argv) => {
    if (argv.port && (argv.port < 1 || argv.port > 65535)) {
      throw new Error('Port must be between 1 and 65535');
    }
    return true;
  })
  .option('env', {
    type: 'string',
    choices: ['development', 'staging', 'production'],
    default: 'development',
  })
  .coerce('files', (files) => {
    // Transform array of files
    return files.map((f) => f.toUpperCase());
  })
  .parse();
```

## Using minimist

A minimal argument parser:

```bash
npm install minimist
```

```javascript
// cli.js
const minimist = require('minimist');

const args = minimist(process.argv.slice(2), {
  string: ['output', 'env'],
  boolean: ['verbose', 'force'],
  alias: {
    v: 'verbose',
    o: 'output',
    f: 'force',
  },
  default: {
    output: './dist',
    env: 'development',
  },
});

console.log('Parsed:', args);
console.log('Positional:', args._);
```

```bash
node cli.js build --verbose -o ./out file.js
# Parsed: { verbose: true, output: './out', env: 'development', _: ['build', 'file.js'] }
# Positional: [ 'build', 'file.js' ]
```

## Complete CLI Example

Here is a full CLI application example:

```javascript
#!/usr/bin/env node
// cli.js

const { program } = require('commander');
const fs = require('fs/promises');
const path = require('path');

program
  .name('file-tools')
  .description('File manipulation utilities')
  .version('1.0.0');

// Command: count
program
  .command('count <file>')
  .description('Count lines in a file')
  .option('-w, --words', 'Count words instead')
  .option('-c, --chars', 'Count characters instead')
  .action(async (file, options) => {
    try {
      const content = await fs.readFile(file, 'utf8');
      
      if (options.words) {
        const words = content.split(/\s+/).filter(Boolean).length;
        console.log(`Words: ${words}`);
      } else if (options.chars) {
        console.log(`Characters: ${content.length}`);
      } else {
        const lines = content.split('\n').length;
        console.log(`Lines: ${lines}`);
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

// Command: rename
program
  .command('rename <pattern> <replacement>')
  .description('Rename files matching pattern')
  .option('-d, --dir <directory>', 'Directory to search', '.')
  .option('--dry-run', 'Show what would be renamed')
  .action(async (pattern, replacement, options) => {
    try {
      const files = await fs.readdir(options.dir);
      const regex = new RegExp(pattern);
      
      for (const file of files) {
        if (regex.test(file)) {
          const newName = file.replace(regex, replacement);
          const oldPath = path.join(options.dir, file);
          const newPath = path.join(options.dir, newName);
          
          if (options.dryRun) {
            console.log(`Would rename: ${file} -> ${newName}`);
          } else {
            await fs.rename(oldPath, newPath);
            console.log(`Renamed: ${file} -> ${newName}`);
          }
        }
      }
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

// Command: info
program
  .command('info <file>')
  .description('Show file information')
  .action(async (file) => {
    try {
      const stats = await fs.stat(file);
      
      console.log(`File: ${file}`);
      console.log(`Size: ${stats.size} bytes`);
      console.log(`Created: ${stats.birthtime}`);
      console.log(`Modified: ${stats.mtime}`);
      console.log(`Is Directory: ${stats.isDirectory()}`);
    } catch (error) {
      console.error(`Error: ${error.message}`);
      process.exit(1);
    }
  });

program.parse();
```

Make it executable:

```bash
chmod +x cli.js

# Or add to package.json
{
  "bin": {
    "file-tools": "./cli.js"
  }
}
```

## Interactive Prompts

Combine with inquirer for interactive input:

```bash
npm install inquirer
```

```javascript
// cli.js
const { program } = require('commander');
const inquirer = require('inquirer');

program
  .command('init')
  .description('Initialize a new project')
  .action(async () => {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Project name:',
        default: 'my-project',
      },
      {
        type: 'list',
        name: 'template',
        message: 'Choose a template:',
        choices: ['basic', 'typescript', 'express'],
      },
      {
        type: 'confirm',
        name: 'git',
        message: 'Initialize git repository?',
        default: true,
      },
    ]);
    
    console.log('Creating project with:', answers);
  });

program.parse();
```

## Summary

| Library | Best For |
|---------|----------|
| `process.argv` | Simple scripts, few arguments |
| `util.parseArgs` | Built-in, Node 18.3+, basic needs |
| Commander.js | Full-featured CLIs, subcommands |
| Yargs | Fluent API, auto-generated help |
| minimist | Minimal, fast parsing |
| inquirer | Interactive prompts |

Choose based on complexity:
- Simple script: `process.argv` or `util.parseArgs`
- CLI tool: Commander.js or Yargs
- Speed-critical: minimist
- Interactive: Add inquirer to any of the above
