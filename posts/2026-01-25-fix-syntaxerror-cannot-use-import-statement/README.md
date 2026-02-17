# How to Fix 'SyntaxError: Cannot use import statement'

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, JavaScript, ES Modules, CommonJS, Troubleshooting

Description: Fix the SyntaxError when using ES6 import statements in Node.js by configuring your project for ES modules or converting to CommonJS syntax.

---

You write `import express from 'express'` in your Node.js file, hit run, and get slapped with this error:

```
SyntaxError: Cannot use import statement outside a module
```

This happens because Node.js defaults to CommonJS modules, but you are using ES6 module syntax. The fix depends on whether you want to use ES modules throughout your project or stick with CommonJS.

## Understanding the Problem

Node.js has two module systems:

| Feature | CommonJS (CJS) | ES Modules (ESM) |
|---------|---------------|------------------|
| Syntax | `require()`, `module.exports` | `import`, `export` |
| Loading | Synchronous | Asynchronous |
| Default in Node | Yes (before v12) | Opt-in |
| File extension | `.js`, `.cjs` | `.mjs` or `.js` with config |

The error occurs when you use ESM syntax in a file that Node treats as CommonJS.

## Solution 1: Enable ES Modules in package.json

Add `"type": "module"` to your package.json:

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
```

Now all `.js` files in your project are treated as ES modules:

```javascript
// index.js - ES module syntax works now
import express from 'express';
import { readFile } from 'fs/promises';
import path from 'path';

const app = express();

app.get('/', (req, res) => {
    res.json({ message: 'Hello World' });
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
```

## Solution 2: Use .mjs Extension

If you do not want to change the entire project, rename your file to `.mjs`:

```bash
mv index.js index.mjs
```

Update your start script:

```json
{
  "scripts": {
    "start": "node index.mjs"
  }
}
```

The `.mjs` extension always signals ES module regardless of package.json settings.

## Solution 3: Convert to CommonJS

If you prefer CommonJS (or need to support older Node versions), convert your imports:

```javascript
// ES Module syntax (causes the error)
import express from 'express';
import { Router } from 'express';
import * as fs from 'fs';

// CommonJS equivalent
const express = require('express');
const { Router } = require('express');
const fs = require('fs');
```

For exports:

```javascript
// ES Module syntax
export default function handler() {}
export const helper = () => {};

// CommonJS equivalent
function handler() {}
const helper = () => {};

module.exports = handler;
module.exports.helper = helper;
// Or
module.exports = { handler, helper };
```

## Solution 4: Use TypeScript

TypeScript compiles your ES module syntax to CommonJS (or ESM) based on configuration:

```bash
npm install typescript ts-node @types/node --save-dev
npx tsc --init
```

Configure tsconfig.json:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
```

Now you can use import syntax in `.ts` files:

```typescript
// src/index.ts
import express, { Request, Response } from 'express';

const app = express();

app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'Hello from TypeScript' });
});

app.listen(3000);
```

Run with ts-node or compile first:

```bash
# Run directly
npx ts-node src/index.ts

# Or compile and run
npx tsc
node dist/index.js
```

## Common Gotchas with ES Modules

### No __dirname or __filename

ES modules do not have `__dirname` and `__filename`. Here is how to get them:

```javascript
// This causes an error in ES modules
console.log(__dirname);  // ReferenceError: __dirname is not defined

// Fix: Create them manually
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log(__dirname);  // Works now
```

### No require()

You cannot use require() in ES modules:

```javascript
// This fails in ES modules
const config = require('./config.json');

// Fix: Use createRequire
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const config = require('./config.json');

// Or use fs to read JSON
import { readFileSync } from 'fs';
const config = JSON.parse(readFileSync('./config.json', 'utf-8'));

// Or use import assertion (Node 16.14+)
import config from './config.json' assert { type: 'json' };
```

### Importing CommonJS Modules

Most npm packages are CommonJS. Importing them in ES modules usually works:

```javascript
// This usually works
import express from 'express';
import _ from 'lodash';

// Named imports might not work for some CJS packages
import { chunk } from 'lodash';  // May fail

// Fix: Import default and destructure
import lodash from 'lodash';
const { chunk, map, filter } = lodash;
```

### File Extensions Required

ES modules require file extensions in imports:

```javascript
// This fails in ES modules
import { helper } from './utils';

// Fix: Add the extension
import { helper } from './utils.js';
```

## Mixed Module Environment

Sometimes you need both module systems in one project:

```json
{
  "type": "module"
}
```

```javascript
// app.js - ES module (because of package.json type)
import express from 'express';

// legacy.cjs - CommonJS (because of .cjs extension)
const oldLib = require('old-library');
module.exports = { oldLib };
```

Import CJS from ESM:

```javascript
// In your ES module file
import legacy from './legacy.cjs';
```

## Debugging Checklist

When you see "Cannot use import statement", check these:

1. **package.json has "type": "module"?** If not, add it or use .mjs extension
2. **Using correct Node version?** ES modules need Node 12+ (14+ recommended)
3. **File has correct extension?** .js (with type:module), .mjs, or .cjs
4. **Importing local files with extension?** Add .js to local imports
5. **Running with correct command?** Some tools need flags like `--experimental-modules` (older Node)

```bash
# Check Node version
node --version

# Should be v14.0.0 or higher for stable ESM support
```

## Project Setup Example

Here is a complete ES modules setup:

```json
{
  "name": "esm-project",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "node --watch src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
```

```javascript
// src/index.js
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { router } from './routes/api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

app.use(express.json());
app.use('/api', router);

// Serve static files
app.use(express.static(join(__dirname, '../public')));

app.listen(3000, () => {
    console.log('Server started on port 3000');
});
```

```javascript
// src/routes/api.js
import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

export { router };
```

## Summary

The "Cannot use import statement" error is a module system mismatch. Fix it by either enabling ES modules in your project (`"type": "module"` in package.json), using the `.mjs` extension, converting to CommonJS require/exports syntax, or using TypeScript. Each approach has trade-offs, so choose based on your project needs and Node.js version requirements.
