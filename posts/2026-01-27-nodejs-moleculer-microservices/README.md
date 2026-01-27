# How to Build Microservices with Node.js and Moleculer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Node.js, Moleculer, Microservices, JavaScript, Distributed Systems

Description: Learn how to build scalable microservices with Node.js using the Moleculer framework, including service creation, communication, and deployment.

---

> "Moleculer brings the power of distributed systems to Node.js without the complexity. It handles service discovery, load balancing, and fault tolerance out of the box."

Building microservices in Node.js often means choosing between heavy frameworks that do too much or lightweight libraries that leave you reinventing the wheel. Moleculer strikes a balance - it provides a complete microservices toolkit while remaining fast and developer-friendly.

## What is Moleculer and Why Use It

Moleculer is a progressive microservices framework for Node.js. It provides:

- **Service-oriented architecture** - Services are first-class citizens with actions, events, and lifecycle hooks
- **Multiple transporters** - Built-in support for NATS, Redis, MQTT, TCP, and more
- **Built-in load balancing** - Round-robin, random, and CPU-based strategies
- **Fault tolerance** - Circuit breakers, retries, timeouts, and bulkheads
- **Caching** - Multi-level caching with memory, Redis, and custom adapters
- **Serialization** - JSON, MessagePack, Avro, and Protocol Buffers
- **API Gateway** - Expose services via REST, GraphQL, or WebSocket

Unlike frameworks that require external service meshes or container orchestration for basic functionality, Moleculer handles service discovery and communication natively.

## Setting Up a Moleculer Project

### Installation

```bash
# Create project directory
mkdir moleculer-demo && cd moleculer-demo

# Initialize project
npm init -y

# Install Moleculer and CLI
npm install moleculer moleculer-web moleculer-db
npm install -D moleculer-repl
```

### Project Structure

```
moleculer-demo/
  services/
    api.service.js       # API Gateway
    users.service.js     # User service
    orders.service.js    # Order service
  moleculer.config.js    # Configuration
  index.js               # Entry point
```

### Basic Configuration

Create `moleculer.config.js` to configure the broker:

```javascript
// moleculer.config.js
module.exports = {
  // Namespace for service isolation in multi-tenant environments
  namespace: "production",

  // Unique node identifier (auto-generated if not set)
  nodeID: process.env.NODE_ID || null,

  // Logging configuration
  logger: {
    type: "Console",
    options: {
      level: process.env.LOG_LEVEL || "info",
      formatter: "full",
      colors: true,
    },
  },

  // Transporter for inter-service communication
  transporter: process.env.TRANSPORTER || "TCP",

  // Serializer for message encoding
  serializer: "JSON",

  // Request timeout in milliseconds
  requestTimeout: 10000,

  // Retry policy for failed requests
  retryPolicy: {
    enabled: true,
    retries: 3,
    delay: 100,
    maxDelay: 1000,
    factor: 2,
  },

  // Circuit breaker settings
  circuitBreaker: {
    enabled: true,
    threshold: 0.5,       // Trip after 50% failures
    windowTime: 60,       // 60 second window
    minRequestCount: 20,  // Minimum requests before tripping
    halfOpenTime: 10000,  // Wait before retry
  },

  // Bulkhead for limiting concurrent calls
  bulkhead: {
    enabled: true,
    concurrency: 10,
    maxQueueSize: 100,
  },

  // Caching configuration
  cacher: {
    type: "Memory",
    options: {
      maxParamsLength: 100,
      ttl: 30,
    },
  },

  // Metrics collection
  metrics: {
    enabled: true,
    reporter: "Console",
  },

  // Tracing configuration
  tracing: {
    enabled: true,
    exporter: {
      type: "Console",
    },
  },
};
```

### Entry Point

```javascript
// index.js
const { ServiceBroker } = require("moleculer");
const config = require("./moleculer.config");

// Create service broker with configuration
const broker = new ServiceBroker(config);

// Load all services from the services directory
broker.loadServices("./services", "**/*.service.js");

// Start broker and log available services
broker.start().then(() => {
  broker.logger.info("Broker started successfully");

  // List registered services for debugging
  const services = broker.registry.getServiceList({ withActions: true });
  services.forEach((svc) => {
    broker.logger.info(`Service: ${svc.name}, Actions: ${Object.keys(svc.actions).join(", ")}`);
  });
});
```

## Creating Services with Actions and Events

### Basic Service Structure

```javascript
// services/users.service.js
module.exports = {
  // Service name - used for calling actions
  name: "users",

  // Service version (optional)
  version: 1,

  // Service settings
  settings: {
    // Custom settings accessible via this.settings
    defaultPageSize: 10,
  },

  // Service dependencies - broker waits for these before starting
  dependencies: [],

  // Service metadata
  metadata: {
    description: "User management service",
  },

  // Actions are the main entry points for service calls
  actions: {
    // Simple action
    list: {
      // Input validation with fastest-validator
      params: {
        page: { type: "number", optional: true, default: 1, min: 1 },
        limit: { type: "number", optional: true, default: 10, max: 100 },
      },

      // Cache results for 30 seconds
      cache: {
        keys: ["page", "limit"],
        ttl: 30,
      },

      // Action handler
      async handler(ctx) {
        const { page, limit } = ctx.params;
        const offset = (page - 1) * limit;

        // Access database or external service
        const users = await this.adapter.find({
          offset,
          limit,
          sort: "-createdAt",
        });

        return {
          data: users,
          page,
          limit,
          total: await this.adapter.count(),
        };
      },
    },

    // Action with parameter
    get: {
      params: {
        id: { type: "string", min: 1 },
      },
      cache: {
        keys: ["id"],
        ttl: 60,
      },
      async handler(ctx) {
        const user = await this.adapter.findById(ctx.params.id);

        if (!user) {
          throw new MoleculerClientError("User not found", 404);
        }

        return user;
      },
    },

    // Create action
    create: {
      params: {
        email: { type: "email" },
        name: { type: "string", min: 2, max: 100 },
        password: { type: "string", min: 8 },
      },
      async handler(ctx) {
        const { email, name, password } = ctx.params;

        // Check for existing user
        const existing = await this.adapter.findOne({ email });
        if (existing) {
          throw new MoleculerClientError("Email already registered", 409);
        }

        // Create user
        const user = await this.adapter.insert({
          email,
          name,
          password: await this.hashPassword(password),
          createdAt: new Date(),
        });

        // Emit event for other services
        ctx.emit("user.created", { id: user.id, email: user.email });

        // Clear list cache since data changed
        await this.broker.cacher.clean("users.list**");

        return this.sanitizeUser(user);
      },
    },
  },

  // Events this service listens to
  events: {
    // Listen for user created events (from this or other services)
    "user.created"(ctx) {
      this.logger.info("User created:", ctx.params);
    },

    // Wildcard event listener
    "order.**"(ctx) {
      this.logger.info(`Order event: ${ctx.eventName}`, ctx.params);
    },
  },

  // Methods are private functions available via this
  methods: {
    async hashPassword(password) {
      const bcrypt = require("bcrypt");
      return bcrypt.hash(password, 10);
    },

    sanitizeUser(user) {
      const { password, ...safe } = user;
      return safe;
    },
  },

  // Lifecycle hooks
  created() {
    // Called when service is created (sync)
    this.logger.info("Users service created");
  },

  async started() {
    // Called when service is started (async)
    this.logger.info("Users service started");
  },

  async stopped() {
    // Called when service is stopped (async)
    this.logger.info("Users service stopped");
  },
};
```

### Service with Database Adapter

```javascript
// services/orders.service.js
const DbMixin = require("moleculer-db");

module.exports = {
  name: "orders",

  // Mix in database functionality
  mixins: [DbMixin],

  // Database adapter configuration
  adapter: new DbMixin.MemoryAdapter(),

  // Collection/table name
  collection: "orders",

  // Entity validation schema
  settings: {
    fields: ["_id", "userId", "items", "total", "status", "createdAt"],
    entityValidator: {
      userId: { type: "string" },
      items: { type: "array", items: "object" },
      total: { type: "number", positive: true },
      status: { type: "enum", values: ["pending", "confirmed", "shipped", "delivered"] },
    },
  },

  actions: {
    // Custom action beyond CRUD
    getByUser: {
      params: {
        userId: { type: "string" },
      },
      async handler(ctx) {
        return this.adapter.find({
          query: { userId: ctx.params.userId },
          sort: "-createdAt",
        });
      },
    },

    create: {
      params: {
        userId: { type: "string" },
        items: { type: "array", min: 1 },
      },
      async handler(ctx) {
        const { userId, items } = ctx.params;

        // Calculate total from items
        const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

        // Create order
        const order = await this.adapter.insert({
          userId,
          items,
          total,
          status: "pending",
          createdAt: new Date(),
        });

        // Broadcast event
        ctx.broadcast("order.created", {
          orderId: order._id,
          userId,
          total,
        });

        return order;
      },
    },

    updateStatus: {
      params: {
        id: { type: "string" },
        status: { type: "enum", values: ["pending", "confirmed", "shipped", "delivered"] },
      },
      async handler(ctx) {
        const { id, status } = ctx.params;

        const order = await this.adapter.updateById(id, {
          $set: { status, updatedAt: new Date() },
        });

        if (!order) {
          throw new MoleculerClientError("Order not found", 404);
        }

        ctx.emit("order.statusChanged", { orderId: id, status });

        return order;
      },
    },
  },

  // Hook into database lifecycle
  entityCreated(json, ctx) {
    this.logger.info("Order created:", json._id);
  },

  entityUpdated(json, ctx) {
    this.logger.info("Order updated:", json._id);
  },
};
```

## Service Communication

### Request-Response Pattern

```javascript
// Calling actions from other services
async function processOrder(ctx) {
  // Call user service to validate user exists
  const user = await ctx.call("users.get", { id: ctx.params.userId });

  // Call inventory service to check stock
  const stockAvailable = await ctx.call("inventory.checkStock", {
    items: ctx.params.items,
  });

  if (!stockAvailable) {
    throw new MoleculerClientError("Insufficient stock", 400);
  }

  // Call payment service
  const payment = await ctx.call("payments.charge", {
    userId: user.id,
    amount: ctx.params.total,
  });

  // Create order
  const order = await ctx.call("orders.create", {
    userId: user.id,
    items: ctx.params.items,
    paymentId: payment.id,
  });

  return order;
}
```

### Calling with Options

```javascript
// Call with custom timeout
const result = await ctx.call("slow-service.action", params, {
  timeout: 30000,
});

// Call with retry override
const result = await ctx.call("flaky-service.action", params, {
  retries: 5,
  retryDelay: 500,
});

// Call specific node (bypass load balancing)
const result = await ctx.call("users.get", params, {
  nodeID: "node-1",
});

// Call with metadata
const result = await ctx.call("users.get", params, {
  meta: {
    userId: ctx.meta.user.id,
    traceId: ctx.meta.traceId,
  },
});
```

### Event-Based Communication

```javascript
// Emit event to one handler (load balanced)
ctx.emit("order.created", { orderId: "123" });

// Broadcast event to all handlers on all nodes
ctx.broadcast("cache.clear", { pattern: "users.*" });

// Emit with groups (only services in specified groups receive)
ctx.emit("order.created", { orderId: "123" }, ["notification", "analytics"]);

// Emit event to local services only
ctx.emit("order.created", { orderId: "123" }, { broadcast: false });
```

### Event Listener Patterns

```javascript
module.exports = {
  name: "notifications",

  events: {
    // Exact match
    "order.created"(ctx) {
      this.sendOrderConfirmation(ctx.params);
    },

    // Wildcard - matches order.created, order.updated, etc.
    "order.*"(ctx) {
      this.logger.info(`Order event: ${ctx.eventName}`);
    },

    // Double wildcard - matches order.item.added, order.payment.failed, etc.
    "order.**"(ctx) {
      this.trackOrderEvent(ctx.eventName, ctx.params);
    },

    // Event with group - only receive if in this group
    "user.created": {
      group: "notification",
      handler(ctx) {
        this.sendWelcomeEmail(ctx.params);
      },
    },
  },
};
```

## Built-in Transporters

Moleculer supports multiple transporters for service-to-service communication.

### TCP Transporter (Default)

```javascript
// moleculer.config.js
module.exports = {
  transporter: "TCP",
  // or with options
  transporter: {
    type: "TCP",
    options: {
      udpDiscovery: true,
      udpPort: 4445,
      udpBindAddress: null,
      udpPeriod: 30,
      urls: null, // Static node list: ["node-1:6000", "node-2:6000"]
      port: 6000,
      gossipPeriod: 2,
      maxConnections: 32,
    },
  },
};
```

### NATS Transporter

```javascript
// moleculer.config.js
module.exports = {
  transporter: "nats://localhost:4222",
  // or with options
  transporter: {
    type: "NATS",
    options: {
      url: "nats://localhost:4222",
      // Cluster support
      servers: ["nats://node1:4222", "nats://node2:4222"],
      user: "admin",
      pass: "secret",
      maxReconnectAttempts: -1,
      reconnect: true,
    },
  },
};
```

### Redis Transporter

```javascript
// moleculer.config.js
module.exports = {
  transporter: "redis://localhost:6379",
  // or with options
  transporter: {
    type: "Redis",
    options: {
      host: "localhost",
      port: 6379,
      password: "secret",
      db: 0,
      // Cluster support
      cluster: {
        nodes: [
          { host: "node1", port: 6379 },
          { host: "node2", port: 6379 },
        ],
      },
    },
  },
};
```

### MQTT Transporter

```javascript
// moleculer.config.js
module.exports = {
  transporter: "mqtt://localhost:1883",
  // or with options
  transporter: {
    type: "MQTT",
    options: {
      host: "localhost",
      port: 1883,
      username: "admin",
      password: "secret",
      qos: 0,
      topicSeparator: ".",
    },
  },
};
```

## API Gateway Integration

### Basic API Gateway

```javascript
// services/api.service.js
const ApiGateway = require("moleculer-web");

module.exports = {
  name: "api",

  mixins: [ApiGateway],

  settings: {
    port: process.env.PORT || 3000,

    // IP whitelist
    ip: "0.0.0.0",

    // Global CORS settings
    cors: {
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    },

    // Rate limiting
    rateLimit: {
      window: 60 * 1000, // 1 minute
      limit: 100,        // 100 requests per minute
      headers: true,
    },

    routes: [
      {
        // API path prefix
        path: "/api",

        // Route-level CORS (overrides global)
        cors: true,

        // Whitelist of allowed actions
        whitelist: ["users.*", "orders.*"],

        // Route aliases for REST endpoints
        aliases: {
          // HTTP method + path -> action
          "GET /users": "users.list",
          "GET /users/:id": "users.get",
          "POST /users": "users.create",
          "PUT /users/:id": "users.update",
          "DELETE /users/:id": "users.remove",

          // REST shorthand - auto-maps CRUD operations
          "REST /orders": "orders",

          // Custom action mapping
          "POST /orders/:id/confirm": "orders.confirm",
          "GET /users/:userId/orders": "orders.getByUser",
        },

        // Middleware for this route
        onBeforeCall(ctx, route, req, res) {
          // Set request metadata
          ctx.meta.userAgent = req.headers["user-agent"];
          ctx.meta.ip = req.connection.remoteAddress;
        },

        onAfterCall(ctx, route, req, res, data) {
          // Modify response
          res.setHeader("X-Request-ID", ctx.meta.requestID);
          return data;
        },

        // Error handler
        onError(req, res, err) {
          res.setHeader("Content-Type", "application/json");
          res.writeHead(err.code || 500);
          res.end(
            JSON.stringify({
              error: err.message,
              code: err.code,
              data: err.data,
            })
          );
        },
      },

      // Protected route with authentication
      {
        path: "/api/admin",

        // Authentication required
        authorization: true,

        aliases: {
          "GET /stats": "admin.stats",
          "POST /broadcast": "admin.broadcast",
        },
      },
    ],
  },

  methods: {
    // Authentication method - called when authorization: true
    async authorize(ctx, route, req) {
      const token = req.headers["authorization"];

      if (!token) {
        throw new ApiGateway.Errors.UnAuthorizedError("NO_TOKEN");
      }

      // Verify token
      const user = await ctx.call("auth.verifyToken", { token });

      if (!user) {
        throw new ApiGateway.Errors.UnAuthorizedError("INVALID_TOKEN");
      }

      // Set user in context meta
      ctx.meta.user = user;
      return user;
    },
  },
};
```

### File Upload Support

```javascript
// services/api.service.js
module.exports = {
  name: "api",
  mixins: [ApiGateway],

  settings: {
    routes: [
      {
        path: "/upload",

        // Enable body parsing for multipart
        bodyParsers: {
          json: false,
          urlencoded: false,
        },

        aliases: {
          "POST /": "multipart:files.upload",
          "POST /avatar": "stream:users.uploadAvatar",
        },

        // File size limit
        busboyConfig: {
          limits: {
            files: 1,
            fileSize: 10 * 1024 * 1024, // 10 MB
          },
        },
      },
    ],
  },
};

// services/files.service.js
module.exports = {
  name: "files",

  actions: {
    upload: {
      async handler(ctx) {
        // ctx.params contains the file stream
        const { filename, mimetype, encoding } = ctx.meta;

        // Process file...
        const path = await this.saveFile(ctx.params, filename);

        return { path, filename, mimetype };
      },
    },
  },
};
```

## Middleware and Hooks

### Global Middleware

```javascript
// moleculer.config.js
module.exports = {
  middlewares: [
    // Logging middleware
    {
      localAction(next, action) {
        return async function (ctx) {
          const startTime = Date.now();
          try {
            const result = await next(ctx);
            ctx.broker.logger.info(
              `${action.name} completed in ${Date.now() - startTime}ms`
            );
            return result;
          } catch (err) {
            ctx.broker.logger.error(
              `${action.name} failed after ${Date.now() - startTime}ms:`,
              err.message
            );
            throw err;
          }
        };
      },
    },

    // Authentication middleware
    {
      localAction(next, action) {
        // Check if action requires auth
        if (action.auth === true) {
          return async function (ctx) {
            if (!ctx.meta.user) {
              throw new MoleculerClientError("Unauthorized", 401);
            }
            return next(ctx);
          };
        }
        return next;
      },
    },
  ],
};
```

### Action Hooks

```javascript
module.exports = {
  name: "users",

  hooks: {
    // Before hooks - run before action handler
    before: {
      // Hook for specific action
      create(ctx) {
        ctx.params.createdAt = new Date();
        ctx.params.createdBy = ctx.meta.user?.id;
      },

      // Hook for multiple actions
      "update,remove"(ctx) {
        if (!ctx.meta.user?.isAdmin) {
          throw new MoleculerClientError("Admin required", 403);
        }
      },

      // Global before hook for all actions
      "*"(ctx) {
        this.logger.debug(`Action ${ctx.action.name} called`);
      },
    },

    // After hooks - run after action handler
    after: {
      get(ctx, result) {
        // Modify result before returning
        return this.sanitize(result);
      },

      "*"(ctx, result) {
        this.logger.debug(`Action ${ctx.action.name} completed`);
        return result;
      },
    },

    // Error hooks - run when action throws
    error: {
      "*"(ctx, err) {
        this.logger.error(`Action ${ctx.action.name} error:`, err.message);
        throw err;
      },
    },
  },

  actions: {
    // Actions with custom hooks
    sensitiveAction: {
      hooks: {
        before(ctx) {
          // Action-specific hook
          this.auditLog(ctx);
        },
      },
      handler(ctx) {
        // ...
      },
    },
  },
};
```

## Caching and Circuit Breakers

### Multi-Level Caching

```javascript
// moleculer.config.js
module.exports = {
  // Memory cacher for development
  cacher: "Memory",

  // Redis cacher for production
  cacher: {
    type: "Redis",
    options: {
      prefix: "MOL-",
      ttl: 30,
      monitor: false,
      redis: {
        host: "localhost",
        port: 6379,
        password: "secret",
        db: 0,
      },
    },
  },
};
```

### Cache Usage in Actions

```javascript
module.exports = {
  name: "products",

  actions: {
    // Simple caching
    list: {
      cache: true,
      handler(ctx) {
        return this.adapter.find();
      },
    },

    // Cache with custom key and TTL
    get: {
      cache: {
        keys: ["id"],
        ttl: 60, // 60 seconds
      },
      params: {
        id: "string",
      },
      handler(ctx) {
        return this.adapter.findById(ctx.params.id);
      },
    },

    // Cache with custom key generation
    search: {
      cache: {
        keys: ["query", "category", "#user.id"],
        keygen(name, params, meta) {
          return `${name}:${params.query}:${params.category}:${meta.user?.id || "anon"}`;
        },
        ttl: 300,
      },
      handler(ctx) {
        return this.search(ctx.params);
      },
    },

    // Manual cache operations
    update: {
      async handler(ctx) {
        const product = await this.adapter.updateById(ctx.params.id, ctx.params);

        // Clear specific cache entry
        await this.broker.cacher.del(`products.get:${ctx.params.id}`);

        // Clear all product caches
        await this.broker.cacher.clean("products.**");

        return product;
      },
    },
  },
};
```

### Circuit Breaker Configuration

```javascript
// moleculer.config.js
module.exports = {
  circuitBreaker: {
    enabled: true,

    // Failure threshold (0-1) - trips at 50% failure rate
    threshold: 0.5,

    // Time window for calculating failure rate
    windowTime: 60,

    // Minimum requests before circuit can trip
    minRequestCount: 20,

    // Time to wait before trying again (half-open state)
    halfOpenTime: 10000,

    // Custom check function
    check(err) {
      // Only count 5xx errors as failures
      return err && err.code >= 500;
    },
  },
};

// Per-action circuit breaker override
module.exports = {
  name: "external-api",

  actions: {
    call: {
      circuitBreaker: {
        threshold: 0.3,     // More sensitive
        windowTime: 30,
        minRequestCount: 10,
      },
      async handler(ctx) {
        return this.callExternalApi(ctx.params);
      },
    },
  },
};
```

### Fallback Handlers

```javascript
module.exports = {
  name: "recommendations",

  actions: {
    get: {
      // Fallback when circuit is open or action fails
      fallback: "cachedRecommendations",

      async handler(ctx) {
        return this.getPersonalizedRecommendations(ctx.params.userId);
      },
    },

    // Fallback action
    cachedRecommendations: {
      cache: true,
      handler(ctx) {
        return this.getDefaultRecommendations();
      },
    },
  },
};
```

## Testing Services

### Unit Testing

```javascript
// tests/users.service.spec.js
const { ServiceBroker } = require("moleculer");
const UsersService = require("../services/users.service");

describe("Users Service", () => {
  let broker;

  beforeAll(async () => {
    broker = new ServiceBroker({
      logger: false, // Disable logging in tests
    });

    broker.createService(UsersService);
    await broker.start();
  });

  afterAll(async () => {
    await broker.stop();
  });

  describe("users.create", () => {
    it("should create a user with valid data", async () => {
      const result = await broker.call("users.create", {
        email: "test@example.com",
        name: "Test User",
        password: "securepassword123",
      });

      expect(result).toHaveProperty("id");
      expect(result.email).toBe("test@example.com");
      expect(result.name).toBe("Test User");
      expect(result).not.toHaveProperty("password");
    });

    it("should reject duplicate email", async () => {
      await expect(
        broker.call("users.create", {
          email: "test@example.com",
          name: "Another User",
          password: "password123",
        })
      ).rejects.toThrow("Email already registered");
    });

    it("should validate email format", async () => {
      await expect(
        broker.call("users.create", {
          email: "invalid-email",
          name: "Test User",
          password: "password123",
        })
      ).rejects.toThrow();
    });
  });

  describe("users.get", () => {
    it("should return user by id", async () => {
      const created = await broker.call("users.create", {
        email: "gettest@example.com",
        name: "Get Test",
        password: "password123",
      });

      const result = await broker.call("users.get", { id: created.id });

      expect(result.id).toBe(created.id);
      expect(result.email).toBe("gettest@example.com");
    });

    it("should throw 404 for non-existent user", async () => {
      await expect(
        broker.call("users.get", { id: "nonexistent" })
      ).rejects.toThrow("User not found");
    });
  });
});
```

### Testing with Mocks

```javascript
// tests/orders.service.spec.js
const { ServiceBroker } = require("moleculer");
const OrdersService = require("../services/orders.service");

describe("Orders Service", () => {
  let broker;

  beforeAll(async () => {
    broker = new ServiceBroker({ logger: false });

    // Create mock user service
    broker.createService({
      name: "users",
      actions: {
        get: {
          handler(ctx) {
            if (ctx.params.id === "valid-user") {
              return { id: "valid-user", name: "Test User" };
            }
            throw new Error("User not found");
          },
        },
      },
    });

    // Create mock inventory service
    broker.createService({
      name: "inventory",
      actions: {
        checkStock: {
          handler(ctx) {
            return ctx.params.items.every((item) => item.quantity <= 10);
          },
        },
        reserve: {
          handler(ctx) {
            return { reserved: true };
          },
        },
      },
    });

    broker.createService(OrdersService);
    await broker.start();
  });

  afterAll(async () => {
    await broker.stop();
  });

  it("should create order for valid user with available stock", async () => {
    const result = await broker.call("orders.create", {
      userId: "valid-user",
      items: [{ productId: "prod-1", quantity: 2, price: 10 }],
    });

    expect(result).toHaveProperty("_id");
    expect(result.userId).toBe("valid-user");
    expect(result.total).toBe(20);
    expect(result.status).toBe("pending");
  });
});
```

### Integration Testing

```javascript
// tests/integration/api.spec.js
const request = require("supertest");
const { ServiceBroker } = require("moleculer");
const ApiService = require("../../services/api.service");
const UsersService = require("../../services/users.service");

describe("API Gateway", () => {
  let broker;
  let server;

  beforeAll(async () => {
    broker = new ServiceBroker({ logger: false });

    const apiService = broker.createService(ApiService);
    broker.createService(UsersService);

    await broker.start();
    server = apiService.server;
  });

  afterAll(async () => {
    await broker.stop();
  });

  describe("GET /api/users", () => {
    it("should return user list", async () => {
      const response = await request(server).get("/api/users").expect(200);

      expect(response.body).toHaveProperty("data");
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe("POST /api/users", () => {
    it("should create user", async () => {
      const response = await request(server)
        .post("/api/users")
        .send({
          email: "api-test@example.com",
          name: "API Test",
          password: "password123",
        })
        .expect(200);

      expect(response.body).toHaveProperty("id");
      expect(response.body.email).toBe("api-test@example.com");
    });

    it("should return 422 for invalid data", async () => {
      const response = await request(server)
        .post("/api/users")
        .send({
          email: "invalid",
          name: "x",
          password: "short",
        })
        .expect(422);

      expect(response.body).toHaveProperty("error");
    });
  });
});
```

## Production Deployment

### Docker Configuration

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start application
CMD ["node", "index.js"]
```

### Docker Compose for Development

```yaml
# docker-compose.yml
version: "3.8"

services:
  nats:
    image: nats:latest
    ports:
      - "4222:4222"
      - "8222:8222"

  redis:
    image: redis:alpine
    ports:
      - "6379:6379"

  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - TRANSPORTER=nats://nats:4222
      - CACHER=redis://redis:6379
      - SERVICES=services/api.service.js
    depends_on:
      - nats
      - redis

  users:
    build: .
    environment:
      - TRANSPORTER=nats://nats:4222
      - CACHER=redis://redis:6379
      - SERVICES=services/users.service.js
    depends_on:
      - nats
      - redis
    deploy:
      replicas: 2

  orders:
    build: .
    environment:
      - TRANSPORTER=nats://nats:4222
      - CACHER=redis://redis:6379
      - SERVICES=services/orders.service.js
    depends_on:
      - nats
      - redis
    deploy:
      replicas: 2
```

### Kubernetes Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: users-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: users-service
  template:
    metadata:
      labels:
        app: users-service
    spec:
      containers:
        - name: users-service
          image: myregistry/users-service:latest
          ports:
            - containerPort: 3000
          env:
            - name: NODE_ENV
              value: "production"
            - name: TRANSPORTER
              value: "nats://nats:4222"
            - name: CACHER
              value: "redis://redis:6379"
            - name: SERVICES
              value: "services/users.service.js"
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 5
            periodSeconds: 5
```

### Health Check Service

```javascript
// services/health.service.js
module.exports = {
  name: "$health",

  actions: {
    live: {
      rest: "GET /health",
      handler() {
        return { status: "ok", timestamp: new Date().toISOString() };
      },
    },

    ready: {
      rest: "GET /ready",
      async handler(ctx) {
        // Check dependencies
        const checks = {
          broker: this.broker.started,
          transporter: this.broker.transit?.connected ?? true,
        };

        // Check if all services are available
        const services = ["users", "orders"];
        for (const svc of services) {
          const endpoint = this.broker.registry.getEndpointList(svc + ".list");
          checks[svc] = endpoint.length > 0;
        }

        const ready = Object.values(checks).every(Boolean);

        if (!ready) {
          ctx.meta.$statusCode = 503;
        }

        return {
          status: ready ? "ready" : "not ready",
          checks,
          timestamp: new Date().toISOString(),
        };
      },
    },
  },
};
```

## Summary

| Feature | Implementation |
|---------|----------------|
| **Service creation** | Define name, actions, events, methods in service schema |
| **Communication** | ctx.call() for request-response, ctx.emit()/broadcast() for events |
| **Transporters** | TCP (default), NATS, Redis, MQTT for distributed deployments |
| **API Gateway** | moleculer-web with routes, aliases, auth, rate limiting |
| **Middleware** | Global middleware in config, hooks in services |
| **Caching** | Memory/Redis cachers, action-level cache config |
| **Fault tolerance** | Circuit breakers, retries, timeouts, bulkheads |
| **Testing** | Unit tests with mocked services, integration tests with supertest |

Moleculer provides a complete toolkit for building production-ready microservices in Node.js. Its built-in features for service discovery, load balancing, and fault tolerance mean you can focus on business logic rather than infrastructure concerns.

For monitoring your Moleculer microservices in production, [OneUptime](https://oneuptime.com) provides comprehensive observability with distributed tracing, metrics collection, and alerting that integrates seamlessly with Node.js applications.
