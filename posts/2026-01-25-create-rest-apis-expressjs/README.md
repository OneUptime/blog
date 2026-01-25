# How to Create REST APIs with Express.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, Express, REST API, Backend, Web Development

Description: Build production-ready REST APIs with Express.js including routing, middleware, validation, error handling, and best practices for API design.

---

Express.js is the most popular Node.js web framework for building REST APIs. It is minimal, flexible, and has a massive ecosystem of middleware. This guide covers building a complete REST API from scratch with patterns that work in production.

## Project Setup

Start with a clean project structure:

```bash
mkdir my-api && cd my-api
npm init -y
npm install express cors helmet morgan
npm install --save-dev nodemon
```

```json
{
  "name": "my-api",
  "version": "1.0.0",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  }
}
```

Create the basic server:

```javascript
// src/index.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());              // Security headers
app.use(cors());                // Cross-origin requests
app.use(morgan('combined'));    // Request logging
app.use(express.json());        // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));  // Parse URL-encoded bodies

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

## RESTful Routes

REST APIs use HTTP methods to represent operations:

| Method | Path | Action |
|--------|------|--------|
| GET | /users | List all users |
| GET | /users/:id | Get single user |
| POST | /users | Create user |
| PUT | /users/:id | Replace user |
| PATCH | /users/:id | Update user |
| DELETE | /users/:id | Delete user |

```javascript
// src/routes/users.js
const express = require('express');
const router = express.Router();

// In-memory data store (replace with database)
let users = [
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
];
let nextId = 3;

// GET /users - List all users
router.get('/', (req, res) => {
    res.json({
        data: users,
        count: users.length
    });
});

// GET /users/:id - Get single user
router.get('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const user = users.find(u => u.id === id);

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    res.json({ data: user });
});

// POST /users - Create user
router.post('/', (req, res) => {
    const { name, email } = req.body;

    // Basic validation
    if (!name || !email) {
        return res.status(400).json({
            error: 'Validation failed',
            details: {
                name: !name ? 'Name is required' : null,
                email: !email ? 'Email is required' : null
            }
        });
    }

    const newUser = {
        id: nextId++,
        name,
        email
    };

    users.push(newUser);

    res.status(201).json({
        message: 'User created',
        data: newUser
    });
});

// PUT /users/:id - Replace user
router.put('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = users.findIndex(u => u.id === id);

    if (index === -1) {
        return res.status(404).json({ error: 'User not found' });
    }

    const { name, email } = req.body;

    if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
    }

    users[index] = { id, name, email };

    res.json({
        message: 'User updated',
        data: users[index]
    });
});

// PATCH /users/:id - Partial update
router.patch('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const user = users.find(u => u.id === id);

    if (!user) {
        return res.status(404).json({ error: 'User not found' });
    }

    // Only update provided fields
    if (req.body.name) user.name = req.body.name;
    if (req.body.email) user.email = req.body.email;

    res.json({
        message: 'User updated',
        data: user
    });
});

// DELETE /users/:id - Delete user
router.delete('/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const index = users.findIndex(u => u.id === id);

    if (index === -1) {
        return res.status(404).json({ error: 'User not found' });
    }

    users.splice(index, 1);

    res.json({ message: 'User deleted' });
});

module.exports = router;
```

Mount the router in your main file:

```javascript
// src/index.js
const userRoutes = require('./routes/users');

// Mount routes
app.use('/api/users', userRoutes);
```

## Request Validation

Use a validation library for robust input validation:

```bash
npm install express-validator
```

```javascript
// src/middleware/validators.js
const { body, param, query, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array().map(err => ({
                field: err.path,
                message: err.msg
            }))
        });
    }
    next();
};

// User validation rules
const userValidation = {
    create: [
        body('name')
            .trim()
            .notEmpty().withMessage('Name is required')
            .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
        body('email')
            .trim()
            .notEmpty().withMessage('Email is required')
            .isEmail().withMessage('Invalid email format')
            .normalizeEmail(),
        validate
    ],
    update: [
        param('id').isInt().withMessage('Invalid user ID'),
        body('name')
            .optional()
            .trim()
            .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
        body('email')
            .optional()
            .trim()
            .isEmail().withMessage('Invalid email format')
            .normalizeEmail(),
        validate
    ]
};

module.exports = { userValidation };
```

Apply validation to routes:

```javascript
// src/routes/users.js
const { userValidation } = require('../middleware/validators');

router.post('/', userValidation.create, (req, res) => {
    // req.body is now validated and sanitized
    const { name, email } = req.body;
    // ...create user
});

router.patch('/:id', userValidation.update, (req, res) => {
    // ...update user
});
```

## Error Handling

Create centralized error handling:

```javascript
// src/middleware/errorHandler.js
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
    }
}

const errorHandler = (err, req, res, next) => {
    // Log error
    console.error('Error:', err);

    // Operational errors (expected)
    if (err.isOperational) {
        return res.status(err.statusCode).json({
            error: err.message
        });
    }

    // Mongoose validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation failed',
            details: Object.values(err.errors).map(e => e.message)
        });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json({
            error: `${field} already exists`
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'Invalid token' });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
    }

    // Unknown errors - do not leak details in production
    res.status(500).json({
        error: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    });
};

// 404 handler
const notFoundHandler = (req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        method: req.method,
        path: req.path
    });
};

module.exports = { AppError, errorHandler, notFoundHandler };
```

Use in your main file:

```javascript
// src/index.js
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Routes
app.use('/api/users', userRoutes);

// 404 handler (after all routes)
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);
```

## Async Error Handling

Wrap async route handlers to catch errors:

```javascript
// src/utils/asyncHandler.js
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;

// Usage in routes
const asyncHandler = require('../utils/asyncHandler');
const { AppError } = require('../middleware/errorHandler');

router.get('/:id', asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        throw new AppError('User not found', 404);
    }

    res.json({ data: user });
}));
```

## Query Parameters for Filtering

Support filtering, sorting, and pagination:

```javascript
// GET /api/users?status=active&sort=-createdAt&page=1&limit=10
router.get('/', asyncHandler(async (req, res) => {
    const {
        status,
        sort = '-createdAt',
        page = 1,
        limit = 10,
        search
    } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    // Parse sort string (e.g., "-createdAt" -> { createdAt: -1 })
    const sortObj = {};
    const sortField = sort.startsWith('-') ? sort.substring(1) : sort;
    sortObj[sortField] = sort.startsWith('-') ? -1 : 1;

    // Pagination
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
        User.find(filter).sort(sortObj).skip(skip).limit(limitNum),
        User.countDocuments(filter)
    ]);

    res.json({
        data: users,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.ceil(total / limitNum)
        }
    });
}));
```

## Response Format Consistency

Keep response format consistent across all endpoints:

```javascript
// src/utils/response.js
const sendResponse = (res, statusCode, data, message = null) => {
    const response = {
        success: statusCode < 400,
        ...(message && { message }),
        ...(data && { data })
    };
    res.status(statusCode).json(response);
};

const sendPaginated = (res, data, pagination) => {
    res.json({
        success: true,
        data,
        pagination
    });
};

module.exports = { sendResponse, sendPaginated };

// Usage
const { sendResponse } = require('../utils/response');

router.get('/:id', asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    sendResponse(res, 200, user);
}));

router.post('/', asyncHandler(async (req, res) => {
    const user = await User.create(req.body);
    sendResponse(res, 201, user, 'User created successfully');
}));
```

## API Versioning

Version your API for backward compatibility:

```javascript
// src/routes/v1/users.js
const router = express.Router();
// v1 routes
module.exports = router;

// src/routes/v2/users.js
const router = express.Router();
// v2 routes with changes
module.exports = router;

// src/index.js
const usersV1 = require('./routes/v1/users');
const usersV2 = require('./routes/v2/users');

app.use('/api/v1/users', usersV1);
app.use('/api/v2/users', usersV2);
```

## Rate Limiting

Protect your API from abuse:

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // 15 minutes
    max: 100,                   // 100 requests per window
    message: {
        error: 'Too many requests, please try again later'
    }
});

app.use('/api/', apiLimiter);
```

## Complete Project Structure

```
my-api/
  src/
    index.js              # Entry point
    routes/
      index.js            # Route aggregator
      users.js            # User routes
      products.js         # Product routes
    middleware/
      auth.js             # Authentication
      validators.js       # Request validation
      errorHandler.js     # Error handling
    controllers/
      userController.js   # Business logic
    models/
      User.js             # Database models
    utils/
      asyncHandler.js     # Async wrapper
      response.js         # Response helpers
    config/
      index.js            # Configuration
```

## Summary

Building REST APIs with Express.js involves setting up proper routing, validation, error handling, and response formatting. Use middleware for cross-cutting concerns, validate all input, handle errors centrally, and keep your response format consistent. This foundation scales well as your API grows.
