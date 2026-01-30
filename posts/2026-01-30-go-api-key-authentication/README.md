# How to Implement API Key Authentication in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Security, API, Authentication

Description: Implement secure API key authentication in Go with middleware, secure storage, rate limiting per key, and key rotation strategies for production APIs.

---

API key authentication remains one of the most common methods for securing APIs. Unlike OAuth or JWT tokens, API keys provide a straightforward way to authenticate machine-to-machine communication, webhook integrations, and third-party access to your services. This guide walks through building a production-ready API key authentication system in Go.

## Table of Contents

1. [Generating Secure API Keys](#generating-secure-api-keys)
2. [Secure Storage with Hashing](#secure-storage-with-hashing)
3. [Middleware Implementation](#middleware-implementation)
4. [Extracting Keys from Headers and Query Parameters](#extracting-keys-from-headers-and-query-parameters)
5. [Rate Limiting Per Key](#rate-limiting-per-key)
6. [Key Scopes and Permissions](#key-scopes-and-permissions)
7. [Key Rotation Strategies](#key-rotation-strategies)
8. [Putting It All Together](#putting-it-all-together)

## Generating Secure API Keys

A good API key needs to be unique, unpredictable, and have enough entropy to resist brute-force attacks. The standard approach combines a prefix for identification with a cryptographically random string.

Here is the key generation code that produces keys with a prefix, timestamp component, and random bytes:

```go
package apikey

import (
    "crypto/rand"
    "encoding/base64"
    "fmt"
    "strings"
    "time"
)

const (
    // KeyLength defines the number of random bytes in the key
    KeyLength = 32
    // PrefixLength is the visible prefix for key identification
    PrefixLength = 8
)

// APIKey represents a generated API key with metadata
type APIKey struct {
    ID        string    // Unique identifier for the key
    Key       string    // The full API key (only shown once)
    Prefix    string    // Visible prefix for identification
    CreatedAt time.Time // When the key was created
    ExpiresAt time.Time // When the key expires (zero value means no expiry)
}

// Generate creates a new API key with the given prefix
// The prefix helps identify the key type (e.g., "sk_live_" for production)
func Generate(prefix string) (*APIKey, error) {
    // Generate random bytes for the key
    randomBytes := make([]byte, KeyLength)
    if _, err := rand.Read(randomBytes); err != nil {
        return nil, fmt.Errorf("failed to generate random bytes: %w", err)
    }

    // Encode to base64 and remove padding for cleaner keys
    encoded := base64.URLEncoding.EncodeToString(randomBytes)
    encoded = strings.TrimRight(encoded, "=")

    // Build the full key with prefix
    fullKey := fmt.Sprintf("%s%s", prefix, encoded)

    // Extract the visible prefix (first N characters after the type prefix)
    visiblePrefix := fullKey[:len(prefix)+PrefixLength]

    return &APIKey{
        ID:        generateID(),
        Key:       fullKey,
        Prefix:    visiblePrefix,
        CreatedAt: time.Now().UTC(),
    }, nil
}

// generateID creates a unique identifier for internal tracking
func generateID() string {
    b := make([]byte, 16)
    rand.Read(b)
    return fmt.Sprintf("%x", b)
}
```

The prefix convention matters for operational purposes. Common patterns include:

| Prefix | Purpose |
|--------|---------|
| `sk_live_` | Production secret key |
| `sk_test_` | Test/sandbox secret key |
| `pk_live_` | Production publishable key |
| `pk_test_` | Test publishable key |
| `whsec_` | Webhook signing secret |

## Secure Storage with Hashing

Never store API keys in plain text. Like passwords, API keys should be hashed before storage. However, unlike passwords, we need fast lookups, so we use SHA-256 instead of bcrypt.

The hashing implementation uses SHA-256 with a consistent format for storage:

```go
package apikey

import (
    "crypto/sha256"
    "crypto/subtle"
    "encoding/hex"
)

// HashKey creates a SHA-256 hash of the API key for secure storage
// This is a one-way operation - the original key cannot be recovered
func HashKey(key string) string {
    hash := sha256.Sum256([]byte(key))
    return hex.EncodeToString(hash[:])
}

// VerifyKey compares a provided key against a stored hash
// Uses constant-time comparison to prevent timing attacks
func VerifyKey(providedKey, storedHash string) bool {
    providedHash := HashKey(providedKey)
    return subtle.ConstantTimeCompare([]byte(providedHash), []byte(storedHash)) == 1
}

// StoredKey represents an API key as stored in the database
type StoredKey struct {
    ID           string   // Unique identifier
    Hash         string   // SHA-256 hash of the full key
    Prefix       string   // Visible prefix for identification
    Name         string   // Human-readable name
    Scopes       []string // Permissions granted to this key
    RateLimit    int      // Requests per minute (0 = unlimited)
    UserID       string   // Owner of the key
    CreatedAt    int64    // Unix timestamp
    LastUsedAt   int64    // Unix timestamp of last use
    ExpiresAt    int64    // Unix timestamp (0 = never)
    Revoked      bool     // Whether the key has been revoked
}
```

The database schema for PostgreSQL would look like this:

```sql
CREATE TABLE api_keys (
    id VARCHAR(64) PRIMARY KEY,
    hash VARCHAR(64) NOT NULL UNIQUE,
    prefix VARCHAR(32) NOT NULL,
    name VARCHAR(255) NOT NULL,
    scopes TEXT[] DEFAULT '{}',
    rate_limit INTEGER DEFAULT 0,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    revoked BOOLEAN DEFAULT FALSE,

    INDEX idx_api_keys_hash (hash),
    INDEX idx_api_keys_prefix (prefix),
    INDEX idx_api_keys_user_id (user_id)
);
```

## Middleware Implementation

The authentication middleware validates incoming requests and attaches the key information to the request context for downstream handlers.

This middleware handles key extraction, validation, and context injection:

```go
package middleware

import (
    "context"
    "net/http"
    "strings"
    "time"
)

// contextKey is a custom type for context keys to avoid collisions
type contextKey string

const (
    // APIKeyContextKey is used to store the validated key in request context
    APIKeyContextKey contextKey = "api_key"
)

// KeyStore defines the interface for API key storage operations
type KeyStore interface {
    GetByHash(ctx context.Context, hash string) (*StoredKey, error)
    UpdateLastUsed(ctx context.Context, keyID string, timestamp time.Time) error
}

// APIKeyAuth creates middleware for API key authentication
type APIKeyAuth struct {
    store       KeyStore
    headerName  string
    queryParam  string
}

// NewAPIKeyAuth creates a new API key authentication middleware
func NewAPIKeyAuth(store KeyStore) *APIKeyAuth {
    return &APIKeyAuth{
        store:      store,
        headerName: "X-API-Key",
        queryParam: "api_key",
    }
}

// Middleware returns the HTTP middleware function
func (a *APIKeyAuth) Middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Extract the API key from the request
        key := a.extractKey(r)
        if key == "" {
            http.Error(w, `{"error": "missing API key"}`, http.StatusUnauthorized)
            return
        }

        // Hash the provided key and look it up
        hash := HashKey(key)
        storedKey, err := a.store.GetByHash(r.Context(), hash)
        if err != nil {
            http.Error(w, `{"error": "invalid API key"}`, http.StatusUnauthorized)
            return
        }

        // Check if the key has been revoked
        if storedKey.Revoked {
            http.Error(w, `{"error": "API key has been revoked"}`, http.StatusUnauthorized)
            return
        }

        // Check if the key has expired
        if storedKey.ExpiresAt > 0 && time.Now().Unix() > storedKey.ExpiresAt {
            http.Error(w, `{"error": "API key has expired"}`, http.StatusUnauthorized)
            return
        }

        // Update last used timestamp asynchronously
        go a.store.UpdateLastUsed(context.Background(), storedKey.ID, time.Now())

        // Add the key info to the request context
        ctx := context.WithValue(r.Context(), APIKeyContextKey, storedKey)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// extractKey attempts to get the API key from headers or query params
func (a *APIKeyAuth) extractKey(r *http.Request) string {
    // Try the header first (preferred method)
    if key := r.Header.Get(a.headerName); key != "" {
        return key
    }

    // Try Authorization header with Bearer scheme
    if auth := r.Header.Get("Authorization"); auth != "" {
        if strings.HasPrefix(auth, "Bearer ") {
            return strings.TrimPrefix(auth, "Bearer ")
        }
    }

    // Fall back to query parameter (not recommended for sensitive operations)
    return r.URL.Query().Get(a.queryParam)
}

// GetAPIKey retrieves the validated API key from the request context
func GetAPIKey(ctx context.Context) *StoredKey {
    key, ok := ctx.Value(APIKeyContextKey).(*StoredKey)
    if !ok {
        return nil
    }
    return key
}
```

## Extracting Keys from Headers and Query Parameters

The extraction logic supports multiple methods for flexibility. Here is a comparison of the different approaches:

| Method | Security | Use Case |
|--------|----------|----------|
| `X-API-Key` header | High | Standard API calls |
| `Authorization: Bearer` | High | OAuth-compatible clients |
| Query parameter | Low | Webhooks, signed URLs |

The following code provides a more robust extraction with validation:

```go
package middleware

import (
    "errors"
    "net/http"
    "regexp"
    "strings"
)

var (
    ErrNoAPIKey      = errors.New("no API key provided")
    ErrInvalidFormat = errors.New("invalid API key format")
)

// KeyExtractor handles API key extraction from requests
type KeyExtractor struct {
    // AllowedPrefixes restricts which key prefixes are accepted
    AllowedPrefixes []string
    // HeaderNames lists headers to check (in order of preference)
    HeaderNames []string
    // QueryParams lists query parameters to check
    QueryParams []string
    // ValidateFormat enables regex validation of key format
    ValidateFormat bool
    // KeyPattern is the regex pattern for valid keys
    KeyPattern *regexp.Regexp
}

// DefaultExtractor creates an extractor with sensible defaults
func DefaultExtractor() *KeyExtractor {
    return &KeyExtractor{
        AllowedPrefixes: []string{"sk_live_", "sk_test_"},
        HeaderNames:     []string{"X-API-Key", "Authorization"},
        QueryParams:     []string{"api_key", "apikey"},
        ValidateFormat:  true,
        KeyPattern:      regexp.MustCompile(`^(sk|pk)_(live|test)_[A-Za-z0-9_-]{32,}$`),
    }
}

// Extract retrieves and validates the API key from a request
func (e *KeyExtractor) Extract(r *http.Request) (string, error) {
    key := e.extractFromHeaders(r)
    if key == "" {
        key = e.extractFromQuery(r)
    }

    if key == "" {
        return "", ErrNoAPIKey
    }

    // Validate the key format if enabled
    if e.ValidateFormat && !e.KeyPattern.MatchString(key) {
        return "", ErrInvalidFormat
    }

    // Check if the prefix is allowed
    if len(e.AllowedPrefixes) > 0 {
        allowed := false
        for _, prefix := range e.AllowedPrefixes {
            if strings.HasPrefix(key, prefix) {
                allowed = true
                break
            }
        }
        if !allowed {
            return "", ErrInvalidFormat
        }
    }

    return key, nil
}

func (e *KeyExtractor) extractFromHeaders(r *http.Request) string {
    for _, header := range e.HeaderNames {
        value := r.Header.Get(header)
        if value == "" {
            continue
        }

        // Handle Authorization header specially
        if header == "Authorization" {
            if strings.HasPrefix(value, "Bearer ") {
                return strings.TrimPrefix(value, "Bearer ")
            }
            if strings.HasPrefix(value, "ApiKey ") {
                return strings.TrimPrefix(value, "ApiKey ")
            }
            continue
        }

        return value
    }
    return ""
}

func (e *KeyExtractor) extractFromQuery(r *http.Request) string {
    for _, param := range e.QueryParams {
        if value := r.URL.Query().Get(param); value != "" {
            return value
        }
    }
    return ""
}
```

## Rate Limiting Per Key

Rate limiting protects your API from abuse and ensures fair usage. Each API key can have its own rate limit based on the subscription tier or trust level.

This implementation uses a sliding window algorithm with Redis for distributed rate limiting:

```go
package ratelimit

import (
    "context"
    "fmt"
    "sync"
    "time"
)

// RateLimiter defines the interface for rate limiting implementations
type RateLimiter interface {
    Allow(ctx context.Context, key string, limit int) (bool, RateLimitInfo, error)
}

// RateLimitInfo contains information about the current rate limit state
type RateLimitInfo struct {
    Limit      int       // Maximum requests allowed
    Remaining  int       // Requests remaining in current window
    ResetAt    time.Time // When the limit resets
    RetryAfter int       // Seconds to wait before retrying (if limited)
}

// SlidingWindowLimiter implements rate limiting with a sliding window
type SlidingWindowLimiter struct {
    windows map[string]*window
    mu      sync.RWMutex
    window  time.Duration
}

type window struct {
    count     int
    startTime time.Time
}

// NewSlidingWindowLimiter creates a new sliding window rate limiter
func NewSlidingWindowLimiter(windowSize time.Duration) *SlidingWindowLimiter {
    limiter := &SlidingWindowLimiter{
        windows: make(map[string]*window),
        window:  windowSize,
    }

    // Start cleanup goroutine to remove expired windows
    go limiter.cleanup()

    return limiter
}

// Allow checks if a request should be allowed for the given key
func (l *SlidingWindowLimiter) Allow(ctx context.Context, key string, limit int) (bool, RateLimitInfo, error) {
    l.mu.Lock()
    defer l.mu.Unlock()

    now := time.Now()
    w, exists := l.windows[key]

    // Create new window if none exists or current window has expired
    if !exists || now.Sub(w.startTime) > l.window {
        l.windows[key] = &window{
            count:     1,
            startTime: now,
        }
        return true, RateLimitInfo{
            Limit:     limit,
            Remaining: limit - 1,
            ResetAt:   now.Add(l.window),
        }, nil
    }

    // Check if we are within the limit
    if w.count >= limit {
        resetAt := w.startTime.Add(l.window)
        return false, RateLimitInfo{
            Limit:      limit,
            Remaining:  0,
            ResetAt:    resetAt,
            RetryAfter: int(time.Until(resetAt).Seconds()) + 1,
        }, nil
    }

    // Increment the counter
    w.count++
    return true, RateLimitInfo{
        Limit:     limit,
        Remaining: limit - w.count,
        ResetAt:   w.startTime.Add(l.window),
    }, nil
}

// cleanup removes expired windows periodically
func (l *SlidingWindowLimiter) cleanup() {
    ticker := time.NewTicker(l.window)
    for range ticker.C {
        l.mu.Lock()
        now := time.Now()
        for key, w := range l.windows {
            if now.Sub(w.startTime) > l.window*2 {
                delete(l.windows, key)
            }
        }
        l.mu.Unlock()
    }
}
```

The rate limiting middleware integrates with the authentication middleware:

```go
package middleware

import (
    "fmt"
    "net/http"
    "strconv"
)

// RateLimitMiddleware creates middleware that enforces per-key rate limits
func RateLimitMiddleware(limiter RateLimiter) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Get the API key from context (set by auth middleware)
            apiKey := GetAPIKey(r.Context())
            if apiKey == nil {
                next.ServeHTTP(w, r)
                return
            }

            // Skip rate limiting if no limit is set
            if apiKey.RateLimit == 0 {
                next.ServeHTTP(w, r)
                return
            }

            // Check the rate limit
            allowed, info, err := limiter.Allow(r.Context(), apiKey.ID, apiKey.RateLimit)
            if err != nil {
                http.Error(w, `{"error": "rate limit check failed"}`, http.StatusInternalServerError)
                return
            }

            // Set rate limit headers
            w.Header().Set("X-RateLimit-Limit", strconv.Itoa(info.Limit))
            w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(info.Remaining))
            w.Header().Set("X-RateLimit-Reset", strconv.FormatInt(info.ResetAt.Unix(), 10))

            if !allowed {
                w.Header().Set("Retry-After", strconv.Itoa(info.RetryAfter))
                http.Error(w, `{"error": "rate limit exceeded"}`, http.StatusTooManyRequests)
                return
            }

            next.ServeHTTP(w, r)
        })
    }
}
```

## Key Scopes and Permissions

Scopes allow fine-grained access control. Instead of all-or-nothing access, you can restrict what operations each key can perform.

The scope system defines available permissions and validates them against requests:

```go
package apikey

import (
    "context"
    "errors"
    "net/http"
    "strings"
)

// Scope represents a permission that can be granted to an API key
type Scope string

// Common scopes for API operations
const (
    ScopeReadUsers    Scope = "users:read"
    ScopeWriteUsers   Scope = "users:write"
    ScopeDeleteUsers  Scope = "users:delete"
    ScopeReadOrders   Scope = "orders:read"
    ScopeWriteOrders  Scope = "orders:write"
    ScopeReadReports  Scope = "reports:read"
    ScopeAdmin        Scope = "admin"
    ScopeAll          Scope = "*"
)

// ScopeDefinition describes a scope and its capabilities
type ScopeDefinition struct {
    Name        Scope
    Description string
    Includes    []Scope // Other scopes this scope includes
}

// ScopeRegistry manages available scopes and their relationships
type ScopeRegistry struct {
    scopes map[Scope]ScopeDefinition
}

// NewScopeRegistry creates a registry with default scopes
func NewScopeRegistry() *ScopeRegistry {
    r := &ScopeRegistry{
        scopes: make(map[Scope]ScopeDefinition),
    }

    // Register default scopes
    r.Register(ScopeDefinition{
        Name:        ScopeAll,
        Description: "Full access to all resources",
    })
    r.Register(ScopeDefinition{
        Name:        ScopeAdmin,
        Description: "Administrative access",
        Includes:    []Scope{ScopeReadUsers, ScopeWriteUsers, ScopeDeleteUsers},
    })
    r.Register(ScopeDefinition{
        Name:        ScopeReadUsers,
        Description: "Read user information",
    })
    r.Register(ScopeDefinition{
        Name:        ScopeWriteUsers,
        Description: "Create and update users",
        Includes:    []Scope{ScopeReadUsers},
    })

    return r
}

// Register adds a new scope to the registry
func (r *ScopeRegistry) Register(def ScopeDefinition) {
    r.scopes[def.Name] = def
}

// HasScope checks if the given scopes include the required scope
func (r *ScopeRegistry) HasScope(grantedScopes []string, required Scope) bool {
    for _, granted := range grantedScopes {
        scope := Scope(granted)

        // Check for wildcard scope
        if scope == ScopeAll {
            return true
        }

        // Direct match
        if scope == required {
            return true
        }

        // Check if granted scope includes the required scope
        if def, ok := r.scopes[scope]; ok {
            for _, included := range def.Includes {
                if included == required {
                    return true
                }
            }
        }

        // Check for prefix matching (e.g., "users:*" includes "users:read")
        if strings.HasSuffix(string(scope), ":*") {
            prefix := strings.TrimSuffix(string(scope), "*")
            if strings.HasPrefix(string(required), prefix) {
                return true
            }
        }
    }

    return false
}

// RequireScope creates middleware that enforces a specific scope
func RequireScope(registry *ScopeRegistry, required Scope) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            apiKey := GetAPIKey(r.Context())
            if apiKey == nil {
                http.Error(w, `{"error": "unauthorized"}`, http.StatusUnauthorized)
                return
            }

            if !registry.HasScope(apiKey.Scopes, required) {
                http.Error(w, `{"error": "insufficient permissions"}`, http.StatusForbidden)
                return
            }

            next.ServeHTTP(w, r)
        })
    }
}
```

## Key Rotation Strategies

Key rotation is critical for security. When a key might be compromised, or as part of regular security hygiene, you need a way to rotate keys without service interruption.

This implementation supports graceful key rotation with overlap periods:

```go
package apikey

import (
    "context"
    "time"
)

// KeyRotation handles the rotation of API keys
type KeyRotation struct {
    store          KeyStore
    overlapPeriod  time.Duration
}

// NewKeyRotation creates a new key rotation handler
func NewKeyRotation(store KeyStore, overlapPeriod time.Duration) *KeyRotation {
    return &KeyRotation{
        store:         store,
        overlapPeriod: overlapPeriod,
    }
}

// RotationResult contains the old and new key information
type RotationResult struct {
    OldKeyID      string
    OldKeyExpiry  time.Time
    NewKey        *APIKey
    OverlapEnds   time.Time
}

// RotateKey creates a new key and schedules the old one for expiration
func (kr *KeyRotation) RotateKey(ctx context.Context, oldKeyID string) (*RotationResult, error) {
    // Get the existing key
    oldKey, err := kr.store.GetByID(ctx, oldKeyID)
    if err != nil {
        return nil, err
    }

    // Generate a new key with the same configuration
    prefix := extractPrefix(oldKey.Prefix)
    newAPIKey, err := Generate(prefix)
    if err != nil {
        return nil, err
    }

    // Set up the new key with the same scopes and limits
    newStoredKey := &StoredKey{
        ID:        newAPIKey.ID,
        Hash:      HashKey(newAPIKey.Key),
        Prefix:    newAPIKey.Prefix,
        Name:      oldKey.Name + " (rotated)",
        Scopes:    oldKey.Scopes,
        RateLimit: oldKey.RateLimit,
        UserID:    oldKey.UserID,
        CreatedAt: time.Now().Unix(),
    }

    // Save the new key
    if err := kr.store.Create(ctx, newStoredKey); err != nil {
        return nil, err
    }

    // Set expiration on the old key (allowing overlap period)
    expiryTime := time.Now().Add(kr.overlapPeriod)
    if err := kr.store.SetExpiry(ctx, oldKeyID, expiryTime); err != nil {
        return nil, err
    }

    return &RotationResult{
        OldKeyID:     oldKeyID,
        OldKeyExpiry: expiryTime,
        NewKey:       newAPIKey,
        OverlapEnds:  expiryTime,
    }, nil
}

// ScheduledRotation sets up automatic key rotation
type ScheduledRotation struct {
    rotation *KeyRotation
    store    KeyStore
    interval time.Duration
    maxAge   time.Duration
}

// NewScheduledRotation creates automatic rotation based on key age
func NewScheduledRotation(rotation *KeyRotation, store KeyStore, interval, maxAge time.Duration) *ScheduledRotation {
    return &ScheduledRotation{
        rotation: rotation,
        store:    store,
        interval: interval,
        maxAge:   maxAge,
    }
}

// Start begins the scheduled rotation process
func (sr *ScheduledRotation) Start(ctx context.Context) {
    ticker := time.NewTicker(sr.interval)
    go func() {
        for {
            select {
            case <-ctx.Done():
                ticker.Stop()
                return
            case <-ticker.C:
                sr.rotateOldKeys(ctx)
            }
        }
    }()
}

func (sr *ScheduledRotation) rotateOldKeys(ctx context.Context) {
    cutoff := time.Now().Add(-sr.maxAge)
    oldKeys, err := sr.store.GetKeysCreatedBefore(ctx, cutoff)
    if err != nil {
        return
    }

    for _, key := range oldKeys {
        if key.Revoked {
            continue
        }
        // Notify the key owner about upcoming rotation
        // In production, you would send an email or webhook here
        sr.rotation.RotateKey(ctx, key.ID)
    }
}

func extractPrefix(visiblePrefix string) string {
    // Extract the type prefix from the visible prefix
    // e.g., "sk_live_abc123" -> "sk_live_"
    for _, p := range []string{"sk_live_", "sk_test_", "pk_live_", "pk_test_"} {
        if len(visiblePrefix) >= len(p) && visiblePrefix[:len(p)] == p {
            return p
        }
    }
    return "sk_"
}
```

## Putting It All Together

Here is a complete example that combines all the components into a working API server:

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "net/http"
    "time"

    "github.com/gorilla/mux"
)

func main() {
    // Initialize components
    keyStore := NewInMemoryKeyStore() // Use your preferred storage
    scopeRegistry := NewScopeRegistry()
    rateLimiter := NewSlidingWindowLimiter(time.Minute)
    keyRotation := NewKeyRotation(keyStore, 24*time.Hour)

    // Create middleware instances
    auth := NewAPIKeyAuth(keyStore)
    rateLimit := RateLimitMiddleware(rateLimiter)

    // Set up router
    r := mux.NewRouter()

    // Public routes (no authentication)
    r.HandleFunc("/health", healthHandler).Methods("GET")
    r.HandleFunc("/api/keys", createKeyHandler(keyStore)).Methods("POST")

    // Protected routes
    api := r.PathPrefix("/api/v1").Subrouter()
    api.Use(auth.Middleware)
    api.Use(rateLimit)

    // User routes with scope requirements
    api.Handle("/users", RequireScope(scopeRegistry, ScopeReadUsers)(
        http.HandlerFunc(listUsersHandler),
    )).Methods("GET")

    api.Handle("/users", RequireScope(scopeRegistry, ScopeWriteUsers)(
        http.HandlerFunc(createUserHandler),
    )).Methods("POST")

    // Key management routes
    api.HandleFunc("/keys/rotate", rotateKeyHandler(keyRotation)).Methods("POST")

    // Start server
    log.Println("Starting server on :8080")
    log.Fatal(http.ListenAndServe(":8080", r))
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
}

func createKeyHandler(store KeyStore) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        var req struct {
            Name   string   `json:"name"`
            Scopes []string `json:"scopes"`
            UserID string   `json:"user_id"`
        }

        if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
            http.Error(w, `{"error": "invalid request body"}`, http.StatusBadRequest)
            return
        }

        // Generate the key
        apiKey, err := Generate("sk_live_")
        if err != nil {
            http.Error(w, `{"error": "failed to generate key"}`, http.StatusInternalServerError)
            return
        }

        // Store the key
        storedKey := &StoredKey{
            ID:        apiKey.ID,
            Hash:      HashKey(apiKey.Key),
            Prefix:    apiKey.Prefix,
            Name:      req.Name,
            Scopes:    req.Scopes,
            RateLimit: 100, // Default rate limit
            UserID:    req.UserID,
            CreatedAt: time.Now().Unix(),
        }

        if err := store.Create(r.Context(), storedKey); err != nil {
            http.Error(w, `{"error": "failed to store key"}`, http.StatusInternalServerError)
            return
        }

        // Return the key (this is the only time the full key is shown)
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]interface{}{
            "id":      apiKey.ID,
            "key":     apiKey.Key, // Only shown once!
            "prefix":  apiKey.Prefix,
            "name":    req.Name,
            "message": "Store this key securely. It will not be shown again.",
        })
    }
}

func listUsersHandler(w http.ResponseWriter, r *http.Request) {
    // Get the API key to access metadata
    apiKey := GetAPIKey(r.Context())

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "users":      []string{"user1", "user2"},
        "requested_by": apiKey.Name,
    })
}

func createUserHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "user created"})
}

func rotateKeyHandler(rotation *KeyRotation) http.HandlerFunc {
    return func(w http.ResponseWriter, r *http.Request) {
        apiKey := GetAPIKey(r.Context())
        if apiKey == nil {
            http.Error(w, `{"error": "unauthorized"}`, http.StatusUnauthorized)
            return
        }

        result, err := rotation.RotateKey(r.Context(), apiKey.ID)
        if err != nil {
            http.Error(w, `{"error": "failed to rotate key"}`, http.StatusInternalServerError)
            return
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]interface{}{
            "new_key":        result.NewKey.Key,
            "new_key_prefix": result.NewKey.Prefix,
            "old_key_expires": result.OldKeyExpiry.Format(time.RFC3339),
            "message": "Your old key will continue to work until the expiry time.",
        })
    }
}
```

## Security Best Practices

When implementing API key authentication, keep these practices in mind:

1. **Always use HTTPS** - API keys sent over HTTP can be intercepted
2. **Hash keys before storage** - Never store plain text keys in your database
3. **Use constant-time comparison** - Prevents timing attacks during verification
4. **Implement rate limiting** - Protects against brute force and abuse
5. **Log key usage** - Audit trails help detect compromised keys
6. **Set expiration dates** - Keys should not live forever
7. **Support multiple active keys** - Allows rotation without downtime
8. **Provide key revocation** - Immediate invalidation when keys are compromised

## Conclusion

Building API key authentication in Go requires attention to security at every layer. The implementation covered here provides cryptographically secure key generation, proper hashing for storage, flexible middleware for authentication, per-key rate limiting, granular scopes for authorization, and rotation strategies for operational security.

The code is designed to be modular, so you can adapt each component to your specific needs. For production use, consider adding metrics collection, more sophisticated rate limiting with Redis, and integration with your existing user management system.

Remember that API keys are credentials. Treat them with the same care you would treat passwords or private keys. Your users are trusting you with access to their systems when they use your API keys.
