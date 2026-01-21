# How to Use Redis with Express.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Express.js, Node.js, Caching, Sessions, Rate Limiting, Middleware

Description: A comprehensive guide to integrating Redis with Express.js applications, covering session management, caching middleware, rate limiting, and real-time features with practical examples.

---

Express.js pairs excellently with Redis for session storage, caching, rate limiting, and real-time features. This guide covers practical patterns for building high-performance Express applications with Redis.

## Installation

```bash
npm install redis express-session connect-redis ioredis rate-limit-redis
```

## Redis Client Setup

### Using ioredis (Recommended)

```javascript
// redis.js
const Redis = require('ioredis');

// Single instance
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
});

// Connection events
redis.on('connect', () => {
  console.log('Redis connected');
});

redis.on('error', (err) => {
  console.error('Redis error:', err);
});

module.exports = redis;
```

### Using node-redis

```javascript
// redis.js
const { createClient } = require('redis');

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redis.on('error', (err) => console.error('Redis error:', err));

(async () => {
  await redis.connect();
})();

module.exports = redis;
```

## Session Management

### Configure Express Session with Redis

```javascript
// app.js
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const redis = require('./redis');

const app = express();

// Create Redis store
const redisStore = new RedisStore({
  client: redis,
  prefix: 'session:',
  ttl: 86400, // 24 hours in seconds
});

// Configure session middleware
app.use(session({
  store: redisStore,
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  name: 'sessionId',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
  },
}));

// Session usage
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Validate credentials...
  const user = await authenticateUser(username, password);

  if (user) {
    // Store user data in session
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.isAuthenticated = true;

    res.json({ message: 'Login successful' });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.get('/profile', (req, res) => {
  if (!req.session.isAuthenticated) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json({
    userId: req.session.userId,
    username: req.session.username,
  });
});

app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('sessionId');
    res.json({ message: 'Logged out' });
  });
});
```

## Caching Middleware

### Response Cache Middleware

```javascript
// middleware/cache.js
const redis = require('../redis');

function cacheMiddleware(options = {}) {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = (req) => `cache:${req.method}:${req.originalUrl}`,
    condition = () => true,
  } = options;

  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET' || !condition(req)) {
      return next();
    }

    const key = keyGenerator(req);

    try {
      // Check cache
      const cached = await redis.get(key);

      if (cached) {
        const data = JSON.parse(cached);
        res.set('X-Cache', 'HIT');
        return res.json(data);
      }

      // Store original json method
      const originalJson = res.json.bind(res);

      // Override json method to cache response
      res.json = async (data) => {
        // Cache the response
        await redis.setex(key, ttl, JSON.stringify(data));
        res.set('X-Cache', 'MISS');
        return originalJson(data);
      };

      next();
    } catch (error) {
      console.error('Cache error:', error);
      next();
    }
  };
}

module.exports = cacheMiddleware;
```

### Using Cache Middleware

```javascript
const express = require('express');
const cacheMiddleware = require('./middleware/cache');

const app = express();

// Cache all GET requests for 5 minutes
app.use(cacheMiddleware({ ttl: 300 }));

// Or per-route caching
app.get('/api/products',
  cacheMiddleware({ ttl: 600 }), // 10 minutes
  async (req, res) => {
    const products = await Product.findAll();
    res.json(products);
  }
);

// Custom cache key
app.get('/api/users/:id',
  cacheMiddleware({
    ttl: 300,
    keyGenerator: (req) => `user:${req.params.id}`,
  }),
  async (req, res) => {
    const user = await User.findById(req.params.id);
    res.json(user);
  }
);
```

### Cache Service

```javascript
// services/cache.js
const redis = require('../redis');

class CacheService {
  constructor(prefix = 'app') {
    this.prefix = prefix;
  }

  key(name) {
    return `${this.prefix}:${name}`;
  }

  async get(name) {
    const data = await redis.get(this.key(name));
    return data ? JSON.parse(data) : null;
  }

  async set(name, value, ttl = 300) {
    await redis.setex(this.key(name), ttl, JSON.stringify(value));
  }

  async delete(name) {
    await redis.del(this.key(name));
  }

  async remember(name, ttl, callback) {
    let data = await this.get(name);

    if (data === null) {
      data = await callback();
      await this.set(name, data, ttl);
    }

    return data;
  }

  async tags(tags) {
    // Return a tagged cache instance
    return new TaggedCache(this, tags);
  }

  async flush(pattern = '*') {
    const keys = await redis.keys(this.key(pattern));
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}

module.exports = new CacheService();
```

### Using Cache Service

```javascript
const cache = require('./services/cache');

// In a controller
async function getProducts(req, res) {
  const products = await cache.remember('products:all', 600, async () => {
    return await Product.findAll({ include: ['category'] });
  });

  res.json(products);
}

async function getProduct(req, res) {
  const { id } = req.params;

  const product = await cache.remember(`product:${id}`, 300, async () => {
    return await Product.findById(id);
  });

  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  res.json(product);
}

async function updateProduct(req, res) {
  const { id } = req.params;

  await Product.update(id, req.body);

  // Invalidate cache
  await cache.delete(`product:${id}`);
  await cache.flush('products:*');

  res.json({ message: 'Product updated' });
}
```

## Rate Limiting

### Using express-rate-limit with Redis

```javascript
// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const redis = require('../redis');

// General API rate limiter
const apiLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for auth endpoints
const authLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: {
    error: 'Too many login attempts, please try again later.',
  },
  skipSuccessfulRequests: true,
});

module.exports = { apiLimiter, authLimiter };
```

### Custom Rate Limiter with Sliding Window

```javascript
// middleware/slidingWindowLimiter.js
const redis = require('../redis');

function slidingWindowLimiter(options = {}) {
  const {
    windowMs = 60000,
    max = 100,
    keyGenerator = (req) => req.ip,
    message = 'Too many requests',
  } = options;

  return async (req, res, next) => {
    const key = `ratelimit:${keyGenerator(req)}`;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      // Remove old entries and count current window
      const multi = redis.multi();
      multi.zremrangebyscore(key, 0, windowStart);
      multi.zadd(key, now, `${now}:${Math.random()}`);
      multi.zcard(key);
      multi.expire(key, Math.ceil(windowMs / 1000));

      const results = await multi.exec();
      const requestCount = results[2][1];

      // Set rate limit headers
      res.set({
        'X-RateLimit-Limit': max,
        'X-RateLimit-Remaining': Math.max(0, max - requestCount),
        'X-RateLimit-Reset': new Date(now + windowMs).toISOString(),
      });

      if (requestCount > max) {
        return res.status(429).json({ error: message });
      }

      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      next(); // Fail open
    }
  };
}

module.exports = slidingWindowLimiter;
```

### Using Rate Limiters

```javascript
const express = require('express');
const { apiLimiter, authLimiter } = require('./middleware/rateLimiter');
const slidingWindowLimiter = require('./middleware/slidingWindowLimiter');

const app = express();

// Apply to all API routes
app.use('/api', apiLimiter);

// Stricter limits for auth
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Custom per-user limiter
app.use('/api/expensive-operation',
  slidingWindowLimiter({
    windowMs: 60000,
    max: 10,
    keyGenerator: (req) => req.user?.id || req.ip,
  })
);
```

## Real-Time Features with Socket.IO

### Socket.IO with Redis Adapter

```javascript
// server.js
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
  },
});

// Setup Redis adapter for scaling
const pubClient = new Redis(process.env.REDIS_URL);
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));

// Socket.IO handlers
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join room
  socket.on('join:room', (roomId) => {
    socket.join(roomId);
    io.to(roomId).emit('user:joined', { socketId: socket.id });
  });

  // Chat message
  socket.on('chat:message', (data) => {
    io.to(data.roomId).emit('chat:message', {
      ...data,
      timestamp: new Date(),
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

httpServer.listen(3000);
```

### Pub/Sub for Real-Time Updates

```javascript
// services/realtime.js
const redis = require('../redis');
const { Server } = require('socket.io');

class RealtimeService {
  constructor(io) {
    this.io = io;
    this.subscriber = redis.duplicate();
    this.setupSubscriptions();
  }

  setupSubscriptions() {
    this.subscriber.subscribe('notifications', 'orders');

    this.subscriber.on('message', (channel, message) => {
      const data = JSON.parse(message);

      switch (channel) {
        case 'notifications':
          this.handleNotification(data);
          break;
        case 'orders':
          this.handleOrderUpdate(data);
          break;
      }
    });
  }

  handleNotification(data) {
    // Send to specific user
    this.io.to(`user:${data.userId}`).emit('notification', data);
  }

  handleOrderUpdate(data) {
    // Send to user and admin rooms
    this.io.to(`user:${data.userId}`).emit('order:updated', data);
    this.io.to('admin').emit('order:updated', data);
  }

  // Called from other parts of the app
  static async publish(channel, data) {
    await redis.publish(channel, JSON.stringify(data));
  }
}

module.exports = RealtimeService;
```

### Publishing Events

```javascript
const RealtimeService = require('./services/realtime');

// In a controller or service
async function updateOrderStatus(orderId, status) {
  await Order.update(orderId, { status });

  // Publish to Redis (all server instances receive it)
  await RealtimeService.publish('orders', {
    type: 'status_update',
    orderId,
    status,
    userId: order.userId,
  });
}

async function sendNotification(userId, message) {
  await Notification.create({ userId, message });

  await RealtimeService.publish('notifications', {
    userId,
    message,
    timestamp: new Date(),
  });
}
```

## Job Queue with BullMQ

```javascript
// queues/emailQueue.js
const { Queue, Worker } = require('bullmq');
const redis = require('../redis');

// Create queue
const emailQueue = new Queue('emails', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

// Create worker
const emailWorker = new Worker('emails', async (job) => {
  const { to, subject, body } = job.data;

  // Send email
  await sendEmail(to, subject, body);

  return { sent: true };
}, {
  connection: redis,
  concurrency: 5,
});

// Event handlers
emailWorker.on('completed', (job) => {
  console.log(`Email job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`Email job ${job.id} failed:`, err);
});

// Export for use in routes
module.exports = {
  addEmailJob: async (data) => {
    return await emailQueue.add('send-email', data);
  },
};
```

## Best Practices

1. **Use connection pooling** with ioredis
2. **Handle connection errors** gracefully
3. **Set appropriate TTLs** for cached data
4. **Use namespaced keys** with prefixes
5. **Implement circuit breakers** for Redis operations
6. **Monitor Redis health** with health check endpoints

## Conclusion

Redis integration with Express.js provides powerful capabilities for:

- Session management with connect-redis
- Response caching with custom middleware
- Rate limiting with sliding window algorithms
- Real-time features with Socket.IO
- Job queues with BullMQ

By following these patterns, you can build scalable and performant Express applications that leverage Redis for caching, sessions, and real-time features.
