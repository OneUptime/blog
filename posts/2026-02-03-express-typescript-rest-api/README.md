# How to Build REST APIs with Express and TypeScript

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, Express, TypeScript, REST API, Backend

Description: Learn how to build type-safe REST APIs with Express and TypeScript. This guide covers project setup, typed routes, middleware, and validation.

---

Building REST APIs with Express is straightforward, but adding TypeScript transforms the development experience. Type safety catches errors at compile time, IDE autocompletion speeds up development, and self-documenting types make your codebase easier to maintain.

This guide walks you through building a production-ready REST API with Express and TypeScript, covering everything from project setup to validation with Zod.

## Project Setup

### Initialize the Project

```bash
mkdir express-typescript-api
cd express-typescript-api
npm init -y
```

### Install Dependencies

```bash
# Core dependencies
npm install express cors helmet

# TypeScript and types
npm install -D typescript ts-node @types/node @types/express @types/cors

# Validation
npm install zod

# Development tools
npm install -D nodemon tsx
```

### Configure TypeScript

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node",
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Update package.json Scripts

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "typecheck": "tsc --noEmit"
  }
}
```

## Project Structure

```
src/
  index.ts              # Application entry point
  app.ts                # Express app configuration
  routes/
    index.ts            # Route aggregator
    users.routes.ts     # User routes
    posts.routes.ts     # Post routes
  controllers/
    users.controller.ts
    posts.controller.ts
  services/
    users.service.ts
    posts.service.ts
  middleware/
    error.middleware.ts
    validate.middleware.ts
    auth.middleware.ts
  schemas/
    user.schema.ts
    post.schema.ts
  types/
    index.ts
    express.d.ts
```

## Basic Express Setup with TypeScript

### src/app.ts

```typescript
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/error.middleware';
import routes from './routes';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling (must be last)
app.use(errorHandler);

export default app;
```

### src/index.ts

```typescript
import app from './app';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
```

## Typed Request and Response

### Extending Express Types

Create `src/types/express.d.ts`:

```typescript
import { Request } from 'express';

// Extend Express Request to include user after authentication
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: 'admin' | 'user';
      };
    }
  }
}

export {};
```

### Creating Type-Safe Request Handlers

```typescript
// src/types/index.ts
import { Request, Response, NextFunction } from 'express';

// Generic typed request with body, query, and params
export interface TypedRequest<
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown
> extends Request {
  body: TBody;
  query: TQuery;
  params: TParams;
}

// Async handler wrapper to catch errors
export type AsyncHandler<
  TBody = unknown,
  TQuery = unknown,
  TParams = unknown
> = (
  req: TypedRequest<TBody, TQuery, TParams>,
  res: Response,
  next: NextFunction
) => Promise<void>;

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
```

## Validation with Zod

Zod provides runtime validation with automatic TypeScript type inference. Define your schema once and get both validation and types.

### User Schema

```typescript
// src/schemas/user.schema.ts
import { z } from 'zod';

// Base user schema
export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(2).max(100),
  role: z.enum(['admin', 'user']).default('user'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for creating a user (no id, dates auto-generated)
export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain an uppercase letter')
      .regex(/[0-9]/, 'Password must contain a number'),
    role: z.enum(['admin', 'user']).optional(),
  }),
});

// Schema for updating a user
export const updateUserSchema = z.object({
  body: z.object({
    email: z.string().email().optional(),
    name: z.string().min(2).max(100).optional(),
    role: z.enum(['admin', 'user']).optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
});

// Schema for getting a user by ID
export const getUserSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID'),
  }),
});

// Schema for listing users with pagination
export const listUsersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    role: z.enum(['admin', 'user']).optional(),
    search: z.string().optional(),
  }),
});

// Infer types from schemas
export type User = z.infer<typeof userSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
export type ListUsersQuery = z.infer<typeof listUsersSchema>['query'];
```

### Post Schema

```typescript
// src/schemas/post.schema.ts
import { z } from 'zod';

export const postSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  published: z.boolean().default(false),
  authorId: z.string().uuid(),
  tags: z.array(z.string()).default([]),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createPostSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200),
    content: z.string().min(1, 'Content is required'),
    published: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const updatePostSchema = z.object({
  body: z.object({
    title: z.string().min(1).max(200).optional(),
    content: z.string().min(1).optional(),
    published: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  }),
  params: z.object({
    id: z.string().uuid('Invalid post ID'),
  }),
});

export const getPostSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid post ID'),
  }),
});

export const listPostsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
    published: z.coerce.boolean().optional(),
    authorId: z.string().uuid().optional(),
    tag: z.string().optional(),
  }),
});

export type Post = z.infer<typeof postSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>['body'];
export type UpdatePostInput = z.infer<typeof updatePostSchema>['body'];
export type ListPostsQuery = z.infer<typeof listPostsSchema>['query'];
```

## Validation Middleware

```typescript
// src/middleware/validate.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse and validate request against schema
      const validated = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Replace request data with validated and transformed data
      req.body = validated.body;
      req.query = validated.query as typeof req.query;
      req.params = validated.params as typeof req.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors,
        });
      }

      next(error);
    }
  };
};
```

## Error Handling Middleware

```typescript
// src/middleware/error.middleware.ts
import { Request, Response, NextFunction } from 'express';

// Custom error class
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Common error types
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}

// Error handler middleware
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error for debugging
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Handle known operational errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
  }

  // Handle unexpected errors
  const statusCode = 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message;

  res.status(statusCode).json({
    success: false,
    error: message,
  });
};

// Async wrapper to catch errors in async route handlers
export const asyncHandler = <T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
```

## Authentication Middleware

```typescript
// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from './error.middleware';

// Simple token verification (replace with your auth logic)
const verifyToken = (token: string) => {
  // In production, verify JWT or session token
  // This is a simplified example
  if (token === 'valid-token') {
    return { id: '123', email: 'user@example.com', role: 'user' as const };
  }
  if (token === 'admin-token') {
    return { id: '456', email: 'admin@example.com', role: 'admin' as const };
  }
  return null;
};

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('No token provided');
  }

  const token = authHeader.split(' ')[1];
  const user = verifyToken(token);

  if (!user) {
    throw new UnauthorizedError('Invalid token');
  }

  req.user = user;
  next();
};

// Role-based authorization
export const authorize = (...allowedRoles: Array<'admin' | 'user'>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    next();
  };
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const user = verifyToken(token);
    if (user) {
      req.user = user;
    }
  }

  next();
};
```

## Service Layer

Services contain your business logic and data access. They should be independent of Express.

```typescript
// src/services/users.service.ts
import { v4 as uuid } from 'uuid';
import {
  User,
  CreateUserInput,
  UpdateUserInput,
  ListUsersQuery,
} from '../schemas/user.schema';
import { NotFoundError, ConflictError } from '../middleware/error.middleware';

// In-memory storage (replace with database in production)
const users: Map<string, User> = new Map();

export class UsersService {
  async create(input: CreateUserInput): Promise<Omit<User, 'password'>> {
    // Check for existing email
    const existingUser = Array.from(users.values()).find(
      (u) => u.email === input.email
    );
    if (existingUser) {
      throw new ConflictError('Email already exists');
    }

    const now = new Date();
    const user: User = {
      id: uuid(),
      email: input.email,
      name: input.name,
      role: input.role || 'user',
      createdAt: now,
      updatedAt: now,
    };

    users.set(user.id, user);

    // Don't return password
    const { ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async findById(id: string): Promise<User> {
    const user = users.get(id);
    if (!user) {
      throw new NotFoundError('User');
    }
    return user;
  }

  async findAll(query: ListUsersQuery): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
  }> {
    let filteredUsers = Array.from(users.values());

    // Filter by role
    if (query.role) {
      filteredUsers = filteredUsers.filter((u) => u.role === query.role);
    }

    // Search by name or email
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filteredUsers = filteredUsers.filter(
        (u) =>
          u.name.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower)
      );
    }

    const total = filteredUsers.length;
    const start = (query.page - 1) * query.limit;
    const paginatedUsers = filteredUsers.slice(start, start + query.limit);

    return {
      users: paginatedUsers,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    const user = await this.findById(id);

    // Check email uniqueness if changing email
    if (input.email && input.email !== user.email) {
      const existingUser = Array.from(users.values()).find(
        (u) => u.email === input.email
      );
      if (existingUser) {
        throw new ConflictError('Email already exists');
      }
    }

    const updatedUser: User = {
      ...user,
      ...input,
      updatedAt: new Date(),
    };

    users.set(id, updatedUser);
    return updatedUser;
  }

  async delete(id: string): Promise<void> {
    const user = users.get(id);
    if (!user) {
      throw new NotFoundError('User');
    }
    users.delete(id);
  }
}

export const usersService = new UsersService();
```

## Controllers

Controllers handle HTTP request/response logic and delegate to services.

```typescript
// src/controllers/users.controller.ts
import { Request, Response } from 'express';
import { usersService } from '../services/users.service';
import {
  CreateUserInput,
  UpdateUserInput,
  ListUsersQuery,
} from '../schemas/user.schema';
import { asyncHandler } from '../middleware/error.middleware';
import { TypedRequest, ApiResponse, PaginatedResponse } from '../types';

export class UsersController {
  create = asyncHandler(
    async (req: TypedRequest<CreateUserInput>, res: Response) => {
      const user = await usersService.create(req.body);

      const response: ApiResponse<typeof user> = {
        success: true,
        data: user,
        message: 'User created successfully',
      };

      res.status(201).json(response);
    }
  );

  getById = asyncHandler(
    async (req: TypedRequest<unknown, unknown, { id: string }>, res: Response) => {
      const user = await usersService.findById(req.params.id);

      const response: ApiResponse<typeof user> = {
        success: true,
        data: user,
      };

      res.json(response);
    }
  );

  list = asyncHandler(
    async (req: TypedRequest<unknown, ListUsersQuery>, res: Response) => {
      const result = await usersService.findAll(req.query);

      const response: PaginatedResponse<typeof result.users[0]> = {
        success: true,
        data: result.users,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: Math.ceil(result.total / result.limit),
        },
      };

      res.json(response);
    }
  );

  update = asyncHandler(
    async (
      req: TypedRequest<UpdateUserInput, unknown, { id: string }>,
      res: Response
    ) => {
      const user = await usersService.update(req.params.id, req.body);

      const response: ApiResponse<typeof user> = {
        success: true,
        data: user,
        message: 'User updated successfully',
      };

      res.json(response);
    }
  );

  delete = asyncHandler(
    async (req: TypedRequest<unknown, unknown, { id: string }>, res: Response) => {
      await usersService.delete(req.params.id);

      const response: ApiResponse = {
        success: true,
        message: 'User deleted successfully',
      };

      res.status(200).json(response);
    }
  );
}

export const usersController = new UsersController();
```

## Routes

```typescript
// src/routes/users.routes.ts
import { Router } from 'express';
import { usersController } from '../controllers/users.controller';
import { validate } from '../middleware/validate.middleware';
import { authenticate, authorize } from '../middleware/auth.middleware';
import {
  createUserSchema,
  updateUserSchema,
  getUserSchema,
  listUsersSchema,
} from '../schemas/user.schema';

const router = Router();

// Public routes
router.post('/', validate(createUserSchema), usersController.create);

// Protected routes
router.get(
  '/',
  authenticate,
  validate(listUsersSchema),
  usersController.list
);

router.get(
  '/:id',
  authenticate,
  validate(getUserSchema),
  usersController.getById
);

router.patch(
  '/:id',
  authenticate,
  validate(updateUserSchema),
  usersController.update
);

// Admin only
router.delete(
  '/:id',
  authenticate,
  authorize('admin'),
  validate(getUserSchema),
  usersController.delete
);

export default router;
```

### Route Aggregator

```typescript
// src/routes/index.ts
import { Router } from 'express';
import usersRoutes from './users.routes';
import postsRoutes from './posts.routes';

const router = Router();

router.use('/users', usersRoutes);
router.use('/posts', postsRoutes);

export default router;
```

## Request Logging Middleware

```typescript
// src/middleware/logger.middleware.ts
import { Request, Response, NextFunction } from 'express';

interface LogEntry {
  method: string;
  path: string;
  statusCode: number;
  duration: number;
  timestamp: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
}

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const startTime = Date.now();

  // Capture original end method
  const originalEnd = res.end;

  res.end = function (
    this: Response,
    ...args: Parameters<Response['end']>
  ): Response {
    const duration = Date.now() - startTime;

    const logEntry: LogEntry = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      userId: req.user?.id,
    };

    // Log based on status code
    if (res.statusCode >= 500) {
      console.error('Request error:', logEntry);
    } else if (res.statusCode >= 400) {
      console.warn('Request warning:', logEntry);
    } else {
      console.log('Request:', logEntry);
    }

    return originalEnd.apply(this, args);
  };

  next();
};
```

## Rate Limiting Middleware

```typescript
// src/middleware/ratelimit.middleware.ts
import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
}

export const rateLimit = (options: RateLimitOptions) => {
  const { windowMs, maxRequests, keyGenerator } = options;

  // Clean up expired entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (entry.resetTime < now) {
        rateLimitStore.delete(key);
      }
    }
  }, windowMs);

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator ? keyGenerator(req) : req.ip || 'unknown';
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    entry.count++;
    rateLimitStore.set(key, entry);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

    if (entry.count > maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests, please try again later',
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      });
    }

    next();
  };
};
```

## Complete App Configuration

```typescript
// src/app.ts
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/error.middleware';
import { requestLogger } from './middleware/logger.middleware';
import { rateLimit } from './middleware/ratelimit.middleware';
import routes from './routes';

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Rate limiting
app.use(
  rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/v1', routes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Error handling (must be last)
app.use(errorHandler);

export default app;
```

## Environment Configuration

```typescript
// src/config/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().default('*'),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32).optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
```

## Testing Your API

### Using curl

```bash
# Create a user
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "name": "John Doe",
    "password": "Password123"
  }'

# Get all users (requires auth)
curl http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer valid-token"

# Get a specific user
curl http://localhost:3000/api/v1/users/USER_ID \
  -H "Authorization: Bearer valid-token"

# Update a user
curl -X PATCH http://localhost:3000/api/v1/users/USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer valid-token" \
  -d '{"name": "John Smith"}'

# Delete a user (admin only)
curl -X DELETE http://localhost:3000/api/v1/users/USER_ID \
  -H "Authorization: Bearer admin-token"
```

### Example Responses

Successful creation:

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "name": "John Doe",
    "role": "user",
    "createdAt": "2026-02-03T10:00:00.000Z",
    "updatedAt": "2026-02-03T10:00:00.000Z"
  },
  "message": "User created successfully"
}
```

Validation error:

```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "field": "body.email",
      "message": "Invalid email format"
    },
    {
      "field": "body.password",
      "message": "Password must be at least 8 characters"
    }
  ]
}
```

Paginated list:

```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "user",
      "createdAt": "2026-02-03T10:00:00.000Z",
      "updatedAt": "2026-02-03T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

## Production Considerations

### Compile for Production

```bash
# Build TypeScript
npm run build

# Start production server
NODE_ENV=production node dist/index.js
```

### Docker Support

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### Graceful Shutdown

```typescript
// src/index.ts
import app from './app';
import { env } from './config/env';

const server = app.listen(env.PORT, () => {
  console.log(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
});

// Track active connections for graceful shutdown
let connections: Set<any> = new Set();

server.on('connection', (conn) => {
  connections.add(conn);
  conn.on('close', () => connections.delete(conn));
});

const shutdown = (signal: string) => {
  console.log(`${signal} received, starting graceful shutdown`);

  // Stop accepting new connections
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  // Force close after timeout
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);

  // Close existing connections
  connections.forEach((conn) => conn.end());
  setTimeout(() => {
    connections.forEach((conn) => conn.destroy());
  }, 5000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
```

## Summary

| Component | Purpose |
|-----------|---------|
| **TypeScript Config** | Strict type checking for safer code |
| **Zod Schemas** | Runtime validation with type inference |
| **Validation Middleware** | Automatic request validation |
| **Error Middleware** | Consistent error handling |
| **Auth Middleware** | Authentication and authorization |
| **Service Layer** | Business logic separation |
| **Controllers** | HTTP request/response handling |
| **Typed Requests** | Full type safety in route handlers |

Building REST APIs with Express and TypeScript gives you the best of both worlds: the flexibility and ecosystem of Express with the safety and developer experience of TypeScript. Combined with Zod for validation, you get runtime type checking that matches your compile-time types.

The patterns shown here scale well from small APIs to large applications. The separation between routes, controllers, and services makes testing easier and keeps your codebase maintainable as it grows.

For monitoring your Express APIs in production, consider using [OneUptime](https://oneuptime.com). OneUptime provides comprehensive observability with metrics, logs, and traces, helping you identify performance issues and errors before they impact users. With built-in alerting and status pages, you can keep your team informed and your users happy.
