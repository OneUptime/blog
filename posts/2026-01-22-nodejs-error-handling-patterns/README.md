# How to Handle Errors Properly in Node.js

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, ErrorHandling, JavaScript, BestPractices, Debugging

Description: Learn comprehensive error handling patterns in Node.js including try-catch, async errors, custom error classes, Express middleware, and production-ready error management.

---

Proper error handling is crucial for building reliable Node.js applications. Unhandled errors crash your server, poor error messages frustrate users, and missing error context makes debugging impossible. This guide covers everything you need for production-ready error handling.

## Error Types in Node.js

```javascript
// Standard Error types
throw new Error('Something went wrong');
throw new TypeError('Expected a string');
throw new RangeError('Value out of range');
throw new SyntaxError('Invalid syntax');
throw new ReferenceError('Variable not defined');

// Node.js system errors
// ENOENT, EACCES, ECONNREFUSED, ETIMEDOUT, etc.
```

## Try-Catch for Synchronous Code

```javascript
function parseJSON(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Failed to parse JSON:', error.message);
    return null;
  }
}

// With error rethrow
function parseJSONStrict(jsonString) {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }
}
```

### Finally Block

```javascript
function readConfig() {
  let file;
  try {
    file = openFile('config.json');
    return parseConfig(file);
  } catch (error) {
    console.error('Config error:', error);
    return getDefaultConfig();
  } finally {
    // Always runs, even if error thrown
    if (file) closeFile(file);
  }
}
```

## Async/Await Error Handling

```javascript
// Basic try-catch with async
async function fetchUser(id) {
  try {
    const response = await fetch(`/api/users/${id}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch user:', error.message);
    throw error; // Re-throw for caller to handle
  }
}
```

### Multiple Async Operations

```javascript
async function processOrder(orderId) {
  try {
    const order = await getOrder(orderId);
    const payment = await processPayment(order);
    const shipment = await createShipment(order);
    
    return { order, payment, shipment };
  } catch (error) {
    // Handle any error from the chain
    console.error('Order processing failed:', error);
    throw error;
  }
}

// With specific error handling
async function processOrderDetailed(orderId) {
  let order, payment;
  
  try {
    order = await getOrder(orderId);
  } catch (error) {
    throw new Error(`Failed to get order: ${error.message}`);
  }
  
  try {
    payment = await processPayment(order);
  } catch (error) {
    await cancelOrder(orderId);
    throw new Error(`Payment failed: ${error.message}`);
  }
  
  try {
    await createShipment(order);
  } catch (error) {
    await refundPayment(payment.id);
    throw new Error(`Shipment failed: ${error.message}`);
  }
}
```

## Promise Error Handling

```javascript
// Using .catch()
fetchData()
  .then(data => processData(data))
  .then(result => saveResult(result))
  .catch(error => {
    console.error('Pipeline failed:', error);
  });

// Catching specific promise
fetchData()
  .catch(error => {
    console.error('Fetch failed, using cache');
    return getCachedData();
  })
  .then(data => processData(data));
```

## Custom Error Classes

Create meaningful error types:

```javascript
// Base application error
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;  // Expected error vs bug
    
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error types
class ValidationError extends AppError {
  constructor(message, field) {
    super(message, 400);
    this.field = field;
  }
}

class NotFoundError extends AppError {
  constructor(resource, id) {
    super(`${resource} not found: ${id}`, 404);
    this.resource = resource;
    this.resourceId = id;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Permission denied') {
    super(message, 403);
  }
}

class DatabaseError extends AppError {
  constructor(message, originalError) {
    super(message, 500);
    this.originalError = originalError;
    this.isOperational = false;  // Unexpected error
  }
}
```

### Using Custom Errors

```javascript
async function getUser(id) {
  const user = await db.users.findById(id);
  
  if (!user) {
    throw new NotFoundError('User', id);
  }
  
  return user;
}

async function updateUser(id, data) {
  if (!data.email) {
    throw new ValidationError('Email is required', 'email');
  }
  
  if (!isValidEmail(data.email)) {
    throw new ValidationError('Invalid email format', 'email');
  }
  
  try {
    return await db.users.update(id, data);
  } catch (error) {
    throw new DatabaseError('Failed to update user', error);
  }
}
```

## Express Error Handling

### Error Middleware

```javascript
const express = require('express');
const app = express();

// Route handlers
app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await getUser(req.params.id);
    res.json(user);
  } catch (error) {
    next(error);  // Pass to error handler
  }
});

// Error handling middleware (must have 4 parameters)
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Determine status code
  const statusCode = err.statusCode || 500;
  
  // Send response
  res.status(statusCode).json({
    error: {
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
      }),
    },
  });
});
```

### Async Handler Wrapper

```javascript
// Wrapper to catch async errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Usage - no try-catch needed
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await getUser(req.params.id);
  res.json(user);
}));

app.post('/users', asyncHandler(async (req, res) => {
  const user = await createUser(req.body);
  res.status(201).json(user);
}));
```

### Comprehensive Error Handler

```javascript
class ErrorHandler {
  static handle(err, req, res, next) {
    err.statusCode = err.statusCode || 500;
    
    if (process.env.NODE_ENV === 'development') {
      return this.sendDevError(err, res);
    }
    
    return this.sendProdError(err, res);
  }
  
  static sendDevError(err, res) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      error: err,
      stack: err.stack,
    });
  }
  
  static sendProdError(err, res) {
    // Operational error: send message to client
    if (err.isOperational) {
      res.status(err.statusCode).json({
        status: 'error',
        message: err.message,
      });
    } else {
      // Programming error: don't leak details
      console.error('ERROR:', err);
      
      res.status(500).json({
        status: 'error',
        message: 'Something went wrong',
      });
    }
  }
}

// Use in Express
app.use(ErrorHandler.handle.bind(ErrorHandler));
```

## Global Error Handlers

### Uncaught Exceptions

```javascript
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  
  // Log the error
  logger.error('Uncaught Exception', { error });
  
  // Exit - the process is in undefined state
  process.exit(1);
});
```

### Unhandled Promise Rejections

```javascript
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Log the error
  logger.error('Unhandled Rejection', { reason });
  
  // Optionally exit (recommended in Node 15+)
  process.exit(1);
});
```

### Graceful Shutdown

```javascript
process.on('uncaughtException', async (error) => {
  console.error('Uncaught Exception:', error);
  
  try {
    // Give time to finish current requests
    await server.close();
    await database.disconnect();
    
    process.exit(1);
  } catch (shutdownError) {
    console.error('Error during shutdown:', shutdownError);
    process.exit(1);
  }
});
```

## Error Logging

### Structured Error Logging

```javascript
class ErrorLogger {
  static log(error, context = {}) {
    const errorInfo = {
      message: error.message,
      name: error.name,
      stack: error.stack,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      timestamp: new Date().toISOString(),
      ...context,
    };
    
    if (error.isOperational) {
      console.warn('Operational Error:', JSON.stringify(errorInfo));
    } else {
      console.error('System Error:', JSON.stringify(errorInfo));
      // Alert monitoring system
      this.alertOps(errorInfo);
    }
  }
  
  static alertOps(errorInfo) {
    // Send to monitoring service
    // Slack, PagerDuty, etc.
  }
}
```

### Request Context in Errors

```javascript
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((error) => {
    // Add request context
    error.requestId = req.id;
    error.path = req.path;
    error.method = req.method;
    error.userId = req.user?.id;
    
    next(error);
  });
};
```

## Error Recovery Patterns

### Retry with Backoff

```javascript
async function withRetry(fn, options = {}) {
  const { maxRetries = 3, baseDelay = 1000 } = options;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// Usage
const data = await withRetry(() => fetchFromAPI(url), {
  maxRetries: 3,
  baseDelay: 1000,
});
```

### Circuit Breaker

```javascript
class CircuitBreaker {
  constructor(fn, options = {}) {
    this.fn = fn;
    this.failures = 0;
    this.threshold = options.threshold || 5;
    this.timeout = options.timeout || 60000;
    this.state = 'CLOSED';
    this.nextAttempt = null;
  }
  
  async call(...args) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF-OPEN';
    }
    
    try {
      const result = await this.fn(...args);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
  
  onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}

// Usage
const apiBreaker = new CircuitBreaker(fetchFromAPI, {
  threshold: 5,
  timeout: 30000,
});

try {
  const data = await apiBreaker.call(url);
} catch (error) {
  // Use fallback
}
```

### Fallback Values

```javascript
async function getWithFallback(primary, fallback) {
  try {
    return await primary();
  } catch (error) {
    console.warn('Primary failed, using fallback:', error.message);
    return await fallback();
  }
}

// Usage
const config = await getWithFallback(
  () => fetchRemoteConfig(),
  () => loadLocalConfig(),
);
```

## Validation Errors

```javascript
const Joi = require('joi');

function validate(schema, data) {
  const { error, value } = schema.validate(data, {
    abortEarly: false,  // Collect all errors
  });
  
  if (error) {
    const errors = error.details.map(d => ({
      field: d.path.join('.'),
      message: d.message,
    }));
    
    throw new ValidationError('Validation failed', errors);
  }
  
  return value;
}

class ValidationError extends AppError {
  constructor(message, errors) {
    super(message, 400);
    this.errors = errors;
  }
}

// Usage
const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
});

app.post('/users', (req, res, next) => {
  try {
    const data = validate(userSchema, req.body);
    // Create user
  } catch (error) {
    next(error);
  }
});
```

## Summary

| Pattern | Use Case |
|---------|----------|
| try-catch | Synchronous code |
| async/await + try-catch | Async code |
| .catch() | Promise chains |
| Custom Error classes | Typed errors |
| Error middleware | Express apps |
| asyncHandler | Wrap async routes |
| Global handlers | Catch escapes |
| Retry | Transient failures |
| Circuit breaker | Failing services |

Best practices:
- Create custom error classes for your domain
- Always handle async errors
- Use error middleware in Express
- Log errors with context
- Implement graceful shutdown
- Distinguish operational vs programmer errors
- Never swallow errors silently
