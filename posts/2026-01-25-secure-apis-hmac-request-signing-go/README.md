# How to Secure APIs with HMAC Request Signing in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, HMAC, API Security, Authentication, Cryptography

Description: Learn how to implement HMAC request signing in Go to authenticate API requests, prevent tampering, and protect against replay attacks.

---

API keys alone are not enough to secure your APIs. They can be intercepted, logged in proxies, or leaked in server logs. HMAC (Hash-based Message Authentication Code) request signing adds a cryptographic layer that proves the request came from someone with the secret key and that the request body has not been tampered with. This guide walks through implementing HMAC signing in Go for both clients and servers.

## Why HMAC Request Signing?

Traditional API authentication has several weaknesses:

| Method | Vulnerability |
|--------|---------------|
| **API Key in header** | Can be intercepted, logged, or stolen |
| **Basic Auth** | Credentials sent with every request |
| **Bearer tokens** | Token theft allows full access |
| **HMAC signing** | Secret never transmitted, requests tamper-proof |

HMAC signing works differently. The client computes a hash of the request using a secret key. The server computes the same hash and compares. The secret key never leaves either party. Even if someone intercepts the signed request, they cannot forge new requests without knowing the secret.

## The Signing Process

A typical HMAC signing scheme includes these components in the signature:

1. HTTP method (GET, POST, etc.)
2. Request path
3. Timestamp (to prevent replay attacks)
4. Request body hash (for POST/PUT requests)
5. Any critical headers

The client combines these into a canonical string, computes the HMAC-SHA256 hash using the secret key, and sends the signature in a header. The server reconstructs the same canonical string and verifies the signature matches.

## Client-Side Implementation

Here is a complete Go client that signs outgoing requests. The key parts are building the canonical string in a consistent format and computing the HMAC signature.

```go
package main

import (
    "bytes"
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "io"
    "net/http"
    "strconv"
    "time"
)

// HMACClient wraps http.Client with automatic request signing
type HMACClient struct {
    client    *http.Client
    accessKey string
    secretKey string
}

// NewHMACClient creates a client configured for HMAC signing
func NewHMACClient(accessKey, secretKey string) *HMACClient {
    return &HMACClient{
        client:    &http.Client{Timeout: 30 * time.Second},
        accessKey: accessKey,
        secretKey: secretKey,
    }
}

// computeHMAC calculates HMAC-SHA256 of the message using the secret key
func (c *HMACClient) computeHMAC(message string) string {
    mac := hmac.New(sha256.New, []byte(c.secretKey))
    mac.Write([]byte(message))
    return hex.EncodeToString(mac.Sum(nil))
}

// hashBody computes SHA256 hash of the request body
// Empty body returns hash of empty string for consistency
func hashBody(body []byte) string {
    h := sha256.New()
    h.Write(body)
    return hex.EncodeToString(h.Sum(nil))
}

// buildCanonicalString creates the string to sign
// Format: METHOD\nPATH\nTIMESTAMP\nBODY_HASH
func (c *HMACClient) buildCanonicalString(method, path string, timestamp int64, body []byte) string {
    bodyHash := hashBody(body)
    return fmt.Sprintf("%s\n%s\n%d\n%s", method, path, timestamp, bodyHash)
}

// Do executes the request with HMAC signature headers
func (c *HMACClient) Do(req *http.Request) (*http.Response, error) {
    // Read body for signing (if present)
    var body []byte
    if req.Body != nil {
        var err error
        body, err = io.ReadAll(req.Body)
        if err != nil {
            return nil, fmt.Errorf("failed to read request body: %w", err)
        }
        // Restore body for actual request
        req.Body = io.NopCloser(bytes.NewReader(body))
    }

    // Generate timestamp (Unix seconds)
    timestamp := time.Now().Unix()

    // Build canonical string and compute signature
    canonical := c.buildCanonicalString(req.Method, req.URL.Path, timestamp, body)
    signature := c.computeHMAC(canonical)

    // Add authentication headers
    req.Header.Set("X-Access-Key", c.accessKey)
    req.Header.Set("X-Timestamp", strconv.FormatInt(timestamp, 10))
    req.Header.Set("X-Signature", signature)

    return c.client.Do(req)
}

// Example usage
func main() {
    client := NewHMACClient("my-access-key", "my-secret-key-keep-this-safe")

    // Create a POST request with JSON body
    body := []byte(`{"user_id": 123, "action": "transfer", "amount": 500}`)
    req, _ := http.NewRequest("POST", "https://api.example.com/transactions", bytes.NewReader(body))
    req.Header.Set("Content-Type", "application/json")

    resp, err := client.Do(req)
    if err != nil {
        fmt.Printf("Request failed: %v\n", err)
        return
    }
    defer resp.Body.Close()

    fmt.Printf("Response status: %s\n", resp.Status)
}
```

## Server-Side Verification

The server must verify every signed request. This middleware extracts the signature headers, rebuilds the canonical string, computes the expected signature, and compares using constant-time comparison to prevent timing attacks.

```go
package main

import (
    "bytes"
    "crypto/hmac"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "io"
    "net/http"
    "strconv"
    "time"
)

// HMACAuthMiddleware verifies HMAC signatures on incoming requests
type HMACAuthMiddleware struct {
    // getSecretKey looks up the secret for an access key
    // In production, this queries your database or secrets manager
    getSecretKey    func(accessKey string) (string, error)
    maxTimestampAge time.Duration
}

// NewHMACAuthMiddleware creates middleware with configurable timestamp tolerance
func NewHMACAuthMiddleware(getSecretKey func(string) (string, error)) *HMACAuthMiddleware {
    return &HMACAuthMiddleware{
        getSecretKey:    getSecretKey,
        maxTimestampAge: 5 * time.Minute, // Reject requests older than 5 minutes
    }
}

// Middleware returns an http.Handler that verifies HMAC signatures
func (m *HMACAuthMiddleware) Middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Extract required headers
        accessKey := r.Header.Get("X-Access-Key")
        timestampStr := r.Header.Get("X-Timestamp")
        signature := r.Header.Get("X-Signature")

        // Validate all required headers are present
        if accessKey == "" || timestampStr == "" || signature == "" {
            http.Error(w, "Missing authentication headers", http.StatusUnauthorized)
            return
        }

        // Parse and validate timestamp
        timestamp, err := strconv.ParseInt(timestampStr, 10, 64)
        if err != nil {
            http.Error(w, "Invalid timestamp format", http.StatusBadRequest)
            return
        }

        // Check timestamp is within acceptable range (prevents replay attacks)
        requestTime := time.Unix(timestamp, 0)
        age := time.Since(requestTime)
        if age < 0 {
            age = -age // Handle clock skew in either direction
        }
        if age > m.maxTimestampAge {
            http.Error(w, "Request timestamp too old or too far in future", http.StatusUnauthorized)
            return
        }

        // Look up the secret key for this access key
        secretKey, err := m.getSecretKey(accessKey)
        if err != nil {
            http.Error(w, "Invalid access key", http.StatusUnauthorized)
            return
        }

        // Read body for signature verification
        body, err := io.ReadAll(r.Body)
        if err != nil {
            http.Error(w, "Failed to read request body", http.StatusBadRequest)
            return
        }
        // Restore body for downstream handlers
        r.Body = io.NopCloser(bytes.NewReader(body))

        // Compute expected signature
        expectedSig := m.computeSignature(secretKey, r.Method, r.URL.Path, timestamp, body)

        // Constant-time comparison prevents timing attacks
        if !hmac.Equal([]byte(signature), []byte(expectedSig)) {
            http.Error(w, "Invalid signature", http.StatusUnauthorized)
            return
        }

        // Signature valid - proceed to handler
        next.ServeHTTP(w, r)
    })
}

func (m *HMACAuthMiddleware) computeSignature(secretKey, method, path string, timestamp int64, body []byte) string {
    // Hash the body
    bodyHash := sha256.New()
    bodyHash.Write(body)
    bodyHashHex := hex.EncodeToString(bodyHash.Sum(nil))

    // Build canonical string (must match client exactly)
    canonical := fmt.Sprintf("%s\n%s\n%d\n%s", method, path, timestamp, bodyHashHex)

    // Compute HMAC
    mac := hmac.New(sha256.New, []byte(secretKey))
    mac.Write([]byte(canonical))
    return hex.EncodeToString(mac.Sum(nil))
}

// Example server setup
func main() {
    // In production, look up secrets from database or secrets manager
    secrets := map[string]string{
        "client-abc": "secret-key-for-client-abc",
        "client-xyz": "secret-key-for-client-xyz",
    }

    getSecret := func(accessKey string) (string, error) {
        secret, ok := secrets[accessKey]
        if !ok {
            return "", fmt.Errorf("unknown access key")
        }
        return secret, nil
    }

    authMiddleware := NewHMACAuthMiddleware(getSecret)

    // Protected endpoint
    http.Handle("/api/transactions", authMiddleware.Middleware(
        http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            w.Write([]byte("Transaction processed"))
        }),
    ))

    fmt.Println("Server listening on :8080")
    http.ListenAndServe(":8080", nil)
}
```

## Preventing Replay Attacks

Timestamps alone do not fully prevent replay attacks within the time window. For high-security endpoints, add a nonce (a unique value per request) and track used nonces.

```go
package main

import (
    "crypto/rand"
    "encoding/hex"
    "fmt"
    "sync"
    "time"
)

// NonceStore tracks used nonces to prevent replay attacks
type NonceStore struct {
    mu     sync.RWMutex
    nonces map[string]time.Time
    ttl    time.Duration
}

// NewNonceStore creates a store that remembers nonces for the given duration
func NewNonceStore(ttl time.Duration) *NonceStore {
    store := &NonceStore{
        nonces: make(map[string]time.Time),
        ttl:    ttl,
    }
    // Start cleanup goroutine
    go store.cleanup()
    return store
}

// GenerateNonce creates a cryptographically random nonce
func GenerateNonce() (string, error) {
    bytes := make([]byte, 16)
    if _, err := rand.Read(bytes); err != nil {
        return "", err
    }
    return hex.EncodeToString(bytes), nil
}

// Use attempts to use a nonce. Returns false if already used.
func (s *NonceStore) Use(nonce string) bool {
    s.mu.Lock()
    defer s.mu.Unlock()

    if _, exists := s.nonces[nonce]; exists {
        return false // Nonce already used - replay attack
    }

    s.nonces[nonce] = time.Now()
    return true
}

// cleanup removes expired nonces periodically
func (s *NonceStore) cleanup() {
    ticker := time.NewTicker(time.Minute)
    for range ticker.C {
        s.mu.Lock()
        cutoff := time.Now().Add(-s.ttl)
        for nonce, usedAt := range s.nonces {
            if usedAt.Before(cutoff) {
                delete(s.nonces, nonce)
            }
        }
        s.mu.Unlock()
    }
}

// Updated canonical string includes nonce
// Format: METHOD\nPATH\nTIMESTAMP\nNONCE\nBODY_HASH
func buildCanonicalStringWithNonce(method, path string, timestamp int64, nonce string, bodyHash string) string {
    return fmt.Sprintf("%s\n%s\n%d\n%s\n%s", method, path, timestamp, nonce, bodyHash)
}
```

## Including Headers in the Signature

Some APIs require signing specific headers to prevent header manipulation attacks. Here is how to include headers in the canonical string.

```go
package main

import (
    "fmt"
    "net/http"
    "sort"
    "strings"
)

// SignedHeaders lists which headers to include in signature
var SignedHeaders = []string{
    "content-type",
    "x-request-id",
}

// buildCanonicalHeaders creates a consistent string from signed headers
func buildCanonicalHeaders(headers http.Header, signedHeaders []string) string {
    // Sort header names for consistency
    sort.Strings(signedHeaders)

    var parts []string
    for _, name := range signedHeaders {
        // Lowercase header name, trim whitespace from value
        value := strings.TrimSpace(headers.Get(name))
        parts = append(parts, fmt.Sprintf("%s:%s", strings.ToLower(name), value))
    }

    return strings.Join(parts, "\n")
}

// Extended canonical string format
// METHOD\nPATH\nTIMESTAMP\nSIGNED_HEADERS\nHEADERS_STRING\nBODY_HASH
func buildFullCanonicalString(method, path string, timestamp int64, headers http.Header, signedHeaders []string, bodyHash string) string {
    headersString := buildCanonicalHeaders(headers, signedHeaders)
    signedHeadersList := strings.Join(signedHeaders, ";")

    return fmt.Sprintf("%s\n%s\n%d\n%s\n%s\n%s",
        method,
        path,
        timestamp,
        signedHeadersList,
        headersString,
        bodyHash,
    )
}
```

## Security Best Practices

When implementing HMAC signing, follow these guidelines:

**Use constant-time comparison.** Always use `hmac.Equal()` instead of `==` when comparing signatures. String comparison can leak information through timing differences, allowing attackers to guess signatures one character at a time.

**Set reasonable timestamp windows.** Five minutes is a common choice. Too short causes issues with clock skew between client and server. Too long increases the replay attack window.

**Use HMAC-SHA256 or stronger.** SHA256 provides good security and performance. Avoid SHA1 or MD5 for new implementations.

**Keep secrets secure.** Store secret keys in environment variables or a secrets manager, never in code or version control. Rotate keys periodically.

**Log authentication failures.** Track failed signature validations to detect attack attempts. Include the access key (but never the secret or signature) in logs.

**Use HTTPS.** HMAC signing protects integrity and authenticity, but not confidentiality. Always use TLS to encrypt the connection.

## When to Use HMAC vs Other Methods

HMAC request signing works well for:

- Server-to-server API communication
- Webhook verification (like Stripe or GitHub webhooks)
- APIs where you control both client and server
- High-security endpoints where token theft is a concern

Consider alternatives for:

- Browser-based applications (JWT with short expiration is often simpler)
- Mobile apps (OAuth 2.0 with refresh tokens may be more appropriate)
- Public APIs with many third-party integrations (OAuth is more standard)

## Summary

HMAC request signing provides strong authentication without transmitting secrets. The client signs requests using a secret key, and the server verifies using the same key. Combined with timestamps and nonces, this approach prevents both tampering and replay attacks. Go's standard library provides everything you need - `crypto/hmac` and `crypto/sha256` for the cryptography, and careful attention to building consistent canonical strings on both sides.

The implementation takes more effort than simple API keys, but the security benefits are significant for any API handling sensitive operations.
