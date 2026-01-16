# How to Build a REST API with Node.js on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, Express, REST API, Ubuntu, JavaScript, Backend Development, API Development, MongoDB, JWT, PM2

Description: A comprehensive guide to building production-ready REST APIs using Node.js and Express on Ubuntu, covering everything from setup to deployment.

---

Building a REST API is one of the most common tasks for backend developers. Whether you're creating a mobile app backend, a microservice, or a full-stack web application, understanding how to build robust, scalable APIs is essential. In this comprehensive guide, we'll walk through building a production-ready REST API using Node.js and Express on Ubuntu.

## What is a REST API?

REST (Representational State Transfer) is an architectural style for designing networked applications. A REST API allows different software applications to communicate with each other over HTTP using standard methods.

### Core REST Principles

1. **Statelessness**: Each request from a client contains all the information needed to process it. The server doesn't store client context between requests.

2. **Client-Server Architecture**: The client and server are separate entities that communicate through a uniform interface.

3. **Uniform Interface**: REST APIs use standard HTTP methods:
   - `GET`: Retrieve resources
   - `POST`: Create new resources
   - `PUT`: Update existing resources (full replacement)
   - `PATCH`: Partially update resources
   - `DELETE`: Remove resources

4. **Resource-Based**: Everything is a resource identified by URIs (Uniform Resource Identifiers).

5. **Cacheable**: Responses should define themselves as cacheable or non-cacheable.

6. **Layered System**: The architecture can be composed of hierarchical layers.

### HTTP Status Codes

Understanding HTTP status codes is crucial for REST API development:

- **2xx Success**: 200 (OK), 201 (Created), 204 (No Content)
- **3xx Redirection**: 301 (Moved Permanently), 304 (Not Modified)
- **4xx Client Errors**: 400 (Bad Request), 401 (Unauthorized), 403 (Forbidden), 404 (Not Found), 422 (Unprocessable Entity)
- **5xx Server Errors**: 500 (Internal Server Error), 502 (Bad Gateway), 503 (Service Unavailable)

## Prerequisites

Before we begin, you need to set up your Ubuntu environment with Node.js and essential tools.

### Installing Node.js on Ubuntu

First, update your system packages:

```bash
# Update the package list
sudo apt update

# Upgrade existing packages
sudo apt upgrade -y
```

Install Node.js using NodeSource repository for the latest LTS version:

```bash
# Install curl if not already installed
sudo apt install -y curl

# Download and run the NodeSource setup script for Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify the installation
node --version
npm --version
```

### Installing Additional Tools

Install essential development tools:

```bash
# Install build essentials for native modules
sudo apt install -y build-essential

# Install Git for version control
sudo apt install -y git

# Install MongoDB (optional, if using MongoDB)
sudo apt install -y mongodb

# Start and enable MongoDB service
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

For PostgreSQL installation (alternative to MongoDB):

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## Project Structure Best Practices

A well-organized project structure makes your codebase maintainable and scalable. Here's the recommended structure for a REST API project:

```
my-rest-api/
├── src/
│   ├── config/
│   │   ├── database.js       # Database configuration
│   │   ├── swagger.js        # Swagger/OpenAPI configuration
│   │   └── index.js          # Central config export
│   ├── controllers/
│   │   ├── authController.js # Authentication logic
│   │   ├── userController.js # User-related handlers
│   │   └── index.js          # Controller exports
│   ├── middleware/
│   │   ├── auth.js           # JWT verification middleware
│   │   ├── errorHandler.js   # Global error handler
│   │   ├── rateLimiter.js    # Rate limiting middleware
│   │   └── validator.js      # Request validation middleware
│   ├── models/
│   │   ├── User.js           # User model/schema
│   │   └── index.js          # Model exports
│   ├── routes/
│   │   ├── authRoutes.js     # Authentication routes
│   │   ├── userRoutes.js     # User routes
│   │   └── index.js          # Route aggregation
│   ├── services/
│   │   ├── authService.js    # Authentication business logic
│   │   └── userService.js    # User business logic
│   ├── utils/
│   │   ├── logger.js         # Logging utility
│   │   ├── apiResponse.js    # Standardized API responses
│   │   └── helpers.js        # Helper functions
│   ├── validations/
│   │   ├── authValidation.js # Auth request schemas
│   │   └── userValidation.js # User request schemas
│   └── app.js                # Express app setup
├── tests/
│   ├── integration/          # Integration tests
│   ├── unit/                 # Unit tests
│   └── setup.js              # Test configuration
├── .env                      # Environment variables
├── .env.example              # Environment template
├── .gitignore                # Git ignore rules
├── package.json              # Project dependencies
├── ecosystem.config.js       # PM2 configuration
└── README.md                 # Project documentation
```

## Express.js Setup

Let's start by initializing our project and setting up Express:

```bash
# Create project directory
mkdir my-rest-api
cd my-rest-api

# Initialize npm project
npm init -y

# Install core dependencies
npm install express dotenv cors helmet morgan

# Install development dependencies
npm install -D nodemon
```

Create the main application file with Express configuration:

```javascript
// src/app.js
// Main Express application setup with essential middleware

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Import route handlers
const routes = require('./routes');

// Import custom middleware
const errorHandler = require('./middleware/errorHandler');

// Create Express application instance
const app = express();

// Security middleware - sets various HTTP headers for security
app.use(helmet());

// CORS middleware - enables Cross-Origin Resource Sharing
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging middleware - logs HTTP requests
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing middleware - parses JSON request bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint for load balancers and monitoring
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Mount API routes under /api/v1 prefix
app.use('/api/v1', routes);

// 404 handler for undefined routes
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// Global error handling middleware - must be last
app.use(errorHandler);

module.exports = app;
```

Create the server entry point:

```javascript
// src/server.js
// Server entry point - starts the Express application

const app = require('./app');
const { connectDatabase } = require('./config/database');

// Get port from environment or use default
const PORT = process.env.PORT || 3000;

// Async function to start the server
const startServer = async () => {
    try {
        // Connect to database before starting server
        await connectDatabase();

        // Start listening for requests
        app.listen(PORT, () => {
            console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
            console.log(`API available at http://localhost:${PORT}/api/v1`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

// Start the server
startServer();
```

Create the environment configuration file:

```bash
# .env.example
# Copy this file to .env and fill in your values

NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/myapi
# Or for PostgreSQL:
# DATABASE_URL=postgresql://user:password@localhost:5432/myapi

# JWT Configuration
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Router Organization

Organize your routes in a modular way for better maintainability:

```javascript
// src/routes/index.js
// Central route aggregation - combines all route modules

const express = require('express');
const router = express.Router();

// Import individual route modules
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');

// Mount routes with their respective prefixes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);

// API information endpoint
router.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Welcome to the REST API',
        version: '1.0.0',
        endpoints: {
            auth: '/api/v1/auth',
            users: '/api/v1/users'
        }
    });
});

module.exports = router;
```

Create authentication routes:

```javascript
// src/routes/authRoutes.js
// Authentication routes - handles login, register, and token refresh

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRequest } = require('../middleware/validator');
const { registerSchema, loginSchema } = require('../validations/authValidation');

// POST /api/v1/auth/register - Register a new user
router.post(
    '/register',
    validateRequest(registerSchema),
    authController.register
);

// POST /api/v1/auth/login - Authenticate user and get token
router.post(
    '/login',
    validateRequest(loginSchema),
    authController.login
);

// POST /api/v1/auth/refresh - Refresh JWT token
router.post(
    '/refresh',
    authController.refreshToken
);

// POST /api/v1/auth/logout - Logout user (invalidate token)
router.post(
    '/logout',
    authController.logout
);

module.exports = router;
```

Create user routes with authentication protection:

```javascript
// src/routes/userRoutes.js
// User routes - CRUD operations for user resources

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validator');
const { updateUserSchema } = require('../validations/userValidation');

// All routes below require authentication
router.use(authenticate);

// GET /api/v1/users - Get all users (admin only)
router.get(
    '/',
    authorize('admin'),
    userController.getAllUsers
);

// GET /api/v1/users/me - Get current user profile
router.get(
    '/me',
    userController.getCurrentUser
);

// GET /api/v1/users/:id - Get user by ID
router.get(
    '/:id',
    userController.getUserById
);

// PUT /api/v1/users/:id - Update user
router.put(
    '/:id',
    validateRequest(updateUserSchema),
    userController.updateUser
);

// DELETE /api/v1/users/:id - Delete user (admin only)
router.delete(
    '/:id',
    authorize('admin'),
    userController.deleteUser
);

module.exports = router;
```

## Middleware Implementation

Middleware functions are the backbone of Express applications. Let's implement essential middleware.

### Logging Middleware

Create a custom logging utility:

```javascript
// src/utils/logger.js
// Winston logger configuration for structured logging

const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack }) => {
        return `${timestamp} [${level.toUpperCase()}]: ${stack || message}`;
    })
);

// Create Winston logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        // Console transport for development
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        }),
        // File transport for errors
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5
        }),
        // File transport for all logs
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/combined.log'),
            maxsize: 5242880,
            maxFiles: 5
        })
    ]
});

// Create a stream object for Morgan integration
logger.stream = {
    write: (message) => logger.info(message.trim())
};

module.exports = logger;
```

Install Winston for logging:

```bash
npm install winston
```

### CORS Configuration

Create detailed CORS configuration:

```javascript
// src/middleware/cors.js
// CORS configuration with fine-grained control

const cors = require('cors');

// Define allowed origins based on environment
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL
].filter(Boolean);

// CORS options configuration
const corsOptions = {
    // Dynamic origin validation
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },

    // Allowed HTTP methods
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    // Allowed headers
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin'
    ],

    // Headers exposed to the client
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],

    // Allow credentials (cookies, authorization headers)
    credentials: true,

    // Cache preflight requests for 24 hours
    maxAge: 86400,

    // Pass preflight response to next handler
    preflightContinue: false,

    // Return 204 for successful OPTIONS requests
    optionsSuccessStatus: 204
};

module.exports = cors(corsOptions);
```

### Body Parsing Middleware

Configure body parsing with security limits:

```javascript
// src/middleware/bodyParser.js
// Body parsing configuration with size limits and type validation

const express = require('express');

// JSON body parser with limits
const jsonParser = express.json({
    // Maximum request body size
    limit: '10mb',

    // Only parse if Content-Type matches
    type: 'application/json',

    // Strict mode - only accept arrays and objects
    strict: true,

    // Custom error handling for malformed JSON
    verify: (req, res, buf, encoding) => {
        try {
            JSON.parse(buf);
        } catch (e) {
            throw new Error('Invalid JSON');
        }
    }
});

// URL-encoded body parser for form submissions
const urlencodedParser = express.urlencoded({
    // Enable rich objects and arrays
    extended: true,

    // Maximum request body size
    limit: '10mb',

    // Maximum number of parameters
    parameterLimit: 1000
});

// Raw body parser for webhooks (preserves raw body)
const rawParser = express.raw({
    type: 'application/octet-stream',
    limit: '50mb'
});

module.exports = {
    jsonParser,
    urlencodedParser,
    rawParser
};
```

## Database Integration

### MongoDB with Mongoose

Install MongoDB dependencies:

```bash
npm install mongoose
```

Create the database configuration:

```javascript
// src/config/database.js
// MongoDB connection configuration using Mongoose

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// MongoDB connection options
const mongoOptions = {
    // Use the new URL parser
    useNewUrlParser: true,

    // Use the new topology engine
    useUnifiedTopology: true,

    // Maximum number of connections in the pool
    maxPoolSize: 10,

    // Server selection timeout
    serverSelectionTimeoutMS: 5000,

    // Socket timeout
    socketTimeoutMS: 45000,

    // Index creation
    autoIndex: process.env.NODE_ENV !== 'production'
};

// Connect to MongoDB
const connectDatabase = async () => {
    try {
        const connection = await mongoose.connect(
            process.env.MONGODB_URI,
            mongoOptions
        );

        logger.info(`MongoDB connected: ${connection.connection.host}`);

        // Handle connection events
        mongoose.connection.on('error', (error) => {
            logger.error('MongoDB connection error:', error);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected. Attempting to reconnect...');
        });

        mongoose.connection.on('reconnected', () => {
            logger.info('MongoDB reconnected');
        });

        return connection;
    } catch (error) {
        logger.error('Failed to connect to MongoDB:', error);
        throw error;
    }
};

// Gracefully close connection
const closeDatabase = async () => {
    try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');
    } catch (error) {
        logger.error('Error closing MongoDB connection:', error);
        throw error;
    }
};

module.exports = { connectDatabase, closeDatabase };
```

Create the User model with Mongoose:

```javascript
// src/models/User.js
// User model schema definition with Mongoose

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define the user schema
const userSchema = new mongoose.Schema({
    // User's email address - must be unique
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email'
        ]
    },

    // User's password - will be hashed
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters'],
        select: false // Don't include in queries by default
    },

    // User's display name
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },

    // User's role for authorization
    role: {
        type: String,
        enum: ['user', 'admin', 'moderator'],
        default: 'user'
    },

    // Account status
    isActive: {
        type: Boolean,
        default: true
    },

    // Email verification status
    isEmailVerified: {
        type: Boolean,
        default: false
    },

    // Password reset token
    passwordResetToken: String,
    passwordResetExpires: Date,

    // Last login timestamp
    lastLogin: Date,

    // Refresh token for JWT refresh
    refreshToken: String
}, {
    // Add createdAt and updatedAt fields
    timestamps: true,

    // Enable virtual fields in JSON output
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
    // Only hash if password is modified
    if (!this.isModified('password')) {
        return next();
    }

    // Generate salt and hash password
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate password reset token
userSchema.methods.generatePasswordResetToken = function() {
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Token expires in 10 minutes
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

    return resetToken;
};

// Static method to find user by email
userSchema.statics.findByEmail = function(email) {
    return this.findOne({ email: email.toLowerCase() });
};

// Create and export the model
const User = mongoose.model('User', userSchema);

module.exports = User;
```

Install bcryptjs for password hashing:

```bash
npm install bcryptjs
```

### PostgreSQL with Prisma (Alternative)

If you prefer PostgreSQL, here's how to set it up with Prisma:

```bash
# Install Prisma
npm install prisma @prisma/client
npx prisma init
```

Create the Prisma schema:

```prisma
// prisma/schema.prisma
// Prisma schema definition for PostgreSQL

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// User model definition
model User {
  id              String    @id @default(uuid())
  email           String    @unique
  password        String
  name            String
  role            Role      @default(USER)
  isActive        Boolean   @default(true)
  isEmailVerified Boolean   @default(false)
  lastLogin       DateTime?
  refreshToken    String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  posts Post[]

  @@index([email])
  @@index([role])
}

// Post model for demonstration
model Post {
  id        String   @id @default(uuid())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([authorId])
}

// Role enum
enum Role {
  USER
  ADMIN
  MODERATOR
}
```

Create the Prisma database configuration:

```javascript
// src/config/prisma.js
// Prisma client singleton for database operations

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

// Create Prisma client with logging
const prisma = new PrismaClient({
    log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' }
    ]
});

// Log database queries in development
if (process.env.NODE_ENV === 'development') {
    prisma.$on('query', (e) => {
        logger.debug(`Query: ${e.query}`);
        logger.debug(`Duration: ${e.duration}ms`);
    });
}

// Log errors
prisma.$on('error', (e) => {
    logger.error('Prisma error:', e);
});

// Connect to database
const connectDatabase = async () => {
    try {
        await prisma.$connect();
        logger.info('PostgreSQL connected via Prisma');
    } catch (error) {
        logger.error('Failed to connect to PostgreSQL:', error);
        throw error;
    }
};

// Disconnect from database
const closeDatabase = async () => {
    await prisma.$disconnect();
    logger.info('PostgreSQL connection closed');
};

module.exports = { prisma, connectDatabase, closeDatabase };
```

## Input Validation with Joi

Input validation is crucial for API security. Let's implement validation using Joi:

```bash
npm install joi
```

Create validation schemas:

```javascript
// src/validations/authValidation.js
// Authentication request validation schemas using Joi

const Joi = require('joi');

// Password validation pattern
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

// Registration validation schema
const registerSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .lowercase()
        .trim()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),

    password: Joi.string()
        .min(8)
        .max(128)
        .pattern(passwordPattern)
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters',
            'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character',
            'any.required': 'Password is required'
        }),

    confirmPassword: Joi.string()
        .valid(Joi.ref('password'))
        .required()
        .messages({
            'any.only': 'Passwords do not match',
            'any.required': 'Password confirmation is required'
        }),

    name: Joi.string()
        .min(2)
        .max(100)
        .trim()
        .required()
        .messages({
            'string.min': 'Name must be at least 2 characters',
            'string.max': 'Name cannot exceed 100 characters',
            'any.required': 'Name is required'
        })
});

// Login validation schema
const loginSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .lowercase()
        .trim()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),

    password: Joi.string()
        .required()
        .messages({
            'any.required': 'Password is required'
        })
});

// Password reset request schema
const forgotPasswordSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .lowercase()
        .trim()
});

// Password reset schema
const resetPasswordSchema = Joi.object({
    token: Joi.string()
        .required(),

    password: Joi.string()
        .min(8)
        .max(128)
        .pattern(passwordPattern)
        .required(),

    confirmPassword: Joi.string()
        .valid(Joi.ref('password'))
        .required()
});

module.exports = {
    registerSchema,
    loginSchema,
    forgotPasswordSchema,
    resetPasswordSchema
};
```

Create user validation schemas:

```javascript
// src/validations/userValidation.js
// User request validation schemas using Joi

const Joi = require('joi');

// Update user schema
const updateUserSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .trim()
        .messages({
            'string.min': 'Name must be at least 2 characters',
            'string.max': 'Name cannot exceed 100 characters'
        }),

    email: Joi.string()
        .email()
        .lowercase()
        .trim()
        .messages({
            'string.email': 'Please provide a valid email address'
        }),

    role: Joi.string()
        .valid('user', 'admin', 'moderator')
        .messages({
            'any.only': 'Invalid role specified'
        }),

    isActive: Joi.boolean()
}).min(1).messages({
    'object.min': 'At least one field must be provided for update'
});

// Query parameters schema for listing users
const listUsersQuerySchema = Joi.object({
    page: Joi.number()
        .integer()
        .min(1)
        .default(1),

    limit: Joi.number()
        .integer()
        .min(1)
        .max(100)
        .default(10),

    sortBy: Joi.string()
        .valid('createdAt', 'name', 'email')
        .default('createdAt'),

    sortOrder: Joi.string()
        .valid('asc', 'desc')
        .default('desc'),

    role: Joi.string()
        .valid('user', 'admin', 'moderator'),

    search: Joi.string()
        .trim()
        .max(100)
});

// User ID parameter validation
const userIdSchema = Joi.object({
    id: Joi.string()
        .pattern(/^[0-9a-fA-F]{24}$/)
        .required()
        .messages({
            'string.pattern.base': 'Invalid user ID format'
        })
});

module.exports = {
    updateUserSchema,
    listUsersQuerySchema,
    userIdSchema
};
```

Create the validation middleware:

```javascript
// src/middleware/validator.js
// Request validation middleware using Joi schemas

const Joi = require('joi');
const { ApiError } = require('../utils/apiError');

// Validation options
const validationOptions = {
    abortEarly: false, // Return all errors, not just the first
    allowUnknown: false, // Reject unknown fields
    stripUnknown: true // Remove unknown fields from the validated data
};

/**
 * Middleware factory for request validation
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @param {string} property - Request property to validate (body, query, params)
 * @returns {Function} Express middleware function
 */
const validateRequest = (schema, property = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[property], validationOptions);

        if (error) {
            // Extract error messages
            const errorMessages = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message
            }));

            return next(new ApiError(400, 'Validation failed', errorMessages));
        }

        // Replace request property with validated and sanitized data
        req[property] = value;
        next();
    };
};

/**
 * Validate query parameters
 */
const validateQuery = (schema) => validateRequest(schema, 'query');

/**
 * Validate URL parameters
 */
const validateParams = (schema) => validateRequest(schema, 'params');

module.exports = {
    validateRequest,
    validateQuery,
    validateParams
};
```

### Alternative: Validation with Zod

If you prefer Zod (TypeScript-first validation):

```bash
npm install zod
```

```javascript
// src/validations/authValidation.zod.js
// Authentication validation schemas using Zod

const { z } = require('zod');

// Password validation
const passwordSchema = z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
        'Password must contain uppercase, lowercase, number, and special character'
    );

// Registration schema
const registerSchema = z.object({
    email: z.string()
        .email('Please provide a valid email address')
        .toLowerCase()
        .trim(),

    password: passwordSchema,

    confirmPassword: z.string(),

    name: z.string()
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name cannot exceed 100 characters')
        .trim()
}).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
});

// Login schema
const loginSchema = z.object({
    email: z.string()
        .email('Please provide a valid email address')
        .toLowerCase()
        .trim(),

    password: z.string().min(1, 'Password is required')
});

module.exports = {
    registerSchema,
    loginSchema
};
```

## Authentication with JWT

Implement secure JWT-based authentication:

```bash
npm install jsonwebtoken
```

Create the authentication middleware:

```javascript
// src/middleware/auth.js
// JWT authentication and authorization middleware

const jwt = require('jsonwebtoken');
const { ApiError } = require('../utils/apiError');
const User = require('../models/User');

/**
 * Authentication middleware - verifies JWT token
 */
const authenticate = async (req, res, next) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new ApiError(401, 'Access denied. No token provided.');
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find user and attach to request
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            throw new ApiError(401, 'User not found or token invalid');
        }

        if (!user.isActive) {
            throw new ApiError(403, 'Account is deactivated');
        }

        // Attach user to request object
        req.user = user;
        req.token = token;

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return next(new ApiError(401, 'Invalid token'));
        }
        if (error.name === 'TokenExpiredError') {
            return next(new ApiError(401, 'Token expired'));
        }
        next(error);
    }
};

/**
 * Authorization middleware - checks user role
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(new ApiError(401, 'Authentication required'));
        }

        if (!roles.includes(req.user.role)) {
            return next(new ApiError(403, 'You do not have permission to perform this action'));
        }

        next();
    };
};

/**
 * Optional authentication - attaches user if token present, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId).select('-password');

            if (user && user.isActive) {
                req.user = user;
                req.token = token;
            }
        }

        next();
    } catch (error) {
        // Silently continue without authentication
        next();
    }
};

module.exports = {
    authenticate,
    authorize,
    optionalAuth
};
```

Create the authentication service:

```javascript
// src/services/authService.js
// Authentication business logic - token generation and verification

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { ApiError } = require('../utils/apiError');
const logger = require('../utils/logger');

/**
 * Generate JWT access token
 * @param {Object} user - User object
 * @returns {string} JWT token
 */
const generateAccessToken = (user) => {
    return jwt.sign(
        {
            userId: user._id,
            email: user.email,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || '7d',
            issuer: 'my-rest-api',
            audience: 'my-rest-api-users'
        }
    );
};

/**
 * Generate refresh token
 * @returns {string} Refresh token
 */
const generateRefreshToken = () => {
    return crypto.randomBytes(40).toString('hex');
};

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Object} User and tokens
 */
const register = async (userData) => {
    const { email, password, name } = userData;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);

    if (existingUser) {
        throw new ApiError(409, 'Email already registered');
    }

    // Create new user
    const user = await User.create({
        email,
        password,
        name
    });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();

    // Save refresh token to user
    user.refreshToken = refreshToken;
    await user.save();

    logger.info(`New user registered: ${email}`);

    return {
        user: {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role
        },
        accessToken,
        refreshToken
    };
};

/**
 * Login user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Object} User and tokens
 */
const login = async (email, password) => {
    // Find user with password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
        throw new ApiError(401, 'Invalid email or password');
    }

    if (!user.isActive) {
        throw new ApiError(403, 'Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
        throw new ApiError(401, 'Invalid email or password');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();

    // Update user with refresh token and last login
    user.refreshToken = refreshToken;
    user.lastLogin = new Date();
    await user.save();

    logger.info(`User logged in: ${email}`);

    return {
        user: {
            id: user._id,
            email: user.email,
            name: user.name,
            role: user.role
        },
        accessToken,
        refreshToken
    };
};

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Object} New tokens
 */
const refreshAccessToken = async (refreshToken) => {
    const user = await User.findOne({ refreshToken });

    if (!user) {
        throw new ApiError(401, 'Invalid refresh token');
    }

    if (!user.isActive) {
        throw new ApiError(403, 'Account is deactivated');
    }

    // Generate new tokens
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken();

    // Update refresh token
    user.refreshToken = newRefreshToken;
    await user.save();

    return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
    };
};

/**
 * Logout user
 * @param {string} userId - User ID
 */
const logout = async (userId) => {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
    logger.info(`User logged out: ${userId}`);
};

module.exports = {
    register,
    login,
    refreshAccessToken,
    logout,
    generateAccessToken,
    generateRefreshToken
};
```

Create the authentication controller:

```javascript
// src/controllers/authController.js
// Authentication request handlers

const authService = require('../services/authService');
const { asyncHandler } = require('../utils/asyncHandler');

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
const register = asyncHandler(async (req, res) => {
    const result = await authService.register(req.body);

    res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: result
    });
});

/**
 * Login user
 * POST /api/v1/auth/login
 */
const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const result = await authService.login(email, password);

    res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result
    });
});

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
const refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    const result = await authService.refreshAccessToken(refreshToken);

    res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result
    });
});

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
    await authService.logout(req.user._id);

    res.status(200).json({
        success: true,
        message: 'Logout successful'
    });
});

module.exports = {
    register,
    login,
    refreshToken,
    logout
};
```

## Error Handling Middleware

Implement comprehensive error handling:

```javascript
// src/utils/apiError.js
// Custom API error class for consistent error handling

class ApiError extends Error {
    constructor(statusCode, message, errors = []) {
        super(message);

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        this.errors = errors;

        Error.captureStackTrace(this, this.constructor);
    }
}

// Common error factory methods
ApiError.badRequest = (message = 'Bad request', errors = []) => {
    return new ApiError(400, message, errors);
};

ApiError.unauthorized = (message = 'Unauthorized') => {
    return new ApiError(401, message);
};

ApiError.forbidden = (message = 'Forbidden') => {
    return new ApiError(403, message);
};

ApiError.notFound = (message = 'Resource not found') => {
    return new ApiError(404, message);
};

ApiError.conflict = (message = 'Conflict') => {
    return new ApiError(409, message);
};

ApiError.unprocessableEntity = (message = 'Unprocessable entity', errors = []) => {
    return new ApiError(422, message, errors);
};

ApiError.tooManyRequests = (message = 'Too many requests') => {
    return new ApiError(429, message);
};

ApiError.internal = (message = 'Internal server error') => {
    return new ApiError(500, message);
};

module.exports = { ApiError };
```

Create the error handling middleware:

```javascript
// src/middleware/errorHandler.js
// Global error handling middleware

const logger = require('../utils/logger');
const { ApiError } = require('../utils/apiError');

/**
 * Development error response - includes stack trace
 */
const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        success: false,
        status: err.status,
        message: err.message,
        errors: err.errors,
        stack: err.stack
    });
};

/**
 * Production error response - hides implementation details
 */
const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            success: false,
            status: err.status,
            message: err.message,
            errors: err.errors
        });
    } else {
        // Programming or unknown error: don't leak details
        logger.error('Unexpected error:', err);

        res.status(500).json({
            success: false,
            status: 'error',
            message: 'Something went wrong'
        });
    }
};

/**
 * Handle Mongoose CastError (invalid ObjectId)
 */
const handleCastErrorDB = (err) => {
    return new ApiError(400, `Invalid ${err.path}: ${err.value}`);
};

/**
 * Handle Mongoose duplicate key error
 */
const handleDuplicateFieldsDB = (err) => {
    const field = Object.keys(err.keyValue)[0];
    return new ApiError(409, `${field} already exists`);
};

/**
 * Handle Mongoose validation error
 */
const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map(error => ({
        field: error.path,
        message: error.message
    }));
    return new ApiError(400, 'Validation failed', errors);
};

/**
 * Handle JWT errors
 */
const handleJWTError = () => {
    return new ApiError(401, 'Invalid token. Please log in again.');
};

const handleJWTExpiredError = () => {
    return new ApiError(401, 'Token expired. Please log in again.');
};

/**
 * Main error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log error
    logger.error(`${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else {
        let error = { ...err };
        error.message = err.message;

        // Handle specific error types
        if (err.name === 'CastError') error = handleCastErrorDB(err);
        if (err.code === 11000) error = handleDuplicateFieldsDB(err);
        if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
        if (err.name === 'JsonWebTokenError') error = handleJWTError();
        if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();

        sendErrorProd(error, res);
    }
};

module.exports = errorHandler;
```

Create an async handler utility:

```javascript
// src/utils/asyncHandler.js
// Async handler wrapper to eliminate try-catch boilerplate

/**
 * Wraps async controller functions to handle errors automatically
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = { asyncHandler };
```

## Rate Limiting

Implement rate limiting to protect your API from abuse:

```bash
npm install express-rate-limit rate-limit-redis
```

Create the rate limiter middleware:

```javascript
// src/middleware/rateLimiter.js
// Rate limiting middleware to prevent API abuse

const rateLimit = require('express-rate-limit');
const { ApiError } = require('../utils/apiError');

/**
 * Default rate limiter configuration
 */
const createRateLimiter = (options = {}) => {
    return rateLimit({
        // Time window in milliseconds (default: 15 minutes)
        windowMs: options.windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,

        // Maximum requests per window (default: 100)
        max: options.max || parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,

        // Return rate limit info in headers
        standardHeaders: true,

        // Disable legacy X-RateLimit headers
        legacyHeaders: false,

        // Skip successful requests (only count failed)
        skipSuccessfulRequests: options.skipSuccessfulRequests || false,

        // Custom key generator (default: IP address)
        keyGenerator: options.keyGenerator || ((req) => {
            return req.ip || req.headers['x-forwarded-for'] || 'unknown';
        }),

        // Custom handler for rate limit exceeded
        handler: (req, res, next, options) => {
            throw new ApiError(
                429,
                `Too many requests. Please try again after ${Math.ceil(options.windowMs / 60000)} minutes.`
            );
        },

        // Skip rate limiting for certain requests
        skip: options.skip || (() => false),

        // Message when rate limit exceeded
        message: {
            success: false,
            message: 'Too many requests, please try again later'
        }
    });
};

// General API rate limiter
const apiLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // 100 requests per window
});

// Strict rate limiter for authentication endpoints
const authLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 attempts per hour
    skipSuccessfulRequests: true // Only count failed attempts
});

// Rate limiter for password reset
const passwordResetLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3 // 3 requests per hour
});

// Rate limiter for file uploads
const uploadLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10 // 10 uploads per hour
});

module.exports = {
    createRateLimiter,
    apiLimiter,
    authLimiter,
    passwordResetLimiter,
    uploadLimiter
};
```

Apply rate limiting in your routes:

```javascript
// src/routes/authRoutes.js (updated with rate limiting)
// Authentication routes with rate limiting protection

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRequest } = require('../middleware/validator');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const { registerSchema, loginSchema } = require('../validations/authValidation');

// Apply stricter rate limiting to auth endpoints
router.post(
    '/register',
    authLimiter,
    validateRequest(registerSchema),
    authController.register
);

router.post(
    '/login',
    authLimiter,
    validateRequest(loginSchema),
    authController.login
);

router.post(
    '/forgot-password',
    passwordResetLimiter,
    authController.forgotPassword
);

module.exports = router;
```

## API Documentation with Swagger

Set up Swagger/OpenAPI documentation for your API:

```bash
npm install swagger-jsdoc swagger-ui-express
```

Create the Swagger configuration:

```javascript
// src/config/swagger.js
// Swagger/OpenAPI documentation configuration

const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Swagger definition
const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'REST API Documentation',
        version: '1.0.0',
        description: 'A comprehensive REST API built with Node.js and Express',
        contact: {
            name: 'API Support',
            email: 'support@example.com'
        },
        license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT'
        }
    },
    servers: [
        {
            url: 'http://localhost:3000/api/v1',
            description: 'Development server'
        },
        {
            url: 'https://api.example.com/v1',
            description: 'Production server'
        }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'Enter your JWT token'
            }
        },
        schemas: {
            User: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string',
                        description: 'User ID'
                    },
                    email: {
                        type: 'string',
                        format: 'email',
                        description: 'User email address'
                    },
                    name: {
                        type: 'string',
                        description: 'User display name'
                    },
                    role: {
                        type: 'string',
                        enum: ['user', 'admin', 'moderator'],
                        description: 'User role'
                    },
                    createdAt: {
                        type: 'string',
                        format: 'date-time',
                        description: 'Account creation timestamp'
                    }
                }
            },
            Error: {
                type: 'object',
                properties: {
                    success: {
                        type: 'boolean',
                        example: false
                    },
                    message: {
                        type: 'string',
                        description: 'Error message'
                    },
                    errors: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                field: { type: 'string' },
                                message: { type: 'string' }
                            }
                        }
                    }
                }
            },
            AuthResponse: {
                type: 'object',
                properties: {
                    success: {
                        type: 'boolean',
                        example: true
                    },
                    message: {
                        type: 'string'
                    },
                    data: {
                        type: 'object',
                        properties: {
                            user: {
                                $ref: '#/components/schemas/User'
                            },
                            accessToken: {
                                type: 'string',
                                description: 'JWT access token'
                            },
                            refreshToken: {
                                type: 'string',
                                description: 'Refresh token'
                            }
                        }
                    }
                }
            }
        },
        responses: {
            UnauthorizedError: {
                description: 'Access token is missing or invalid',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/Error'
                        }
                    }
                }
            },
            NotFoundError: {
                description: 'The specified resource was not found',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/Error'
                        }
                    }
                }
            },
            ValidationError: {
                description: 'Validation failed',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/Error'
                        }
                    }
                }
            }
        }
    },
    tags: [
        {
            name: 'Authentication',
            description: 'User authentication endpoints'
        },
        {
            name: 'Users',
            description: 'User management endpoints'
        }
    ]
};

// Swagger options
const swaggerOptions = {
    swaggerDefinition,
    // Path to the API routes files
    apis: ['./src/routes/*.js', './src/controllers/*.js']
};

// Generate Swagger specification
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger UI options
const swaggerUiOptions = {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'API Documentation'
};

/**
 * Setup Swagger documentation routes
 * @param {Express} app - Express application
 */
const setupSwagger = (app) => {
    // Serve Swagger UI
    app.use(
        '/api-docs',
        swaggerUi.serve,
        swaggerUi.setup(swaggerSpec, swaggerUiOptions)
    );

    // Serve raw Swagger JSON
    app.get('/api-docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(swaggerSpec);
    });
};

module.exports = { setupSwagger, swaggerSpec };
```

Add JSDoc annotations to your routes for automatic documentation:

```javascript
// src/routes/authRoutes.js (with Swagger annotations)
// Authentication routes with Swagger documentation

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRequest } = require('../middleware/validator');
const { authLimiter } = require('../middleware/rateLimiter');
const { registerSchema, loginSchema } = require('../validations/authValidation');

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - confirmPassword
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *                 example: SecurePass123!
 *               confirmPassword:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123!
 *               name:
 *                 type: string
 *                 example: John Doe
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Email already registered
 */
router.post(
    '/register',
    authLimiter,
    validateRequest(registerSchema),
    authController.register
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user and get tokens
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: SecurePass123!
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many login attempts
 */
router.post(
    '/login',
    authLimiter,
    validateRequest(loginSchema),
    authController.login
);

module.exports = router;
```

## Production Deployment with PM2

PM2 is a production process manager for Node.js applications:

```bash
# Install PM2 globally
sudo npm install -g pm2
```

Create the PM2 ecosystem configuration:

```javascript
// ecosystem.config.js
// PM2 production configuration

module.exports = {
    apps: [{
        // Application name
        name: 'my-rest-api',

        // Entry point
        script: './src/server.js',

        // Number of instances (0 = max CPU cores)
        instances: 'max',

        // Cluster mode for load balancing
        exec_mode: 'cluster',

        // Auto-restart on failure
        autorestart: true,

        // Watch for file changes (disable in production)
        watch: false,

        // Maximum memory before restart
        max_memory_restart: '1G',

        // Environment variables
        env: {
            NODE_ENV: 'development',
            PORT: 3000
        },

        // Production environment
        env_production: {
            NODE_ENV: 'production',
            PORT: 3000
        },

        // Logging configuration
        log_file: './logs/combined.log',
        error_file: './logs/error.log',
        out_file: './logs/out.log',
        log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

        // Merge logs from all instances
        merge_logs: true,

        // Graceful shutdown timeout
        kill_timeout: 5000,

        // Wait time before forcing restart
        wait_ready: true,
        listen_timeout: 10000,

        // Exponential backoff restart delay
        exp_backoff_restart_delay: 100,

        // Maximum restart attempts
        max_restarts: 10,

        // Restart delay
        restart_delay: 1000
    }],

    // Deployment configuration
    deploy: {
        production: {
            // SSH user
            user: 'ubuntu',

            // Server IP or hostname
            host: ['your-server-ip'],

            // SSH port
            port: '22',

            // Git branch to deploy
            ref: 'origin/main',

            // Git repository
            repo: 'git@github.com:username/my-rest-api.git',

            // Deployment path on server
            path: '/var/www/my-rest-api',

            // SSH options
            ssh_options: 'StrictHostKeyChecking=no',

            // Commands to run before starting
            'pre-setup': 'apt-get update && apt-get install -y git',

            // Commands after pulling code
            'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',

            // Environment variables
            env: {
                NODE_ENV: 'production'
            }
        }
    }
};
```

PM2 management commands:

```bash
# Start application in production mode
pm2 start ecosystem.config.js --env production

# View running processes
pm2 list

# Monitor processes in real-time
pm2 monit

# View logs
pm2 logs my-rest-api

# Restart application
pm2 restart my-rest-api

# Reload with zero downtime
pm2 reload my-rest-api

# Stop application
pm2 stop my-rest-api

# Delete application from PM2
pm2 delete my-rest-api

# Save current process list for startup
pm2 save

# Generate startup script
pm2 startup

# Deploy to production server
pm2 deploy production setup
pm2 deploy production
```

Create a deployment script:

```bash
#!/bin/bash
# deploy.sh - Production deployment script

set -e

echo "Starting deployment..."

# Pull latest code
git pull origin main

# Install dependencies
npm ci --production

# Run database migrations (if using Prisma)
# npx prisma migrate deploy

# Build application (if using TypeScript)
# npm run build

# Reload PM2 with zero downtime
pm2 reload ecosystem.config.js --env production

echo "Deployment completed successfully!"
```

## Testing with Jest

Set up comprehensive testing with Jest:

```bash
npm install -D jest supertest @types/jest
```

Configure Jest:

```javascript
// jest.config.js
// Jest testing configuration

module.exports = {
    // Test environment
    testEnvironment: 'node',

    // Root directory for tests
    roots: ['<rootDir>/tests'],

    // Test file patterns
    testMatch: [
        '**/__tests__/**/*.js',
        '**/*.test.js',
        '**/*.spec.js'
    ],

    // Files to ignore
    testPathIgnorePatterns: [
        '/node_modules/',
        '/dist/'
    ],

    // Coverage collection
    collectCoverage: true,
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/server.js',
        '!**/node_modules/**'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],

    // Coverage thresholds
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70
        }
    },

    // Setup files
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],

    // Test timeout
    testTimeout: 30000,

    // Verbose output
    verbose: true,

    // Force exit after tests complete
    forceExit: true,

    // Clear mocks between tests
    clearMocks: true,

    // Restore mocks automatically
    restoreMocks: true
};
```

Create the test setup file:

```javascript
// tests/setup.js
// Jest test setup and global configuration

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

// Setup before all tests
beforeAll(async () => {
    // Create in-memory MongoDB instance
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    // Connect to in-memory database
    await mongoose.connect(mongoUri);
});

// Cleanup after each test
afterEach(async () => {
    // Clear all collections
    const collections = mongoose.connection.collections;
    for (const key in collections) {
        await collections[key].deleteMany({});
    }
});

// Cleanup after all tests
afterAll(async () => {
    // Disconnect and stop MongoDB
    await mongoose.disconnect();
    await mongoServer.stop();
});

// Global test timeout
jest.setTimeout(30000);
```

Install mongodb-memory-server for testing:

```bash
npm install -D mongodb-memory-server
```

Write unit tests for services:

```javascript
// tests/unit/authService.test.js
// Unit tests for authentication service

const authService = require('../../src/services/authService');
const User = require('../../src/models/User');
const { ApiError } = require('../../src/utils/apiError');

describe('Auth Service', () => {
    describe('register', () => {
        it('should register a new user successfully', async () => {
            const userData = {
                email: 'test@example.com',
                password: 'SecurePass123!',
                name: 'Test User'
            };

            const result = await authService.register(userData);

            expect(result).toHaveProperty('user');
            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result.user.email).toBe(userData.email);
            expect(result.user.name).toBe(userData.name);
        });

        it('should throw error for duplicate email', async () => {
            const userData = {
                email: 'duplicate@example.com',
                password: 'SecurePass123!',
                name: 'Test User'
            };

            // Register first user
            await authService.register(userData);

            // Try to register with same email
            await expect(authService.register(userData))
                .rejects
                .toThrow('Email already registered');
        });
    });

    describe('login', () => {
        beforeEach(async () => {
            // Create a test user
            await User.create({
                email: 'login@example.com',
                password: 'SecurePass123!',
                name: 'Login Test'
            });
        });

        it('should login successfully with valid credentials', async () => {
            const result = await authService.login(
                'login@example.com',
                'SecurePass123!'
            );

            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result.user.email).toBe('login@example.com');
        });

        it('should throw error for invalid email', async () => {
            await expect(authService.login('wrong@example.com', 'password'))
                .rejects
                .toThrow('Invalid email or password');
        });

        it('should throw error for invalid password', async () => {
            await expect(authService.login('login@example.com', 'wrongpassword'))
                .rejects
                .toThrow('Invalid email or password');
        });
    });
});
```

Write integration tests for API endpoints:

```javascript
// tests/integration/auth.test.js
// Integration tests for authentication endpoints

const request = require('supertest');
const app = require('../../src/app');
const User = require('../../src/models/User');

describe('Auth Endpoints', () => {
    describe('POST /api/v1/auth/register', () => {
        it('should register a new user', async () => {
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'newuser@example.com',
                    password: 'SecurePass123!',
                    confirmPassword: 'SecurePass123!',
                    name: 'New User'
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('accessToken');
            expect(response.body.data.user.email).toBe('newuser@example.com');
        });

        it('should return 400 for invalid email format', async () => {
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'invalid-email',
                    password: 'SecurePass123!',
                    confirmPassword: 'SecurePass123!',
                    name: 'Test User'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });

        it('should return 400 for password mismatch', async () => {
            const response = await request(app)
                .post('/api/v1/auth/register')
                .send({
                    email: 'test@example.com',
                    password: 'SecurePass123!',
                    confirmPassword: 'DifferentPass123!',
                    name: 'Test User'
                })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /api/v1/auth/login', () => {
        beforeEach(async () => {
            // Create test user
            await User.create({
                email: 'existing@example.com',
                password: 'SecurePass123!',
                name: 'Existing User'
            });
        });

        it('should login successfully', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'existing@example.com',
                    password: 'SecurePass123!'
                })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('accessToken');
        });

        it('should return 401 for invalid credentials', async () => {
            const response = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'existing@example.com',
                    password: 'WrongPassword123!'
                })
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });

    describe('Protected Routes', () => {
        let authToken;

        beforeEach(async () => {
            // Create and login user
            await User.create({
                email: 'protected@example.com',
                password: 'SecurePass123!',
                name: 'Protected User'
            });

            const loginResponse = await request(app)
                .post('/api/v1/auth/login')
                .send({
                    email: 'protected@example.com',
                    password: 'SecurePass123!'
                });

            authToken = loginResponse.body.data.accessToken;
        });

        it('should access protected route with valid token', async () => {
            const response = await request(app)
                .get('/api/v1/users/me')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.email).toBe('protected@example.com');
        });

        it('should return 401 without token', async () => {
            await request(app)
                .get('/api/v1/users/me')
                .expect(401);
        });

        it('should return 401 with invalid token', async () => {
            await request(app)
                .get('/api/v1/users/me')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);
        });
    });
});
```

Add test scripts to package.json:

```json
{
    "scripts": {
        "start": "node src/server.js",
        "dev": "nodemon src/server.js",
        "test": "jest",
        "test:watch": "jest --watch",
        "test:coverage": "jest --coverage",
        "test:integration": "jest --testPathPattern=integration",
        "test:unit": "jest --testPathPattern=unit",
        "lint": "eslint src/",
        "lint:fix": "eslint src/ --fix"
    }
}
```

## Troubleshooting Common Issues

### Issue 1: EADDRINUSE - Port Already in Use

This error occurs when the port is already being used by another process.

```bash
# Find process using the port
sudo lsof -i :3000

# Kill the process (replace PID with actual process ID)
kill -9 PID

# Or use a different port in your .env file
PORT=3001
```

### Issue 2: MongoDB Connection Errors

Common MongoDB connection issues and solutions:

```bash
# Check if MongoDB is running
sudo systemctl status mongodb

# Start MongoDB if not running
sudo systemctl start mongodb

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Verify connection string format
# Correct: mongodb://localhost:27017/myapi
# With auth: mongodb://username:password@localhost:27017/myapi?authSource=admin
```

### Issue 3: JWT Token Issues

Common JWT-related problems:

```javascript
// Ensure JWT_SECRET is set and consistent across restarts
// Check token expiration
const jwt = require('jsonwebtoken');
const decoded = jwt.decode(token);
console.log('Token expires:', new Date(decoded.exp * 1000));

// Common mistake: Using different secrets in different environments
// Solution: Use environment variables consistently
```

### Issue 4: CORS Errors

Debugging CORS issues:

```javascript
// Enable CORS debugging
app.use(cors({
    origin: (origin, callback) => {
        console.log('Request origin:', origin);
        // Your logic here
        callback(null, true);
    }
}));

// Common fix: Include credentials option
app.use(cors({
    origin: 'http://localhost:3001',
    credentials: true
}));
```

### Issue 5: Memory Leaks

Detecting and fixing memory leaks:

```bash
# Monitor memory usage
pm2 monit

# Add memory limit in PM2
pm2 start app.js --max-memory-restart 500M

# Use Node.js inspector for memory profiling
node --inspect src/server.js
```

### Issue 6: Permission Denied Errors

Fixing file and port permission issues:

```bash
# Fix npm permissions (avoid using sudo with npm)
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# Allow Node.js to use ports below 1024
sudo setcap 'cap_net_bind_service=+ep' $(which node)

# Fix file permissions
sudo chown -R $USER:$USER /var/www/my-rest-api
```

### Issue 7: Environment Variable Issues

Troubleshooting environment variables:

```javascript
// Debug environment loading
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('Loaded .env:', require('dotenv').config());

// Ensure .env file exists and is readable
// Check for invisible characters in .env file
// Use dotenv-safe for validation
const dotenvSafe = require('dotenv-safe');
dotenvSafe.config({
    example: '.env.example'
});
```

### Issue 8: Database Query Performance

Optimizing slow queries:

```javascript
// Enable Mongoose query debugging
mongoose.set('debug', true);

// Add indexes for frequently queried fields
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

// Use lean() for read-only queries
const users = await User.find().lean();

// Limit and paginate results
const users = await User.find()
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ createdAt: -1 });
```

## Monitoring with OneUptime

Building a robust REST API is just the first step. In production, you need comprehensive monitoring to ensure your API remains reliable, performant, and available. **OneUptime** provides an all-in-one observability platform that helps you monitor your REST API effectively.

With OneUptime, you can:

- **Uptime Monitoring**: Set up HTTP monitors to check your API endpoints at regular intervals and get alerted immediately when your API goes down
- **Performance Monitoring**: Track response times, throughput, and identify slow endpoints that need optimization
- **Error Tracking**: Capture and analyze errors in real-time with detailed stack traces and context
- **Status Pages**: Create public or private status pages to communicate API availability to your users
- **Incident Management**: Automate incident response with on-call schedules, escalation policies, and notification channels
- **Log Management**: Centralize your API logs and search through them efficiently for debugging
- **Metrics and Dashboards**: Visualize key performance indicators with customizable dashboards

To get started with monitoring your REST API, visit [OneUptime](https://oneuptime.com) and set up monitoring for your `/health` endpoint and critical API routes. This ensures you're the first to know when issues arise, allowing you to maintain high availability for your users.
