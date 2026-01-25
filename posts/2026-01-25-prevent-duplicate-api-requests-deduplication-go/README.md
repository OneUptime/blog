# How to Prevent Duplicate API Requests with Deduplication in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, API, Deduplication, Idempotency, Performance

Description: Learn how to implement request deduplication in Go to prevent duplicate API calls, reduce server load, and ensure idempotent operations using practical patterns and code examples.

---

Duplicate API requests happen more often than you'd think. A user double-clicks a submit button. A mobile app retries a failed request that actually succeeded. A webhook fires twice. Network hiccups cause retries. Without proper deduplication, these duplicate requests can create duplicate orders, double charges, or corrupted data.

This guide covers practical deduplication patterns in Go that you can implement today.

## Why Deduplication Matters

Consider a payment endpoint. A user clicks "Pay" and the network times out, but the payment actually went through. The client retries. Without deduplication, the user gets charged twice. This is not a hypothetical problem - it happens constantly in production systems.

Deduplication solves this by recognizing that a request has already been processed and returning the cached result instead of processing it again.

## The Basic Pattern: Idempotency Keys

The most common approach uses idempotency keys - unique identifiers that clients include with their requests. If a request with the same key was already processed, return the cached response.

```go
package main

import (
    "crypto/sha256"
    "encoding/hex"
    "encoding/json"
    "net/http"
    "sync"
    "time"
)

// CachedResponse stores the result of a processed request
type CachedResponse struct {
    StatusCode int
    Body       []byte
    Headers    map[string]string
    CreatedAt  time.Time
}

// Deduplicator handles request deduplication using idempotency keys
type Deduplicator struct {
    mu       sync.RWMutex
    cache    map[string]*CachedResponse
    ttl      time.Duration
    inflight map[string]chan struct{} // tracks requests being processed
}

func NewDeduplicator(ttl time.Duration) *Deduplicator {
    d := &Deduplicator{
        cache:    make(map[string]*CachedResponse),
        inflight: make(map[string]chan struct{}),
        ttl:      ttl,
    }
    go d.cleanupLoop()
    return d
}

// cleanupLoop removes expired entries periodically
func (d *Deduplicator) cleanupLoop() {
    ticker := time.NewTicker(time.Minute)
    for range ticker.C {
        d.mu.Lock()
        now := time.Now()
        for key, resp := range d.cache {
            if now.Sub(resp.CreatedAt) > d.ttl {
                delete(d.cache, key)
            }
        }
        d.mu.Unlock()
    }
}
```

## Handling Concurrent Duplicate Requests

A tricky scenario: two identical requests arrive simultaneously before either completes. Both would pass the "not in cache" check and execute the operation twice. The solution is to track in-flight requests and make concurrent duplicates wait for the first one to finish.

```go
// Process handles a request with deduplication
// Returns (cachedResponse, wasDuplicate)
func (d *Deduplicator) Process(key string, handler func() (*CachedResponse, error)) (*CachedResponse, bool, error) {
    // Fast path: check if already cached
    d.mu.RLock()
    if cached, exists := d.cache[key]; exists {
        d.mu.RUnlock()
        return cached, true, nil
    }
    d.mu.RUnlock()

    // Slow path: need to acquire write lock
    d.mu.Lock()

    // Double-check after acquiring write lock
    if cached, exists := d.cache[key]; exists {
        d.mu.Unlock()
        return cached, true, nil
    }

    // Check if another goroutine is already processing this request
    if waitChan, processing := d.inflight[key]; processing {
        d.mu.Unlock()
        // Wait for the other request to complete
        <-waitChan
        // Now fetch the cached result
        d.mu.RLock()
        cached := d.cache[key]
        d.mu.RUnlock()
        return cached, true, nil
    }

    // Mark this request as in-flight
    waitChan := make(chan struct{})
    d.inflight[key] = waitChan
    d.mu.Unlock()

    // Process the request
    response, err := handler()

    d.mu.Lock()
    if err == nil && response != nil {
        response.CreatedAt = time.Now()
        d.cache[key] = response
    }
    delete(d.inflight, key)
    close(waitChan) // Signal waiting goroutines
    d.mu.Unlock()

    return response, false, err
}
```

## HTTP Middleware Implementation

Wrapping this in HTTP middleware makes it easy to add deduplication to any endpoint.

```go
// DeduplicationMiddleware wraps handlers with request deduplication
func DeduplicationMiddleware(dedup *Deduplicator) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Only deduplicate mutating requests
            if r.Method == http.MethodGet || r.Method == http.MethodHead {
                next.ServeHTTP(w, r)
                return
            }

            // Get idempotency key from header
            idempotencyKey := r.Header.Get("Idempotency-Key")
            if idempotencyKey == "" {
                // No key provided - process normally without deduplication
                next.ServeHTTP(w, r)
                return
            }

            // Include method and path in the cache key
            // This prevents collisions if the same idempotency key is used
            // for different endpoints
            cacheKey := r.Method + ":" + r.URL.Path + ":" + idempotencyKey

            response, wasDuplicate, err := dedup.Process(cacheKey, func() (*CachedResponse, error) {
                // Capture the response using a custom ResponseWriter
                recorder := &responseRecorder{
                    ResponseWriter: w,
                    headers:        make(map[string]string),
                }
                next.ServeHTTP(recorder, r)

                return &CachedResponse{
                    StatusCode: recorder.statusCode,
                    Body:       recorder.body,
                    Headers:    recorder.headers,
                }, nil
            })

            if err != nil {
                http.Error(w, "Internal server error", http.StatusInternalServerError)
                return
            }

            if wasDuplicate {
                w.Header().Set("X-Idempotent-Replay", "true")
            }

            // Write the cached response
            for key, value := range response.Headers {
                w.Header().Set(key, value)
            }
            w.WriteHeader(response.StatusCode)
            w.Write(response.Body)
        })
    }
}

// responseRecorder captures the response for caching
type responseRecorder struct {
    http.ResponseWriter
    statusCode int
    body       []byte
    headers    map[string]string
}

func (r *responseRecorder) WriteHeader(code int) {
    r.statusCode = code
    r.ResponseWriter.WriteHeader(code)
}

func (r *responseRecorder) Write(b []byte) (int, error) {
    r.body = append(r.body, b...)
    return r.ResponseWriter.Write(b)
}
```

## Content-Based Deduplication

Sometimes clients don't send idempotency keys. You can generate keys from the request content itself. Hash the relevant request fields to create a fingerprint.

```go
// GenerateContentKey creates an idempotency key from request content
func GenerateContentKey(r *http.Request, body []byte) string {
    h := sha256.New()

    // Include method and path
    h.Write([]byte(r.Method))
    h.Write([]byte(r.URL.Path))

    // Include relevant headers (exclude timestamps, request IDs, etc.)
    h.Write([]byte(r.Header.Get("Content-Type")))

    // Include body
    h.Write(body)

    return hex.EncodeToString(h.Sum(nil))
}

// AutoDeduplicationMiddleware generates keys from request content
func AutoDeduplicationMiddleware(dedup *Deduplicator) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            if r.Method == http.MethodGet || r.Method == http.MethodHead {
                next.ServeHTTP(w, r)
                return
            }

            // Prefer explicit idempotency key
            idempotencyKey := r.Header.Get("Idempotency-Key")

            if idempotencyKey == "" && r.Body != nil {
                // Read and restore body for key generation
                body, err := io.ReadAll(r.Body)
                if err != nil {
                    http.Error(w, "Failed to read request", http.StatusBadRequest)
                    return
                }
                r.Body = io.NopCloser(bytes.NewReader(body))
                idempotencyKey = GenerateContentKey(r, body)
            }

            if idempotencyKey == "" {
                next.ServeHTTP(w, r)
                return
            }

            // Rest of deduplication logic...
            cacheKey := r.Method + ":" + r.URL.Path + ":" + idempotencyKey
            // ... same as before
        })
    }
}
```

## Redis-Backed Deduplication for Distributed Systems

In-memory deduplication works for single instances. For distributed systems, use Redis.

```go
package main

import (
    "context"
    "encoding/json"
    "time"

    "github.com/redis/go-redis/v9"
)

type RedisDeduplicator struct {
    client *redis.Client
    ttl    time.Duration
}

func NewRedisDeduplicator(client *redis.Client, ttl time.Duration) *RedisDeduplicator {
    return &RedisDeduplicator{
        client: client,
        ttl:    ttl,
    }
}

func (d *RedisDeduplicator) Process(ctx context.Context, key string, handler func() (*CachedResponse, error)) (*CachedResponse, bool, error) {
    cacheKey := "dedup:" + key
    lockKey := "dedup:lock:" + key

    // Check cache first
    cached, err := d.client.Get(ctx, cacheKey).Bytes()
    if err == nil {
        var response CachedResponse
        if json.Unmarshal(cached, &response) == nil {
            return &response, true, nil
        }
    }

    // Try to acquire lock using SETNX
    // This prevents concurrent duplicate processing across instances
    acquired, err := d.client.SetNX(ctx, lockKey, "1", 30*time.Second).Result()
    if err != nil {
        return nil, false, err
    }

    if !acquired {
        // Another instance is processing - wait and fetch result
        return d.waitForResult(ctx, cacheKey, 30*time.Second)
    }

    // We have the lock - process the request
    defer d.client.Del(ctx, lockKey)

    response, err := handler()
    if err != nil {
        return nil, false, err
    }

    // Cache the response
    data, _ := json.Marshal(response)
    d.client.Set(ctx, cacheKey, data, d.ttl)

    return response, false, nil
}

func (d *RedisDeduplicator) waitForResult(ctx context.Context, cacheKey string, timeout time.Duration) (*CachedResponse, bool, error) {
    deadline := time.Now().Add(timeout)

    for time.Now().Before(deadline) {
        cached, err := d.client.Get(ctx, cacheKey).Bytes()
        if err == nil {
            var response CachedResponse
            if json.Unmarshal(cached, &response) == nil {
                return &response, true, nil
            }
        }
        time.Sleep(50 * time.Millisecond)
    }

    return nil, false, context.DeadlineExceeded
}
```

## Handling Edge Cases

### Request Fingerprinting with Timestamps

Be careful with timestamps in request bodies. Two requests sent seconds apart with different timestamps would generate different content hashes, defeating deduplication.

```go
// StripVolatileFields removes timestamps and generated IDs before hashing
func StripVolatileFields(body map[string]interface{}) map[string]interface{} {
    cleaned := make(map[string]interface{})
    volatileFields := map[string]bool{
        "timestamp":   true,
        "request_id":  true,
        "created_at":  true,
        "nonce":       true,
    }

    for key, value := range body {
        if !volatileFields[key] {
            cleaned[key] = value
        }
    }
    return cleaned
}
```

### Partial Failure Handling

What if a request partially succeeds? For example, an order is created but the email notification fails. Caching this as "success" would skip the email on retry.

```go
// Only cache fully successful responses
func (d *Deduplicator) ProcessWithValidation(
    key string,
    handler func() (*CachedResponse, error),
    shouldCache func(*CachedResponse) bool,
) (*CachedResponse, bool, error) {
    // ... check cache as before ...

    response, err := handler()
    if err != nil {
        return nil, false, err
    }

    // Only cache if the response indicates full success
    if shouldCache(response) {
        d.mu.Lock()
        response.CreatedAt = time.Now()
        d.cache[key] = response
        d.mu.Unlock()
    }

    return response, false, nil
}

// Usage
dedup.ProcessWithValidation(key, handler, func(resp *CachedResponse) bool {
    // Only cache 2xx responses
    return resp.StatusCode >= 200 && resp.StatusCode < 300
})
```

## Best Practices

**Choose appropriate TTL values.** Too short and retries won't be deduplicated. Too long and you waste memory. For payment operations, 24 hours is common. For less critical operations, 5-15 minutes often works.

**Include scope in cache keys.** Add user ID, tenant ID, or API version to prevent cross-user collisions. A key like `user:123:payment:abc` is safer than just `payment:abc`.

**Return consistent responses.** When returning a cached response, set a header like `X-Idempotent-Replay: true` so clients know they received a replay.

**Log deduplicated requests.** Track how often deduplication triggers. High rates might indicate client bugs or UX issues worth fixing.

**Handle clock skew.** In distributed systems, servers have slightly different clocks. Add some buffer to your TTL calculations.

## Common Pitfalls

**Caching errors.** Don't cache 5xx errors. The operation might succeed on retry when the transient issue resolves.

**Ignoring request method.** A POST and PUT to the same URL with the same body are different operations. Include the HTTP method in your cache key.

**Memory leaks.** Without cleanup, your cache grows forever. Always implement TTL expiration.

**Race conditions.** The double-check locking pattern (check cache, acquire lock, check again) is essential. Skipping the second check causes duplicate processing.

## Summary

| Pattern | Use Case | Tradeoff |
|---------|----------|----------|
| **Client idempotency keys** | Payment APIs, order creation | Requires client cooperation |
| **Content hashing** | Webhook handlers, import jobs | May miss intentional duplicates |
| **In-memory cache** | Single instance services | Lost on restart |
| **Redis-backed** | Distributed systems | Additional infrastructure |

Request deduplication is essential for any API that handles mutations. Start with the simple in-memory approach for single instances, and move to Redis when you scale horizontally. The key insight is that it is better to return a cached success than to risk double-processing.
