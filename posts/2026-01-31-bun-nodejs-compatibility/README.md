# How to Run Node.js Apps with Bun

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Bun, Node.js, JavaScript, Migration

Description: A comprehensive guide to running existing Node.js applications with Bun, covering compatibility, migration strategies, and performance optimization.

---

Bun has emerged as a compelling alternative to Node.js, promising faster startup times, built-in TypeScript support, and improved performance. The good news is that Bun was designed with Node.js compatibility as a core goal, meaning most of your existing Node.js applications can run on Bun with minimal or no modifications. This guide will walk you through everything you need to know about running your Node.js apps with Bun.

## Why Consider Bun for Your Node.js Apps?

Before diving into the technical details, let's understand why you might want to run your Node.js applications with Bun:

- **Faster Startup Times**: Bun starts up significantly faster than Node.js, which is particularly beneficial for serverless functions and CLI tools.
- **Built-in TypeScript Support**: No need for ts-node or compilation steps. Bun natively executes TypeScript files.
- **Integrated Tooling**: Bun includes a package manager, bundler, and test runner out of the box.
- **Performance Improvements**: Many workloads see substantial performance gains due to Bun's optimized JavaScript engine (JavaScriptCore).

## Understanding Node.js Compatibility in Bun

Bun implements a significant portion of Node.js APIs, making it possible to run most Node.js applications without changes. However, it's important to understand what works and what might need attention.

### Core Node.js Modules Support

Bun supports most of the commonly used Node.js built-in modules. Here's a quick reference of compatibility levels:

The following example shows how to check if your required modules are available in Bun:

```javascript
// check-compatibility.js
// This script tests the availability of common Node.js modules in Bun

const modules = [
  'fs',
  'path',
  'http',
  'https',
  'crypto',
  'buffer',
  'stream',
  'events',
  'util',
  'os',
  'child_process',
  'url',
  'querystring',
  'zlib'
];

console.log('Checking Node.js module compatibility in Bun:\n');

modules.forEach(mod => {
  try {
    require(mod);
    console.log(`✓ ${mod} - Available`);
  } catch (error) {
    console.log(`✗ ${mod} - Not available or partial support`);
  }
});
```

### File System Operations

File system operations work seamlessly in Bun. Here's an example demonstrating common fs operations:

```javascript
// fs-example.js
// Demonstrates file system operations that work identically in Node.js and Bun

const fs = require('fs');
const path = require('path');

// Reading files synchronously
const configPath = path.join(__dirname, 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
console.log('Config loaded:', config);

// Writing files
const outputData = { timestamp: Date.now(), status: 'processed' };
fs.writeFileSync(
  path.join(__dirname, 'output.json'),
  JSON.stringify(outputData, null, 2)
);

// Async file operations using promises
const fsPromises = require('fs/promises');

async function processFiles() {
  // Read directory contents
  const files = await fsPromises.readdir(__dirname);
  console.log('Files in directory:', files);

  // Check if file exists
  try {
    await fsPromises.access(configPath);
    console.log('Config file exists');
  } catch {
    console.log('Config file not found');
  }
}

processFiles();
```

## Running Your First Node.js App with Bun

Getting started is straightforward. If you have Bun installed, you can run any Node.js file directly.

### Basic Execution

The simplest way to run a Node.js file with Bun:

```bash
# Instead of: node app.js
bun app.js

# For TypeScript files (no configuration needed)
bun app.ts

# Running with environment variables
NODE_ENV=production bun app.js
```

### Package.json Scripts

Bun can execute your existing npm scripts without any changes:

```json
{
  "name": "my-node-app",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js",
    "test": "jest"
  }
}
```

Run these scripts using Bun:

```bash
# Bun will interpret the scripts and run them appropriately
bun run start
bun run dev
bun run test
```

## Express.js Compatibility

Express.js is one of the most popular Node.js frameworks, and it works well with Bun. Here's a complete example:

```javascript
// server.js
// A complete Express.js application running on Bun

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup - works identically to Node.js
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving
app.use('/static', express.static(path.join(__dirname, 'public')));

// Route definitions
app.get('/', (req, res) => {
  res.json({
    message: 'Hello from Express on Bun!',
    runtime: typeof Bun !== 'undefined' ? 'Bun' : 'Node.js',
    nodeVersion: process.version
  });
});

// Route with parameters
app.get('/users/:id', (req, res) => {
  const { id } = req.params;
  res.json({ userId: id, timestamp: Date.now() });
});

// POST endpoint
app.post('/data', (req, res) => {
  const { body } = req;
  console.log('Received data:', body);
  res.status(201).json({ received: true, data: body });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Runtime: ${typeof Bun !== 'undefined' ? 'Bun' : 'Node.js'}`);
});
```

## Fastify Compatibility

Fastify, known for its high performance, also works with Bun. Here's an example:

```javascript
// fastify-server.js
// Fastify application compatible with both Node.js and Bun

const fastify = require('fastify')({ logger: true });

// Register plugins
fastify.register(require('@fastify/cors'), {
  origin: true
});

// Define routes
fastify.get('/', async (request, reply) => {
  return {
    message: 'Fastify on Bun',
    runtime: typeof Bun !== 'undefined' ? 'Bun' : 'Node.js'
  };
});

fastify.get('/health', async (request, reply) => {
  return { status: 'healthy', uptime: process.uptime() };
});

fastify.post('/echo', async (request, reply) => {
  // Request body is automatically parsed
  return { echo: request.body };
});

// Define schema for validation
const userSchema = {
  body: {
    type: 'object',
    required: ['name', 'email'],
    properties: {
      name: { type: 'string' },
      email: { type: 'string', format: 'email' }
    }
  }
};

fastify.post('/users', { schema: userSchema }, async (request, reply) => {
  const { name, email } = request.body;
  reply.code(201);
  return { id: Date.now(), name, email };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
```

## Handling Native Modules

Native modules (modules with C/C++ bindings) require special attention when migrating to Bun. Some native modules work out of the box, while others may need alternatives.

### Checking for Native Module Issues

Here's a script to identify native modules in your project:

```javascript
// find-native-modules.js
// Scans node_modules to identify packages with native bindings

const fs = require('fs');
const path = require('path');

function findNativeModules(nodeModulesPath) {
  const nativeModules = [];
  
  if (!fs.existsSync(nodeModulesPath)) {
    console.log('node_modules not found');
    return nativeModules;
  }

  const packages = fs.readdirSync(nodeModulesPath);
  
  packages.forEach(pkg => {
    // Skip hidden folders and scoped packages root
    if (pkg.startsWith('.')) return;
    
    const pkgPath = path.join(nodeModulesPath, pkg);
    
    // Handle scoped packages
    if (pkg.startsWith('@')) {
      const scopedPkgs = fs.readdirSync(pkgPath);
      scopedPkgs.forEach(scopedPkg => {
        checkForNativeBindings(
          path.join(pkgPath, scopedPkg),
          `${pkg}/${scopedPkg}`,
          nativeModules
        );
      });
    } else {
      checkForNativeBindings(pkgPath, pkg, nativeModules);
    }
  });

  return nativeModules;
}

function checkForNativeBindings(pkgPath, pkgName, results) {
  // Check for common native module indicators
  const indicators = ['binding.gyp', 'bindings', 'prebuilds'];
  
  indicators.forEach(indicator => {
    if (fs.existsSync(path.join(pkgPath, indicator))) {
      results.push({ name: pkgName, indicator });
    }
  });
}

const natives = findNativeModules('./node_modules');
console.log('Native modules found:', natives);
```

### Common Native Module Alternatives

When a native module doesn't work with Bun, consider these alternatives:

```javascript
// native-alternatives.js
// Examples of replacing native modules with Bun-compatible alternatives

// Instead of bcrypt (native), use bcryptjs (pure JS)
// npm uninstall bcrypt && npm install bcryptjs
const bcrypt = require('bcryptjs');

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Instead of sharp (native) for simple operations,
// consider using Bun's built-in image handling or jimp
// For complex image processing, sharp often works with Bun

// For SQLite, Bun has built-in support
// Instead of better-sqlite3 or sqlite3
const db = new (require('bun:sqlite').Database)('mydb.sqlite');

// Create table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE
  )
`);

// Insert data
const insert = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
insert.run('John Doe', 'john@example.com');

// Query data
const users = db.query('SELECT * FROM users').all();
console.log('Users:', users);
```

## Environment Variables

Bun handles environment variables similarly to Node.js, with some enhancements.

### Loading Environment Variables

```javascript
// env-handling.js
// Demonstrates environment variable handling in Bun

// Bun automatically loads .env files
// No need for dotenv in most cases!

// Access environment variables
const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  apiKey: process.env.API_KEY
};

console.log('Configuration:', config);

// Validate required environment variables
const required = ['DATABASE_URL', 'API_KEY'];
const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('Missing required environment variables:', missing);
  process.exit(1);
}

// Bun also supports Bun.env as an alternative
if (typeof Bun !== 'undefined') {
  console.log('Using Bun.env:', Bun.env.NODE_ENV);
}
```

### Creating a .env File

```bash
# .env
# Environment configuration for your application

PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost:5432/mydb
API_KEY=your-secret-api-key
LOG_LEVEL=debug
```

## Measuring Performance Gains

One of the main reasons to switch to Bun is performance. Here's how to measure the improvements:

```javascript
// benchmark.js
// Simple benchmark to compare execution times

const iterations = 1000000;

// Benchmark JSON parsing
function benchmarkJSON() {
  const start = performance.now();
  const data = { name: 'test', value: 123, nested: { a: 1, b: 2 } };
  
  for (let i = 0; i < iterations; i++) {
    const str = JSON.stringify(data);
    JSON.parse(str);
  }
  
  const duration = performance.now() - start;
  console.log(`JSON operations (${iterations}x): ${duration.toFixed(2)}ms`);
}

// Benchmark array operations
function benchmarkArrays() {
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    const arr = Array.from({ length: 100 }, (_, i) => i);
    arr.map(x => x * 2).filter(x => x > 50).reduce((a, b) => a + b, 0);
  }
  
  const duration = performance.now() - start;
  console.log(`Array operations (${iterations}x): ${duration.toFixed(2)}ms`);
}

// Benchmark crypto operations
async function benchmarkCrypto() {
  const crypto = require('crypto');
  const start = performance.now();
  
  for (let i = 0; i < 10000; i++) {
    crypto.createHash('sha256').update('hello world').digest('hex');
  }
  
  const duration = performance.now() - start;
  console.log(`Crypto hash (10000x): ${duration.toFixed(2)}ms`);
}

console.log(`Runtime: ${typeof Bun !== 'undefined' ? 'Bun' : 'Node.js'}`);
console.log('Starting benchmarks...\n');

benchmarkJSON();
benchmarkArrays();
benchmarkCrypto();
```

## Common Migration Pitfalls

When migrating from Node.js to Bun, watch out for these common issues:

### 1. Module Resolution Differences

```javascript
// module-resolution.js
// Handling module resolution edge cases

// Bun prefers ESM but supports CommonJS
// If you encounter issues, check your package.json type field

// CommonJS style (works in both)
const fs = require('fs');

// ESM style (works in both with proper configuration)
// import fs from 'fs';

// Dynamic imports work in both
async function loadModule() {
  const module = await import('./dynamic-module.js');
  return module.default;
}

// __dirname and __filename work in Bun
console.log('Directory:', __dirname);
console.log('Filename:', __filename);

// import.meta.url also works
// console.log('URL:', import.meta.url);
```

### 2. Process and Global Differences

```javascript
// process-globals.js
// Handling process and global object differences

// Most process properties work
console.log('Node version:', process.version);
console.log('Platform:', process.platform);
console.log('Architecture:', process.arch);
console.log('PID:', process.pid);
console.log('CWD:', process.cwd());

// process.nextTick works but consider using queueMicrotask
process.nextTick(() => {
  console.log('Next tick executed');
});

// Preferred modern approach
queueMicrotask(() => {
  console.log('Microtask executed');
});

// Signal handling
process.on('SIGINT', () => {
  console.log('Received SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM');
  process.exit(0);
});
```

### 3. Handling Incompatible Packages

```javascript
// compatibility-wrapper.js
// Creating compatibility wrappers for edge cases

// Check runtime and adjust behavior
const isBun = typeof Bun !== 'undefined';

function getRuntime() {
  if (isBun) {
    return {
      name: 'Bun',
      version: Bun.version
    };
  }
  return {
    name: 'Node.js',
    version: process.version
  };
}

// Conditional imports based on runtime
async function loadDatabaseDriver() {
  if (isBun) {
    // Use Bun's native SQLite
    const { Database } = await import('bun:sqlite');
    return new Database(':memory:');
  } else {
    // Use better-sqlite3 for Node.js
    const Database = (await import('better-sqlite3')).default;
    return new Database(':memory:');
  }
}

// Export for use in your application
module.exports = { isBun, getRuntime, loadDatabaseDriver };
```

## Testing Your Application

Bun includes a built-in test runner that is compatible with Jest-like syntax:

```javascript
// app.test.js
// Example test file using Bun's test runner

const { describe, test, expect, beforeAll, afterAll } = require('bun:test');

// Import the module to test
const { add, multiply, fetchData } = require('./math');

describe('Math operations', () => {
  test('add should sum two numbers', () => {
    expect(add(2, 3)).toBe(5);
    expect(add(-1, 1)).toBe(0);
    expect(add(0, 0)).toBe(0);
  });

  test('multiply should multiply two numbers', () => {
    expect(multiply(2, 3)).toBe(6);
    expect(multiply(-2, 3)).toBe(-6);
  });
});

describe('Async operations', () => {
  test('fetchData should return data', async () => {
    const data = await fetchData();
    expect(data).toBeDefined();
    expect(data.status).toBe('success');
  });
});

// Run tests with: bun test
```

## Best Practices Summary

Follow these guidelines for a smooth Node.js to Bun migration:

1. **Test Thoroughly Before Production**: Run your complete test suite with Bun before deploying to production. Pay special attention to edge cases and error handling.

2. **Start with Non-Critical Services**: Begin migration with less critical services or development environments to gain confidence.

3. **Monitor Native Modules**: Audit your dependencies for native modules and find alternatives or verify compatibility before migrating.

4. **Use Runtime Detection**: Implement runtime detection for code that needs to behave differently between Node.js and Bun.

5. **Leverage Built-in Features**: Take advantage of Bun's built-in features like native SQLite support, automatic .env loading, and TypeScript execution.

6. **Keep Node.js as Fallback**: Maintain the ability to run on Node.js as a fallback, especially for production-critical applications.

7. **Update Dependencies Regularly**: Keep your dependencies updated as Bun compatibility improves with each release.

8. **Profile Your Application**: Use proper benchmarking to measure actual performance gains in your specific use case.

9. **Check Bun's Compatibility Page**: Regularly consult Bun's official documentation for the latest compatibility information.

10. **Gradual Migration**: Migrate incrementally rather than all at once. Start with CLI tools, then move to backend services.

## Conclusion

Running Node.js applications with Bun is increasingly viable and can provide significant performance benefits. The compatibility layer has matured to the point where most standard Node.js applications work with minimal changes. The key factors for a successful migration are understanding the compatibility landscape, testing thoroughly, and having fallback plans for any incompatibilities.

Start by running your existing applications with Bun in development to identify any issues. Use the techniques described in this guide to address native module concerns and handle edge cases. As you gain confidence, gradually expand Bun usage to staging and eventually production environments.

The Node.js ecosystem is vast, and while Bun cannot guarantee 100% compatibility with every package, the core APIs and popular frameworks like Express and Fastify work reliably. With the performance improvements and developer experience enhancements that Bun offers, it's worth investing time in exploring this migration path for your Node.js applications.
