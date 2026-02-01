# How to Use Environment Variables in Bun

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Bun, JavaScript, Environment Variables, Configuration

Description: Learn how to effectively manage environment variables in Bun applications, including .env files, type safety, secrets management, and production best practices.

---

Environment variables are a fundamental part of modern application development. They allow you to separate configuration from code, manage secrets securely, and deploy the same application across different environments without code changes. Bun, the fast JavaScript runtime, provides excellent built-in support for environment variables with some unique features that make working with them a breeze.

In this guide, we will explore everything you need to know about using environment variables in Bun, from basic usage to advanced patterns for production applications.

## Understanding Bun.env

Bun provides a built-in `Bun.env` object that gives you access to all environment variables in your application. Unlike Node.js where you use `process.env`, Bun offers `Bun.env` as a more performant and type-safe alternative.

Here is a basic example of accessing environment variables in Bun:

```typescript
// Access environment variables using Bun.env
const databaseUrl = Bun.env.DATABASE_URL;
const apiKey = Bun.env.API_KEY;
const nodeEnv = Bun.env.NODE_ENV;

console.log(`Database URL: ${databaseUrl}`);
console.log(`API Key: ${apiKey}`);
console.log(`Environment: ${nodeEnv}`);
```

Bun also supports the traditional `process.env` for compatibility with existing Node.js code:

```typescript
// Node.js compatible way - also works in Bun
const port = process.env.PORT;
const host = process.env.HOST;

console.log(`Server will run on ${host}:${port}`);
```

The key difference is that `Bun.env` is slightly faster since it does not need to go through the Node.js compatibility layer.

## Working with .env Files

One of the most convenient features of Bun is its automatic loading of `.env` files. Unlike Node.js, where you need to install and configure packages like `dotenv`, Bun handles this natively.

### Basic .env File

Create a `.env` file in your project root:

```bash
# .env - Main environment configuration file
# Database configuration
DATABASE_URL=postgresql://localhost:5432/myapp
DATABASE_POOL_SIZE=10

# API configuration
API_KEY=your-secret-api-key-here
API_BASE_URL=https://api.example.com

# Application settings
PORT=3000
HOST=localhost
NODE_ENV=development
```

Bun automatically loads this file when your application starts:

```typescript
// No import needed - Bun loads .env automatically
// src/config.ts

console.log(Bun.env.DATABASE_URL);
// Output: postgresql://localhost:5432/myapp

console.log(Bun.env.PORT);
// Output: 3000
```

### Environment-Specific Files

Bun supports multiple `.env` files with a specific loading order, allowing you to manage different configurations for development, testing, and production environments.

Here is the loading order Bun follows (later files override earlier ones):

1. `.env` - Base configuration
2. `.env.local` - Local overrides (not committed to git)
3. `.env.development` or `.env.production` - Environment-specific settings
4. `.env.development.local` or `.env.production.local` - Local environment-specific overrides

Create a `.env.local` file for local development secrets:

```bash
# .env.local - Local overrides (add to .gitignore)
# Override database for local development
DATABASE_URL=postgresql://localhost:5432/myapp_dev

# Local API key for testing
API_KEY=local-development-key-12345

# Enable debug mode locally
DEBUG=true
```

Create environment-specific configuration files:

```bash
# .env.development - Development environment settings
NODE_ENV=development
LOG_LEVEL=debug
ENABLE_HOT_RELOAD=true
API_BASE_URL=https://dev-api.example.com
```

```bash
# .env.production - Production environment settings
NODE_ENV=production
LOG_LEVEL=warn
ENABLE_HOT_RELOAD=false
API_BASE_URL=https://api.example.com
```

Set the environment when running your application:

```typescript
// src/server.ts
// Bun will load the appropriate .env file based on NODE_ENV

const env = Bun.env.NODE_ENV || "development";
const logLevel = Bun.env.LOG_LEVEL || "info";

console.log(`Running in ${env} mode with log level: ${logLevel}`);
```

## Type Safety with Environment Variables

TypeScript developers will appreciate the ability to add type safety to environment variables. This prevents runtime errors and provides better IDE support.

### Creating a Typed Configuration

Define a configuration module that validates and exports typed environment variables:

```typescript
// src/env.ts
// Centralized environment variable configuration with type safety

interface EnvConfig {
  // Database settings
  DATABASE_URL: string;
  DATABASE_POOL_SIZE: number;
  
  // API settings
  API_KEY: string;
  API_BASE_URL: string;
  
  // Server settings
  PORT: number;
  HOST: string;
  NODE_ENV: "development" | "production" | "test";
  
  // Feature flags
  ENABLE_CACHE: boolean;
  DEBUG: boolean;
}

// Helper function to get required environment variables
function getRequiredEnv(key: string): string {
  const value = Bun.env[key];
  if (value === undefined || value === "") {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Helper function to get optional environment variables with defaults
function getOptionalEnv(key: string, defaultValue: string): string {
  return Bun.env[key] || defaultValue;
}

// Helper function to parse boolean environment variables
function getBooleanEnv(key: string, defaultValue: boolean): boolean {
  const value = Bun.env[key];
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === "true" || value === "1";
}

// Helper function to parse numeric environment variables
function getNumericEnv(key: string, defaultValue: number): number {
  const value = Bun.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a number`);
  }
  return parsed;
}

// Export typed configuration object
export const env: EnvConfig = {
  DATABASE_URL: getRequiredEnv("DATABASE_URL"),
  DATABASE_POOL_SIZE: getNumericEnv("DATABASE_POOL_SIZE", 10),
  
  API_KEY: getRequiredEnv("API_KEY"),
  API_BASE_URL: getRequiredEnv("API_BASE_URL"),
  
  PORT: getNumericEnv("PORT", 3000),
  HOST: getOptionalEnv("HOST", "localhost"),
  NODE_ENV: getOptionalEnv("NODE_ENV", "development") as EnvConfig["NODE_ENV"],
  
  ENABLE_CACHE: getBooleanEnv("ENABLE_CACHE", true),
  DEBUG: getBooleanEnv("DEBUG", false),
};
```

Use the typed configuration throughout your application:

```typescript
// src/database.ts
// Using typed environment configuration for database setup

import { env } from "./env";

class DatabaseConnection {
  private connectionString: string;
  private poolSize: number;
  
  constructor() {
    // TypeScript knows these are the correct types
    this.connectionString = env.DATABASE_URL;
    this.poolSize = env.DATABASE_POOL_SIZE;
  }
  
  connect() {
    console.log(`Connecting to database with pool size: ${this.poolSize}`);
    // Connection logic here
  }
}

export const db = new DatabaseConnection();
```

## Handling Required Variables

Production applications need to ensure critical environment variables are present before starting. Here are several patterns for handling required variables.

### Validation at Startup

Create a validation function that runs when your application starts:

```typescript
// src/validateEnv.ts
// Validate all required environment variables at startup

interface RequiredEnvVars {
  name: string;
  description: string;
}

const requiredVariables: RequiredEnvVars[] = [
  { name: "DATABASE_URL", description: "PostgreSQL connection string" },
  { name: "API_KEY", description: "External API authentication key" },
  { name: "JWT_SECRET", description: "Secret for JWT token signing" },
  { name: "REDIS_URL", description: "Redis connection string for caching" },
];

export function validateEnvironment(): void {
  const missing: string[] = [];
  
  for (const variable of requiredVariables) {
    if (!Bun.env[variable.name]) {
      missing.push(`${variable.name} - ${variable.description}`);
    }
  }
  
  if (missing.length > 0) {
    console.error("Missing required environment variables:");
    missing.forEach((msg) => console.error(`  - ${msg}`));
    console.error("\nPlease set these variables in your .env file or environment.");
    process.exit(1);
  }
  
  console.log("All required environment variables are set.");
}
```

Call the validation function at application startup:

```typescript
// src/index.ts
// Main application entry point with environment validation

import { validateEnvironment } from "./validateEnv";
import { env } from "./env";

// Validate environment before doing anything else
validateEnvironment();

// Now safe to use environment variables
console.log(`Starting server on port ${env.PORT}`);

const server = Bun.serve({
  port: env.PORT,
  fetch(request) {
    return new Response("Hello from Bun!");
  },
});

console.log(`Server running at http://${env.HOST}:${env.PORT}`);
```

## Working with Default Values

Providing sensible defaults makes your application more resilient and easier to set up for new developers.

### Pattern for Default Values

Create a configuration module with well-documented defaults:

```typescript
// src/config.ts
// Application configuration with sensible defaults

export const config = {
  // Server configuration
  server: {
    port: parseInt(Bun.env.PORT || "3000", 10),
    host: Bun.env.HOST || "0.0.0.0",
    corsOrigin: Bun.env.CORS_ORIGIN || "*",
  },
  
  // Database configuration
  database: {
    url: Bun.env.DATABASE_URL || "postgresql://localhost:5432/default_db",
    poolSize: parseInt(Bun.env.DATABASE_POOL_SIZE || "5", 10),
    ssl: Bun.env.DATABASE_SSL === "true",
    connectionTimeout: parseInt(Bun.env.DATABASE_TIMEOUT || "30000", 10),
  },
  
  // Cache configuration
  cache: {
    enabled: Bun.env.CACHE_ENABLED !== "false",
    ttl: parseInt(Bun.env.CACHE_TTL || "3600", 10),
    redisUrl: Bun.env.REDIS_URL || "redis://localhost:6379",
  },
  
  // Logging configuration
  logging: {
    level: Bun.env.LOG_LEVEL || "info",
    format: Bun.env.LOG_FORMAT || "json",
    includeTimestamp: Bun.env.LOG_TIMESTAMP !== "false",
  },
  
  // Feature flags
  features: {
    enableMetrics: Bun.env.ENABLE_METRICS === "true",
    enableTracing: Bun.env.ENABLE_TRACING === "true",
    maintenanceMode: Bun.env.MAINTENANCE_MODE === "true",
  },
};
```

## Secrets Management

Handling secrets securely is critical for production applications. Here are best practices for managing sensitive environment variables in Bun.

### Never Commit Secrets

Always add sensitive files to your `.gitignore`:

```bash
# .gitignore - Ignore local environment files
.env.local
.env.*.local
.env.development.local
.env.production.local

# Keep the base .env file if it only contains non-sensitive defaults
# .env
```

### Using a Template File

Create a template file for developers to copy:

```bash
# .env.example - Template for environment variables
# Copy this file to .env.local and fill in your values

# Database (required)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# API Keys (required)
API_KEY=your-api-key-here
JWT_SECRET=your-jwt-secret-here

# Optional settings with defaults
PORT=3000
HOST=localhost
LOG_LEVEL=debug
```

### Runtime Secret Loading

For production environments, consider loading secrets from external sources:

```typescript
// src/secrets.ts
// Load secrets from various sources based on environment

interface Secrets {
  jwtSecret: string;
  apiKey: string;
  databasePassword: string;
}

async function loadSecretsFromVault(): Promise<Partial<Secrets>> {
  // Example: Load from HashiCorp Vault or AWS Secrets Manager
  const vaultUrl = Bun.env.VAULT_URL;
  if (!vaultUrl) return {};
  
  try {
    const response = await fetch(`${vaultUrl}/v1/secret/data/myapp`, {
      headers: {
        "X-Vault-Token": Bun.env.VAULT_TOKEN || "",
      },
    });
    const data = await response.json();
    return data.data.data as Partial<Secrets>;
  } catch (error) {
    console.warn("Failed to load secrets from vault:", error);
    return {};
  }
}

async function loadSecretsFromFile(): Promise<Partial<Secrets>> {
  // Load from a secrets file mounted in Kubernetes
  const secretsPath = Bun.env.SECRETS_FILE_PATH;
  if (!secretsPath) return {};
  
  try {
    const file = Bun.file(secretsPath);
    const content = await file.text();
    return JSON.parse(content) as Partial<Secrets>;
  } catch (error) {
    console.warn("Failed to load secrets from file:", error);
    return {};
  }
}

export async function loadSecrets(): Promise<Secrets> {
  // Try multiple sources in order of preference
  const vaultSecrets = await loadSecretsFromVault();
  const fileSecrets = await loadSecretsFromFile();
  
  // Merge secrets with environment variables as fallback
  return {
    jwtSecret: vaultSecrets.jwtSecret || fileSecrets.jwtSecret || Bun.env.JWT_SECRET || "",
    apiKey: vaultSecrets.apiKey || fileSecrets.apiKey || Bun.env.API_KEY || "",
    databasePassword: vaultSecrets.databasePassword || fileSecrets.databasePassword || Bun.env.DATABASE_PASSWORD || "",
  };
}
```

## Accessing Variables at Runtime

Sometimes you need to access environment variables dynamically at runtime, especially for feature flags or configuration that can change.

### Dynamic Configuration Access

Create a configuration service that supports runtime updates:

```typescript
// src/configService.ts
// Service for accessing configuration at runtime

class ConfigService {
  private cache: Map<string, string> = new Map();
  private refreshInterval: number = 60000; // 1 minute
  
  constructor() {
    // Initial load
    this.refresh();
    
    // Periodic refresh for dynamic configuration
    if (Bun.env.ENABLE_CONFIG_REFRESH === "true") {
      setInterval(() => this.refresh(), this.refreshInterval);
    }
  }
  
  private refresh(): void {
    // Re-read from environment (useful if env vars can change)
    this.cache.clear();
  }
  
  get(key: string, defaultValue?: string): string | undefined {
    // Check cache first
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    // Read from environment
    const value = Bun.env[key] ?? defaultValue;
    
    if (value !== undefined) {
      this.cache.set(key, value);
    }
    
    return value;
  }
  
  getRequired(key: string): string {
    const value = this.get(key);
    if (value === undefined) {
      throw new Error(`Required configuration missing: ${key}`);
    }
    return value;
  }
  
  getNumber(key: string, defaultValue: number): number {
    const value = this.get(key);
    if (value === undefined) return defaultValue;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  
  getBoolean(key: string, defaultValue: boolean): boolean {
    const value = this.get(key);
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === "true" || value === "1";
  }
  
  // Check if a feature flag is enabled
  isFeatureEnabled(featureName: string): boolean {
    return this.getBoolean(`FEATURE_${featureName.toUpperCase()}`, false);
  }
}

export const configService = new ConfigService();
```

Use the configuration service in your application:

```typescript
// src/features.ts
// Feature flag usage example

import { configService } from "./configService";

export function handleRequest(request: Request): Response {
  // Check feature flags at runtime
  if (configService.isFeatureEnabled("NEW_DASHBOARD")) {
    return handleNewDashboard(request);
  }
  
  if (configService.isFeatureEnabled("BETA_API")) {
    return handleBetaApi(request);
  }
  
  return handleLegacyRequest(request);
}

function handleNewDashboard(request: Request): Response {
  return new Response("New Dashboard Feature");
}

function handleBetaApi(request: Request): Response {
  return new Response("Beta API Response");
}

function handleLegacyRequest(request: Request): Response {
  return new Response("Legacy Response");
}
```

## Complete Working Example

Here is a complete example putting everything together:

```typescript
// src/app.ts
// Complete Bun application with environment variable management

import { env } from "./env";

// Validate environment on startup
function validateEnv(): void {
  const required = ["DATABASE_URL", "API_KEY"];
  const missing = required.filter((key) => !Bun.env[key]);
  
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    process.exit(1);
  }
}

// Create the server with environment-based configuration
function createServer() {
  return Bun.serve({
    port: env.PORT,
    hostname: env.HOST,
    
    fetch(request) {
      const url = new URL(request.url);
      
      // Health check endpoint
      if (url.pathname === "/health") {
        return Response.json({
          status: "healthy",
          environment: env.NODE_ENV,
          timestamp: new Date().toISOString(),
        });
      }
      
      // Config endpoint (be careful not to expose secrets)
      if (url.pathname === "/config") {
        return Response.json({
          environment: env.NODE_ENV,
          port: env.PORT,
          cacheEnabled: env.ENABLE_CACHE,
          debug: env.DEBUG,
        });
      }
      
      return new Response("Bun Server Running!", {
        headers: { "Content-Type": "text/plain" },
      });
    },
  });
}

// Main entry point
validateEnv();
const server = createServer();
console.log(`Server started on http://${env.HOST}:${env.PORT}`);
console.log(`Environment: ${env.NODE_ENV}`);
console.log(`Debug mode: ${env.DEBUG}`);
```

## Best Practices Summary

Follow these best practices when working with environment variables in Bun:

1. **Use Bun.env over process.env** - It is faster and more idiomatic for Bun applications.

2. **Create a centralized configuration module** - Define all environment variables in one place with proper typing and validation.

3. **Always validate required variables at startup** - Fail fast if critical configuration is missing rather than encountering errors later.

4. **Provide sensible defaults** - Make it easy for developers to get started without configuring everything.

5. **Never commit secrets to version control** - Use `.gitignore` to exclude `.env.local` and similar files containing sensitive data.

6. **Use environment-specific files** - Separate configuration for development, testing, and production environments.

7. **Document all environment variables** - Create a `.env.example` file that lists all variables with descriptions.

8. **Type your configuration** - Use TypeScript interfaces to catch configuration errors at compile time.

9. **Consider using a secrets manager** - For production, load secrets from external services like HashiCorp Vault or AWS Secrets Manager.

10. **Parse and validate values** - Convert strings to appropriate types (numbers, booleans) and validate ranges where applicable.

## Conclusion

Bun provides excellent built-in support for environment variables that simplifies configuration management in JavaScript and TypeScript applications. The automatic loading of `.env` files, combined with the fast `Bun.env` API, makes it straightforward to build applications that work correctly across different environments.

By following the patterns outlined in this guide, you can create robust, type-safe configuration systems that make your applications easier to develop, deploy, and maintain. Remember to always handle secrets securely, validate required variables at startup, and provide good defaults to improve the developer experience.

Whether you are building a simple API server or a complex microservices architecture, proper environment variable management is essential. Bun makes this task easier than ever, letting you focus on building great applications rather than wrestling with configuration.
