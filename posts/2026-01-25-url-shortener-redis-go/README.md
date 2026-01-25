# How to Build a URL Shortener with Redis in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Redis, URL Shortener, Web Development, Caching

Description: Learn how to build a fast, scalable URL shortener service using Go and Redis, covering short code generation, collision handling, expiration, and click tracking.

---

URL shorteners are deceptively simple. Take a long URL, generate a short code, store the mapping, and redirect. But the devil is in the details: how do you generate unique codes without collisions? How do you handle millions of redirects per second? Redis solves most of these problems out of the box.

In this guide, we will build a production-ready URL shortener from scratch using Go and Redis. By the end, you will have a service that generates short URLs, tracks clicks, and handles expiration.

## Why Redis for URL Shortening?

Redis is a natural fit for URL shorteners:

- **Speed**: In-memory storage means sub-millisecond lookups, perfect for high-traffic redirect endpoints
- **Atomic operations**: Built-in commands like `INCR` prevent race conditions when generating unique IDs
- **TTL support**: Automatic key expiration handles temporary links without background jobs
- **Data structures**: Hashes store metadata alongside URLs without multiple queries

PostgreSQL or MySQL would work, but you would need caching anyway. Redis eliminates that layer entirely.

## Project Structure

```
url-shortener/
  main.go
  handlers.go
  shortener.go
  go.mod
```

Keep it simple. We will use the standard library for HTTP and the `go-redis` client for Redis.

## Setting Up Dependencies

```go
// go.mod
module url-shortener

go 1.21

require github.com/redis/go-redis/v9 v9.4.0
```

Install the Redis client:

```bash
go mod init url-shortener
go get github.com/redis/go-redis/v9
```

## Core Shortener Logic

The shortener generates unique codes and stores URL mappings. Here is the implementation:

```go
// shortener.go
package main

import (
    "context"
    "crypto/rand"
    "encoding/base64"
    "errors"
    "fmt"
    "time"

    "github.com/redis/go-redis/v9"
)

// Shortener handles URL shortening operations
type Shortener struct {
    rdb        *redis.Client
    baseURL    string
    codeLength int
}

// NewShortener creates a shortener with the given Redis client
func NewShortener(rdb *redis.Client, baseURL string) *Shortener {
    return &Shortener{
        rdb:        rdb,
        baseURL:    baseURL,
        codeLength: 7, // 64^7 = 4 trillion possible codes
    }
}

// generateCode creates a random URL-safe code
func (s *Shortener) generateCode() (string, error) {
    // Generate random bytes
    bytes := make([]byte, s.codeLength)
    if _, err := rand.Read(bytes); err != nil {
        return "", fmt.Errorf("failed to generate random bytes: %w", err)
    }

    // Encode to URL-safe base64, trim padding and truncate
    code := base64.URLEncoding.EncodeToString(bytes)
    return code[:s.codeLength], nil
}
```

We use cryptographically random bytes instead of sequential IDs. Sequential IDs leak information about usage patterns and are easy to enumerate. Random codes provide security through obscurity.

## Creating Short URLs

The `Shorten` method stores the URL and returns the short code:

```go
// Shorten creates a short URL for the given long URL
func (s *Shortener) Shorten(ctx context.Context, longURL string, ttl time.Duration) (string, error) {
    // Try up to 5 times to find an unused code
    for i := 0; i < 5; i++ {
        code, err := s.generateCode()
        if err != nil {
            return "", err
        }

        key := fmt.Sprintf("url:%s", code)

        // Use SETNX to avoid overwriting existing codes
        // This is atomic - no race conditions
        set, err := s.rdb.SetNX(ctx, key, longURL, ttl).Result()
        if err != nil {
            return "", fmt.Errorf("redis error: %w", err)
        }

        if set {
            // Successfully stored, return the short URL
            return fmt.Sprintf("%s/%s", s.baseURL, code), nil
        }
        // Code collision, try again
    }

    return "", errors.New("failed to generate unique code after 5 attempts")
}
```

The `SETNX` command (SET if Not eXists) is crucial here. It atomically checks if the key exists and sets it only if it does not. This prevents two concurrent requests from accidentally using the same code.

## Resolving Short URLs

When someone visits a short URL, we need to look up the original:

```go
// Resolve returns the original URL for a short code
func (s *Shortener) Resolve(ctx context.Context, code string) (string, error) {
    key := fmt.Sprintf("url:%s", code)

    longURL, err := s.rdb.Get(ctx, key).Result()
    if err == redis.Nil {
        return "", errors.New("short URL not found")
    }
    if err != nil {
        return "", fmt.Errorf("redis error: %w", err)
    }

    return longURL, nil
}
```

Redis `GET` is O(1), so lookups are instant regardless of how many URLs you have stored.

## Adding Click Tracking

Most URL shorteners track clicks. We can use a separate counter key:

```go
// ResolveAndTrack returns the URL and increments the click counter
func (s *Shortener) ResolveAndTrack(ctx context.Context, code string) (string, error) {
    key := fmt.Sprintf("url:%s", code)
    statsKey := fmt.Sprintf("stats:%s", code)

    // Use pipeline to batch commands
    pipe := s.rdb.Pipeline()
    getCmd := pipe.Get(ctx, key)
    pipe.Incr(ctx, statsKey)
    _, err := pipe.Exec(ctx)

    if err != nil && err != redis.Nil {
        return "", fmt.Errorf("redis error: %w", err)
    }

    longURL, err := getCmd.Result()
    if err == redis.Nil {
        return "", errors.New("short URL not found")
    }

    return longURL, nil
}

// GetStats returns click count for a short code
func (s *Shortener) GetStats(ctx context.Context, code string) (int64, error) {
    statsKey := fmt.Sprintf("stats:%s", code)
    count, err := s.rdb.Get(ctx, statsKey).Result()
    if err == redis.Nil {
        return 0, nil
    }
    if err != nil {
        return 0, err
    }

    var clicks int64
    fmt.Sscanf(count, "%d", &clicks)
    return clicks, nil
}
```

Pipelining sends both commands in a single round trip, cutting latency in half.

## HTTP Handlers

Now let us wire everything to HTTP endpoints:

```go
// handlers.go
package main

import (
    "encoding/json"
    "net/http"
    "strings"
    "time"
)

type ShortenRequest struct {
    URL string `json:"url"`
    TTL int    `json:"ttl_hours,omitempty"` // Optional expiration in hours
}

type ShortenResponse struct {
    ShortURL string `json:"short_url"`
}

// handleShorten creates a new short URL
func (s *Shortener) handleShorten(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
        return
    }

    var req ShortenRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "invalid JSON", http.StatusBadRequest)
        return
    }

    if req.URL == "" {
        http.Error(w, "url is required", http.StatusBadRequest)
        return
    }

    // Default TTL: 30 days
    ttl := 30 * 24 * time.Hour
    if req.TTL > 0 {
        ttl = time.Duration(req.TTL) * time.Hour
    }

    shortURL, err := s.Shorten(r.Context(), req.URL, ttl)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(ShortenResponse{ShortURL: shortURL})
}

// handleRedirect resolves and redirects to the original URL
func (s *Shortener) handleRedirect(w http.ResponseWriter, r *http.Request) {
    // Extract code from path: /abc123 -> abc123
    code := strings.TrimPrefix(r.URL.Path, "/")
    if code == "" {
        http.Error(w, "missing code", http.StatusBadRequest)
        return
    }

    longURL, err := s.ResolveAndTrack(r.Context(), code)
    if err != nil {
        http.NotFound(w, r)
        return
    }

    // 301 for permanent redirects, 302 for temporary
    http.Redirect(w, r, longURL, http.StatusMovedPermanently)
}
```

The redirect handler returns a 301 status. This tells browsers to cache the redirect, reducing load on your server for repeat visitors.

## Main Entry Point

Tie it all together:

```go
// main.go
package main

import (
    "context"
    "log"
    "net/http"
    "os"

    "github.com/redis/go-redis/v9"
)

func main() {
    // Configure Redis connection
    redisAddr := os.Getenv("REDIS_ADDR")
    if redisAddr == "" {
        redisAddr = "localhost:6379"
    }

    rdb := redis.NewClient(&redis.Options{
        Addr:     redisAddr,
        Password: os.Getenv("REDIS_PASSWORD"),
        DB:       0,
    })

    // Verify connection
    ctx := context.Background()
    if err := rdb.Ping(ctx).Err(); err != nil {
        log.Fatalf("failed to connect to Redis: %v", err)
    }
    log.Println("connected to Redis")

    baseURL := os.Getenv("BASE_URL")
    if baseURL == "" {
        baseURL = "http://localhost:8080"
    }

    shortener := NewShortener(rdb, baseURL)

    // Routes
    http.HandleFunc("/api/shorten", shortener.handleShorten)
    http.HandleFunc("/", shortener.handleRedirect)

    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    log.Printf("server starting on port %s", port)
    if err := http.ListenAndServe(":"+port, nil); err != nil {
        log.Fatal(err)
    }
}
```

## Testing the Service

Start Redis and run the service:

```bash
# Start Redis (Docker)
docker run -d -p 6379:6379 redis:alpine

# Run the service
go run .
```

Create a short URL:

```bash
curl -X POST http://localhost:8080/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/very/long/path"}'

# Response: {"short_url":"http://localhost:8080/Kj2mX9p"}
```

Test the redirect:

```bash
curl -I http://localhost:8080/Kj2mX9p

# HTTP/1.1 301 Moved Permanently
# Location: https://example.com/very/long/path
```

## Production Considerations

Before deploying, consider these improvements:

**Connection pooling**: The go-redis client handles pooling automatically, but tune `PoolSize` based on your concurrency needs.

**Rate limiting**: Add middleware to prevent abuse. Redis itself can help with rate limiting using the `INCR` command with expiration.

**Validation**: Check that submitted URLs are valid and not pointing to malicious sites.

**Metrics**: Track redirect latency, cache hit rates, and error counts. Export to your observability platform.

**Persistence**: Configure Redis with RDB or AOF persistence if you cannot afford to lose data. For true durability, replicate to a secondary.

## Wrapping Up

We built a URL shortener that generates random codes, stores mappings in Redis, tracks clicks, and handles expiration. The core is under 200 lines of Go.

Redis handles the hard parts: atomic operations prevent collisions, TTLs manage expiration, and in-memory storage keeps redirects fast. Go gives us a small binary that handles thousands of concurrent connections without breaking a sweat.

For production use, add proper logging, metrics, and consider Redis Cluster if you need horizontal scaling. But the foundation here will handle more traffic than most services ever see.
