# How to Structure Logs Properly in OpenTelemetry: A Complete Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Logs, Logging, Observability, TypeScript, NodeJS, Structured Logging, Correlation

Description: A comprehensive guide to structuring logs properly in OpenTelemetry- mastering log correlation with traces, effective attribute usage, and implementing structured logging patterns that enhance debugging and observability.

---

> Logs are the detailed story of what happened in your application. When structured properly with OpenTelemetry, they become a powerful debugging tool that connects seamlessly with traces and metrics to give you complete observability.

The key to effective logging in OpenTelemetry isn't just about capturing events- it's about capturing them in a way that tells a coherent story, correlates with other telemetry data, and provides actionable insights when things go wrong.

---

## Why Structure Matters in OpenTelemetry Logging

Traditional logging often produces isolated events that are difficult to correlate and analyze at scale. OpenTelemetry structured logging solves this by:

- **Correlating logs with traces and spans** for complete request context
- **Standardizing log attributes** across services and teams
- **Enabling efficient querying** and filtering in observability platforms
- **Providing contextual enrichment** that makes debugging faster
- **Supporting distributed tracing correlation** across microservices

### The Problem with Unstructured Logs

These unstructured log statements demonstrate the common anti-pattern of embedding data directly into message strings. When you need to analyze thousands of these logs, you can't filter by user, query duration ranges, or error types without complex regex parsing.

```typescript
// ❌ Traditional unstructured logging - hard to query and analyze
console.log("User login failed for john@example.com with invalid password");
console.log("Database query took 150ms for user lookup");
console.log("Payment processing failed - card declined");
```

These logs lack context, correlation, and structure- making them nearly impossible to analyze effectively in distributed systems.

### The OpenTelemetry Solution

Structured logging separates the log message from its data attributes. Each piece of information becomes a queryable field, enabling you to filter logs by user email, duration thresholds, error codes, or any combination of attributes.

```typescript
// ✅ Structured logging with OpenTelemetry
// Each attribute is a separate queryable field in your observability platform
logger.info("User authentication failed", {
  "user.email": "john@example.com",       // Queryable: find all logs for a specific user
  "auth.failure_reason": "invalid_password", // Filter by failure type
  "auth.attempt_count": 3,                // Alert when attempts exceed threshold
  "user.ip_address": "192.168.1.100"      // Track suspicious IPs
});

logger.debug("Database query executed", {
  "db.operation": "SELECT",               // Group by operation type
  "db.table": "users",                    // Filter by table
  "db.duration_ms": 150,                  // Create latency percentile charts
  "db.query_hash": "abc123"               // Identify slow query patterns
});

logger.error("Payment processing failed", {
  "payment.amount_usd": 99.99,            // Calculate failed payment volume
  "payment.method": "credit_card",        // Analyze failures by method
  "payment.failure_code": "card_declined", // Group by failure reason
  "order.id": "order-789"                 // Correlate with order details
});
```

---

## Setting Up OpenTelemetry Logging in Node.js

### Installation

Install the OpenTelemetry SDK along with auto-instrumentation packages and Winston for logging. The auto-instrumentations package automatically captures telemetry from common Node.js libraries.

```bash
npm install @opentelemetry/api \
            @opentelemetry/sdk-node \
            @opentelemetry/auto-instrumentations-node \
            @opentelemetry/exporter-otlp-http \
            @opentelemetry/instrumentation-winston \
            winston
```

### Basic OpenTelemetry Logging Setup

This configuration initializes OpenTelemetry with log export to an OTLP endpoint. The key integration is the `WinstonInstrumentation` which automatically injects trace and span IDs into every Winston log entry, enabling correlation between logs and distributed traces.

```typescript
// telemetry.ts - Initialize OpenTelemetry with logging support
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPLogExporter } from '@opentelemetry/exporter-otlp-http';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';

// Configure OTLP exporter to send logs to your observability backend
const logExporter = new OTLPLogExporter({
  url: 'https://oneuptime.com/otlp/v1/logs',  // OTLP HTTP endpoint
  headers: {
    'x-oneuptime-token': process.env.ONEUPTIME_OTLP_TOKEN,  // Auth token
  },
});

// Batch processor improves performance by grouping logs before sending
const logProcessor = new BatchLogRecordProcessor(logExporter, {
  exportTimeoutMillis: 5000,      // Max time to wait for export
  maxExportBatchSize: 100,        // Max logs per batch
  scheduledDelayMillis: 2000,     // Time between batch exports
});

// Initialize the OpenTelemetry SDK with service metadata and instrumentations
const sdk = new NodeSDK({
  // Resource attributes identify your service in the observability platform
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'my-node-app',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: process.env.HOSTNAME || 'localhost',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  }),
  instrumentations: [
    // Auto-instrument common Node.js libraries (http, express, pg, etc.)
    getNodeAutoInstrumentations(),
    // Winston instrumentation automatically adds trace context to logs
    new WinstonInstrumentation({
      // logHook runs for each log entry within an active span
      logHook: (span, record) => {
        if (span && span.spanContext().traceId) {
          // Inject trace IDs for log-to-trace correlation
          record['trace_id'] = span.spanContext().traceId;
          record['span_id'] = span.spanContext().spanId;
        }
      },
    }),
  ],
  logRecordProcessor: logProcessor,
});

// Start telemetry collection - call this before your app starts
sdk.start();

console.log('OpenTelemetry logging initialized with OneUptime OTLP exporter');
```

### Winston Logger Configuration

This Winston configuration creates a production-ready logger that automatically injects OpenTelemetry trace context. The custom `correlationFormat` extracts trace and span IDs from the active span, enabling you to click from a log entry directly to its distributed trace.

```typescript
// logger.ts - Winston logger with OpenTelemetry trace correlation
import winston from 'winston';
import { trace, context } from '@opentelemetry/api';

// Custom Winston format that injects OpenTelemetry trace context
const correlationFormat = winston.format((info) => {
  // Look up the currently active span from OpenTelemetry context
  const activeSpan = trace.getActiveSpan();
  if (activeSpan) {
    const spanContext = activeSpan.spanContext();
    // These IDs enable log-to-trace correlation in your observability UI
    info.trace_id = spanContext.traceId;   // Links to distributed trace
    info.span_id = spanContext.spanId;     // Links to specific operation
    info.trace_flags = spanContext.traceFlags;  // Sampling decision
  }

  // Include service metadata for filtering in multi-service environments
  info.service = {
    name: process.env.SERVICE_NAME || 'my-node-app',
    version: process.env.SERVICE_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };

  return info;
});

// Create Winston logger with combined formatting and multiple transports
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',  // Configurable via environment
  format: winston.format.combine(
    // ISO 8601 timestamp for consistent time parsing
    winston.format.timestamp({
      format: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
    }),
    correlationFormat(),                    // Inject trace context
    winston.format.errors({ stack: true }), // Include stack traces for errors
    winston.format.json()                   // Output as JSON for parsing
  ),
  defaultMeta: {
    component: 'application'  // Default field added to all logs
  },
  transports: [
    // Console transport with colors for local development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // File transport with rotation for production
    new winston.transports.File({
      filename: 'logs/app.log',
      maxsize: 10000000,  // Rotate at 10MB
      maxFiles: 5,        // Keep 5 rotated files
    }),
  ],
});

export { logger };
```

---

## Core Principles of Structured Logging

### 1. Trace and Span Correlation

The most powerful feature of OpenTelemetry logging is automatic correlation with traces and spans. This `StructuredLogger` class provides methods that automatically extract trace context from the current execution and attach it to log entries, enabling seamless navigation between logs and traces.

```typescript
// structured-logger.ts - Logger wrapper with automatic trace correlation
import { logger } from './logger';
import { trace, SpanStatusCode } from '@opentelemetry/api';

export class StructuredLogger {
  /**
   * Log a message with automatic trace context from the active span.
   * Use this for all logging within traced operations.
   */
  static logInSpan(level: string, message: string, attributes: Record<string, any> = {}) {
    const activeSpan = trace.getActiveSpan();

    if (activeSpan) {
      // Extract trace context for correlation in observability UI
      const spanContext = activeSpan.spanContext();
      attributes.trace_id = spanContext.traceId;  // Links to distributed trace
      attributes.span_id = spanContext.spanId;    // Links to specific span

      // Include span name for context without querying traces
      attributes.span_name = activeSpan.getAttributes()['span.name'] || 'unknown';
    }

    // Delegate to Winston logger with enriched attributes
    logger[level](message, attributes);
  }

  /**
   * Log with explicit trace correlation IDs.
   * Use when logging outside of an active span context (e.g., from queued jobs).
   */
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

  /**
   * Log business domain events with consistent structure.
   * Use for important business milestones: user signups, orders, payments, etc.
   */
  static logBusinessEvent(
    event: string,
    entityType: string,
    entityId: string,
    attributes: Record<string, any> = {}
  ) {
    this.logInSpan('info', `Business event: ${event}`, {
      event_type: 'business',     // Differentiates from technical logs
      event_name: event,          // e.g., 'user_created', 'order_placed'
      entity_type: entityType,    // e.g., 'user', 'order', 'payment'
      entity_id: entityId,        // Primary key of the entity
      ...attributes,
    });
  }
}
```

### 2. Semantic Attributes and Conventions

OpenTelemetry defines semantic conventions for common telemetry attributes. Using these standard names ensures consistency across services, languages, and teams. This `SemanticLogger` class wraps common operations with properly named attributes.

```typescript
// semantic-logging.ts - Logging helpers using OpenTelemetry semantic conventions
import { StructuredLogger } from './structured-logger';
import { SemanticAttributes } from '@opentelemetry/semantic-conventions';

export class SemanticLogger {
  /**
   * Log HTTP request completion with standard semantic attributes.
   * Captures method, URL, status, timing, and size for request analysis.
   */
  static logHttpRequest(req: any, res: any, duration: number, error?: Error) {
    const attributes = {
      // Standard OTel semantic attributes for HTTP
      [SemanticAttributes.HTTP_METHOD]: req.method,       // GET, POST, etc.
      [SemanticAttributes.HTTP_URL]: req.url,             // Full request URL
      [SemanticAttributes.HTTP_STATUS_CODE]: res.statusCode,  // 200, 404, 500, etc.
      [SemanticAttributes.HTTP_RESPONSE_SIZE]: res.get('content-length') || 0,
      [SemanticAttributes.HTTP_REQUEST_SIZE]: req.get('content-length') || 0,
      [SemanticAttributes.USER_AGENT_ORIGINAL]: req.get('user-agent'),
      // Custom attributes for latency analysis
      'http.duration_ms': duration,                       // Request processing time
      'http.route': req.route?.path,                      // Route pattern for grouping
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

  /**
   * Log database operations with semantic attributes.
   * Enables query performance analysis and error tracking by table/operation.
   */
  static logDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    rowsAffected?: number,
    error?: Error
  ) {
    const attributes = {
      // Standard OTel semantic attributes for databases
      [SemanticAttributes.DB_OPERATION]: operation,  // SELECT, INSERT, UPDATE, DELETE
      [SemanticAttributes.DB_SQL_TABLE]: table,      // Table name for filtering
      'db.duration_ms': duration,                    // Query execution time
      'db.rows_affected': rowsAffected || 0,         // For mutation tracking
    };

    if (error) {
      attributes.error = true;
      attributes.error_message = error.message;
      StructuredLogger.logInSpan('error', 'Database operation failed', attributes);
    } else {
      // Use debug level for routine DB operations to reduce noise
      StructuredLogger.logInSpan('debug', 'Database operation completed', attributes);
    }
  }

  /**
   * Log user actions for audit trails and behavior analysis.
   * Use for significant user interactions like logins, settings changes, etc.
   */
  static logUserAction(
    userId: string,
    action: string,
    resource: string,
    metadata: Record<string, any> = {}
  ) {
    StructuredLogger.logInSpan('info', 'User action performed', {
      'user.id': userId,           // Who performed the action
      'user.action': action,       // What they did (e.g., 'login', 'update_profile')
      'user.resource': resource,   // What they acted on
      event_type: 'user_action',   // Categorize for filtering
      ...metadata,
    });
  }
}
```

### 3. Express.js Middleware Integration

This middleware automatically logs every HTTP request with timing, trace correlation, and the request ID that's returned to clients. It wraps `res.end` to capture the response after the route handler completes, enabling accurate duration measurement.

```typescript
// middleware/logging-middleware.ts - Automatic request logging for Express
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

AsyncLocalStorage allows you to maintain request-scoped context without explicitly passing it through every function call. This enricher automatically adds user ID, tenant ID, and correlation IDs to all logs within a request's execution flow.

```typescript
// context-enricher.ts - Request-scoped logging context using AsyncLocalStorage
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

This error logger not only captures error details in logs but also marks the active OpenTelemetry span as errored, ensuring errors appear in both your log search and trace analysis views with synchronized context.

```typescript
// error-logging.ts - Unified error logging for logs and traces
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

These performance helpers wrap operations with high-precision timing using `process.hrtime.bigint()`. They automatically log the operation duration on both success and failure, making it easy to identify slow operations and build performance dashboards.

```typescript
// performance-logging.ts - Timing helpers for operation performance tracking
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

This real-world service demonstrates how to combine the logging utilities into a cohesive implementation. Notice how business events, database operations, and errors are all logged with consistent structure and automatic trace correlation.

```typescript
// services/user-service.ts - Example service with comprehensive structured logging
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

This Express route handler shows the complete pattern: creating a span for the request, logging at the start and end, setting span attributes for trace analysis, and ensuring errors are properly captured and logged.

```typescript
// routes/users.ts - API endpoint with full observability integration
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

> Great logging isn't about capturing everything- it's about capturing the right things in the right way, so when problems occur, you have the context you need to solve them quickly.

---

*Ready to implement structured logging with OpenTelemetry? [OneUptime](https://oneuptime.com) provides complete log management with native OpenTelemetry support, automatic correlation with traces and metrics, and powerful querying capabilities to help you debug faster and understand your systems better.*

**Related Reading:**

- [What are Traces and Spans in OpenTelemetry: A Practical Guide](https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view)
- [How to name spans in OpenTelemetry?](https://oneuptime.com/blog/post/2024-11-04-how-to-name-spans-in-opentelemetry/view)
- [Logs, Metrics & Traces: Turning Three Noisy Streams into One Story](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)