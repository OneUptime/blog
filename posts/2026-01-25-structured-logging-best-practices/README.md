# How to Implement Structured Logging Best Practices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Structured Logging, Observability, Best Practices, JSON Logging, Log Management, DevOps, Monitoring

Description: A comprehensive guide to implementing structured logging best practices in your applications. Learn how to design log schemas, choose appropriate log levels, add context, and avoid common pitfalls that make debugging difficult.

---

> Structured logging transforms your logs from human-readable strings into machine-parseable data. When done right, it enables powerful searching, filtering, and analysis that makes debugging production issues dramatically faster.

The difference between "User login failed" and a JSON object with user_id, error_code, timestamp, and request context is the difference between searching through thousands of logs manually and running a single query to find exactly what you need.

---

## Why Structured Logging Matters

Traditional logging produces output like this:

```
2024-01-15 10:23:45 ERROR - User john@example.com failed to login: invalid password attempt 3 from IP 192.168.1.100
```

This is readable by humans but difficult for machines. To answer "How many failed logins occurred in the last hour?" you need regex parsing and hope the format stays consistent.

Structured logging produces:

```json
{
  "timestamp": "2024-01-15T10:23:45.123Z",
  "level": "error",
  "message": "User login failed",
  "user_email": "john@example.com",
  "error_reason": "invalid_password",
  "attempt_count": 3,
  "client_ip": "192.168.1.100",
  "service": "auth-service",
  "trace_id": "abc123"
}
```

Now you can query by any field, aggregate by error_reason, alert on attempt_count thresholds, and correlate with other services via trace_id.

---

## Designing Your Log Schema

Create a consistent schema that all services follow:

```typescript
// types/logging.ts
// Define your log schema for consistency across services

interface BaseLogEntry {
  // Required fields for every log
  timestamp: string;           // ISO 8601 format
  level: LogLevel;             // Standardized levels
  message: string;             // Human-readable description
  service: string;             // Service name
  version: string;             // Service version
  environment: string;         // dev, staging, prod

  // Trace correlation
  trace_id?: string;           // Distributed trace ID
  span_id?: string;            // Current span ID
  parent_span_id?: string;     // Parent span for context

  // Request context
  request_id?: string;         // Unique request identifier
  correlation_id?: string;     // Business correlation ID

  // Error information
  error?: ErrorInfo;

  // Custom attributes
  [key: string]: unknown;
}

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface ErrorInfo {
  type: string;                // Error class name
  message: string;             // Error message
  stack?: string;              // Stack trace
  code?: string;               // Application error code
  cause?: ErrorInfo;           // Nested cause
}

// Domain-specific log entries
interface HttpRequestLog extends BaseLogEntry {
  http_method: string;
  http_path: string;
  http_status: number;
  http_duration_ms: number;
  http_request_size?: number;
  http_response_size?: number;
  user_agent?: string;
  client_ip?: string;
}

interface DatabaseLog extends BaseLogEntry {
  db_operation: string;        // SELECT, INSERT, UPDATE, DELETE
  db_table: string;
  db_duration_ms: number;
  db_rows_affected?: number;
  db_query_hash?: string;      // Hashed query for grouping
}

interface BusinessEventLog extends BaseLogEntry {
  event_type: string;          // order_created, payment_processed
  entity_type: string;         // user, order, payment
  entity_id: string;
  event_metadata?: Record<string, unknown>;
}
```

---

## Implementing Structured Logging

Here is a complete logging implementation in Node.js:

```typescript
// logger.ts
// Structured logging implementation with context management

import { AsyncLocalStorage } from 'async_hooks';

// Context storage for request-scoped data
const contextStorage = new AsyncLocalStorage<LogContext>();

interface LogContext {
  requestId: string;
  traceId?: string;
  spanId?: string;
  userId?: string;
  tenantId?: string;
  [key: string]: unknown;
}

class StructuredLogger {
  private service: string;
  private version: string;
  private environment: string;

  constructor(config: LoggerConfig) {
    this.service = config.service;
    this.version = config.version;
    this.environment = config.environment || process.env.NODE_ENV || 'development';
  }

  // Set context for the current async execution
  runWithContext<T>(context: LogContext, fn: () => T): T {
    return contextStorage.run(context, fn);
  }

  // Get current context
  getContext(): LogContext | undefined {
    return contextStorage.getStore();
  }

  // Core logging method
  private log(level: string, message: string, attributes: Record<string, unknown> = {}): void {
    const context = this.getContext() || {};

    const entry = {
      // Standard fields
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      version: this.version,
      environment: this.environment,

      // Context fields
      request_id: context.requestId,
      trace_id: context.traceId,
      span_id: context.spanId,
      user_id: context.userId,
      tenant_id: context.tenantId,

      // Custom attributes
      ...attributes
    };

    // Remove undefined values for cleaner output
    const cleanEntry = Object.fromEntries(
      Object.entries(entry).filter(([_, v]) => v !== undefined)
    );

    // Output as JSON
    console.log(JSON.stringify(cleanEntry));
  }

  // Level-specific methods
  trace(message: string, attributes?: Record<string, unknown>): void {
    this.log('trace', message, attributes);
  }

  debug(message: string, attributes?: Record<string, unknown>): void {
    this.log('debug', message, attributes);
  }

  info(message: string, attributes?: Record<string, unknown>): void {
    this.log('info', message, attributes);
  }

  warn(message: string, attributes?: Record<string, unknown>): void {
    this.log('warn', message, attributes);
  }

  error(message: string, error?: Error, attributes?: Record<string, unknown>): void {
    const errorInfo = error ? {
      error: {
        type: error.constructor.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      }
    } : {};

    this.log('error', message, { ...errorInfo, ...attributes });
  }

  fatal(message: string, error?: Error, attributes?: Record<string, unknown>): void {
    const errorInfo = error ? {
      error: {
        type: error.constructor.name,
        message: error.message,
        stack: error.stack,
        code: (error as any).code
      }
    } : {};

    this.log('fatal', message, { ...errorInfo, ...attributes });
  }

  // Specialized logging methods
  httpRequest(req: HttpRequestInfo, res: HttpResponseInfo): void {
    this.info('HTTP request completed', {
      http_method: req.method,
      http_path: req.path,
      http_status: res.status,
      http_duration_ms: res.duration,
      http_request_size: req.contentLength,
      http_response_size: res.contentLength,
      user_agent: req.userAgent,
      client_ip: req.clientIp
    });
  }

  databaseOperation(operation: string, table: string, duration: number, rowsAffected?: number): void {
    this.debug('Database operation completed', {
      db_operation: operation,
      db_table: table,
      db_duration_ms: duration,
      db_rows_affected: rowsAffected
    });
  }

  businessEvent(eventType: string, entityType: string, entityId: string, metadata?: Record<string, unknown>): void {
    this.info('Business event occurred', {
      event_type: eventType,
      entity_type: entityType,
      entity_id: entityId,
      event_metadata: metadata
    });
  }
}

// Export singleton instance
export const logger = new StructuredLogger({
  service: process.env.SERVICE_NAME || 'unknown',
  version: process.env.SERVICE_VERSION || '0.0.0',
  environment: process.env.NODE_ENV || 'development'
});
```

---

## Log Levels Guidelines

Use log levels consistently across your organization:

```typescript
// Log level guidelines with examples

// TRACE: Most detailed information, useful for deep debugging
// Use sparingly in production due to volume
logger.trace('Entering function', {
  function_name: 'processOrder',
  arguments: { orderId: '123' }
});

// DEBUG: Detailed information for debugging
// Typically disabled in production
logger.debug('Cache lookup result', {
  cache_key: 'user:456',
  cache_hit: true,
  ttl_remaining_seconds: 3600
});

// INFO: Important runtime events that show application progress
// This is your primary production logging level
logger.info('Order processed successfully', {
  order_id: 'order-123',
  total_amount: 99.99,
  items_count: 3,
  processing_time_ms: 150
});

// WARN: Something unexpected happened but the system can recover
// These should be investigated but are not immediately critical
logger.warn('Rate limit approaching threshold', {
  current_rate: 950,
  limit: 1000,
  window_seconds: 60,
  client_id: 'client-789'
});

// ERROR: An operation failed and could not be completed
// These need investigation and possibly immediate attention
logger.error('Payment processing failed', new PaymentError('Card declined'), {
  payment_id: 'pay-456',
  amount: 99.99,
  payment_method: 'credit_card',
  error_code: 'CARD_DECLINED'
});

// FATAL: System is in an unusable state and needs immediate attention
// Often triggers alerts and may indicate service failure
logger.fatal('Database connection pool exhausted', new Error('No connections available'), {
  pool_size: 100,
  active_connections: 100,
  waiting_requests: 50
});
```

---

## Adding Context to Logs

Build context throughout request processing:

```typescript
// middleware/logging.ts
// Express middleware for request context

import { Request, Response, NextFunction } from 'express';
import { logger } from '../logger';
import { v4 as uuidv4 } from 'uuid';

export function loggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Extract or generate request context
  const context = {
    requestId: req.headers['x-request-id'] as string || uuidv4(),
    traceId: req.headers['x-trace-id'] as string,
    spanId: req.headers['x-span-id'] as string,
    userId: (req as any).user?.id,
    tenantId: req.headers['x-tenant-id'] as string
  };

  // Run the request handler with context
  logger.runWithContext(context, () => {
    // Log request start
    logger.info('HTTP request started', {
      http_method: req.method,
      http_path: req.path,
      http_query: req.query,
      user_agent: req.get('user-agent'),
      client_ip: req.ip
    });

    // Capture response
    res.on('finish', () => {
      const duration = Date.now() - startTime;

      logger.httpRequest(
        {
          method: req.method,
          path: req.path,
          userAgent: req.get('user-agent'),
          clientIp: req.ip,
          contentLength: parseInt(req.get('content-length') || '0')
        },
        {
          status: res.statusCode,
          duration,
          contentLength: parseInt(res.get('content-length') || '0')
        }
      );
    });

    next();
  });
}

// Using context in service layer
export class OrderService {
  async createOrder(orderData: CreateOrderInput): Promise<Order> {
    // Context is automatically available from middleware
    logger.info('Creating order', {
      customer_id: orderData.customerId,
      items_count: orderData.items.length
    });

    try {
      // Validate inventory
      for (const item of orderData.items) {
        const available = await this.checkInventory(item.productId, item.quantity);

        if (!available) {
          logger.warn('Insufficient inventory', {
            product_id: item.productId,
            requested_quantity: item.quantity
          });

          throw new InsufficientInventoryError(item.productId);
        }
      }

      // Process payment
      const payment = await this.processPayment(orderData);

      logger.info('Payment processed', {
        payment_id: payment.id,
        amount: payment.amount,
        payment_method: payment.method
      });

      // Create order
      const order = await this.saveOrder(orderData, payment);

      // Log business event
      logger.businessEvent('order_created', 'order', order.id, {
        customer_id: order.customerId,
        total_amount: order.totalAmount,
        items_count: order.items.length
      });

      return order;

    } catch (error) {
      logger.error('Order creation failed', error as Error, {
        customer_id: orderData.customerId
      });
      throw error;
    }
  }
}
```

---

## Common Anti-Patterns to Avoid

### 1. Logging Sensitive Data

```typescript
// BAD: Logging sensitive information
logger.info('User authenticated', {
  email: user.email,
  password: user.password,      // Never log passwords
  ssn: user.ssn,                // Never log PII
  credit_card: user.cardNumber  // Never log financial data
});

// GOOD: Log only what you need
logger.info('User authenticated', {
  user_id: user.id,
  auth_method: 'password',
  mfa_used: true
});
```

### 2. High Cardinality Labels

```typescript
// BAD: Unbounded values as searchable fields
logger.info('Request processed', {
  unique_request_id: uuidv4(),    // Creates millions of unique values
  timestamp_nano: Date.now() * 1000000,  // Too granular
  full_request_body: req.body    // Unbounded size
});

// GOOD: Bounded, meaningful attributes
logger.info('Request processed', {
  endpoint_category: 'api',
  response_status_group: '2xx',
  content_type: 'application/json'
});
```

### 3. Logging in Tight Loops

```typescript
// BAD: Log every iteration
for (const item of items) {  // Could be millions of items
  logger.debug('Processing item', { item_id: item.id });
  await processItem(item);
}

// GOOD: Log summaries and samples
logger.info('Processing batch started', { batch_size: items.length });

let processed = 0;
let errors = 0;

for (const item of items) {
  try {
    await processItem(item);
    processed++;
  } catch (e) {
    errors++;
    // Log only errors, not every iteration
    if (errors <= 10) {  // Limit error log volume
      logger.error('Item processing failed', e as Error, { item_id: item.id });
    }
  }
}

logger.info('Processing batch completed', {
  batch_size: items.length,
  processed,
  errors
});
```

### 4. Inconsistent Naming

```typescript
// BAD: Inconsistent field names across services
// Service A:
logger.info('User action', { userId: '123' });
// Service B:
logger.info('User action', { user_id: '123' });
// Service C:
logger.info('User action', { userID: '123' });

// GOOD: Establish and follow naming conventions
// All services use snake_case:
logger.info('User action', { user_id: '123' });
```

---

## Logging Configuration

Make logging configurable per environment:

```typescript
// config/logging.ts
// Environment-specific logging configuration

interface LogConfig {
  level: string;
  format: 'json' | 'pretty';
  includeStackTrace: boolean;
  sampleRate: number;  // 0-1, percentage of debug logs to keep
}

const configs: Record<string, LogConfig> = {
  development: {
    level: 'debug',
    format: 'pretty',
    includeStackTrace: true,
    sampleRate: 1.0
  },
  staging: {
    level: 'debug',
    format: 'json',
    includeStackTrace: true,
    sampleRate: 0.1  // Sample 10% of debug logs
  },
  production: {
    level: 'info',
    format: 'json',
    includeStackTrace: false,  // Stack traces can leak info
    sampleRate: 0.01  // Sample 1% of debug logs
  }
};

export const logConfig = configs[process.env.NODE_ENV || 'development'];
```

---

## Summary

Structured logging is foundational to effective observability. Follow these principles:

1. **Design a schema first**: Agree on field names and types across your organization
2. **Use levels consistently**: Match the level to the importance and actionability
3. **Include context automatically**: Request IDs and trace IDs should flow through every log
4. **Avoid sensitive data**: Never log passwords, tokens, or PII
5. **Watch cardinality**: High-cardinality fields hurt query performance
6. **Log at boundaries**: HTTP requests, database calls, and external service interactions

The investment in proper structured logging pays off quickly when you need to debug a production issue at 3 AM. Good logs turn a multi-hour investigation into a few well-crafted queries.

---

*Want structured logging without the setup hassle? [OneUptime](https://oneuptime.com) provides built-in log management with automatic parsing, correlation with traces, and powerful querying - all without managing your own logging infrastructure.*
