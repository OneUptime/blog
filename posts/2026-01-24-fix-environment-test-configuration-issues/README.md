# How to Fix "Environment" Test Configuration Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Testing, Environment Variables, Configuration, CI/CD, DevOps, Test Automation, Node.js, Docker

Description: Learn how to solve common environment configuration problems in test suites including variable management, secrets handling, and environment isolation.

---

Environment configuration issues are responsible for a huge number of "works on my machine" problems. Tests pass locally but fail in CI, or fail on one developer's machine but pass on another. This guide covers practical solutions to environment configuration problems in testing.

## Common Environment Issues

These problems show up repeatedly across projects:

- Tests use production API keys by accident
- Environment variables are missing in CI
- Different behavior between local and CI environments
- Secrets leak into test outputs or logs
- Configuration files conflict between environments
- Database connection strings point to wrong instances

## Environment Configuration Flow

Understanding how configuration flows through your test environment:

```mermaid
flowchart TB
    A[Environment Variables] --> D[Configuration Loader]
    B[.env Files] --> D
    C[CI/CD Secrets] --> D

    D --> E{Validate Config}
    E -->|Valid| F[Application]
    E -->|Invalid| G[Fail Fast with Clear Error]

    F --> H[Unit Tests]
    F --> I[Integration Tests]
    F --> J[E2E Tests]

    classDef node fill:#111827,stroke:#4B5563,color:#E5E7EB
    class A,B,C,D,E,F,G,H,I,J node
```

## Strategy 1: Centralized Configuration

Create a single source of truth for configuration:

```typescript
// src/config/index.ts
import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment-specific .env file
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: envFile });

// Define schema for configuration validation
const configSchema = z.object({
  // Environment
  nodeEnv: z.enum(['development', 'test', 'production']),

  // Server
  port: z.coerce.number().default(3000),
  host: z.string().default('localhost'),

  // Database
  databaseUrl: z.string().url(),
  databasePoolSize: z.coerce.number().default(10),

  // External Services
  stripeApiKey: z.string().min(1),
  sendgridApiKey: z.string().min(1),

  // Feature Flags
  enableNewFeature: z.coerce.boolean().default(false),
});

// Parse and validate configuration
function loadConfig() {
  const result = configSchema.safeParse({
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT,
    host: process.env.HOST,
    databaseUrl: process.env.DATABASE_URL,
    databasePoolSize: process.env.DATABASE_POOL_SIZE,
    stripeApiKey: process.env.STRIPE_API_KEY,
    sendgridApiKey: process.env.SENDGRID_API_KEY,
    enableNewFeature: process.env.ENABLE_NEW_FEATURE,
  });

  if (!result.success) {
    console.error('Configuration validation failed:');
    console.error(result.error.format());
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();
export type Config = z.infer<typeof configSchema>;
```

## Strategy 2: Environment-Specific Files

Organize environment files clearly:

```
project/
├── .env                    # Local development (gitignored)
├── .env.example            # Template with dummy values (committed)
├── .env.test               # Test environment (committed)
├── .env.test.local         # Local test overrides (gitignored)
└── .env.ci                 # CI-specific config (committed, no secrets)
```

Example `.env.example`:

```bash
# .env.example
# Copy this file to .env and fill in real values

# Server Configuration
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/myapp_dev

# External Services (get keys from team lead)
STRIPE_API_KEY=sk_test_xxxx
SENDGRID_API_KEY=SG.xxxx

# Feature Flags
ENABLE_NEW_FEATURE=false
```

Example `.env.test`:

```bash
# .env.test
# Test environment configuration - safe to commit

NODE_ENV=test
PORT=3001

# Use test database
DATABASE_URL=postgresql://test:test@localhost:5432/myapp_test

# Use test/mock API keys
STRIPE_API_KEY=sk_test_fake_key_for_testing
SENDGRID_API_KEY=SG.fake_key_for_testing

# Disable external service calls in tests
MOCK_EXTERNAL_SERVICES=true
```

## Strategy 3: Test Configuration Override

Allow tests to override configuration:

```typescript
// test/helpers/config.ts
import { Config } from '../../src/config';

// Default test configuration overrides
const testDefaults: Partial<Config> = {
  nodeEnv: 'test',
  databaseUrl: process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/myapp_test',
  // Disable rate limiting in tests
  enableRateLimiting: false,
  // Use shorter timeouts
  requestTimeout: 5000,
};

export function getTestConfig(overrides: Partial<Config> = {}): Config {
  return {
    ...require('../../src/config').config,
    ...testDefaults,
    ...overrides,
  };
}

// Helper to run test with specific config
export function withConfig(overrides: Partial<Config>) {
  const originalEnv = { ...process.env };

  return {
    setup() {
      Object.entries(overrides).forEach(([key, value]) => {
        const envKey = key.replace(/([A-Z])/g, '_$1').toUpperCase();
        process.env[envKey] = String(value);
      });
    },

    teardown() {
      process.env = originalEnv;
    },
  };
}
```

Using configuration overrides in tests:

```typescript
// test/services/payment.test.ts
import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { withConfig } from '../helpers/config';

describe('Payment Service', () => {
  describe('with Stripe enabled', () => {
    const configOverride = withConfig({
      stripeApiKey: 'sk_test_specific_key',
      enableStripeWebhooks: true,
    });

    beforeEach(() => configOverride.setup());
    afterEach(() => configOverride.teardown());

    it('should process payment', async () => {
      // Test uses the overridden config
    });
  });

  describe('with Stripe disabled', () => {
    const configOverride = withConfig({
      enableStripeWebhooks: false,
    });

    beforeEach(() => configOverride.setup());
    afterEach(() => configOverride.teardown());

    it('should skip webhook verification', async () => {
      // Test uses different config
    });
  });
});
```

## Strategy 4: CI/CD Configuration

Set up environment variables properly in CI:

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

env:
  # Non-sensitive defaults for all jobs
  NODE_ENV: test
  CI: true

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit
        env:
          # Unit tests should not need external services
          MOCK_EXTERNAL_SERVICES: 'true'

  integration-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: myapp_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        ports:
          - 6379:6379

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run migrations
        run: npm run db:migrate
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/myapp_test

      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/myapp_test
          REDIS_URL: redis://localhost:6379
          # Use GitHub Secrets for sensitive values
          STRIPE_API_KEY: ${{ secrets.STRIPE_TEST_API_KEY }}
          SENDGRID_API_KEY: ${{ secrets.SENDGRID_TEST_API_KEY }}
```

## Strategy 5: Docker-Based Test Environments

Use Docker Compose for consistent environments:

```yaml
# docker-compose.test.yml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      target: test
    environment:
      NODE_ENV: test
      DATABASE_URL: postgresql://test:test@postgres:5432/myapp_test
      REDIS_URL: redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run test

  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: myapp_test
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test"]
      interval: 5s
      timeout: 5s
      retries: 5
    # Use tmpfs for faster tests
    tmpfs:
      - /var/lib/postgresql/data

  redis:
    image: redis:7
```

Run tests with Docker:

```bash
# Run all tests
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit

# Run specific test file
docker-compose -f docker-compose.test.yml run app npm test -- --filter "user.test.ts"
```

## Strategy 6: Environment Validation on Startup

Fail fast if configuration is invalid:

```typescript
// src/config/validate.ts
import { config, Config } from './index';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  if (!config.databaseUrl) {
    errors.push('DATABASE_URL is required');
  }

  // Check for production mistakes
  if (config.nodeEnv === 'production') {
    if (config.databaseUrl.includes('localhost')) {
      errors.push('DATABASE_URL cannot point to localhost in production');
    }

    if (config.stripeApiKey.startsWith('sk_test_')) {
      warnings.push('Using Stripe test key in production');
    }
  }

  // Check for test environment mistakes
  if (config.nodeEnv === 'test') {
    if (config.databaseUrl.includes('_prod')) {
      errors.push('Test environment should not use production database');
    }

    if (!config.databaseUrl.includes('_test')) {
      warnings.push('Database name should contain "_test" for test environment');
    }
  }

  // Verify connectivity (async, call separately)
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// Call on application startup
export function assertValidEnvironment(): void {
  const result = validateEnvironment();

  if (result.warnings.length > 0) {
    console.warn('Environment warnings:');
    result.warnings.forEach(w => console.warn(`  - ${w}`));
  }

  if (!result.valid) {
    console.error('Environment validation failed:');
    result.errors.forEach(e => console.error(`  - ${e}`));
    process.exit(1);
  }
}
```

## Debugging Environment Issues

When tests fail due to environment problems:

```typescript
// test/helpers/debug.ts
export function debugEnvironment() {
  console.log('=== Environment Debug ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('Working directory:', process.cwd());

  // List loaded .env files
  const dotenvFiles = ['.env', '.env.test', '.env.local', '.env.test.local'];
  const fs = require('fs');

  dotenvFiles.forEach(file => {
    console.log(`${file}: ${fs.existsSync(file) ? 'exists' : 'missing'}`);
  });

  // Show relevant env vars (mask sensitive values)
  const relevantVars = ['DATABASE_URL', 'REDIS_URL', 'PORT', 'NODE_ENV'];
  relevantVars.forEach(name => {
    const value = process.env[name];
    if (value) {
      // Mask passwords and keys
      const masked = value.replace(/:[^@]+@/, ':****@').replace(/key_[a-zA-Z0-9]+/, 'key_****');
      console.log(`${name}: ${masked}`);
    } else {
      console.log(`${name}: undefined`);
    }
  });

  console.log('========================');
}
```

## Best Practices

1. **Never commit secrets** - Use .gitignore for .env files with real credentials
2. **Validate early** - Check configuration on startup, not when first used
3. **Use typed configuration** - Zod or similar for validation and type safety
4. **Provide examples** - Maintain .env.example with all required variables
5. **Isolate test databases** - Never let tests touch production or staging data
6. **Mock external services** - Don't call real APIs in unit tests
7. **Document requirements** - README should explain required environment setup
8. **Use CI secrets** - Store sensitive values in your CI platform's secret storage

## Common Pitfalls

- Loading .env in production (use actual environment variables)
- Forgetting to add new variables to .env.example
- Hardcoding values that should be configurable
- Using same database for development and testing
- Not handling missing optional variables gracefully
- Logging sensitive configuration values

Environment configuration problems are frustrating but solvable. The key is establishing clear patterns early, validating configuration before tests run, and keeping test environments completely isolated from production. When configuration is handled correctly, "works on my machine" becomes a thing of the past.
