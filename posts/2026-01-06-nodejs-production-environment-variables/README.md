# How to Configure Node.js for Production with Environment Variables

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, DevOps, Configuration, Security, Kubernetes

Description: Learn best practices for managing Node.js environment variables in production, including dotenv patterns, validation, secret management, and secure configuration loading.

---

Environment variables are the standard way to configure Node.js applications across different environments. But using them incorrectly leads to security vulnerabilities, runtime crashes from missing config, and debugging nightmares. This guide covers patterns for robust, secure environment variable management.

## The Twelve-Factor App Approach

Configuration that varies between deploys should be stored in environment variables:

| Configuration Type | Environment Variable? | Example |
|-------------------|----------------------|---------|
| Database URL | Yes | `DATABASE_URL` |
| API keys | Yes | `STRIPE_SECRET_KEY` |
| Feature flags | Yes | `ENABLE_NEW_FEATURE` |
| Port number | Yes | `PORT` |
| App code | No | Business logic |
| Dependencies | No | package.json |

## Basic dotenv Setup

```bash
npm install dotenv
```

```javascript
// Load at application start (before any other imports)
require('dotenv').config();

// Or with ES modules
import 'dotenv/config';
```

**.env file:**

```bash
# .env (DO NOT COMMIT)
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://localhost/myapp
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-in-production
```

**.env.example:**

```bash
# .env.example (COMMIT THIS)
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@host:5432/database
REDIS_URL=redis://host:6379
JWT_SECRET=your-secret-here
```

## Configuration Validation

Never trust that environment variables exist or are valid:

```javascript
// config/index.js
const Joi = require('joi');

const envSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
    .default('development'),

  PORT: Joi.number()
    .default(3000),

  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),

  REDIS_URL: Joi.string()
    .uri({ scheme: 'redis' })
    .required(),

  JWT_SECRET: Joi.string()
    .min(32)
    .required(),

  JWT_EXPIRES_IN: Joi.string()
    .default('15m'),

  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug')
    .default('info'),

  CORS_ORIGINS: Joi.string()
    .default('http://localhost:3000'),

  RATE_LIMIT_MAX: Joi.number()
    .default(100),

  RATE_LIMIT_WINDOW_MS: Joi.number()
    .default(60000),
}).unknown(); // Allow other env vars

const { error, value: env } = envSchema.validate(process.env, {
  abortEarly: false,
});

if (error) {
  const messages = error.details.map(d => d.message).join('\n');
  throw new Error(`Config validation error:\n${messages}`);
}

module.exports = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  database: {
    url: env.DATABASE_URL,
  },
  redis: {
    url: env.REDIS_URL,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
  cors: {
    origins: env.CORS_ORIGINS.split(','),
  },
  rateLimit: {
    max: env.RATE_LIMIT_MAX,
    windowMs: env.RATE_LIMIT_WINDOW_MS,
  },
  isDevelopment: env.NODE_ENV === 'development',
  isProduction: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
};
```

## Type-Safe Configuration with TypeScript

```typescript
// config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const env = validateEnv();

// Type-safe access
// env.PORT is number
// env.NODE_ENV is 'development' | 'staging' | 'production' | 'test'
```

## Environment-Specific Configuration

```javascript
// config/index.js
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV || 'development'}`,
});

// Merge with defaults
const defaults = {
  port: 3000,
  logLevel: 'info',
};

const development = {
  ...defaults,
  logLevel: 'debug',
  database: {
    ssl: false,
  },
};

const production = {
  ...defaults,
  database: {
    ssl: true,
    poolSize: 20,
  },
};

const configs = {
  development,
  staging: production,
  production,
  test: development,
};

module.exports = configs[process.env.NODE_ENV || 'development'];
```

## Secrets Management

### Never Commit Secrets

```gitignore
# .gitignore
.env
.env.local
.env.*.local
*.pem
*.key
secrets/
```

### Use Secret Managers in Production

**AWS Secrets Manager:**

```javascript
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

async function loadSecrets() {
  const client = new SecretsManagerClient({ region: process.env.AWS_REGION });

  const command = new GetSecretValueCommand({
    SecretId: process.env.SECRET_NAME,
  });

  const response = await client.send(command);
  const secrets = JSON.parse(response.SecretString);

  // Inject into process.env
  Object.assign(process.env, secrets);
}

// Load secrets before starting app
loadSecrets().then(() => {
  require('./app');
});
```

**HashiCorp Vault:**

```javascript
const vault = require('node-vault')({
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN,
});

async function loadSecrets() {
  const result = await vault.read('secret/data/myapp');
  const secrets = result.data.data;

  process.env.DATABASE_URL = secrets.database_url;
  process.env.JWT_SECRET = secrets.jwt_secret;
}
```

### Kubernetes Secrets

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
        - name: app
          image: my-app:latest
          env:
            # Direct value (for non-secrets)
            - name: NODE_ENV
              value: production
            - name: PORT
              value: "3000"

            # From ConfigMap
            - name: LOG_LEVEL
              valueFrom:
                configMapKeyRef:
                  name: app-config
                  key: log_level

            # From Secret
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: database_url

            - name: JWT_SECRET
              valueFrom:
                secretKeyRef:
                  name: app-secrets
                  key: jwt_secret

          # Or mount all from ConfigMap/Secret
          envFrom:
            - configMapRef:
                name: app-config
            - secretRef:
                name: app-secrets
```

## Required vs Optional Variables

```javascript
class Config {
  constructor() {
    // Required - fail fast if missing
    this.databaseUrl = this.required('DATABASE_URL');
    this.jwtSecret = this.required('JWT_SECRET');

    // Optional with defaults
    this.port = this.optional('PORT', 3000);
    this.logLevel = this.optional('LOG_LEVEL', 'info');

    // Optional with no default
    this.sentryDsn = this.optional('SENTRY_DSN');
  }

  required(name) {
    const value = process.env[name];
    if (!value) {
      throw new Error(`Required environment variable ${name} is not set`);
    }
    return value;
  }

  optional(name, defaultValue = undefined) {
    return process.env[name] || defaultValue;
  }

  // Parse specific types
  requiredInt(name) {
    const value = parseInt(this.required(name), 10);
    if (isNaN(value)) {
      throw new Error(`Environment variable ${name} must be a number`);
    }
    return value;
  }

  optionalBool(name, defaultValue = false) {
    const value = process.env[name];
    if (!value) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
  }

  optionalArray(name, defaultValue = []) {
    const value = process.env[name];
    if (!value) return defaultValue;
    return value.split(',').map(s => s.trim());
  }
}

module.exports = new Config();
```

## Feature Flags via Environment

```javascript
// config/features.js
const features = {
  newDashboard: process.env.FEATURE_NEW_DASHBOARD === 'true',
  betaApi: process.env.FEATURE_BETA_API === 'true',
  experimentalAuth: process.env.FEATURE_EXPERIMENTAL_AUTH === 'true',
};

function isFeatureEnabled(featureName) {
  return features[featureName] || false;
}

module.exports = { features, isFeatureEnabled };

// Usage
const { isFeatureEnabled } = require('./config/features');

app.get('/dashboard', (req, res) => {
  if (isFeatureEnabled('newDashboard')) {
    return res.render('dashboard-v2');
  }
  return res.render('dashboard');
});
```

## Debugging Configuration Issues

```javascript
// Debug helper - NEVER use in production
function debugConfig() {
  if (process.env.NODE_ENV === 'production') {
    console.warn('debugConfig should not be called in production');
    return;
  }

  const sensitiveKeys = ['SECRET', 'PASSWORD', 'KEY', 'TOKEN'];

  const safeEnv = Object.entries(process.env)
    .filter(([key]) => !key.startsWith('npm_'))
    .map(([key, value]) => {
      const isSensitive = sensitiveKeys.some(s => key.includes(s));
      return [key, isSensitive ? '[REDACTED]' : value];
    })
    .sort(([a], [b]) => a.localeCompare(b));

  console.table(Object.fromEntries(safeEnv));
}

// Usage
if (process.env.DEBUG_CONFIG) {
  debugConfig();
}
```

## Startup Validation Script

```javascript
#!/usr/bin/env node
// scripts/validate-env.js

require('dotenv').config();

const required = [
  'DATABASE_URL',
  'REDIS_URL',
  'JWT_SECRET',
];

const missing = required.filter(key => !process.env[key]);

if (missing.length > 0) {
  console.error('Missing required environment variables:');
  missing.forEach(key => console.error(`  - ${key}`));
  process.exit(1);
}

// Validate formats
const urlVars = ['DATABASE_URL', 'REDIS_URL'];
urlVars.forEach(key => {
  try {
    new URL(process.env[key]);
  } catch {
    console.error(`Invalid URL format for ${key}`);
    process.exit(1);
  }
});

console.log('Environment configuration is valid');
```

```json
// package.json
{
  "scripts": {
    "prestart": "node scripts/validate-env.js",
    "start": "node dist/index.js"
  }
}
```

## Summary

| Practice | Benefit |
|----------|---------|
| **Validate at startup** | Fail fast with clear errors |
| **Use schema validation** | Type safety, documentation |
| **Never commit secrets** | Security |
| **Use secret managers** | Rotation, audit, access control |
| **Provide defaults** | Better DX, fewer failures |
| **Type coercion** | Correct types (number, boolean) |
| **Environment-specific files** | Clean separation |

Proper environment variable management prevents configuration-related outages and security incidents. Validate early, fail fast, and never trust that configuration exists or is correctly formatted.
