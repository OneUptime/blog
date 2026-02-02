# How to Use Middleware Effectively in Express

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Express, Middleware, API, Best Practices

Description: Master Express middleware patterns including custom middleware, error handling, authentication, logging, and proper middleware ordering.

---

If you've worked with Express for any amount of time, you've probably heard the term "middleware" thrown around constantly. But what exactly is it, and how do you use it without turning your codebase into spaghetti? Let's dig in.

## What is Middleware?

Middleware in Express is simply a function that has access to the request object (`req`), the response object (`res`), and the next middleware function in the stack (commonly called `next`). Think of it as a series of checkpoints your request passes through before getting a response.

Every middleware can:
- Execute any code
- Modify the request and response objects
- End the request-response cycle
- Call the next middleware in the stack

Here's the basic signature:

```javascript
// Basic middleware function signature
function myMiddleware(req, res, next) {
    // Do something with the request
    console.log('Request received at:', new Date().toISOString());

    // Pass control to the next middleware
    next();
}
```

## Middleware Basics

Let's start with a simple Express app and add some middleware.

```javascript
const express = require('express');
const app = express();

// Application-level middleware - runs on every request
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Built-in middleware for parsing JSON bodies
app.use(express.json());

// Built-in middleware for parsing URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Route handler
app.get('/', (req, res) => {
    res.send('Hello World');
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});
```

## Building Custom Middleware

Custom middleware is where things get interesting. Here's a practical request logger:

```javascript
// requestLogger.js - Custom logging middleware
function requestLogger(req, res, next) {
    const start = Date.now();

    // Store original end function
    const originalEnd = res.end;

    // Override res.end to capture response time
    res.end = function(...args) {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} [${duration}ms]`);
        originalEnd.apply(res, args);
    };

    next();
}

module.exports = requestLogger;
```

Use it in your app:

```javascript
const requestLogger = require('./requestLogger');

// Apply to all routes
app.use(requestLogger);
```

## Authentication Middleware

Authentication is one of the most common use cases for middleware. Here's a JWT-based auth middleware:

```javascript
const jwt = require('jsonwebtoken');

// Authentication middleware
function authenticate(req, res, next) {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Attach user info to request object
        req.user = decoded;

        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// Role-based authorization middleware
function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
}

module.exports = { authenticate, authorize };
```

Apply it to protected routes:

```javascript
const { authenticate, authorize } = require('./authMiddleware');

// Public route - no middleware
app.get('/api/public', (req, res) => {
    res.json({ message: 'Public data' });
});

// Protected route - requires authentication
app.get('/api/profile', authenticate, (req, res) => {
    res.json({ user: req.user });
});

// Admin-only route - requires authentication and admin role
app.delete('/api/users/:id', authenticate, authorize('admin'), (req, res) => {
    res.json({ message: 'User deleted' });
});
```

## Error Handling Middleware

Error handling middleware is special - it takes four arguments instead of three. Express recognizes this signature and treats it differently.

```javascript
// errorHandler.js - Centralized error handling
function errorHandler(err, req, res, next) {
    // Log error for debugging
    console.error('Error:', err.message);
    console.error('Stack:', err.stack);

    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            details: err.message
        });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            error: 'Unauthorized',
            details: 'Invalid credentials'
        });
    }

    // Default to 500 internal server error
    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production'
            ? 'Something went wrong'
            : err.message
    });
}

module.exports = errorHandler;
```

Important: Error middleware must be registered last:

```javascript
const errorHandler = require('./errorHandler');

// All your routes first
app.use('/api', apiRoutes);

// 404 handler for undefined routes
app.use((req, res, next) => {
    const error = new Error('Not Found');
    error.status = 404;
    next(error);
});

// Error handler comes last
app.use(errorHandler);
```

## Async Middleware

Handling async operations in middleware requires a bit of care. Wrap your async middleware to catch errors properly:

```javascript
// asyncWrapper - Utility to handle async middleware errors
const asyncWrapper = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Using the wrapper with async middleware
app.get('/api/users', asyncWrapper(async (req, res) => {
    const users = await User.findAll();
    res.json(users);
}));

// Async validation middleware example
const validateUser = asyncWrapper(async (req, res, next) => {
    const { email } = req.body;

    // Check if email already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
        const error = new Error('Email already registered');
        error.status = 400;
        throw error;
    }

    next();
});

app.post('/api/users', validateUser, asyncWrapper(async (req, res) => {
    const user = await User.create(req.body);
    res.status(201).json(user);
}));
```

## Middleware Execution Order

The order you register middleware matters a lot. Here's how Express processes requests:

| Order | Middleware Type | Purpose |
|-------|----------------|---------|
| 1 | Security (helmet, cors) | Set security headers, handle CORS |
| 2 | Body parsers | Parse request body (JSON, urlencoded) |
| 3 | Logging | Log incoming requests |
| 4 | Authentication | Verify user identity |
| 5 | Route handlers | Process the actual request |
| 6 | 404 handler | Catch undefined routes |
| 7 | Error handler | Handle all errors centrally |

Here's a complete example showing proper ordering:

```javascript
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const app = express();

// 1. Security middleware first
app.use(helmet());
app.use(cors());

// 2. Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// 3. Request logging
app.use(requestLogger);

// 4. API routes with authentication
app.use('/api', apiRoutes);

// 5. Static files (if serving any)
app.use(express.static('public'));

// 6. 404 handler
app.use((req, res, next) => {
    next({ status: 404, message: 'Route not found' });
});

// 7. Error handler last
app.use(errorHandler);
```

## Quick Tips

1. **Keep middleware focused** - Each middleware should do one thing well
2. **Always call next()** - Unless you're ending the request-response cycle
3. **Use router-level middleware** - For route-specific logic instead of cluttering app-level
4. **Order matters** - Security and parsing before routes, error handling last
5. **Don't forget async error handling** - Unhandled promise rejections can crash your server

## Wrapping Up

Middleware is the backbone of Express applications. Once you get comfortable with the patterns above, you'll find yourself writing cleaner, more maintainable code. Start simple, add middleware as needed, and always keep the execution order in mind.

The key is to think of your request as water flowing through pipes - each middleware is a filter or valve that can inspect, modify, or stop the flow. Keep your pipes clean, and your application will thank you for it.
