# How to Create Caching with Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, Caching, Redis, Performance, Backend

Description: Implement caching strategies in Node.js applications using in-memory caching, Redis, and HTTP caching to improve performance and reduce database load.

---

Caching stores frequently accessed data in fast storage, reducing database queries and API calls. A well-implemented cache can cut response times from hundreds of milliseconds to single digits. Here are the main caching strategies for Node.js applications.

## In-Memory Caching

The simplest form of caching stores data in your application's memory:

```javascript
class SimpleCache {
    constructor(defaultTTL = 60000) {  // Default 60 seconds
        this.cache = new Map();
        this.defaultTTL = defaultTTL;
    }

    set(key, value, ttl = this.defaultTTL) {
        const expiry = Date.now() + ttl;
        this.cache.set(key, { value, expiry });
    }

    get(key) {
        const item = this.cache.get(key);

        if (!item) return null;

        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    delete(key) {
        this.cache.delete(key);
    }

    clear() {
        this.cache.clear();
    }

    // Clean up expired entries periodically
    startCleanup(interval = 60000) {
        setInterval(() => {
            const now = Date.now();
            for (const [key, item] of this.cache) {
                if (now > item.expiry) {
                    this.cache.delete(key);
                }
            }
        }, interval);
    }
}

// Usage
const cache = new SimpleCache();
cache.startCleanup();

cache.set('user:123', { name: 'John', email: 'john@example.com' }, 300000);  // 5 minutes
const user = cache.get('user:123');
```

## Redis for Distributed Caching

For applications running on multiple servers, use Redis:

```bash
npm install ioredis
```

```javascript
const Redis = require('ioredis');

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD
});

class RedisCache {
    constructor(client, prefix = '') {
        this.client = client;
        this.prefix = prefix;
    }

    getKey(key) {
        return this.prefix ? `${this.prefix}:${key}` : key;
    }

    async set(key, value, ttlSeconds = 3600) {
        const serialized = JSON.stringify(value);
        await this.client.setex(this.getKey(key), ttlSeconds, serialized);
    }

    async get(key) {
        const data = await this.client.get(this.getKey(key));
        return data ? JSON.parse(data) : null;
    }

    async delete(key) {
        await this.client.del(this.getKey(key));
    }

    async deletePattern(pattern) {
        const keys = await this.client.keys(this.getKey(pattern));
        if (keys.length > 0) {
            await this.client.del(...keys);
        }
    }

    // Get or set pattern
    async getOrSet(key, fetchFn, ttlSeconds = 3600) {
        const cached = await this.get(key);
        if (cached !== null) {
            return cached;
        }

        const value = await fetchFn();
        await this.set(key, value, ttlSeconds);
        return value;
    }
}

// Usage
const cache = new RedisCache(redis, 'myapp');

// Set cache
await cache.set('user:123', { name: 'John' }, 3600);

// Get cache
const user = await cache.get('user:123');

// Get or fetch
const user = await cache.getOrSet('user:456', async () => {
    return await User.findById(456);
}, 3600);
```

## Cache-Aside Pattern

The most common caching pattern:

```javascript
async function getUserById(userId) {
    const cacheKey = `user:${userId}`;

    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
        return cached;
    }

    // Cache miss - fetch from database
    const user = await User.findById(userId);

    if (user) {
        // Store in cache for future requests
        await cache.set(cacheKey, user, 3600);  // 1 hour TTL
    }

    return user;
}
```

## Write-Through Caching

Update cache when writing to database:

```javascript
async function updateUser(userId, data) {
    // Update database
    const user = await User.findByIdAndUpdate(userId, data, { new: true });

    // Update cache
    const cacheKey = `user:${userId}`;
    await cache.set(cacheKey, user, 3600);

    // Invalidate related caches
    await cache.delete(`userList:page:*`);

    return user;
}

async function createUser(data) {
    // Create in database
    const user = await User.create(data);

    // Add to cache
    await cache.set(`user:${user.id}`, user, 3600);

    // Invalidate list caches
    await cache.deletePattern('userList:*');

    return user;
}
```

## HTTP Response Caching

Cache API responses with middleware:

```javascript
function cacheMiddleware(ttlSeconds = 60) {
    return async (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const cacheKey = `http:${req.originalUrl}`;
        const cached = await cache.get(cacheKey);

        if (cached) {
            // Set header to indicate cache hit
            res.set('X-Cache', 'HIT');
            return res.json(cached);
        }

        // Store original json method
        const originalJson = res.json.bind(res);

        // Override json to cache the response
        res.json = (data) => {
            cache.set(cacheKey, data, ttlSeconds);
            res.set('X-Cache', 'MISS');
            return originalJson(data);
        };

        next();
    };
}

// Usage
app.get('/api/products', cacheMiddleware(300), async (req, res) => {
    const products = await Product.find();
    res.json(products);
});
```

## Cache Invalidation

The hardest part of caching. Here are strategies:

```javascript
class CacheInvalidator {
    constructor(cache) {
        this.cache = cache;
    }

    // Invalidate specific key
    async invalidate(key) {
        await this.cache.delete(key);
    }

    // Invalidate by pattern
    async invalidatePattern(pattern) {
        await this.cache.deletePattern(pattern);
    }

    // Invalidate related caches
    async invalidateUser(userId) {
        await Promise.all([
            this.cache.delete(`user:${userId}`),
            this.cache.delete(`user:${userId}:profile`),
            this.cache.delete(`user:${userId}:settings`),
            this.cache.deletePattern(`userList:*`)
        ]);
    }

    // Invalidate with tags
    async invalidateByTag(tag) {
        // Requires tracking which keys have which tags
        const tagKey = `tag:${tag}`;
        const keys = await this.cache.client.smembers(tagKey);
        if (keys.length > 0) {
            await this.cache.client.del(...keys);
            await this.cache.client.del(tagKey);
        }
    }
}

// Tag-based caching
async function setWithTags(key, value, ttl, tags) {
    await cache.set(key, value, ttl);

    // Track key in tag sets
    for (const tag of tags) {
        await cache.client.sadd(`tag:${tag}`, cache.getKey(key));
    }
}

// Usage
await setWithTags('product:123', product, 3600, ['products', 'category:electronics']);
await invalidator.invalidateByTag('products');  // Clears all product caches
```

## Caching Database Queries

```javascript
function createCachedModel(Model, cacheTTL = 3600) {
    return {
        async findById(id) {
            const cacheKey = `${Model.modelName}:${id}`;
            return cache.getOrSet(cacheKey, () => Model.findById(id), cacheTTL);
        },

        async find(query, options = {}) {
            const cacheKey = `${Model.modelName}:query:${JSON.stringify(query)}:${JSON.stringify(options)}`;
            return cache.getOrSet(
                cacheKey,
                () => Model.find(query).setOptions(options),
                cacheTTL
            );
        },

        async create(data) {
            const doc = await Model.create(data);
            await cache.deletePattern(`${Model.modelName}:query:*`);
            return doc;
        },

        async updateById(id, data) {
            const doc = await Model.findByIdAndUpdate(id, data, { new: true });
            await Promise.all([
                cache.delete(`${Model.modelName}:${id}`),
                cache.deletePattern(`${Model.modelName}:query:*`)
            ]);
            return doc;
        },

        async deleteById(id) {
            await Model.findByIdAndDelete(id);
            await Promise.all([
                cache.delete(`${Model.modelName}:${id}`),
                cache.deletePattern(`${Model.modelName}:query:*`)
            ]);
        }
    };
}

// Usage
const CachedUser = createCachedModel(User, 1800);  // 30 minute cache

const user = await CachedUser.findById('123');
const admins = await CachedUser.find({ role: 'admin' });
```

## Cache Stampede Prevention

When cache expires, many requests can hit the database simultaneously:

```javascript
class StampedeProtectedCache {
    constructor(cache) {
        this.cache = cache;
        this.locks = new Map();
    }

    async getOrSet(key, fetchFn, ttlSeconds) {
        // Check cache first
        const cached = await this.cache.get(key);
        if (cached !== null) {
            return cached;
        }

        // Check if someone else is already fetching
        if (this.locks.has(key)) {
            // Wait for the other request to finish
            return this.locks.get(key);
        }

        // Create a promise for this fetch
        const fetchPromise = (async () => {
            try {
                const value = await fetchFn();
                await this.cache.set(key, value, ttlSeconds);
                return value;
            } finally {
                this.locks.delete(key);
            }
        })();

        this.locks.set(key, fetchPromise);
        return fetchPromise;
    }
}

// With Redis distributed lock
async function getOrSetWithLock(key, fetchFn, ttlSeconds) {
    const cached = await cache.get(key);
    if (cached !== null) return cached;

    const lockKey = `lock:${key}`;
    const lockAcquired = await redis.set(lockKey, '1', 'EX', 10, 'NX');

    if (!lockAcquired) {
        // Wait and retry
        await new Promise(r => setTimeout(r, 100));
        return getOrSetWithLock(key, fetchFn, ttlSeconds);
    }

    try {
        const value = await fetchFn();
        await cache.set(key, value, ttlSeconds);
        return value;
    } finally {
        await redis.del(lockKey);
    }
}
```

## Cache Warming

Pre-populate cache on application start:

```javascript
async function warmCache() {
    console.log('Warming cache...');

    // Cache frequently accessed data
    const popularProducts = await Product.find().sort({ views: -1 }).limit(100);
    for (const product of popularProducts) {
        await cache.set(`product:${product.id}`, product, 7200);
    }

    const categories = await Category.find();
    await cache.set('categories:all', categories, 86400);

    console.log('Cache warmed');
}

// Run on startup
warmCache().catch(console.error);
```

## Summary

Caching is essential for performance. Use in-memory caching for single-server apps and Redis for distributed systems. Implement the cache-aside pattern for reads, write-through for writes, and be thoughtful about cache invalidation. Protect against cache stampedes, consider cache warming for popular data, and always set appropriate TTLs to balance freshness with performance.
