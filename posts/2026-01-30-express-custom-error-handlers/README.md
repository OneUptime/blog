# How to Implement Custom Error Handlers in Express

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Express, Error Handling, API

Description: Build robust error handling in Express applications with custom error classes, centralized handlers, and proper HTTP status codes for production APIs.

---

Error handling is one of the most overlooked aspects of Express applications. Most tutorials show you `try/catch` blocks and call it a day, but production APIs need more. You need consistent error responses, proper logging, different behavior in development vs production, and the ability to distinguish between bugs in your code and expected failures like invalid user input.

This guide covers everything from basic Express error middleware to building a complete error handling system.

## How Express Error Middleware Works

Express identifies error-handling middleware by its function signature. Regular middleware has three parameters `(req, res, next)`, but error middleware has four `(err, req, res, next)`. When you call `next(error)` anywhere in your route handlers, Express skips all remaining regular middleware and jumps directly to your error handlers.

```javascript
const express = require('express');
const app = express();

// Regular middleware - 3 parameters
app.use((req, res, next) => {
  console.log('Regular middleware runs first');
  next();
});

// Route that throws an error
app.get('/fail', (req, res, next) => {
  const error = new Error('Something went wrong');
  next(error); // Passes error to error middleware
});

// Error middleware - 4 parameters (err comes first)
app.use((err, req, res, next) => {
  console.error('Error caught:', err.message);
  res.status(500).json({ error: err.message });
});

app.listen(3000);
```

Important rules for error middleware:

| Rule | Description |
|------|-------------|
| **Order matters** | Error handlers must be defined after all routes and regular middleware |
| **Four parameters required** | Express uses parameter count to identify error handlers |
| **Chain with next(err)** | Call `next(err)` to pass errors to the next error handler |
| **Sync errors auto-caught** | Thrown errors in sync code are caught automatically |
| **Async needs explicit handling** | Async errors must be passed to `next()` manually (or use a wrapper) |

## The Problem with Default Error Handling

Without custom error handling, Express uses its default handler which:

- Sends the full stack trace to clients (security risk in production)
- Uses inconsistent response formats
- Does not log errors properly
- Cannot distinguish between different error types

```javascript
// Default Express behavior - not great for production
app.get('/user/:id', async (req, res) => {
  const user = await db.findUser(req.params.id);
  if (!user) {
    throw new Error('User not found'); // Returns 500, leaks stack trace
  }
  res.json(user);
});
```

## Creating Custom Error Classes

Custom error classes let you attach metadata like HTTP status codes and error types. This makes it easy to handle different errors differently in your centralized handler.

```javascript
// errors/AppError.js

/**
 * Base application error class.
 * Extends the native Error with HTTP status and operational flag.
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    // Operational errors are expected (bad input, not found, etc.)
    // vs programmer errors (bugs) which are unexpected
    this.isOperational = true;

    // Capture stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
```

Now create specific error types for common scenarios.

```javascript
// errors/index.js
const AppError = require('./AppError');

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.code = 'NOT_FOUND';
  }
}

class ValidationError extends AppError {
  constructor(message, errors = []) {
    super(message, 400);
    this.code = 'VALIDATION_ERROR';
    this.errors = errors; // Array of field-level errors
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
    this.code = 'UNAUTHORIZED';
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access denied') {
    super(message, 403);
    this.code = 'FORBIDDEN';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Resource already exists') {
    super(message, 409);
    this.code = 'CONFLICT';
  }
}

class RateLimitError extends AppError {
  constructor(retryAfter = 60) {
    super('Too many requests', 429);
    this.code = 'RATE_LIMIT_EXCEEDED';
    this.retryAfter = retryAfter;
  }
}

module.exports = {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
  RateLimitError,
};
```

Using these errors in your routes is now clean and explicit.

```javascript
const { NotFoundError, ValidationError } = require('./errors');

app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      throw new NotFoundError('User');
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

app.post('/users', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const errors = [];

    if (!email) {
      errors.push({ field: 'email', message: 'Email is required' });
    }
    if (!password || password.length < 8) {
      errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
    }

    if (errors.length > 0) {
      throw new ValidationError('Invalid input', errors);
    }

    const user = await User.create({ email, password });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
});
```

## Handling Async Errors

Express 4.x does not catch errors from async functions automatically. You have three options.

**Option 1: Try/catch in every route (verbose)**

```javascript
app.get('/users', async (req, res, next) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (err) {
    next(err);
  }
});
```

**Option 2: Async wrapper function (recommended for Express 4.x)**

```javascript
// middleware/asyncHandler.js

/**
 * Wraps async route handlers to catch errors and pass them to next().
 * Eliminates the need for try/catch in every route.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
```

Now routes become cleaner.

```javascript
const asyncHandler = require('./middleware/asyncHandler');

// No try/catch needed
app.get('/users', asyncHandler(async (req, res) => {
  const users = await User.findAll();
  res.json(users);
}));

app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new NotFoundError('User');
  }

  res.json(user);
}));
```

**Option 3: Express 5.x (handles async errors natively)**

If you are using Express 5 (currently in beta), async errors are caught automatically.

```javascript
// Express 5.x - async errors caught automatically
app.get('/users', async (req, res) => {
  const users = await User.findAll(); // Errors go to error middleware
  res.json(users);
});
```

## Building the Centralized Error Handler

The main error handler should format errors consistently, handle different error types, and behave differently in development vs production.

```javascript
// middleware/errorHandler.js
const { AppError } = require('../errors');

/**
 * Development error response - includes stack trace and full details
 */
const sendErrorDev = (err, req, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    code: err.code || 'INTERNAL_ERROR',
    message: err.message,
    errors: err.errors, // Field-level validation errors
    stack: err.stack,
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
  });
};

/**
 * Production error response - hides implementation details
 */
const sendErrorProd = (err, req, res) => {
  // Operational errors: send message to client
  if (err.isOperational) {
    const response = {
      status: err.status,
      code: err.code || 'ERROR',
      message: err.message,
      timestamp: new Date().toISOString(),
    };

    // Include validation errors if present
    if (err.errors) {
      response.errors = err.errors;
    }

    // Include retry-after for rate limit errors
    if (err.retryAfter) {
      res.set('Retry-After', err.retryAfter);
      response.retryAfter = err.retryAfter;
    }

    res.status(err.statusCode).json(response);
  } else {
    // Programming errors: don't leak details to client
    console.error('UNEXPECTED ERROR:', err);

    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Main error handling middleware.
 * Normalizes errors and sends appropriate response based on environment.
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    sendErrorProd(err, req, res);
  }
};

module.exports = errorHandler;
```

## Handling Third-Party Library Errors

Database libraries, validators, and other packages throw their own error types. Convert these to your custom errors for consistent handling.

```javascript
// middleware/errorHandler.js (extended)
const { AppError, ValidationError, NotFoundError } = require('../errors');

/**
 * Convert Mongoose CastError to NotFoundError.
 * Happens when an invalid ObjectId is passed.
 */
const handleCastErrorDB = (err) => {
  return new NotFoundError(`Invalid ${err.path}: ${err.value}`);
};

/**
 * Convert Mongoose duplicate key error to ConflictError.
 */
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  return new AppError(`${field} already exists`, 409);
};

/**
 * Convert Mongoose validation error to ValidationError.
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((e) => ({
    field: e.path,
    message: e.message,
  }));
  return new ValidationError('Validation failed', errors);
};

/**
 * Convert JWT errors to UnauthorizedError.
 */
const handleJWTError = () => {
  return new AppError('Invalid token. Please log in again.', 401);
};

const handleJWTExpiredError = () => {
  return new AppError('Token expired. Please log in again.', 401);
};

/**
 * Normalize third-party errors to AppError instances.
 */
const normalizeError = (err) => {
  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return handleCastErrorDB(err);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    return handleDuplicateFieldsDB(err);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError' && err.errors) {
    return handleValidationErrorDB(err);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return handleJWTError();
  }
  if (err.name === 'TokenExpiredError') {
    return handleJWTExpiredError();
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'field';
    return new AppError(`${field} already exists`, 409);
  }

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return new ValidationError('Validation failed', errors);
  }

  return err;
};

const errorHandler = (err, req, res, next) => {
  // Normalize third-party errors
  let error = normalizeError(err);

  // If not already an AppError, wrap it
  if (!(error instanceof AppError)) {
    error = new AppError(error.message || 'Internal server error', 500);
    error.isOperational = false; // Mark as unexpected
  }

  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};

module.exports = errorHandler;
```

## Operational vs Programmer Errors

This distinction is critical for production reliability.

| Error Type | Examples | Handling |
|------------|----------|----------|
| **Operational** | Invalid user input, resource not found, network timeout, rate limit exceeded | Expected failures. Return appropriate HTTP status and message to client. |
| **Programmer** | Undefined variable, wrong function arguments, unhandled promise rejection | Bugs in code. Log error, alert developers, return generic 500 to client. |

```javascript
// Operational error - expected, handle gracefully
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    // This is operational - user made a request for something that doesn't exist
    throw new NotFoundError('User');
  }

  res.json(user);
}));

// Programmer error - bug in code
app.get('/broken', (req, res) => {
  const config = undefined;
  console.log(config.value); // TypeError - this is a bug
});
```

In production, you should consider restarting the process after programmer errors since the application may be in an undefined state.

```javascript
// Handle unhandled rejections and uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION! Shutting down...');
  console.error(reason);

  // Give time for existing requests to complete, then exit
  server.close(() => {
    process.exit(1);
  });
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! Shutting down...');
  console.error(err);
  process.exit(1);
});
```

## Integrating Error Logging

Connect your error handler to a logging service for visibility into production issues.

```javascript
// utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Also log to console in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

module.exports = logger;
```

Update the error handler to log errors.

```javascript
// middleware/errorHandler.js
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = normalizeError(err);

  if (!(error instanceof AppError)) {
    error = new AppError(error.message || 'Internal server error', 500);
    error.isOperational = false;
  }

  // Log all errors
  const logData = {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    isOperational: error.isOperational,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
    requestId: req.id,
  };

  if (error.isOperational) {
    // Operational errors - log at warn level
    logger.warn('Operational error', logData);
  } else {
    // Programmer errors - log at error level with stack
    logger.error('Unexpected error', {
      ...logData,
      stack: error.stack,
      originalError: err.message,
    });
  }

  // Send response
  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};
```

## Adding Request IDs for Tracing

Request IDs help correlate logs across services.

```javascript
// middleware/requestId.js
const { v4: uuidv4 } = require('uuid');

/**
 * Adds a unique request ID to each request.
 * Uses X-Request-ID header if provided, otherwise generates one.
 */
const requestIdMiddleware = (req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
};

module.exports = requestIdMiddleware;
```

Include the request ID in error responses.

```javascript
const sendErrorProd = (err, req, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      code: err.code || 'ERROR',
      message: err.message,
      requestId: req.id, // For support tickets
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(500).json({
      status: 'error',
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong',
      requestId: req.id, // Customer can reference this in support
      timestamp: new Date().toISOString(),
    });
  }
};
```

## Complete Application Setup

Here is how everything fits together.

```javascript
// app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const requestIdMiddleware = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');
const asyncHandler = require('./middleware/asyncHandler');
const { NotFoundError, ValidationError, UnauthorizedError } = require('./errors');

const app = express();

// Security and parsing middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10kb' }));

// Add request ID to all requests
app.use(requestIdMiddleware);

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} [${req.id}]`);
  next();
});

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Validate ID format
  if (!/^\d+$/.test(id)) {
    throw new ValidationError('Invalid user ID format');
  }

  const user = await findUserById(id);

  if (!user) {
    throw new NotFoundError('User');
  }

  res.json(user);
}));

app.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }

  const user = await authenticateUser(email, password);

  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const token = generateToken(user);
  res.json({ token });
}));

// 404 handler for undefined routes
app.use((req, res, next) => {
  next(new NotFoundError(`Route ${req.originalUrl}`));
});

// Global error handler - must be last
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
  server.close(() => process.exit(1));
});

module.exports = app;
```

## API Error Response Format

Use a consistent format for all error responses.

```javascript
// Success response
{
  "data": { ... }
}

// Error response - operational
{
  "status": "fail",
  "code": "VALIDATION_ERROR",
  "message": "Invalid input",
  "errors": [
    { "field": "email", "message": "Email is required" },
    { "field": "password", "message": "Password must be at least 8 characters" }
  ],
  "requestId": "abc-123-def",
  "timestamp": "2026-01-30T10:15:30.000Z"
}

// Error response - server error (production)
{
  "status": "error",
  "code": "INTERNAL_ERROR",
  "message": "Something went wrong",
  "requestId": "abc-123-def",
  "timestamp": "2026-01-30T10:15:30.000Z"
}

// Error response - server error (development)
{
  "status": "error",
  "code": "INTERNAL_ERROR",
  "message": "Cannot read property 'id' of undefined",
  "stack": "TypeError: Cannot read property 'id' of undefined\n    at ...",
  "path": "/api/users/123",
  "method": "GET",
  "requestId": "abc-123-def",
  "timestamp": "2026-01-30T10:15:30.000Z"
}
```

## HTTP Status Code Reference

Use the right status code for each error type.

| Status | Name | When to Use |
|--------|------|-------------|
| 400 | Bad Request | Invalid request body, query params, or headers |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but lacks permission |
| 404 | Not Found | Resource does not exist |
| 409 | Conflict | Resource already exists (duplicate key) |
| 422 | Unprocessable Entity | Valid syntax but semantic errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 502 | Bad Gateway | Upstream service failure |
| 503 | Service Unavailable | Temporary overload or maintenance |

## Testing Error Handling

Write tests to verify your error handling works correctly.

```javascript
// tests/errorHandler.test.js
const request = require('supertest');
const app = require('../app');

describe('Error Handling', () => {
  describe('Validation Errors', () => {
    it('should return 400 with validation errors', async () => {
      const res = await request(app)
        .post('/users')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.errors).toBeInstanceOf(Array);
    });
  });

  describe('Not Found Errors', () => {
    it('should return 404 for missing resources', async () => {
      const res = await request(app).get('/users/99999');

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('should return 404 for undefined routes', async () => {
      const res = await request(app).get('/undefined-route');

      expect(res.status).toBe(404);
    });
  });

  describe('Authentication Errors', () => {
    it('should return 401 for invalid credentials', async () => {
      const res = await request(app)
        .post('/login')
        .send({ email: 'bad@example.com', password: 'wrong' });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Response Format', () => {
    it('should include requestId in error responses', async () => {
      const res = await request(app).get('/users/99999');

      expect(res.body.requestId).toBeDefined();
      expect(res.headers['x-request-id']).toBeDefined();
    });

    it('should include timestamp in error responses', async () => {
      const res = await request(app).get('/users/99999');

      expect(res.body.timestamp).toBeDefined();
      expect(new Date(res.body.timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('Development vs Production', () => {
    const originalEnv = process.env.NODE_ENV;

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('should include stack trace in development', async () => {
      process.env.NODE_ENV = 'development';

      const res = await request(app).get('/trigger-error');

      expect(res.body.stack).toBeDefined();
    });

    it('should hide stack trace in production', async () => {
      process.env.NODE_ENV = 'production';

      const res = await request(app).get('/trigger-error');

      expect(res.body.stack).toBeUndefined();
    });
  });
});
```

## Summary

| Component | Purpose |
|-----------|---------|
| **Custom error classes** | Attach HTTP status, error codes, and metadata to errors |
| **Async handler wrapper** | Catch promise rejections and pass to error middleware |
| **Error normalization** | Convert third-party errors to consistent format |
| **Centralized handler** | Single place for error formatting and logging |
| **Environment awareness** | Show details in dev, hide in production |
| **Request IDs** | Correlate errors across logs and support tickets |

A robust error handling system makes debugging easier, keeps your API responses consistent, and protects your application from leaking sensitive information in production. Start with custom error classes and a centralized handler, then add logging and monitoring as your application grows.
