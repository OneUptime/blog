# How to Use Fastify for High-Performance APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, Fastify, REST API, Performance, TypeScript, Backend

Description: Learn how to build high-performance APIs with Fastify in Node.js. This guide covers routing, validation, plugins, hooks, and performance optimization techniques.

---

Fastify is a web framework for Node.js built from the ground up for speed. It delivers exceptional performance through careful architecture decisions: schema-based serialization, minimal overhead routing, and a plugin system that avoids the middleware chain bottlenecks common in Express. If you need an API that handles thousands of requests per second without breaking a sweat, Fastify deserves your attention.

## Why Fastify?

Before diving into code, here is why Fastify stands out among Node.js frameworks:

| Feature | Fastify | Express |
|---------|---------|---------|
| **Requests/sec** | ~75,000 | ~15,000 |
| **Built-in validation** | JSON Schema | None (middleware needed) |
| **TypeScript support** | First-class | Community types |
| **Plugin encapsulation** | Yes | No |
| **Async/await native** | Yes | Partial |

The performance difference comes from Fastify's use of `fast-json-stringify` for response serialization and `find-my-way` for routing - both optimized for speed over flexibility.

## Installation

Getting started with Fastify requires just a few packages. Start by initializing a new project and installing the core dependencies.

```bash
# Create project directory
mkdir fastify-api && cd fastify-api

# Initialize package.json
npm init -y

# Install Fastify core
npm install fastify

# Install common plugins
npm install @fastify/cors @fastify/helmet @fastify/rate-limit

# For TypeScript support
npm install typescript @types/node tsx --save-dev
```

Create a basic `tsconfig.json` for TypeScript projects:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

## Basic Server Setup

Here is a minimal Fastify server. The framework uses async/await throughout, making error handling straightforward.

```javascript
// src/server.js
const fastify = require('fastify');

// Create the Fastify instance with logging enabled
const app = fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Define a simple route
app.get('/', async (request, reply) => {
  return { message: 'Hello from Fastify!' };
});

// Start the server
const start = async () => {
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server running at http://localhost:3000');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
```

For TypeScript, the setup provides full type safety:

```typescript
// src/server.ts
import Fastify, { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

const app: FastifyInstance = Fastify({
  logger: true,
});

// Route with typed request and reply
app.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
  return { message: 'Hello from Fastify with TypeScript!' };
});

const start = async (): Promise<void> => {
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
```

## Routing

Fastify provides a clean routing API with support for all HTTP methods. Routes can be defined inline or organized into separate modules.

### Basic Routes

```typescript
import Fastify from 'fastify';

const app = Fastify({ logger: true });

// GET request
app.get('/users', async (request, reply) => {
  return { users: [] };
});

// POST request with body
app.post('/users', async (request, reply) => {
  const { name, email } = request.body as { name: string; email: string };
  // Create user logic here
  reply.code(201);
  return { id: 1, name, email };
});

// Route with URL parameters
app.get('/users/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  return { id, name: 'John Doe' };
});

// Route with query parameters
app.get('/search', async (request, reply) => {
  const { q, page, limit } = request.query as {
    q: string;
    page?: string;
    limit?: string;
  };
  return {
    query: q,
    page: parseInt(page || '1'),
    limit: parseInt(limit || '10'),
  };
});

// DELETE request
app.delete('/users/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  reply.code(204);
  return;
});

// PATCH request for partial updates
app.patch('/users/:id', async (request, reply) => {
  const { id } = request.params as { id: string };
  const updates = request.body;
  return { id, ...updates };
});
```

### Route Prefixes and Organization

For larger applications, organize routes using prefixes:

```typescript
// src/routes/users.ts
import { FastifyInstance, FastifyPluginOptions } from 'fastify';

// Define routes as a plugin function
async function userRoutes(
  fastify: FastifyInstance,
  options: FastifyPluginOptions
): Promise<void> {
  // All routes here will be prefixed with /api/users

  fastify.get('/', async (request, reply) => {
    return { users: [] };
  });

  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    return { id, name: 'John Doe' };
  });

  fastify.post('/', async (request, reply) => {
    reply.code(201);
    return { id: 1, ...request.body };
  });
}

export default userRoutes;
```

Register the routes in your main server file:

```typescript
// src/server.ts
import Fastify from 'fastify';
import userRoutes from './routes/users';

const app = Fastify({ logger: true });

// Register routes with prefix
app.register(userRoutes, { prefix: '/api/users' });

// You can register multiple route modules
// app.register(productRoutes, { prefix: '/api/products' });
// app.register(orderRoutes, { prefix: '/api/orders' });

app.listen({ port: 3000, host: '0.0.0.0' });
```

## Request Validation with JSON Schema

One of Fastify's strongest features is built-in validation using JSON Schema. This eliminates the need for external validation libraries and provides automatic documentation.

### Basic Schema Validation

```typescript
import Fastify from 'fastify';

const app = Fastify({ logger: true });

// Define the schema for request validation
const createUserSchema = {
  body: {
    type: 'object',
    required: ['name', 'email'],
    properties: {
      name: {
        type: 'string',
        minLength: 2,
        maxLength: 100,
      },
      email: {
        type: 'string',
        format: 'email',
      },
      age: {
        type: 'integer',
        minimum: 0,
        maximum: 150,
      },
      role: {
        type: 'string',
        enum: ['admin', 'user', 'guest'],
        default: 'user',
      },
    },
    additionalProperties: false,
  },
  response: {
    201: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' },
        email: { type: 'string' },
        role: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  },
};

// Apply schema to route
app.post('/users', { schema: createUserSchema }, async (request, reply) => {
  const { name, email, age, role } = request.body as {
    name: string;
    email: string;
    age?: number;
    role?: string;
  };

  const user = {
    id: 1,
    name,
    email,
    role: role || 'user',
    createdAt: new Date().toISOString(),
  };

  reply.code(201);
  return user;
});
```

### Query and Params Validation

```typescript
// Validate URL parameters and query strings
const getUserSchema = {
  params: {
    type: 'object',
    required: ['id'],
    properties: {
      id: {
        type: 'string',
        pattern: '^[0-9]+$', // Only numeric IDs
      },
    },
  },
  querystring: {
    type: 'object',
    properties: {
      fields: {
        type: 'string',
        description: 'Comma-separated list of fields to return',
      },
      include: {
        type: 'array',
        items: { type: 'string', enum: ['posts', 'comments', 'followers'] },
      },
    },
  },
  response: {
    200: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
      },
    },
    404: {
      type: 'object',
      properties: {
        error: { type: 'string' },
        message: { type: 'string' },
      },
    },
  },
};

app.get('/users/:id', { schema: getUserSchema }, async (request, reply) => {
  const { id } = request.params as { id: string };
  const { fields, include } = request.query as {
    fields?: string;
    include?: string[];
  };

  // Fetch user from database
  const user = await findUserById(id);

  if (!user) {
    reply.code(404);
    return { error: 'Not Found', message: `User ${id} not found` };
  }

  return user;
});
```

### TypeScript Integration with Schemas

For full type safety, define TypeScript interfaces alongside schemas:

```typescript
import Fastify, { FastifyInstance, RouteShorthandOptions } from 'fastify';

// Define TypeScript interfaces
interface CreateUserBody {
  name: string;
  email: string;
  age?: number;
  role?: 'admin' | 'user' | 'guest';
}

interface UserResponse {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface UserParams {
  id: string;
}

// Schema with TypeScript generics
const createUserOpts: RouteShorthandOptions = {
  schema: {
    body: {
      type: 'object',
      required: ['name', 'email'],
      properties: {
        name: { type: 'string', minLength: 2 },
        email: { type: 'string', format: 'email' },
        age: { type: 'integer', minimum: 0 },
        role: { type: 'string', enum: ['admin', 'user', 'guest'] },
      },
    },
  },
};

app.post<{
  Body: CreateUserBody;
  Reply: UserResponse;
}>('/users', createUserOpts, async (request, reply) => {
  // request.body is now typed as CreateUserBody
  const { name, email, age, role } = request.body;

  const user: UserResponse = {
    id: 1,
    name,
    email,
    role: role || 'user',
    createdAt: new Date().toISOString(),
  };

  reply.code(201);
  return user;
});
```

## Plugins

Plugins are the core of Fastify's architecture. They provide encapsulation, dependency injection, and code organization. Every piece of functionality in Fastify is a plugin.

### Creating Custom Plugins

```typescript
// src/plugins/database.ts
import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import fp from 'fastify-plugin';

// Define the plugin options interface
interface DatabasePluginOptions {
  connectionString: string;
  maxConnections?: number;
}

// Mock database client for demonstration
interface DatabaseClient {
  query: (sql: string, params?: any[]) => Promise<any>;
  close: () => Promise<void>;
}

// Extend Fastify instance type to include our database
declare module 'fastify' {
  interface FastifyInstance {
    db: DatabaseClient;
  }
}

async function databasePlugin(
  fastify: FastifyInstance,
  options: DatabasePluginOptions
): Promise<void> {
  const { connectionString, maxConnections = 10 } = options;

  // Create database connection
  const client: DatabaseClient = {
    query: async (sql: string, params?: any[]) => {
      // Actual database query logic would go here
      fastify.log.info({ sql, params }, 'Executing query');
      return [];
    },
    close: async () => {
      fastify.log.info('Closing database connection');
    },
  };

  // Decorate fastify instance with database client
  fastify.decorate('db', client);

  // Clean up on server close
  fastify.addHook('onClose', async (instance) => {
    await instance.db.close();
  });

  fastify.log.info('Database plugin registered');
}

// Use fastify-plugin to ensure decorators are available to parent scope
export default fp(databasePlugin, {
  name: 'database-plugin',
  fastify: '4.x',
});
```

### Using Plugins

```typescript
// src/server.ts
import Fastify from 'fastify';
import databasePlugin from './plugins/database';

const app = Fastify({ logger: true });

// Register the database plugin
app.register(databasePlugin, {
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost/mydb',
  maxConnections: 20,
});

// Now you can use app.db in routes
app.get('/users', async (request, reply) => {
  const users = await app.db.query('SELECT * FROM users');
  return { users };
});

app.listen({ port: 3000, host: '0.0.0.0' });
```

### Authentication Plugin Example

```typescript
// src/plugins/auth.ts
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

interface AuthPluginOptions {
  secret: string;
  excludePaths?: string[];
}

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

async function authPlugin(
  fastify: FastifyInstance,
  options: AuthPluginOptions
): Promise<void> {
  const { secret, excludePaths = [] } = options;

  // Decorate request with user property
  fastify.decorateRequest('user', null);

  // Add authentication hook
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Skip auth for excluded paths
    if (excludePaths.some(path => request.url.startsWith(path))) {
      return;
    }

    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      reply.code(401);
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);

    try {
      // In production, use a proper JWT library
      const payload = verifyToken(token, secret);
      request.user = payload;
    } catch (err) {
      reply.code(401);
      throw new Error('Invalid token');
    }
  });

  fastify.log.info('Auth plugin registered');
}

function verifyToken(token: string, secret: string): JWTPayload {
  // Simplified verification - use jsonwebtoken in production
  // This is just for demonstration
  return {
    userId: '123',
    email: 'user@example.com',
    role: 'user',
    iat: Date.now(),
    exp: Date.now() + 3600000,
  };
}

export default fp(authPlugin, {
  name: 'auth-plugin',
});
```

## Hooks

Hooks allow you to intercept and modify requests at various points in the request lifecycle. Fastify provides hooks for every stage.

### Request Lifecycle Hooks

```typescript
import Fastify from 'fastify';

const app = Fastify({ logger: true });

// onRequest - First hook, runs before routing
app.addHook('onRequest', async (request, reply) => {
  request.log.info({ url: request.url, method: request.method }, 'Request received');
  // Add request ID for tracing
  request.headers['x-request-id'] = request.headers['x-request-id'] || generateId();
});

// preParsing - Before body parsing
app.addHook('preParsing', async (request, reply, payload) => {
  // Modify or inspect raw payload before parsing
  return payload;
});

// preValidation - Before schema validation
app.addHook('preValidation', async (request, reply) => {
  // Perform custom validation or modify request before schema validation
});

// preHandler - After validation, before route handler
app.addHook('preHandler', async (request, reply) => {
  // Authorization checks, rate limiting, etc.
  if (request.url.startsWith('/admin') && request.user?.role !== 'admin') {
    reply.code(403);
    throw new Error('Admin access required');
  }
});

// preSerialization - Before response serialization
app.addHook('preSerialization', async (request, reply, payload) => {
  // Modify response payload before serialization
  return {
    ...payload,
    requestId: request.headers['x-request-id'],
  };
});

// onSend - Before sending response
app.addHook('onSend', async (request, reply, payload) => {
  // Add custom headers
  reply.header('X-Response-Time', Date.now() - request.startTime);
  return payload;
});

// onResponse - After response sent
app.addHook('onResponse', async (request, reply) => {
  // Logging, metrics collection
  request.log.info(
    {
      url: request.url,
      method: request.method,
      statusCode: reply.statusCode,
      responseTime: reply.elapsedTime,
    },
    'Request completed'
  );
});

// onError - When an error occurs
app.addHook('onError', async (request, reply, error) => {
  // Error logging, alerting
  request.log.error({ err: error }, 'Request error');
});

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}
```

### Route-Level Hooks

Apply hooks to specific routes only:

```typescript
// Route-specific hooks
const sensitiveRouteHooks = {
  preHandler: async (request, reply) => {
    // Additional security checks for sensitive operations
    if (!request.headers['x-admin-key']) {
      reply.code(403);
      throw new Error('Admin key required');
    }
  },
};

app.delete('/users/:id', {
  ...sensitiveRouteHooks,
  schema: {
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
    },
  },
}, async (request, reply) => {
  const { id } = request.params as { id: string };
  // Delete user logic
  reply.code(204);
});
```

### Request Timing Hook

```typescript
// Track request timing
declare module 'fastify' {
  interface FastifyRequest {
    startTime: number;
  }
}

app.decorateRequest('startTime', 0);

app.addHook('onRequest', async (request) => {
  request.startTime = Date.now();
});

app.addHook('onResponse', async (request, reply) => {
  const duration = Date.now() - request.startTime;
  request.log.info({
    method: request.method,
    url: request.url,
    statusCode: reply.statusCode,
    duration: `${duration}ms`,
  });
});
```

## Error Handling

Fastify provides flexible error handling with custom error handlers and automatic error serialization.

### Custom Error Handler

```typescript
import Fastify, { FastifyError, FastifyRequest, FastifyReply } from 'fastify';

const app = Fastify({ logger: true });

// Define custom error types
class NotFoundError extends Error {
  statusCode = 404;
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}

class ValidationError extends Error {
  statusCode = 400;
  details: any[];
  constructor(message: string, details: any[] = []) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class UnauthorizedError extends Error {
  statusCode = 401;
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

// Global error handler
app.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
  const statusCode = error.statusCode || 500;

  // Log the error
  if (statusCode >= 500) {
    request.log.error({ err: error }, 'Server error');
  } else {
    request.log.warn({ err: error }, 'Client error');
  }

  // Build error response
  const response: Record<string, any> = {
    error: error.name || 'Error',
    message: statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : error.message,
    statusCode,
  };

  // Include validation details if present
  if (error.validation) {
    response.details = error.validation;
  }

  // Include custom error details
  if ((error as any).details) {
    response.details = (error as any).details;
  }

  reply.status(statusCode).send(response);
});

// Handle 404 for undefined routes
app.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    error: 'Not Found',
    message: `Route ${request.method} ${request.url} not found`,
    statusCode: 404,
  });
});

// Example usage in routes
app.get('/users/:id', async (request, reply) => {
  const { id } = request.params as { id: string };

  const user = await findUserById(id);

  if (!user) {
    throw new NotFoundError('User', id);
  }

  return user;
});

app.post('/users', async (request, reply) => {
  const { email } = request.body as { email: string };

  const existing = await findUserByEmail(email);

  if (existing) {
    throw new ValidationError('User already exists', [
      { field: 'email', message: 'Email is already registered' },
    ]);
  }

  // Create user logic
  reply.code(201);
  return { id: 1, email };
});
```

### Async Error Handling

Fastify automatically catches errors from async handlers:

```typescript
// Errors in async functions are automatically caught
app.get('/data', async (request, reply) => {
  // No try-catch needed - Fastify handles this
  const data = await fetchExternalData();
  return data;
});

// For more control, use try-catch
app.get('/critical-operation', async (request, reply) => {
  try {
    const result = await performCriticalOperation();
    return result;
  } catch (error) {
    // Handle specific error types
    if (error.code === 'ECONNREFUSED') {
      reply.code(503);
      return { error: 'Service temporarily unavailable' };
    }
    throw error; // Re-throw for global handler
  }
});
```

## TypeScript Support

Fastify has excellent TypeScript support with comprehensive type definitions. Here is how to get the most out of it.

### Typed Request and Reply

```typescript
import Fastify, {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
  RouteGenericInterface,
} from 'fastify';

// Define interfaces for request components
interface CreateUserRequest extends RouteGenericInterface {
  Body: {
    name: string;
    email: string;
    password: string;
  };
  Reply: {
    id: number;
    name: string;
    email: string;
    createdAt: string;
  };
}

interface GetUserRequest extends RouteGenericInterface {
  Params: {
    id: string;
  };
  Querystring: {
    fields?: string;
  };
  Reply: {
    id: string;
    name: string;
    email: string;
  } | {
    error: string;
    message: string;
  };
}

const app = Fastify({ logger: true });

// Fully typed route
app.post<CreateUserRequest>('/users', async (request, reply) => {
  // request.body is typed as CreateUserRequest['Body']
  const { name, email, password } = request.body;

  const user = {
    id: 1,
    name,
    email,
    createdAt: new Date().toISOString(),
  };

  reply.code(201);
  return user;
});

app.get<GetUserRequest>('/users/:id', async (request, reply) => {
  // request.params is typed as GetUserRequest['Params']
  const { id } = request.params;
  // request.query is typed as GetUserRequest['Querystring']
  const { fields } = request.query;

  const user = await findUserById(id);

  if (!user) {
    reply.code(404);
    return { error: 'Not Found', message: `User ${id} not found` };
  }

  return user;
});
```

### Typed Plugins

```typescript
import { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

// Define plugin options type
interface CachePluginOptions {
  ttl: number;
  maxItems: number;
}

// Define what the plugin adds to Fastify
declare module 'fastify' {
  interface FastifyInstance {
    cache: {
      get: (key: string) => Promise<any | null>;
      set: (key: string, value: any) => Promise<void>;
      delete: (key: string) => Promise<void>;
    };
  }
}

const cachePlugin: FastifyPluginAsync<CachePluginOptions> = async (fastify, options) => {
  const { ttl, maxItems } = options;
  const store = new Map<string, { value: any; expires: number }>();

  const cache = {
    async get(key: string): Promise<any | null> {
      const item = store.get(key);
      if (!item) return null;
      if (Date.now() > item.expires) {
        store.delete(key);
        return null;
      }
      return item.value;
    },

    async set(key: string, value: any): Promise<void> {
      if (store.size >= maxItems) {
        // Simple eviction - remove oldest
        const firstKey = store.keys().next().value;
        store.delete(firstKey);
      }
      store.set(key, {
        value,
        expires: Date.now() + ttl,
      });
    },

    async delete(key: string): Promise<void> {
      store.delete(key);
    },
  };

  fastify.decorate('cache', cache);
};

export default fp(cachePlugin, {
  name: 'cache-plugin',
});
```

## Performance Optimization

Fastify is fast by default, but you can squeeze out more performance with these techniques.

### Response Serialization

Define response schemas to enable fast-json-stringify:

```typescript
// Response schema enables fast serialization
const userListSchema = {
  response: {
    200: {
      type: 'object',
      properties: {
        users: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              email: { type: 'string' },
              createdAt: { type: 'string' },
            },
          },
        },
        total: { type: 'integer' },
        page: { type: 'integer' },
        limit: { type: 'integer' },
      },
    },
  },
};

// With schema - uses fast-json-stringify (faster)
app.get('/users', { schema: userListSchema }, async (request, reply) => {
  const users = await fetchUsers();
  return {
    users,
    total: users.length,
    page: 1,
    limit: 10,
  };
});
```

### Connection Pooling

Configure connection pooling for database operations:

```typescript
import Fastify from 'fastify';
import { Pool } from 'pg';

const app = Fastify({ logger: true });

// Configure pool for high throughput
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 50, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

app.decorate('db', pool);

// Reuse connections efficiently
app.get('/users', async (request, reply) => {
  const client = await app.db.connect();
  try {
    const result = await client.query('SELECT * FROM users LIMIT 100');
    return { users: result.rows };
  } finally {
    client.release(); // Always release back to pool
  }
});
```

### Request Batching

Handle multiple operations efficiently:

```typescript
// Batch endpoint for multiple operations
const batchSchema = {
  body: {
    type: 'object',
    required: ['operations'],
    properties: {
      operations: {
        type: 'array',
        maxItems: 100,
        items: {
          type: 'object',
          required: ['method', 'path'],
          properties: {
            method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
            path: { type: 'string' },
            body: { type: 'object' },
          },
        },
      },
    },
  },
};

app.post('/batch', { schema: batchSchema }, async (request, reply) => {
  const { operations } = request.body as {
    operations: Array<{ method: string; path: string; body?: any }>;
  };

  // Execute operations in parallel
  const results = await Promise.all(
    operations.map(async (op) => {
      try {
        const response = await app.inject({
          method: op.method as any,
          url: op.path,
          payload: op.body,
        });

        return {
          status: response.statusCode,
          body: JSON.parse(response.body),
        };
      } catch (error) {
        return {
          status: 500,
          error: error.message,
        };
      }
    })
  );

  return { results };
});
```

### Caching Headers

Add proper caching headers for cacheable responses:

```typescript
app.get('/static-data', async (request, reply) => {
  // Cache for 1 hour
  reply.header('Cache-Control', 'public, max-age=3600');
  reply.header('ETag', 'W/"abc123"');

  // Check if client has cached version
  const clientEtag = request.headers['if-none-match'];
  if (clientEtag === 'W/"abc123"') {
    reply.code(304);
    return;
  }

  return { data: 'This data changes infrequently' };
});
```

## Complete API Example

Here is a complete example bringing together all the concepts covered.

```typescript
// src/app.ts
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';

// Types
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
}

interface CreateUserBody {
  name: string;
  email: string;
  role?: 'admin' | 'user';
}

interface UpdateUserBody {
  name?: string;
  email?: string;
  role?: 'admin' | 'user';
}

// In-memory store for demonstration
const users: Map<number, User> = new Map();
let nextId = 1;

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
    },
  });

  // Register plugins
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  await app.register(helmet);

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Health check endpoint
  app.get('/health', async () => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  });

  // User routes
  const userRoutes = async (fastify: FastifyInstance) => {
    // List users
    fastify.get<{
      Querystring: { page?: string; limit?: string };
    }>('/', {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'string' },
            limit: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              users: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'integer' },
                    name: { type: 'string' },
                    email: { type: 'string' },
                    role: { type: 'string' },
                    createdAt: { type: 'string' },
                  },
                },
              },
              total: { type: 'integer' },
              page: { type: 'integer' },
              limit: { type: 'integer' },
            },
          },
        },
      },
    }, async (request, reply) => {
      const page = parseInt(request.query.page || '1');
      const limit = parseInt(request.query.limit || '10');

      const allUsers = Array.from(users.values());
      const start = (page - 1) * limit;
      const paginatedUsers = allUsers.slice(start, start + limit);

      return {
        users: paginatedUsers,
        total: allUsers.length,
        page,
        limit,
      };
    });

    // Get single user
    fastify.get<{
      Params: { id: string };
    }>('/:id', {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
      },
    }, async (request, reply) => {
      const id = parseInt(request.params.id);
      const user = users.get(id);

      if (!user) {
        reply.code(404);
        return { error: 'Not Found', message: `User ${id} not found` };
      }

      return user;
    });

    // Create user
    fastify.post<{
      Body: CreateUserBody;
    }>('/', {
      schema: {
        body: {
          type: 'object',
          required: ['name', 'email'],
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100 },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['admin', 'user'], default: 'user' },
          },
          additionalProperties: false,
        },
      },
    }, async (request, reply) => {
      const { name, email, role = 'user' } = request.body;

      // Check for duplicate email
      const existingUser = Array.from(users.values()).find(u => u.email === email);
      if (existingUser) {
        reply.code(409);
        return { error: 'Conflict', message: 'Email already registered' };
      }

      const user: User = {
        id: nextId++,
        name,
        email,
        role,
        createdAt: new Date().toISOString(),
      };

      users.set(user.id, user);
      reply.code(201);
      return user;
    });

    // Update user
    fastify.patch<{
      Params: { id: string };
      Body: UpdateUserBody;
    }>('/:id', {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 2, maxLength: 100 },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['admin', 'user'] },
          },
          additionalProperties: false,
        },
      },
    }, async (request, reply) => {
      const id = parseInt(request.params.id);
      const user = users.get(id);

      if (!user) {
        reply.code(404);
        return { error: 'Not Found', message: `User ${id} not found` };
      }

      // Check email uniqueness if changing
      if (request.body.email && request.body.email !== user.email) {
        const existingUser = Array.from(users.values()).find(
          u => u.email === request.body.email && u.id !== id
        );
        if (existingUser) {
          reply.code(409);
          return { error: 'Conflict', message: 'Email already registered' };
        }
      }

      const updatedUser: User = {
        ...user,
        ...request.body,
      };

      users.set(id, updatedUser);
      return updatedUser;
    });

    // Delete user
    fastify.delete<{
      Params: { id: string };
    }>('/:id', {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', pattern: '^[0-9]+$' },
          },
        },
      },
    }, async (request, reply) => {
      const id = parseInt(request.params.id);

      if (!users.has(id)) {
        reply.code(404);
        return { error: 'Not Found', message: `User ${id} not found` };
      }

      users.delete(id);
      reply.code(204);
    });
  };

  // Register user routes with prefix
  await app.register(userRoutes, { prefix: '/api/users' });

  // Error handler
  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;

    request.log.error({ err: error });

    reply.status(statusCode).send({
      error: error.name || 'Error',
      message: statusCode >= 500 ? 'Internal Server Error' : error.message,
      statusCode,
    });
  });

  // 404 handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: 'Not Found',
      message: `Route ${request.method} ${request.url} not found`,
      statusCode: 404,
    });
  });

  return app;
}

// Start server
async function main(): Promise<void> {
  const app = await buildApp();

  try {
    const port = parseInt(process.env.PORT || '3000');
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Server running at http://localhost:${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
```

## Summary

| Feature | Implementation |
|---------|----------------|
| **Routing** | Declarative routes with full HTTP method support |
| **Validation** | JSON Schema with automatic error responses |
| **Plugins** | Encapsulated functionality with dependency injection |
| **Hooks** | Lifecycle interception at every stage |
| **Error handling** | Custom error handlers with automatic logging |
| **TypeScript** | First-class support with generics |
| **Performance** | Schema-based serialization, minimal overhead |

Fastify gives you the performance of a low-level framework with the ergonomics of a modern API framework. The combination of JSON Schema validation, the plugin system, and comprehensive TypeScript support makes it an excellent choice for building APIs that need to handle high traffic loads.

For production APIs, monitoring is essential. You need visibility into response times, error rates, and throughput to ensure your Fastify application performs as expected. [OneUptime](https://oneuptime.com) provides comprehensive API monitoring with synthetic checks, real-time alerting, and detailed performance dashboards. Set up monitoring for your Fastify endpoints to catch issues before your users do.
