# How to Use Redis in Go with go-redis

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Redis, Caching, Performance, Distributed Systems

Description: Master Redis in Go using go-redis library for caching, pub/sub messaging, distributed locks, and efficient connection pooling.

---

Redis is an in-memory data structure store that has become essential for building high-performance applications. Whether you need caching, real-time messaging, session management, or distributed locks, Redis provides the speed and reliability that modern applications demand. In this guide, we will explore how to effectively use Redis in Go applications using the go-redis library, covering everything from basic operations to advanced patterns.

## Prerequisites

Before we begin, make sure you have:

- Go 1.18 or later installed
- Redis server running locally or accessible remotely
- Basic understanding of Go programming

## Installing go-redis

The go-redis library is the most popular Redis client for Go, offering a type-safe API, automatic connection pooling, and support for Redis Cluster and Sentinel.

```bash
# Initialize your Go module if you haven't already
go mod init your-project-name

# Install the go-redis package
go get github.com/redis/go-redis/v9
```

## Connecting to Redis

Let's start by establishing a connection to Redis. The go-redis library provides several ways to connect depending on your setup.

### Basic Connection

This example shows the simplest way to connect to a local Redis instance with default settings.

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/redis/go-redis/v9"
)

func main() {
    // Create a new Redis client with basic options
    // Addr specifies the Redis server address
    // Password is empty for no authentication
    // DB selects the database number (0-15)
    rdb := redis.NewClient(&redis.Options{
        Addr:     "localhost:6379",
        Password: "",
        DB:       0,
    })

    // Create a context for Redis operations
    ctx := context.Background()

    // Test the connection using Ping
    pong, err := rdb.Ping(ctx).Result()
    if err != nil {
        log.Fatalf("Failed to connect to Redis: %v", err)
    }
    fmt.Printf("Connected to Redis: %s\n", pong)

    // Always close the connection when done
    defer rdb.Close()
}
```

### Connection with Full Options

For production environments, you'll want more control over connection behavior including timeouts and retry logic.

```go
package main

import (
    "context"
    "crypto/tls"
    "time"

    "github.com/redis/go-redis/v9"
)

func NewRedisClient() *redis.Client {
    // Configure the client with production-ready settings
    rdb := redis.NewClient(&redis.Options{
        // Server address and credentials
        Addr:     "localhost:6379",
        Password: "your-secure-password",
        DB:       0,

        // Connection pool settings
        PoolSize:     10,              // Maximum number of connections
        MinIdleConns: 5,               // Minimum idle connections to maintain
        PoolTimeout:  30 * time.Second, // Time to wait for a connection from pool

        // Timeouts for various operations
        DialTimeout:  5 * time.Second,  // Timeout for establishing new connections
        ReadTimeout:  3 * time.Second,  // Timeout for read operations
        WriteTimeout: 3 * time.Second,  // Timeout for write operations

        // Retry configuration
        MaxRetries:      3,                      // Maximum number of retries
        MinRetryBackoff: 8 * time.Millisecond,   // Minimum backoff between retries
        MaxRetryBackoff: 512 * time.Millisecond, // Maximum backoff between retries

        // TLS configuration for secure connections (optional)
        TLSConfig: &tls.Config{
            MinVersion: tls.VersionTLS12,
        },
    })

    return rdb
}
```

### Connecting to Redis Cluster

For high-availability setups using Redis Cluster, use the ClusterClient.

```go
package main

import (
    "time"

    "github.com/redis/go-redis/v9"
)

func NewRedisClusterClient() *redis.ClusterClient {
    // Create a cluster client that connects to multiple nodes
    // The client automatically handles slot distribution and failover
    rdb := redis.NewClusterClient(&redis.ClusterOptions{
        Addrs: []string{
            "node1:6379",
            "node2:6379",
            "node3:6379",
        },
        Password: "your-cluster-password",

        // Pool settings apply per-node
        PoolSize:     10,
        MinIdleConns: 5,

        // Timeouts
        DialTimeout:  5 * time.Second,
        ReadTimeout:  3 * time.Second,
        WriteTimeout: 3 * time.Second,

        // Enable read replicas for read operations
        ReadOnly: true,

        // Route read commands to replicas
        RouteRandomly: true,
    })

    return rdb
}
```

## Basic Redis Operations

Now let's explore the fundamental Redis operations including strings, hashes, lists, and sets.

### String Operations

Strings are the most basic Redis data type. They can store text, numbers, or binary data up to 512MB.

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/redis/go-redis/v9"
)

func stringOperations(rdb *redis.Client, ctx context.Context) {
    // SET: Store a simple string value
    // The third parameter (0) means no expiration
    err := rdb.Set(ctx, "greeting", "Hello, Redis!", 0).Err()
    if err != nil {
        log.Printf("SET error: %v", err)
    }

    // GET: Retrieve the stored value
    val, err := rdb.Get(ctx, "greeting").Result()
    if err == redis.Nil {
        fmt.Println("Key does not exist")
    } else if err != nil {
        log.Printf("GET error: %v", err)
    } else {
        fmt.Printf("greeting = %s\n", val)
    }

    // SETEX: Set a value with expiration (in seconds)
    // This is useful for temporary data like sessions
    err = rdb.SetEx(ctx, "session:abc123", "user_data", 1*time.Hour).Err()
    if err != nil {
        log.Printf("SETEX error: %v", err)
    }

    // SETNX: Set only if the key doesn't exist
    // Returns true if the key was set, false if it already existed
    wasSet, err := rdb.SetNX(ctx, "unique_key", "value", 0).Result()
    if err != nil {
        log.Printf("SETNX error: %v", err)
    }
    fmt.Printf("Key was set: %v\n", wasSet)

    // INCR/DECR: Atomic counter operations
    // Perfect for rate limiting, view counts, etc.
    rdb.Set(ctx, "counter", "10", 0)

    newVal, _ := rdb.Incr(ctx, "counter").Result()
    fmt.Printf("After INCR: %d\n", newVal) // 11

    newVal, _ = rdb.IncrBy(ctx, "counter", 5).Result()
    fmt.Printf("After INCRBY 5: %d\n", newVal) // 16

    newVal, _ = rdb.Decr(ctx, "counter").Result()
    fmt.Printf("After DECR: %d\n", newVal) // 15

    // MSET/MGET: Set and get multiple keys at once
    // More efficient than individual SET/GET commands
    err = rdb.MSet(ctx, "key1", "value1", "key2", "value2", "key3", "value3").Err()
    if err != nil {
        log.Printf("MSET error: %v", err)
    }

    values, _ := rdb.MGet(ctx, "key1", "key2", "key3").Result()
    for i, v := range values {
        fmt.Printf("key%d = %v\n", i+1, v)
    }

    // APPEND: Append to an existing string
    rdb.Set(ctx, "message", "Hello", 0)
    rdb.Append(ctx, "message", " World!")
    msg, _ := rdb.Get(ctx, "message").Result()
    fmt.Printf("Appended message: %s\n", msg) // "Hello World!"
}
```

### Hash Operations

Hashes are maps of field-value pairs, perfect for storing objects like user profiles or product details.

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/redis/go-redis/v9"
)

func hashOperations(rdb *redis.Client, ctx context.Context) {
    // HSET: Set fields in a hash
    // Useful for storing structured data like user profiles
    err := rdb.HSet(ctx, "user:1001", map[string]interface{}{
        "name":     "John Doe",
        "email":    "john@example.com",
        "age":      30,
        "verified": true,
    }).Err()
    if err != nil {
        log.Printf("HSET error: %v", err)
    }

    // HGET: Get a single field from the hash
    name, err := rdb.HGet(ctx, "user:1001", "name").Result()
    if err != nil {
        log.Printf("HGET error: %v", err)
    }
    fmt.Printf("User name: %s\n", name)

    // HMGET: Get multiple fields at once
    fields, _ := rdb.HMGet(ctx, "user:1001", "name", "email", "age").Result()
    fmt.Printf("User details: %v\n", fields)

    // HGETALL: Get all fields and values
    // Returns a map[string]string
    allFields, _ := rdb.HGetAll(ctx, "user:1001").Result()
    for field, value := range allFields {
        fmt.Printf("%s: %s\n", field, value)
    }

    // HINCRBY: Increment a numeric field in the hash
    newAge, _ := rdb.HIncrBy(ctx, "user:1001", "age", 1).Result()
    fmt.Printf("New age: %d\n", newAge)

    // HDEL: Delete specific fields from the hash
    rdb.HDel(ctx, "user:1001", "verified")

    // HEXISTS: Check if a field exists in the hash
    exists, _ := rdb.HExists(ctx, "user:1001", "email").Result()
    fmt.Printf("Email field exists: %v\n", exists)

    // HKEYS and HVALS: Get all keys or values
    keys, _ := rdb.HKeys(ctx, "user:1001").Result()
    fmt.Printf("Hash keys: %v\n", keys)

    vals, _ := rdb.HVals(ctx, "user:1001").Result()
    fmt.Printf("Hash values: %v\n", vals)

    // HSETNX: Set field only if it doesn't exist
    wasSet, _ := rdb.HSetNX(ctx, "user:1001", "created_at", "2024-01-15").Result()
    fmt.Printf("Created_at was set: %v\n", wasSet)
}
```

### List Operations

Lists are ordered collections of strings, useful for queues, feeds, and maintaining order.

```go
package main

import (
    "context"
    "fmt"
    "time"

    "github.com/redis/go-redis/v9"
)

func listOperations(rdb *redis.Client, ctx context.Context) {
    // RPUSH: Add elements to the right (end) of the list
    // Commonly used for queue operations
    rdb.RPush(ctx, "tasks", "task1", "task2", "task3")

    // LPUSH: Add elements to the left (beginning) of the list
    // Makes this element the first in the list
    rdb.LPush(ctx, "tasks", "urgent_task")

    // LRANGE: Get a range of elements (0 to -1 means all elements)
    tasks, _ := rdb.LRange(ctx, "tasks", 0, -1).Result()
    fmt.Printf("All tasks: %v\n", tasks)

    // LPOP: Remove and return the first element (FIFO queue)
    first, _ := rdb.LPop(ctx, "tasks").Result()
    fmt.Printf("Popped from left: %s\n", first)

    // RPOP: Remove and return the last element (LIFO stack)
    last, _ := rdb.RPop(ctx, "tasks").Result()
    fmt.Printf("Popped from right: %s\n", last)

    // LLEN: Get the length of the list
    length, _ := rdb.LLen(ctx, "tasks").Result()
    fmt.Printf("Remaining tasks: %d\n", length)

    // LINDEX: Get element at a specific index
    second, _ := rdb.LIndex(ctx, "tasks", 1).Result()
    fmt.Printf("Second task: %s\n", second)

    // LSET: Set element at a specific index
    rdb.LSet(ctx, "tasks", 0, "updated_task")

    // LINSERT: Insert element before or after a pivot
    rdb.LInsertBefore(ctx, "tasks", "task2", "new_task")

    // LTRIM: Trim list to keep only specified range
    // Useful for maintaining fixed-size lists (e.g., recent activity)
    rdb.LTrim(ctx, "recent_activity", 0, 99) // Keep only last 100 items

    // BLPOP: Blocking pop - waits for elements if list is empty
    // Excellent for building worker queues
    result, err := rdb.BLPop(ctx, 5*time.Second, "job_queue").Result()
    if err == redis.Nil {
        fmt.Println("No jobs available within timeout")
    } else if err != nil {
        fmt.Printf("BLPOP error: %v\n", err)
    } else {
        fmt.Printf("Got job from %s: %s\n", result[0], result[1])
    }

    // LPOS: Find the index of an element
    pos, _ := rdb.LPos(ctx, "tasks", "task2", redis.LPosArgs{}).Result()
    fmt.Printf("Position of task2: %d\n", pos)
}
```

### Set Operations

Sets are unordered collections of unique strings, ideal for tags, unique visitors, and membership checks.

```go
package main

import (
    "context"
    "fmt"

    "github.com/redis/go-redis/v9"
)

func setOperations(rdb *redis.Client, ctx context.Context) {
    // SADD: Add members to a set
    // Duplicates are automatically ignored
    rdb.SAdd(ctx, "user:1001:skills", "go", "python", "redis", "kubernetes")
    rdb.SAdd(ctx, "user:1002:skills", "go", "javascript", "docker", "redis")

    // SMEMBERS: Get all members of a set
    skills, _ := rdb.SMembers(ctx, "user:1001:skills").Result()
    fmt.Printf("User 1001 skills: %v\n", skills)

    // SISMEMBER: Check if a value is in the set
    hasGo, _ := rdb.SIsMember(ctx, "user:1001:skills", "go").Result()
    fmt.Printf("User knows Go: %v\n", hasGo)

    // SCARD: Get the number of members in a set
    count, _ := rdb.SCard(ctx, "user:1001:skills").Result()
    fmt.Printf("Number of skills: %d\n", count)

    // SINTER: Get intersection of multiple sets
    // Find skills that both users have
    commonSkills, _ := rdb.SInter(ctx, "user:1001:skills", "user:1002:skills").Result()
    fmt.Printf("Common skills: %v\n", commonSkills)

    // SUNION: Get union of multiple sets
    // Find all unique skills across users
    allSkills, _ := rdb.SUnion(ctx, "user:1001:skills", "user:1002:skills").Result()
    fmt.Printf("All skills: %v\n", allSkills)

    // SDIFF: Get difference between sets
    // Skills user 1001 has that user 1002 doesn't
    uniqueSkills, _ := rdb.SDiff(ctx, "user:1001:skills", "user:1002:skills").Result()
    fmt.Printf("Unique to user 1001: %v\n", uniqueSkills)

    // SREM: Remove members from a set
    rdb.SRem(ctx, "user:1001:skills", "python")

    // SPOP: Remove and return a random member
    randomSkill, _ := rdb.SPop(ctx, "user:1001:skills").Result()
    fmt.Printf("Random skill removed: %s\n", randomSkill)

    // SRANDMEMBER: Get random member(s) without removing
    randomMembers, _ := rdb.SRandMemberN(ctx, "user:1002:skills", 2).Result()
    fmt.Printf("Random skills: %v\n", randomMembers)

    // SMOVE: Move a member from one set to another
    rdb.SMove(ctx, "user:1001:skills", "user:1002:skills", "kubernetes")
}
```

### Sorted Set Operations

Sorted sets maintain elements with scores, enabling ranked data like leaderboards.

```go
package main

import (
    "context"
    "fmt"

    "github.com/redis/go-redis/v9"
)

func sortedSetOperations(rdb *redis.Client, ctx context.Context) {
    // ZADD: Add members with scores to a sorted set
    // Perfect for leaderboards and ranking systems
    rdb.ZAdd(ctx, "leaderboard",
        redis.Z{Score: 1500, Member: "player1"},
        redis.Z{Score: 2300, Member: "player2"},
        redis.Z{Score: 1800, Member: "player3"},
        redis.Z{Score: 2100, Member: "player4"},
    )

    // ZRANGE: Get members by rank (lowest to highest score)
    players, _ := rdb.ZRange(ctx, "leaderboard", 0, -1).Result()
    fmt.Printf("Players by rank: %v\n", players)

    // ZREVRANGE: Get members by rank (highest to lowest score)
    topPlayers, _ := rdb.ZRevRange(ctx, "leaderboard", 0, 2).Result()
    fmt.Printf("Top 3 players: %v\n", topPlayers)

    // ZRANGEWITHSCORES: Get members with their scores
    playersWithScores, _ := rdb.ZRangeWithScores(ctx, "leaderboard", 0, -1).Result()
    for _, z := range playersWithScores {
        fmt.Printf("%s: %.0f points\n", z.Member, z.Score)
    }

    // ZSCORE: Get the score of a specific member
    score, _ := rdb.ZScore(ctx, "leaderboard", "player2").Result()
    fmt.Printf("Player2 score: %.0f\n", score)

    // ZRANK: Get the rank of a member (0-based, lowest score = 0)
    rank, _ := rdb.ZRank(ctx, "leaderboard", "player2").Result()
    fmt.Printf("Player2 rank (from bottom): %d\n", rank)

    // ZREVRANK: Get the rank from highest score
    revRank, _ := rdb.ZRevRank(ctx, "leaderboard", "player2").Result()
    fmt.Printf("Player2 rank (from top): %d\n", revRank)

    // ZINCRBY: Increment a member's score
    newScore, _ := rdb.ZIncrBy(ctx, "leaderboard", 100, "player1").Result()
    fmt.Printf("Player1 new score: %.0f\n", newScore)

    // ZRANGEBYSCORE: Get members within a score range
    midTier, _ := rdb.ZRangeByScore(ctx, "leaderboard", &redis.ZRangeBy{
        Min: "1500",
        Max: "2000",
    }).Result()
    fmt.Printf("Players with 1500-2000 points: %v\n", midTier)

    // ZCOUNT: Count members within a score range
    count, _ := rdb.ZCount(ctx, "leaderboard", "1500", "2000").Result()
    fmt.Printf("Count of players in range: %d\n", count)

    // ZREM: Remove members from the sorted set
    rdb.ZRem(ctx, "leaderboard", "player4")

    // ZCARD: Get the number of members
    total, _ := rdb.ZCard(ctx, "leaderboard").Result()
    fmt.Printf("Total players: %d\n", total)
}
```

## Caching Patterns with TTL

Implementing effective caching strategies is crucial for application performance. Here are common patterns using go-redis.

### Cache-Aside Pattern

The most common caching pattern where the application manages both cache and database.

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "time"

    "github.com/redis/go-redis/v9"
)

type User struct {
    ID        int    `json:"id"`
    Name      string `json:"name"`
    Email     string `json:"email"`
    CreatedAt string `json:"created_at"`
}

type UserService struct {
    redis *redis.Client
    // db    *sql.DB // Your database connection
}

// GetUser implements cache-aside pattern
// 1. Check cache first
// 2. If cache miss, fetch from database
// 3. Store in cache for future requests
func (s *UserService) GetUser(ctx context.Context, userID int) (*User, error) {
    cacheKey := fmt.Sprintf("user:%d", userID)

    // Step 1: Try to get from cache
    cached, err := s.redis.Get(ctx, cacheKey).Result()
    if err == nil {
        // Cache hit - unmarshal and return
        var user User
        if err := json.Unmarshal([]byte(cached), &user); err == nil {
            log.Printf("Cache HIT for user %d", userID)
            return &user, nil
        }
    }

    log.Printf("Cache MISS for user %d", userID)

    // Step 2: Cache miss - fetch from database
    user, err := s.fetchUserFromDB(userID)
    if err != nil {
        return nil, fmt.Errorf("database error: %w", err)
    }

    // Step 3: Store in cache with TTL
    userData, _ := json.Marshal(user)
    err = s.redis.Set(ctx, cacheKey, userData, 15*time.Minute).Err()
    if err != nil {
        // Log but don't fail - cache is an optimization
        log.Printf("Failed to cache user %d: %v", userID, err)
    }

    return user, nil
}

// UpdateUser updates user and invalidates cache
func (s *UserService) UpdateUser(ctx context.Context, user *User) error {
    // Update database first
    err := s.updateUserInDB(user)
    if err != nil {
        return err
    }

    // Invalidate cache after successful update
    cacheKey := fmt.Sprintf("user:%d", user.ID)
    s.redis.Del(ctx, cacheKey)

    return nil
}

// Simulated database functions
func (s *UserService) fetchUserFromDB(userID int) (*User, error) {
    // In real application, query your database
    return &User{
        ID:        userID,
        Name:      "John Doe",
        Email:     "john@example.com",
        CreatedAt: "2024-01-15",
    }, nil
}

func (s *UserService) updateUserInDB(user *User) error {
    // In real application, update your database
    return nil
}
```

### Write-Through Cache

Updates cache immediately when data is written, ensuring cache consistency.

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "time"

    "github.com/redis/go-redis/v9"
)

type Product struct {
    ID    int     `json:"id"`
    Name  string  `json:"name"`
    Price float64 `json:"price"`
    Stock int     `json:"stock"`
}

type ProductService struct {
    redis *redis.Client
}

// SaveProduct implements write-through caching
// Data is written to both cache and database simultaneously
func (s *ProductService) SaveProduct(ctx context.Context, product *Product) error {
    cacheKey := fmt.Sprintf("product:%d", product.ID)

    // Serialize product for caching
    data, err := json.Marshal(product)
    if err != nil {
        return fmt.Errorf("serialization error: %w", err)
    }

    // Use a transaction to ensure both operations succeed
    // In production, you might use a saga pattern for true consistency
    pipe := s.redis.TxPipeline()

    // Write to cache with TTL
    pipe.Set(ctx, cacheKey, data, 1*time.Hour)

    // Execute the pipeline
    _, err = pipe.Exec(ctx)
    if err != nil {
        return fmt.Errorf("cache write failed: %w", err)
    }

    // Write to database
    // In real app: s.db.SaveProduct(product)

    return nil
}

// GetProduct retrieves product, cache is always fresh due to write-through
func (s *ProductService) GetProduct(ctx context.Context, productID int) (*Product, error) {
    cacheKey := fmt.Sprintf("product:%d", productID)

    data, err := s.redis.Get(ctx, cacheKey).Result()
    if err == redis.Nil {
        // Cache miss - this shouldn't happen often with write-through
        // Fall back to database
        return s.fetchFromDB(productID)
    } else if err != nil {
        return nil, err
    }

    var product Product
    if err := json.Unmarshal([]byte(data), &product); err != nil {
        return nil, err
    }

    return &product, nil
}

func (s *ProductService) fetchFromDB(productID int) (*Product, error) {
    // Simulated database fetch
    return &Product{ID: productID, Name: "Sample", Price: 99.99, Stock: 100}, nil
}
```

### Cache with Refresh-Ahead

Proactively refreshes cache before expiration to avoid cache misses.

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "time"

    "github.com/redis/go-redis/v9"
)

type CacheEntry struct {
    Data       json.RawMessage `json:"data"`
    ExpiresAt  int64           `json:"expires_at"`
    RefreshAt  int64           `json:"refresh_at"`
}

type RefreshAheadCache struct {
    redis        *redis.Client
    ttl          time.Duration
    refreshRatio float64 // When to trigger refresh (e.g., 0.8 = at 80% of TTL)
}

func NewRefreshAheadCache(rdb *redis.Client) *RefreshAheadCache {
    return &RefreshAheadCache{
        redis:        rdb,
        ttl:          10 * time.Minute,
        refreshRatio: 0.8,
    }
}

// Get retrieves data and triggers background refresh if needed
func (c *RefreshAheadCache) Get(ctx context.Context, key string, fetcher func() (interface{}, error)) ([]byte, error) {
    data, err := c.redis.Get(ctx, key).Result()
    if err == redis.Nil {
        // Cache miss - fetch and store
        return c.fetchAndStore(ctx, key, fetcher)
    } else if err != nil {
        return nil, err
    }

    var entry CacheEntry
    if err := json.Unmarshal([]byte(data), &entry); err != nil {
        return c.fetchAndStore(ctx, key, fetcher)
    }

    now := time.Now().Unix()

    // Check if we should refresh (but still return current data)
    if now >= entry.RefreshAt && now < entry.ExpiresAt {
        // Trigger background refresh
        go func() {
            bgCtx := context.Background()
            _, err := c.fetchAndStore(bgCtx, key, fetcher)
            if err != nil {
                log.Printf("Background refresh failed for %s: %v", key, err)
            }
        }()
    }

    return entry.Data, nil
}

func (c *RefreshAheadCache) fetchAndStore(ctx context.Context, key string, fetcher func() (interface{}, error)) ([]byte, error) {
    // Fetch fresh data
    result, err := fetcher()
    if err != nil {
        return nil, err
    }

    data, err := json.Marshal(result)
    if err != nil {
        return nil, err
    }

    now := time.Now()
    entry := CacheEntry{
        Data:      data,
        ExpiresAt: now.Add(c.ttl).Unix(),
        RefreshAt: now.Add(time.Duration(float64(c.ttl) * c.refreshRatio)).Unix(),
    }

    entryData, _ := json.Marshal(entry)
    c.redis.Set(ctx, key, entryData, c.ttl)

    return data, nil
}
```

## Pub/Sub Implementation

Redis Pub/Sub enables real-time messaging between application components. It's perfect for notifications, live updates, and event-driven architectures.

### Publisher

This example shows how to publish messages to Redis channels.

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "time"

    "github.com/redis/go-redis/v9"
)

type Event struct {
    Type      string    `json:"type"`
    Payload   string    `json:"payload"`
    Timestamp time.Time `json:"timestamp"`
}

type EventPublisher struct {
    redis *redis.Client
}

func NewEventPublisher(rdb *redis.Client) *EventPublisher {
    return &EventPublisher{redis: rdb}
}

// Publish sends an event to a channel
func (p *EventPublisher) Publish(ctx context.Context, channel string, event Event) error {
    // Serialize the event to JSON
    data, err := json.Marshal(event)
    if err != nil {
        return fmt.Errorf("failed to marshal event: %w", err)
    }

    // Publish to the channel
    // Returns the number of subscribers that received the message
    subscribers, err := p.redis.Publish(ctx, channel, data).Result()
    if err != nil {
        return fmt.Errorf("failed to publish: %w", err)
    }

    log.Printf("Published to %s, received by %d subscribers", channel, subscribers)
    return nil
}

// PublishUserEvent publishes user-related events
func (p *EventPublisher) PublishUserEvent(ctx context.Context, eventType, userID string) error {
    event := Event{
        Type:      eventType,
        Payload:   fmt.Sprintf(`{"user_id": "%s"}`, userID),
        Timestamp: time.Now(),
    }

    return p.Publish(ctx, "user:events", event)
}

// PublishToPattern publishes to pattern-matched channels
func (p *EventPublisher) PublishOrderUpdate(ctx context.Context, orderID string, status string) error {
    event := Event{
        Type:      "order_update",
        Payload:   fmt.Sprintf(`{"order_id": "%s", "status": "%s"}`, orderID, status),
        Timestamp: time.Now(),
    }

    // Publish to order-specific channel
    channel := fmt.Sprintf("orders:%s", orderID)
    return p.Publish(ctx, channel, event)
}

func main() {
    rdb := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })
    defer rdb.Close()

    ctx := context.Background()
    publisher := NewEventPublisher(rdb)

    // Publish some events
    publisher.PublishUserEvent(ctx, "user_login", "user123")
    publisher.PublishOrderUpdate(ctx, "order456", "shipped")
}
```

### Subscriber

This example demonstrates subscribing to channels and processing messages.

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "os"
    "os/signal"
    "syscall"

    "github.com/redis/go-redis/v9"
)

type Event struct {
    Type      string `json:"type"`
    Payload   string `json:"payload"`
    Timestamp string `json:"timestamp"`
}

type EventSubscriber struct {
    redis    *redis.Client
    handlers map[string]func(Event)
}

func NewEventSubscriber(rdb *redis.Client) *EventSubscriber {
    return &EventSubscriber{
        redis:    rdb,
        handlers: make(map[string]func(Event)),
    }
}

// RegisterHandler registers a handler for a specific event type
func (s *EventSubscriber) RegisterHandler(eventType string, handler func(Event)) {
    s.handlers[eventType] = handler
}

// Subscribe starts listening to specified channels
func (s *EventSubscriber) Subscribe(ctx context.Context, channels ...string) error {
    // Create a pubsub client
    pubsub := s.redis.Subscribe(ctx, channels...)
    defer pubsub.Close()

    // Wait for confirmation that subscription is created
    _, err := pubsub.Receive(ctx)
    if err != nil {
        return fmt.Errorf("failed to subscribe: %w", err)
    }

    log.Printf("Subscribed to channels: %v", channels)

    // Get message channel
    ch := pubsub.Channel()

    // Process messages
    for msg := range ch {
        s.processMessage(msg)
    }

    return nil
}

// SubscribePattern subscribes to channels matching a pattern
func (s *EventSubscriber) SubscribePattern(ctx context.Context, patterns ...string) error {
    // PSubscribe allows pattern matching with wildcards
    // e.g., "orders:*" matches "orders:123", "orders:456", etc.
    pubsub := s.redis.PSubscribe(ctx, patterns...)
    defer pubsub.Close()

    _, err := pubsub.Receive(ctx)
    if err != nil {
        return fmt.Errorf("failed to subscribe to pattern: %w", err)
    }

    log.Printf("Subscribed to patterns: %v", patterns)

    ch := pubsub.Channel()

    for msg := range ch {
        log.Printf("Received on pattern %s (channel: %s)", msg.Pattern, msg.Channel)
        s.processMessage(msg)
    }

    return nil
}

func (s *EventSubscriber) processMessage(msg *redis.Message) {
    var event Event
    if err := json.Unmarshal([]byte(msg.Payload), &event); err != nil {
        log.Printf("Failed to unmarshal event: %v", err)
        return
    }

    log.Printf("Received event: %s from channel: %s", event.Type, msg.Channel)

    // Call registered handler if exists
    if handler, ok := s.handlers[event.Type]; ok {
        handler(event)
    } else {
        log.Printf("No handler registered for event type: %s", event.Type)
    }
}

func main() {
    rdb := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })
    defer rdb.Close()

    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    subscriber := NewEventSubscriber(rdb)

    // Register event handlers
    subscriber.RegisterHandler("user_login", func(e Event) {
        log.Printf("Processing user login: %s", e.Payload)
    })

    subscriber.RegisterHandler("order_update", func(e Event) {
        log.Printf("Processing order update: %s", e.Payload)
    })

    // Handle graceful shutdown
    sigCh := make(chan os.Signal, 1)
    signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

    go func() {
        <-sigCh
        log.Println("Shutting down subscriber...")
        cancel()
    }()

    // Subscribe to channels (this blocks)
    err := subscriber.Subscribe(ctx, "user:events", "system:notifications")
    if err != nil && ctx.Err() == nil {
        log.Fatalf("Subscription error: %v", err)
    }
}
```

## Distributed Locks with Redlock

Distributed locks ensure that only one process can execute a critical section across multiple instances. The Redlock algorithm provides a robust implementation.

### Basic Distributed Lock

A simple distributed lock implementation using Redis.

```go
package main

import (
    "context"
    "crypto/rand"
    "encoding/hex"
    "errors"
    "fmt"
    "time"

    "github.com/redis/go-redis/v9"
)

var (
    ErrLockNotAcquired = errors.New("lock not acquired")
    ErrLockNotHeld     = errors.New("lock not held by this owner")
)

type DistributedLock struct {
    redis   *redis.Client
    key     string
    value   string // Unique identifier for this lock holder
    ttl     time.Duration
}

// NewDistributedLock creates a new lock instance
func NewDistributedLock(rdb *redis.Client, key string, ttl time.Duration) *DistributedLock {
    // Generate a unique value to identify this lock holder
    b := make([]byte, 16)
    rand.Read(b)
    value := hex.EncodeToString(b)

    return &DistributedLock{
        redis: rdb,
        key:   fmt.Sprintf("lock:%s", key),
        value: value,
        ttl:   ttl,
    }
}

// Acquire attempts to acquire the lock
// Returns true if lock was acquired, false if already held by another process
func (l *DistributedLock) Acquire(ctx context.Context) (bool, error) {
    // SET NX (Not eXists) with expiration
    // This is atomic - only one process can set the key
    acquired, err := l.redis.SetNX(ctx, l.key, l.value, l.ttl).Result()
    if err != nil {
        return false, fmt.Errorf("failed to acquire lock: %w", err)
    }

    return acquired, nil
}

// Release releases the lock if held by this owner
// Uses Lua script to ensure atomicity
func (l *DistributedLock) Release(ctx context.Context) error {
    // Lua script ensures we only delete if we own the lock
    // This prevents releasing a lock that was acquired by another process
    // after our lock expired
    script := redis.NewScript(`
        if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("DEL", KEYS[1])
        else
            return 0
        end
    `)

    result, err := script.Run(ctx, l.redis, []string{l.key}, l.value).Result()
    if err != nil {
        return fmt.Errorf("failed to release lock: %w", err)
    }

    if result.(int64) == 0 {
        return ErrLockNotHeld
    }

    return nil
}

// Extend extends the lock TTL if still held
func (l *DistributedLock) Extend(ctx context.Context, duration time.Duration) error {
    // Only extend if we still hold the lock
    script := redis.NewScript(`
        if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("PEXPIRE", KEYS[1], ARGV[2])
        else
            return 0
        end
    `)

    result, err := script.Run(ctx, l.redis, []string{l.key}, l.value, duration.Milliseconds()).Result()
    if err != nil {
        return fmt.Errorf("failed to extend lock: %w", err)
    }

    if result.(int64) == 0 {
        return ErrLockNotHeld
    }

    return nil
}

// AcquireWithRetry attempts to acquire the lock with retries
func (l *DistributedLock) AcquireWithRetry(ctx context.Context, maxRetries int, retryDelay time.Duration) (bool, error) {
    for i := 0; i < maxRetries; i++ {
        acquired, err := l.Acquire(ctx)
        if err != nil {
            return false, err
        }
        if acquired {
            return true, nil
        }

        // Wait before retrying
        select {
        case <-ctx.Done():
            return false, ctx.Err()
        case <-time.After(retryDelay):
            // Continue to next retry
        }
    }

    return false, nil
}
```

### Using the Distributed Lock

Example of using the distributed lock for a critical section.

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/redis/go-redis/v9"
)

func main() {
    rdb := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })
    defer rdb.Close()

    ctx := context.Background()

    // Create a lock for processing a specific order
    lock := NewDistributedLock(rdb, "order:12345", 30*time.Second)

    // Try to acquire the lock
    acquired, err := lock.AcquireWithRetry(ctx, 5, 100*time.Millisecond)
    if err != nil {
        log.Fatalf("Error acquiring lock: %v", err)
    }

    if !acquired {
        log.Println("Could not acquire lock, another process is handling this order")
        return
    }

    // Ensure we release the lock when done
    defer func() {
        if err := lock.Release(ctx); err != nil {
            log.Printf("Failed to release lock: %v", err)
        }
    }()

    // Critical section - only one process can execute this
    fmt.Println("Lock acquired! Processing order...")
    processOrder("12345")
    fmt.Println("Order processed successfully")
}

func processOrder(orderID string) {
    // Simulate order processing
    time.Sleep(2 * time.Second)
}
```

### Redlock with Multiple Redis Instances

For higher availability, implement Redlock across multiple Redis instances.

```go
package main

import (
    "context"
    "crypto/rand"
    "encoding/hex"
    "fmt"
    "sync"
    "time"

    "github.com/redis/go-redis/v9"
)

type Redlock struct {
    clients []*redis.Client
    quorum  int
    key     string
    value   string
    ttl     time.Duration
}

// NewRedlock creates a Redlock instance with multiple Redis clients
func NewRedlock(clients []*redis.Client, key string, ttl time.Duration) *Redlock {
    b := make([]byte, 16)
    rand.Read(b)

    return &Redlock{
        clients: clients,
        quorum:  len(clients)/2 + 1, // Majority required
        key:     fmt.Sprintf("lock:%s", key),
        value:   hex.EncodeToString(b),
        ttl:     ttl,
    }
}

// Acquire tries to acquire the lock on all Redis instances
func (r *Redlock) Acquire(ctx context.Context) (bool, error) {
    startTime := time.Now()
    successCount := 0
    var mu sync.Mutex
    var wg sync.WaitGroup

    // Try to acquire lock on all instances in parallel
    for _, client := range r.clients {
        wg.Add(1)
        go func(c *redis.Client) {
            defer wg.Done()

            acquired, err := c.SetNX(ctx, r.key, r.value, r.ttl).Result()
            if err == nil && acquired {
                mu.Lock()
                successCount++
                mu.Unlock()
            }
        }(client)
    }

    wg.Wait()

    // Calculate elapsed time
    elapsed := time.Since(startTime)

    // Check if we acquired quorum and still have validity time
    validityTime := r.ttl - elapsed - (r.ttl / 10) // Subtract clock drift allowance
    if successCount >= r.quorum && validityTime > 0 {
        return true, nil
    }

    // Failed to acquire quorum - release any acquired locks
    r.Release(ctx)
    return false, nil
}

// Release releases the lock on all instances
func (r *Redlock) Release(ctx context.Context) {
    script := redis.NewScript(`
        if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("DEL", KEYS[1])
        else
            return 0
        end
    `)

    var wg sync.WaitGroup
    for _, client := range r.clients {
        wg.Add(1)
        go func(c *redis.Client) {
            defer wg.Done()
            script.Run(ctx, c, []string{r.key}, r.value)
        }(client)
    }
    wg.Wait()
}
```

## Connection Pooling Configuration

Proper connection pool configuration is essential for optimal performance and resource management.

### Understanding Pool Settings

Detailed explanation of connection pool configuration options.

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/redis/go-redis/v9"
)

func createOptimizedClient() *redis.Client {
    rdb := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",

        // PoolSize: Maximum number of socket connections
        // Default: 10 connections per every available CPU
        // Increase for high-throughput applications
        PoolSize: 100,

        // MinIdleConns: Minimum number of idle connections
        // These connections are kept open even when not in use
        // Reduces latency for bursty traffic patterns
        MinIdleConns: 10,

        // MaxIdleConns: Maximum number of idle connections
        // Connections exceeding this are closed
        // Default: 0 (no limit, uses PoolSize)
        MaxIdleConns: 50,

        // ConnMaxIdleTime: How long a connection can be idle before being closed
        // Default: 30 minutes
        // Set lower if Redis server has timeout configured
        ConnMaxIdleTime: 5 * time.Minute,

        // ConnMaxLifetime: Maximum lifetime of a connection
        // Default: 0 (connections are reused forever)
        // Set this to rotate connections periodically
        ConnMaxLifetime: 1 * time.Hour,

        // PoolTimeout: Time to wait for a connection from pool
        // Default: ReadTimeout + 1 second
        // Increase if you expect high contention
        PoolTimeout: 30 * time.Second,

        // PoolFIFO: Use FIFO order when getting connections from pool
        // Default: false (LIFO - Last In First Out)
        // FIFO can help distribute load more evenly
        PoolFIFO: true,
    })

    return rdb
}

// MonitorPoolStats periodically logs pool statistics
func MonitorPoolStats(ctx context.Context, rdb *redis.Client) {
    ticker := time.NewTicker(10 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            stats := rdb.PoolStats()
            log.Printf("Pool Stats - Hits: %d, Misses: %d, Timeouts: %d, TotalConns: %d, IdleConns: %d, StaleConns: %d",
                stats.Hits,       // Number of times a free connection was found in the pool
                stats.Misses,     // Number of times a free connection was NOT found
                stats.Timeouts,   // Number of times a wait for connection timed out
                stats.TotalConns, // Total number of connections in the pool
                stats.IdleConns,  // Number of idle connections in the pool
                stats.StaleConns, // Number of stale connections removed from the pool
            )
        }
    }
}

func main() {
    rdb := createOptimizedClient()
    defer rdb.Close()

    ctx := context.Background()

    // Start monitoring pool stats
    go MonitorPoolStats(ctx, rdb)

    // Test the connection
    if err := rdb.Ping(ctx).Err(); err != nil {
        log.Fatalf("Failed to connect: %v", err)
    }

    fmt.Println("Connected with optimized pool settings")

    // Your application logic here
    select {}
}
```

### Dynamic Pool Sizing

Adjust pool size based on application needs.

```go
package main

import (
    "context"
    "log"
    "runtime"
    "time"

    "github.com/redis/go-redis/v9"
)

type AdaptiveRedisClient struct {
    client  *redis.Client
    options *redis.Options
}

// NewAdaptiveClient creates a client with environment-aware pool settings
func NewAdaptiveClient(addr string) *AdaptiveRedisClient {
    numCPU := runtime.NumCPU()

    // Base pool size on CPU count, but with sensible limits
    poolSize := numCPU * 10
    if poolSize < 50 {
        poolSize = 50
    }
    if poolSize > 500 {
        poolSize = 500
    }

    options := &redis.Options{
        Addr:            addr,
        PoolSize:        poolSize,
        MinIdleConns:    numCPU * 2,
        MaxIdleConns:    poolSize / 2,
        ConnMaxIdleTime: 5 * time.Minute,
        ConnMaxLifetime: 30 * time.Minute,
        PoolTimeout:     10 * time.Second,
    }

    log.Printf("Initializing Redis pool: size=%d, minIdle=%d, cpus=%d",
        poolSize, numCPU*2, numCPU)

    return &AdaptiveRedisClient{
        client:  redis.NewClient(options),
        options: options,
    }
}

// HealthCheck verifies pool health and logs warnings
func (a *AdaptiveRedisClient) HealthCheck(ctx context.Context) error {
    stats := a.client.PoolStats()

    // Calculate utilization
    utilization := float64(stats.TotalConns-stats.IdleConns) / float64(a.options.PoolSize) * 100

    if utilization > 80 {
        log.Printf("WARNING: Pool utilization high: %.1f%% - consider increasing PoolSize", utilization)
    }

    if stats.Timeouts > 0 {
        log.Printf("WARNING: Pool timeouts detected: %d - consider increasing PoolSize or PoolTimeout", stats.Timeouts)
    }

    // Verify connectivity
    return a.client.Ping(ctx).Err()
}
```

## Pipelining for Batch Operations

Pipelining allows you to send multiple commands to Redis without waiting for individual responses, significantly improving performance for batch operations.

### Basic Pipelining

Send multiple commands in a single round-trip.

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/redis/go-redis/v9"
)

func basicPipeline(rdb *redis.Client, ctx context.Context) {
    // Create a pipeline
    // Commands are buffered and sent together
    pipe := rdb.Pipeline()

    // Queue multiple commands - these don't execute yet
    incr := pipe.Incr(ctx, "pipeline_counter")
    pipe.Expire(ctx, "pipeline_counter", time.Hour)
    get := pipe.Get(ctx, "some_key")

    // Execute all commands in a single round-trip
    _, err := pipe.Exec(ctx)
    if err != nil && err != redis.Nil {
        log.Printf("Pipeline error: %v", err)
    }

    // Now we can access results
    fmt.Printf("Counter: %d\n", incr.Val())
    fmt.Printf("Some key: %s (err: %v)\n", get.Val(), get.Err())
}

// BatchSet demonstrates setting multiple keys efficiently
func BatchSet(rdb *redis.Client, ctx context.Context, data map[string]string) error {
    pipe := rdb.Pipeline()

    for key, value := range data {
        pipe.Set(ctx, key, value, 0)
    }

    _, err := pipe.Exec(ctx)
    return err
}

// BatchGet retrieves multiple keys efficiently
func BatchGet(rdb *redis.Client, ctx context.Context, keys []string) (map[string]string, error) {
    pipe := rdb.Pipeline()

    // Create a slice to hold the command results
    cmds := make([]*redis.StringCmd, len(keys))
    for i, key := range keys {
        cmds[i] = pipe.Get(ctx, key)
    }

    _, err := pipe.Exec(ctx)
    if err != nil && err != redis.Nil {
        return nil, err
    }

    // Collect results
    result := make(map[string]string)
    for i, cmd := range cmds {
        val, err := cmd.Result()
        if err == nil {
            result[keys[i]] = val
        }
    }

    return result, nil
}

func main() {
    rdb := redis.NewClient(&redis.Options{Addr: "localhost:6379"})
    defer rdb.Close()

    ctx := context.Background()

    // Set multiple keys at once
    data := map[string]string{
        "user:1": "Alice",
        "user:2": "Bob",
        "user:3": "Charlie",
    }
    BatchSet(rdb, ctx, data)

    // Get multiple keys at once
    result, _ := BatchGet(rdb, ctx, []string{"user:1", "user:2", "user:3"})
    fmt.Printf("Retrieved: %v\n", result)
}
```

### Transactional Pipeline

Use TxPipeline for atomic operations that must all succeed or fail together.

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/redis/go-redis/v9"
)

// TransferPoints atomically transfers points between users
func TransferPoints(rdb *redis.Client, ctx context.Context, from, to string, points int64) error {
    // TxPipeline wraps commands in MULTI/EXEC
    // All commands execute atomically
    pipe := rdb.TxPipeline()

    // Deduct from sender
    pipe.DecrBy(ctx, fmt.Sprintf("points:%s", from), points)
    // Add to receiver
    pipe.IncrBy(ctx, fmt.Sprintf("points:%s", to), points)
    // Log the transfer
    pipe.LPush(ctx, "transfers:log", fmt.Sprintf("%s->%s:%d", from, to, points))

    // Execute atomically
    _, err := pipe.Exec(ctx)
    return err
}

// OptimisticLockTransfer uses WATCH for optimistic locking
func OptimisticLockTransfer(rdb *redis.Client, ctx context.Context, from, to string, points int64) error {
    fromKey := fmt.Sprintf("points:%s", from)
    toKey := fmt.Sprintf("points:%s", to)

    // Retry logic for optimistic locking
    maxRetries := 3
    for i := 0; i < maxRetries; i++ {
        err := rdb.Watch(ctx, func(tx *redis.Tx) error {
            // Get current balance
            balance, err := tx.Get(ctx, fromKey).Int64()
            if err != nil {
                return err
            }

            if balance < points {
                return fmt.Errorf("insufficient balance: %d < %d", balance, points)
            }

            // Execute transaction only if watched keys haven't changed
            _, err = tx.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
                pipe.DecrBy(ctx, fromKey, points)
                pipe.IncrBy(ctx, toKey, points)
                return nil
            })
            return err
        }, fromKey) // Watch the source account

        if err == nil {
            return nil // Success
        }

        if err == redis.TxFailedErr {
            // Key was modified by another client, retry
            log.Printf("Transaction conflict, retrying (%d/%d)", i+1, maxRetries)
            continue
        }

        return err // Other error, don't retry
    }

    return fmt.Errorf("transfer failed after %d retries", maxRetries)
}
```

### Chunked Pipeline

For very large batch operations, process in chunks to avoid memory issues.

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/redis/go-redis/v9"
)

const ChunkSize = 1000

// BulkInsert inserts large amounts of data in chunks
func BulkInsert(rdb *redis.Client, ctx context.Context, items map[string]string) error {
    keys := make([]string, 0, len(items))
    for k := range items {
        keys = append(keys, k)
    }

    totalItems := len(keys)
    processed := 0

    // Process in chunks to avoid memory issues and timeouts
    for i := 0; i < len(keys); i += ChunkSize {
        end := i + ChunkSize
        if end > len(keys) {
            end = len(keys)
        }

        chunk := keys[i:end]
        pipe := rdb.Pipeline()

        for _, key := range chunk {
            pipe.Set(ctx, key, items[key], 0)
        }

        _, err := pipe.Exec(ctx)
        if err != nil {
            return fmt.Errorf("chunk %d-%d failed: %w", i, end, err)
        }

        processed += len(chunk)
        log.Printf("Progress: %d/%d (%.1f%%)", processed, totalItems, float64(processed)/float64(totalItems)*100)
    }

    return nil
}

// BulkDelete deletes keys matching a pattern in chunks
func BulkDelete(rdb *redis.Client, ctx context.Context, pattern string) (int, error) {
    var cursor uint64
    var totalDeleted int

    for {
        // SCAN to find keys matching pattern
        keys, nextCursor, err := rdb.Scan(ctx, cursor, pattern, ChunkSize).Result()
        if err != nil {
            return totalDeleted, err
        }

        if len(keys) > 0 {
            pipe := rdb.Pipeline()
            for _, key := range keys {
                pipe.Del(ctx, key)
            }
            _, err := pipe.Exec(ctx)
            if err != nil {
                return totalDeleted, err
            }
            totalDeleted += len(keys)
            log.Printf("Deleted %d keys (total: %d)", len(keys), totalDeleted)
        }

        cursor = nextCursor
        if cursor == 0 {
            break // Scan complete
        }
    }

    return totalDeleted, nil
}
```

## Best Practices and Tips

Here are some best practices to keep in mind when working with Redis in Go.

### Error Handling

Always handle redis.Nil separately from other errors.

```go
package main

import (
    "context"
    "errors"
    "fmt"

    "github.com/redis/go-redis/v9"
)

var ErrNotFound = errors.New("key not found")

func GetValue(rdb *redis.Client, ctx context.Context, key string) (string, error) {
    val, err := rdb.Get(ctx, key).Result()

    // redis.Nil means the key doesn't exist
    // This is different from an actual error
    if err == redis.Nil {
        return "", ErrNotFound
    }

    if err != nil {
        return "", fmt.Errorf("redis error: %w", err)
    }

    return val, nil
}

// Check for specific error types
func HandleErrors(rdb *redis.Client, ctx context.Context) {
    _, err := rdb.Get(ctx, "key").Result()

    switch {
    case err == redis.Nil:
        fmt.Println("Key does not exist")
    case err != nil:
        // Check for connection errors
        if errors.Is(err, context.DeadlineExceeded) {
            fmt.Println("Operation timed out")
        } else {
            fmt.Printf("Redis error: %v\n", err)
        }
    default:
        fmt.Println("Success")
    }
}
```

### Context Usage

Always use context for timeouts and cancellation.

```go
package main

import (
    "context"
    "log"
    "time"

    "github.com/redis/go-redis/v9"
)

func OperationWithTimeout(rdb *redis.Client) {
    // Create context with timeout
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    // This operation will be cancelled if it takes more than 5 seconds
    result, err := rdb.BLPop(ctx, 0, "queue").Result()
    if err != nil {
        if err == context.DeadlineExceeded {
            log.Println("Operation timed out")
            return
        }
        log.Printf("Error: %v", err)
        return
    }

    log.Printf("Got: %v", result)
}
```

### Key Naming Conventions

Use consistent, descriptive key naming patterns.

```go
package main

import "fmt"

// Use colons to create namespaces
// This helps with organization and bulk operations

func KeyPatterns() {
    // User-related keys
    userProfile := fmt.Sprintf("user:%d:profile", 1001)      // user:1001:profile
    userSession := fmt.Sprintf("user:%d:session", 1001)      // user:1001:session
    userSettings := fmt.Sprintf("user:%d:settings", 1001)    // user:1001:settings

    // Product-related keys
    productDetails := fmt.Sprintf("product:%d:details", 5001) // product:5001:details
    productStock := fmt.Sprintf("product:%d:stock", 5001)     // product:5001:stock

    // Cache keys with version for easy invalidation
    cacheV1 := fmt.Sprintf("cache:v1:homepage:data")
    cacheV2 := fmt.Sprintf("cache:v2:homepage:data")

    // Temporary keys with identifier
    tempKey := fmt.Sprintf("temp:%s:processing", "abc123")

    // Rate limiting keys
    rateLimit := fmt.Sprintf("ratelimit:%s:%s", "api", "user:1001")

    _ = userProfile
    _ = userSession
    _ = userSettings
    _ = productDetails
    _ = productStock
    _ = cacheV1
    _ = cacheV2
    _ = tempKey
    _ = rateLimit
}
```

## Conclusion

The go-redis library provides a comprehensive and type-safe way to work with Redis in Go applications. We have covered the essential aspects of using Redis effectively:

- **Connection Management**: From basic connections to cluster setups with proper pool configuration
- **Data Structures**: Working with strings, hashes, lists, sets, and sorted sets for various use cases
- **Caching Patterns**: Implementing cache-aside, write-through, and refresh-ahead strategies
- **Pub/Sub**: Building real-time messaging systems with publishers and subscribers
- **Distributed Locks**: Ensuring mutual exclusion across distributed systems with Redlock
- **Pipelining**: Optimizing performance with batch operations and transactions

Redis combined with Go creates a powerful foundation for building high-performance, scalable applications. Whether you are implementing caching to reduce database load, building real-time features with pub/sub, or coordinating distributed systems with locks, go-redis provides the tools you need.

Remember to monitor your Redis connections, implement proper error handling, and follow the key naming conventions to maintain a clean and efficient Redis implementation in your Go applications.
