# How to Implement API Key Authentication in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, API Key, Authentication, Security, API

Description: Implement secure API key authentication in Go with proper key generation, secure storage, rate limiting, and rotation strategies.

---

API key authentication is one of the most common methods for securing APIs. Unlike OAuth or JWT tokens, API keys are simple to implement and easy for developers to use. However, this simplicity can lead to security vulnerabilities if not implemented correctly. In this comprehensive guide, we will build a production-ready API key authentication system in Go, covering secure key generation, storage, validation, rate limiting, and rotation strategies.

## Prerequisites

Before we begin, ensure you have:

- Go 1.21 or later installed
- Basic understanding of Go and HTTP handlers
- PostgreSQL or another database for persistent storage
- Redis for rate limiting (optional but recommended)

## Project Structure

We will organize our project with a clean structure that separates concerns:

```
api-key-auth/
├── main.go
├── auth/
│   ├── generator.go      # Key generation
│   ├── hasher.go         # Key hashing
│   ├── validator.go      # Key validation
│   └── middleware.go     # HTTP middleware
├── models/
│   └── apikey.go         # API key model
├── store/
│   └── postgres.go       # Database operations
├── ratelimit/
│   └── limiter.go        # Rate limiting
└── audit/
    └── logger.go         # Audit logging
```

## 1. Cryptographically Secure Key Generation

The foundation of API key security starts with proper key generation. We need keys that are truly random and have enough entropy to resist brute-force attacks.

The following code generates a cryptographically secure API key with a prefix for easy identification:

```go
package auth

import (
    "crypto/rand"
    "encoding/base64"
    "fmt"
    "strings"
)

const (
    // KeyLength defines the number of random bytes to generate
    // 32 bytes = 256 bits of entropy, sufficient for security
    KeyLength = 32

    // KeyPrefix helps identify the key type and version
    // Format: {prefix}_{version}_{randomPart}
    KeyPrefix = "ouk"  // OneUptime Key
    KeyVersion = "v1"
)

// APIKeyGenerator handles secure API key generation
type APIKeyGenerator struct {
    prefix  string
    version string
}

// NewAPIKeyGenerator creates a new generator with default settings
func NewAPIKeyGenerator() *APIKeyGenerator {
    return &APIKeyGenerator{
        prefix:  KeyPrefix,
        version: KeyVersion,
    }
}

// Generate creates a new cryptographically secure API key
// Returns the full key (for the user) and the key ID (for lookups)
func (g *APIKeyGenerator) Generate() (fullKey string, keyID string, err error) {
    // Generate random bytes using crypto/rand for cryptographic security
    randomBytes := make([]byte, KeyLength)
    if _, err := rand.Read(randomBytes); err != nil {
        return "", "", fmt.Errorf("failed to generate random bytes: %w", err)
    }

    // Encode to URL-safe base64 for easy transmission
    randomPart := base64.RawURLEncoding.EncodeToString(randomBytes)

    // Generate a short key ID for lookups (first 8 chars of random part)
    keyID = randomPart[:8]

    // Construct the full key with prefix and version
    fullKey = fmt.Sprintf("%s_%s_%s", g.prefix, g.version, randomPart)

    return fullKey, keyID, nil
}

// ParseKey extracts components from a full API key
func (g *APIKeyGenerator) ParseKey(fullKey string) (prefix, version, randomPart string, err error) {
    parts := strings.Split(fullKey, "_")
    if len(parts) != 3 {
        return "", "", "", fmt.Errorf("invalid key format: expected 3 parts, got %d", len(parts))
    }

    return parts[0], parts[1], parts[2], nil
}

// ValidateFormat checks if the key has the correct format
func (g *APIKeyGenerator) ValidateFormat(fullKey string) bool {
    prefix, version, randomPart, err := g.ParseKey(fullKey)
    if err != nil {
        return false
    }

    // Verify prefix matches
    if prefix != g.prefix {
        return false
    }

    // Verify version is recognized
    if version != g.version {
        return false
    }

    // Verify random part has expected length
    expectedLen := base64.RawURLEncoding.EncodedLen(KeyLength)
    if len(randomPart) != expectedLen {
        return false
    }

    return true
}
```

## 2. Secure Key Hashing for Storage

Never store API keys in plain text. We use Argon2id, the winner of the Password Hashing Competition, for secure key hashing. Argon2id provides excellent resistance against both GPU and side-channel attacks.

This implementation uses Argon2id for hashing API keys before storage:

```go
package auth

import (
    "crypto/rand"
    "crypto/subtle"
    "encoding/base64"
    "fmt"
    "strings"

    "golang.org/x/crypto/argon2"
)

// Argon2 parameters - tuned for API key hashing
// These values balance security with performance
const (
    Argon2Time    = 1         // Number of iterations
    Argon2Memory  = 64 * 1024 // Memory in KB (64 MB)
    Argon2Threads = 4         // Number of threads
    Argon2KeyLen  = 32        // Output hash length
    SaltLength    = 16        // Salt length in bytes
)

// KeyHasher handles secure hashing of API keys
type KeyHasher struct {
    time    uint32
    memory  uint32
    threads uint8
    keyLen  uint32
}

// NewKeyHasher creates a hasher with recommended parameters
func NewKeyHasher() *KeyHasher {
    return &KeyHasher{
        time:    Argon2Time,
        memory:  Argon2Memory,
        threads: Argon2Threads,
        keyLen:  Argon2KeyLen,
    }
}

// Hash creates a secure hash of the API key
// Returns a string in format: $argon2id$v=19$m=65536,t=1,p=4$salt$hash
func (h *KeyHasher) Hash(key string) (string, error) {
    // Generate a random salt
    salt := make([]byte, SaltLength)
    if _, err := rand.Read(salt); err != nil {
        return "", fmt.Errorf("failed to generate salt: %w", err)
    }

    // Compute the Argon2id hash
    hash := argon2.IDKey(
        []byte(key),
        salt,
        h.time,
        h.memory,
        h.threads,
        h.keyLen,
    )

    // Encode salt and hash to base64
    saltB64 := base64.RawStdEncoding.EncodeToString(salt)
    hashB64 := base64.RawStdEncoding.EncodeToString(hash)

    // Format: $argon2id$v=19$m=memory,t=time,p=threads$salt$hash
    encoded := fmt.Sprintf(
        "$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
        argon2.Version,
        h.memory,
        h.time,
        h.threads,
        saltB64,
        hashB64,
    )

    return encoded, nil
}

// Verify checks if a key matches a hash using constant-time comparison
func (h *KeyHasher) Verify(key, encodedHash string) (bool, error) {
    // Parse the encoded hash
    parts := strings.Split(encodedHash, "$")
    if len(parts) != 6 {
        return false, fmt.Errorf("invalid hash format")
    }

    // Extract parameters
    var memory, time uint32
    var threads uint8
    _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &time, &threads)
    if err != nil {
        return false, fmt.Errorf("failed to parse parameters: %w", err)
    }

    // Decode salt
    salt, err := base64.RawStdEncoding.DecodeString(parts[4])
    if err != nil {
        return false, fmt.Errorf("failed to decode salt: %w", err)
    }

    // Decode expected hash
    expectedHash, err := base64.RawStdEncoding.DecodeString(parts[5])
    if err != nil {
        return false, fmt.Errorf("failed to decode hash: %w", err)
    }

    // Compute hash of the provided key
    computedHash := argon2.IDKey(
        []byte(key),
        salt,
        time,
        memory,
        threads,
        uint32(len(expectedHash)),
    )

    // Use constant-time comparison to prevent timing attacks
    if subtle.ConstantTimeCompare(computedHash, expectedHash) == 1 {
        return true, nil
    }

    return false, nil
}
```

## 3. API Key Model with Scopes and Permissions

Define a comprehensive API key model that supports scopes, permissions, and metadata:

```go
package models

import (
    "time"
)

// Scope represents a permission scope for the API key
type Scope string

const (
    ScopeRead       Scope = "read"
    ScopeWrite      Scope = "write"
    ScopeDelete     Scope = "delete"
    ScopeAdmin      Scope = "admin"
    ScopeMonitoring Scope = "monitoring"
    ScopeAlerts     Scope = "alerts"
)

// APIKey represents an API key with its metadata and permissions
type APIKey struct {
    ID          string    `json:"id" db:"id"`
    KeyID       string    `json:"key_id" db:"key_id"`       // Short identifier for lookups
    HashedKey   string    `json:"-" db:"hashed_key"`         // Never expose in JSON
    Name        string    `json:"name" db:"name"`            // Human-readable name
    Description string    `json:"description" db:"description"`

    // Ownership
    UserID      string    `json:"user_id" db:"user_id"`
    ProjectID   string    `json:"project_id" db:"project_id"`

    // Permissions
    Scopes      []Scope   `json:"scopes" db:"scopes"`

    // Restrictions
    AllowedIPs  []string  `json:"allowed_ips" db:"allowed_ips"`
    AllowedReferers []string `json:"allowed_referers" db:"allowed_referers"`

    // Rate limiting
    RateLimit   int       `json:"rate_limit" db:"rate_limit"`     // Requests per minute

    // Lifecycle
    CreatedAt   time.Time `json:"created_at" db:"created_at"`
    ExpiresAt   *time.Time `json:"expires_at,omitempty" db:"expires_at"`
    LastUsedAt  *time.Time `json:"last_used_at,omitempty" db:"last_used_at"`
    RevokedAt   *time.Time `json:"revoked_at,omitempty" db:"revoked_at"`

    // Rotation
    RotatedFromID *string  `json:"rotated_from_id,omitempty" db:"rotated_from_id"`
    RotationDue   *time.Time `json:"rotation_due,omitempty" db:"rotation_due"`

    // Status
    IsActive    bool      `json:"is_active" db:"is_active"`
}

// HasScope checks if the API key has a specific scope
func (k *APIKey) HasScope(scope Scope) bool {
    for _, s := range k.Scopes {
        if s == scope || s == ScopeAdmin {
            return true
        }
    }
    return false
}

// HasAnyScope checks if the API key has any of the specified scopes
func (k *APIKey) HasAnyScope(scopes ...Scope) bool {
    for _, scope := range scopes {
        if k.HasScope(scope) {
            return true
        }
    }
    return false
}

// IsValid checks if the key is currently valid
func (k *APIKey) IsValid() bool {
    if !k.IsActive {
        return false
    }

    if k.RevokedAt != nil {
        return false
    }

    if k.ExpiresAt != nil && time.Now().After(*k.ExpiresAt) {
        return false
    }

    return true
}

// NeedsRotation checks if the key is due for rotation
func (k *APIKey) NeedsRotation() bool {
    if k.RotationDue == nil {
        return false
    }
    return time.Now().After(*k.RotationDue)
}
```

## 4. Database Storage Layer

Implement a PostgreSQL storage layer for API keys with proper indexing:

```go
package store

import (
    "context"
    "database/sql"
    "fmt"
    "time"

    "github.com/lib/pq"
    "yourproject/models"
)

// PostgresStore implements API key storage with PostgreSQL
type PostgresStore struct {
    db *sql.DB
}

// NewPostgresStore creates a new store instance
func NewPostgresStore(db *sql.DB) *PostgresStore {
    return &PostgresStore{db: db}
}

// CreateTable initializes the API keys table with proper indexes
func (s *PostgresStore) CreateTable(ctx context.Context) error {
    query := `
    CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        key_id VARCHAR(16) UNIQUE NOT NULL,
        hashed_key TEXT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        user_id UUID NOT NULL,
        project_id UUID NOT NULL,
        scopes TEXT[] NOT NULL DEFAULT '{}',
        allowed_ips TEXT[] DEFAULT '{}',
        allowed_referers TEXT[] DEFAULT '{}',
        rate_limit INTEGER DEFAULT 1000,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE,
        last_used_at TIMESTAMP WITH TIME ZONE,
        revoked_at TIMESTAMP WITH TIME ZONE,
        rotated_from_id UUID REFERENCES api_keys(id),
        rotation_due TIMESTAMP WITH TIME ZONE,
        is_active BOOLEAN DEFAULT true
    );

    -- Index for fast key lookups by key_id
    CREATE INDEX IF NOT EXISTS idx_api_keys_key_id ON api_keys(key_id) WHERE is_active = true;

    -- Index for finding keys by user
    CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);

    -- Index for finding keys by project
    CREATE INDEX IF NOT EXISTS idx_api_keys_project_id ON api_keys(project_id);

    -- Index for finding expired keys
    CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at) WHERE expires_at IS NOT NULL;

    -- Index for finding keys due for rotation
    CREATE INDEX IF NOT EXISTS idx_api_keys_rotation_due ON api_keys(rotation_due) WHERE rotation_due IS NOT NULL;
    `

    _, err := s.db.ExecContext(ctx, query)
    return err
}

// Create stores a new API key
func (s *PostgresStore) Create(ctx context.Context, key *models.APIKey) error {
    query := `
    INSERT INTO api_keys (
        key_id, hashed_key, name, description, user_id, project_id,
        scopes, allowed_ips, allowed_referers, rate_limit, expires_at, rotation_due
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING id, created_at
    `

    scopes := make([]string, len(key.Scopes))
    for i, s := range key.Scopes {
        scopes[i] = string(s)
    }

    return s.db.QueryRowContext(ctx, query,
        key.KeyID,
        key.HashedKey,
        key.Name,
        key.Description,
        key.UserID,
        key.ProjectID,
        pq.Array(scopes),
        pq.Array(key.AllowedIPs),
        pq.Array(key.AllowedReferers),
        key.RateLimit,
        key.ExpiresAt,
        key.RotationDue,
    ).Scan(&key.ID, &key.CreatedAt)
}

// GetByKeyID retrieves an API key by its short identifier
func (s *PostgresStore) GetByKeyID(ctx context.Context, keyID string) (*models.APIKey, error) {
    query := `
    SELECT id, key_id, hashed_key, name, description, user_id, project_id,
           scopes, allowed_ips, allowed_referers, rate_limit, created_at,
           expires_at, last_used_at, revoked_at, rotated_from_id, rotation_due, is_active
    FROM api_keys
    WHERE key_id = $1
    `

    var key models.APIKey
    var scopes, allowedIPs, allowedReferers []string

    err := s.db.QueryRowContext(ctx, query, keyID).Scan(
        &key.ID, &key.KeyID, &key.HashedKey, &key.Name, &key.Description,
        &key.UserID, &key.ProjectID, pq.Array(&scopes), pq.Array(&allowedIPs),
        pq.Array(&allowedReferers), &key.RateLimit, &key.CreatedAt,
        &key.ExpiresAt, &key.LastUsedAt, &key.RevokedAt, &key.RotatedFromID,
        &key.RotationDue, &key.IsActive,
    )

    if err == sql.ErrNoRows {
        return nil, fmt.Errorf("API key not found")
    }
    if err != nil {
        return nil, err
    }

    // Convert string slices to typed slices
    key.Scopes = make([]models.Scope, len(scopes))
    for i, s := range scopes {
        key.Scopes[i] = models.Scope(s)
    }
    key.AllowedIPs = allowedIPs
    key.AllowedReferers = allowedReferers

    return &key, nil
}

// UpdateLastUsed updates the last used timestamp
func (s *PostgresStore) UpdateLastUsed(ctx context.Context, keyID string) error {
    query := `UPDATE api_keys SET last_used_at = NOW() WHERE key_id = $1`
    _, err := s.db.ExecContext(ctx, query, keyID)
    return err
}

// Revoke marks an API key as revoked
func (s *PostgresStore) Revoke(ctx context.Context, keyID string) error {
    query := `UPDATE api_keys SET revoked_at = NOW(), is_active = false WHERE key_id = $1`
    _, err := s.db.ExecContext(ctx, query, keyID)
    return err
}

// ListByUser retrieves all API keys for a user
func (s *PostgresStore) ListByUser(ctx context.Context, userID string) ([]*models.APIKey, error) {
    query := `
    SELECT id, key_id, name, description, scopes, rate_limit, created_at,
           expires_at, last_used_at, is_active
    FROM api_keys
    WHERE user_id = $1
    ORDER BY created_at DESC
    `

    rows, err := s.db.QueryContext(ctx, query, userID)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var keys []*models.APIKey
    for rows.Next() {
        var key models.APIKey
        var scopes []string

        err := rows.Scan(
            &key.ID, &key.KeyID, &key.Name, &key.Description,
            pq.Array(&scopes), &key.RateLimit, &key.CreatedAt,
            &key.ExpiresAt, &key.LastUsedAt, &key.IsActive,
        )
        if err != nil {
            return nil, err
        }

        key.Scopes = make([]models.Scope, len(scopes))
        for i, s := range scopes {
            key.Scopes[i] = models.Scope(s)
        }

        keys = append(keys, &key)
    }

    return keys, rows.Err()
}
```

## 5. Rate Limiting per API Key

Implement Redis-based rate limiting with sliding window algorithm:

```go
package ratelimit

import (
    "context"
    "fmt"
    "time"

    "github.com/redis/go-redis/v9"
)

// RateLimitResult contains the result of a rate limit check
type RateLimitResult struct {
    Allowed     bool
    Remaining   int64
    ResetAt     time.Time
    RetryAfter  time.Duration
}

// RedisRateLimiter implements sliding window rate limiting using Redis
type RedisRateLimiter struct {
    client *redis.Client
    window time.Duration
}

// NewRedisRateLimiter creates a new rate limiter
func NewRedisRateLimiter(client *redis.Client) *RedisRateLimiter {
    return &RedisRateLimiter{
        client: client,
        window: time.Minute, // 1-minute sliding window
    }
}

// Check performs a rate limit check for the given key
// Uses Redis sorted sets for accurate sliding window counting
func (r *RedisRateLimiter) Check(ctx context.Context, keyID string, limit int64) (*RateLimitResult, error) {
    now := time.Now()
    windowStart := now.Add(-r.window)
    key := fmt.Sprintf("ratelimit:%s", keyID)

    // Use a Lua script for atomic operations
    script := redis.NewScript(`
        local key = KEYS[1]
        local now = tonumber(ARGV[1])
        local window_start = tonumber(ARGV[2])
        local limit = tonumber(ARGV[3])
        local window_ms = tonumber(ARGV[4])

        -- Remove old entries outside the window
        redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

        -- Count current requests in window
        local count = redis.call('ZCARD', key)

        if count < limit then
            -- Add new request with current timestamp
            redis.call('ZADD', key, now, now .. '-' .. math.random())
            -- Set expiry on the key
            redis.call('PEXPIRE', key, window_ms)
            return {1, limit - count - 1, 0}
        else
            -- Get oldest entry to calculate retry time
            local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
            local retry_after = 0
            if #oldest > 0 then
                retry_after = oldest[2] + window_ms - now
            end
            return {0, 0, retry_after}
        end
    `)

    result, err := script.Run(ctx, r.client, []string{key},
        now.UnixMilli(),
        windowStart.UnixMilli(),
        limit,
        r.window.Milliseconds(),
    ).Slice()

    if err != nil {
        return nil, fmt.Errorf("rate limit check failed: %w", err)
    }

    allowed := result[0].(int64) == 1
    remaining := result[1].(int64)
    retryAfterMs := result[2].(int64)

    return &RateLimitResult{
        Allowed:    allowed,
        Remaining:  remaining,
        ResetAt:    now.Add(r.window),
        RetryAfter: time.Duration(retryAfterMs) * time.Millisecond,
    }, nil
}

// Reset clears the rate limit for a key (useful after key rotation)
func (r *RedisRateLimiter) Reset(ctx context.Context, keyID string) error {
    key := fmt.Sprintf("ratelimit:%s", keyID)
    return r.client.Del(ctx, key).Err()
}
```

## 6. Authentication Middleware

Create a comprehensive HTTP middleware that validates API keys and enforces all security checks:

```go
package auth

import (
    "context"
    "net"
    "net/http"
    "strings"
    "time"

    "yourproject/audit"
    "yourproject/models"
    "yourproject/ratelimit"
    "yourproject/store"
)

// Context keys for storing API key information
type contextKey string

const (
    APIKeyContextKey contextKey = "api_key"
)

// AuthMiddleware handles API key authentication
type AuthMiddleware struct {
    generator   *APIKeyGenerator
    hasher      *KeyHasher
    store       *store.PostgresStore
    rateLimiter *ratelimit.RedisRateLimiter
    auditLogger *audit.Logger
}

// NewAuthMiddleware creates a new authentication middleware
func NewAuthMiddleware(
    generator *APIKeyGenerator,
    hasher *KeyHasher,
    store *store.PostgresStore,
    rateLimiter *ratelimit.RedisRateLimiter,
    auditLogger *audit.Logger,
) *AuthMiddleware {
    return &AuthMiddleware{
        generator:   generator,
        hasher:      hasher,
        store:       store,
        rateLimiter: rateLimiter,
        auditLogger: auditLogger,
    }
}

// Authenticate returns an HTTP middleware that validates API keys
func (m *AuthMiddleware) Authenticate(requiredScopes ...models.Scope) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            ctx := r.Context()

            // Extract API key from request
            apiKey := m.extractAPIKey(r)
            if apiKey == "" {
                m.auditLogger.LogAuthFailure(ctx, "", "missing_api_key", r.RemoteAddr)
                http.Error(w, "API key required", http.StatusUnauthorized)
                return
            }

            // Validate key format
            if !m.generator.ValidateFormat(apiKey) {
                m.auditLogger.LogAuthFailure(ctx, "", "invalid_key_format", r.RemoteAddr)
                http.Error(w, "Invalid API key format", http.StatusUnauthorized)
                return
            }

            // Extract key ID for lookup
            _, _, randomPart, _ := m.generator.ParseKey(apiKey)
            keyID := randomPart[:8]

            // Fetch key from store
            key, err := m.store.GetByKeyID(ctx, keyID)
            if err != nil {
                m.auditLogger.LogAuthFailure(ctx, keyID, "key_not_found", r.RemoteAddr)
                http.Error(w, "Invalid API key", http.StatusUnauthorized)
                return
            }

            // Verify the key hash
            valid, err := m.hasher.Verify(apiKey, key.HashedKey)
            if err != nil || !valid {
                m.auditLogger.LogAuthFailure(ctx, keyID, "hash_mismatch", r.RemoteAddr)
                http.Error(w, "Invalid API key", http.StatusUnauthorized)
                return
            }

            // Check if key is active and not expired
            if !key.IsValid() {
                reason := "key_inactive"
                if key.RevokedAt != nil {
                    reason = "key_revoked"
                } else if key.ExpiresAt != nil && time.Now().After(*key.ExpiresAt) {
                    reason = "key_expired"
                }
                m.auditLogger.LogAuthFailure(ctx, keyID, reason, r.RemoteAddr)
                http.Error(w, "API key is no longer valid", http.StatusUnauthorized)
                return
            }

            // Check IP restrictions
            if len(key.AllowedIPs) > 0 && !m.isIPAllowed(r, key.AllowedIPs) {
                m.auditLogger.LogAuthFailure(ctx, keyID, "ip_not_allowed", r.RemoteAddr)
                http.Error(w, "IP address not allowed", http.StatusForbidden)
                return
            }

            // Check referer restrictions
            if len(key.AllowedReferers) > 0 && !m.isRefererAllowed(r, key.AllowedReferers) {
                m.auditLogger.LogAuthFailure(ctx, keyID, "referer_not_allowed", r.RemoteAddr)
                http.Error(w, "Referer not allowed", http.StatusForbidden)
                return
            }

            // Check required scopes
            for _, scope := range requiredScopes {
                if !key.HasScope(scope) {
                    m.auditLogger.LogAuthFailure(ctx, keyID, "insufficient_scope", r.RemoteAddr)
                    http.Error(w, "Insufficient permissions", http.StatusForbidden)
                    return
                }
            }

            // Check rate limit
            result, err := m.rateLimiter.Check(ctx, keyID, int64(key.RateLimit))
            if err != nil {
                http.Error(w, "Rate limit check failed", http.StatusInternalServerError)
                return
            }

            // Set rate limit headers
            w.Header().Set("X-RateLimit-Limit", string(rune(key.RateLimit)))
            w.Header().Set("X-RateLimit-Remaining", string(rune(result.Remaining)))
            w.Header().Set("X-RateLimit-Reset", result.ResetAt.Format(time.RFC3339))

            if !result.Allowed {
                w.Header().Set("Retry-After", string(rune(int(result.RetryAfter.Seconds()))))
                m.auditLogger.LogRateLimited(ctx, keyID, r.RemoteAddr)
                http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
                return
            }

            // Update last used timestamp asynchronously
            go func() {
                _ = m.store.UpdateLastUsed(context.Background(), keyID)
            }()

            // Log successful authentication
            m.auditLogger.LogAuthSuccess(ctx, keyID, r.RemoteAddr, r.URL.Path)

            // Add key to context for handlers
            ctx = context.WithValue(ctx, APIKeyContextKey, key)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

// extractAPIKey extracts the API key from the request
// Supports: Authorization header, X-API-Key header, and query parameter
func (m *AuthMiddleware) extractAPIKey(r *http.Request) string {
    // Check Authorization header (Bearer token)
    auth := r.Header.Get("Authorization")
    if strings.HasPrefix(auth, "Bearer ") {
        return strings.TrimPrefix(auth, "Bearer ")
    }

    // Check X-API-Key header
    if key := r.Header.Get("X-API-Key"); key != "" {
        return key
    }

    // Check query parameter (not recommended for production)
    if key := r.URL.Query().Get("api_key"); key != "" {
        return key
    }

    return ""
}

// isIPAllowed checks if the request IP is in the allowed list
func (m *AuthMiddleware) isIPAllowed(r *http.Request, allowedIPs []string) bool {
    clientIP := m.getClientIP(r)

    for _, allowed := range allowedIPs {
        // Check for CIDR notation
        if strings.Contains(allowed, "/") {
            _, network, err := net.ParseCIDR(allowed)
            if err == nil && network.Contains(net.ParseIP(clientIP)) {
                return true
            }
        } else if clientIP == allowed {
            return true
        }
    }

    return false
}

// getClientIP extracts the client IP considering proxies
func (m *AuthMiddleware) getClientIP(r *http.Request) string {
    // Check X-Forwarded-For header
    if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
        ips := strings.Split(xff, ",")
        return strings.TrimSpace(ips[0])
    }

    // Check X-Real-IP header
    if xri := r.Header.Get("X-Real-IP"); xri != "" {
        return xri
    }

    // Fall back to RemoteAddr
    ip, _, _ := net.SplitHostPort(r.RemoteAddr)
    return ip
}

// isRefererAllowed checks if the request referer matches allowed patterns
func (m *AuthMiddleware) isRefererAllowed(r *http.Request, allowedReferers []string) bool {
    referer := r.Header.Get("Referer")
    if referer == "" {
        return false
    }

    for _, allowed := range allowedReferers {
        // Support wildcard matching
        if strings.HasSuffix(allowed, "*") {
            prefix := strings.TrimSuffix(allowed, "*")
            if strings.HasPrefix(referer, prefix) {
                return true
            }
        } else if referer == allowed {
            return true
        }
    }

    return false
}

// GetAPIKeyFromContext retrieves the API key from the request context
func GetAPIKeyFromContext(ctx context.Context) *models.APIKey {
    key, ok := ctx.Value(APIKeyContextKey).(*models.APIKey)
    if !ok {
        return nil
    }
    return key
}
```

## 7. Audit Logging

Implement comprehensive audit logging for security events:

```go
package audit

import (
    "context"
    "encoding/json"
    "log/slog"
    "time"
)

// EventType represents the type of audit event
type EventType string

const (
    EventAuthSuccess   EventType = "auth_success"
    EventAuthFailure   EventType = "auth_failure"
    EventKeyCreated    EventType = "key_created"
    EventKeyRevoked    EventType = "key_revoked"
    EventKeyRotated    EventType = "key_rotated"
    EventRateLimited   EventType = "rate_limited"
)

// AuditEvent represents a security audit event
type AuditEvent struct {
    Timestamp   time.Time              `json:"timestamp"`
    EventType   EventType              `json:"event_type"`
    KeyID       string                 `json:"key_id,omitempty"`
    UserID      string                 `json:"user_id,omitempty"`
    IPAddress   string                 `json:"ip_address"`
    Resource    string                 `json:"resource,omitempty"`
    Reason      string                 `json:"reason,omitempty"`
    Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// Logger handles audit logging
type Logger struct {
    logger *slog.Logger
}

// NewLogger creates a new audit logger
func NewLogger(logger *slog.Logger) *Logger {
    return &Logger{logger: logger}
}

// Log writes an audit event
func (l *Logger) Log(ctx context.Context, event *AuditEvent) {
    eventJSON, _ := json.Marshal(event)
    l.logger.InfoContext(ctx, "audit_event",
        slog.String("event_type", string(event.EventType)),
        slog.String("key_id", event.KeyID),
        slog.String("ip_address", event.IPAddress),
        slog.String("event_data", string(eventJSON)),
    )
}

// LogAuthSuccess logs a successful authentication
func (l *Logger) LogAuthSuccess(ctx context.Context, keyID, ipAddr, resource string) {
    l.Log(ctx, &AuditEvent{
        Timestamp: time.Now(),
        EventType: EventAuthSuccess,
        KeyID:     keyID,
        IPAddress: ipAddr,
        Resource:  resource,
    })
}

// LogAuthFailure logs a failed authentication attempt
func (l *Logger) LogAuthFailure(ctx context.Context, keyID, reason, ipAddr string) {
    l.Log(ctx, &AuditEvent{
        Timestamp: time.Now(),
        EventType: EventAuthFailure,
        KeyID:     keyID,
        Reason:    reason,
        IPAddress: ipAddr,
    })
}

// LogKeyCreated logs API key creation
func (l *Logger) LogKeyCreated(ctx context.Context, keyID, userID, ipAddr string) {
    l.Log(ctx, &AuditEvent{
        Timestamp: time.Now(),
        EventType: EventKeyCreated,
        KeyID:     keyID,
        UserID:    userID,
        IPAddress: ipAddr,
    })
}

// LogKeyRevoked logs API key revocation
func (l *Logger) LogKeyRevoked(ctx context.Context, keyID, userID, reason, ipAddr string) {
    l.Log(ctx, &AuditEvent{
        Timestamp: time.Now(),
        EventType: EventKeyRevoked,
        KeyID:     keyID,
        UserID:    userID,
        Reason:    reason,
        IPAddress: ipAddr,
    })
}

// LogKeyRotated logs API key rotation
func (l *Logger) LogKeyRotated(ctx context.Context, oldKeyID, newKeyID, userID, ipAddr string) {
    l.Log(ctx, &AuditEvent{
        Timestamp: time.Now(),
        EventType: EventKeyRotated,
        KeyID:     newKeyID,
        UserID:    userID,
        IPAddress: ipAddr,
        Metadata: map[string]interface{}{
            "old_key_id": oldKeyID,
        },
    })
}

// LogRateLimited logs when a request is rate limited
func (l *Logger) LogRateLimited(ctx context.Context, keyID, ipAddr string) {
    l.Log(ctx, &AuditEvent{
        Timestamp: time.Now(),
        EventType: EventRateLimited,
        KeyID:     keyID,
        IPAddress: ipAddr,
    })
}
```

## 8. Key Rotation Strategies

Implement secure key rotation with grace periods:

```go
package auth

import (
    "context"
    "fmt"
    "time"

    "yourproject/audit"
    "yourproject/models"
    "yourproject/store"
)

// RotationConfig configures key rotation behavior
type RotationConfig struct {
    // GracePeriod is how long the old key remains valid after rotation
    GracePeriod time.Duration

    // DefaultRotationInterval is the recommended rotation period
    DefaultRotationInterval time.Duration

    // NotifyBeforeExpiry sends notifications this long before key expires
    NotifyBeforeExpiry time.Duration
}

// DefaultRotationConfig returns recommended rotation settings
func DefaultRotationConfig() *RotationConfig {
    return &RotationConfig{
        GracePeriod:             7 * 24 * time.Hour,  // 7 days
        DefaultRotationInterval: 90 * 24 * time.Hour, // 90 days
        NotifyBeforeExpiry:      14 * 24 * time.Hour, // 14 days
    }
}

// KeyRotator handles API key rotation
type KeyRotator struct {
    generator   *APIKeyGenerator
    hasher      *KeyHasher
    store       *store.PostgresStore
    auditLogger *audit.Logger
    config      *RotationConfig
}

// NewKeyRotator creates a new key rotator
func NewKeyRotator(
    generator *APIKeyGenerator,
    hasher *KeyHasher,
    store *store.PostgresStore,
    auditLogger *audit.Logger,
    config *RotationConfig,
) *KeyRotator {
    if config == nil {
        config = DefaultRotationConfig()
    }
    return &KeyRotator{
        generator:   generator,
        hasher:      hasher,
        store:       store,
        auditLogger: auditLogger,
        config:      config,
    }
}

// RotateKey creates a new key and schedules the old one for revocation
// Returns the new full key (shown to user once) and the new key record
func (r *KeyRotator) RotateKey(ctx context.Context, oldKeyID string, ipAddr string) (string, *models.APIKey, error) {
    // Fetch the old key
    oldKey, err := r.store.GetByKeyID(ctx, oldKeyID)
    if err != nil {
        return "", nil, fmt.Errorf("failed to fetch old key: %w", err)
    }

    if !oldKey.IsActive {
        return "", nil, fmt.Errorf("cannot rotate inactive key")
    }

    // Generate new key
    fullKey, newKeyID, err := r.generator.Generate()
    if err != nil {
        return "", nil, fmt.Errorf("failed to generate new key: %w", err)
    }

    // Hash the new key
    hashedKey, err := r.hasher.Hash(fullKey)
    if err != nil {
        return "", nil, fmt.Errorf("failed to hash new key: %w", err)
    }

    // Create new key record inheriting properties from old key
    rotationDue := time.Now().Add(r.config.DefaultRotationInterval)
    newKey := &models.APIKey{
        KeyID:           newKeyID,
        HashedKey:       hashedKey,
        Name:            oldKey.Name + " (rotated)",
        Description:     oldKey.Description,
        UserID:          oldKey.UserID,
        ProjectID:       oldKey.ProjectID,
        Scopes:          oldKey.Scopes,
        AllowedIPs:      oldKey.AllowedIPs,
        AllowedReferers: oldKey.AllowedReferers,
        RateLimit:       oldKey.RateLimit,
        ExpiresAt:       oldKey.ExpiresAt,
        RotatedFromID:   &oldKey.ID,
        RotationDue:     &rotationDue,
        IsActive:        true,
    }

    // Store the new key
    if err := r.store.Create(ctx, newKey); err != nil {
        return "", nil, fmt.Errorf("failed to store new key: %w", err)
    }

    // Schedule old key for revocation after grace period
    go r.scheduleRevocation(context.Background(), oldKeyID, r.config.GracePeriod)

    // Log the rotation
    r.auditLogger.LogKeyRotated(ctx, oldKeyID, newKeyID, oldKey.UserID, ipAddr)

    return fullKey, newKey, nil
}

// scheduleRevocation revokes the old key after the grace period
func (r *KeyRotator) scheduleRevocation(ctx context.Context, keyID string, delay time.Duration) {
    time.Sleep(delay)
    _ = r.store.Revoke(ctx, keyID)
}

// GetKeysNeedingRotation returns keys that are due for rotation
func (r *KeyRotator) GetKeysNeedingRotation(ctx context.Context) ([]*models.APIKey, error) {
    // This would typically be a database query
    // For now, we show the expected interface
    return nil, nil
}

// AutoRotateCheck performs automated rotation checks
// This should be called periodically (e.g., daily cron job)
func (r *KeyRotator) AutoRotateCheck(ctx context.Context) error {
    keys, err := r.GetKeysNeedingRotation(ctx)
    if err != nil {
        return err
    }

    for _, key := range keys {
        // Send notification that key needs rotation
        // In production, integrate with notification service
        fmt.Printf("Key %s needs rotation (user: %s)\n", key.KeyID, key.UserID)
    }

    return nil
}
```

## 9. Putting It All Together

Here is the main application that ties all components together:

```go
package main

import (
    "context"
    "database/sql"
    "log"
    "log/slog"
    "net/http"
    "os"

    "github.com/redis/go-redis/v9"
    _ "github.com/lib/pq"

    "yourproject/audit"
    "yourproject/auth"
    "yourproject/models"
    "yourproject/ratelimit"
    "yourproject/store"
)

func main() {
    // Initialize structured logger
    logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
    auditLogger := audit.NewLogger(logger)

    // Connect to PostgreSQL
    db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    // Initialize store
    keyStore := store.NewPostgresStore(db)
    if err := keyStore.CreateTable(context.Background()); err != nil {
        log.Fatal(err)
    }

    // Connect to Redis
    redisClient := redis.NewClient(&redis.Options{
        Addr: os.Getenv("REDIS_URL"),
    })
    rateLimiter := ratelimit.NewRedisRateLimiter(redisClient)

    // Initialize auth components
    generator := auth.NewAPIKeyGenerator()
    hasher := auth.NewKeyHasher()

    // Create middleware
    authMiddleware := auth.NewAuthMiddleware(
        generator,
        hasher,
        keyStore,
        rateLimiter,
        auditLogger,
    )

    // Set up routes
    mux := http.NewServeMux()

    // Public endpoint - create new API key (requires user authentication)
    mux.HandleFunc("POST /api/keys", func(w http.ResponseWriter, r *http.Request) {
        // Generate new key
        fullKey, keyID, err := generator.Generate()
        if err != nil {
            http.Error(w, "Failed to generate key", http.StatusInternalServerError)
            return
        }

        // Hash the key for storage
        hashedKey, err := hasher.Hash(fullKey)
        if err != nil {
            http.Error(w, "Failed to hash key", http.StatusInternalServerError)
            return
        }

        // Create key record
        apiKey := &models.APIKey{
            KeyID:     keyID,
            HashedKey: hashedKey,
            Name:      r.FormValue("name"),
            UserID:    "user-from-session", // Get from session
            ProjectID: r.FormValue("project_id"),
            Scopes:    []models.Scope{models.ScopeRead},
            RateLimit: 1000,
            IsActive:  true,
        }

        if err := keyStore.Create(r.Context(), apiKey); err != nil {
            http.Error(w, "Failed to store key", http.StatusInternalServerError)
            return
        }

        auditLogger.LogKeyCreated(r.Context(), keyID, apiKey.UserID, r.RemoteAddr)

        // Return the full key to the user (only shown once!)
        w.Header().Set("Content-Type", "application/json")
        w.Write([]byte(`{"api_key": "` + fullKey + `", "key_id": "` + keyID + `"}`))
    })

    // Protected endpoint requiring read scope
    protected := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        apiKey := auth.GetAPIKeyFromContext(r.Context())
        w.Write([]byte("Hello, " + apiKey.Name))
    })
    mux.Handle("GET /api/protected", authMiddleware.Authenticate(models.ScopeRead)(protected))

    // Protected endpoint requiring write scope
    writeProtected := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("Write operation successful"))
    })
    mux.Handle("POST /api/data", authMiddleware.Authenticate(models.ScopeWrite)(writeProtected))

    // Start server
    log.Println("Starting server on :8080")
    log.Fatal(http.ListenAndServe(":8080", mux))
}
```

## Security Best Practices

When implementing API key authentication, follow these essential security practices:

1. **Never log full API keys** - Only log the key ID for debugging and audit purposes.

2. **Use HTTPS only** - API keys transmitted over unencrypted connections can be intercepted.

3. **Implement key expiration** - Set reasonable expiration times and encourage regular rotation.

4. **Rate limit aggressively** - Protect against brute force attacks and abuse.

5. **Monitor for anomalies** - Watch for unusual patterns like keys used from unexpected locations.

6. **Provide key management UI** - Let users view active keys, revoke compromised keys, and rotate keys easily.

7. **Hash keys properly** - Use memory-hard algorithms like Argon2id to prevent rainbow table attacks.

8. **Scope keys narrowly** - Follow the principle of least privilege when assigning scopes.

## Conclusion

We have built a comprehensive API key authentication system in Go that includes:

- Cryptographically secure key generation with prefixes for identification
- Argon2id hashing for secure storage
- Middleware with IP restrictions, referer checks, and scope validation
- Redis-based sliding window rate limiting
- Comprehensive audit logging
- Key rotation with grace periods

This implementation provides enterprise-grade security while remaining maintainable and extensible. Remember to adapt the code to your specific requirements, especially around database schemas, notification systems, and monitoring infrastructure.

For production deployments, consider adding:

- Metrics and alerting for authentication failures
- Integration with secret management systems
- Automated key rotation policies
- Multi-region key replication
