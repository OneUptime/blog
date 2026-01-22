# How to Create a CLI Tool with Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, CLI, CommandLine, Development, npm

Description: Learn how to build command-line tools with Node.js using commander, yargs, or inquirer for interactive prompts, argument parsing, and publishing to npm.

---

Building CLI tools with Node.js is straightforward and powerful. You can create everything from simple utilities to complex applications with interactive prompts, colorful output, and argument parsing.

## Basic CLI Script

### Simple Executable

```javascript
#!/usr/bin/env node

// hello-cli.js
console.log('Hello from CLI!');
```

Make it executable:

```bash
chmod +x hello-cli.js
./hello-cli.js
```

### Reading Arguments

```javascript
#!/usr/bin/env node

// Basic argument reading
const args = process.argv.slice(2);  // Remove node and script path

console.log('Arguments:', args);

// node mycli.js hello world
// Output: Arguments: ['hello', 'world']
```

### Named Arguments (Manual)

```javascript
#!/usr/bin/env node

const args = process.argv.slice(2);

// Parse --name=value format
const options = {};
args.forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.slice(2).split('=');
    options[key] = value || true;
  }
});

console.log(options);
// node cli.js --name=John --verbose
// Output: { name: 'John', verbose: true }
```

## Project Setup

### Initialize Project

```bash
mkdir my-cli
cd my-cli
npm init -y
```

### package.json Configuration

```json
{
  "name": "my-awesome-cli",
  "version": "1.0.0",
  "description": "My CLI tool",
  "main": "index.js",
  "bin": {
    "mycli": "./bin/cli.js"
  },
  "files": [
    "bin",
    "lib"
  ],
  "keywords": ["cli", "tool"],
  "author": "Your Name",
  "license": "MIT"
}
```

### Directory Structure

```
my-cli/
  bin/
    cli.js         # Entry point
  lib/
    commands/      # Command implementations
    utils/         # Helper utilities
  package.json
```

## Using Commander.js

Commander is the most popular library for building CLIs:

```bash
npm install commander
```

### Basic Command

```javascript
#!/usr/bin/env node

const { program } = require('commander');

program
  .name('mycli')
  .description('My awesome CLI tool')
  .version('1.0.0');

program
  .command('greet <name>')
  .description('Greet someone')
  .option('-l, --loud', 'Say it loudly')
  .action((name, options) => {
    let greeting = `Hello, ${name}!`;
    if (options.loud) {
      greeting = greeting.toUpperCase();
    }
    console.log(greeting);
  });

program.parse();
```

### Multiple Commands

```javascript
#!/usr/bin/env node

const { program } = require('commander');

program
  .name('todo')
  .description('CLI to manage todos')
  .version('1.0.0');

// Add command
program
  .command('add <task>')
  .description('Add a new task')
  .option('-p, --priority <level>', 'Priority level', 'normal')
  .action((task, options) => {
    console.log(`Added: ${task} (${options.priority})`);
  });

// List command
program
  .command('list')
  .description('List all tasks')
  .option('-a, --all', 'Show completed tasks too')
  .action((options) => {
    console.log('Listing tasks...');
  });

// Remove command
program
  .command('remove <id>')
  .description('Remove a task')
  .action((id) => {
    console.log(`Removed task: ${id}`);
  });

program.parse();
```

### Global Options

```javascript
#!/usr/bin/env node

const { program } = require('commander');

program
  .option('-v, --verbose', 'Enable verbose output')
  .option('-c, --config <path>', 'Config file path', './config.json');

program
  .command('build')
  .action(() => {
    const opts = program.opts();
    if (opts.verbose) {
      console.log('Verbose mode enabled');
      console.log('Config:', opts.config);
    }
    console.log('Building...');
  });

program.parse();
```

### Subcommands with Separate Files

```javascript
// bin/cli.js
#!/usr/bin/env node

const { program } = require('commander');
const init = require('../lib/commands/init');
const build = require('../lib/commands/build');

program
  .name('toolkit')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize a new project')
  .action(init);

program
  .command('build')
  .description('Build the project')
  .option('-w, --watch', 'Watch mode')
  .action(build);

program.parse();
```

```javascript
// lib/commands/init.js
module.exports = async function init() {
  console.log('Initializing project...');
  // Implementation
};
```

## Using Yargs

Yargs is another powerful argument parser:

```bash
npm install yargs
```

### Basic Usage

```javascript
#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

yargs(hideBin(process.argv))
  .command('greet <name>', 'Greet someone', (yargs) => {
    return yargs.positional('name', {
      describe: 'Name to greet',
      type: 'string',
    });
  }, (argv) => {
    console.log(`Hello, ${argv.name}!`);
  })
  .option('verbose', {
    alias: 'v',
    type: 'boolean',
    description: 'Run with verbose logging',
  })
  .help()
  .parse();
```

### Command Builder Pattern

```javascript
#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

yargs(hideBin(process.argv))
  .command({
    command: 'create <name>',
    describe: 'Create a new resource',
    builder: {
      name: {
        describe: 'Resource name',
        demandOption: true,
        type: 'string',
      },
      type: {
        describe: 'Resource type',
        default: 'default',
        type: 'string',
      },
    },
    handler: (argv) => {
      console.log(`Creating ${argv.type}: ${argv.name}`);
    },
  })
  .demandCommand(1, 'You need at least one command')
  .help()
  .parse();
```

## Interactive Prompts with Inquirer

```bash
npm install inquirer
```

### Basic Prompts

```javascript
#!/usr/bin/env node

const inquirer = require('inquirer');

async function main() {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'What is your name?',
      default: 'User',
    },
    {
      type: 'list',
      name: 'color',
      message: 'Choose a color:',
      choices: ['Red', 'Green', 'Blue'],
    },
    {
      type: 'confirm',
      name: 'proceed',
      message: 'Continue?',
      default: true,
    },
  ]);
  
  console.log('Answers:', answers);
}

main();
```

### Advanced Prompts

```javascript
const inquirer = require('inquirer');

const questions = [
  {
    type: 'checkbox',
    name: 'features',
    message: 'Select features:',
    choices: [
      { name: 'TypeScript', checked: true },
      { name: 'ESLint' },
      { name: 'Prettier' },
      { name: 'Jest' },
    ],
  },
  {
    type: 'password',
    name: 'token',
    message: 'Enter API token:',
    mask: '*',
  },
  {
    type: 'input',
    name: 'port',
    message: 'Port number:',
    validate: (input) => {
      const port = parseInt(input);
      if (isNaN(port) || port < 1 || port > 65535) {
        return 'Please enter a valid port number';
      }
      return true;
    },
  },
  {
    type: 'list',
    name: 'database',
    message: 'Select database:',
    when: (answers) => answers.features.includes('Database'),
    choices: ['PostgreSQL', 'MySQL', 'MongoDB'],
  },
];

inquirer.prompt(questions).then(console.log);
```

## Adding Colors and Styling

```bash
npm install chalk
```

### Colorful Output

```javascript
#!/usr/bin/env node

const chalk = require('chalk');

console.log(chalk.green('Success!'));
console.log(chalk.red('Error!'));
console.log(chalk.yellow('Warning!'));
console.log(chalk.blue.bold('Info'));
console.log(chalk.bgRed.white(' CRITICAL '));

// Combining styles
const error = chalk.bold.red;
const warning = chalk.hex('#FFA500');
const info = chalk.cyan.underline;

console.log(error('This is an error'));
console.log(warning('This is a warning'));
console.log(info('This is info'));
```

### Progress Indicators

```bash
npm install ora
```

```javascript
const ora = require('ora');

async function build() {
  const spinner = ora('Building project...').start();
  
  try {
    await doSomething();
    spinner.succeed('Build complete!');
  } catch (error) {
    spinner.fail('Build failed!');
    process.exit(1);
  }
}
```

### Progress Bars

```bash
npm install cli-progress
```

```javascript
const cliProgress = require('cli-progress');

const bar = new cliProgress.SingleBar({
  format: 'Progress |{bar}| {percentage}% | {value}/{total}',
}, cliProgress.Presets.shades_classic);

bar.start(100, 0);

let value = 0;
const interval = setInterval(() => {
  value += 10;
  bar.update(value);
  if (value >= 100) {
    clearInterval(interval);
    bar.stop();
  }
}, 100);
```

## File Operations

### Reading/Writing Config

```javascript
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

// Config file location
const CONFIG_DIR = path.join(os.homedir(), '.mycli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

async function loadConfig() {
  try {
    const data = await fs.readFile(CONFIG_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};  // Default config
  }
}

async function saveConfig(config) {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Usage
const config = await loadConfig();
config.apiKey = 'new-key';
await saveConfig(config);
```

### Template Generation

```javascript
const fs = require('fs').promises;
const path = require('path');

async function generateFromTemplate(templateName, targetPath, variables) {
  const templatePath = path.join(__dirname, 'templates', templateName);
  let content = await fs.readFile(templatePath, 'utf8');
  
  // Replace variables
  Object.entries(variables).forEach(([key, value]) => {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });
  
  await fs.writeFile(targetPath, content);
  console.log(`Created: ${targetPath}`);
}

// Usage
await generateFromTemplate('component.tsx.template', 'Button.tsx', {
  name: 'Button',
  props: 'label: string',
});
```

## Error Handling

```javascript
#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');

// Custom error handler
function handleError(error) {
  if (error.code === 'ENOENT') {
    console.error(chalk.red('File not found:', error.path));
  } else if (error.code === 'EACCES') {
    console.error(chalk.red('Permission denied'));
  } else {
    console.error(chalk.red('Error:', error.message));
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
  }
  process.exit(1);
}

// Wrap commands with error handling
function wrapCommand(fn) {
  return async (...args) => {
    try {
      await fn(...args);
    } catch (error) {
      handleError(error);
    }
  };
}

program
  .command('build')
  .action(wrapCommand(async () => {
    // Command implementation
    throw new Error('Something went wrong');
  }));

program.parse();
```

## Publishing to npm

### Prepare for Publishing

```json
{
  "name": "@yourscope/cli-tool",
  "version": "1.0.0",
  "description": "Description of your CLI",
  "bin": {
    "mytool": "./bin/cli.js"
  },
  "files": ["bin", "lib"],
  "engines": {
    "node": ">=14.0.0"
  },
  "keywords": ["cli"],
  "repository": {
    "type": "git",
    "url": "https://github.com/user/repo"
  },
  "homepage": "https://github.com/user/repo#readme",
  "bugs": "https://github.com/user/repo/issues"
}
```

### Publish Commands

```bash
# Login to npm
npm login

# Publish
npm publish

# Publish scoped package publicly
npm publish --access public

# Test locally before publishing
npm link
mytool --help
```

## Complete Example

```javascript
#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs').promises;
const path = require('path');

program
  .name('project-cli')
  .description('Project scaffolding tool')
  .version('1.0.0');

program
  .command('init [name]')
  .description('Initialize a new project')
  .option('-t, --template <type>', 'Template type', 'default')
  .action(async (name, options) => {
    // Get project name if not provided
    if (!name) {
      const answers = await inquirer.prompt([{
        type: 'input',
        name: 'name',
        message: 'Project name:',
        validate: input => input.length > 0 || 'Name required',
      }]);
      name = answers.name;
    }
    
    const spinner = ora('Creating project...').start();
    
    try {
      const projectPath = path.join(process.cwd(), name);
      await fs.mkdir(projectPath, { recursive: true });
      
      // Create files
      await fs.writeFile(
        path.join(projectPath, 'package.json'),
        JSON.stringify({ name, version: '1.0.0' }, null, 2)
      );
      
      spinner.succeed(chalk.green(`Project ${name} created!`));
      console.log(`\n  cd ${name}\n  npm install\n`);
    } catch (error) {
      spinner.fail(chalk.red('Failed to create project'));
      console.error(error.message);
      process.exit(1);
    }
  });

program.parse();
```

## Summary

| Library | Purpose | Best For |
|---------|---------|----------|
| Commander | Argument parsing | Complex commands with options |
| Yargs | Argument parsing | Interactive help, validation |
| Inquirer | Interactive prompts | User input, wizards |
| Chalk | Terminal colors | Styled output |
| Ora | Spinners | Async operations |

Best practices:
- Add shebang `#!/usr/bin/env node` to entry file
- Use `bin` field in package.json for executables
- Provide helpful `--help` output
- Handle errors gracefully with clear messages
- Support both interactive and non-interactive modes
- Test on different platforms before publishing
