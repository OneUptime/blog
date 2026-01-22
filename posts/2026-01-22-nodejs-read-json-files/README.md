# How to Read JSON Files in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, JSON, FileSystem, JavaScript, Configuration

Description: Learn multiple methods to read JSON files in Node.js including require, fs module, fs promises, streams for large files, and error handling best practices.

---

Reading JSON files is a common operation in Node.js applications for configuration, data storage, and inter-service communication. This guide covers all the methods from simple to advanced.

## Method 1: Using require() (Simplest)

For static JSON files:

```javascript
// config.json
{
  "port": 3000,
  "database": "mongodb://localhost/myapp"
}
```

```javascript
// app.js
const config = require('./config.json');

console.log(config.port);     // 3000
console.log(config.database); // mongodb://localhost/myapp
```

Pros:
- Simple and synchronous
- Cached automatically (only read once)

Cons:
- Cannot reload without cache clearing
- File must exist at startup
- Not suitable for dynamic content

### Clear Cache to Reload

```javascript
// Delete cache entry
delete require.cache[require.resolve('./config.json')];

// Now require will read the file again
const freshConfig = require('./config.json');
```

## Method 2: Using fs.readFileSync (Synchronous)

For reading at startup:

```javascript
const fs = require('fs');

// Read and parse JSON
const data = fs.readFileSync('data.json', 'utf8');
const json = JSON.parse(data);

console.log(json);
```

Wrapped in a function:

```javascript
const fs = require('fs');

function readJSON(filepath) {
  const data = fs.readFileSync(filepath, 'utf8');
  return JSON.parse(data);
}

// Usage
const config = readJSON('./config.json');
const users = readJSON('./users.json');
```

## Method 3: Using fs.readFile (Callback)

Asynchronous reading:

```javascript
const fs = require('fs');

fs.readFile('data.json', 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }
  
  try {
    const json = JSON.parse(data);
    console.log(json);
  } catch (parseError) {
    console.error('Error parsing JSON:', parseError);
  }
});

console.log('This runs before file is read');
```

## Method 4: Using fs/promises (Recommended)

Modern async/await approach:

```javascript
const fs = require('fs/promises');

async function readJSON(filepath) {
  const data = await fs.readFile(filepath, 'utf8');
  return JSON.parse(data);
}

// Usage
async function main() {
  try {
    const config = await readJSON('./config.json');
    console.log(config);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
```

### Read Multiple Files

```javascript
const fs = require('fs/promises');

async function loadAllConfigs() {
  const [users, products, settings] = await Promise.all([
    fs.readFile('./users.json', 'utf8'),
    fs.readFile('./products.json', 'utf8'),
    fs.readFile('./settings.json', 'utf8'),
  ]);
  
  return {
    users: JSON.parse(users),
    products: JSON.parse(products),
    settings: JSON.parse(settings),
  };
}
```

## Method 5: ES Modules Import (Node.js 18+)

Import JSON directly with import assertion:

```javascript
// app.mjs (ES modules)
import config from './config.json' with { type: 'json' };

console.log(config.port);
```

Or with dynamic import:

```javascript
async function loadConfig() {
  const { default: config } = await import('./config.json', {
    with: { type: 'json' }
  });
  return config;
}
```

## Reading Large JSON Files

For large files, avoid loading everything into memory:

### Using Streams

```javascript
const fs = require('fs');
const { pipeline } = require('stream/promises');
const { Transform } = require('stream');

// Using JSONStream for parsing
const JSONStream = require('JSONStream');

async function processLargeJSON() {
  const readStream = fs.createReadStream('large-file.json');
  const parser = JSONStream.parse('*');  // Parse array elements
  
  parser.on('data', (item) => {
    console.log('Item:', item);
    // Process each item individually
  });
  
  await pipeline(readStream, parser);
}
```

### Using stream-json

```bash
npm install stream-json
```

```javascript
const fs = require('fs');
const { parser } = require('stream-json');
const { streamArray } = require('stream-json/streamers/StreamArray');

const jsonStream = fs.createReadStream('users.json')
  .pipe(parser())
  .pipe(streamArray());

jsonStream.on('data', ({ key, value }) => {
  console.log(`User ${key}:`, value);
});

jsonStream.on('end', () => {
  console.log('Finished processing');
});
```

## Error Handling

### Comprehensive Error Handling

```javascript
const fs = require('fs/promises');

async function safeReadJSON(filepath) {
  try {
    const data = await fs.readFile(filepath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${filepath}`);
    }
    if (error.code === 'EACCES') {
      throw new Error(`Permission denied: ${filepath}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in ${filepath}: ${error.message}`);
    }
    throw error;
  }
}

// Usage with fallback
async function loadConfig() {
  try {
    return await safeReadJSON('./config.json');
  } catch (error) {
    console.warn('Using default config:', error.message);
    return { port: 3000, debug: false };
  }
}
```

### Validate JSON Structure

```javascript
function validateConfig(config) {
  const required = ['port', 'database'];
  
  for (const key of required) {
    if (!(key in config)) {
      throw new Error(`Missing required config key: ${key}`);
    }
  }
  
  if (typeof config.port !== 'number') {
    throw new Error('Config port must be a number');
  }
  
  return config;
}

async function loadValidConfig() {
  const config = await safeReadJSON('./config.json');
  return validateConfig(config);
}
```

### Using Zod for Validation

```bash
npm install zod
```

```javascript
const { z } = require('zod');
const fs = require('fs/promises');

const ConfigSchema = z.object({
  port: z.number().int().positive(),
  database: z.string().url(),
  debug: z.boolean().default(false),
  features: z.object({
    newUI: z.boolean().default(false),
  }).optional(),
});

async function loadConfig() {
  const data = await fs.readFile('./config.json', 'utf8');
  const json = JSON.parse(data);
  return ConfigSchema.parse(json);  // Throws if invalid
}
```

## Watch for Changes

Reload JSON when file changes:

```javascript
const fs = require('fs');
const path = require('path');

let config = null;
const configPath = path.resolve('./config.json');

function loadConfig() {
  const data = fs.readFileSync(configPath, 'utf8');
  config = JSON.parse(data);
  console.log('Config loaded:', config);
}

// Initial load
loadConfig();

// Watch for changes
fs.watch(configPath, (eventType) => {
  if (eventType === 'change') {
    console.log('Config file changed, reloading...');
    loadConfig();
  }
});

// Access current config
function getConfig() {
  return config;
}
```

### Using chokidar

```bash
npm install chokidar
```

```javascript
const chokidar = require('chokidar');
const fs = require('fs/promises');

class ConfigManager {
  constructor(filepath) {
    this.filepath = filepath;
    this.config = null;
    this.watchers = [];
  }
  
  async load() {
    const data = await fs.readFile(this.filepath, 'utf8');
    this.config = JSON.parse(data);
    this.notifyWatchers();
    return this.config;
  }
  
  watch() {
    const watcher = chokidar.watch(this.filepath);
    watcher.on('change', () => this.load());
    return this;
  }
  
  onChange(callback) {
    this.watchers.push(callback);
    return this;
  }
  
  notifyWatchers() {
    this.watchers.forEach(fn => fn(this.config));
  }
  
  get() {
    return this.config;
  }
}

// Usage
const config = new ConfigManager('./config.json');
config.onChange((newConfig) => {
  console.log('Config updated:', newConfig);
});
await config.load();
config.watch();
```

## JSON with Comments

Standard JSON does not support comments. Use JSON5 or strip comments:

```bash
npm install json5
```

```javascript
const JSON5 = require('json5');
const fs = require('fs/promises');

async function readJSON5(filepath) {
  const data = await fs.readFile(filepath, 'utf8');
  return JSON5.parse(data);
}
```

```javascript
// config.json5
{
  // Server configuration
  port: 3000,
  
  /* Database settings */
  database: "mongodb://localhost/myapp",
  
  // Feature flags
  features: {
    newUI: true,
  },
}
```

## TypeScript Support

```typescript
// types.ts
interface Config {
  port: number;
  database: string;
  debug?: boolean;
}

// config.ts
import { promises as fs } from 'fs';

async function loadConfig(): Promise<Config> {
  const data = await fs.readFile('./config.json', 'utf8');
  return JSON.parse(data) as Config;
}

// Or with type checking
async function loadConfigSafe(): Promise<Config> {
  const data = await fs.readFile('./config.json', 'utf8');
  const config = JSON.parse(data);
  
  if (typeof config.port !== 'number') {
    throw new Error('Invalid config: port must be a number');
  }
  
  return config;
}
```

## Practical Example: Config Module

```javascript
// config/index.js
const fs = require('fs');
const path = require('path');

const env = process.env.NODE_ENV || 'development';
const configDir = path.join(__dirname);

function loadJSON(filename) {
  const filepath = path.join(configDir, filename);
  if (fs.existsSync(filepath)) {
    return JSON.parse(fs.readFileSync(filepath, 'utf8'));
  }
  return {};
}

// Load in order: default < environment < local
const defaultConfig = loadJSON('default.json');
const envConfig = loadJSON(`${env}.json`);
const localConfig = loadJSON('local.json');  // gitignored

// Merge configs (later ones override)
const config = {
  ...defaultConfig,
  ...envConfig,
  ...localConfig,
};

module.exports = config;
```

Directory structure:

```
config/
├── index.js
├── default.json
├── development.json
├── production.json
└── local.json (gitignored)
```

## Summary

| Method | Use Case |
|--------|----------|
| `require()` | Static config, cached |
| `fs.readFileSync` | Startup config, blocking OK |
| `fs.readFile` (callback) | Legacy async code |
| `fs/promises` | Modern async code |
| `import` with assertion | ES modules |
| Streams | Large files (MB+) |
| JSON5 | Config with comments |

Best practices:
- Use `fs/promises` for most cases
- Validate JSON structure after parsing
- Handle file not found and parse errors
- Use streams for files over a few MB
- Consider JSON5 for configuration files
- Watch files for hot reloading in development
