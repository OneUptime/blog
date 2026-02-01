# How to Implement Caching Strategies in Go Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Caching, Redis, In-Memory Cache, Performance

Description: A practical guide to implementing caching in Go applications using in-memory caches, Redis, and cache invalidation strategies.

---

Caching is one of those things that seems straightforward until you actually have to implement it in production. You think you'll just store some data in memory, but then you need to handle expiration, invalidation, distributed systems, and suddenly you're debugging why your users are seeing stale data at 2 AM.

This guide walks through practical caching implementations in Go - from simple in-memory solutions to Redis-backed distributed caches. We'll cover the patterns that actually work in production and the gotchas that'll bite you if you're not careful.

## Why Cache in Go Applications?

Before diving into code, let's be clear about what caching solves:

- **Reduced latency**: Reading from memory takes nanoseconds; reading from a database takes milliseconds
- **Lower database load**: Fewer queries means your database can handle more actual work
- **Cost savings**: Less compute and database connections means smaller infrastructure bills
- **Better user experience**: Faster responses keep users happy

The tradeoff is always complexity and the risk of serving stale data. The patterns below help manage that tradeoff.

## In-Memory Caching with sync.Map

Go's standard library includes `sync.Map`, which provides a thread-safe map implementation. It's perfect for simple caching scenarios where you need concurrent access.

Here's a basic implementation of an in-memory cache using sync.Map with TTL support:

```go
package cache

import (
    "sync"
    "time"
)

// CacheItem holds the cached value along with its expiration time.
// We store the expiration as a Unix timestamp for fast comparison.
type CacheItem struct {
    Value      interface{}
    Expiration int64
}

// InMemoryCache provides a thread-safe cache with TTL support.
// It uses sync.Map under the hood for concurrent access.
type InMemoryCache struct {
    items sync.Map
}

// NewInMemoryCache creates a new cache instance and starts
// a background goroutine to clean up expired items.
func NewInMemoryCache() *InMemoryCache {
    cache := &InMemoryCache{}
    
    // Start cleanup goroutine that runs every minute
    // to remove expired items and free memory
    go cache.startCleanup()
    
    return cache
}

// Set stores a value in the cache with the specified TTL.
// If ttl is 0, the item never expires.
func (c *InMemoryCache) Set(key string, value interface{}, ttl time.Duration) {
    var expiration int64
    
    // Calculate expiration time only if TTL is specified
    if ttl > 0 {
        expiration = time.Now().Add(ttl).UnixNano()
    }
    
    c.items.Store(key, CacheItem{
        Value:      value,
        Expiration: expiration,
    })
}

// Get retrieves a value from the cache.
// Returns the value and true if found and not expired.
// Returns nil and false if not found or expired.
func (c *InMemoryCache) Get(key string) (interface{}, bool) {
    item, found := c.items.Load(key)
    if !found {
        return nil, false
    }
    
    cacheItem := item.(CacheItem)
    
    // Check if item has expired (expiration of 0 means never expires)
    if cacheItem.Expiration > 0 && time.Now().UnixNano() > cacheItem.Expiration {
        // Remove expired item and return not found
        c.items.Delete(key)
        return nil, false
    }
    
    return cacheItem.Value, true
}

// Delete removes an item from the cache.
func (c *InMemoryCache) Delete(key string) {
    c.items.Delete(key)
}

// startCleanup periodically removes expired items from the cache.
// This prevents memory from growing unbounded with expired items.
func (c *InMemoryCache) startCleanup() {
    ticker := time.NewTicker(time.Minute)
    for range ticker.C {
        now := time.Now().UnixNano()
        c.items.Range(func(key, value interface{}) bool {
            item := value.(CacheItem)
            if item.Expiration > 0 && now > item.Expiration {
                c.items.Delete(key)
            }
            return true
        })
    }
}
```

This works great for single-instance applications. The cleanup goroutine prevents memory leaks from expired items piling up.

## Implementing an LRU Cache

When memory is constrained, you need to evict items. Least Recently Used (LRU) eviction removes the items that haven't been accessed in the longest time. Here's an implementation using a doubly-linked list for O(1) operations:

```go
package cache

import (
    "container/list"
    "sync"
)

// LRUCache implements a thread-safe LRU cache with a fixed capacity.
// It uses a map for O(1) lookups and a doubly-linked list for O(1) eviction.
type LRUCache struct {
    capacity int
    items    map[string]*list.Element
    order    *list.List
    mu       sync.RWMutex
}

// entry stores the key-value pair in the linked list.
// We need the key stored here to delete from the map during eviction.
type entry struct {
    key   string
    value interface{}
}

// NewLRUCache creates a new LRU cache with the specified capacity.
// When the cache is full, the least recently used item is evicted.
func NewLRUCache(capacity int) *LRUCache {
    return &LRUCache{
        capacity: capacity,
        items:    make(map[string]*list.Element),
        order:    list.New(),
    }
}

// Get retrieves a value and marks it as recently used.
// Returns the value and true if found, nil and false otherwise.
func (c *LRUCache) Get(key string) (interface{}, bool) {
    c.mu.Lock()
    defer c.mu.Unlock()
    
    element, found := c.items[key]
    if !found {
        return nil, false
    }
    
    // Move to front since this item was just accessed
    c.order.MoveToFront(element)
    
    return element.Value.(*entry).value, true
}

// Set adds or updates a value in the cache.
// If the cache is at capacity, the least recently used item is evicted.
func (c *LRUCache) Set(key string, value interface{}) {
    c.mu.Lock()
    defer c.mu.Unlock()
    
    // If key exists, update value and move to front
    if element, found := c.items[key]; found {
        c.order.MoveToFront(element)
        element.Value.(*entry).value = value
        return
    }
    
    // Evict oldest item if at capacity
    if c.order.Len() >= c.capacity {
        oldest := c.order.Back()
        if oldest != nil {
            c.order.Remove(oldest)
            delete(c.items, oldest.Value.(*entry).key)
        }
    }
    
    // Add new item to front of list
    element := c.order.PushFront(&entry{key: key, value: value})
    c.items[key] = element
}

// Len returns the current number of items in the cache.
func (c *LRUCache) Len() int {
    c.mu.RLock()
    defer c.mu.RUnlock()
    return c.order.Len()
}
```

The combination of a hash map and linked list gives us O(1) for all operations while maintaining eviction order.

## Redis Integration for Distributed Caching

In-memory caches don't work when you have multiple application instances. Each instance would have its own cache, leading to inconsistencies. Redis solves this by providing a shared cache that all instances can access.

Here's a practical Redis cache implementation using the popular go-redis library:

```go
package cache

import (
    "context"
    "encoding/json"
    "time"
    
    "github.com/redis/go-redis/v9"
)

// RedisCache wraps a Redis client to provide caching operations.
// It handles serialization and provides a clean interface for caching.
type RedisCache struct {
    client *redis.Client
    prefix string
}

// NewRedisCache creates a new Redis cache client.
// The prefix is added to all keys to namespace this cache.
func NewRedisCache(addr, password string, db int, prefix string) *RedisCache {
    client := redis.NewClient(&redis.Options{
        Addr:         addr,
        Password:     password,
        DB:           db,
        PoolSize:     10,              // Connection pool size
        MinIdleConns: 5,               // Keep connections ready
        DialTimeout:  5 * time.Second,
        ReadTimeout:  3 * time.Second,
        WriteTimeout: 3 * time.Second,
    })
    
    return &RedisCache{
        client: client,
        prefix: prefix,
    }
}

// Set stores a value in Redis with the specified TTL.
// The value is JSON-encoded for storage.
func (c *RedisCache) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
    // Serialize value to JSON for storage
    data, err := json.Marshal(value)
    if err != nil {
        return err
    }
    
    // Use prefixed key to avoid collisions with other applications
    fullKey := c.prefix + key
    
    return c.client.Set(ctx, fullKey, data, ttl).Err()
}

// Get retrieves a value from Redis and unmarshals it into the target.
// Returns false if the key doesn't exist.
func (c *RedisCache) Get(ctx context.Context, key string, target interface{}) (bool, error) {
    fullKey := c.prefix + key
    
    data, err := c.client.Get(ctx, fullKey).Bytes()
    if err == redis.Nil {
        // Key doesn't exist - not an error, just a cache miss
        return false, nil
    }
    if err != nil {
        return false, err
    }
    
    // Deserialize JSON into the target struct
    if err := json.Unmarshal(data, target); err != nil {
        return false, err
    }
    
    return true, nil
}

// Delete removes a key from Redis.
func (c *RedisCache) Delete(ctx context.Context, key string) error {
    fullKey := c.prefix + key
    return c.client.Del(ctx, fullKey).Err()
}

// DeletePattern removes all keys matching a pattern.
// Useful for invalidating related cache entries.
func (c *RedisCache) DeletePattern(ctx context.Context, pattern string) error {
    fullPattern := c.prefix + pattern
    
    // SCAN is safer than KEYS for production use
    // It doesn't block the Redis server
    var cursor uint64
    for {
        keys, nextCursor, err := c.client.Scan(ctx, cursor, fullPattern, 100).Result()
        if err != nil {
            return err
        }
        
        if len(keys) > 0 {
            if err := c.client.Del(ctx, keys...).Err(); err != nil {
                return err
            }
        }
        
        cursor = nextCursor
        if cursor == 0 {
            break
        }
    }
    
    return nil
}

// Close closes the Redis connection.
func (c *RedisCache) Close() error {
    return c.client.Close()
}
```

Key things to note: we use JSON serialization for flexibility, connection pooling for performance, and SCAN instead of KEYS to avoid blocking Redis.

## The Cache-Aside Pattern

Cache-aside (also called lazy loading) is the most common caching pattern. The application checks the cache first, and if the data isn't there, it loads from the database and populates the cache.

Here's how to implement cache-aside with a repository pattern:

```go
package repository

import (
    "context"
    "database/sql"
    "fmt"
    "time"
)

// User represents a user entity in our system.
type User struct {
    ID        int64
    Email     string
    Name      string
    CreatedAt time.Time
}

// UserRepository handles user data access with caching.
// It implements the cache-aside pattern for read operations.
type UserRepository struct {
    db    *sql.DB
    cache *RedisCache
    ttl   time.Duration
}

// NewUserRepository creates a new repository with caching enabled.
func NewUserRepository(db *sql.DB, cache *RedisCache) *UserRepository {
    return &UserRepository{
        db:    db,
        cache: cache,
        ttl:   15 * time.Minute, // Cache users for 15 minutes
    }
}

// GetByID implements cache-aside pattern:
// 1. Check cache first
// 2. If miss, query database
// 3. Store result in cache
// 4. Return data
func (r *UserRepository) GetByID(ctx context.Context, id int64) (*User, error) {
    cacheKey := fmt.Sprintf("user:%d", id)
    
    // Step 1: Try to get from cache
    var user User
    found, err := r.cache.Get(ctx, cacheKey, &user)
    if err != nil {
        // Log cache error but don't fail - fall through to database
        // Cache errors shouldn't break your application
        fmt.Printf("cache error: %v\n", err)
    }
    
    if found {
        // Cache hit - return cached data
        return &user, nil
    }
    
    // Step 2: Cache miss - query database
    row := r.db.QueryRowContext(ctx,
        "SELECT id, email, name, created_at FROM users WHERE id = $1",
        id,
    )
    
    if err := row.Scan(&user.ID, &user.Email, &user.Name, &user.CreatedAt); err != nil {
        if err == sql.ErrNoRows {
            return nil, nil
        }
        return nil, err
    }
    
    // Step 3: Store in cache for future requests
    if err := r.cache.Set(ctx, cacheKey, &user, r.ttl); err != nil {
        // Log but don't fail - the database query succeeded
        fmt.Printf("failed to cache user: %v\n", err)
    }
    
    return &user, nil
}
```

The key insight here: treat cache failures as non-fatal. Your application should work without the cache - it'll just be slower.

## Write-Through Caching

Write-through updates the cache whenever you write to the database. This keeps the cache fresh but adds latency to writes.

Here's how to add write-through to our repository:

```go
// Update modifies a user and updates the cache (write-through pattern).
// The cache is updated synchronously after the database write succeeds.
func (r *UserRepository) Update(ctx context.Context, user *User) error {
    // Update database first - this is the source of truth
    _, err := r.db.ExecContext(ctx,
        "UPDATE users SET email = $1, name = $2 WHERE id = $3",
        user.Email, user.Name, user.ID,
    )
    if err != nil {
        return err
    }
    
    // Update cache with new data
    // If cache update fails, the data will be refreshed on next read
    cacheKey := fmt.Sprintf("user:%d", user.ID)
    if err := r.cache.Set(ctx, cacheKey, user, r.ttl); err != nil {
        fmt.Printf("failed to update cache: %v\n", err)
    }
    
    return nil
}

// Create adds a new user and populates the cache immediately.
func (r *UserRepository) Create(ctx context.Context, user *User) error {
    // Insert into database and get the generated ID
    err := r.db.QueryRowContext(ctx,
        `INSERT INTO users (email, name, created_at) 
         VALUES ($1, $2, $3) 
         RETURNING id`,
        user.Email, user.Name, time.Now(),
    ).Scan(&user.ID)
    
    if err != nil {
        return err
    }
    
    // Pre-populate cache so first read is fast
    cacheKey := fmt.Sprintf("user:%d", user.ID)
    if err := r.cache.Set(ctx, cacheKey, user, r.ttl); err != nil {
        fmt.Printf("failed to cache new user: %v\n", err)
    }
    
    return nil
}
```

## Cache Invalidation Strategies

Cache invalidation is famously one of the two hard problems in computer science. Here are practical approaches that work:

The simplest approach is deleting the cache entry when data changes:

```go
// Delete removes a user and invalidates the cache.
// We delete from cache before and after the database operation
// to handle race conditions.
func (r *UserRepository) Delete(ctx context.Context, id int64) error {
    cacheKey := fmt.Sprintf("user:%d", id)
    
    // Invalidate cache first to prevent serving stale data
    // during the database operation
    _ = r.cache.Delete(ctx, cacheKey)
    
    // Delete from database
    _, err := r.db.ExecContext(ctx, "DELETE FROM users WHERE id = $1", id)
    if err != nil {
        return err
    }
    
    // Invalidate again in case of race condition where
    // another request cached the data between our first
    // delete and the database delete
    _ = r.cache.Delete(ctx, cacheKey)
    
    return nil
}
```

For related data, you might need to invalidate multiple cache entries using pattern matching:

```go
// InvalidateUserCaches removes all cache entries related to a user.
// This is useful when a change affects multiple cached views of the data.
func (r *UserRepository) InvalidateUserCaches(ctx context.Context, userID int64) error {
    // Invalidate the user's direct cache entry
    _ = r.cache.Delete(ctx, fmt.Sprintf("user:%d", userID))
    
    // Invalidate any list caches that might contain this user
    _ = r.cache.DeletePattern(ctx, "users:list:*")
    
    // Invalidate user-specific aggregations
    _ = r.cache.DeletePattern(ctx, fmt.Sprintf("user:%d:*", userID))
    
    return nil
}
```

## Handling Cache Stampedes

A cache stampede happens when a popular cache entry expires and hundreds of requests simultaneously try to regenerate it. Here's how to prevent it using a mutex:

```go
package cache

import (
    "context"
    "sync"
    "time"
)

// StampedeProtectedCache prevents cache stampedes using single-flight pattern.
// Only one goroutine will regenerate the cache while others wait.
type StampedeProtectedCache struct {
    cache  *RedisCache
    locks  map[string]*sync.Mutex
    lockMu sync.Mutex
}

// GetOrCompute retrieves from cache or computes the value if missing.
// Only one goroutine will compute the value - others will wait.
func (c *StampedeProtectedCache) GetOrCompute(
    ctx context.Context,
    key string,
    target interface{},
    ttl time.Duration,
    compute func() (interface{}, error),
) error {
    // Try cache first
    found, err := c.cache.Get(ctx, key, target)
    if err == nil && found {
        return nil
    }
    
    // Get or create a lock for this specific key
    c.lockMu.Lock()
    lock, exists := c.locks[key]
    if !exists {
        lock = &sync.Mutex{}
        c.locks[key] = lock
    }
    c.lockMu.Unlock()
    
    // Only one goroutine will hold this lock
    lock.Lock()
    defer lock.Unlock()
    
    // Check cache again - another goroutine might have populated it
    found, err = c.cache.Get(ctx, key, target)
    if err == nil && found {
        return nil
    }
    
    // We're the one who needs to compute the value
    value, err := compute()
    if err != nil {
        return err
    }
    
    // Store in cache
    if err := c.cache.Set(ctx, key, value, ttl); err != nil {
        return err
    }
    
    return nil
}
```

## Monitoring Your Cache

You can't improve what you don't measure. Track these metrics:

- **Hit rate**: Percentage of requests served from cache (aim for 80%+)
- **Miss rate**: Requests that had to go to the database
- **Latency**: How long cache operations take
- **Memory usage**: Are you approaching your cache size limits?
- **Eviction rate**: How often items are being evicted

Here's a simple wrapper that tracks hit/miss metrics:

```go
// MetricsCache wraps a cache and tracks hit/miss statistics.
type MetricsCache struct {
    cache    *RedisCache
    hits     int64
    misses   int64
    mu       sync.Mutex
}

// Get retrieves a value and records hit/miss metrics.
func (m *MetricsCache) Get(ctx context.Context, key string, target interface{}) (bool, error) {
    found, err := m.cache.Get(ctx, key, target)
    
    m.mu.Lock()
    if found {
        m.hits++
    } else {
        m.misses++
    }
    m.mu.Unlock()
    
    return found, err
}

// HitRate returns the cache hit rate as a percentage.
func (m *MetricsCache) HitRate() float64 {
    m.mu.Lock()
    defer m.mu.Unlock()
    
    total := m.hits + m.misses
    if total == 0 {
        return 0
    }
    return float64(m.hits) / float64(total) * 100
}
```

## Wrapping Up

Caching in Go doesn't have to be complicated. Start with the cache-aside pattern and in-memory caching for single instances. Move to Redis when you scale horizontally. Always handle cache failures gracefully - your app should work without the cache, just slower.

Remember these principles:

- The database is the source of truth, the cache is just an optimization
- Never trust the cache to always be available or correct
- Measure your hit rates - if they're low, your caching strategy needs work
- When in doubt, invalidate more aggressively rather than serve stale data

The patterns in this guide have been battle-tested in production systems handling millions of requests. Start simple, measure everything, and optimize based on real data.

---

*Monitor cache hit rates and performance with [OneUptime](https://oneuptime.com) - get real-time insights into your application's caching efficiency.*
