# How to Build Structured Loggers in Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, TypeScript, Logging, Observability, Backend, Debugging

Description: Learn how to build structured loggers in Node.js that produce JSON output, support log levels, correlation IDs, and integrate with observability platforms.

---

Plain text logs are hard to parse, search, and analyze. Structured logging produces machine-readable JSON that integrates with log aggregation tools like Elasticsearch, Datadog, and Splunk. This guide shows you how to build a production-ready structured logger in Node.js.

## Why Structured Logging?

Compare these two log entries:

```
// Unstructured - hard to parse and filter
[2026-01-25 10:30:45] ERROR User login failed for user@example.com from 192.168.1.1

// Structured - easy to query and aggregate
{"timestamp":"2026-01-25T10:30:45.123Z","level":"error","message":"User login failed","email":"user@example.com","ip":"192.168.1.1","service":"auth-api"}
```

Structured logs let you run queries like "show all errors from the auth-api service in the last hour" without regex parsing.

## Basic Structured Logger

Let us start with a simple logger that outputs JSON with consistent fields.

```typescript
// logger.ts
// A minimal structured logger with log levels and JSON output

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class StructuredLogger {
  private minLevel: LogLevel;
  private defaultFields: Record<string, unknown>;

  constructor(options: {
    level?: LogLevel;
    defaultFields?: Record<string, unknown>;
  } = {}) {
    this.minLevel = options.level || 'info';
    this.defaultFields = options.defaultFields || {};
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private formatEntry(
    level: LogLevel,
    message: string,
    data: Record<string, unknown> = {}
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.defaultFields,
      ...data,
    };
  }

  private write(entry: LogEntry): void {
    const output = JSON.stringify(entry);

    if (entry.level === 'error') {
      process.stderr.write(output + '\n');
    } else {
      process.stdout.write(output + '\n');
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog('debug')) {
      this.write(this.formatEntry('debug', message, data));
    }
  }

  info(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog('info')) {
      this.write(this.formatEntry('info', message, data));
    }
  }

  warn(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog('warn')) {
      this.write(this.formatEntry('warn', message, data));
    }
  }

  error(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog('error')) {
      this.write(this.formatEntry('error', message, data));
    }
  }

  // Create child logger with additional default fields
  child(fields: Record<string, unknown>): StructuredLogger {
    return new StructuredLogger({
      level: this.minLevel,
      defaultFields: { ...this.defaultFields, ...fields },
    });
  }
}

// Create default logger instance
const logger = new StructuredLogger({
  level: (process.env.LOG_LEVEL as LogLevel) || 'info',
  defaultFields: {
    service: process.env.SERVICE_NAME || 'app',
    environment: process.env.NODE_ENV || 'development',
  },
});

export default logger;
export { StructuredLogger };
```

## Adding Request Context with Async Local Storage

Tracking requests across your application requires correlation IDs. Node.js AsyncLocalStorage lets you attach context without passing it through every function call.

```typescript
// context-logger.ts
import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';

// Storage for request-scoped data
interface RequestContext {
  requestId: string;
  userId?: string;
  traceId?: string;
  spanId?: string;
  [key: string]: unknown;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

// Get current context or empty object
function getContext(): Partial<RequestContext> {
  return asyncLocalStorage.getStore() || {};
}

// Run code with request context
function withContext<T>(
  context: Partial<RequestContext>,
  fn: () => T
): T {
  const fullContext: RequestContext = {
    requestId: context.requestId || randomUUID(),
    ...context,
  };
  return asyncLocalStorage.run(fullContext, fn);
}

// Add to existing context
function addToContext(fields: Record<string, unknown>): void {
  const store = asyncLocalStorage.getStore();
  if (store) {
    Object.assign(store, fields);
  }
}

// Logger that automatically includes request context
class ContextAwareLogger {
  private baseLogger: StructuredLogger;

  constructor(baseLogger: StructuredLogger) {
    this.baseLogger = baseLogger;
  }

  private enrichWithContext(data: Record<string, unknown> = {}): Record<string, unknown> {
    const context = getContext();
    return { ...context, ...data };
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.baseLogger.debug(message, this.enrichWithContext(data));
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.baseLogger.info(message, this.enrichWithContext(data));
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.baseLogger.warn(message, this.enrichWithContext(data));
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.baseLogger.error(message, this.enrichWithContext(data));
  }

  child(fields: Record<string, unknown>): ContextAwareLogger {
    return new ContextAwareLogger(this.baseLogger.child(fields));
  }
}

export { withContext, addToContext, getContext, ContextAwareLogger };
```

## Express Middleware Integration

Connect the logger to your Express application with middleware that sets up request context.

```typescript
// middleware.ts
import { Request, Response, NextFunction } from 'express';
import { withContext, addToContext, ContextAwareLogger } from './context-logger';
import { StructuredLogger } from './logger';

const baseLogger = new StructuredLogger({
  level: 'info',
  defaultFields: { service: 'api' },
});

const logger = new ContextAwareLogger(baseLogger);

// Middleware to establish request context
function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Extract or generate request ID
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();

  // Extract trace context from headers (e.g., from OpenTelemetry)
  const traceId = req.headers['x-trace-id'] as string;
  const spanId = req.headers['x-span-id'] as string;

  withContext(
    {
      requestId,
      traceId,
      spanId,
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    },
    () => {
      // Set request ID header for downstream services
      res.setHeader('x-request-id', requestId);
      next();
    }
  );
}

// Request logging middleware
function requestLoggingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();

  logger.info('Request started', {
    query: req.query,
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? 'warn' : 'info';

    logger[level]('Request completed', {
      statusCode: res.statusCode,
      durationMs: duration,
    });
  });

  next();
}

export { requestContextMiddleware, requestLoggingMiddleware, logger };
```

## Error Logging with Stack Traces

Errors need special handling to capture stack traces without losing structure.

```typescript
// error-logging.ts
interface SerializedError {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  [key: string]: unknown;
}

// Serialize an error to a loggable object
function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    const serialized: SerializedError = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };

    // Include additional properties (like code, statusCode, etc.)
    Object.entries(error).forEach(([key, value]) => {
      if (key !== 'name' && key !== 'message' && key !== 'stack') {
        serialized[key] = value;
      }
    });

    return serialized;
  }

  // Handle non-Error objects
  return {
    name: 'UnknownError',
    message: String(error),
  };
}

// Extended logger with error support
class ErrorAwareLogger extends ContextAwareLogger {
  logError(
    message: string,
    error: unknown,
    data?: Record<string, unknown>
  ): void {
    this.error(message, {
      ...data,
      error: serializeError(error),
    });
  }

  // Log and rethrow - useful in catch blocks
  logAndThrow(
    message: string,
    error: unknown,
    data?: Record<string, unknown>
  ): never {
    this.logError(message, error, data);
    throw error;
  }
}

// Usage
const logger = new ErrorAwareLogger(baseLogger);

try {
  await riskyOperation();
} catch (error) {
  logger.logError('Operation failed', error, {
    operation: 'riskyOperation',
    attempt: 3,
  });
}
```

## Log Sampling for High-Volume Applications

In high-throughput applications, logging every request can be expensive. Sampling reduces volume while maintaining visibility.

```typescript
// sampled-logger.ts
// Log sampling strategies for high-volume applications

type SamplingStrategy = 'random' | 'rate' | 'always' | 'never';

interface SamplingConfig {
  strategy: SamplingStrategy;
  rate?: number; // For 'random' strategy, 0-1
  interval?: number; // For 'rate' strategy, log every N
}

class SampledLogger {
  private logger: ContextAwareLogger;
  private samplingConfig: SamplingConfig;
  private counter: number = 0;

  constructor(
    logger: ContextAwareLogger,
    samplingConfig: SamplingConfig = { strategy: 'always' }
  ) {
    this.logger = logger;
    this.samplingConfig = samplingConfig;
  }

  private shouldSample(): boolean {
    switch (this.samplingConfig.strategy) {
      case 'always':
        return true;

      case 'never':
        return false;

      case 'random':
        return Math.random() < (this.samplingConfig.rate || 0.1);

      case 'rate':
        this.counter++;
        const interval = this.samplingConfig.interval || 100;
        return this.counter % interval === 0;

      default:
        return true;
    }
  }

  // Debug and info are sampled
  debug(message: string, data?: Record<string, unknown>): void {
    if (this.shouldSample()) {
      this.logger.debug(message, { ...data, sampled: true });
    }
  }

  info(message: string, data?: Record<string, unknown>): void {
    if (this.shouldSample()) {
      this.logger.info(message, { ...data, sampled: true });
    }
  }

  // Warnings and errors are never sampled
  warn(message: string, data?: Record<string, unknown>): void {
    this.logger.warn(message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.logger.error(message, data);
  }
}

// Sample 10% of debug/info logs
const sampledLogger = new SampledLogger(logger, {
  strategy: 'random',
  rate: 0.1,
});
```

## Sensitive Data Redaction

Production logs should never contain passwords, tokens, or other sensitive data.

```typescript
// redaction.ts
// Automatically redact sensitive fields from log data

const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'authorization',
  'cookie',
  'credit_card',
  'creditCard',
  'ssn',
  'social_security',
]);

const REDACTED = '[REDACTED]';

function redactSensitiveData(
  data: Record<string, unknown>,
  sensitiveKeys: Set<string> = SENSITIVE_KEYS
): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();

    // Check if key is sensitive
    if (sensitiveKeys.has(lowerKey)) {
      redacted[key] = REDACTED;
      continue;
    }

    // Recursively redact nested objects
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      redacted[key] = redactSensitiveData(
        value as Record<string, unknown>,
        sensitiveKeys
      );
      continue;
    }

    // Redact arrays of objects
    if (Array.isArray(value)) {
      redacted[key] = value.map(item =>
        typeof item === 'object' && item !== null
          ? redactSensitiveData(item as Record<string, unknown>, sensitiveKeys)
          : item
      );
      continue;
    }

    redacted[key] = value;
  }

  return redacted;
}

// Redacting logger wrapper
class RedactingLogger {
  private logger: ContextAwareLogger;
  private sensitiveKeys: Set<string>;

  constructor(
    logger: ContextAwareLogger,
    additionalKeys: string[] = []
  ) {
    this.logger = logger;
    this.sensitiveKeys = new Set([...SENSITIVE_KEYS, ...additionalKeys]);
  }

  private redact(data?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!data) return data;
    return redactSensitiveData(data, this.sensitiveKeys);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.logger.info(message, this.redact(data));
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.logger.error(message, this.redact(data));
  }

  // ... other methods
}
```

## Complete Logger Setup

Here is how all the pieces fit together.

```typescript
// setup.ts
import { StructuredLogger } from './logger';
import { ContextAwareLogger, withContext } from './context-logger';
import { RedactingLogger } from './redaction';
import { SampledLogger } from './sampled-logger';

// Build the logger chain
function createLogger(): RedactingLogger {
  // Base structured logger
  const base = new StructuredLogger({
    level: (process.env.LOG_LEVEL as any) || 'info',
    defaultFields: {
      service: process.env.SERVICE_NAME || 'api',
      version: process.env.APP_VERSION || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    },
  });

  // Add context awareness
  const contextAware = new ContextAwareLogger(base);

  // Add redaction
  const redacting = new RedactingLogger(contextAware, [
    'internalToken',
    'databasePassword',
  ]);

  return redacting;
}

const logger = createLogger();

// Express app setup
import express from 'express';
import { requestContextMiddleware, requestLoggingMiddleware } from './middleware';

const app = express();

app.use(requestContextMiddleware);
app.use(requestLoggingMiddleware);

app.get('/users/:id', async (req, res) => {
  logger.info('Fetching user', { userId: req.params.id });

  try {
    const user = await fetchUser(req.params.id);
    logger.info('User fetched successfully');
    res.json(user);
  } catch (error) {
    logger.error('Failed to fetch user', {
      userId: req.params.id,
      error: serializeError(error),
    });
    res.status(500).json({ error: 'Internal error' });
  }
});

export { logger, withContext };
```

## Output Examples

Here is what the logs look like in production:

```json
{"timestamp":"2026-01-25T10:30:45.123Z","level":"info","message":"Request started","service":"api","version":"1.0.0","environment":"production","requestId":"abc-123","method":"GET","path":"/users/42","ip":"192.168.1.1"}
{"timestamp":"2026-01-25T10:30:45.145Z","level":"info","message":"Fetching user","service":"api","version":"1.0.0","environment":"production","requestId":"abc-123","userId":"42"}
{"timestamp":"2026-01-25T10:30:45.189Z","level":"info","message":"User fetched successfully","service":"api","version":"1.0.0","environment":"production","requestId":"abc-123"}
{"timestamp":"2026-01-25T10:30:45.191Z","level":"info","message":"Request completed","service":"api","version":"1.0.0","environment":"production","requestId":"abc-123","statusCode":200,"durationMs":68}
```

## Summary

| Feature | Purpose |
|---------|---------|
| JSON output | Machine-readable logs |
| Log levels | Filter verbosity |
| Default fields | Consistent metadata |
| AsyncLocalStorage | Request correlation |
| Error serialization | Capture stack traces |
| Redaction | Protect sensitive data |
| Sampling | Control volume |

Structured logging transforms debugging from guesswork into data analysis. With proper setup, you can trace requests across services, quickly identify error patterns, and build dashboards that surface issues before they impact users.
