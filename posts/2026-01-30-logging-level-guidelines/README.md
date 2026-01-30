# How to Create Log Level Guidelines

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Logging, Observability, Best Practices, DevOps

Description: Establish clear log level guidelines for DEBUG, INFO, WARN, and ERROR with practical examples for consistent, actionable logging.

---

> Inconsistent log levels across your codebase make debugging harder than it needs to be. When one developer logs everything as INFO and another reserves it for critical events, your log analysis becomes a guessing game.

This guide provides a framework for establishing log level guidelines that your team can adopt. The goal is to create consistent, predictable logging that helps you find problems fast and reduces noise in production.

---

## The Four Standard Log Levels

Most logging frameworks support the same core log levels. Here is what each level means and when to use it.

| Level | Purpose | Production Volume | Alerts |
|-------|---------|-------------------|--------|
| ERROR | System failures requiring attention | Low | Yes |
| WARN | Potential problems, recoverable errors | Low to Medium | Sometimes |
| INFO | Significant business events | Medium | No |
| DEBUG | Detailed execution flow | Off in production | No |

Some frameworks add TRACE (more verbose than DEBUG) and FATAL (more severe than ERROR). This guide focuses on the four levels that appear in almost every logging library.

---

## Log Level Definitions

### ERROR - Something Broke

Use ERROR when the system cannot complete a requested operation. This level indicates a failure that requires investigation.

The following example shows proper ERROR logging for different failure scenarios. Notice that each log includes context about what failed and why, without exposing sensitive data.

```typescript
// error-examples.ts - When to use ERROR level

import { logger } from './logger';

// Database connection failures
// Use ERROR because the system cannot function without the database
async function connectToDatabase(): Promise<void> {
  try {
    await db.connect();
    logger.info('Database connection established');
  } catch (error) {
    logger.error('Database connection failed', {
      error_message: error.message,
      error_code: error.code,
      db_host: process.env.DB_HOST,
      retry_count: 3,
    });
    throw error;
  }
}

// External service failures that block user requests
// Use ERROR because the user's action cannot complete
async function processPayment(orderId: string, amount: number): Promise<void> {
  try {
    const result = await paymentGateway.charge(amount);
    logger.info('Payment processed', { order_id: orderId, amount });
  } catch (error) {
    logger.error('Payment processing failed', {
      order_id: orderId,
      amount,
      error_message: error.message,
      payment_provider: 'stripe',
      // Never log card numbers or CVV
    });
    throw error;
  }
}

// Unhandled exceptions in request handlers
// Use ERROR because something unexpected happened
function handleUncaughtError(error: Error, req: Request): void {
  logger.error('Unhandled exception in request handler', {
    error_message: error.message,
    error_stack: error.stack,
    request_method: req.method,
    request_path: req.path,
    request_id: req.id,
  });
}
```

**ERROR Checklist:**

- The operation cannot complete successfully
- User-facing functionality is broken
- Manual intervention may be required
- The error is not expected during normal operation

### WARN - Something Might Be Wrong

Use WARN for situations that are unusual but not immediately harmful. Warnings indicate conditions that could become problems or deserve attention.

This example demonstrates WARN logging for degraded conditions. These situations allow the system to continue but signal that something needs attention.

```typescript
// warn-examples.ts - When to use WARN level

import { logger } from './logger';

// Deprecation warnings
// Use WARN to flag code that will break in future versions
function legacyApiEndpoint(req: Request, res: Response): void {
  logger.warn('Deprecated API endpoint called', {
    endpoint: '/api/v1/users',
    replacement: '/api/v2/users',
    client_ip: req.ip,
    user_agent: req.headers['user-agent'],
    deprecation_date: '2026-06-01',
  });
  // Continue processing the request
}

// Resource usage approaching limits
// Use WARN before hitting hard limits that cause errors
function checkMemoryUsage(): void {
  const used = process.memoryUsage();
  const heapPercentage = (used.heapUsed / used.heapTotal) * 100;

  if (heapPercentage > 85) {
    logger.warn('Memory usage approaching limit', {
      heap_used_mb: Math.round(used.heapUsed / 1024 / 1024),
      heap_total_mb: Math.round(used.heapTotal / 1024 / 1024),
      heap_percentage: heapPercentage.toFixed(1),
    });
  }
}

// Retry succeeded after temporary failure
// Use WARN because initial failure indicates instability
async function fetchWithRetry(url: string, maxRetries: number): Promise<Response> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);

      if (attempt > 1) {
        logger.warn('Request succeeded after retry', {
          url,
          attempt,
          total_attempts: maxRetries,
          previous_error: lastError?.message,
        });
      }

      return response;
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        throw error;
      }

      await sleep(1000 * attempt); // Exponential backoff
    }
  }
}

// Configuration using default values
// Use WARN when defaults might not be appropriate for production
function loadConfiguration(): Config {
  const port = process.env.PORT || '3000';

  if (!process.env.PORT) {
    logger.warn('PORT not configured, using default', {
      default_port: 3000,
      environment: process.env.NODE_ENV,
    });
  }

  return { port: parseInt(port) };
}

// Rate limit approaching
// Use WARN to signal that throttling may happen soon
function checkRateLimit(userId: string, current: number, limit: number): void {
  const percentage = (current / limit) * 100;

  if (percentage > 80) {
    logger.warn('Rate limit threshold approaching', {
      user_id: userId,
      current_count: current,
      limit,
      percentage: percentage.toFixed(1),
      window_minutes: 15,
    });
  }
}
```

**WARN Checklist:**

- The system continues to work, but something is not ideal
- A recoverable error occurred (retries succeeded)
- Resource usage is approaching limits
- Deprecated functionality is being used
- Default configuration values are being used in production

### INFO - Business Events Happened

Use INFO for significant events in your application's business logic. INFO logs tell the story of what your system is doing.

The following examples show INFO logging for key business milestones. These logs create an audit trail and help you understand normal system behavior.

```typescript
// info-examples.ts - When to use INFO level

import { logger } from './logger';

// User authentication events
// Use INFO for security-relevant actions
function logSuccessfulLogin(user: User, req: Request): void {
  logger.info('User logged in', {
    user_id: user.id,
    user_email: user.email,
    login_method: 'password',
    ip_address: req.ip,
    user_agent: req.headers['user-agent'],
  });
}

// Business transactions
// Use INFO for operations that represent real business value
async function createOrder(order: Order): Promise<void> {
  await orderRepository.save(order);

  logger.info('Order created', {
    order_id: order.id,
    customer_id: order.customerId,
    total_amount: order.totalAmount,
    currency: order.currency,
    item_count: order.items.length,
  });
}

// Service lifecycle events
// Use INFO for startup and shutdown events
function onApplicationStart(): void {
  logger.info('Application started', {
    version: process.env.APP_VERSION,
    environment: process.env.NODE_ENV,
    node_version: process.version,
    port: process.env.PORT,
  });
}

function onApplicationShutdown(signal: string): void {
  logger.info('Application shutting down', {
    signal,
    uptime_seconds: process.uptime(),
  });
}

// Scheduled job completion
// Use INFO to track batch processing results
function logJobCompletion(jobName: string, results: JobResults): void {
  logger.info('Scheduled job completed', {
    job_name: jobName,
    records_processed: results.processed,
    records_failed: results.failed,
    duration_ms: results.durationMs,
    next_run: results.nextScheduledRun,
  });
}

// External API calls (at boundaries)
// Use INFO to track interactions with external systems
async function sendNotification(userId: string, message: string): Promise<void> {
  const startTime = Date.now();

  await notificationService.send(userId, message);

  logger.info('Notification sent', {
    user_id: userId,
    notification_type: 'push',
    provider: 'firebase',
    duration_ms: Date.now() - startTime,
  });
}
```

**INFO Checklist:**

- A significant business operation completed
- A user performed an important action
- The application started or stopped
- A scheduled job finished
- An external service interaction completed

### DEBUG - Execution Details

Use DEBUG for detailed information useful during development and troubleshooting. DEBUG logs should be disabled in production by default.

These DEBUG examples show the kind of granular detail that helps trace code execution. This level answers "what exactly happened" during a specific operation.

```typescript
// debug-examples.ts - When to use DEBUG level

import { logger } from './logger';

// Function entry and exit with parameters
// Use DEBUG to trace code flow during development
function calculateDiscount(
  subtotal: number,
  discountCode: string | null,
  memberTier: string
): number {
  logger.debug('Calculating discount', {
    subtotal,
    discount_code: discountCode,
    member_tier: memberTier,
  });

  let discount = 0;

  // Member tier discount
  if (memberTier === 'gold') {
    discount += subtotal * 0.1;
    logger.debug('Applied member tier discount', {
      tier: memberTier,
      discount_rate: 0.1,
      discount_amount: subtotal * 0.1,
    });
  }

  // Promo code discount
  if (discountCode) {
    const promoDiscount = lookupPromoCode(discountCode);
    discount += promoDiscount;
    logger.debug('Applied promo code discount', {
      code: discountCode,
      discount_amount: promoDiscount,
    });
  }

  logger.debug('Final discount calculated', {
    total_discount: discount,
    final_amount: subtotal - discount,
  });

  return discount;
}

// Cache operations
// Use DEBUG to understand cache hit/miss patterns
async function getCachedUser(userId: string): Promise<User | null> {
  const cacheKey = `user:${userId}`;
  const cached = await cache.get(cacheKey);

  if (cached) {
    logger.debug('Cache hit', {
      cache_key: cacheKey,
      ttl_remaining: await cache.ttl(cacheKey),
    });
    return JSON.parse(cached);
  }

  logger.debug('Cache miss', {
    cache_key: cacheKey,
  });

  const user = await userRepository.findById(userId);

  if (user) {
    await cache.set(cacheKey, JSON.stringify(user), 'EX', 3600);
    logger.debug('Cache populated', {
      cache_key: cacheKey,
      ttl_seconds: 3600,
    });
  }

  return user;
}

// Request/response details
// Use DEBUG to capture full payloads during troubleshooting
async function callExternalApi(endpoint: string, payload: object): Promise<any> {
  logger.debug('Outgoing API request', {
    endpoint,
    method: 'POST',
    payload_size: JSON.stringify(payload).length,
    // Avoid logging full payload in production - even at DEBUG
    payload_keys: Object.keys(payload),
  });

  const response = await fetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const responseBody = await response.json();

  logger.debug('API response received', {
    endpoint,
    status_code: response.status,
    response_size: JSON.stringify(responseBody).length,
    response_keys: Object.keys(responseBody),
  });

  return responseBody;
}

// Loop iterations (sampled)
// Use DEBUG sparingly in loops - log summaries instead
async function processItems(items: Item[]): Promise<void> {
  logger.debug('Starting batch processing', {
    item_count: items.length,
  });

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    // Log every 100th item to avoid log spam
    if (i % 100 === 0) {
      logger.debug('Processing batch progress', {
        current_index: i,
        total_items: items.length,
        percentage: ((i / items.length) * 100).toFixed(1),
      });
    }

    await processItem(item);
  }

  logger.debug('Batch processing complete', {
    item_count: items.length,
  });
}
```

**DEBUG Checklist:**

- Function parameters and return values during development
- Cache hits and misses
- Decision points in business logic
- Loop progress (sampled, not every iteration)
- Request/response details for external calls

---

## Log Level Decision Tree

Use this decision tree when you are unsure which level to use.

```
Is the application unable to complete the requested operation?
├── Yes → ERROR
└── No
    ├── Is something unusual or potentially problematic?
    │   ├── Yes → WARN
    │   └── No
    │       ├── Is this a significant business event or milestone?
    │       │   ├── Yes → INFO
    │       │   └── No → DEBUG
```

---

## Log Level Comparison Table

This table provides a quick reference for common logging scenarios.

| Scenario | Level | Rationale |
|----------|-------|-----------|
| Database query failed | ERROR | Operation cannot complete |
| Database query slow (>1s) | WARN | System works but degraded |
| Database query executed | DEBUG | Routine operation detail |
| User login successful | INFO | Security-relevant event |
| User login failed - wrong password | WARN | Expected failure, may indicate attack |
| User login failed - account locked | INFO | Business rule applied |
| Payment processed | INFO | Business transaction |
| Payment declined | ERROR | Customer action failed |
| Cache hit | DEBUG | Implementation detail |
| Cache miss (first request) | DEBUG | Expected behavior |
| Cache miss (after TTL) | DEBUG | Expected behavior |
| External API timeout, retry succeeded | WARN | Transient failure recovered |
| External API timeout, all retries failed | ERROR | Dependent service unavailable |
| Config loaded from defaults | WARN | May not be intentional |
| Scheduled job started | INFO | System event |
| Scheduled job completed | INFO | System event with metrics |
| Incoming HTTP request | DEBUG or INFO | Depends on your needs |
| Request validation failed | WARN | Client error, expected |
| Null pointer exception | ERROR | Bug in code |

---

## Log Level Antipatterns

### Antipattern 1: Logging Everything at INFO

When developers default to INFO for all logs, the INFO level becomes useless. You cannot distinguish important events from noise.

```typescript
// antipattern-info-abuse.ts - Everything at INFO

// DON'T: Log routine operations at INFO
function processRequest(req: Request): void {
  logger.info('Entering processRequest');           // Too granular for INFO
  logger.info('Validating request body');           // Too granular for INFO
  logger.info('Request body is valid');             // Too granular for INFO
  logger.info('Looking up user in database');       // Too granular for INFO
  logger.info('User found');                        // Too granular for INFO
  logger.info('Checking user permissions');         // Too granular for INFO
  logger.info('User has permission');               // Too granular for INFO
  logger.info('Processing business logic');         // Too granular for INFO
  logger.info('Business logic complete');           // Too granular for INFO
  logger.info('Sending response');                  // Too granular for INFO
  logger.info('Response sent');                     // Too granular for INFO
}

// DO: Reserve INFO for significant events
function processRequestCorrect(req: Request): void {
  logger.debug('Processing request', { request_id: req.id });

  // All the implementation details happen here
  // with DEBUG level logging if needed

  logger.info('Request processed', {
    request_id: req.id,
    user_id: user.id,
    action: 'create_order',
    duration_ms: Date.now() - startTime,
  });
}
```

### Antipattern 2: Using ERROR for Expected Failures

User input validation failures and authentication errors are expected. Logging them as ERROR creates alert fatigue.

```typescript
// antipattern-error-abuse.ts - Expected failures at ERROR

// DON'T: Log expected failures as ERROR
function validateEmail(email: string): boolean {
  if (!email.includes('@')) {
    logger.error('Invalid email format');  // This is expected input
    return false;
  }
  return true;
}

function authenticate(username: string, password: string): User | null {
  const user = findUser(username);

  if (!user) {
    logger.error('User not found');  // Could be typo, expected
    return null;
  }

  if (!verifyPassword(password, user.passwordHash)) {
    logger.error('Invalid password');  // Wrong password, expected
    return null;
  }

  return user;
}

// DO: Use appropriate levels for expected failures
function validateEmailCorrect(email: string): boolean {
  if (!email.includes('@')) {
    logger.debug('Email validation failed', { email_provided: email });
    return false;
  }
  return true;
}

function authenticateCorrect(username: string, password: string): User | null {
  const user = findUser(username);

  if (!user) {
    logger.warn('Login attempt for unknown user', {
      username,
      // Track for potential enumeration attacks
    });
    return null;
  }

  if (!verifyPassword(password, user.passwordHash)) {
    logger.warn('Failed login attempt', {
      user_id: user.id,
      attempt_count: getRecentAttempts(user.id),
    });
    return null;
  }

  return user;
}
```

### Antipattern 3: Missing Context in Logs

Logs without context are nearly useless. "Error occurred" tells you nothing.

```typescript
// antipattern-no-context.ts - Logs without context

// DON'T: Log without context
async function processOrder(orderId: string): Promise<void> {
  try {
    const order = await getOrder(orderId);
    await validateOrder(order);
    await chargeCustomer(order);
    await fulfillOrder(order);
    logger.info('Order processed');  // Which order? What happened?
  } catch (error) {
    logger.error('Error processing order');  // Which order? What error?
    throw error;
  }
}

// DO: Include relevant context
async function processOrderCorrect(orderId: string): Promise<void> {
  const startTime = Date.now();

  try {
    const order = await getOrder(orderId);
    await validateOrder(order);
    await chargeCustomer(order);
    await fulfillOrder(order);

    logger.info('Order processed', {
      order_id: orderId,
      customer_id: order.customerId,
      total_amount: order.total,
      item_count: order.items.length,
      duration_ms: Date.now() - startTime,
    });
  } catch (error) {
    logger.error('Order processing failed', {
      order_id: orderId,
      error_message: error.message,
      error_code: error.code,
      processing_stage: error.stage,  // Where in the pipeline did it fail?
      duration_ms: Date.now() - startTime,
    });
    throw error;
  }
}
```

### Antipattern 4: DEBUG Logs in Hot Paths

DEBUG logging in frequently executed code paths kills performance, even when DEBUG is disabled (due to string interpolation).

```typescript
// antipattern-debug-hot-path.ts - DEBUG in performance-critical code

// DON'T: DEBUG in hot paths without guards
function processPixel(x: number, y: number, color: Color): void {
  // Called millions of times per frame
  logger.debug(`Processing pixel at (${x}, ${y}) with color ${color}`);
  // Even if DEBUG is disabled, the string interpolation runs
}

// DO: Guard expensive debug logging
const DEBUG_ENABLED = process.env.LOG_LEVEL === 'debug';

function processPixelCorrect(x: number, y: number, color: Color): void {
  if (DEBUG_ENABLED && x % 1000 === 0 && y % 1000 === 0) {
    logger.debug('Processing pixel sample', { x, y, color });
  }
}

// BETTER: Log at batch level instead
function processFrame(pixels: Pixel[]): void {
  logger.debug('Processing frame', { pixel_count: pixels.length });

  for (const pixel of pixels) {
    processPixel(pixel.x, pixel.y, pixel.color);
  }

  logger.debug('Frame processing complete', { pixel_count: pixels.length });
}
```

---

## Dynamic Log Levels

Production systems need the ability to change log levels without restarting. This enables debugging production issues without redeployment.

### Environment Variable Configuration

The simplest approach reads log level from an environment variable at startup.

```typescript
// dynamic-level-env.ts - Log level from environment

import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

// To change: update environment variable and restart
// Works for containerized deployments with rolling updates
export { logger };
```

### Runtime Level Changes via API

For long-running processes, expose an endpoint to change log level dynamically.

```typescript
// dynamic-level-api.ts - Runtime log level changes

import express from 'express';
import winston from 'winston';

const app = express();

// Create logger with mutable level
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()],
});

// Endpoint to view current log level
app.get('/admin/log-level', (req, res) => {
  res.json({
    current_level: logger.level,
    available_levels: ['error', 'warn', 'info', 'debug'],
  });
});

// Endpoint to change log level
// Protect this endpoint with authentication in production
app.put('/admin/log-level', (req, res) => {
  const { level } = req.body;
  const validLevels = ['error', 'warn', 'info', 'debug'];

  if (!validLevels.includes(level)) {
    return res.status(400).json({
      error: 'Invalid log level',
      valid_levels: validLevels,
    });
  }

  const previousLevel = logger.level;
  logger.level = level;

  logger.warn('Log level changed via API', {
    previous_level: previousLevel,
    new_level: level,
    changed_by: req.user?.id,
    client_ip: req.ip,
  });

  res.json({
    previous_level: previousLevel,
    current_level: level,
  });
});

export { app, logger };
```

### Feature Flag Integration

Use feature flags to control log levels for specific users or requests.

```typescript
// dynamic-level-feature-flag.ts - Per-request log level via feature flags

import { logger } from './logger';
import { featureFlags } from './feature-flags';

interface RequestContext {
  userId: string;
  requestId: string;
}

// Create a logger that respects per-request debug flags
function createRequestLogger(context: RequestContext) {
  const debugEnabled = featureFlags.isEnabled('debug_logging', {
    userId: context.userId,
  });

  return {
    debug: (message: string, attributes: object = {}) => {
      if (debugEnabled) {
        logger.debug(message, { ...attributes, ...context });
      }
    },
    info: (message: string, attributes: object = {}) => {
      logger.info(message, { ...attributes, ...context });
    },
    warn: (message: string, attributes: object = {}) => {
      logger.warn(message, { ...attributes, ...context });
    },
    error: (message: string, attributes: object = {}) => {
      logger.error(message, { ...attributes, ...context });
    },
  };
}

// Usage in request handler
app.get('/api/orders/:id', async (req, res) => {
  const reqLogger = createRequestLogger({
    userId: req.user.id,
    requestId: req.id,
  });

  reqLogger.debug('Fetching order details');  // Only logs if feature flag enabled

  const order = await getOrder(req.params.id);

  reqLogger.info('Order retrieved', { order_id: order.id });

  res.json(order);
});
```

---

## Log Levels in Production

### Recommended Production Defaults

For most production systems, INFO is the right default level.

| Environment | Recommended Level | Rationale |
|-------------|-------------------|-----------|
| Development | DEBUG | See everything during development |
| Testing | DEBUG | Capture details for test failures |
| Staging | DEBUG or INFO | Match production or capture more for validation |
| Production | INFO | Balance visibility with volume |

### When to Enable DEBUG in Production

Enable DEBUG logging in production only for targeted troubleshooting.

```typescript
// production-debug.ts - Safe DEBUG logging in production

// Option 1: Enable DEBUG for specific request IDs
const DEBUG_REQUEST_IDS = new Set(
  (process.env.DEBUG_REQUEST_IDS || '').split(',').filter(Boolean)
);

function shouldDebug(requestId: string): boolean {
  return DEBUG_REQUEST_IDS.has(requestId);
}

// Option 2: Enable DEBUG for specific users
const DEBUG_USER_IDS = new Set(
  (process.env.DEBUG_USER_IDS || '').split(',').filter(Boolean)
);

function shouldDebugUser(userId: string): boolean {
  return DEBUG_USER_IDS.has(userId);
}

// Option 3: Sampling - debug 1% of requests
function shouldDebugSampled(): boolean {
  return Math.random() < 0.01;
}

// Combined approach
function getEffectiveLogLevel(context: { requestId: string; userId: string }): string {
  if (DEBUG_REQUEST_IDS.has(context.requestId)) return 'debug';
  if (DEBUG_USER_IDS.has(context.userId)) return 'debug';
  if (shouldDebugSampled()) return 'debug';
  return process.env.LOG_LEVEL || 'info';
}
```

### Production Log Level Monitoring

Track your log volume by level to detect anomalies.

```typescript
// log-level-metrics.ts - Track log volume by level

import { Counter } from 'prom-client';

const logCounter = new Counter({
  name: 'application_logs_total',
  help: 'Total number of log entries by level',
  labelNames: ['level', 'service'],
});

// Wrap logger to count logs
function createMetricsLogger(baseLogger: Logger, serviceName: string) {
  return {
    debug: (message: string, attributes: object = {}) => {
      logCounter.inc({ level: 'debug', service: serviceName });
      baseLogger.debug(message, attributes);
    },
    info: (message: string, attributes: object = {}) => {
      logCounter.inc({ level: 'info', service: serviceName });
      baseLogger.info(message, attributes);
    },
    warn: (message: string, attributes: object = {}) => {
      logCounter.inc({ level: 'warn', service: serviceName });
      baseLogger.warn(message, attributes);
    },
    error: (message: string, attributes: object = {}) => {
      logCounter.inc({ level: 'error', service: serviceName });
      baseLogger.error(message, attributes);
    },
  };
}

// Alert on unusual patterns:
// - Sudden increase in ERROR logs
// - WARN rate exceeding threshold
// - Unexpected DEBUG logs in production
```

---

## Log Level Filtering

### Server-Side Filtering

Configure your logging infrastructure to filter logs before storage.

```yaml
# fluentd-filter.yaml - Filter DEBUG logs from production

<filter app.**>
  @type grep
  <exclude>
    key level
    pattern /debug/
  </exclude>
</filter>

# Or use record transformer to sample DEBUG logs
<filter app.**>
  @type record_transformer
  enable_ruby true
  <record>
    _drop ${record["level"] == "debug" && rand > 0.01 ? "true" : "false"}
  </record>
</filter>

<filter app.**>
  @type grep
  <exclude>
    key _drop
    pattern /true/
  </exclude>
</filter>
```

### Client-Side Filtering

Filter logs before sending to reduce network traffic.

```typescript
// client-filter.ts - Filter logs before transmission

import { LogRecord, LogProcessor } from './types';

class LevelFilterProcessor implements LogProcessor {
  private minLevel: number;
  private levelMap: Record<string, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(minLevelName: string) {
    this.minLevel = this.levelMap[minLevelName] || 1;
  }

  process(record: LogRecord): LogRecord | null {
    const recordLevel = this.levelMap[record.level] || 0;

    if (recordLevel < this.minLevel) {
      return null;  // Drop the log
    }

    return record;
  }
}

// Usage: Filter DEBUG logs before sending to backend
const processor = new LevelFilterProcessor('info');
```

### Attribute-Based Filtering

Filter logs based on content, not just level.

```typescript
// attribute-filter.ts - Filter by log attributes

interface FilterRule {
  attribute: string;
  pattern: RegExp;
  action: 'include' | 'exclude';
}

class AttributeFilterProcessor {
  private rules: FilterRule[];

  constructor(rules: FilterRule[]) {
    this.rules = rules;
  }

  shouldInclude(record: LogRecord): boolean {
    for (const rule of this.rules) {
      const value = record.attributes[rule.attribute];

      if (value && rule.pattern.test(String(value))) {
        return rule.action === 'include';
      }
    }

    return true;  // Default include
  }
}

// Example: Exclude health check logs, include payment errors
const filter = new AttributeFilterProcessor([
  {
    attribute: 'http_path',
    pattern: /^\/health/,
    action: 'exclude',
  },
  {
    attribute: 'error_type',
    pattern: /payment/i,
    action: 'include',
  },
]);
```

---

## Creating Your Team's Guidelines

### Step 1: Document Your Definitions

Create a shared document that defines each level for your context. Use the definitions in this guide as a starting point and adapt them.

### Step 2: Provide Examples from Your Codebase

Abstract definitions are hard to follow. Include real examples from your services.

```markdown
## Our Log Level Guidelines

### ERROR
Use for failures that prevent completing user requests.

Examples from our codebase:
- Payment gateway returns error
- Database connection lost
- Required service unavailable

### WARN
Use for recoverable issues and degraded conditions.

Examples from our codebase:
- Retry succeeded after timeout
- Cache miss forcing database query
- Rate limit threshold at 80%

### INFO
Use for business events and significant operations.

Examples from our codebase:
- User created account
- Order placed
- Deployment completed

### DEBUG
Use for implementation details. OFF in production.

Examples from our codebase:
- Cache hit/miss details
- SQL queries executed
- Function parameters
```

### Step 3: Add to Code Review Checklist

Include log level review in your PR checklist.

```markdown
## Code Review Checklist - Logging

- [ ] ERROR used only for unrecoverable failures
- [ ] WARN used for recoverable issues, not expected failures
- [ ] INFO used for business events, not implementation details
- [ ] DEBUG guarded or absent in hot paths
- [ ] All logs include relevant context attributes
- [ ] No sensitive data (passwords, tokens, PII) in logs
- [ ] Log messages are actionable (not just "Error occurred")
```

### Step 4: Automate Enforcement

Use linting rules to catch common mistakes.

```typescript
// eslint-rule-log-level.ts - Custom ESLint rule for log levels

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce log level guidelines',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.object?.name === 'logger' &&
          node.callee.property?.name === 'error'
        ) {
          const message = node.arguments[0];

          // Flag generic error messages
          if (
            message.type === 'Literal' &&
            /^(error|failed|exception)$/i.test(message.value)
          ) {
            context.report({
              node,
              message: 'Error logs should include specific context, not generic messages',
            });
          }
        }
      },
    };
  },
};
```

---

## Summary

Effective log level guidelines require clarity and consistency. Here is what to remember:

**ERROR** - The operation failed and cannot complete. Something broke.

**WARN** - The system recovered, but something unusual happened. Potential problem.

**INFO** - A significant business event occurred. The story of your system.

**DEBUG** - Implementation details for troubleshooting. Off in production.

The goal is not perfection on day one. Start with these guidelines, review them in code reviews, and refine based on what your team learns from debugging real incidents.

Logs are your first line of defense when things go wrong. Make them count.

---

*Looking for a logging platform that makes these guidelines actionable? [OneUptime](https://oneuptime.com) provides powerful log management with filtering by level, alerting on error spikes, and correlation with traces and metrics. Ship your logs via OpenTelemetry or Syslog and start debugging faster.*

**Related Reading:**

- [How to Structure Logs Properly in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-28-how-to-structure-logs-properly-in-opentelemetry/view)
- [Three Pillars of Observability: Logs, Metrics, and Traces](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
- [How to Reduce Noise in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-25-how-to-reduce-noise-in-opentelemetry/view)
