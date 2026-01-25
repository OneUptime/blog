# How to Use node-cache for In-Memory Caching

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NodeJS, Caching, Performance, node-cache, Backend

Description: Implement fast in-memory caching in Node.js applications using node-cache with TTL support, automatic cleanup, and practical usage patterns.

---

When you need simple, fast caching without setting up Redis or another external service, node-cache provides an in-memory cache with TTL (Time To Live) support and automatic cleanup. It is perfect for single-server applications or caching data that can be lost on restart.

## Installation and Basic Setup

```bash
npm install node-cache
```

```javascript
const NodeCache = require('node-cache');

// Create cache instance
const cache = new NodeCache({
    stdTTL: 600,        // Default TTL in seconds (10 minutes)
    checkperiod: 120,   // Cleanup interval in seconds
    useClones: true     // Clone objects on get/set (safer but slower)
});

// Basic operations
cache.set('key', 'value');                    // Uses default TTL
cache.set('key2', { data: 'object' }, 3600);  // Custom TTL of 1 hour

const value = cache.get('key');               // Returns undefined if not found
const success = cache.del('key');             // Returns number of deleted keys

// Check if key exists
if (cache.has('key')) {
    console.log('Key exists');
}
```

## Configuration Options

```javascript
const cache = new NodeCache({
    stdTTL: 600,           // Default TTL in seconds
    checkperiod: 120,      // How often to check for expired keys
    useClones: true,       // Return clones instead of references
    deleteOnExpire: true,  // Delete keys when they expire
    maxKeys: 1000          // Maximum number of keys (-1 for unlimited)
});
```

The `useClones` option is important:

```javascript
// With useClones: true (default, safer)
const user = cache.get('user');
user.name = 'Changed';  // Does NOT affect cached value

// With useClones: false (faster, but be careful)
const user = cache.get('user');
user.name = 'Changed';  // DOES affect cached value
```

## Common Usage Patterns

### Get or Set Pattern

```javascript
async function getCachedUser(userId) {
    const cacheKey = `user:${userId}`;

    // Try to get from cache
    let user = cache.get(cacheKey);

    if (user === undefined) {
        // Cache miss - fetch from database
        user = await User.findById(userId);

        if (user) {
            cache.set(cacheKey, user);
        }
    }

    return user;
}
```

### Using getOrSet (node-cache does not have this built-in, so create it)

```javascript
async function getOrSet(key, fetchFn, ttl) {
    let value = cache.get(key);

    if (value === undefined) {
        value = await fetchFn();
        if (value !== undefined && value !== null) {
            cache.set(key, value, ttl);
        }
    }

    return value;
}

// Usage
const user = await getOrSet(
    `user:${userId}`,
    () => User.findById(userId),
    3600
);
```

### Batch Operations

```javascript
// Set multiple keys
cache.mset([
    { key: 'key1', val: 'value1', ttl: 600 },
    { key: 'key2', val: 'value2', ttl: 600 },
    { key: 'key3', val: 'value3' }  // Uses default TTL
]);

// Get multiple keys
const values = cache.mget(['key1', 'key2', 'key3']);
// Returns: { key1: 'value1', key2: 'value2', key3: 'value3' }

// Delete multiple keys
cache.del(['key1', 'key2', 'key3']);
```

### TTL Management

```javascript
// Get remaining TTL for a key
const ttl = cache.getTtl('key');
// Returns timestamp when key expires, or undefined if key does not exist

// Check if TTL is valid
if (ttl && ttl > Date.now()) {
    const remainingSeconds = (ttl - Date.now()) / 1000;
    console.log(`Key expires in ${remainingSeconds} seconds`);
}

// Reset TTL for existing key
cache.ttl('key', 3600);  // Reset to 1 hour

// Remove TTL (key never expires)
cache.ttl('key', 0);
```

## Event Handling

```javascript
// Key expired
cache.on('expired', (key, value) => {
    console.log(`Key expired: ${key}`);
    // Could trigger refresh here
});

// Key deleted
cache.on('del', (key, value) => {
    console.log(`Key deleted: ${key}`);
});

// Key set
cache.on('set', (key, value) => {
    console.log(`Key set: ${key}`);
});

// Cache flushed
cache.on('flush', () => {
    console.log('Cache flushed');
});
```

## Express.js Middleware

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 300 });

function cacheMiddleware(duration) {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const key = `__express__${req.originalUrl}`;
        const cachedResponse = cache.get(key);

        if (cachedResponse) {
            res.set('X-Cache', 'HIT');
            return res.json(cachedResponse);
        }

        // Store original json method
        const originalJson = res.json.bind(res);

        res.json = (body) => {
            cache.set(key, body, duration);
            res.set('X-Cache', 'MISS');
            return originalJson(body);
        };

        next();
    };
}

// Usage
app.get('/api/products', cacheMiddleware(300), async (req, res) => {
    const products = await Product.find();
    res.json(products);
});

// Clear cache endpoint
app.post('/api/cache/clear', (req, res) => {
    cache.flushAll();
    res.json({ message: 'Cache cleared' });
});
```

## Cache with Namespace

Organize cache keys by feature:

```javascript
class NamespacedCache {
    constructor(namespace, options = {}) {
        this.namespace = namespace;
        this.cache = new NodeCache(options);
    }

    key(key) {
        return `${this.namespace}:${key}`;
    }

    get(key) {
        return this.cache.get(this.key(key));
    }

    set(key, value, ttl) {
        return this.cache.set(this.key(key), value, ttl);
    }

    del(key) {
        return this.cache.del(this.key(key));
    }

    // Delete all keys in this namespace
    flush() {
        const keys = this.cache.keys();
        const namespaceKeys = keys.filter(k => k.startsWith(`${this.namespace}:`));
        return this.cache.del(namespaceKeys);
    }

    has(key) {
        return this.cache.has(this.key(key));
    }
}

// Usage
const userCache = new NamespacedCache('users', { stdTTL: 3600 });
const productCache = new NamespacedCache('products', { stdTTL: 600 });

userCache.set('123', { name: 'John' });
productCache.set('456', { title: 'Widget' });

// Clear only user cache
userCache.flush();
```

## Stats and Monitoring

```javascript
// Get cache statistics
const stats = cache.getStats();
console.log(stats);
// {
//   hits: 100,
//   misses: 20,
//   keys: 50,
//   ksize: 500,    // Approximate key size
//   vsize: 10000   // Approximate value size
// }

// Get all keys
const keys = cache.keys();
console.log(`Cache has ${keys.length} keys`);

// Get cache size (approximate)
function getCacheSize() {
    const stats = cache.getStats();
    return {
        keys: stats.keys,
        hitRate: stats.hits / (stats.hits + stats.misses) * 100,
        memorySizeApprox: stats.ksize + stats.vsize
    };
}
```

## Cache Wrapper Service

Complete caching service for your application:

```javascript
const NodeCache = require('node-cache');

class CacheService {
    constructor() {
        this.cache = new NodeCache({
            stdTTL: 600,
            checkperiod: 120,
            useClones: true
        });

        this.setupEvents();
    }

    setupEvents() {
        this.cache.on('expired', (key, value) => {
            console.log(`Cache expired: ${key}`);
        });
    }

    get(key) {
        return this.cache.get(key);
    }

    set(key, value, ttl) {
        return this.cache.set(key, value, ttl);
    }

    del(key) {
        return this.cache.del(key);
    }

    async getOrSet(key, fetchFn, ttl) {
        let value = this.cache.get(key);

        if (value === undefined) {
            value = await fetchFn();
            if (value !== undefined && value !== null) {
                this.cache.set(key, value, ttl);
            }
        }

        return value;
    }

    invalidate(pattern) {
        const keys = this.cache.keys();
        const matchingKeys = keys.filter(k => k.includes(pattern));
        return this.cache.del(matchingKeys);
    }

    flush() {
        this.cache.flushAll();
    }

    stats() {
        return this.cache.getStats();
    }
}

// Singleton instance
module.exports = new CacheService();
```

## Limitations

node-cache is great for:
- Single server applications
- Data that can be regenerated on restart
- Simple caching needs

But consider Redis when you need:
- Caching across multiple servers
- Cache persistence across restarts
- Advanced data structures (lists, sets, sorted sets)
- Pub/sub for cache invalidation

## Summary

node-cache provides simple, fast in-memory caching for Node.js applications. It handles TTL and automatic cleanup, works well for single-server deployments, and requires no external dependencies. Use the get-or-set pattern for clean code, leverage events for cache monitoring, and wrap it in a service class for consistent usage throughout your application.
