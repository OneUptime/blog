# How to Implement Idempotency Keys for Safe API Retries in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Idempotency, API, Reliability, Best Practices

Description: Learn how to implement idempotency keys in Go APIs to prevent duplicate operations during network failures and retries. This guide covers storage strategies, middleware implementation, and production-ready patterns.

---

Network failures happen. Clients retry requests. Without proper safeguards, your API might process the same payment twice, create duplicate orders, or send multiple emails for a single action. Idempotency keys solve this problem by ensuring that repeated requests with the same key produce the same result without executing the operation multiple times.

This pattern is essential for any API that handles money, creates resources, or triggers side effects. Stripe, PayPal, and most payment processors require idempotency keys for exactly this reason.

---

## What Are Idempotency Keys?

An idempotency key is a unique identifier that clients include with their requests. When your server receives a request, it checks if it has seen that key before:

- If the key is new, process the request normally and store the result
- If the key exists, return the stored result without re-executing the operation

The key insight is that the server remembers both successful and failed responses. A retry with the same key always gets the same response, whether that was a success or an error.

---

## Basic Implementation

Let's start with a simple in-memory implementation to understand the core concept.

```go
// idempotency/store.go
package idempotency

import (
    "sync"
    "time"
)

// Response stores the cached result of a previous request
type Response struct {
    StatusCode int               // HTTP status code returned
    Body       []byte            // Response body
    Headers    map[string]string // Response headers to replay
    CreatedAt  time.Time         // When this response was cached
}

// Store defines the interface for idempotency key storage
type Store interface {
    // Get retrieves a cached response, returns nil if not found
    Get(key string) (*Response, error)
    // Set stores a response with the given key
    Set(key string, response *Response) error
    // SetProcessing marks a key as being processed (for locking)
    SetProcessing(key string) (bool, error)
    // Delete removes a key from storage
    Delete(key string) error
}

// MemoryStore provides an in-memory implementation for development
type MemoryStore struct {
    mu        sync.RWMutex
    responses map[string]*Response
    ttl       time.Duration // How long to keep responses
}

// NewMemoryStore creates a new in-memory store with the given TTL
func NewMemoryStore(ttl time.Duration) *MemoryStore {
    store := &MemoryStore{
        responses: make(map[string]*Response),
        ttl:       ttl,
    }
    // Start background cleanup goroutine
    go store.cleanup()
    return store
}

func (s *MemoryStore) Get(key string) (*Response, error) {
    s.mu.RLock()
    defer s.mu.RUnlock()

    resp, exists := s.responses[key]
    if !exists {
        return nil, nil // Key not found, not an error
    }

    // Check if the response has expired
    if time.Since(resp.CreatedAt) > s.ttl {
        return nil, nil
    }

    return resp, nil
}

func (s *MemoryStore) Set(key string, response *Response) error {
    s.mu.Lock()
    defer s.mu.Unlock()

    response.CreatedAt = time.Now()
    s.responses[key] = response
    return nil
}

func (s *MemoryStore) SetProcessing(key string) (bool, error) {
    s.mu.Lock()
    defer s.mu.Unlock()

    // Check if key already exists
    if _, exists := s.responses[key]; exists {
        return false, nil // Key already being processed or completed
    }

    // Mark as processing with empty response
    s.responses[key] = &Response{
        StatusCode: 0, // Zero indicates processing
        CreatedAt:  time.Now(),
    }
    return true, nil
}

func (s *MemoryStore) Delete(key string) error {
    s.mu.Lock()
    defer s.mu.Unlock()
    delete(s.responses, key)
    return nil
}

// cleanup periodically removes expired entries
func (s *MemoryStore) cleanup() {
    ticker := time.NewTicker(s.ttl / 2)
    for range ticker.C {
        s.mu.Lock()
        now := time.Now()
        for key, resp := range s.responses {
            if now.Sub(resp.CreatedAt) > s.ttl {
                delete(s.responses, key)
            }
        }
        s.mu.Unlock()
    }
}
```

---

## HTTP Middleware

Now let's create middleware that intercepts requests and handles idempotency automatically.

```go
// idempotency/middleware.go
package idempotency

import (
    "bytes"
    "encoding/json"
    "net/http"
)

const (
    // HeaderIdempotencyKey is the standard header name
    HeaderIdempotencyKey = "Idempotency-Key"
    // HeaderIdempotencyReplayed indicates a cached response
    HeaderIdempotencyReplayed = "Idempotency-Replayed"
)

// Middleware wraps an HTTP handler with idempotency support
type Middleware struct {
    store Store
}

// NewMiddleware creates a new idempotency middleware
func NewMiddleware(store Store) *Middleware {
    return &Middleware{store: store}
}

// responseWriter captures the response for caching
type responseWriter struct {
    http.ResponseWriter
    statusCode int
    body       bytes.Buffer
}

func (rw *responseWriter) WriteHeader(code int) {
    rw.statusCode = code
    rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
    rw.body.Write(b) // Capture the response body
    return rw.ResponseWriter.Write(b)
}

// Wrap returns middleware that handles idempotency for the given handler
func (m *Middleware) Wrap(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Only apply to mutating methods
        if r.Method == http.MethodGet || r.Method == http.MethodHead {
            next.ServeHTTP(w, r)
            return
        }

        // Get the idempotency key from header
        key := r.Header.Get(HeaderIdempotencyKey)
        if key == "" {
            // No key provided - process normally without idempotency
            next.ServeHTTP(w, r)
            return
        }

        // Check for existing response
        cached, err := m.store.Get(key)
        if err != nil {
            http.Error(w, "Internal server error", http.StatusInternalServerError)
            return
        }

        // Return cached response if found
        if cached != nil && cached.StatusCode != 0 {
            m.replayResponse(w, cached)
            return
        }

        // Try to acquire processing lock
        acquired, err := m.store.SetProcessing(key)
        if err != nil {
            http.Error(w, "Internal server error", http.StatusInternalServerError)
            return
        }

        if !acquired {
            // Another request is processing this key - return conflict
            w.Header().Set("Content-Type", "application/json")
            w.WriteHeader(http.StatusConflict)
            json.NewEncoder(w).Encode(map[string]string{
                "error": "Request with this idempotency key is already being processed",
            })
            return
        }

        // Capture the response
        rw := &responseWriter{
            ResponseWriter: w,
            statusCode:     http.StatusOK,
        }

        // Process the actual request
        next.ServeHTTP(rw, r)

        // Store the response for future retries
        response := &Response{
            StatusCode: rw.statusCode,
            Body:       rw.body.Bytes(),
            Headers:    make(map[string]string),
        }

        // Capture relevant headers
        for _, header := range []string{"Content-Type", "Location"} {
            if val := rw.Header().Get(header); val != "" {
                response.Headers[header] = val
            }
        }

        m.store.Set(key, response)
    })
}

// replayResponse sends a cached response back to the client
func (m *Middleware) replayResponse(w http.ResponseWriter, resp *Response) {
    // Set cached headers
    for key, val := range resp.Headers {
        w.Header().Set(key, val)
    }

    // Indicate this is a replayed response
    w.Header().Set(HeaderIdempotencyReplayed, "true")

    w.WriteHeader(resp.StatusCode)
    w.Write(resp.Body)
}
```

---

## Production-Ready Redis Store

For production systems, you need distributed storage. Redis is the natural choice for this - it provides atomic operations, automatic expiration, and scales horizontally.

```go
// idempotency/redis_store.go
package idempotency

import (
    "context"
    "encoding/json"
    "errors"
    "time"

    "github.com/redis/go-redis/v9"
)

// RedisStore implements idempotency storage using Redis
type RedisStore struct {
    client *redis.Client
    ttl    time.Duration
    prefix string // Key prefix for namespacing
}

// NewRedisStore creates a new Redis-backed store
func NewRedisStore(client *redis.Client, ttl time.Duration) *RedisStore {
    return &RedisStore{
        client: client,
        ttl:    ttl,
        prefix: "idempotency:",
    }
}

func (s *RedisStore) key(idempotencyKey string) string {
    return s.prefix + idempotencyKey
}

func (s *RedisStore) Get(key string) (*Response, error) {
    ctx := context.Background()

    data, err := s.client.Get(ctx, s.key(key)).Bytes()
    if errors.Is(err, redis.Nil) {
        return nil, nil // Key not found
    }
    if err != nil {
        return nil, err
    }

    var resp Response
    if err := json.Unmarshal(data, &resp); err != nil {
        return nil, err
    }

    return &resp, nil
}

func (s *RedisStore) Set(key string, response *Response) error {
    ctx := context.Background()

    response.CreatedAt = time.Now()
    data, err := json.Marshal(response)
    if err != nil {
        return err
    }

    return s.client.Set(ctx, s.key(key), data, s.ttl).Err()
}

func (s *RedisStore) SetProcessing(key string) (bool, error) {
    ctx := context.Background()

    // Use SET NX (set if not exists) for atomic locking
    // This ensures only one request can claim the key
    ok, err := s.client.SetNX(ctx, s.key(key), `{"status_code":0}`, s.ttl).Result()
    if err != nil {
        return false, err
    }

    return ok, nil
}

func (s *RedisStore) Delete(key string) error {
    ctx := context.Background()
    return s.client.Del(ctx, s.key(key)).Err()
}
```

---

## Putting It Together

Here's how to wire everything together in a real application.

```go
// main.go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "time"

    "github.com/redis/go-redis/v9"
    "yourapp/idempotency"
)

func main() {
    // Initialize Redis client
    redisClient := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })

    // Create idempotency store with 24-hour TTL
    store := idempotency.NewRedisStore(redisClient, 24*time.Hour)
    middleware := idempotency.NewMiddleware(store)

    // Create your API handlers
    mux := http.NewServeMux()

    // Payment endpoint - must be idempotent
    mux.HandleFunc("/api/payments", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
            http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
            return
        }

        var req struct {
            Amount   int64  `json:"amount"`
            Currency string `json:"currency"`
        }

        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
            http.Error(w, "Invalid request", http.StatusBadRequest)
            return
        }

        // Process payment - this only runs once per idempotency key
        paymentID := processPayment(req.Amount, req.Currency)

        w.Header().Set("Content-Type", "application/json")
        w.WriteHeader(http.StatusCreated)
        json.NewEncoder(w).Encode(map[string]string{
            "payment_id": paymentID,
            "status":     "completed",
        })
    })

    // Wrap the mux with idempotency middleware
    handler := middleware.Wrap(mux)

    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", handler))
}

func processPayment(amount int64, currency string) string {
    // Your actual payment processing logic
    return "pay_" + generateID()
}
```

---

## Client-Side Implementation

Clients need to generate unique keys and handle retries properly.

```go
// client/client.go
package client

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"

    "github.com/google/uuid"
)

// APIClient wraps HTTP calls with idempotency support
type APIClient struct {
    baseURL    string
    httpClient *http.Client
    maxRetries int
}

// NewAPIClient creates a client with retry configuration
func NewAPIClient(baseURL string) *APIClient {
    return &APIClient{
        baseURL: baseURL,
        httpClient: &http.Client{
            Timeout: 30 * time.Second,
        },
        maxRetries: 3,
    }
}

// CreatePayment sends a payment request with automatic retries
func (c *APIClient) CreatePayment(amount int64, currency string) (*PaymentResponse, error) {
    // Generate idempotency key once for all retries
    idempotencyKey := uuid.New().String()

    payload := map[string]interface{}{
        "amount":   amount,
        "currency": currency,
    }

    var lastErr error

    for attempt := 0; attempt <= c.maxRetries; attempt++ {
        if attempt > 0 {
            // Exponential backoff between retries
            backoff := time.Duration(1<<uint(attempt-1)) * time.Second
            time.Sleep(backoff)
        }

        resp, err := c.doRequest("POST", "/api/payments", idempotencyKey, payload)
        if err != nil {
            lastErr = err
            continue // Network error - retry
        }
        defer resp.Body.Close()

        // Check if response was replayed from cache
        if resp.Header.Get("Idempotency-Replayed") == "true" {
            fmt.Println("Response was replayed from idempotency cache")
        }

        // Handle response based on status code
        switch resp.StatusCode {
        case http.StatusCreated, http.StatusOK:
            var result PaymentResponse
            if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
                return nil, err
            }
            return &result, nil

        case http.StatusConflict:
            // Another request is processing - wait and retry
            lastErr = fmt.Errorf("request in progress")
            continue

        case http.StatusInternalServerError, http.StatusServiceUnavailable:
            // Server error - retry with same idempotency key
            body, _ := io.ReadAll(resp.Body)
            lastErr = fmt.Errorf("server error: %s", body)
            continue

        default:
            // Client error - don't retry
            body, _ := io.ReadAll(resp.Body)
            return nil, fmt.Errorf("request failed: %d - %s", resp.StatusCode, body)
        }
    }

    return nil, fmt.Errorf("max retries exceeded: %w", lastErr)
}

func (c *APIClient) doRequest(method, path, idempotencyKey string, payload interface{}) (*http.Response, error) {
    body, err := json.Marshal(payload)
    if err != nil {
        return nil, err
    }

    req, err := http.NewRequest(method, c.baseURL+path, bytes.NewReader(body))
    if err != nil {
        return nil, err
    }

    req.Header.Set("Content-Type", "application/json")
    req.Header.Set("Idempotency-Key", idempotencyKey)

    return c.httpClient.Do(req)
}

type PaymentResponse struct {
    PaymentID string `json:"payment_id"`
    Status    string `json:"status"`
}
```

---

## Key Design Decisions

**TTL Selection**: Choose a TTL that balances storage costs with retry windows. 24 hours works well for most APIs. Payment systems might use 48-72 hours to handle weekend edge cases.

**Key Generation**: Clients should generate UUIDs for idempotency keys. Alternatively, use a hash of the request parameters, but this requires careful consideration of which fields to include.

**Error Handling**: Store error responses too. If a request fails validation, retries should get the same validation error rather than potentially succeeding if data changed.

**Concurrent Requests**: The SetProcessing lock prevents duplicate work when two retries arrive simultaneously. Return 409 Conflict so clients know to wait.

**Scope**: Apply idempotency to all mutating operations (POST, PUT, DELETE). GET requests are naturally idempotent and don't need this protection.

---

## Testing Your Implementation

Write tests that verify the idempotency behavior works correctly under various scenarios.

```go
func TestIdempotencyMiddleware(t *testing.T) {
    store := idempotency.NewMemoryStore(time.Hour)
    middleware := idempotency.NewMiddleware(store)

    callCount := 0
    handler := middleware.Wrap(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        callCount++
        w.WriteHeader(http.StatusCreated)
        w.Write([]byte(`{"id":"123"}`))
    }))

    // First request
    req1 := httptest.NewRequest("POST", "/", nil)
    req1.Header.Set("Idempotency-Key", "test-key")
    rec1 := httptest.NewRecorder()
    handler.ServeHTTP(rec1, req1)

    // Second request with same key
    req2 := httptest.NewRequest("POST", "/", nil)
    req2.Header.Set("Idempotency-Key", "test-key")
    rec2 := httptest.NewRecorder()
    handler.ServeHTTP(rec2, req2)

    // Handler should only be called once
    if callCount != 1 {
        t.Errorf("Expected handler to be called once, got %d", callCount)
    }

    // Both responses should be identical
    if rec1.Body.String() != rec2.Body.String() {
        t.Error("Responses should be identical")
    }

    // Second response should be marked as replayed
    if rec2.Header().Get("Idempotency-Replayed") != "true" {
        t.Error("Second response should be marked as replayed")
    }
}
```

---

## Wrapping Up

Idempotency keys are essential for building reliable APIs. They protect against duplicate operations during network failures, client retries, and distributed system edge cases. The implementation is straightforward - store request results keyed by a client-provided identifier and return cached results for duplicate keys.

Start with the in-memory store for development, then move to Redis for production. The middleware approach keeps your handlers clean while providing automatic idempotency for all mutating endpoints.

The patterns shown here mirror what Stripe, PayPal, and other financial APIs use in production. Your clients will thank you when their retry logic just works without creating duplicate charges.

---

*Building APIs that need bulletproof reliability? [OneUptime](https://oneuptime.com) helps you monitor your Go services with real-time alerting, distributed tracing, and comprehensive observability.*
