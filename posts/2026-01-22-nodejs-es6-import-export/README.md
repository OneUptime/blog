# How to Use ES6 Import and Export in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, JavaScript, ES6, Modules, Import, Export

Description: Learn how to use ES6 import and export statements in Node.js including named exports, default exports, configuration options, and interoperability with CommonJS.

---

ES6 modules (import/export) provide a cleaner and more powerful way to organize code compared to CommonJS (require/module.exports). Node.js fully supports ES modules, but you need to configure your project correctly. This guide covers everything you need to know.

## Enabling ES Modules

There are two ways to use ES modules in Node.js:

### Option 1: Use .mjs Extension

```javascript
// math.mjs
export function add(a, b) {
  return a + b;
}

// main.mjs
import { add } from './math.mjs';
console.log(add(2, 3));
```

Run with:

```bash
node main.mjs
```

### Option 2: Set type in package.json (Recommended)

```json
{
  "name": "my-app",
  "type": "module"
}
```

Now all .js files are treated as ES modules:

```javascript
// math.js
export function add(a, b) {
  return a + b;
}

// main.js
import { add } from './math.js';
console.log(add(2, 3));
```

## Named Exports and Imports

Export multiple values by name:

```javascript
// utils.js
// Export declarations directly
export const PI = 3.14159;

export function square(x) {
  return x * x;
}

export class Calculator {
  add(a, b) {
    return a + b;
  }
}

// Or export at the end
const E = 2.71828;
function cube(x) {
  return x * x * x;
}

export { E, cube };
```

Import them:

```javascript
// main.js
// Import specific exports
import { PI, square, Calculator } from './utils.js';

console.log(PI);
console.log(square(4));
const calc = new Calculator();
console.log(calc.add(2, 3));

// Import with alias
import { square as sq, cube as cb } from './utils.js';
console.log(sq(4));
console.log(cb(3));

// Import all as namespace
import * as Utils from './utils.js';
console.log(Utils.PI);
console.log(Utils.square(4));
```

## Default Exports and Imports

Export a single main value:

```javascript
// logger.js
// Default export
export default class Logger {
  log(message) {
    console.log(`[LOG] ${message}`);
  }
  
  error(message) {
    console.error(`[ERROR] ${message}`);
  }
}

// Or export at the end
class Logger {
  // ...
}
export default Logger;
```

Import the default:

```javascript
// main.js
// Import default (choose any name)
import Logger from './logger.js';
import MyLogger from './logger.js';  // Works too

const logger = new Logger();
logger.log('Hello');
```

## Combining Default and Named Exports

```javascript
// api.js
// Default export
export default class API {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }
  
  async get(endpoint) {
    const response = await fetch(`${this.baseUrl}${endpoint}`);
    return response.json();
  }
}

// Named exports
export const VERSION = '1.0.0';

export function createAPI(baseUrl) {
  return new API(baseUrl);
}
```

Import both:

```javascript
// main.js
// Import default and named together
import API, { VERSION, createAPI } from './api.js';

console.log(VERSION);
const api = new API('https://api.example.com');
const api2 = createAPI('https://api.example.com');
```

## Re-exporting

Create barrel files to simplify imports:

```javascript
// models/user.js
export class User {
  constructor(name) {
    this.name = name;
  }
}

// models/product.js
export class Product {
  constructor(title) {
    this.title = title;
  }
}

// models/index.js (barrel file)
// Re-export everything
export { User } from './user.js';
export { Product } from './product.js';

// Re-export with rename
export { User as UserModel } from './user.js';

// Re-export all
export * from './user.js';
export * from './product.js';

// Re-export default as named
export { default as User } from './user.js';
```

Use the barrel:

```javascript
// main.js
import { User, Product } from './models/index.js';
// or
import { User, Product } from './models/index.js';

const user = new User('John');
const product = new Product('Laptop');
```

## Dynamic Imports

Import modules dynamically at runtime:

```javascript
// main.js
async function loadModule() {
  // Dynamic import returns a promise
  const { default: Logger } = await import('./logger.js');
  const logger = new Logger();
  logger.log('Loaded dynamically');
}

// Conditional imports
async function loadFeature(featureName) {
  if (featureName === 'charts') {
    const { Chart } = await import('./features/charts.js');
    return new Chart();
  } else if (featureName === 'reports') {
    const { Report } = await import('./features/reports.js');
    return new Report();
  }
}

// Error handling
async function safeImport(modulePath) {
  try {
    const module = await import(modulePath);
    return module;
  } catch (error) {
    console.error(`Failed to load ${modulePath}:`, error);
    return null;
  }
}
```

## Importing JSON

Import JSON files directly (Node.js 18+):

```json
// config.json
{
  "port": 3000,
  "debug": true
}
```

```javascript
// main.js
// With import assertion
import config from './config.json' with { type: 'json' };
console.log(config.port);

// Or use dynamic import
const config = await import('./config.json', { with: { type: 'json' } });
console.log(config.default.port);

// For older Node.js versions, use fs
import { readFileSync } from 'fs';
const config = JSON.parse(readFileSync('./config.json', 'utf8'));
```

## Importing CommonJS from ES Modules

You can import CommonJS modules from ES modules:

```javascript
// legacy-module.cjs (CommonJS)
module.exports = {
  greet: function(name) {
    return `Hello, ${name}!`;
  }
};

// main.js (ES Module)
// Import CommonJS default export
import legacy from './legacy-module.cjs';
console.log(legacy.greet('World'));

// Built-in modules work the same
import fs from 'fs';
import path from 'path';
```

Note: Named imports from CommonJS may not work. Use default import and destructure:

```javascript
// Instead of this (might not work)
import { readFile } from 'fs';

// Do this
import fs from 'fs';
const { readFile } = fs;

// Or use node: protocol
import { readFile } from 'node:fs/promises';
```

## Using CommonJS in ES Module Projects

When your project has `"type": "module"`, use `.cjs` extension for CommonJS:

```javascript
// config.cjs
module.exports = {
  port: 3000,
};

// main.js (ES module)
import config from './config.cjs';
```

## Top-Level Await

ES modules support await at the top level:

```javascript
// db.js
import { createConnection } from './database.js';

// Top-level await (no async wrapper needed)
const connection = await createConnection();

export { connection };
```

```javascript
// main.js
import { connection } from './db.js';

// Connection is already established
const users = await connection.query('SELECT * FROM users');
```

## __dirname and __filename in ES Modules

These globals are not available in ES modules. Here's how to get them:

```javascript
// ES Module equivalent of __dirname and __filename
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(__filename);  // /Users/me/project/main.js
console.log(__dirname);   // /Users/me/project
```

Or create a utility:

```javascript
// utils/paths.js
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

export function getDirname(importMetaUrl) {
  return dirname(fileURLToPath(importMetaUrl));
}

export function getFilename(importMetaUrl) {
  return fileURLToPath(importMetaUrl);
}

// main.js
import { getDirname } from './utils/paths.js';

const __dirname = getDirname(import.meta.url);
```

## import.meta

Access module metadata:

```javascript
// main.js
// URL of the current module
console.log(import.meta.url);
// file:///Users/me/project/main.js

// Resolve relative paths
const configPath = new URL('./config.json', import.meta.url);
```

## TypeScript Configuration

For TypeScript projects using ES modules:

```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "outDir": "./dist",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

```json
// package.json
{
  "type": "module"
}
```

## Common Migration Patterns

### From CommonJS to ES Modules

```javascript
// Before (CommonJS)
const express = require('express');
const { Router } = require('express');
const path = require('path');

module.exports = { myFunction };
module.exports.named = namedExport;

// After (ES Modules)
import express, { Router } from 'express';
import path from 'path';

export { myFunction };
export { namedExport as named };
```

### Maintaining Both Formats (for Libraries)

```json
// package.json
{
  "name": "my-library",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  }
}
```

## Troubleshooting

### "Cannot use import statement outside a module"

```bash
# Add to package.json
{
  "type": "module"
}

# Or use .mjs extension
# Or run with --experimental-modules flag (older Node)
```

### "require is not defined in ES module scope"

```javascript
// Use import instead
import fs from 'fs';

// Or create require function
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const legacyModule = require('./legacy.cjs');
```

### "ERR_MODULE_NOT_FOUND"

Include file extension in imports:

```javascript
// Wrong
import { add } from './math';

// Correct
import { add } from './math.js';
```

## Summary

| Feature | CommonJS | ES Modules |
|---------|----------|------------|
| Syntax | `require()`, `module.exports` | `import`, `export` |
| Loading | Synchronous | Asynchronous |
| Top-level await | No | Yes |
| File extension | `.js`, `.cjs` | `.js` (with type:module), `.mjs` |
| `__dirname` | Available | Use `import.meta.url` |
| Dynamic import | `require()` | `import()` |
| Tree shaking | No | Yes |

ES modules are the future of JavaScript. For new projects, always use `"type": "module"` in package.json and embrace the import/export syntax. The benefits of tree shaking, static analysis, and cleaner syntax make it worth the learning curve.
