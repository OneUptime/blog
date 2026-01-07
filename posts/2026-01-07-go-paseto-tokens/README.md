# How to Use PASETO Instead of JWT in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, PASETO, Security, Authentication, Tokens

Description: Use PASETO (Platform-Agnostic Security Tokens) in Go as a more secure alternative to JWT with simpler implementation and better defaults.

---

## Introduction

PASETO (Platform-Agnostic Security Tokens) is a modern token format designed as a secure alternative to JSON Web Tokens (JWT). Created by Scott Arciszewski, PASETO addresses many of the security pitfalls that have plagued JWT implementations over the years. In this comprehensive guide, we will explore how to implement PASETO in Go applications, covering everything from basic token creation to advanced key management and migration strategies from JWT.

## Why PASETO Over JWT?

Before diving into implementation, let us understand why PASETO is gaining popularity as a JWT alternative.

### The Problems with JWT

JWT has been the de facto standard for token-based authentication, but it comes with several well-documented issues:

1. **Algorithm Confusion Attacks**: JWT allows the algorithm to be specified in the token header, leading to attacks where an attacker can trick the server into using a different algorithm (like switching from RS256 to HS256).

2. **Too Many Options**: JWT supports numerous algorithms, many of which are deprecated or considered insecure. This flexibility becomes a liability.

3. **No Default Security**: Developers must make correct cryptographic choices, and mistakes are easy to make.

4. **Complex Validation**: Proper JWT validation requires checking multiple parameters, and missing any can create vulnerabilities.

### How PASETO Solves These Issues

PASETO takes a different approach by being opinionated about security:

1. **No Algorithm Negotiation**: The algorithm is tied to the version, eliminating algorithm confusion attacks.

2. **Versioned Protocols**: Each PASETO version uses specific, vetted cryptographic primitives.

3. **Secure by Default**: Developers cannot accidentally choose weak algorithms.

4. **Simpler Implementation**: Fewer moving parts mean fewer opportunities for mistakes.

## PASETO Versions and Purposes

PASETO tokens are identified by their version and purpose. Understanding these is crucial for proper implementation.

### Versions

**Version 2 (v2)**:
- Uses modern cryptographic primitives
- Local: XChaCha20-Poly1305 for symmetric encryption
- Public: Ed25519 for asymmetric signatures

**Version 4 (v4)** (Recommended):
- Latest version with improved security margins
- Local: XChaCha20-Poly1305 with BLAKE2b
- Public: Ed25519 with improved key derivation

### Purposes

**Local Tokens**:
- Symmetrically encrypted
- Only the issuer can create and read tokens
- Best for single-service scenarios
- Payload is encrypted, not just signed

**Public Tokens**:
- Asymmetrically signed (not encrypted)
- Anyone with the public key can verify
- Best for distributed systems
- Payload is visible but tamper-proof

## Setting Up Your Go Project

Let us start by setting up a Go project with PASETO support.

Create a new Go module and install the required dependencies:

```bash
mkdir paseto-demo
cd paseto-demo
go mod init paseto-demo
go get github.com/o1egl/paseto/v2
go get golang.org/x/crypto/ed25519
```

For PASETO v4 support, we will use an alternative library:

```bash
go get aidanwoods.dev/go-paseto
```

## Creating Local Tokens with PASETO v2

Local tokens provide symmetric encryption, meaning the same key is used for both creating and validating tokens. This is ideal when your application both issues and validates tokens.

The following example demonstrates creating and parsing local tokens with a symmetric key:

```go
package main

import (
	"fmt"
	"time"

	"github.com/o1egl/paseto"
)

// TokenClaims represents the payload structure for our tokens
type TokenClaims struct {
	UserID    string    `json:"user_id"`
	Email     string    `json:"email"`
	Role      string    `json:"role"`
	IssuedAt  time.Time `json:"iat"`
	ExpiresAt time.Time `json:"exp"`
	NotBefore time.Time `json:"nbf"`
	Issuer    string    `json:"iss"`
	Subject   string    `json:"sub"`
	Audience  string    `json:"aud"`
}

func main() {
	// Create a new PASETO v2 handler
	pasetoV2 := paseto.NewV2()

	// Generate a 32-byte symmetric key for local tokens
	// In production, this should be securely generated and stored
	symmetricKey := []byte("YELLOW SUBMARINE, BLACK WIZARDRY")

	// Create token claims with standard and custom fields
	claims := TokenClaims{
		UserID:    "user-12345",
		Email:     "user@example.com",
		Role:      "admin",
		IssuedAt:  time.Now(),
		ExpiresAt: time.Now().Add(24 * time.Hour),
		NotBefore: time.Now(),
		Issuer:    "my-auth-service",
		Subject:   "user-authentication",
		Audience:  "my-application",
	}

	// Optional footer data (unencrypted but authenticated)
	footer := "key-id:v1"

	// Encrypt the token
	token, err := pasetoV2.Encrypt(symmetricKey, claims, footer)
	if err != nil {
		panic(fmt.Errorf("failed to create token: %w", err))
	}

	fmt.Printf("Generated Token: %s\n\n", token)

	// Decrypt and validate the token
	var decryptedClaims TokenClaims
	var decryptedFooter string

	err = pasetoV2.Decrypt(token, symmetricKey, &decryptedClaims, &decryptedFooter)
	if err != nil {
		panic(fmt.Errorf("failed to decrypt token: %w", err))
	}

	fmt.Printf("Decrypted Claims:\n")
	fmt.Printf("  User ID: %s\n", decryptedClaims.UserID)
	fmt.Printf("  Email: %s\n", decryptedClaims.Email)
	fmt.Printf("  Role: %s\n", decryptedClaims.Role)
	fmt.Printf("  Expires: %s\n", decryptedClaims.ExpiresAt)
	fmt.Printf("Footer: %s\n", decryptedFooter)
}
```

## Creating Public Tokens with PASETO v2

Public tokens use asymmetric cryptography, allowing anyone with the public key to verify the token while only the private key holder can create tokens.

This example shows how to generate an Ed25519 key pair and create signed public tokens:

```go
package main

import (
	"crypto/ed25519"
	"crypto/rand"
	"fmt"
	"time"

	"github.com/o1egl/paseto"
)

// UserClaims represents authenticated user information
type UserClaims struct {
	UserID      string    `json:"uid"`
	Username    string    `json:"username"`
	Permissions []string  `json:"permissions"`
	IssuedAt    time.Time `json:"iat"`
	ExpiresAt   time.Time `json:"exp"`
	Issuer      string    `json:"iss"`
}

func main() {
	// Generate Ed25519 key pair
	// In production, keys should be generated once and stored securely
	publicKey, privateKey, err := ed25519.GenerateKey(rand.Reader)
	if err != nil {
		panic(fmt.Errorf("failed to generate key pair: %w", err))
	}

	pasetoV2 := paseto.NewV2()

	// Create claims for a user session
	claims := UserClaims{
		UserID:      "user-67890",
		Username:    "johndoe",
		Permissions: []string{"read", "write", "delete"},
		IssuedAt:    time.Now(),
		ExpiresAt:   time.Now().Add(1 * time.Hour),
		Issuer:      "auth-server",
	}

	// Footer can contain key identifiers for key rotation
	footer := "kid:2024-01-public-key"

	// Sign the token with the private key
	token, err := pasetoV2.Sign(privateKey, claims, footer)
	if err != nil {
		panic(fmt.Errorf("failed to sign token: %w", err))
	}

	fmt.Printf("Signed Token: %s\n\n", token)

	// Verify the token with the public key
	var verifiedClaims UserClaims
	var verifiedFooter string

	err = pasetoV2.Verify(token, publicKey, &verifiedClaims, &verifiedFooter)
	if err != nil {
		panic(fmt.Errorf("failed to verify token: %w", err))
	}

	fmt.Printf("Verified Claims:\n")
	fmt.Printf("  User ID: %s\n", verifiedClaims.UserID)
	fmt.Printf("  Username: %s\n", verifiedClaims.Username)
	fmt.Printf("  Permissions: %v\n", verifiedClaims.Permissions)
	fmt.Printf("  Expires: %s\n", verifiedClaims.ExpiresAt)
}
```

## Working with PASETO v4

PASETO v4 is the latest version and is recommended for new implementations. It provides improved security margins and better key derivation.

The following example demonstrates using the go-paseto library for v4 tokens with both local and public purposes:

```go
package main

import (
	"fmt"
	"time"

	"aidanwoods.dev/go-paseto"
)

func main() {
	// Demonstrate both local and public tokens with v4
	demonstrateLocalV4()
	demonstratePublicV4()
}

// demonstrateLocalV4 shows symmetric encryption with PASETO v4
func demonstrateLocalV4() {
	fmt.Println("=== PASETO v4 Local Token ===\n")

	// Generate a new symmetric key for v4 local tokens
	key := paseto.NewV4SymmetricKey()

	// Create a new token with claims
	token := paseto.NewToken()

	// Set standard claims
	token.SetIssuedAt(time.Now())
	token.SetNotBefore(time.Now())
	token.SetExpiration(time.Now().Add(2 * time.Hour))
	token.SetIssuer("my-service")
	token.SetSubject("user-session")
	token.SetAudience("api-consumers")

	// Set custom claims
	token.SetString("user_id", "usr_abc123")
	token.SetString("email", "user@example.com")
	token.Set("roles", []string{"user", "premium"})
	token.Set("metadata", map[string]interface{}{
		"login_ip":   "192.168.1.100",
		"user_agent": "Mozilla/5.0",
	})

	// Encrypt the token
	encrypted := token.V4Encrypt(key, nil)
	fmt.Printf("Encrypted Token: %s\n\n", encrypted)

	// Parse and decrypt the token
	parser := paseto.NewParser()
	parser.AddRule(paseto.NotExpired())
	parser.AddRule(paseto.ValidAt(time.Now()))

	parsedToken, err := parser.ParseV4Local(key, encrypted, nil)
	if err != nil {
		panic(fmt.Errorf("failed to parse token: %w", err))
	}

	// Extract claims from parsed token
	userID, _ := parsedToken.GetString("user_id")
	email, _ := parsedToken.GetString("email")
	issuer, _ := parsedToken.GetIssuer()
	expiration, _ := parsedToken.GetExpiration()

	fmt.Printf("Parsed Claims:\n")
	fmt.Printf("  User ID: %s\n", userID)
	fmt.Printf("  Email: %s\n", email)
	fmt.Printf("  Issuer: %s\n", issuer)
	fmt.Printf("  Expiration: %s\n\n", expiration)
}

// demonstratePublicV4 shows asymmetric signing with PASETO v4
func demonstratePublicV4() {
	fmt.Println("=== PASETO v4 Public Token ===\n")

	// Generate a new asymmetric key pair for v4 public tokens
	secretKey := paseto.NewV4AsymmetricSecretKey()
	publicKey := secretKey.Public()

	// Create a token for API access
	token := paseto.NewToken()

	token.SetIssuedAt(time.Now())
	token.SetExpiration(time.Now().Add(30 * time.Minute))
	token.SetIssuer("api-gateway")
	token.SetString("client_id", "client_xyz789")
	token.SetString("scope", "read:users write:users")
	token.Set("rate_limit", 1000)

	// Sign the token with the secret key
	signed := token.V4Sign(secretKey, nil)
	fmt.Printf("Signed Token: %s\n\n", signed)

	// Verify with the public key
	parser := paseto.NewParser()
	parser.AddRule(paseto.NotExpired())
	parser.AddRule(paseto.IssuedBy("api-gateway"))

	parsedToken, err := parser.ParseV4Public(publicKey, signed, nil)
	if err != nil {
		panic(fmt.Errorf("failed to verify token: %w", err))
	}

	clientID, _ := parsedToken.GetString("client_id")
	scope, _ := parsedToken.GetString("scope")

	fmt.Printf("Verified Claims:\n")
	fmt.Printf("  Client ID: %s\n", clientID)
	fmt.Printf("  Scope: %s\n", scope)
}
```

## Token Validation and Rules

Proper token validation is crucial for security. PASETO libraries provide built-in validation rules that should always be used.

This example demonstrates comprehensive token validation with multiple rules:

```go
package main

import (
	"errors"
	"fmt"
	"time"

	"aidanwoods.dev/go-paseto"
)

// TokenValidator provides a reusable token validation service
type TokenValidator struct {
	key    paseto.V4SymmetricKey
	parser paseto.Parser
}

// NewTokenValidator creates a validator with standard security rules
func NewTokenValidator(key paseto.V4SymmetricKey, issuer string) *TokenValidator {
	parser := paseto.NewParser()

	// Add standard validation rules
	parser.AddRule(paseto.NotExpired())
	parser.AddRule(paseto.ValidAt(time.Now()))
	parser.AddRule(paseto.IssuedBy(issuer))

	return &TokenValidator{
		key:    key,
		parser: parser,
	}
}

// ValidateToken parses and validates a token string
func (v *TokenValidator) ValidateToken(tokenString string) (*paseto.Token, error) {
	token, err := v.parser.ParseV4Local(v.key, tokenString, nil)
	if err != nil {
		return nil, fmt.Errorf("token validation failed: %w", err)
	}

	// Perform additional custom validations
	if err := v.validateCustomClaims(token); err != nil {
		return nil, err
	}

	return token, nil
}

// validateCustomClaims performs application-specific validation
func (v *TokenValidator) validateCustomClaims(token *paseto.Token) error {
	// Ensure required claims are present
	userID, err := token.GetString("user_id")
	if err != nil || userID == "" {
		return errors.New("missing required claim: user_id")
	}

	// Validate claim formats or values
	email, err := token.GetString("email")
	if err != nil || email == "" {
		return errors.New("missing required claim: email")
	}

	return nil
}

func main() {
	// Generate a key for demonstration
	key := paseto.NewV4SymmetricKey()

	// Create a valid token
	token := paseto.NewToken()
	token.SetIssuedAt(time.Now())
	token.SetExpiration(time.Now().Add(1 * time.Hour))
	token.SetIssuer("auth-service")
	token.SetString("user_id", "user123")
	token.SetString("email", "user@example.com")

	encrypted := token.V4Encrypt(key, nil)

	// Validate the token
	validator := NewTokenValidator(key, "auth-service")
	parsedToken, err := validator.ValidateToken(encrypted)
	if err != nil {
		fmt.Printf("Validation failed: %v\n", err)
		return
	}

	userID, _ := parsedToken.GetString("user_id")
	fmt.Printf("Token valid for user: %s\n", userID)

	// Demonstrate expired token validation
	expiredToken := paseto.NewToken()
	expiredToken.SetIssuedAt(time.Now().Add(-2 * time.Hour))
	expiredToken.SetExpiration(time.Now().Add(-1 * time.Hour))
	expiredToken.SetIssuer("auth-service")
	expiredToken.SetString("user_id", "user123")
	expiredToken.SetString("email", "user@example.com")

	expiredEncrypted := expiredToken.V4Encrypt(key, nil)

	_, err = validator.ValidateToken(expiredEncrypted)
	if err != nil {
		fmt.Printf("Expected validation failure: %v\n", err)
	}
}
```

## Key Management Best Practices

Proper key management is essential for maintaining token security. Here are strategies for managing PASETO keys in production.

The following example shows a key management system with rotation support:

```go
package main

import (
	"encoding/hex"
	"fmt"
	"os"
	"sync"
	"time"

	"aidanwoods.dev/go-paseto"
)

// KeyManager handles key storage, retrieval, and rotation
type KeyManager struct {
	mu          sync.RWMutex
	currentKey  paseto.V4SymmetricKey
	currentKID  string
	previousKey *paseto.V4SymmetricKey
	previousKID string
}

// NewKeyManager creates a key manager with the current key
func NewKeyManager() (*KeyManager, error) {
	// In production, load keys from secure storage (HSM, Vault, etc.)
	keyHex := os.Getenv("PASETO_SYMMETRIC_KEY")
	if keyHex == "" {
		// Generate a new key if none exists (for demo purposes)
		key := paseto.NewV4SymmetricKey()
		return &KeyManager{
			currentKey: key,
			currentKID: generateKID(),
		}, nil
	}

	keyBytes, err := hex.DecodeString(keyHex)
	if err != nil {
		return nil, fmt.Errorf("invalid key format: %w", err)
	}

	key, err := paseto.V4SymmetricKeyFromBytes(keyBytes)
	if err != nil {
		return nil, fmt.Errorf("failed to create key: %w", err)
	}

	return &KeyManager{
		currentKey: key,
		currentKID: os.Getenv("PASETO_KEY_ID"),
	}, nil
}

// generateKID creates a unique key identifier
func generateKID() string {
	return fmt.Sprintf("k-%d", time.Now().Unix())
}

// GetCurrentKey returns the current active key
func (km *KeyManager) GetCurrentKey() (paseto.V4SymmetricKey, string) {
	km.mu.RLock()
	defer km.mu.RUnlock()
	return km.currentKey, km.currentKID
}

// GetKeyByID returns a key by its identifier
func (km *KeyManager) GetKeyByID(kid string) (*paseto.V4SymmetricKey, error) {
	km.mu.RLock()
	defer km.mu.RUnlock()

	if kid == km.currentKID {
		return &km.currentKey, nil
	}
	if km.previousKey != nil && kid == km.previousKID {
		return km.previousKey, nil
	}
	return nil, fmt.Errorf("unknown key ID: %s", kid)
}

// RotateKey generates a new key and archives the current one
func (km *KeyManager) RotateKey() {
	km.mu.Lock()
	defer km.mu.Unlock()

	// Archive current key
	km.previousKey = &km.currentKey
	km.previousKID = km.currentKID

	// Generate new key
	km.currentKey = paseto.NewV4SymmetricKey()
	km.currentKID = generateKID()

	fmt.Printf("Key rotated. New KID: %s, Previous KID: %s\n",
		km.currentKID, km.previousKID)
}

// TokenService uses KeyManager for token operations
type TokenService struct {
	keyManager *KeyManager
}

// NewTokenService creates a service with key management
func NewTokenService(km *KeyManager) *TokenService {
	return &TokenService{keyManager: km}
}

// CreateToken generates a new token with the current key
func (ts *TokenService) CreateToken(userID, email string) (string, error) {
	key, kid := ts.keyManager.GetCurrentKey()

	token := paseto.NewToken()
	token.SetIssuedAt(time.Now())
	token.SetExpiration(time.Now().Add(24 * time.Hour))
	token.SetString("user_id", userID)
	token.SetString("email", email)

	// Include key ID in footer for key selection during validation
	footer := []byte(kid)

	return token.V4Encrypt(key, footer), nil
}

// ValidateToken verifies a token using the appropriate key
func (ts *TokenService) ValidateToken(tokenString string) (*paseto.Token, error) {
	// First, extract the footer to get the key ID
	// The footer is base64url encoded after the last period
	parser := paseto.NewParser()
	parser.AddRule(paseto.NotExpired())

	// Try current key first
	key, currentKID := ts.keyManager.GetCurrentKey()
	token, err := parser.ParseV4Local(key, tokenString, nil)
	if err == nil {
		return token, nil
	}

	// Try previous key for tokens issued before rotation
	prevKey, prevErr := ts.keyManager.GetKeyByID(currentKID)
	if prevErr == nil && prevKey != nil {
		token, err = parser.ParseV4Local(*prevKey, tokenString, nil)
		if err == nil {
			return token, nil
		}
	}

	return nil, fmt.Errorf("token validation failed with all keys: %w", err)
}

func main() {
	// Initialize key manager
	km, err := NewKeyManager()
	if err != nil {
		panic(err)
	}

	// Create token service
	ts := NewTokenService(km)

	// Create a token
	token, err := ts.CreateToken("user-123", "user@example.com")
	if err != nil {
		panic(err)
	}
	fmt.Printf("Created token: %s\n\n", token)

	// Validate the token
	parsed, err := ts.ValidateToken(token)
	if err != nil {
		panic(err)
	}

	userID, _ := parsed.GetString("user_id")
	fmt.Printf("Validated token for user: %s\n\n", userID)

	// Simulate key rotation
	km.RotateKey()

	// Old token should still validate with previous key
	parsed, err = ts.ValidateToken(token)
	if err != nil {
		fmt.Printf("Old token validation after rotation: %v\n", err)
	} else {
		userID, _ = parsed.GetString("user_id")
		fmt.Printf("Old token still valid for user: %s\n", userID)
	}
}
```

## Middleware Integration

Integrating PASETO with HTTP middleware allows you to protect API endpoints efficiently.

This example shows a complete middleware implementation for the standard library and popular frameworks:

```go
package main

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"aidanwoods.dev/go-paseto"
)

// ContextKey is used for storing values in request context
type ContextKey string

const (
	// UserContextKey is the key for user claims in context
	UserContextKey ContextKey = "user"
)

// UserClaims represents authenticated user data
type UserClaims struct {
	UserID string
	Email  string
	Roles  []string
}

// PASETOMiddleware provides HTTP middleware for token authentication
type PASETOMiddleware struct {
	key    paseto.V4SymmetricKey
	parser paseto.Parser
}

// NewPASETOMiddleware creates a new middleware instance
func NewPASETOMiddleware(key paseto.V4SymmetricKey, issuer string) *PASETOMiddleware {
	parser := paseto.NewParser()
	parser.AddRule(paseto.NotExpired())
	parser.AddRule(paseto.ValidAt(time.Now()))
	parser.AddRule(paseto.IssuedBy(issuer))

	return &PASETOMiddleware{
		key:    key,
		parser: parser,
	}
}

// Authenticate is middleware that validates PASETO tokens
func (m *PASETOMiddleware) Authenticate(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Extract token from Authorization header
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "missing authorization header", http.StatusUnauthorized)
			return
		}

		// Expect format: "Bearer <token>"
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			http.Error(w, "invalid authorization format", http.StatusUnauthorized)
			return
		}

		tokenString := parts[1]

		// Parse and validate the token
		token, err := m.parser.ParseV4Local(m.key, tokenString, nil)
		if err != nil {
			http.Error(w, fmt.Sprintf("invalid token: %v", err), http.StatusUnauthorized)
			return
		}

		// Extract user claims
		userID, _ := token.GetString("user_id")
		email, _ := token.GetString("email")

		var roles []string
		token.Get("roles", &roles)

		claims := &UserClaims{
			UserID: userID,
			Email:  email,
			Roles:  roles,
		}

		// Add claims to request context
		ctx := context.WithValue(r.Context(), UserContextKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// RequireRole is middleware that checks for specific roles
func (m *PASETOMiddleware) RequireRole(role string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := r.Context().Value(UserContextKey).(*UserClaims)
			if !ok {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			hasRole := false
			for _, r := range claims.Roles {
				if r == role {
					hasRole = true
					break
				}
			}

			if !hasRole {
				http.Error(w, "insufficient permissions", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// GetUserFromContext extracts user claims from request context
func GetUserFromContext(ctx context.Context) (*UserClaims, bool) {
	claims, ok := ctx.Value(UserContextKey).(*UserClaims)
	return claims, ok
}

// Example protected handler
func protectedHandler(w http.ResponseWriter, r *http.Request) {
	user, ok := GetUserFromContext(r.Context())
	if !ok {
		http.Error(w, "user not found in context", http.StatusInternalServerError)
		return
	}

	fmt.Fprintf(w, "Hello, %s! Your roles: %v\n", user.Email, user.Roles)
}

// Example admin-only handler
func adminHandler(w http.ResponseWriter, r *http.Request) {
	user, _ := GetUserFromContext(r.Context())
	fmt.Fprintf(w, "Welcome to admin panel, %s\n", user.Email)
}

func main() {
	// Initialize key (in production, load from secure storage)
	key := paseto.NewV4SymmetricKey()

	// Create middleware
	authMiddleware := NewPASETOMiddleware(key, "my-auth-service")

	// Setup routes
	mux := http.NewServeMux()

	// Public route
	mux.HandleFunc("/public", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintln(w, "This is a public endpoint")
	})

	// Protected route
	mux.Handle("/api/profile", authMiddleware.Authenticate(
		http.HandlerFunc(protectedHandler),
	))

	// Admin-only route (requires authentication + admin role)
	mux.Handle("/api/admin", authMiddleware.Authenticate(
		authMiddleware.RequireRole("admin")(
			http.HandlerFunc(adminHandler),
		),
	))

	fmt.Println("Server starting on :8080")
	http.ListenAndServe(":8080", mux)
}
```

## Migration Strategy from JWT to PASETO

Migrating from JWT to PASETO requires careful planning to avoid disrupting existing users. Here is a phased approach.

This example demonstrates a dual-token system that supports both JWT and PASETO during migration:

```go
package main

import (
	"crypto/ed25519"
	"crypto/rand"
	"errors"
	"fmt"
	"strings"
	"time"

	"aidanwoods.dev/go-paseto"
	"github.com/golang-jwt/jwt/v5"
)

// MigrationPhase represents the current migration stage
type MigrationPhase int

const (
	// PhaseJWTOnly - Only JWT tokens are accepted
	PhaseJWTOnly MigrationPhase = iota
	// PhaseDualAccept - Both JWT and PASETO are accepted
	PhaseDualAccept
	// PhasePASETOPreferred - Issue PASETO, accept both
	PhasePASETOPreferred
	// PhasePASETOOnly - Only PASETO tokens are accepted
	PhasePASETOOnly
)

// TokenMigrator handles gradual migration from JWT to PASETO
type TokenMigrator struct {
	phase MigrationPhase

	// JWT configuration
	jwtSecret []byte

	// PASETO configuration
	pasetoSecretKey paseto.V4AsymmetricSecretKey
	pasetoPublicKey paseto.V4AsymmetricPublicKey
	pasetoParser    paseto.Parser
}

// TokenClaims represents common claims for both token types
type TokenClaims struct {
	UserID    string   `json:"user_id"`
	Email     string   `json:"email"`
	Roles     []string `json:"roles"`
	ExpiresAt time.Time
}

// NewTokenMigrator creates a migrator for JWT to PASETO transition
func NewTokenMigrator(phase MigrationPhase, jwtSecret []byte) *TokenMigrator {
	secretKey := paseto.NewV4AsymmetricSecretKey()
	publicKey := secretKey.Public()

	parser := paseto.NewParser()
	parser.AddRule(paseto.NotExpired())

	return &TokenMigrator{
		phase:           phase,
		jwtSecret:       jwtSecret,
		pasetoSecretKey: secretKey,
		pasetoPublicKey: publicKey,
		pasetoParser:    parser,
	}
}

// CreateToken generates a token based on the current migration phase
func (m *TokenMigrator) CreateToken(claims *TokenClaims) (string, string, error) {
	switch m.phase {
	case PhaseJWTOnly, PhaseDualAccept:
		token, err := m.createJWT(claims)
		return token, "jwt", err
	case PhasePASETOPreferred, PhasePASETOOnly:
		token, err := m.createPASETO(claims)
		return token, "paseto", err
	default:
		return "", "", errors.New("unknown migration phase")
	}
}

// createJWT generates a JWT token
func (m *TokenMigrator) createJWT(claims *TokenClaims) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": claims.UserID,
		"email":   claims.Email,
		"roles":   claims.Roles,
		"exp":     claims.ExpiresAt.Unix(),
		"iat":     time.Now().Unix(),
	})

	return token.SignedString(m.jwtSecret)
}

// createPASETO generates a PASETO token
func (m *TokenMigrator) createPASETO(claims *TokenClaims) (string, error) {
	token := paseto.NewToken()
	token.SetIssuedAt(time.Now())
	token.SetExpiration(claims.ExpiresAt)
	token.SetString("user_id", claims.UserID)
	token.SetString("email", claims.Email)
	token.Set("roles", claims.Roles)

	return token.V4Sign(m.pasetoSecretKey, nil), nil
}

// ValidateToken validates a token regardless of type
func (m *TokenMigrator) ValidateToken(tokenString string) (*TokenClaims, string, error) {
	// Detect token type
	tokenType := m.detectTokenType(tokenString)

	// Check if token type is allowed in current phase
	if !m.isTokenTypeAllowed(tokenType) {
		return nil, "", fmt.Errorf("token type %s not allowed in current phase", tokenType)
	}

	switch tokenType {
	case "jwt":
		claims, err := m.validateJWT(tokenString)
		return claims, "jwt", err
	case "paseto":
		claims, err := m.validatePASETO(tokenString)
		return claims, "paseto", err
	default:
		return nil, "", errors.New("unknown token format")
	}
}

// detectTokenType identifies whether a token is JWT or PASETO
func (m *TokenMigrator) detectTokenType(tokenString string) string {
	// PASETO v4 public tokens start with "v4.public."
	// PASETO v4 local tokens start with "v4.local."
	if strings.HasPrefix(tokenString, "v4.") ||
		strings.HasPrefix(tokenString, "v2.") {
		return "paseto"
	}

	// JWT has three base64url-encoded parts separated by dots
	parts := strings.Split(tokenString, ".")
	if len(parts) == 3 {
		return "jwt"
	}

	return "unknown"
}

// isTokenTypeAllowed checks if a token type is accepted in current phase
func (m *TokenMigrator) isTokenTypeAllowed(tokenType string) bool {
	switch m.phase {
	case PhaseJWTOnly:
		return tokenType == "jwt"
	case PhaseDualAccept, PhasePASETOPreferred:
		return tokenType == "jwt" || tokenType == "paseto"
	case PhasePASETOOnly:
		return tokenType == "paseto"
	default:
		return false
	}
}

// validateJWT validates a JWT token
func (m *TokenMigrator) validateJWT(tokenString string) (*TokenClaims, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return m.jwtSecret, nil
	})

	if err != nil {
		return nil, fmt.Errorf("JWT validation failed: %w", err)
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		var roles []string
		if r, ok := claims["roles"].([]interface{}); ok {
			for _, role := range r {
				if s, ok := role.(string); ok {
					roles = append(roles, s)
				}
			}
		}

		exp := time.Unix(int64(claims["exp"].(float64)), 0)

		return &TokenClaims{
			UserID:    claims["user_id"].(string),
			Email:     claims["email"].(string),
			Roles:     roles,
			ExpiresAt: exp,
		}, nil
	}

	return nil, errors.New("invalid JWT claims")
}

// validatePASETO validates a PASETO token
func (m *TokenMigrator) validatePASETO(tokenString string) (*TokenClaims, error) {
	token, err := m.pasetoParser.ParseV4Public(m.pasetoPublicKey, tokenString, nil)
	if err != nil {
		return nil, fmt.Errorf("PASETO validation failed: %w", err)
	}

	userID, _ := token.GetString("user_id")
	email, _ := token.GetString("email")
	exp, _ := token.GetExpiration()

	var roles []string
	token.Get("roles", &roles)

	return &TokenClaims{
		UserID:    userID,
		Email:     email,
		Roles:     roles,
		ExpiresAt: exp,
	}, nil
}

// MigrationReport provides statistics about token usage
type MigrationReport struct {
	JWTCount    int
	PASETOCount int
	TotalCount  int
}

func main() {
	// Demonstrate migration phases
	jwtSecret := []byte("my-jwt-secret-key-for-demo")

	fmt.Println("=== JWT to PASETO Migration Demo ===\n")

	// Phase 1: JWT Only
	fmt.Println("Phase 1: JWT Only")
	migrator := NewTokenMigrator(PhaseJWTOnly, jwtSecret)
	testMigration(migrator)

	// Phase 2: Dual Accept
	fmt.Println("\nPhase 2: Dual Accept (Issue JWT, Accept Both)")
	migrator = NewTokenMigrator(PhaseDualAccept, jwtSecret)
	testMigration(migrator)

	// Phase 3: PASETO Preferred
	fmt.Println("\nPhase 3: PASETO Preferred (Issue PASETO, Accept Both)")
	migrator = NewTokenMigrator(PhasePASETOPreferred, jwtSecret)
	testMigration(migrator)

	// Phase 4: PASETO Only
	fmt.Println("\nPhase 4: PASETO Only")
	migrator = NewTokenMigrator(PhasePASETOOnly, jwtSecret)
	testMigration(migrator)
}

func testMigration(m *TokenMigrator) {
	claims := &TokenClaims{
		UserID:    "user-123",
		Email:     "user@example.com",
		Roles:     []string{"user", "admin"},
		ExpiresAt: time.Now().Add(1 * time.Hour),
	}

	token, tokenType, err := m.CreateToken(claims)
	if err != nil {
		fmt.Printf("  Create error: %v\n", err)
		return
	}

	fmt.Printf("  Created %s token: %s...\n", tokenType, token[:50])

	validated, validatedType, err := m.ValidateToken(token)
	if err != nil {
		fmt.Printf("  Validation error: %v\n", err)
		return
	}

	fmt.Printf("  Validated %s token for user: %s\n", validatedType, validated.UserID)
}
```

## Security Best Practices

When implementing PASETO in production, follow these security guidelines:

### 1. Key Storage

Always store keys securely using dedicated secrets management:

```go
package main

import (
	"context"
	"encoding/hex"
	"fmt"
	"os"

	"aidanwoods.dev/go-paseto"
)

// SecureKeyLoader demonstrates secure key loading patterns
type SecureKeyLoader struct{}

// LoadSymmetricKey loads a key from environment variables
// In production, use a secrets manager like HashiCorp Vault,
// AWS Secrets Manager, or Google Secret Manager
func (l *SecureKeyLoader) LoadSymmetricKey() (paseto.V4SymmetricKey, error) {
	keyHex := os.Getenv("PASETO_KEY")
	if keyHex == "" {
		return paseto.V4SymmetricKey{}, fmt.Errorf("PASETO_KEY environment variable not set")
	}

	keyBytes, err := hex.DecodeString(keyHex)
	if err != nil {
		return paseto.V4SymmetricKey{}, fmt.Errorf("invalid key format: %w", err)
	}

	return paseto.V4SymmetricKeyFromBytes(keyBytes)
}

// GenerateAndPrintKey generates a new key for initial setup
func (l *SecureKeyLoader) GenerateAndPrintKey() {
	key := paseto.NewV4SymmetricKey()
	keyBytes := key.ExportBytes()
	fmt.Printf("Generated key (store securely): %s\n", hex.EncodeToString(keyBytes))
}
```

### 2. Token Lifetime Management

Use appropriate token lifetimes based on use case:

```go
package main

import (
	"time"

	"aidanwoods.dev/go-paseto"
)

// TokenType represents different token use cases
type TokenType int

const (
	AccessToken TokenType = iota
	RefreshToken
	PasswordResetToken
	EmailVerificationToken
)

// GetTokenExpiration returns appropriate expiration for token type
func GetTokenExpiration(tokenType TokenType) time.Duration {
	switch tokenType {
	case AccessToken:
		// Short-lived for API access
		return 15 * time.Minute
	case RefreshToken:
		// Longer-lived for session renewal
		return 7 * 24 * time.Hour
	case PasswordResetToken:
		// Very short-lived for security
		return 1 * time.Hour
	case EmailVerificationToken:
		// Moderate lifetime for user convenience
		return 24 * time.Hour
	default:
		return 15 * time.Minute
	}
}

// CreateTypedToken creates a token with appropriate expiration
func CreateTypedToken(key paseto.V4SymmetricKey, tokenType TokenType, userID string) string {
	token := paseto.NewToken()
	token.SetIssuedAt(time.Now())
	token.SetExpiration(time.Now().Add(GetTokenExpiration(tokenType)))
	token.SetString("user_id", userID)
	token.SetString("token_type", tokenTypeName(tokenType))

	return token.V4Encrypt(key, nil)
}

func tokenTypeName(t TokenType) string {
	names := map[TokenType]string{
		AccessToken:            "access",
		RefreshToken:           "refresh",
		PasswordResetToken:     "password_reset",
		EmailVerificationToken: "email_verification",
	}
	return names[t]
}
```

### 3. Token Revocation

Implement token revocation for security-sensitive operations:

```go
package main

import (
	"context"
	"fmt"
	"sync"
	"time"

	"aidanwoods.dev/go-paseto"
)

// TokenRevoker manages a revocation list for tokens
type TokenRevoker struct {
	mu       sync.RWMutex
	revoked  map[string]time.Time
	maxAge   time.Duration
}

// NewTokenRevoker creates a new revocation manager
func NewTokenRevoker(maxAge time.Duration) *TokenRevoker {
	tr := &TokenRevoker{
		revoked: make(map[string]time.Time),
		maxAge:  maxAge,
	}

	// Start cleanup goroutine
	go tr.cleanup()

	return tr
}

// Revoke adds a token ID to the revocation list
func (tr *TokenRevoker) Revoke(tokenID string) {
	tr.mu.Lock()
	defer tr.mu.Unlock()
	tr.revoked[tokenID] = time.Now()
}

// IsRevoked checks if a token has been revoked
func (tr *TokenRevoker) IsRevoked(tokenID string) bool {
	tr.mu.RLock()
	defer tr.mu.RUnlock()
	_, exists := tr.revoked[tokenID]
	return exists
}

// cleanup periodically removes expired entries
func (tr *TokenRevoker) cleanup() {
	ticker := time.NewTicker(1 * time.Hour)
	for range ticker.C {
		tr.mu.Lock()
		cutoff := time.Now().Add(-tr.maxAge)
		for id, revokedAt := range tr.revoked {
			if revokedAt.Before(cutoff) {
				delete(tr.revoked, id)
			}
		}
		tr.mu.Unlock()
	}
}

// ValidateWithRevocation validates a token and checks revocation
func ValidateWithRevocation(
	parser paseto.Parser,
	key paseto.V4SymmetricKey,
	tokenString string,
	revoker *TokenRevoker,
) (*paseto.Token, error) {
	token, err := parser.ParseV4Local(key, tokenString, nil)
	if err != nil {
		return nil, err
	}

	tokenID, err := token.GetString("jti")
	if err == nil && revoker.IsRevoked(tokenID) {
		return nil, fmt.Errorf("token has been revoked")
	}

	return token, nil
}
```

## Conclusion

PASETO provides a more secure and developer-friendly alternative to JWT for token-based authentication in Go applications. By eliminating algorithm negotiation, enforcing secure defaults, and simplifying the implementation, PASETO reduces the attack surface and makes it harder to introduce security vulnerabilities.

Key takeaways from this guide:

1. **Choose the Right Version**: Use PASETO v4 for new implementations as it provides the best security margins.

2. **Understand Purposes**: Use local tokens for single-service scenarios and public tokens for distributed systems where multiple services need to verify tokens.

3. **Implement Proper Validation**: Always use the parser with appropriate rules (NotExpired, ValidAt, IssuedBy) and validate all required claims.

4. **Manage Keys Securely**: Store keys in secure secret managers, implement key rotation, and maintain previous keys during rotation periods.

5. **Plan Your Migration**: If migrating from JWT, use a phased approach with a dual-token period to avoid disrupting existing users.

6. **Follow Security Best Practices**: Use appropriate token lifetimes, implement revocation for sensitive operations, and regularly rotate keys.

By following these patterns and practices, you can build secure, maintainable authentication systems in Go using PASETO.

## Further Reading

- [PASETO Specification](https://paseto.io/)
- [go-paseto Library Documentation](https://pkg.go.dev/aidanwoods.dev/go-paseto)
- [PASETO Security Claims](https://github.com/paragonie/paseto/blob/master/docs/01-Protocol-Versions/README.md)
- [JWT Security Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
