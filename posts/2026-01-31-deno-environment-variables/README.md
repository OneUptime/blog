# How to Handle Environment Variables in Deno

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Deno, Environment Variables, Configuration, Security

Description: A comprehensive guide to managing environment variables in Deno applications, covering the Deno.env API, dotenv files, permissions, type safety, and production best practices.

---

Environment variables are a fundamental part of modern application development. They allow you to configure your application without hardcoding sensitive values like API keys, database credentials, and feature flags directly into your source code. Deno, the secure runtime for JavaScript and TypeScript, provides robust tools for working with environment variables while maintaining its security-first philosophy.

In this comprehensive guide, we will explore everything you need to know about handling environment variables in Deno, from basic usage to advanced patterns for production applications.

## Understanding the Deno.env API

Deno provides a built-in `Deno.env` object for interacting with environment variables. This API is straightforward yet powerful, offering methods to get, set, and delete environment variables.

### Getting Environment Variables

The most common operation is retrieving the value of an environment variable. Deno provides two methods for this purpose.

The `get()` method returns the value of an environment variable or `undefined` if it does not exist:

```typescript
// Get an environment variable (returns string or undefined)
const databaseUrl = Deno.env.get("DATABASE_URL");

if (databaseUrl) {
  console.log("Database URL:", databaseUrl);
} else {
  console.log("DATABASE_URL is not set");
}
```

When you need to ensure an environment variable exists and want Deno to throw an error if it is missing, use the `get()` method with explicit checking or implement your own required variable helper:

```typescript
// Helper function to get required environment variables
function getRequiredEnv(key: string): string {
  const value = Deno.env.get(key);
  if (value === undefined) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

// Usage - will throw if API_KEY is not set
const apiKey = getRequiredEnv("API_KEY");
console.log("API Key loaded successfully");
```

### Setting Environment Variables

You can set environment variables programmatically using the `set()` method. This is useful for testing or when you need to propagate configuration to child processes:

```typescript
// Set an environment variable
Deno.env.set("APP_ENV", "development");
Deno.env.set("LOG_LEVEL", "debug");

// Verify the variable was set
console.log("APP_ENV:", Deno.env.get("APP_ENV")); // Output: development
```

### Deleting Environment Variables

To remove an environment variable from the current process, use the `delete()` method:

```typescript
// Delete an environment variable
Deno.env.set("TEMP_CONFIG", "some_value");
console.log("Before delete:", Deno.env.get("TEMP_CONFIG")); // Output: some_value

Deno.env.delete("TEMP_CONFIG");
console.log("After delete:", Deno.env.get("TEMP_CONFIG")); // Output: undefined
```

### Listing All Environment Variables

To get all environment variables as an object, use the `toObject()` method:

```typescript
// Get all environment variables as a key-value object
const allEnvVars = Deno.env.toObject();

// Print all environment variables (be careful with sensitive data!)
for (const [key, value] of Object.entries(allEnvVars)) {
  // Mask sensitive values in logs
  const maskedValue = key.includes("KEY") || key.includes("SECRET") 
    ? "****" 
    : value;
  console.log(`${key}=${maskedValue}`);
}
```

## Working with .env Files

While Deno does not natively load `.env` files automatically, it provides official support through the standard library's dotenv module. This is the recommended approach for managing environment variables during development.

### Using the dotenv Module

First, you need to import the `load` function from the standard library. This function reads a `.env` file and loads the variables into the environment:

```typescript
// Import the load function from Deno's standard library
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

// Load environment variables from .env file
await load({ export: true });

// Now you can access the variables using Deno.env
const dbHost = Deno.env.get("DB_HOST");
const dbPort = Deno.env.get("DB_PORT");
const dbName = Deno.env.get("DB_NAME");

console.log(`Connecting to database at ${dbHost}:${dbPort}/${dbName}`);
```

### Creating a .env File

Your `.env` file should contain key-value pairs, one per line. Here is an example configuration file:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp_development
DB_USER=postgres
DB_PASSWORD=secret_password

# API Configuration
API_BASE_URL=https://api.example.com
API_KEY=your_api_key_here
API_TIMEOUT=30000

# Application Settings
APP_ENV=development
LOG_LEVEL=debug
ENABLE_CACHE=true
```

### Loading from Custom File Paths

You can specify a custom path for your environment file, which is useful when you have different configurations for different environments:

```typescript
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

// Determine which env file to load based on the environment
const envFile = Deno.env.get("APP_ENV") === "production" 
  ? ".env.production" 
  : ".env.development";

// Load from the specified file
await load({ 
  envPath: envFile,
  export: true 
});

console.log("Loaded configuration from:", envFile);
```

### Handling Missing .env Files Gracefully

In production environments, you might not use `.env` files at all, relying instead on system environment variables. Here is how to handle this gracefully:

```typescript
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

// Try to load .env file, but do not fail if it does not exist
try {
  await load({ export: true });
  console.log("Loaded environment variables from .env file");
} catch (error) {
  if (error instanceof Deno.errors.NotFound) {
    console.log("No .env file found, using system environment variables");
  } else {
    throw error;
  }
}
```

## Understanding Deno Permissions

Deno's security model requires explicit permissions for accessing environment variables. This is a key differentiator from Node.js and helps prevent malicious code from stealing sensitive information.

### The --allow-env Flag

To access environment variables, you must run your Deno program with the `--allow-env` flag:

```bash
# Allow access to all environment variables
deno run --allow-env app.ts

# Allow access to specific environment variables only
deno run --allow-env=DATABASE_URL,API_KEY app.ts
```

### Granular Permission Control

For better security, you should limit access to only the environment variables your application needs:

```typescript
// This script only needs DATABASE_URL and API_KEY
// Run with: deno run --allow-env=DATABASE_URL,API_KEY app.ts

const databaseUrl = Deno.env.get("DATABASE_URL");
const apiKey = Deno.env.get("API_KEY");

// Attempting to access other variables will throw a permission error
// const secretVar = Deno.env.get("OTHER_SECRET"); // PermissionDenied
```

### Requesting Permissions at Runtime

You can also request permissions dynamically at runtime, which allows for more flexible permission handling:

```typescript
// Request permission to read a specific environment variable
const status = await Deno.permissions.request({
  name: "env",
  variable: "DATABASE_URL"
});

if (status.state === "granted") {
  const dbUrl = Deno.env.get("DATABASE_URL");
  console.log("Database URL retrieved successfully");
} else {
  console.log("Permission denied for DATABASE_URL");
}
```

## Type Safety and Validation

TypeScript's type system can help ensure your environment variables are properly validated and typed. Here are patterns for building type-safe configuration.

### Creating a Typed Configuration Module

Build a configuration module that validates and types your environment variables at startup:

```typescript
// config.ts - Centralized configuration module

// Define the shape of your configuration
interface AppConfig {
  database: {
    host: string;
    port: number;
    name: string;
    user: string;
    password: string;
  };
  api: {
    baseUrl: string;
    key: string;
    timeout: number;
  };
  app: {
    env: "development" | "staging" | "production";
    logLevel: "debug" | "info" | "warn" | "error";
    enableCache: boolean;
  };
}

// Helper function to get required string
function requireString(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// Helper function to get required number
function requireNumber(key: string): number {
  const value = requireString(key);
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    throw new Error(`Environment variable ${key} must be a valid number`);
  }
  return num;
}

// Helper function to get required boolean
function requireBoolean(key: string): boolean {
  const value = requireString(key).toLowerCase();
  if (value !== "true" && value !== "false") {
    throw new Error(`Environment variable ${key} must be 'true' or 'false'`);
  }
  return value === "true";
}

// Helper function to get optional string with default
function optionalString(key: string, defaultValue: string): string {
  return Deno.env.get(key) ?? defaultValue;
}

// Build and export the configuration
export const config: AppConfig = {
  database: {
    host: optionalString("DB_HOST", "localhost"),
    port: requireNumber("DB_PORT"),
    name: requireString("DB_NAME"),
    user: requireString("DB_USER"),
    password: requireString("DB_PASSWORD"),
  },
  api: {
    baseUrl: requireString("API_BASE_URL"),
    key: requireString("API_KEY"),
    timeout: requireNumber("API_TIMEOUT"),
  },
  app: {
    env: requireString("APP_ENV") as AppConfig["app"]["env"],
    logLevel: optionalString("LOG_LEVEL", "info") as AppConfig["app"]["logLevel"],
    enableCache: requireBoolean("ENABLE_CACHE"),
  },
};

// Freeze the config to prevent modifications
Object.freeze(config);
Object.freeze(config.database);
Object.freeze(config.api);
Object.freeze(config.app);
```

### Using Zod for Schema Validation

For more robust validation, you can use the Zod library to define and validate your configuration schema:

```typescript
// config-with-zod.ts
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Define the configuration schema
const configSchema = z.object({
  DATABASE_URL: z.string().url(),
  API_KEY: z.string().min(32, "API key must be at least 32 characters"),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)),
  APP_ENV: z.enum(["development", "staging", "production"]),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  ENABLE_METRICS: z.string().transform((v) => v === "true").default("false"),
  MAX_CONNECTIONS: z.string().transform(Number).pipe(z.number().positive()).optional(),
});

// Parse and validate environment variables
function loadConfig() {
  const env = Deno.env.toObject();
  
  const result = configSchema.safeParse(env);
  
  if (!result.success) {
    console.error("Configuration validation failed:");
    for (const error of result.error.errors) {
      console.error(`  - ${error.path.join(".")}: ${error.message}`);
    }
    Deno.exit(1);
  }
  
  return result.data;
}

export const config = loadConfig();
```

## Configuration Patterns for Different Environments

Managing configuration across development, staging, and production environments requires careful planning.

### Environment-Specific Configuration Files

Create separate configuration files for each environment and load them appropriately:

```typescript
// env-loader.ts
import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

type Environment = "development" | "staging" | "production" | "test";

async function loadEnvironmentConfig(): Promise<void> {
  // First, try to load the base .env file
  const baseEnvPath = ".env";
  
  // Determine the current environment
  const appEnv = (Deno.env.get("APP_ENV") ?? "development") as Environment;
  const envSpecificPath = `.env.${appEnv}`;
  const localPath = ".env.local";
  
  // Load files in order of precedence (later files override earlier ones)
  const filesToLoad = [baseEnvPath, envSpecificPath, localPath];
  
  for (const filePath of filesToLoad) {
    try {
      await load({ envPath: filePath, export: true });
      console.log(`Loaded: ${filePath}`);
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
      // File not found is okay, continue to next file
    }
  }
  
  console.log(`Running in ${appEnv} mode`);
}

await loadEnvironmentConfig();
```

### Using a Configuration Factory

Create a factory pattern that returns environment-specific configuration:

```typescript
// config-factory.ts

interface DatabaseConfig {
  connectionString: string;
  poolSize: number;
  ssl: boolean;
}

interface CacheConfig {
  enabled: boolean;
  ttl: number;
  maxSize: number;
}

interface AppConfiguration {
  database: DatabaseConfig;
  cache: CacheConfig;
  debug: boolean;
}

function createConfig(): AppConfiguration {
  const env = Deno.env.get("APP_ENV") ?? "development";
  
  // Base configuration shared across all environments
  const baseConfig: AppConfiguration = {
    database: {
      connectionString: Deno.env.get("DATABASE_URL") ?? "",
      poolSize: 10,
      ssl: false,
    },
    cache: {
      enabled: true,
      ttl: 3600,
      maxSize: 1000,
    },
    debug: false,
  };
  
  // Environment-specific overrides
  const envOverrides: Record<string, Partial<AppConfiguration>> = {
    development: {
      database: { ...baseConfig.database, poolSize: 5, ssl: false },
      cache: { ...baseConfig.cache, ttl: 60 },
      debug: true,
    },
    staging: {
      database: { ...baseConfig.database, poolSize: 15, ssl: true },
      cache: { ...baseConfig.cache, ttl: 1800 },
      debug: true,
    },
    production: {
      database: { ...baseConfig.database, poolSize: 50, ssl: true },
      cache: { ...baseConfig.cache, ttl: 7200, maxSize: 10000 },
      debug: false,
    },
  };
  
  // Merge base config with environment overrides
  const envConfig = envOverrides[env] ?? {};
  
  return {
    ...baseConfig,
    ...envConfig,
    database: { ...baseConfig.database, ...envConfig.database },
    cache: { ...baseConfig.cache, ...envConfig.cache },
  };
}

export const config = createConfig();
```

## Secrets Management

Handling secrets securely is critical for production applications. Here are patterns and best practices for managing sensitive environment variables.

### Separating Secrets from Configuration

Keep secrets separate from regular configuration and load them from a secure source:

```typescript
// secrets.ts
interface Secrets {
  databasePassword: string;
  apiKey: string;
  jwtSecret: string;
  encryptionKey: string;
}

async function loadSecrets(): Promise<Secrets> {
  const env = Deno.env.get("APP_ENV");
  
  if (env === "production") {
    // In production, secrets should come from a secrets manager
    // This is a placeholder for secrets manager integration
    return {
      databasePassword: Deno.env.get("DB_PASSWORD") ?? "",
      apiKey: Deno.env.get("API_KEY") ?? "",
      jwtSecret: Deno.env.get("JWT_SECRET") ?? "",
      encryptionKey: Deno.env.get("ENCRYPTION_KEY") ?? "",
    };
  }
  
  // In development, load from .env.secrets file
  const secretsFile = await Deno.readTextFile(".env.secrets");
  const secrets: Record<string, string> = {};
  
  for (const line of secretsFile.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...valueParts] = trimmed.split("=");
      secrets[key] = valueParts.join("=");
    }
  }
  
  return {
    databasePassword: secrets["DB_PASSWORD"] ?? "",
    apiKey: secrets["API_KEY"] ?? "",
    jwtSecret: secrets["JWT_SECRET"] ?? "",
    encryptionKey: secrets["ENCRYPTION_KEY"] ?? "",
  };
}

export const secrets = await loadSecrets();
```

### Validating Secret Strength

Ensure your secrets meet minimum security requirements:

```typescript
// secret-validator.ts

interface SecretValidationRule {
  name: string;
  minLength: number;
  pattern?: RegExp;
  description: string;
}

const secretRules: Record<string, SecretValidationRule> = {
  JWT_SECRET: {
    name: "JWT Secret",
    minLength: 32,
    description: "JWT secret must be at least 32 characters",
  },
  ENCRYPTION_KEY: {
    name: "Encryption Key",
    minLength: 32,
    pattern: /^[A-Fa-f0-9]+$/,
    description: "Encryption key must be at least 32 hex characters",
  },
  API_KEY: {
    name: "API Key",
    minLength: 20,
    description: "API key must be at least 20 characters",
  },
};

function validateSecrets(): void {
  const errors: string[] = [];
  
  for (const [envVar, rule] of Object.entries(secretRules)) {
    const value = Deno.env.get(envVar);
    
    if (!value) {
      errors.push(`${rule.name} (${envVar}) is not set`);
      continue;
    }
    
    if (value.length < rule.minLength) {
      errors.push(`${rule.name} is too short. ${rule.description}`);
    }
    
    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push(`${rule.name} has invalid format. ${rule.description}`);
    }
  }
  
  if (errors.length > 0) {
    console.error("Secret validation failed:");
    errors.forEach((error) => console.error(`  - ${error}`));
    
    if (Deno.env.get("APP_ENV") === "production") {
      Deno.exit(1);
    } else {
      console.warn("Continuing with invalid secrets in non-production mode");
    }
  }
}

validateSecrets();
```

## Production Considerations

When deploying Deno applications to production, there are several important considerations for environment variable management.

### Startup Validation

Validate all required configuration at application startup to fail fast:

```typescript
// startup-validation.ts

interface ValidationResult {
  valid: boolean;
  missing: string[];
  invalid: string[];
}

function validateEnvironment(): ValidationResult {
  const required = [
    "DATABASE_URL",
    "API_KEY",
    "JWT_SECRET",
    "APP_ENV",
  ];
  
  const result: ValidationResult = {
    valid: true,
    missing: [],
    invalid: [],
  };
  
  // Check for missing required variables
  for (const varName of required) {
    if (!Deno.env.get(varName)) {
      result.missing.push(varName);
      result.valid = false;
    }
  }
  
  // Validate specific formats
  const databaseUrl = Deno.env.get("DATABASE_URL");
  if (databaseUrl && !databaseUrl.startsWith("postgres://")) {
    result.invalid.push("DATABASE_URL must be a valid PostgreSQL URL");
    result.valid = false;
  }
  
  const appEnv = Deno.env.get("APP_ENV");
  if (appEnv && !["development", "staging", "production"].includes(appEnv)) {
    result.invalid.push("APP_ENV must be development, staging, or production");
    result.valid = false;
  }
  
  return result;
}

// Run validation at startup
const validation = validateEnvironment();

if (!validation.valid) {
  console.error("Environment validation failed!");
  
  if (validation.missing.length > 0) {
    console.error("Missing variables:", validation.missing.join(", "));
  }
  
  if (validation.invalid.length > 0) {
    console.error("Invalid variables:");
    validation.invalid.forEach((msg) => console.error(`  - ${msg}`));
  }
  
  Deno.exit(1);
}

console.log("Environment validation passed");
```

### Secure Logging

Never log sensitive environment variables. Create a safe logging utility:

```typescript
// safe-logger.ts

const sensitivePatterns = [
  /password/i,
  /secret/i,
  /key/i,
  /token/i,
  /credential/i,
  /auth/i,
];

function isSensitive(key: string): boolean {
  return sensitivePatterns.some((pattern) => pattern.test(key));
}

function logConfig(): void {
  console.log("Application Configuration:");
  console.log("=".repeat(50));
  
  const env = Deno.env.toObject();
  const sortedKeys = Object.keys(env).sort();
  
  for (const key of sortedKeys) {
    const value = isSensitive(key) ? "[REDACTED]" : env[key];
    console.log(`  ${key}: ${value}`);
  }
  
  console.log("=".repeat(50));
}

// Safe to call this even with sensitive variables
logConfig();
```

### Health Check Endpoint with Config Status

Include configuration status in your health check endpoint:

```typescript
// health-check.ts

interface HealthStatus {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  config: {
    databaseConfigured: boolean;
    cacheEnabled: boolean;
    environment: string;
  };
}

function getHealthStatus(): HealthStatus {
  const dbUrl = Deno.env.get("DATABASE_URL");
  const cacheEnabled = Deno.env.get("ENABLE_CACHE") === "true";
  const appEnv = Deno.env.get("APP_ENV") ?? "unknown";
  
  return {
    status: dbUrl ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    config: {
      databaseConfigured: !!dbUrl,
      cacheEnabled,
      environment: appEnv,
    },
  };
}

// Example usage with Deno's built-in HTTP server
Deno.serve({ port: 8080 }, (req) => {
  if (new URL(req.url).pathname === "/health") {
    const status = getHealthStatus();
    return new Response(JSON.stringify(status), {
      headers: { "Content-Type": "application/json" },
      status: status.status === "healthy" ? 200 : 503,
    });
  }
  
  return new Response("Not Found", { status: 404 });
});
```

## Best Practices Summary

Here is a consolidated list of best practices for handling environment variables in Deno:

1. **Use granular permissions**: Only request access to the specific environment variables your application needs using `--allow-env=VAR1,VAR2`.

2. **Validate early**: Check all required environment variables at application startup and fail fast with clear error messages.

3. **Use typed configuration**: Create a centralized configuration module with TypeScript types to catch errors at compile time.

4. **Separate secrets from config**: Keep sensitive values separate and consider using a secrets manager for production.

5. **Never log secrets**: Implement safe logging utilities that automatically redact sensitive values.

6. **Use .env files for development only**: In production, rely on platform-provided environment variables or secrets managers.

7. **Provide sensible defaults**: Use default values for non-critical configuration to improve developer experience.

8. **Document required variables**: Maintain a `.env.example` file that lists all required variables without sensitive values.

9. **Freeze configuration objects**: Prevent accidental modifications to configuration at runtime.

10. **Handle missing .env files gracefully**: Your application should work without .env files in production.

## Conclusion

Environment variables are essential for building configurable, secure, and portable Deno applications. By leveraging Deno's built-in `Deno.env` API along with the standard library's dotenv module, you can create robust configuration systems that work seamlessly across development and production environments.

The key to success is combining Deno's security-first approach with strong typing, thorough validation, and careful handling of sensitive data. By following the patterns and best practices outlined in this guide, you will be well-equipped to build applications that are both secure and maintainable.

Remember that configuration management is not a one-time task. As your application grows, continuously review and refine your approach to ensure it meets your evolving security and operational requirements.
