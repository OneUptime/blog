````markdown
# How to Structure Logs Properly in OpenTelemetry: A Complete Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Logs, Logging, Observability, TypeScript, NodeJS, Structured Logging, Correlation

Description: A comprehensive guide to structuring logs properly in OpenTelemetry—mastering log correlation with traces, effective attribute usage, and implementing structured logging patterns that enhance debugging and observability.

---

> Logs are the detailed story of what happened in your application. When structured properly with OpenTelemetry, they become a powerful debugging tool that connects seamlessly with traces and metrics to give you complete observability.

The key to effective logging in OpenTelemetry isn't just about capturing events—it's about capturing them in a way that tells a coherent story, correlates with other telemetry data, and provides actionable insights when things go wrong.

---

## Why Structure Matters in OpenTelemetry Logging

Traditional logging often produces isolated events that are difficult to correlate and analyze at scale. OpenTelemetry structured logging solves this by:

- **Correlating logs with traces and spans** for complete request context
- **Standardizing log attributes** across services and teams
- **Enabling efficient querying** and filtering in observability platforms
- **Providing contextual enrichment** that makes debugging faster
- **Supporting distributed tracing correlation** across microservices

### The Problem with Unstructured Logs

```typescript
// ❌ Traditional unstructured logging
console.log("User login failed for john@example.com with invalid password");
console.log("Database query took 150ms for user lookup");
console.log("Payment processing failed - card declined");
```

These logs lack context, correlation, and structure—making them nearly impossible to analyze effectively in distributed systems.

### The OpenTelemetry Solution

```typescript
// ✅ Structured logging with OpenTelemetry
logger.info("User authentication failed", {
  "user.email": "john@example.com",
  "auth.failure_reason": "invalid_password",
  "auth.attempt_count": 3,
  "user.ip_address": "192.168.1.100"
});

logger.debug("Database query executed", {
  "db.operation": "SELECT",
  "db.table": "users",
  "db.duration_ms": 150,
  "db.query_hash": "abc123"
});

logger.error("Payment processing failed", {
  "payment.amount_usd": 99.99,
  "payment.method": "credit_card",
  "payment.failure_code": "card_declined",
  "order.id": "order-789"
});
```

---

## Setting Up OpenTelemetry Logging in Node.js

### Installation

```bash
npm install @opentelemetry/api \
            @opentelemetry/sdk-node \
            @opentelemetry/auto-instrumentations-node \
            @opentelemetry/exporter-otlp-http \
            @opentelemetry/instrumentation-winston \
            winston
```

### Basic OpenTelemetry Logging Setup

```typescript
// telemetry.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPLogExporter } from '@opentelemetry/exporter-otlp-http';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';

// Create an OTLP HTTP exporter for logs
const logExporter = new OTLPLogExporter({
  url: 'https://oneuptime.com/otlp/v1/logs',
  headers: {
    'x-oneuptime-token': process.env.ONEUPTIME_OTLP_TOKEN,
  },
});

// Create a log processor with the OTLP exporter
const logProcessor = new BatchLogRecordProcessor(logExporter, {
  exportTimeoutMillis: 5000,
  maxExportBatchSize: 100,
  scheduledDelayMillis: 2000,
});

// Initialize the SDK with logging support
const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'my-node-app',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.HOSTNAME || 'localhost',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  }),
  instrumentations: [
    getNodeAutoInstrumentations(),
    new WinstonInstrumentation({
      // Enable correlation with traces
      logHook: (span, record) => {
        if (span && span.spanContext().traceId) {
          record['trace_id'] = span.spanContext().traceId;
          record['span_id'] = span.spanContext().spanId;
        }
      },
    }),
  ],
  logRecordProcessor: logProcessor,
});

// Start the SDK
sdk.start();

console.log('OpenTelemetry logging initialized with OneUptime OTLP exporter');
```

### Winston Logger Configuration

```typescript
// logger.ts
import winston from 'winston';
import { trace, context } from '@opentelemetry/api';

// Custom format for OpenTelemetry correlation
const correlationFormat = winston.format((info) => {
  // Get the active span to correlate logs with traces
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    const spanContext = activeSpan.spanContext();
    info.trace_id = spanContext.traceId;
    info.span_id = spanContext.spanId;
    info.trace_flags = spanContext.traceFlags;
  }

  // Add service information
  info.service = {
    name: process.env.SERVICE_NAME || 'my-node-app',
    version: process.env.SERVICE_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };

  return info;
});

// Create the Winston logger with OpenTelemetry integration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
    }),
    correlationFormat(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    component: 'application'
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({
      filename: 'logs/app.log',
      maxsize: 10000000, // 10MB
      maxFiles: 5,
    }),
  ],
});

export { logger };
```

---

## Core Principles of Structured Logging

### 1. Trace and Span Correlation

The most powerful feature of OpenTelemetry logging is automatic correlation with traces and spans:

```typescript
// structured-logger.ts
import { logger } from './logger';
import { trace, SpanStatusCode } from '@opentelemetry/api';

export class StructuredLogger {
  // Log within an active span context
  static logInSpan(level: string, message: string, attributes: Record<string, any> = {}) {
    const activeSpan = trace.getActiveSpan();
    
    if (activeSpan) {
      // Add span context to log attributes
      const spanContext = activeSpan.spanContext();
      attributes.trace_id = spanContext.traceId;
      attributes.span_id = spanContext.spanId;
      
      // Add span information
      attributes.span_name = activeSpan.getAttributes()['span.name'] || 'unknown';
    }
    
    logger[level](message, attributes);
  }

  // Log with explicit correlation
  static logWithCorrelation(
    level: string, 
    message: string, 
    traceId: string, 
    spanId: string, 
    attributes: Record<string, any> = {}
  ) {
    logger[level](message, {
      ...attributes,
      trace_id: traceId,
      span_id: spanId,
    });
  }

  // Business event logging with correlation
  static logBusinessEvent(
    event: string, 
    entityType: string, 
    entityId: string, 
    attributes: Record<string, any> = {}
  ) {
    this.logInSpan('info', `Business event: ${event}`, {
      event_type: 'business',
      event_name: event,
      entity_type: entityType,
      entity_id: entityId,
      ...attributes,
    });
  }
}
```

### 2. Semantic Attributes and Conventions

Follow OpenTelemetry semantic conventions for consistent attribute naming:

```typescript
// semantic-logging.ts
import { StructuredLogger } from './structured-logger';
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';

export class SemanticLogger {
  // HTTP request logging
  static logHttpRequest(req: any, res: any, duration: number, error?: Error) {
    const attributes = {
      [SemanticAttributes.HTTP_METHOD]: req.method,
      [SemanticAttributes.HTTP_URL]: req.url,
      [SemanticAttributes.HTTP_STATUS_CODE]: res.statusCode,
      [SemanticAttributes.HTTP_RESPONSE_SIZE]: res.get('content-length') || 0,
      [SemanticAttributes.HTTP_REQUEST_SIZE]: req.get('content-length') || 0,
      [SemanticAttributes.USER_AGENT_ORIGINAL]: req.get('user-agent'),
      'http.duration_ms': duration,
      'http.route': req.route?.path,
    };

    if (error) {
      attributes.error = true;
      attributes.error_message = error.message;
      attributes.error_stack = error.stack;
      StructuredLogger.logInSpan('error', 'HTTP request failed', attributes);
    } else {
      StructuredLogger.logInSpan('info', 'HTTP request completed', attributes);
    }
  }

  // Database operation logging
  static logDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    rowsAffected?: number,
    error?: Error
  ) {
    const attributes = {
      [SemanticAttributes.DB_OPERATION]: operation,
      [SemanticAttributes.DB_SQL_TABLE]: table,
      'db.duration_ms': duration,
      'db.rows_affected': rowsAffected || 0,
    };

    if (error) {
      attributes.error = true;
      attributes.error_message = error.message;
      StructuredLogger.logInSpan('error', 'Database operation failed', attributes);
    } else {
      StructuredLogger.logInSpan('debug', 'Database operation completed', attributes);
    }
  }

  // User action logging
  static logUserAction(
    userId: string,
    action: string,
    resource: string,
    metadata: Record<string, any> = {}
  ) {
    StructuredLogger.logInSpan('info', 'User action performed', {
      'user.id': userId,
      'user.action': action,
      'user.resource': resource,
      event_type: 'user_action',
      ...metadata,
    });
  }
}
```

### 3. Express.js Middleware Integration

```typescript
// middleware/logging-middleware.ts
import { Request, Response, NextFunction } from 'express';
import { SemanticLogger } from '../semantic-logging';
import { trace, context } from '@opentelemetry/api';

interface LoggedRequest extends Request {
  startTime?: number;
  correlationId?: string;
}

export function loggingMiddleware(req: LoggedRequest, res: Response, next: NextFunction) {
  req.startTime = Date.now();
  req.correlationId = generateCorrelationId();

  // Create a span for the request
  const tracer = trace.getTracer('http-middleware');
  const span = tracer.startSpan(`${req.method} ${req.path}`);

  // Set request attributes on the span
  span.setAttributes({
    'http.method': req.method,
    'http.url': req.url,
    'http.user_agent': req.get('user-agent') || '',
    'correlation.id': req.correlationId,
  });

  // Log request start
  context.with(trace.setSpan(context.active(), span), () => {
    SemanticLogger.logHttpRequest(req, { statusCode: 0 }, 0);
  });

  // Override res.end to capture response
  const originalEnd = res.end;
  res.end = function(chunk: any, encoding?: any) {
    const duration = Date.now() - (req.startTime || Date.now());
    
    // Log request completion within span context
    context.with(trace.setSpan(context.active(), span), () => {
      SemanticLogger.logHttpRequest(req, res, duration);
    });

    span.end();
    originalEnd.call(this, chunk, encoding);
  };

  next();
}

function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
```

---

## Advanced Logging Patterns

### 1. Contextual Log Enrichment

```typescript
// context-enricher.ts
import { AsyncLocalStorage } from 'async_hooks';
import { logger } from './logger';

interface RequestContext {
  correlationId: string;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
  requestId?: string;
}

export class ContextEnricher {
  private static storage = new AsyncLocalStorage<RequestContext>();

  // Set context for the current async execution
  static setContext(context: RequestContext, fn: () => void) {
    this.storage.run(context, fn);
  }

  // Get current context
  static getContext(): RequestContext | undefined {
    return this.storage.getStore();
  }

  // Enhanced logger that automatically includes context
  static createContextLogger() {
    return {
      info: (message: string, attributes: Record<string, any> = {}) => {
        const context = this.getContext();
        logger.info(message, { ...attributes, ...context });
      },
      warn: (message: string, attributes: Record<string, any> = {}) => {
        const context = this.getContext();
        logger.warn(message, { ...attributes, ...context });
      },
      error: (message: string, attributes: Record<string, any> = {}) => {
        const context = this.getContext();
        logger.error(message, { ...attributes, ...context });
      },
      debug: (message: string, attributes: Record<string, any> = {}) => {
        const context = this.getContext();
        logger.debug(message, { ...attributes, ...context });
      },
    };
  }
}

// Usage in Express middleware
export function contextMiddleware(req: any, res: Response, next: NextFunction) {
  const context: RequestContext = {
    correlationId: req.correlationId || generateCorrelationId(),
    userId: req.user?.id,
    tenantId: req.tenant?.id,
    sessionId: req.session?.id,
    requestId: req.id,
  };

  ContextEnricher.setContext(context, () => {
    next();
  });
}
```

### 2. Error Logging with Stack Traces

```typescript
// error-logging.ts
import { StructuredLogger } from './structured-logger';
import { trace, SpanStatusCode } from '@opentelemetry/api';

export class ErrorLogger {
  static logError(error: Error, context: Record<string, any> = {}) {
    const activeSpan = trace.getActiveSpan();
    
    // Mark span as error if available
    if (activeSpan) {
      activeSpan.recordException(error);
      activeSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });
    }

    StructuredLogger.logInSpan('error', error.message, {
      error_type: error.constructor.name,
      error_message: error.message,
      error_stack: error.stack,
      error_code: (error as any).code,
      ...context,
    });
  }

  static logBusinessError(
    errorCode: string,
    errorMessage: string,
    entityType: string,
    entityId: string,
    metadata: Record<string, any> = {}
  ) {
    StructuredLogger.logInSpan('error', errorMessage, {
      error_type: 'business_error',
      error_code: errorCode,
      error_message: errorMessage,
      entity_type: entityType,
      entity_id: entityId,
      ...metadata,
    });
  }

  static async logAsyncError<T>(
    operation: string,
    fn: () => Promise<T>,
    context: Record<string, any> = {}
  ): Promise<T> {
    try {
      StructuredLogger.logInSpan('debug', `Starting operation: ${operation}`, context);
      const result = await fn();
      StructuredLogger.logInSpan('debug', `Completed operation: ${operation}`, context);
      return result;
    } catch (error) {
      this.logError(error as Error, {
        operation,
        ...context,
      });
      throw error;
    }
  }
}
```

### 3. Performance Logging

```typescript
// performance-logging.ts
import { StructuredLogger } from './structured-logger';

export class PerformanceLogger {
  static timeOperation<T>(
    operationName: string,
    fn: () => T,
    context: Record<string, any> = {}
  ): T {
    const startTime = process.hrtime.bigint();
    
    try {
      const result = fn();
      const duration = Number(process.hrtime.bigint() - startTime) / 1e6; // Convert to ms
      
      StructuredLogger.logInSpan('debug', `Operation completed: ${operationName}`, {
        operation_name: operationName,
        duration_ms: duration,
        status: 'success',
        ...context,
      });
      
      return result;
    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1e6;
      
      StructuredLogger.logInSpan('error', `Operation failed: ${operationName}`, {
        operation_name: operationName,
        duration_ms: duration,
        status: 'error',
        error_message: (error as Error).message,
        ...context,
      });
      
      throw error;
    }
  }

  static async timeAsyncOperation<T>(
    operationName: string,
    fn: () => Promise<T>,
    context: Record<string, any> = {}
  ): Promise<T> {
    const startTime = process.hrtime.bigint();
    
    try {
      const result = await fn();
      const duration = Number(process.hrtime.bigint() - startTime) / 1e6;
      
      StructuredLogger.logInSpan('debug', `Async operation completed: ${operationName}`, {
        operation_name: operationName,
        duration_ms: duration,
        status: 'success',
        ...context,
      });
      
      return result;
    } catch (error) {
      const duration = Number(process.hrtime.bigint() - startTime) / 1e6;
      
      StructuredLogger.logInSpan('error', `Async operation failed: ${operationName}`, {
        operation_name: operationName,
        duration_ms: duration,
        status: 'error',
        error_message: (error as Error).message,
        ...context,
      });
      
      throw error;
    }
  }
}
```

---

## Real-World Implementation Examples

### 1. User Service with Comprehensive Logging

```typescript
// services/user-service.ts
import { SemanticLogger } from '../semantic-logging';
import { ErrorLogger } from '../error-logging';
import { PerformanceLogger } from '../performance-logging';
import { StructuredLogger } from '../structured-logger';

export class UserService {
  async createUser(userData: any): Promise<any> {
    return PerformanceLogger.timeAsyncOperation(
      'user_creation',
      async () => {
        StructuredLogger.logBusinessEvent(
          'user_creation_started',
          'user',
          userData.email,
          {
            user_data: {
              email: userData.email,
              role: userData.role,
              source: userData.source,
            }
          }
        );

        try {
          // Validate user data
          this.validateUserData(userData);

          // Check if user exists
          const existingUser = await this.findUserByEmail(userData.email);
          if (existingUser) {
            ErrorLogger.logBusinessError(
              'USER_ALREADY_EXISTS',
              'User with this email already exists',
              'user',
              userData.email,
              { attempted_email: userData.email }
            );
            throw new Error('User already exists');
          }

          // Create user in database
          const user = await this.saveUserToDatabase(userData);

          // Log successful creation
          StructuredLogger.logBusinessEvent(
            'user_created',
            'user',
            user.id,
            {
              user_id: user.id,
              user_email: user.email,
              user_role: user.role,
              created_at: user.createdAt,
            }
          );

          // Send welcome email
          await this.sendWelcomeEmail(user);

          return user;
        } catch (error) {
          ErrorLogger.logError(error as Error, {
            operation: 'user_creation',
            user_email: userData.email,
          });
          throw error;
        }
      },
      { operation_type: 'user_management' }
    );
  }

  private async findUserByEmail(email: string): Promise<any> {
    return PerformanceLogger.timeAsyncOperation(
      'database_user_lookup',
      async () => {
        SemanticLogger.logDatabaseOperation(
          'SELECT',
          'users',
          0, // Duration will be set by the performance logger
          0
        );
        
        // Simulate database call
        return null; // User not found
      },
      {
        query_type: 'user_lookup',
        lookup_field: 'email',
      }
    );
  }

  private validateUserData(userData: any): void {
    StructuredLogger.logInSpan('debug', 'Validating user data', {
      validation_fields: Object.keys(userData),
    });

    if (!userData.email || !userData.email.includes('@')) {
      ErrorLogger.logBusinessError(
        'INVALID_EMAIL',
        'Invalid email format provided',
        'user',
        userData.email || 'unknown'
      );
      throw new Error('Invalid email format');
    }

    // More validation...
  }

  private async saveUserToDatabase(userData: any): Promise<any> {
    return PerformanceLogger.timeAsyncOperation(
      'database_user_insert',
      async () => {
        // Simulate database save
        const user = {
          id: `user_${Date.now()}`,
          ...userData,
          createdAt: new Date().toISOString(),
        };

        SemanticLogger.logDatabaseOperation(
          'INSERT',
          'users',
          50, // Simulated duration
          1 // One row affected
        );

        return user;
      },
      { operation_type: 'persistence' }
    );
  }

  private async sendWelcomeEmail(user: any): Promise<void> {
    try {
      StructuredLogger.logInSpan('info', 'Sending welcome email', {
        user_id: user.id,
        user_email: user.email,
        email_type: 'welcome',
      });

      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 100));

      StructuredLogger.logInSpan('info', 'Welcome email sent successfully', {
        user_id: user.id,
        user_email: user.email,
        email_type: 'welcome',
        status: 'sent',
      });
    } catch (error) {
      ErrorLogger.logError(error as Error, {
        operation: 'welcome_email',
        user_id: user.id,
        user_email: user.email,
      });
      // Don't throw - welcome email failure shouldn't fail user creation
    }
  }
}
```

### 2. API Route with Full Logging

```typescript
// routes/users.ts
import { Router, Request, Response } from 'express';
import { UserService } from '../services/user-service';
import { ContextEnricher } from '../context-enricher';
import { trace } from '@opentelemetry/api';

const router = Router();
const userService = new UserService();
const contextLogger = ContextEnricher.createContextLogger();

router.post('/users', async (req: Request, res: Response) => {
  const tracer = trace.getTracer('user-api');
  const span = tracer.startSpan('POST /users');

  try {
    span.setAttributes({
      'http.method': 'POST',
      'http.route': '/users',
      'request.body_size': JSON.stringify(req.body).length,
    });

    contextLogger.info('User creation request received', {
      request_id: req.id,
      body_keys: Object.keys(req.body),
    });

    // Validate request
    if (!req.body.email) {
      contextLogger.warn('Invalid request - missing email', {
        request_body: req.body,
      });
      
      span.setAttributes({
        'error': true,
        'error.type': 'validation_error',
      });
      
      return res.status(400).json({
        error: 'Email is required',
        code: 'MISSING_EMAIL'
      });
    }

    // Create user
    const user = await userService.createUser(req.body);

    contextLogger.info('User created successfully', {
      user_id: user.id,
      user_email: user.email,
    });

    span.setAttributes({
      'user.id': user.id,
      'user.email': user.email,
      'response.status_code': 201,
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      }
    });

  } catch (error) {
    contextLogger.error('User creation failed', {
      error_message: (error as Error).message,
      request_body: req.body,
    });

    span.setAttributes({
      'error': true,
      'error.message': (error as Error).message,
      'response.status_code': 500,
    });

    res.status(500).json({
      error: 'Internal server error',
      message: (error as Error).message
    });
  } finally {
    span.end();
  }
});

export { router as userRoutes };
```

---

## Best Practices and Anti-Patterns

### ✅ Best Practices

1. **Always correlate with traces**
```typescript
// Always log within span context for correlation
StructuredLogger.logInSpan('info', 'Operation completed', attributes);
```

2. **Use semantic attributes**
```typescript
// Follow OpenTelemetry semantic conventions
{
  [SemanticAttributes.HTTP_METHOD]: 'POST',
  [SemanticAttributes.HTTP_STATUS_CODE]: 200,
  [SemanticAttributes.USER_ID]: userId,
}
```

3. **Structure your log levels appropriately**
```typescript
// ERROR: System errors, exceptions, failures
// WARN: Recoverable errors, deprecated usage, unusual conditions
// INFO: Important business events, request/response logging
// DEBUG: Detailed execution flow, debugging information
```

4. **Include contextual information**
```typescript
// Rich context helps with debugging
logger.info('Payment processed', {
  payment_id: 'pay_123',
  amount_usd: 99.99,
  user_id: 'user_456',
  merchant_id: 'merchant_789',
  payment_method: 'credit_card',
  currency: 'USD',
  processing_time_ms: 1500,
});
```

### ❌ Anti-Patterns

1. **Logging sensitive information**
```typescript
// DON'T: Log sensitive data
logger.info('User login', {
  password: user.password, // ❌ Never log passwords
  credit_card: user.card,  // ❌ Never log PII
});

// DO: Log safely
logger.info('User login', {
  user_id: user.id,
  login_method: 'password',
  has_mfa: user.mfaEnabled,
});
```

2. **High-cardinality attributes**
```typescript
// DON'T: Use unbounded values as attributes
logger.info('Request processed', {
  timestamp: new Date().toISOString(), // ❌ High cardinality
  unique_id: generateUniqueId(),       // ❌ Unbounded values
});

// DO: Use bounded, meaningful attributes
logger.info('Request processed', {
  request_type: 'api',
  endpoint_category: 'user_management',
  status: 'success',
});
```

3. **Logging in loops without throttling**
```typescript
// DON'T: Log every iteration
items.forEach(item => {
  logger.debug('Processing item', { item_id: item.id }); // ❌ Too many logs
});

// DO: Log summaries or sample
logger.info('Processing items batch', { 
  batch_size: items.length,
  batch_id: batchId 
});
```

---

## Log Aggregation and Analysis

### Querying Structured Logs in OneUptime

With proper structured logging, you can perform powerful queries in OneUptime:

```sql
-- Find all failed user creation attempts
SELECT * FROM logs 
WHERE event_name = 'user_creation_started' 
  AND error = true
  AND timestamp > NOW() - INTERVAL 1 DAY;

-- Correlate logs with traces for a specific user
SELECT * FROM logs 
WHERE user_id = 'user_123'
  AND trace_id = 'abc123xyz'
ORDER BY timestamp;

-- Find slow database operations
SELECT operation_name, AVG(duration_ms) 
FROM logs 
WHERE operation_name LIKE 'database_%'
  AND duration_ms > 1000
GROUP BY operation_name;
```

### Creating Effective Log-Based Alerts

```typescript
// Example alert conditions in OneUptime
const alertConditions = {
  // High error rate
  errorRate: {
    query: "level='error' AND service.name='user-service'",
    threshold: "count > 10 in 5 minutes",
    severity: "critical"
  },
  
  // Slow operations
  slowOperations: {
    query: "duration_ms > 5000 AND operation_type='user_creation'",
    threshold: "count > 5 in 10 minutes",
    severity: "warning"
  },
  
  // Business events
  lowSignups: {
    query: "event_name='user_created'",
    threshold: "count < 1 in 1 hour",
    severity: "warning"
  }
};
```

---

## Final Thoughts

Proper log structuring in OpenTelemetry transforms your logs from simple text records into powerful observability data that correlates seamlessly with traces and metrics. The key principles are:

1. **Correlation is king**: Always link logs to traces and spans
2. **Structure everything**: Use consistent attribute naming and semantic conventions
3. **Context matters**: Include relevant business and technical context
4. **Sample intelligently**: Not every log needs to be collected at full rate
5. **Test your logging**: Ensure your log structure works as expected

Remember:

- **Logs tell you WHY** something happened in your system
- **Structured logs enable powerful querying** and analysis
- **Correlation with traces** makes debugging dramatically faster
- **Consistent attribute naming** improves searchability across services

Start with basic correlation and semantic attributes, then gradually add more sophisticated patterns like contextual enrichment and smart sampling as your observability needs grow.

> Great logging isn't about capturing everything—it's about capturing the right things in the right way, so when problems occur, you have the context you need to solve them quickly.

---

*Ready to implement structured logging with OpenTelemetry? [OneUptime](https://oneuptime.com) provides complete log management with native OpenTelemetry support, automatic correlation with traces and metrics, and powerful querying capabilities to help you debug faster and understand your systems better.*