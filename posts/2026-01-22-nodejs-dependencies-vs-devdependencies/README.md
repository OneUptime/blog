# How to Understand dependencies vs devDependencies in package.json

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, npm, PackageManager, JavaScript, Dependencies

Description: Learn the difference between dependencies and devDependencies in package.json, when to use each, and how they affect your production builds and bundle sizes.

---

One of the most common questions when starting with Node.js is understanding the difference between `dependencies` and `devDependencies` in package.json. Making the wrong choice can bloat your production builds or break your application. This guide clarifies when to use each.

## Quick Answer

```json
{
  "dependencies": {
    "express": "^4.18.0"
  },
  "devDependencies": {
    "jest": "^29.0.0"
  }
}
```

- **dependencies**: Packages your code needs to run in production
- **devDependencies**: Packages needed only during development and testing

## The Key Difference

### dependencies

These packages are required at runtime. Your application will not work without them.

```json
{
  "dependencies": {
    "express": "^4.18.0",    
    "mongoose": "^7.0.0",    
    "lodash": "^4.17.21",    
    "axios": "^1.4.0"        
  }
}
```

### devDependencies

These packages are only needed during development, testing, or build processes. They are not required to run the application.

```json
{
  "devDependencies": {
    "jest": "^29.0.0",       
    "eslint": "^8.0.0",      
    "typescript": "^5.0.0",  
    "nodemon": "^3.0.0",     
    "webpack": "^5.0.0"      
  }
}
```

## When Each is Installed

```bash
# Install all dependencies (both types)
npm install

# Install only production dependencies
npm install --production

# Or using NODE_ENV
NODE_ENV=production npm install
```

In production environments, you typically only install production dependencies:

```dockerfile
# Dockerfile example
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production  # Only installs dependencies, not devDependencies
COPY . .
CMD ["node", "server.js"]
```

## How to Add Packages

```bash
# Add to dependencies (default)
npm install express
npm install express --save  # Same as above, --save is default

# Add to devDependencies
npm install jest --save-dev
npm install jest -D  # Shorthand
```

## Common Examples by Category

### Always dependencies

Packages your code imports and uses at runtime:

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "fastify": "^4.0.0",
    "koa": "^2.14.0",
    
    "mongoose": "^7.0.0",
    "pg": "^8.10.0",
    "redis": "^4.6.0",
    "prisma": "^5.0.0",
    
    "axios": "^1.4.0",
    "node-fetch": "^3.3.0",
    "got": "^13.0.0",
    
    "lodash": "^4.17.21",
    "moment": "^2.29.0",
    "dayjs": "^1.11.0",
    "uuid": "^9.0.0",
    
    "bcrypt": "^5.1.0",
    "jsonwebtoken": "^9.0.0",
    
    "dotenv": "^16.0.0",
    "winston": "^3.8.0"
  }
}
```

### Always devDependencies

Packages used only for development workflow:

```json
{
  "devDependencies": {
    "jest": "^29.0.0",
    "mocha": "^10.2.0",
    "vitest": "^0.34.0",
    "supertest": "^6.3.0",
    
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "husky": "^8.0.0",
    "lint-staged": "^15.0.0",
    
    "nodemon": "^3.0.0",
    "ts-node": "^10.9.0",
    "concurrently": "^8.2.0",
    
    "webpack": "^5.88.0",
    "vite": "^4.4.0",
    "esbuild": "^0.19.0",
    "rollup": "^3.0.0",
    
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0"
  }
}
```

## The Gray Areas

### TypeScript

TypeScript itself is a devDependency because code is compiled before production:

```json
{
  "devDependencies": {
    "typescript": "^5.0.0"
  }
}
```

But type definitions depend on usage:

```json
{
  "dependencies": {
    "express": "^4.18.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.0"
  }
}
```

### Babel

Babel is for transpilation, so it's a devDependency:

```json
{
  "devDependencies": {
    "@babel/core": "^7.22.0",
    "@babel/preset-env": "^7.22.0"
  }
}
```

But `@babel/runtime` is a dependency if you use runtime helpers:

```json
{
  "dependencies": {
    "@babel/runtime": "^7.22.0"
  },
  "devDependencies": {
    "@babel/plugin-transform-runtime": "^7.22.0"
  }
}
```

### CSS Processors

PostCSS and Sass are build tools, so devDependencies:

```json
{
  "devDependencies": {
    "sass": "^1.63.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.3.0"
  }
}
```

## Impact on Different Project Types

### Backend/API Applications

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "mongoose": "^7.0.0",
    "jsonwebtoken": "^9.0.0"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "nodemon": "^3.0.0",
    "eslint": "^8.0.0"
  }
}
```

When deployed:

```bash
# Only express, mongoose, jsonwebtoken are installed
npm ci --production
```

### Frontend Applications (React, Vue)

Frontend apps are bundled, so most packages are devDependencies:

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "vite": "^4.4.0",
    "@vitejs/plugin-react": "^4.0.0",
    "typescript": "^5.0.0",
    "jest": "^29.0.0"
  }
}
```

Wait, why is React in dependencies? The bundler (Vite) needs to bundle it. Some teams put everything in devDependencies for frontend apps since nothing runs as Node.js in production. Both approaches work.

### npm Packages/Libraries

When publishing a package, the distinction is critical:

```json
{
  "dependencies": {
    "lodash": "^4.17.21"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "jest": "^29.0.0"
  },
  "peerDependencies": {
    "react": "^18.0.0"
  }
}
```

- **dependencies**: Installed when someone `npm install`s your package
- **devDependencies**: NOT installed by consumers
- **peerDependencies**: Consumer must install these themselves

## peerDependencies

A third category for packages where the consumer should provide the dependency:

```json
{
  "name": "my-react-component",
  "peerDependencies": {
    "react": ">=16.8.0"
  }
}
```

When to use peerDependencies:
- Plugins (webpack plugins, babel plugins)
- Framework-specific libraries (React components, Vue plugins)
- Avoiding duplicate packages

## optionalDependencies

Packages that enhance functionality but are not required:

```json
{
  "optionalDependencies": {
    "fsevents": "^2.3.0"
  }
}
```

npm will not fail if optional dependencies cannot be installed.

## Checking Your Dependencies

```bash
# List all dependencies
npm list

# List production dependencies only
npm list --production

# List direct dependencies
npm list --depth=0

# Check for unused dependencies
npx depcheck

# Check bundle size impact
npx bundlephobia-cli express
```

## Common Mistakes

### Mistake 1: Test utilities in dependencies

```json
{
  "dependencies": {
    "jest": "^29.0.0"
  }
}
```

Fix: Move to devDependencies:

```bash
npm uninstall jest
npm install jest --save-dev
```

### Mistake 2: Build tools in dependencies

```json
{
  "dependencies": {
    "webpack": "^5.0.0",
    "typescript": "^5.0.0"
  }
}
```

Fix: These are development tools:

```bash
npm uninstall webpack typescript
npm install webpack typescript --save-dev
```

### Mistake 3: Runtime packages in devDependencies

```json
{
  "devDependencies": {
    "express": "^4.18.0"
  }
}
```

This will break production! Fix:

```bash
npm uninstall express
npm install express
```

## Migration Script

Move misplaced dependencies:

```javascript
// fix-deps.js
const fs = require('fs');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Packages that should be devDependencies
const shouldBeDev = [
  'jest', 'mocha', 'vitest', 'chai',
  'eslint', 'prettier', 'husky', 'lint-staged',
  'typescript', 'ts-node', 'ts-jest',
  'webpack', 'vite', 'rollup', 'esbuild', 'parcel',
  'nodemon', 'concurrently',
  '@types/',
];

const deps = pkg.dependencies || {};
const devDeps = pkg.devDependencies || {};

for (const [name, version] of Object.entries(deps)) {
  if (shouldBeDev.some(d => name.startsWith(d))) {
    console.log(`Moving ${name} to devDependencies`);
    devDeps[name] = version;
    delete deps[name];
  }
}

pkg.dependencies = deps;
pkg.devDependencies = devDeps;

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('Done! Run npm install to update lock file.');
```

## Summary

| Package Type | dependencies | devDependencies |
|--------------|--------------|-----------------|
| Web frameworks | Express, Koa, Fastify | |
| Databases | Mongoose, pg, Redis | |
| Testing | | Jest, Mocha, Vitest |
| Linting | | ESLint, Prettier |
| Build tools | | Webpack, Vite, TypeScript |
| Dev utilities | | Nodemon, concurrently |
| Type definitions | | @types/* |
| Utilities used at runtime | Lodash, Axios, Moment | |

The simple rule is to ask: "Does my application need this package to run in production?" If yes, it belongs in dependencies. If it's only used during development, testing, or building, it belongs in devDependencies.
