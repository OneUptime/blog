# How to Understand Global vs Local npm Packages

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, npm, PackageManager, Installation, BestPractices

Description: Learn the difference between global and local npm packages, when to use each, how to manage them, and best practices for package installation.

---

npm packages can be installed globally (available system-wide) or locally (project-specific). Understanding when to use each is important for maintainable projects and avoiding conflicts.

## The Key Difference

```bash
# Local installation (default)
npm install express

# Global installation
npm install -g nodemon
```

- **Local**: Installed in `./node_modules`, available only in this project
- **Global**: Installed system-wide, available as CLI commands everywhere

## When to Use Each

### Install Locally (Default)

Install locally when:
- Package is a dependency your code imports
- Different projects might need different versions
- You want reproducible builds
- Package should be listed in package.json

```bash
# Libraries your code uses
npm install express
npm install lodash
npm install axios

# Dev tools for this project
npm install --save-dev jest
npm install --save-dev typescript
npm install --save-dev webpack
```

### Install Globally

Install globally when:
- Package provides a CLI tool you use across projects
- Tool does not need to be in package.json
- You want the same version everywhere

```bash
# CLI tools
npm install -g nodemon
npm install -g serve
npm install -g npm-check-updates
npm install -g vercel
```

## Where Packages Are Installed

### Local Packages

```bash
# Installed in project's node_modules
ls node_modules/express

# Binaries in node_modules/.bin
ls node_modules/.bin/

# Location
./node_modules/
```

### Global Packages

```bash
# Find global package location
npm root -g
# /usr/local/lib/node_modules (macOS/Linux)
# C:\Users\you\AppData\Roaming\npm\node_modules (Windows)

# Find global binary location
npm bin -g
# /usr/local/bin

# List global packages
npm list -g --depth=0
```

## Running Local vs Global Commands

### Local Package Commands

```bash
# Won't work (not in PATH)
eslint src/

# Option 1: Use npx
npx eslint src/

# Option 2: npm scripts (package.json)
{
  "scripts": {
    "lint": "eslint src/"
  }
}
npm run lint

# Option 3: Direct path
./node_modules/.bin/eslint src/
```

### Global Package Commands

```bash
# Works directly (in PATH)
nodemon server.js
serve dist/
vercel deploy
```

## npm Scripts Use Local Packages

Local packages work in npm scripts without npx:

```json
{
  "scripts": {
    "test": "jest",
    "build": "webpack --mode production",
    "lint": "eslint src/",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "webpack": "^5.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

npm automatically adds `./node_modules/.bin` to PATH when running scripts.

## Using npx

npx lets you run packages without global installation:

```bash
# Run local package
npx jest

# Run package without installing
npx create-react-app my-app

# Run specific version
npx node@18 script.js

# Run from npm registry
npx cowsay "Hello"
```

## Managing Global Packages

### List Global Packages

```bash
# List all global packages
npm list -g --depth=0

# With details
npm list -g
```

### Update Global Packages

```bash
# Update specific package
npm update -g nodemon

# Update all global packages
npm update -g

# Check outdated
npm outdated -g
```

### Uninstall Global Packages

```bash
npm uninstall -g nodemon
```

### Where is a Global Package?

```bash
# Find a specific package
npm list -g nodemon

# Find binary location
which nodemon  # macOS/Linux
where nodemon  # Windows
```

## Common Issues

### Permission Errors (macOS/Linux)

```bash
npm ERR! Error: EACCES: permission denied

# Bad solution: sudo (don't do this!)
# sudo npm install -g package

# Good solution: Fix npm permissions
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Now install without sudo
npm install -g nodemon
```

### Command Not Found After Global Install

```bash
# Check if npm bin is in PATH
npm bin -g
# Add to PATH if not

# macOS/Linux: Add to ~/.bashrc or ~/.zshrc
export PATH=$(npm bin -g):$PATH

# Windows: Add to Environment Variables
```

### Version Conflicts

```bash
# Project needs webpack 4, global has webpack 5
# Local takes precedence in npm scripts

# Check which version runs
npx webpack --version  # Local
webpack --version      # Global (if in PATH)
```

## Best Practice: Prefer Local

For most tools, prefer local installation:

```json
{
  "devDependencies": {
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "jest": "^29.0.0",
    "typescript": "^5.0.0"
  },
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --write .",
    "test": "jest",
    "build": "tsc"
  }
}
```

Benefits:
- Same version for all team members
- Version tracked in package.json
- CI/CD uses same version
- No global pollution

## When Global is Appropriate

Good candidates for global installation:

```bash
# Development servers and utilities
npm install -g live-server    # Quick static server
npm install -g serve          # Static file serving
npm install -g nodemon        # Auto-restart for Node

# One-time project generators
npm install -g @angular/cli
npm install -g create-react-app  # Though npx is better

# System tools
npm install -g npm-check-updates  # Update checker
npm install -g npm-check         # Dependency checker
npm install -g tldr              # Simplified man pages

# Deployment tools
npm install -g vercel
npm install -g netlify-cli
npm install -g firebase-tools
```

Even these can be used with npx instead:

```bash
npx serve dist/
npx nodemon server.js
npx create-react-app my-app
```

## Project Setup Recommendation

```json
{
  "name": "my-project",
  "scripts": {
    "dev": "nodemon src/index.js",
    "start": "node src/index.js",
    "test": "jest",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "dependencies": {
    "express": "^4.18.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0",
    "jest": "^29.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

Everyone uses the same versions, and commands are documented in scripts.

## Checking Installation Type

```bash
# Is package installed globally?
npm list -g package-name

# Is package installed locally?
npm list package-name

# Both
npm list express && npm list -g express
```

## Summary

| Aspect | Local | Global |
|--------|-------|--------|
| Location | `./node_modules` | System-wide |
| Command | `npx` or npm scripts | Direct |
| Version | Per-project | System-wide |
| package.json | Listed | Not listed |
| Team consistency | Yes | No |
| Recommended for | Dependencies, dev tools | Standalone CLI tools |

Rule of thumb:
- **Local by default**: Install locally, use npm scripts
- **Global rarely**: Only for standalone CLI tools you use everywhere
- **npx when possible**: Use npx instead of global for one-off commands

This approach keeps projects consistent and avoids version conflicts.
