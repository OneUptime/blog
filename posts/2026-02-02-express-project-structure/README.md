# How to Structure Express.js Projects for Scale

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: NodeJS, Express, Project Structure, Architecture, Best Practices

Description: Learn how to organize Express.js applications for scalability with proper folder structure, separation of concerns, and modular architecture patterns.

---

When your Express.js project grows from a simple API to a full-featured application, the initial single-file setup becomes a maintenance nightmare. You end up with routes mixed with business logic, database queries scattered everywhere, and no clear way to find what you need. A good project structure solves this by giving everything a predictable home.

## Why Structure Matters

| Problem | Without Structure | With Structure |
|---------|-------------------|----------------|
| Finding code | Search everywhere | Predictable locations |
| Testing | Tightly coupled, hard to mock | Isolated, easy to test |
| Onboarding | Long learning curve | Self-documenting layout |
| Scaling | Refactor everything | Add modules cleanly |
| Bug fixes | Side effects everywhere | Contained changes |

## Recommended Folder Structure

Here is a folder structure that works well for medium to large Express applications:

```
src/
├── config/           # Configuration and environment
│   ├── index.js
│   └── database.js
├── controllers/      # Request handlers
│   ├── userController.js
│   └── orderController.js
├── services/         # Business logic
│   ├── userService.js
│   └── orderService.js
├── models/           # Data models
│   ├── User.js
│   └── Order.js
├── routes/           # Route definitions
│   ├── index.js
│   ├── userRoutes.js
│   └── orderRoutes.js
├── middleware/       # Custom middleware
│   ├── auth.js
│   ├── errorHandler.js
│   └── validate.js
├── utils/            # Helper functions
│   ├── logger.js
│   └── response.js
├── validators/       # Request validation schemas
│   ├── userValidator.js
│   └── orderValidator.js
└── app.js            # Express app setup
```

| Folder | Purpose | Example Contents |
|--------|---------|------------------|
| config | Environment and app settings | Database connections, API keys |
| controllers | Handle HTTP requests | Parse input, call services, send responses |
| services | Business logic | Data processing, external API calls |
| models | Data layer | Database schemas, queries |
| routes | URL mapping | Route definitions, middleware binding |
| middleware | Request processing | Auth, logging, validation |
| utils | Shared helpers | Formatters, constants |
| validators | Input validation | Request body schemas |

## Setting Up the Application Entry Point

Start with a clean `app.js` that only handles Express configuration:

```javascript
// src/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const config = require('./config');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors(config.cors));

// Body parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Mount all routes under /api
app.use('/api', routes);

// Global error handler - must be last
app.use(errorHandler);

module.exports = app;
```

Keep the server startup separate:

```javascript
// src/server.js
const app = require('./app');
const config = require('./config');
const { connectDatabase } = require('./config/database');

async function start() {
  try {
    // Connect to database before starting server
    await connectDatabase();
    console.log('Database connected');

    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
```

## Centralized Configuration

Keep all configuration in one place with environment validation:

```javascript
// src/config/index.js
require('dotenv').config();

const config = {
  // Server settings
  port: parseInt(process.env.PORT, 10) || 3000,
  env: process.env.NODE_ENV || 'development',

  // Database settings
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    name: process.env.DB_NAME || 'myapp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  },

  // JWT settings
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // CORS settings
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
};

// Validate required settings in production
if (config.env === 'production') {
  const required = ['jwt.secret', 'database.password'];
  for (const key of required) {
    const value = key.split('.').reduce((obj, k) => obj[k], config);
    if (!value) {
      throw new Error(`Missing required config: ${key}`);
    }
  }
}

module.exports = config;
```

## Route Organization

Group routes by feature and use a central router:

```javascript
// src/routes/index.js
const express = require('express');
const userRoutes = require('./userRoutes');
const orderRoutes = require('./orderRoutes');
const authRoutes = require('./authRoutes');

const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount feature routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/orders', orderRoutes);

module.exports = router;
```

Define feature routes with their specific middleware:

```javascript
// src/routes/userRoutes.js
const express = require('express');
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { createUserSchema, updateUserSchema } = require('../validators/userValidator');

const router = express.Router();

// Public routes
router.get('/:id', userController.getUser);

// Protected routes - require authentication
router.use(authenticate);

router.get('/', userController.listUsers);
router.post('/', validate(createUserSchema), userController.createUser);
router.put('/:id', validate(updateUserSchema), userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
```

## Controllers: Keep Them Thin

Controllers should only handle HTTP concerns - parsing requests and sending responses. All business logic belongs in services:

```javascript
// src/controllers/userController.js
const userService = require('../services/userService');
const { success, created, notFound } = require('../utils/response');

const userController = {
  async getUser(req, res, next) {
    try {
      const user = await userService.findById(req.params.id);

      if (!user) {
        return notFound(res, 'User not found');
      }

      return success(res, user);
    } catch (error) {
      next(error);
    }
  },

  async createUser(req, res, next) {
    try {
      // req.body is already validated by middleware
      const user = await userService.create(req.body);
      return created(res, user);
    } catch (error) {
      next(error);
    }
  },

  async updateUser(req, res, next) {
    try {
      const user = await userService.update(req.params.id, req.body);

      if (!user) {
        return notFound(res, 'User not found');
      }

      return success(res, user);
    } catch (error) {
      next(error);
    }
  },

  async deleteUser(req, res, next) {
    try {
      const deleted = await userService.delete(req.params.id);

      if (!deleted) {
        return notFound(res, 'User not found');
      }

      return success(res, { message: 'User deleted' });
    } catch (error) {
      next(error);
    }
  },

  async listUsers(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const result = await userService.list({ page, limit });
      return success(res, result);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = userController;
```

## Services: Business Logic Home

Services contain your actual business logic, keeping it testable and reusable:

```javascript
// src/services/userService.js
const User = require('../models/User');
const { hashPassword } = require('../utils/crypto');

const userService = {
  async findById(id) {
    return User.findById(id).select('-password');
  },

  async findByEmail(email) {
    return User.findOne({ email });
  },

  async create(data) {
    // Business logic: hash password before storing
    const hashedPassword = await hashPassword(data.password);

    const user = await User.create({
      ...data,
      password: hashedPassword,
    });

    // Return user without password
    const { password, ...userWithoutPassword } = user.toObject();
    return userWithoutPassword;
  },

  async update(id, data) {
    // Business logic: don't allow email changes through this method
    const { email, password, ...updateData } = data;

    return User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
  },

  async delete(id) {
    const result = await User.findByIdAndDelete(id);
    return !!result;
  },

  async list({ page, limit }) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().select('-password').skip(skip).limit(limit),
      User.countDocuments(),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },
};

module.exports = userService;
```

## Middleware for Cross-Cutting Concerns

Create reusable middleware for authentication, validation, and error handling:

```javascript
// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const config = require('../config');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

module.exports = { authenticate, authorize };
```

```javascript
// src/middleware/validate.js
function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    // Replace body with validated and sanitized data
    req.body = value;
    next();
  };
}

module.exports = { validate };
```

## Centralized Error Handling

A global error handler catches all errors and formats responses consistently:

```javascript
// src/middleware/errorHandler.js
const config = require('../config');

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

function errorHandler(err, req, res, next) {
  // Default to 500 internal server error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Handle specific error types
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation error';
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate entry';
  }

  // Log error in development
  if (config.env === 'development') {
    console.error('Error:', err);
  }

  // Send response
  res.status(statusCode).json({
    error: message,
    // Include stack trace only in development
    ...(config.env === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
module.exports.AppError = AppError;
```

## Response Helpers

Standardize your API responses:

```javascript
// src/utils/response.js
function success(res, data, statusCode = 200) {
  return res.status(statusCode).json({ data });
}

function created(res, data) {
  return success(res, data, 201);
}

function notFound(res, message = 'Resource not found') {
  return res.status(404).json({ error: message });
}

function badRequest(res, message = 'Bad request') {
  return res.status(400).json({ error: message });
}

module.exports = { success, created, notFound, badRequest };
```

## Summary

A well-structured Express project follows these principles:

| Principle | Implementation |
|-----------|----------------|
| Single responsibility | Each file does one thing |
| Separation of concerns | Controllers, services, models are separate |
| Centralized config | One place for all settings |
| Consistent error handling | Global error middleware |
| Testability | Services can be tested in isolation |
| Predictability | New developers know where to find things |

Start with this structure from the beginning of your project. It takes a few extra minutes to set up but saves hours of refactoring later. When your application grows, you can add more modules without changing the overall architecture.
