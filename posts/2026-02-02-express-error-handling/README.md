# How to Handle Error Handling Properly in Express

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Express, Error Handling, API, Best Practices

Description: Learn proper error handling in Express applications with custom error classes, centralized error handling, async error catching, and production-ready patterns.

---

Every Express developer has been there: your app works fine in development, then suddenly starts throwing cryptic errors in production. Users see "Internal Server Error" with no helpful information, and you're left digging through logs trying to figure out what went wrong. The problem usually isn't the error itself - it's how you're handling it.

Good error handling makes the difference between a frustrating debugging session and a quick fix. Let's walk through how to set up error handling properly in Express.

## The Problem with Basic Error Handling

Here's what most tutorials show you:

```javascript
// This breaks on async errors - don't do this
app.get('/users/:id', (req, res) => {
  const user = await User.findById(req.params.id);  // Syntax error - no async
  res.json(user);
});
```

Or worse, the try-catch everywhere approach:

```javascript
// Gets tedious really fast
app.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});
```

This works, but you're repeating yourself in every route. Let's fix that.

## Custom Error Classes

First, create error classes that carry status codes and messages:

```javascript
// errors/AppError.js
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;  // Distinguishes from programming errors

    // Captures stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Not authorized') {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Access forbidden') {
    super(message, 403);
  }
}

module.exports = {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
};
```

## HTTP Error Codes Reference

Here's a quick reference for common HTTP error codes you'll use:

| Code | Name | When to Use |
|------|------|-------------|
| 400 | Bad Request | Invalid request body, missing required fields |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not allowed |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry, resource already exists |
| 422 | Unprocessable Entity | Valid syntax but semantic errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server-side errors |

## Async Error Wrapper

Wrap async route handlers to catch errors automatically:

```javascript
// middleware/asyncHandler.js

// Wraps async functions and forwards errors to Express error handler
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = asyncHandler;
```

Now your routes look cleaner:

```javascript
const asyncHandler = require('./middleware/asyncHandler');
const { NotFoundError } = require('./errors/AppError');

// No try-catch needed - errors automatically go to error middleware
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.json(user);
}));
```

## Centralized Error Handler

The error handling middleware catches everything:

```javascript
// middleware/errorHandler.js
const { AppError } = require('../errors/AppError');

const errorHandler = (err, req, res, next) => {
  // Default values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let status = err.status || 'error';

  // Handle specific error types

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map(e => e.message).join(', ');
    status = 'fail';
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate value for field: ${field}`;
    status = 'fail';
  }

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
    status = 'fail';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    status = 'fail';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    status = 'fail';
  }

  // Log error for debugging
  console.error(`[${new Date().toISOString()}] ${err.stack || err}`);

  // Send response
  const response = {
    status,
    message,
  };

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
```

## 404 Handler

Add a catch-all for undefined routes:

```javascript
// middleware/notFoundHandler.js
const { NotFoundError } = require('../errors/AppError');

const notFoundHandler = (req, res, next) => {
  next(new NotFoundError(`Route ${req.originalUrl} not found`));
};

module.exports = notFoundHandler;
```

## Putting It All Together

Here's a complete Express app with proper error handling:

```javascript
// app.js
const express = require('express');
const asyncHandler = require('./middleware/asyncHandler');
const errorHandler = require('./middleware/errorHandler');
const notFoundHandler = require('./middleware/notFoundHandler');
const { NotFoundError, ValidationError } = require('./errors/AppError');

const app = express();

app.use(express.json());

// Sample routes demonstrating error handling
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.json({ status: 'success', data: user });
}));

app.post('/users', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Manual validation example
  if (!email || !password) {
    throw new ValidationError('Email and password are required');
  }

  const user = await User.create({ email, password });
  res.status(201).json({ status: 'success', data: user });
}));

// 404 handler - must be after all routes
app.use(notFoundHandler);

// Error handler - must be last middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

## Error Response Format

Keep your error responses consistent:

```javascript
// Success response
{
  "status": "success",
  "data": { ... }
}

// Client error (4xx)
{
  "status": "fail",
  "message": "User not found"
}

// Server error (5xx)
{
  "status": "error",
  "message": "Internal server error"
}
```

## Logging Errors Properly

In production, you need proper logging:

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
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Also log to console in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

module.exports = logger;
```

Update the error handler to use the logger:

```javascript
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log with context
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,  // If you have auth middleware
  });

  // ... rest of error handler
};
```

## Handling Uncaught Exceptions

Don't forget process-level error handling:

```javascript
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Log it, alert monitoring, etc.
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Log it, then exit - the process is in an undefined state
  process.exit(1);
});
```

## Summary

Here's what you need for solid error handling in Express:

| Component | Purpose |
|-----------|---------|
| Custom error classes | Carry status codes and types |
| Async wrapper | Catches promise rejections |
| Central error handler | Formats and sends responses |
| 404 handler | Catches undefined routes |
| Logger | Records errors for debugging |
| Process handlers | Catches uncaught errors |

The key insight is that Express doesn't automatically catch errors in async functions. Once you wrap your routes and set up a central error handler, you can stop writing try-catch blocks everywhere and let errors flow naturally to where they're handled consistently.

Your users get meaningful error messages, your logs capture the details you need for debugging, and your code stays clean. That's proper error handling.
