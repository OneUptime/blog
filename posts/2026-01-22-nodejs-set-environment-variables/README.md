# How to Set Environment Variables in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Environment, Configuration, Security, dotenv

Description: Learn how to set and manage environment variables in Node.js applications including using dotenv, cross-platform solutions, and best practices for configuration management.

---

Environment variables are essential for configuring Node.js applications without hardcoding sensitive values like API keys, database credentials, and feature flags. This guide covers all the ways to set and use environment variables effectively.

## Accessing Environment Variables

Environment variables are available through `process.env`:

```javascript
// Access environment variables
const port = process.env.PORT;
const nodeEnv = process.env.NODE_ENV;
const apiKey = process.env.API_KEY;

console.log(`Server running on port ${port}`);
console.log(`Environment: ${nodeEnv}`);
```

## Setting Variables in the Shell

### macOS and Linux

```bash
# Set for a single command
PORT=3000 node server.js

# Set multiple variables
PORT=3000 NODE_ENV=production node server.js

# Export for current session
export PORT=3000
export NODE_ENV=production
node server.js

# Add to ~/.bashrc or ~/.zshrc for persistence
echo 'export PORT=3000' >> ~/.zshrc
source ~/.zshrc
```

### Windows Command Prompt

```cmd
:: Set for a single command
set PORT=3000 && node server.js

:: Set for session
set PORT=3000
set NODE_ENV=production
node server.js
```

### Windows PowerShell

```powershell
# Set for a single command
$env:PORT=3000; node server.js

# Set for session
$env:PORT = "3000"
$env:NODE_ENV = "production"
node server.js
```

## Using dotenv (Recommended)

The dotenv package loads variables from a `.env` file:

```bash
npm install dotenv
```

Create a `.env` file:

```bash
# .env
PORT=3000
NODE_ENV=development
DATABASE_URL=mongodb://localhost:27017/myapp
API_KEY=your-secret-api-key
DEBUG=true
```

Load in your application:

```javascript
// server.js
// Load at the very top of your entry file
require('dotenv').config();

// Now process.env has your variables
const port = process.env.PORT;
const dbUrl = process.env.DATABASE_URL;

console.log(`Port: ${port}`);
console.log(`Database: ${dbUrl}`);
```

### ES Modules Syntax

```javascript
// server.js (ES modules)
import 'dotenv/config';

// Or with configuration
import dotenv from 'dotenv';
dotenv.config();

const port = process.env.PORT;
```

### Custom .env File Path

```javascript
// Load from custom location
require('dotenv').config({ path: './config/.env' });

// Load different files based on environment
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}`
});
```

## Environment-Specific Files

Organize configurations by environment:

```
project/
├── .env                 # Default/development
├── .env.development     # Development overrides
├── .env.production      # Production settings
├── .env.test            # Test settings
└── .env.local           # Local overrides (gitignored)
```

Load the right file:

```javascript
// config.js
const path = require('path');
require('dotenv').config({
  path: path.resolve(process.cwd(), `.env.${process.env.NODE_ENV || 'development'}`)
});

// Or use dotenv-expand for variable expansion
const dotenvExpand = require('dotenv-expand');
dotenvExpand.expand(require('dotenv').config());
```

## Cross-Platform with cross-env

Handle environment variables across different operating systems:

```bash
npm install --save-dev cross-env
```

```json
{
  "scripts": {
    "start": "cross-env NODE_ENV=production node server.js",
    "dev": "cross-env NODE_ENV=development nodemon server.js",
    "test": "cross-env NODE_ENV=test jest"
  }
}
```

## Validation and Type Safety

### Basic Validation

```javascript
// config.js
function getEnvVar(name, defaultValue) {
  const value = process.env[name];
  
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`Environment variable ${name} is required`);
  }
  
  return value || defaultValue;
}

const config = {
  port: parseInt(getEnvVar('PORT', '3000'), 10),
  nodeEnv: getEnvVar('NODE_ENV', 'development'),
  databaseUrl: getEnvVar('DATABASE_URL'),  // Required
  apiKey: getEnvVar('API_KEY'),            // Required
  debug: getEnvVar('DEBUG', 'false') === 'true',
};

module.exports = config;
```

### Using envalid

```bash
npm install envalid
```

```javascript
// config.js
const { cleanEnv, str, port, bool, url } = require('envalid');

const env = cleanEnv(process.env, {
  PORT: port({ default: 3000 }),
  NODE_ENV: str({ 
    choices: ['development', 'test', 'production'],
    default: 'development',
  }),
  DATABASE_URL: url(),
  API_KEY: str(),
  DEBUG: bool({ default: false }),
  REDIS_URL: url({ default: 'redis://localhost:6379' }),
});

module.exports = {
  port: env.PORT,
  nodeEnv: env.NODE_ENV,
  databaseUrl: env.DATABASE_URL,
  apiKey: env.API_KEY,
  debug: env.DEBUG,
  isProduction: env.isProduction,  // Built-in helper
  isDevelopment: env.isDevelopment,
};
```

### Using Zod

```bash
npm install zod
```

```javascript
// config.js
const { z } = require('zod');

const envSchema = z.object({
  PORT: z.string().transform(Number).default('3000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  API_KEY: z.string().min(1),
  DEBUG: z.string().transform(v => v === 'true').default('false'),
});

const env = envSchema.parse(process.env);

module.exports = env;
```

## TypeScript Support

### Type Declaration

```typescript
// env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    PORT: string;
    NODE_ENV: 'development' | 'test' | 'production';
    DATABASE_URL: string;
    API_KEY: string;
    DEBUG?: string;
  }
}
```

### With Validation

```typescript
// config.ts
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().transform(Number),
  NODE_ENV: z.enum(['development', 'test', 'production']),
  DATABASE_URL: z.string().url(),
  API_KEY: z.string(),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
```

## Secure Handling

### Never Commit .env Files

```gitignore
# .gitignore
.env
.env.local
.env.*.local
.env.production
```

### Provide a Template

```bash
# .env.example (commit this)
PORT=3000
NODE_ENV=development
DATABASE_URL=mongodb://localhost:27017/myapp
API_KEY=your-api-key-here
```

### Mask Sensitive Logs

```javascript
// Don't log sensitive values
const maskedConfig = {
  ...config,
  apiKey: config.apiKey ? '****' : 'NOT SET',
  databaseUrl: config.databaseUrl.replace(/\/\/(.+):(.+)@/, '//***:***@'),
};

console.log('Configuration:', maskedConfig);
```

## Configuration Module Pattern

Create a centralized configuration:

```javascript
// config/index.js
require('dotenv').config();

const config = {
  env: process.env.NODE_ENV || 'development',
  
  server: {
    port: parseInt(process.env.PORT, 10) || 3000,
    host: process.env.HOST || 'localhost',
  },
  
  database: {
    url: process.env.DATABASE_URL,
    poolSize: parseInt(process.env.DB_POOL_SIZE, 10) || 10,
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  
  auth: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  
  services: {
    stripeKey: process.env.STRIPE_KEY,
    sendgridKey: process.env.SENDGRID_API_KEY,
  },
  
  features: {
    enableNewUI: process.env.ENABLE_NEW_UI === 'true',
    maxUploadSize: parseInt(process.env.MAX_UPLOAD_SIZE, 10) || 10485760,
  },
};

// Validate required variables
const required = [
  'DATABASE_URL',
  'JWT_SECRET',
];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

module.exports = config;
```

Usage:

```javascript
// server.js
const config = require('./config');

app.listen(config.server.port, () => {
  console.log(`Server running on port ${config.server.port}`);
});

// database.js
const { database } = require('./config');
mongoose.connect(database.url);
```

## Runtime Environment Modification

```javascript
// Modify environment at runtime (affects child processes)
process.env.NEW_VAR = 'value';

// Delete an environment variable
delete process.env.OLD_VAR;

// Check if variable exists
if (process.env.FEATURE_FLAG !== undefined) {
  enableFeature();
}

// Get all environment variables
console.log(Object.keys(process.env));
```

## CI/CD and Cloud Platforms

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      NODE_ENV: production
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
        env:
          API_KEY: ${{ secrets.API_KEY }}
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

### Docker

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm ci --production

# Set at runtime, not build time
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
# Run with environment variables
docker run -e PORT=3000 -e API_KEY=secret myapp

# Use env file
docker run --env-file .env.production myapp
```

### Docker Compose

```yaml
# docker-compose.yml
services:
  app:
    build: .
    environment:
      - NODE_ENV=production
      - PORT=3000
    env_file:
      - .env.production
```

### Kubernetes

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
spec:
  template:
    spec:
      containers:
        - name: app
          env:
            - name: NODE_ENV
              value: "production"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: database-url
```

## Summary

| Method | Use Case |
|--------|----------|
| Shell export | Quick testing, single session |
| `.env` + dotenv | Local development |
| cross-env | npm scripts (cross-platform) |
| envalid/zod | Validation and type safety |
| Docker env | Container deployment |
| K8s secrets | Production secrets |

Best practices:
- Never commit `.env` files with secrets
- Always validate and provide defaults
- Use TypeScript types for IntelliSense
- Centralize configuration in one module
- Mask sensitive values in logs
- Use environment-specific files for different stages
