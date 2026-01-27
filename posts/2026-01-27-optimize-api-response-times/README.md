# How to Optimize API Response Times

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: API Performance, Latency, Caching, Database Optimization, Pagination, Async Processing, Compression, CDN, Profiling, Backend Development

Description: A comprehensive guide to identifying and eliminating API latency bottlenecks through measurement, caching, database optimization, and infrastructure improvements.

---

> The fastest API call is the one you never have to make. The second fastest is the one that hits a cache. Everything else requires careful optimization.

Slow APIs frustrate users, increase infrastructure costs, and can cascade into system-wide performance degradation. Whether your endpoint takes 500ms or 5 seconds, the optimization principles remain the same: measure first, identify bottlenecks, and apply targeted fixes.

This guide walks through practical strategies for reducing API response times, from quick wins like compression to architectural changes like async processing.

---

## Measuring API Latency: You Cannot Optimize What You Do Not Measure

Before optimizing anything, establish baselines. Measure response times at multiple levels:

- **Client-side latency**: Total time from request initiation to response received
- **Server-side latency**: Time spent processing the request on your servers
- **Database latency**: Time spent executing queries
- **External service latency**: Time waiting for third-party APIs

### Instrumenting Your API with OpenTelemetry

```javascript
// instrumentation.js
// OpenTelemetry setup for measuring API latency at every layer

const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

// Define the service resource with identifying attributes
const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'api-service',
  [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  environment: process.env.NODE_ENV || 'development'
});

// Configure the OTLP exporter to send traces to your observability backend
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'https://oneuptime.com/otlp'
});

// Initialize the SDK with auto-instrumentation for common libraries
const sdk = new NodeSDK({
  resource,
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Automatically instrument HTTP, Express, database clients, etc.
      '@opentelemetry/instrumentation-http': {
        // Ignore health check endpoints to reduce noise
        ignoreIncomingRequestHook: (req) => req.url === '/health'
      }
    })
  ]
});

sdk.start();
```

### Express Middleware for Response Time Tracking

```javascript
// middleware/responseTime.js
// Custom middleware to track and log response times

const { trace, context } = require('@opentelemetry/api');

function responseTimeMiddleware(req, res, next) {
  // Record the start time with high precision
  const startTime = process.hrtime.bigint();

  // Store start time on request for access in route handlers
  req.startTime = startTime;

  // Hook into response finish event to calculate total time
  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    // Convert nanoseconds to milliseconds
    const durationMs = Number(endTime - startTime) / 1_000_000;

    // Get current span for adding timing attributes
    const span = trace.getSpan(context.active());
    if (span) {
      span.setAttribute('http.response_time_ms', durationMs);
      span.setAttribute('http.status_code', res.statusCode);
    }

    // Log slow requests for investigation
    if (durationMs > 1000) {
      console.warn(`Slow request: ${req.method} ${req.path} took ${durationMs.toFixed(2)}ms`);
    }
  });

  next();
}

module.exports = responseTimeMiddleware;
```

---

## Database Query Optimization: Where Most Latency Hides

Database queries are often the largest contributor to API latency. A single unoptimized query can add seconds to response times.

### Identifying Slow Queries

```sql
-- PostgreSQL: Find queries taking longer than 100ms
-- Run this against your database to identify optimization candidates

SELECT
  query,
  calls,
  total_time / 1000 as total_seconds,
  mean_time as avg_ms,
  max_time as max_ms,
  rows
FROM pg_stat_statements
WHERE mean_time > 100  -- Queries averaging over 100ms
ORDER BY mean_time DESC
LIMIT 20;
```

### Adding Strategic Indexes

```sql
-- Before: Full table scan on every request
-- Query: SELECT * FROM orders WHERE user_id = ? AND status = 'pending'
-- Execution time: 450ms on 1M rows

-- After: Create a composite index matching the query pattern
CREATE INDEX CONCURRENTLY idx_orders_user_status
ON orders (user_id, status)
WHERE status = 'pending';  -- Partial index for common filter

-- Execution time: 2ms on 1M rows
```

### Optimized Query Patterns in Code

```javascript
// repositories/orderRepository.js
// Demonstrates optimized database access patterns

const { Pool } = require('pg');

class OrderRepository {
  constructor(pool) {
    this.pool = pool;
  }

  // BAD: N+1 query problem - fires separate query for each order's items
  async getOrdersWithItemsBad(userId) {
    const orders = await this.pool.query(
      'SELECT * FROM orders WHERE user_id = $1',
      [userId]
    );

    // This creates N additional queries - one per order
    for (const order of orders.rows) {
      order.items = await this.pool.query(
        'SELECT * FROM order_items WHERE order_id = $1',
        [order.id]
      );
    }
    return orders.rows;
  }

  // GOOD: Single query with JOIN - fetches everything in one round trip
  async getOrdersWithItemsGood(userId) {
    const result = await this.pool.query(`
      SELECT
        o.id as order_id,
        o.created_at,
        o.status,
        o.total,
        json_agg(
          json_build_object(
            'id', oi.id,
            'product_name', oi.product_name,
            'quantity', oi.quantity,
            'price', oi.price
          )
        ) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.user_id = $1
      GROUP BY o.id, o.created_at, o.status, o.total
      ORDER BY o.created_at DESC
    `, [userId]);

    return result.rows;
  }

  // BETTER: Use database-side pagination to limit data transfer
  async getOrdersPaginated(userId, limit = 20, cursor = null) {
    const params = [userId, limit];
    let cursorClause = '';

    if (cursor) {
      // Cursor-based pagination is more efficient than OFFSET
      cursorClause = 'AND o.created_at < $3';
      params.push(cursor);
    }

    const result = await this.pool.query(`
      SELECT
        o.id,
        o.created_at,
        o.status,
        o.total
      FROM orders o
      WHERE o.user_id = $1 ${cursorClause}
      ORDER BY o.created_at DESC
      LIMIT $2
    `, params);

    // Return cursor for next page
    const lastItem = result.rows[result.rows.length - 1];
    return {
      data: result.rows,
      nextCursor: lastItem ? lastItem.created_at : null
    };
  }
}

module.exports = OrderRepository;
```

---

## Caching Strategies: The Fastest Request is a Cached One

Implement caching at multiple layers for maximum impact.

### Application-Level Caching with Redis

```javascript
// services/cacheService.js
// Redis caching layer with automatic serialization and TTL management

const Redis = require('ioredis');

class CacheService {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      // Enable automatic reconnection
      retryStrategy: (times) => Math.min(times * 50, 2000)
    });
  }

  // Generate consistent cache keys with namespace prefix
  generateKey(namespace, identifier) {
    return `cache:${namespace}:${identifier}`;
  }

  // Get cached value with automatic JSON parsing
  async get(namespace, identifier) {
    const key = this.generateKey(namespace, identifier);
    const cached = await this.redis.get(key);

    if (cached) {
      return JSON.parse(cached);
    }
    return null;
  }

  // Set value with configurable TTL (default 5 minutes)
  async set(namespace, identifier, value, ttlSeconds = 300) {
    const key = this.generateKey(namespace, identifier);
    await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
  }

  // Cache-aside pattern: get from cache or compute and store
  async getOrSet(namespace, identifier, computeFn, ttlSeconds = 300) {
    const cached = await this.get(namespace, identifier);

    if (cached !== null) {
      return { data: cached, fromCache: true };
    }

    // Cache miss - compute the value
    const computed = await computeFn();
    await this.set(namespace, identifier, computed, ttlSeconds);

    return { data: computed, fromCache: false };
  }

  // Invalidate cache when data changes
  async invalidate(namespace, identifier) {
    const key = this.generateKey(namespace, identifier);
    await this.redis.del(key);
  }

  // Invalidate all keys matching a pattern (use sparingly)
  async invalidatePattern(pattern) {
    const keys = await this.redis.keys(`cache:${pattern}`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

module.exports = new CacheService();
```

### Using the Cache in API Handlers

```javascript
// routes/products.js
// API route demonstrating cache-aside pattern

const express = require('express');
const router = express.Router();
const cacheService = require('../services/cacheService');
const productRepository = require('../repositories/productRepository');

// GET /products/:id - Fetch single product with caching
router.get('/:id', async (req, res, next) => {
  try {
    const productId = req.params.id;

    // Attempt to get from cache, compute if missing
    const { data: product, fromCache } = await cacheService.getOrSet(
      'products',           // Namespace
      productId,            // Identifier
      () => productRepository.findById(productId),  // Compute function
      600                   // TTL: 10 minutes
    );

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Add cache header for debugging
    res.set('X-Cache', fromCache ? 'HIT' : 'MISS');
    res.json(product);

  } catch (error) {
    next(error);
  }
});

// PUT /products/:id - Update product and invalidate cache
router.put('/:id', async (req, res, next) => {
  try {
    const productId = req.params.id;
    const updates = req.body;

    // Update in database
    const updated = await productRepository.update(productId, updates);

    // Invalidate the cached version
    await cacheService.invalidate('products', productId);

    // Also invalidate any list caches that might include this product
    await cacheService.invalidatePattern('products:list:*');

    res.json(updated);

  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

---

## Pagination: Do Not Return Everything at Once

Large response payloads slow down serialization, network transfer, and client parsing.

### Cursor-Based Pagination Implementation

```javascript
// middleware/pagination.js
// Reusable pagination middleware with cursor support

function paginationMiddleware(defaultLimit = 20, maxLimit = 100) {
  return (req, res, next) => {
    // Parse and validate limit
    let limit = parseInt(req.query.limit, 10) || defaultLimit;
    limit = Math.min(Math.max(limit, 1), maxLimit);

    // Cursor for efficient pagination (better than offset for large datasets)
    const cursor = req.query.cursor || null;

    // Attach pagination params to request
    req.pagination = { limit, cursor };

    // Helper to format paginated response
    res.paginate = (data, nextCursor, totalCount = null) => {
      const response = {
        data,
        pagination: {
          limit,
          hasMore: data.length === limit,
          nextCursor
        }
      };

      // Include total count only if provided (expensive to compute)
      if (totalCount !== null) {
        response.pagination.total = totalCount;
      }

      return res.json(response);
    };

    next();
  };
}

module.exports = paginationMiddleware;
```

### Paginated Endpoint Example

```javascript
// routes/orders.js
// Orders endpoint with efficient cursor-based pagination

const express = require('express');
const router = express.Router();
const paginationMiddleware = require('../middleware/pagination');
const orderRepository = require('../repositories/orderRepository');

// Apply pagination middleware to all routes in this router
router.use(paginationMiddleware(20, 100));

// GET /orders - List orders with pagination
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { limit, cursor } = req.pagination;

    // Fetch one extra to determine if there are more results
    const result = await orderRepository.getOrdersPaginated(
      userId,
      limit + 1,  // Fetch one extra
      cursor
    );

    // Check if there are more results
    const hasMore = result.data.length > limit;
    const data = hasMore ? result.data.slice(0, limit) : result.data;

    // Determine next cursor
    const lastItem = data[data.length - 1];
    const nextCursor = hasMore && lastItem ? lastItem.created_at : null;

    res.paginate(data, nextCursor);

  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

---

## Async Processing: Offload Heavy Work

Not everything needs to happen synchronously. Move time-consuming operations to background jobs.

### Message Queue Pattern with Bull

```javascript
// queues/emailQueue.js
// Background job processing for non-critical operations

const Queue = require('bull');

// Create a queue backed by Redis
const emailQueue = new Queue('email-notifications', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  },
  defaultJobOptions: {
    attempts: 3,                    // Retry failed jobs
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,          // Keep last 100 completed jobs
    removeOnFail: 500               // Keep last 500 failed jobs
  }
});

// Define how to process email jobs
emailQueue.process(async (job) => {
  const { to, subject, template, data } = job.data;

  // This runs in the background, not blocking API response
  await sendEmail(to, subject, template, data);

  return { sent: true, to };
});

// Error handling for failed jobs
emailQueue.on('failed', (job, error) => {
  console.error(`Email job ${job.id} failed:`, error.message);
});

module.exports = emailQueue;
```

### API Handler Using Async Processing

```javascript
// routes/checkout.js
// Checkout endpoint that offloads non-critical work

const express = require('express');
const router = express.Router();
const emailQueue = require('../queues/emailQueue');
const orderService = require('../services/orderService');

router.post('/', async (req, res, next) => {
  try {
    const { items, paymentMethod } = req.body;
    const userId = req.user.id;

    // Critical path: Process payment and create order
    // This must complete before responding
    const order = await orderService.createOrder(userId, items, paymentMethod);

    // Non-critical: Queue email confirmation for background processing
    // This does NOT block the response
    await emailQueue.add({
      to: req.user.email,
      subject: 'Order Confirmation',
      template: 'order-confirmation',
      data: { orderId: order.id, items, total: order.total }
    });

    // Non-critical: Queue analytics event
    await analyticsQueue.add({
      event: 'order_completed',
      userId,
      orderId: order.id,
      value: order.total
    });

    // Respond immediately - emails send in background
    res.status(201).json({
      orderId: order.id,
      status: 'confirmed',
      message: 'Order placed successfully. Confirmation email will arrive shortly.'
    });

  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

---

## Compression: Reduce Bytes on the Wire

Enable compression to reduce response payload sizes by 60-80%.

### Express Compression Middleware

```javascript
// app.js
// Compression configuration for optimal performance

const express = require('express');
const compression = require('compression');

const app = express();

// Enable compression for all responses
app.use(compression({
  // Only compress responses larger than 1KB
  threshold: 1024,

  // Compression level (1-9, higher = smaller but slower)
  level: 6,

  // Filter function to decide what to compress
  filter: (req, res) => {
    // Do not compress if client does not support it
    if (req.headers['x-no-compression']) {
      return false;
    }

    // Use compression's default filter (checks Accept-Encoding)
    return compression.filter(req, res);
  }
}));

// For JSON APIs, also minimize whitespace
app.set('json spaces', 0);
```

### Response Size Comparison

```javascript
// Example: Product catalog response

// Without compression: 45,230 bytes
// With gzip compression: 8,140 bytes (82% reduction)
// With Brotli compression: 6,890 bytes (85% reduction)

// Time savings on 3G connection:
// 45KB at 750 Kbps = 480ms
// 7KB at 750 Kbps = 75ms
// Savings: 405ms just from compression
```

---

## CDN Usage: Serve from the Edge

Use a Content Delivery Network to cache responses closer to users.

### Configuring Cache Headers

```javascript
// middleware/cacheControl.js
// Cache control headers for CDN and browser caching

function cacheControl(options = {}) {
  return (req, res, next) => {
    const {
      maxAge = 0,           // Browser cache duration in seconds
      sMaxAge = null,       // CDN cache duration in seconds
      staleWhileRevalidate = null,
      private: isPrivate = false,
      noStore = false
    } = options;

    if (noStore) {
      // Never cache sensitive data
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return next();
    }

    const directives = [];

    // Public (CDN can cache) or Private (browser only)
    directives.push(isPrivate ? 'private' : 'public');

    // Browser cache duration
    if (maxAge > 0) {
      directives.push(`max-age=${maxAge}`);
    }

    // CDN cache duration (can be longer than browser cache)
    if (sMaxAge !== null) {
      directives.push(`s-maxage=${sMaxAge}`);
    }

    // Serve stale content while fetching fresh version
    if (staleWhileRevalidate !== null) {
      directives.push(`stale-while-revalidate=${staleWhileRevalidate}`);
    }

    res.set('Cache-Control', directives.join(', '));
    next();
  };
}

module.exports = cacheControl;
```

### Applying Cache Policies to Routes

```javascript
// routes/api.js
// Different cache policies for different data types

const express = require('express');
const router = express.Router();
const cacheControl = require('../middleware/cacheControl');

// Static reference data - cache aggressively
// Categories rarely change, safe to cache for 1 hour
router.get('/categories',
  cacheControl({ maxAge: 300, sMaxAge: 3600, staleWhileRevalidate: 86400 }),
  categoriesController.list
);

// Product listings - moderate caching
// Balance freshness with performance
router.get('/products',
  cacheControl({ maxAge: 60, sMaxAge: 300, staleWhileRevalidate: 600 }),
  productsController.list
);

// User-specific data - never cache on CDN
// Only browser can cache, and briefly
router.get('/profile',
  cacheControl({ maxAge: 0, private: true }),
  profileController.get
);

// Sensitive operations - never cache
router.get('/account/balance',
  cacheControl({ noStore: true }),
  accountController.getBalance
);

module.exports = router;
```

---

## Profiling: Find the Real Bottlenecks

Profiling reveals where your code actually spends time, often surprising you.

### Node.js CPU Profiling

```javascript
// scripts/profile.js
// Enable profiling for performance investigation

const v8Profiler = require('v8-profiler-next');
const fs = require('fs');

// Start CPU profiling
function startProfiling(name = 'api-profile') {
  v8Profiler.startProfiling(name, true);
  console.log(`CPU profiling started: ${name}`);
}

// Stop and save profile
function stopProfiling(name = 'api-profile') {
  const profile = v8Profiler.stopProfiling(name);

  // Export to Chrome DevTools format
  profile.export((error, result) => {
    if (error) {
      console.error('Profile export failed:', error);
      return;
    }

    const filename = `${name}-${Date.now()}.cpuprofile`;
    fs.writeFileSync(filename, result);
    console.log(`Profile saved: ${filename}`);

    // Clean up
    profile.delete();
  });
}

// Profile a specific operation
async function profileOperation(name, operation) {
  startProfiling(name);

  try {
    const result = await operation();
    return result;
  } finally {
    stopProfiling(name);
  }
}

module.exports = { startProfiling, stopProfiling, profileOperation };
```

### Endpoint-Level Profiling Middleware

```javascript
// middleware/profiler.js
// Conditional profiling for production debugging

const { profileOperation } = require('../scripts/profile');

function profilerMiddleware(req, res, next) {
  // Only profile if explicitly requested (use with caution in production)
  if (req.headers['x-profile'] !== process.env.PROFILE_SECRET) {
    return next();
  }

  const profileName = `${req.method}-${req.path.replace(/\//g, '-')}`;

  // Wrap the response.json to capture when response is ready
  const originalJson = res.json.bind(res);
  let profileStarted = false;

  // Start profiling
  const v8Profiler = require('v8-profiler-next');
  v8Profiler.startProfiling(profileName, true);
  profileStarted = true;

  res.json = (data) => {
    if (profileStarted) {
      const profile = v8Profiler.stopProfiling(profileName);
      // In production, send to observability platform instead of saving locally
      profile.delete();
    }
    return originalJson(data);
  };

  next();
}

module.exports = profilerMiddleware;
```

---

## Best Practices Summary

| Area | Practice | Impact |
|------|----------|--------|
| Measurement | Instrument all layers with OpenTelemetry | Foundation for optimization |
| Database | Add indexes for common query patterns | 10-100x query speedup |
| Database | Eliminate N+1 queries with JOINs | 50-90% latency reduction |
| Caching | Implement cache-aside pattern with Redis | 95%+ cache hit = sub-ms response |
| Pagination | Use cursor-based pagination | Consistent performance at scale |
| Async | Move non-critical work to background queues | 60-80% response time reduction |
| Compression | Enable gzip/Brotli compression | 60-85% smaller payloads |
| CDN | Cache static and semi-static responses at edge | 50-200ms latency savings |
| Profiling | Profile before guessing at optimizations | Focus effort on real bottlenecks |

### Optimization Priority Checklist

1. **Measure first** - Instrument your API to identify actual bottlenecks
2. **Check database queries** - This is where most latency hides
3. **Add caching** - Start with the most frequently accessed data
4. **Enable compression** - Quick win with immediate impact
5. **Implement pagination** - Never return unbounded results
6. **Move work async** - Offload everything that does not need to block
7. **Configure CDN** - Cache at the edge for global users
8. **Profile regularly** - Performance regresses; catch it early

---

## Conclusion

API performance is not a one-time fix but an ongoing practice. Start by measuring your current baselines, identify the biggest bottlenecks, and apply targeted optimizations. The strategies in this guide can reduce API response times from seconds to milliseconds when applied systematically.

Remember: premature optimization is the root of all evil, but measured optimization is the root of happy users.

---

Monitor your API performance in real-time with [OneUptime](https://oneuptime.com). Track response times, set up latency alerts, and identify slow endpoints before your users notice.
