# How to Detect and Check Node.js Version Programmatically

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Version, Runtime, JavaScript, DevOps

Description: Learn how to detect the Node.js version at runtime, check version requirements, and ensure compatibility across different environments.

---

Knowing which Node.js version your code runs on is essential for feature detection, compatibility checks, and debugging. This guide covers all the ways to detect and work with Node.js versions.

## Quick Version Check

### Command Line

```bash
# Node.js version
node --version
# or
node -v

# npm version
npm --version

# All versions (node, npm, v8, etc.)
node -p "process.versions"
```

### In Code

```javascript
// Node.js version
console.log(process.version);
// v18.17.0

// Detailed versions
console.log(process.versions);
// {
//   node: '18.17.0',
//   v8: '10.2.154.26',
//   uv: '1.44.2',
//   ...
// }
```

## Using process.version

The simplest way to get the Node.js version:

```javascript
// Get version string
const version = process.version;
console.log(version);  // v18.17.0

// Parse version components
const match = process.version.match(/^v(\d+)\.(\d+)\.(\d+)/);
const [, major, minor, patch] = match;

console.log(`Major: ${major}`);  // 18
console.log(`Minor: ${minor}`);  // 17
console.log(`Patch: ${patch}`);  // 0
```

## Using process.versions

Get detailed runtime information:

```javascript
const versions = process.versions;

console.log('Node.js:', versions.node);
console.log('V8 Engine:', versions.v8);
console.log('libuv:', versions.uv);
console.log('OpenSSL:', versions.openssl);
console.log('zlib:', versions.zlib);
console.log('npm:', versions.npm);  // May be undefined
```

Example output:

```javascript
{
  node: '18.17.0',
  v8: '10.2.154.26',
  uv: '1.44.2',
  zlib: '1.2.13',
  brotli: '1.0.9',
  ares: '1.19.1',
  modules: '108',
  nghttp2: '1.52.0',
  napi: '9',
  llhttp: '6.0.11',
  openssl: '3.0.9',
  cldr: '43.0',
  icu: '73.1',
  tz: '2023c',
  unicode: '15.0'
}
```

## Version Checking Utility

Create a reusable utility:

```javascript
class NodeVersion {
  static get current() {
    return process.version;
  }
  
  static get major() {
    return parseInt(process.version.match(/^v(\d+)/)[1], 10);
  }
  
  static get minor() {
    return parseInt(process.version.match(/^v\d+\.(\d+)/)[1], 10);
  }
  
  static get patch() {
    return parseInt(process.version.match(/^v\d+\.\d+\.(\d+)/)[1], 10);
  }
  
  static get tuple() {
    return [this.major, this.minor, this.patch];
  }
  
  static isAtLeast(major, minor = 0, patch = 0) {
    const [currentMajor, currentMinor, currentPatch] = this.tuple;
    
    if (currentMajor > major) return true;
    if (currentMajor < major) return false;
    
    if (currentMinor > minor) return true;
    if (currentMinor < minor) return false;
    
    return currentPatch >= patch;
  }
  
  static isBelow(major, minor = 0, patch = 0) {
    return !this.isAtLeast(major, minor, patch);
  }
  
  static check(requirement) {
    // Parse requirement like ">=18.0.0" or "^16.0.0"
    const match = requirement.match(/^([<>=^~]*)(\d+)(?:\.(\d+))?(?:\.(\d+))?$/);
    
    if (!match) {
      throw new Error(`Invalid version requirement: ${requirement}`);
    }
    
    const [, operator, major, minor = '0', patch = '0'] = match;
    const reqMajor = parseInt(major, 10);
    const reqMinor = parseInt(minor, 10);
    const reqPatch = parseInt(patch, 10);
    
    switch (operator) {
      case '>=':
        return this.isAtLeast(reqMajor, reqMinor, reqPatch);
      case '>':
        return this.tuple.join('.') > `${reqMajor}.${reqMinor}.${reqPatch}`;
      case '<=':
        return !this.isAtLeast(reqMajor, reqMinor, reqPatch + 1);
      case '<':
        return this.isBelow(reqMajor, reqMinor, reqPatch);
      case '^':
        return this.isAtLeast(reqMajor, reqMinor, reqPatch) && 
               this.major === reqMajor;
      case '~':
        return this.isAtLeast(reqMajor, reqMinor, reqPatch) && 
               this.major === reqMajor && 
               this.minor === reqMinor;
      default:
        return this.major === reqMajor && 
               this.minor === reqMinor && 
               this.patch === reqPatch;
    }
  }
}

// Usage
console.log(NodeVersion.current);           // v18.17.0
console.log(NodeVersion.major);             // 18
console.log(NodeVersion.isAtLeast(16));     // true
console.log(NodeVersion.isAtLeast(20));     // false
console.log(NodeVersion.check('>=16.0.0')); // true
console.log(NodeVersion.check('^18.0.0'));  // true
```

## Using semver Package

For robust version comparisons:

```bash
npm install semver
```

```javascript
const semver = require('semver');

const nodeVersion = process.version;

// Check if version satisfies a range
console.log(semver.satisfies(nodeVersion, '>=16.0.0'));  // true
console.log(semver.satisfies(nodeVersion, '^18.0.0'));   // true
console.log(semver.satisfies(nodeVersion, '16.x || 18.x')); // true

// Compare versions
console.log(semver.gt(nodeVersion, 'v16.0.0'));  // true
console.log(semver.lt(nodeVersion, 'v20.0.0'));  // true

// Parse version
const parsed = semver.parse(nodeVersion);
console.log(parsed.major);  // 18
console.log(parsed.minor);  // 17
console.log(parsed.patch);  // 0
```

## Enforcing Version Requirements

### In package.json

```json
{
  "name": "myapp",
  "engines": {
    "node": ">=18.0.0",
    "npm": ">=9.0.0"
  }
}
```

To enforce strictly:

```bash
# .npmrc
engine-strict=true
```

### At Runtime

```javascript
// check-version.js
const semver = require('semver');
const { engines } = require('./package.json');

const nodeVersion = process.version;
const requiredVersion = engines.node;

if (!semver.satisfies(nodeVersion, requiredVersion)) {
  console.error(
    `Required Node.js version ${requiredVersion}, ` +
    `but found ${nodeVersion}`
  );
  process.exit(1);
}
```

### As Entry Point Check

```javascript
// index.js
const MINIMUM_NODE_VERSION = 18;

const majorVersion = parseInt(process.version.match(/^v(\d+)/)[1], 10);

if (majorVersion < MINIMUM_NODE_VERSION) {
  console.error(`
    This application requires Node.js ${MINIMUM_NODE_VERSION} or higher.
    You are running Node.js ${process.version}.
    
    Please upgrade Node.js: https://nodejs.org/
  `);
  process.exit(1);
}

// Continue with application
require('./app');
```

## Feature Detection

Instead of checking versions, check for features:

```javascript
// Check for specific features
const hasPromiseAllSettled = typeof Promise.allSettled === 'function';
const hasOptionalChaining = (() => {
  try {
    eval('const x = null; x?.foo');
    return true;
  } catch {
    return false;
  }
})();

// Check for built-in modules
function hasModule(name) {
  try {
    require.resolve(name);
    return true;
  } catch {
    return false;
  }
}

console.log('Has fs/promises:', hasModule('fs/promises'));
console.log('Has worker_threads:', hasModule('worker_threads'));

// Use feature or polyfill
const fs = hasModule('fs/promises')
  ? require('fs/promises')
  : require('fs').promises;
```

## Environment-Based Checks

```javascript
// Detect environment
const isNode = typeof process !== 'undefined' && 
               process.versions && 
               process.versions.node;

const isBrowser = typeof window !== 'undefined';

const isDeno = typeof Deno !== 'undefined';

const isBun = typeof Bun !== 'undefined';

if (isNode) {
  console.log('Running in Node.js', process.version);
}
```

## Version in CI/CD

### GitHub Actions

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
      
      - name: Print Node version
        run: node --version
      
      - run: npm ci
      - run: npm test
```

### Docker

```dockerfile
# Specify exact version
FROM node:18.17.0-alpine

# Or use major version
FROM node:18-alpine

# Print version at build
RUN node --version
```

## Version in Logging

Include version in logs for debugging:

```javascript
const logger = {
  info(...args) {
    console.log(
      `[${new Date().toISOString()}]`,
      `[Node ${process.version}]`,
      ...args
    );
  },
};

logger.info('Application started');
// [2024-01-15T10:30:00.000Z] [Node v18.17.0] Application started
```

## Version-Specific Code

```javascript
const nodeVersion = parseInt(process.version.match(/^v(\d+)/)[1], 10);

// Use different implementations based on version
let readFile;

if (nodeVersion >= 14) {
  // Use fs/promises (available from Node 14)
  const fsPromises = require('fs/promises');
  readFile = fsPromises.readFile;
} else {
  // Fallback to promisified version
  const fs = require('fs');
  const util = require('util');
  readFile = util.promisify(fs.readFile);
}

module.exports = { readFile };
```

## Summary

| Method | Use Case |
|--------|----------|
| `process.version` | Quick version string |
| `process.versions` | Detailed runtime info |
| `semver` package | Complex version ranges |
| `engines` in package.json | Declare requirements |
| Feature detection | Runtime compatibility |
| GitHub Actions matrix | Test multiple versions |

Best practices:
- Use `engines` in package.json
- Use semver for version comparisons
- Prefer feature detection over version checks
- Include version in error logs
- Test on multiple Node versions in CI
- Document version requirements in README
