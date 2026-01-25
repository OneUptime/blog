# How to Build Composable Middleware in Express

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, TypeScript, Express, Middleware, Backend, API Design

Description: Learn how to build composable, reusable middleware in Express with patterns for chaining, conditional execution, configuration, and error handling.

---

Express middleware is the backbone of any Node.js web application. Well-designed middleware is composable, reusable, and easy to test. This guide shows you how to build middleware that you can mix and match like building blocks to create powerful request processing pipelines.

## Middleware Fundamentals

Every Express middleware follows the same pattern: receive the request and response objects, do something, and either call next() or send a response.

```typescript
// basic-middleware.ts
import { Request, Response, NextFunction } from 'express';

// Type-safe middleware signature
type Middleware = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

// Simple logging middleware
const requestLogger: Middleware = (req, res, next) => {
  const start = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });

  next();
};

// Async middleware with error handling
const asyncMiddleware: Middleware = async (req, res, next) => {
  try {
    await someAsyncOperation();
    next();
  } catch (error) {
    next(error); // Pass errors to error handler
  }
};
```

## Configurable Middleware Factory

The most reusable middleware comes from factory functions that accept configuration.

```typescript
// configurable-middleware.ts
import { Request, Response, NextFunction } from 'express';

type Middleware = (req: Request, res: Response, next: NextFunction) => void;

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  onLimitReached?: (req: Request, res: Response) => void;
}

// Factory function returns configured middleware
function createRateLimiter(config: RateLimitConfig): Middleware {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req) => req.ip || 'unknown',
    onLimitReached = (_, res) => res.status(429).json({ error: 'Too many requests' }),
  } = config;

  // State persists across requests
  const requestCounts = new Map<string, { count: number; resetAt: number }>();

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();

    let record = requestCounts.get(key);

    // Reset if window expired
    if (!record || now > record.resetAt) {
      record = { count: 0, resetAt: now + windowMs };
      requestCounts.set(key, record);
    }

    record.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

    if (record.count > maxRequests) {
      onLimitReached(req, res);
      return;
    }

    next();
  };
}

// Usage with different configurations
const apiLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 100,
});

const authLimiter = createRateLimiter({
  windowMs: 300000,
  maxRequests: 5,
  keyGenerator: (req) => `auth:${req.ip}`,
  onLimitReached: (_, res) => {
    res.status(429).json({
      error: 'Too many login attempts. Please try again later.',
    });
  },
});
```

## Middleware Composition

Combine multiple middleware into a single unit for cleaner route definitions.

```typescript
// compose-middleware.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

// Compose multiple middleware into one
function compose(...middlewares: RequestHandler[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    // Create a chain of middleware calls
    let index = 0;

    function dispatch(): void {
      if (index >= middlewares.length) {
        return next();
      }

      const middleware = middlewares[index++];

      try {
        middleware(req, res, (err?: unknown) => {
          if (err) {
            return next(err);
          }
          dispatch();
        });
      } catch (error) {
        next(error);
      }
    }

    dispatch();
  };
}

// Example: Combine authentication, authorization, and validation
const authenticate: RequestHandler = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  // Verify token and attach user to request
  (req as any).user = verifyToken(token);
  next();
};

const requireRole = (role: string): RequestHandler => (req, res, next) => {
  const user = (req as any).user;
  if (!user || user.role !== role) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

const validateBody = (schema: any): RequestHandler => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Validation failed', details: result.error });
  }
  req.body = result.data;
  next();
};

// Compose into a single middleware
const adminOnly = compose(
  authenticate,
  requireRole('admin')
);

const createUserMiddleware = compose(
  authenticate,
  requireRole('admin'),
  validateBody(createUserSchema)
);

// Use in routes
app.post('/admin/users', createUserMiddleware, createUserHandler);
app.get('/admin/stats', adminOnly, getStatsHandler);
```

## Conditional Middleware

Sometimes middleware should only run under certain conditions.

```typescript
// conditional-middleware.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

// Run middleware only if condition is met
function when(
  condition: (req: Request) => boolean,
  middleware: RequestHandler
): RequestHandler {
  return (req, res, next) => {
    if (condition(req)) {
      return middleware(req, res, next);
    }
    next();
  };
}

// Run middleware unless condition is met
function unless(
  condition: (req: Request) => boolean,
  middleware: RequestHandler
): RequestHandler {
  return when((req) => !condition(req), middleware);
}

// Usage examples

// Only rate limit non-authenticated requests
const rateLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 30 });

app.use(when(
  (req) => !req.headers.authorization,
  rateLimiter
));

// Skip CORS middleware for same-origin requests
const corsMiddleware = cors({ origin: 'https://example.com' });

app.use(unless(
  (req) => req.headers.origin === undefined,
  corsMiddleware
));

// Apply caching middleware only for GET requests
const cacheMiddleware = createCacheMiddleware({ ttl: 300 });

app.use(when(
  (req) => req.method === 'GET',
  cacheMiddleware
));
```

## Middleware with Shared State

Use closure patterns to share state across middleware in the same request.

```typescript
// shared-state-middleware.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
    }
  }
}

interface RequestContext {
  requestId: string;
  startTime: number;
  user?: User;
  permissions?: string[];
  [key: string]: unknown;
}

// Initialize context for each request
function createContextMiddleware(): RequestHandler {
  return (req, res, next) => {
    req.context = {
      requestId: req.headers['x-request-id'] as string || crypto.randomUUID(),
      startTime: Date.now(),
    };

    // Set response header
    res.setHeader('X-Request-Id', req.context.requestId);

    next();
  };
}

// Middleware that adds to context
function loadUserMiddleware(): RequestHandler {
  return async (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      try {
        const user = await getUserFromToken(token);
        req.context.user = user;
      } catch (error) {
        // Token invalid, continue without user
      }
    }

    next();
  };
}

function loadPermissionsMiddleware(): RequestHandler {
  return async (req, res, next) => {
    if (req.context.user) {
      req.context.permissions = await getPermissionsForUser(req.context.user.id);
    }

    next();
  };
}

// Check permissions using context
function requirePermission(permission: string): RequestHandler {
  return (req, res, next) => {
    const permissions = req.context.permissions || [];

    if (!permissions.includes(permission)) {
      return res.status(403).json({
        error: 'Permission denied',
        required: permission,
        requestId: req.context.requestId,
      });
    }

    next();
  };
}

// Usage
app.use(createContextMiddleware());
app.use(loadUserMiddleware());
app.use(loadPermissionsMiddleware());

app.delete('/posts/:id', requirePermission('posts:delete'), deletePostHandler);
```

## Error Handling Middleware

Build error handlers that integrate with your middleware stack.

```typescript
// error-middleware.ts
import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

// Custom error classes
class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

class ValidationError extends AppError {
  constructor(details: unknown) {
    super(400, 'Validation failed', 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

// Async handler wrapper to catch errors
function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Global error handler
function createErrorHandler(options: {
  logErrors?: boolean;
  includeStackTrace?: boolean;
}): ErrorRequestHandler {
  const { logErrors = true, includeStackTrace = false } = options;

  return (err: Error, req: Request, res: Response, _next: NextFunction) => {
    // Log error
    if (logErrors) {
      console.error({
        error: err.message,
        stack: err.stack,
        requestId: req.context?.requestId,
        method: req.method,
        path: req.path,
      });
    }

    // Handle known error types
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({
        error: err.message,
        code: err.code,
        details: err.details,
        requestId: req.context?.requestId,
      });
    }

    // Handle unknown errors
    const response: Record<string, unknown> = {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      requestId: req.context?.requestId,
    };

    if (includeStackTrace && process.env.NODE_ENV !== 'production') {
      response.stack = err.stack;
    }

    res.status(500).json(response);
  };
}

// Usage
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await findUser(req.params.id);

  if (!user) {
    throw new NotFoundError('User');
  }

  res.json(user);
}));

// Register error handler last
app.use(createErrorHandler({
  logErrors: true,
  includeStackTrace: process.env.NODE_ENV !== 'production',
}));
```

## Middleware Pipeline Builder

Create a fluent API for building complex middleware pipelines.

```typescript
// pipeline-builder.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

class MiddlewarePipeline {
  private middlewares: RequestHandler[] = [];

  // Add middleware
  use(middleware: RequestHandler): this {
    this.middlewares.push(middleware);
    return this;
  }

  // Add conditional middleware
  when(
    condition: (req: Request) => boolean,
    middleware: RequestHandler
  ): this {
    this.middlewares.push((req, res, next) => {
      if (condition(req)) {
        return middleware(req, res, next);
      }
      next();
    });
    return this;
  }

  // Add middleware that only runs once (useful for initialization)
  once(middleware: RequestHandler): this {
    let hasRun = false;

    this.middlewares.push((req, res, next) => {
      if (!hasRun) {
        hasRun = true;
        return middleware(req, res, next);
      }
      next();
    });
    return this;
  }

  // Add middleware with timeout
  withTimeout(middleware: RequestHandler, timeoutMs: number): this {
    this.middlewares.push((req, res, next) => {
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        next(new Error(`Middleware timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      middleware(req, res, (err) => {
        if (timedOut) return;
        clearTimeout(timer);
        next(err);
      });
    });
    return this;
  }

  // Branch based on condition
  branch(
    condition: (req: Request) => boolean,
    ifTrue: RequestHandler,
    ifFalse: RequestHandler
  ): this {
    this.middlewares.push((req, res, next) => {
      const middleware = condition(req) ? ifTrue : ifFalse;
      middleware(req, res, next);
    });
    return this;
  }

  // Build the composed middleware
  build(): RequestHandler {
    const middlewares = [...this.middlewares];

    return (req, res, next) => {
      let index = 0;

      function dispatch(err?: unknown): void {
        if (err) {
          return next(err);
        }

        if (index >= middlewares.length) {
          return next();
        }

        const middleware = middlewares[index++];

        try {
          middleware(req, res, dispatch);
        } catch (error) {
          next(error);
        }
      }

      dispatch();
    };
  }
}

// Factory function for cleaner syntax
function pipeline(): MiddlewarePipeline {
  return new MiddlewarePipeline();
}

// Usage
const apiPipeline = pipeline()
  .use(createContextMiddleware())
  .use(requestLogger)
  .when(
    (req) => !req.path.startsWith('/public'),
    authenticate
  )
  .branch(
    (req) => req.headers['content-type']?.includes('application/json'),
    express.json(),
    express.text()
  )
  .withTimeout(loadUserMiddleware(), 5000)
  .build();

app.use('/api', apiPipeline);
```

## Testing Composable Middleware

Isolated, composable middleware is easy to test.

```typescript
// middleware.test.ts
import { Request, Response } from 'express';

// Create mock request and response
function createMockReq(overrides: Partial<Request> = {}): Partial<Request> {
  return {
    method: 'GET',
    path: '/',
    headers: {},
    query: {},
    params: {},
    body: {},
    ...overrides,
  };
}

function createMockRes(): Partial<Response> & {
  _status: number;
  _json: unknown;
} {
  const res: any = {
    _status: 200,
    _json: null,
    status(code: number) {
      this._status = code;
      return this;
    },
    json(data: unknown) {
      this._json = data;
      return this;
    },
    setHeader: jest.fn(),
    on: jest.fn(),
  };
  return res;
}

describe('createRateLimiter', () => {
  it('allows requests under limit', () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 2 });
    const req = createMockReq({ ip: '127.0.0.1' });
    const res = createMockRes();
    const next = jest.fn();

    limiter(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res._status).toBe(200);
  });

  it('blocks requests over limit', () => {
    const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 1 });
    const req = createMockReq({ ip: '127.0.0.1' });
    const res = createMockRes();
    const next = jest.fn();

    // First request passes
    limiter(req as Request, res as Response, next);
    expect(next).toHaveBeenCalledTimes(1);

    // Second request blocked
    limiter(req as Request, res as Response, next);
    expect(res._status).toBe(429);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('compose', () => {
  it('runs middleware in order', async () => {
    const order: number[] = [];

    const first: RequestHandler = (_, __, next) => { order.push(1); next(); };
    const second: RequestHandler = (_, __, next) => { order.push(2); next(); };
    const third: RequestHandler = (_, __, next) => { order.push(3); next(); };

    const composed = compose(first, second, third);
    const next = jest.fn();

    await composed(createMockReq() as Request, createMockRes() as Response, next);

    expect(order).toEqual([1, 2, 3]);
    expect(next).toHaveBeenCalled();
  });
});
```

## Summary

| Pattern | Use Case |
|---------|----------|
| Factory functions | Configurable, reusable middleware |
| Composition | Combine multiple middleware |
| Conditional execution | Apply middleware based on request |
| Shared context | Pass data between middleware |
| Pipeline builder | Fluent API for complex chains |
| Error handling | Centralized error management |

Composable middleware transforms Express applications from tangled callback chains into clean, testable pipelines. By building middleware as small, focused units that can be combined and configured, you create a toolkit that adapts to any routing need.
