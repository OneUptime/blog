# How to Use npm Scripts Effectively

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, npm, Scripts, Automation, DevOps

Description: Learn how to use npm scripts to automate tasks including running commands, chaining scripts, using environment variables, and creating cross-platform build processes.

---

npm scripts are a powerful way to automate tasks in your Node.js projects. From running tests to deploying applications, npm scripts can replace complex build systems with simple commands.

## Basic npm Scripts

Define scripts in package.json:

```json
{
  "scripts": {
    "start": "node server.js",
    "test": "jest",
    "build": "webpack --mode production"
  }
}
```

Run them:

```bash
npm start
npm test
npm run build
```

Note: `start`, `test`, `stop`, and `restart` can run without `run`.

## Built-in Script Names

npm recognizes special script names:

```json
{
  "scripts": {
    "start": "node server.js",
    "stop": "pkill -f server.js",
    "restart": "npm stop && npm start",
    "test": "jest"
  }
}
```

## Passing Arguments

Pass arguments to scripts:

```bash
# Pass arguments after --
npm test -- --watch
npm run build -- --env=production
```

In package.json:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

## Chaining Scripts

### Sequential Execution (&&)

```json
{
  "scripts": {
    "build": "npm run clean && npm run compile && npm run minify",
    "clean": "rm -rf dist",
    "compile": "tsc",
    "minify": "terser dist/index.js -o dist/index.min.js"
  }
}
```

### Parallel Execution (&)

```json
{
  "scripts": {
    "dev": "npm run server & npm run client"
  }
}
```

### Using npm-run-all (Cross-platform)

```bash
npm install --save-dev npm-run-all
```

```json
{
  "scripts": {
    "build": "run-s clean compile minify",
    "dev": "run-p server client",
    "clean": "rm -rf dist",
    "compile": "tsc",
    "minify": "terser dist/index.js",
    "server": "node server.js",
    "client": "webpack serve"
  }
}
```

- `run-s`: Run sequential
- `run-p`: Run parallel

### Using concurrently

```bash
npm install --save-dev concurrently
```

```json
{
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "server": "nodemon server.js",
    "client": "webpack serve"
  }
}
```

With names and colors:

```json
{
  "scripts": {
    "dev": "concurrently -n 'server,client' -c 'blue,green' 'npm run server' 'npm run client'"
  }
}
```

## Pre and Post Hooks

npm automatically runs pre/post scripts:

```json
{
  "scripts": {
    "prebuild": "npm run clean",
    "build": "webpack",
    "postbuild": "npm run notify",
    
    "pretest": "npm run lint",
    "test": "jest",
    "posttest": "npm run coverage-report",
    
    "clean": "rm -rf dist",
    "notify": "echo 'Build complete!'",
    "lint": "eslint src/",
    "coverage-report": "open coverage/index.html"
  }
}
```

Order: `prebuild` -> `build` -> `postbuild`

## Environment Variables

### Setting Variables

```json
{
  "scripts": {
    "start:dev": "NODE_ENV=development node server.js",
    "start:prod": "NODE_ENV=production node server.js"
  }
}
```

### Cross-platform with cross-env

```bash
npm install --save-dev cross-env
```

```json
{
  "scripts": {
    "start:dev": "cross-env NODE_ENV=development node server.js",
    "start:prod": "cross-env NODE_ENV=production node server.js",
    "build": "cross-env NODE_ENV=production webpack"
  }
}
```

### Using dotenv

```json
{
  "scripts": {
    "start": "node -r dotenv/config server.js",
    "start:dev": "node -r dotenv/config server.js dotenv_config_path=.env.development"
  }
}
```

## Common Script Patterns

### Development Workflow

```json
{
  "scripts": {
    "dev": "nodemon src/index.js",
    "dev:debug": "nodemon --inspect src/index.js",
    "start": "node src/index.js"
  }
}
```

### Build Pipeline

```json
{
  "scripts": {
    "build": "npm run build:clean && npm run build:compile && npm run build:bundle",
    "build:clean": "rm -rf dist",
    "build:compile": "tsc",
    "build:bundle": "webpack --mode production",
    "build:analyze": "webpack --mode production --analyze"
  }
}
```

### Testing

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --reporters=default --reporters=jest-junit",
    "test:e2e": "cypress run",
    "test:e2e:open": "cypress open"
  }
}
```

### Linting and Formatting

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "validate": "npm run lint && npm run typecheck && npm run test"
  }
}
```

### Database

```json
{
  "scripts": {
    "db:migrate": "prisma migrate dev",
    "db:push": "prisma db push",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio",
    "db:reset": "prisma migrate reset"
  }
}
```

### Docker

```json
{
  "scripts": {
    "docker:build": "docker build -t myapp .",
    "docker:run": "docker run -p 3000:3000 myapp",
    "docker:push": "docker push myapp",
    "docker:compose:up": "docker-compose up -d",
    "docker:compose:down": "docker-compose down"
  }
}
```

### Deployment

```json
{
  "scripts": {
    "deploy": "npm run build && npm run deploy:upload",
    "deploy:staging": "cross-env DEPLOY_ENV=staging npm run deploy",
    "deploy:production": "cross-env DEPLOY_ENV=production npm run deploy",
    "deploy:upload": "aws s3 sync dist/ s3://my-bucket/"
  }
}
```

## Using Package Binaries

Local packages are available in scripts:

```json
{
  "devDependencies": {
    "webpack": "^5.0.0",
    "eslint": "^8.0.0"
  },
  "scripts": {
    "build": "webpack",
    "lint": "eslint ."
  }
}
```

npm adds `./node_modules/.bin` to PATH when running scripts.

## Script Variables

Access package.json fields:

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "print:name": "echo $npm_package_name",
    "print:version": "echo $npm_package_version"
  }
}
```

Windows compatible:

```json
{
  "scripts": {
    "print:name": "node -p \"process.env.npm_package_name\""
  }
}
```

## Config Object

Define custom config:

```json
{
  "config": {
    "port": "3000"
  },
  "scripts": {
    "start": "node server.js --port=$npm_package_config_port"
  }
}
```

Override at runtime:

```bash
npm config set my-app:port 8080
```

## Complex Scripts

For complex logic, use a script file:

```json
{
  "scripts": {
    "complex-task": "node scripts/complex-task.js"
  }
}
```

```javascript
// scripts/complex-task.js
const { execSync } = require('child_process');

const env = process.env.NODE_ENV || 'development';

console.log(`Running complex task in ${env} mode`);

if (env === 'production') {
  execSync('npm run build:production', { stdio: 'inherit' });
} else {
  execSync('npm run build:dev', { stdio: 'inherit' });
}
```

## Listing Scripts

```bash
# List all available scripts
npm run

# Or with descriptions (if you add them)
```

## Script Documentation

Use comments in a scripts.md file or README:

```markdown
## Available Scripts

### Development
- `npm run dev` - Start development server with hot reload
- `npm run dev:debug` - Start with debugging enabled

### Build
- `npm run build` - Production build
- `npm run build:analyze` - Build with bundle analysis

### Testing
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
```

## Complete Example

```json
{
  "name": "my-fullstack-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
    "dev:server": "nodemon server/index.js",
    "dev:client": "vite",
    
    "build": "run-s build:clean build:client build:server",
    "build:clean": "rm -rf dist",
    "build:client": "vite build",
    "build:server": "tsc -p server/tsconfig.json",
    
    "start": "node dist/server/index.js",
    
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "npm run lint -- --fix",
    "format": "prettier --write .",
    
    "typecheck": "tsc --noEmit",
    "validate": "run-p lint typecheck test",
    
    "db:migrate": "prisma migrate dev",
    "db:seed": "ts-node prisma/seed.ts",
    
    "prepare": "husky install"
  },
  "devDependencies": {
    "concurrently": "^8.0.0",
    "npm-run-all": "^4.1.5",
    "cross-env": "^7.0.0"
  }
}
```

## Summary

| Pattern | Use Case |
|---------|----------|
| `npm start` | Main entry point |
| `npm test` | Run tests |
| `npm run <script>` | Custom scripts |
| `pre`/`post` hooks | Before/after scripts |
| `&&` | Sequential execution |
| `run-p` | Parallel execution |
| `cross-env` | Cross-platform env vars |
| Script files | Complex logic |

Best practices:
- Keep scripts simple and composable
- Use npm-run-all for cross-platform parallel/sequential
- Use cross-env for environment variables
- Document your scripts in README
- Use pre/post hooks for setup/cleanup
- Extract complex logic to script files
