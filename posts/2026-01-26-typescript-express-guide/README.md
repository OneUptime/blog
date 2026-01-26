# How to Use TypeScript with Express.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: TypeScript, Express.js, Node.js, Backend, Web Development, API

Description: A hands-on guide to building Express.js applications with TypeScript, covering project setup, typed middleware, request and response handling, error management, and patterns for scalable API development.

---

TypeScript brings static typing to Express.js applications, catching bugs during development rather than at runtime. While you can write Express apps in JavaScript just fine, TypeScript shines when your codebase grows and multiple developers work on the same project. This guide walks through setting up TypeScript with Express and building type-safe APIs that scale.

## Project Setup

Start with a fresh project and install the necessary dependencies:

```bash
mkdir express-typescript-app && cd express-typescript-app
npm init -y

# Install production dependencies
npm install express cors helmet

# Install development dependencies
npm install --save-dev typescript ts-node-dev @types/node @types/express @types/cors

# Initialize TypeScript configuration
npx tsc --init
```

Update `tsconfig.json` with settings optimized for Express development:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "ts-node-dev --respawn --transpile-only src/index.ts"
  }
}
```

## Basic Express Server with Types

Create your entry point with proper type annotations:

```typescript
// src/index.ts
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app: Application = express();
const PORT: number = parseInt(process.env.PORT || '3000', 10);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check route
app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

## Defining Types for Your Domain

Create interfaces and types that represent your application's data:

```typescript
// src/types/index.ts

// Base interface for database entities
export interface BaseEntity {
    id: number;
    createdAt: Date;
    updatedAt: Date;
}

// User entity
export interface User extends BaseEntity {
    email: string;
    name: string;
    role: UserRole;
}

// Enum for user roles
export enum UserRole {
    ADMIN = 'admin',
    USER = 'user',
    GUEST = 'guest'
}

// Data Transfer Objects - what clients send
export interface CreateUserDTO {
    email: string;
    name: string;
    role?: UserRole;
}

export interface UpdateUserDTO {
    email?: string;
    name?: string;
    role?: UserRole;
}

// API response wrapper
export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Paginated response
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
```

## Typed Request Handlers

Express provides generic types for Request and Response. You can type the request body, params, and query:

```typescript
// src/controllers/userController.ts
import { Request, Response, NextFunction } from 'express';
import { User, CreateUserDTO, UpdateUserDTO, ApiResponse } from '../types';

// Type the request body
type CreateUserRequest = Request<{}, ApiResponse<User>, CreateUserDTO>;

// Type request params
type UserIdParams = { id: string };
type GetUserRequest = Request<UserIdParams>;
type UpdateUserRequest = Request<UserIdParams, ApiResponse<User>, UpdateUserDTO>;

// In-memory store for demonstration
let users: User[] = [];
let nextId = 1;

export const userController = {
    // Get all users
    getAll: (req: Request, res: Response<ApiResponse<User[]>>) => {
        res.json({
            success: true,
            data: users
        });
    },

    // Get user by ID
    getById: (req: GetUserRequest, res: Response<ApiResponse<User | null>>) => {
        const id = parseInt(req.params.id, 10);
        const user = users.find(u => u.id === id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            data: user
        });
    },

    // Create new user
    create: (req: CreateUserRequest, res: Response<ApiResponse<User>>) => {
        const { email, name, role } = req.body;

        const user: User = {
            id: nextId++,
            email,
            name,
            role: role || UserRole.USER,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        users.push(user);

        res.status(201).json({
            success: true,
            data: user,
            message: 'User created'
        });
    },

    // Update user
    update: (req: UpdateUserRequest, res: Response<ApiResponse<User | null>>) => {
        const id = parseInt(req.params.id, 10);
        const userIndex = users.findIndex(u => u.id === id);

        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // TypeScript ensures only valid fields are updated
        const updates = req.body;
        users[userIndex] = {
            ...users[userIndex],
            ...updates,
            updatedAt: new Date()
        };

        res.json({
            success: true,
            data: users[userIndex]
        });
    },

    // Delete user
    delete: (req: Request<UserIdParams>, res: Response<ApiResponse<null>>) => {
        const id = parseInt(req.params.id, 10);
        const userIndex = users.findIndex(u => u.id === id);

        if (userIndex === -1) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        users.splice(userIndex, 1);

        res.json({
            success: true,
            message: 'User deleted'
        });
    }
};

// Import UserRole for the controller
import { UserRole } from '../types';
```

## Typed Middleware

Middleware in Express can be tricky to type. Here are common patterns:

```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { User } from '../types';

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: User;
            requestId?: string;
        }
    }
}

// Authentication middleware
export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        res.status(401).json({
            success: false,
            error: 'Authentication required'
        });
        return;
    }

    // Verify token and attach user (simplified example)
    try {
        // In real apps, verify JWT and fetch user
        req.user = {
            id: 1,
            email: 'user@example.com',
            name: 'John Doe',
            role: UserRole.USER,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        next();
    } catch (error) {
        res.status(401).json({
            success: false,
            error: 'Invalid token'
        });
    }
};

// Import UserRole
import { UserRole } from '../types';
```

Role-based authorization middleware:

```typescript
// src/middleware/authorize.ts
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';

// Factory function that returns typed middleware
export const authorize = (...allowedRoles: UserRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required'
            });
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                error: 'Insufficient permissions'
            });
            return;
        }

        next();
    };
};

// Usage in routes:
// router.delete('/:id', authenticate, authorize(UserRole.ADMIN), userController.delete);
```

## Request Validation with Types

Create a validation middleware that works with TypeScript:

```typescript
// src/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';

// Generic validation function type
type ValidatorFn<T> = (data: unknown) => { valid: boolean; data?: T; errors?: string[] };

// Validation middleware factory
export const validateBody = <T>(validator: ValidatorFn<T>) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const result = validator(req.body);

        if (!result.valid) {
            res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: result.errors
            });
            return;
        }

        // Replace body with validated and typed data
        req.body = result.data;
        next();
    };
};

// Example validator for CreateUserDTO
import { CreateUserDTO, UserRole } from '../types';

export const validateCreateUser: ValidatorFn<CreateUserDTO> = (data) => {
    const errors: string[] = [];

    if (typeof data !== 'object' || data === null) {
        return { valid: false, errors: ['Request body must be an object'] };
    }

    const body = data as Record<string, unknown>;

    // Email validation
    if (!body.email || typeof body.email !== 'string') {
        errors.push('Email is required and must be a string');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
        errors.push('Email must be a valid email address');
    }

    // Name validation
    if (!body.name || typeof body.name !== 'string') {
        errors.push('Name is required and must be a string');
    } else if (body.name.length < 2 || body.name.length > 100) {
        errors.push('Name must be between 2 and 100 characters');
    }

    // Role validation (optional)
    if (body.role !== undefined) {
        if (!Object.values(UserRole).includes(body.role as UserRole)) {
            errors.push(`Role must be one of: ${Object.values(UserRole).join(', ')}`);
        }
    }

    if (errors.length > 0) {
        return { valid: false, errors };
    }

    return {
        valid: true,
        data: {
            email: body.email as string,
            name: body.name as string,
            role: body.role as UserRole | undefined
        }
    };
};
```

## Error Handling with Custom Error Classes

Create typed error classes for consistent error handling:

```typescript
// src/errors/AppError.ts
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;

        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string) {
        super(`${resource} not found`, 404);
    }
}

export class ValidationError extends AppError {
    public readonly details: string[];

    constructor(details: string[]) {
        super('Validation failed', 400);
        this.details = details;
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'Authentication required') {
        super(message, 401);
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Access denied') {
        super(message, 403);
    }
}
```

Create the error handling middleware:

```typescript
// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../errors/AppError';

interface ErrorResponse {
    success: false;
    error: string;
    details?: string[];
    stack?: string;
}

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response<ErrorResponse>,
    next: NextFunction
): void => {
    console.error('Error:', err);

    // Handle known operational errors
    if (err instanceof ValidationError) {
        res.status(err.statusCode).json({
            success: false,
            error: err.message,
            details: err.details
        });
        return;
    }

    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: err.message
        });
        return;
    }

    // Handle unknown errors
    const isDev = process.env.NODE_ENV === 'development';
    res.status(500).json({
        success: false,
        error: isDev ? err.message : 'Internal server error',
        ...(isDev && { stack: err.stack })
    });
};

// 404 handler
export const notFoundHandler = (req: Request, res: Response): void => {
    res.status(404).json({
        success: false,
        error: `Cannot ${req.method} ${req.path}`
    });
};
```

## Async Handler Wrapper

Wrap async route handlers to catch errors automatically:

```typescript
// src/utils/asyncHandler.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (
    req: Request,
    res: Response,
    next: NextFunction
) => Promise<void>;

export const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
```

## Router Setup with Types

Organize routes in a typed manner:

```typescript
// src/routes/userRoutes.ts
import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { validateBody, validateCreateUser } from '../middleware/validate';
import { UserRole } from '../types';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Public routes
router.get('/', asyncHandler(userController.getAll));
router.get('/:id', asyncHandler(userController.getById));

// Protected routes
router.post(
    '/',
    authenticate,
    validateBody(validateCreateUser),
    asyncHandler(userController.create)
);

router.patch(
    '/:id',
    authenticate,
    asyncHandler(userController.update)
);

router.delete(
    '/:id',
    authenticate,
    authorize(UserRole.ADMIN),
    asyncHandler(userController.delete)
);

export default router;
```

## Service Layer with Generics

Create a typed service layer for business logic:

```typescript
// src/services/BaseService.ts
import { BaseEntity } from '../types';
import { NotFoundError } from '../errors/AppError';

export abstract class BaseService<T extends BaseEntity, CreateDTO, UpdateDTO> {
    protected items: T[] = [];
    protected nextId = 1;

    abstract create(data: CreateDTO): Promise<T>;

    async findAll(): Promise<T[]> {
        return this.items;
    }

    async findById(id: number): Promise<T> {
        const item = this.items.find(i => i.id === id);
        if (!item) {
            throw new NotFoundError('Resource');
        }
        return item;
    }

    async update(id: number, data: UpdateDTO): Promise<T> {
        const index = this.items.findIndex(i => i.id === id);
        if (index === -1) {
            throw new NotFoundError('Resource');
        }

        this.items[index] = {
            ...this.items[index],
            ...data,
            updatedAt: new Date()
        };

        return this.items[index];
    }

    async delete(id: number): Promise<void> {
        const index = this.items.findIndex(i => i.id === id);
        if (index === -1) {
            throw new NotFoundError('Resource');
        }
        this.items.splice(index, 1);
    }
}
```

Implement a concrete service:

```typescript
// src/services/UserService.ts
import { BaseService } from './BaseService';
import { User, CreateUserDTO, UpdateUserDTO, UserRole } from '../types';

class UserService extends BaseService<User, CreateUserDTO, UpdateUserDTO> {
    async create(data: CreateUserDTO): Promise<User> {
        const user: User = {
            id: this.nextId++,
            email: data.email,
            name: data.name,
            role: data.role || UserRole.USER,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        this.items.push(user);
        return user;
    }

    async findByEmail(email: string): Promise<User | undefined> {
        return this.items.find(u => u.email === email);
    }
}

// Export singleton instance
export const userService = new UserService();
```

## Project Structure

Here is the recommended project structure for a TypeScript Express application:

```
express-typescript-app/
  src/
    index.ts              # Application entry point
    types/
      index.ts            # Type definitions
    controllers/
      userController.ts   # Route handlers
    services/
      BaseService.ts      # Generic service class
      UserService.ts      # User-specific logic
    middleware/
      auth.ts             # Authentication
      authorize.ts        # Authorization
      validate.ts         # Request validation
      errorHandler.ts     # Error handling
    routes/
      index.ts            # Route aggregator
      userRoutes.ts       # User routes
    errors/
      AppError.ts         # Custom error classes
    utils/
      asyncHandler.ts     # Async wrapper
    config/
      index.ts            # Configuration
  dist/                   # Compiled JavaScript
  package.json
  tsconfig.json
```

## Complete Application Entry Point

Bring everything together:

```typescript
// src/index.ts
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import userRoutes from './routes/userRoutes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app: Application = express();
const PORT: number = parseInt(process.env.PORT || '3000', 10);

// Security and parsing middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/users', userRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
```

## Building for Production

Compile TypeScript and run the production build:

```bash
# Build
npm run build

# Start production server
NODE_ENV=production npm start
```

A production Dockerfile:

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

## Summary

TypeScript transforms Express.js development by adding compile-time type checking that catches errors before they reach production. The key patterns covered include:

- Typing request handlers with generic Request and Response types
- Extending Express types to add custom properties like user data
- Creating typed middleware for authentication and validation
- Building generic service classes with proper type constraints
- Handling errors with custom typed error classes

The initial setup requires more boilerplate than plain JavaScript, but the investment pays off as your codebase grows. Your IDE provides better autocomplete, refactoring becomes safer, and new team members understand the code faster. Start with the basics and add more sophisticated patterns as your application evolves.
