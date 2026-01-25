# How to Use dotenv for Configuration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, Configuration, Environment Variables, Security, Best Practices

Description: Manage environment variables in Node.js applications using dotenv for configuration, with proper validation, type coercion, and secure practices for different environments.

---

Hard-coding configuration values like API keys, database credentials, and feature flags directly in your code is a security risk and makes deployment painful. The dotenv package loads configuration from a `.env` file into `process.env`, keeping secrets out of your codebase.

## Basic Setup

Install dotenv:

```bash
npm install dotenv
```

Create a `.env` file in your project root:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
DATABASE_POOL_SIZE=10

# API Keys
STRIPE_SECRET_KEY=sk_test_abc123
SENDGRID_API_KEY=SG.xyz789

# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug

# Feature Flags
ENABLE_NEW_FEATURE=true
```

Load it at the very beginning of your application:

```javascript
// Load dotenv before anything else
require('dotenv').config();

// Now process.env contains your variables
console.log(process.env.PORT);  // "3000"
console.log(process.env.DATABASE_URL);  // "postgresql://..."
```

For ES modules:

```javascript
import 'dotenv/config';

// Or with explicit loading
import dotenv from 'dotenv';
dotenv.config();
```

## Configuration Module Pattern

Do not scatter `process.env` throughout your code. Create a configuration module:

```javascript
// src/config.js
require('dotenv').config();

const config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),

    database: {
        url: process.env.DATABASE_URL,
        poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10)
    },

    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY
    },

    email: {
        apiKey: process.env.SENDGRID_API_KEY,
        from: process.env.EMAIL_FROM || 'noreply@example.com'
    },

    features: {
        newFeature: process.env.ENABLE_NEW_FEATURE === 'true'
    },

    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development'
};

module.exports = config;

// Usage in other files
const config = require('./config');

console.log(config.port);
console.log(config.database.url);
```

## Validation with Required Variables

Fail fast if required configuration is missing:

```javascript
// src/config.js
require('dotenv').config();

function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

function getEnv(name, defaultValue) {
    return process.env[name] || defaultValue;
}

function getEnvInt(name, defaultValue) {
    const value = process.env[name];
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
        throw new Error(`Environment variable ${name} must be an integer`);
    }
    return parsed;
}

function getEnvBool(name, defaultValue = false) {
    const value = process.env[name];
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
}

const config = {
    env: getEnv('NODE_ENV', 'development'),
    port: getEnvInt('PORT', 3000),

    database: {
        url: requireEnv('DATABASE_URL'),  // Will throw if missing
        poolSize: getEnvInt('DATABASE_POOL_SIZE', 10)
    },

    jwt: {
        secret: requireEnv('JWT_SECRET'),
        expiresIn: getEnv('JWT_EXPIRES_IN', '7d')
    },

    features: {
        newFeature: getEnvBool('ENABLE_NEW_FEATURE', false)
    }
};

module.exports = config;
```

## Using Joi or Zod for Validation

For complex validation, use a schema validation library:

```bash
npm install joi
```

```javascript
// src/config.js
require('dotenv').config();
const Joi = require('joi');

const envSchema = Joi.object({
    NODE_ENV: Joi.string()
        .valid('development', 'production', 'test')
        .default('development'),
    PORT: Joi.number().default(3000),
    DATABASE_URL: Joi.string().uri().required(),
    JWT_SECRET: Joi.string().min(32).required(),
    JWT_EXPIRES_IN: Joi.string().default('7d'),
    REDIS_URL: Joi.string().uri().optional(),
    LOG_LEVEL: Joi.string()
        .valid('error', 'warn', 'info', 'debug')
        .default('info'),
    ENABLE_CORS: Joi.boolean().default(true)
}).unknown();  // Allow other env vars

const { error, value: envVars } = envSchema.validate(process.env);

if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

const config = {
    env: envVars.NODE_ENV,
    port: envVars.PORT,
    database: {
        url: envVars.DATABASE_URL
    },
    jwt: {
        secret: envVars.JWT_SECRET,
        expiresIn: envVars.JWT_EXPIRES_IN
    },
    redis: {
        url: envVars.REDIS_URL
    },
    logLevel: envVars.LOG_LEVEL,
    enableCors: envVars.ENABLE_CORS
};

module.exports = config;
```

Or with Zod (TypeScript-friendly):

```bash
npm install zod
```

```javascript
// src/config.js
require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).default('3000'),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    ENABLE_NEW_FEATURE: z.string()
        .transform(val => val === 'true')
        .default('false')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error('Invalid environment variables:', parsed.error.format());
    process.exit(1);
}

module.exports = parsed.data;
```

## Multiple Environment Files

Use different files for different environments:

```
.env                # Default/shared settings
.env.local          # Local overrides (gitignored)
.env.development    # Development-specific
.env.production     # Production-specific
.env.test           # Test-specific
```

Load based on environment:

```javascript
const dotenv = require('dotenv');
const path = require('path');

// Load in order: .env, .env.local, .env.{NODE_ENV}
const envFiles = [
    '.env',
    '.env.local',
    `.env.${process.env.NODE_ENV || 'development'}`
];

envFiles.forEach(file => {
    dotenv.config({
        path: path.resolve(process.cwd(), file),
        override: true  // Later files override earlier ones
    });
});
```

Or use dotenv-flow:

```bash
npm install dotenv-flow
```

```javascript
require('dotenv-flow').config();
```

## Git and Security

Never commit `.env` files with secrets. Add to `.gitignore`:

```gitignore
# Environment files
.env
.env.local
.env.*.local
.env.production
.env.staging

# Keep example file
!.env.example
```

Create `.env.example` as a template:

```env
# Copy this file to .env and fill in the values

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# Authentication
JWT_SECRET=your-secret-key-at-least-32-characters

# Third-party APIs
STRIPE_SECRET_KEY=sk_test_...
SENDGRID_API_KEY=SG....

# Application
NODE_ENV=development
PORT=3000
```

## TypeScript Support

Add types for your environment:

```typescript
// src/env.d.ts
declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: 'development' | 'production' | 'test';
            PORT: string;
            DATABASE_URL: string;
            JWT_SECRET: string;
            STRIPE_SECRET_KEY?: string;
        }
    }
}

export {};
```

```typescript
// src/config.ts
import 'dotenv/config';

interface Config {
    env: 'development' | 'production' | 'test';
    port: number;
    database: {
        url: string;
    };
    jwt: {
        secret: string;
    };
}

const config: Config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    database: {
        url: process.env.DATABASE_URL!
    },
    jwt: {
        secret: process.env.JWT_SECRET!
    }
};

export default config;
```

## Docker and Containers

Pass environment variables to Docker containers:

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .

# Do not copy .env - pass at runtime
CMD ["node", "src/index.js"]
```

```yaml
# docker-compose.yml
services:
  app:
    build: .
    env_file:
      - .env.production
    # Or individual variables
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=${DATABASE_URL}
```

Run with environment file:

```bash
docker run --env-file .env.production my-app
```

## Production Best Practices

In production, do not use `.env` files. Use proper secret management:

```javascript
// src/config.js
const isProduction = process.env.NODE_ENV === 'production';

// Only load dotenv in development
if (!isProduction) {
    require('dotenv').config();
}

// In production, env vars come from:
// - Container orchestration (Kubernetes secrets)
// - Cloud provider (AWS Parameter Store, Azure Key Vault)
// - CI/CD pipeline

module.exports = {
    // ... config
};
```

## Summary

dotenv keeps configuration separate from code. Load it at application startup, validate all required variables, use typed configuration objects, never commit secrets to git, and keep an `.env.example` file for documentation. In production, use proper secret management instead of `.env` files.
