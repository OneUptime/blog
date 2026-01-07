# How to Handle JWT Authentication Securely in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, JWT, Authentication, Security, API

Description: Implement secure JWT authentication in Go with refresh token rotation, proper claims validation, token revocation, and security best practices.

---

JSON Web Tokens (JWTs) have become the de facto standard for stateless authentication in modern web applications. However, implementing JWT authentication incorrectly can lead to serious security vulnerabilities. This guide covers secure JWT implementation in Go, including refresh token rotation, claims validation, and token revocation strategies.

## Prerequisites

Before diving in, ensure you have:

- Go 1.21 or later installed
- Basic understanding of HTTP APIs in Go
- Familiarity with authentication concepts

## Setting Up the Project

First, initialize your Go module and install the required dependencies:

```bash
go mod init github.com/yourorg/jwt-auth-example
go get github.com/golang-jwt/jwt/v5
go get github.com/google/uuid
go get golang.org/x/crypto/bcrypt
```

## Understanding JWT Structure

A JWT consists of three parts separated by dots: Header, Payload (Claims), and Signature. The header specifies the signing algorithm, the payload contains the claims (user data and metadata), and the signature ensures the token hasn't been tampered with.

## Defining Custom Claims

Custom claims allow you to embed application-specific data in your tokens. Here we define a structure that includes standard JWT claims plus our custom fields.

```go
package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// CustomClaims extends the standard JWT claims with application-specific fields.
// The TokenVersion field enables token revocation through version checking.
type CustomClaims struct {
	jwt.RegisteredClaims
	UserID       string   `json:"user_id"`
	Email        string   `json:"email"`
	Roles        []string `json:"roles"`
	TokenVersion int      `json:"token_version"` // Used for revocation
	TokenType    string   `json:"token_type"`    // "access" or "refresh"
}

// TokenPair contains both access and refresh tokens for a complete authentication response.
type TokenPair struct {
	AccessToken  string    `json:"access_token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
}
```

## Secure Token Configuration

Security begins with proper configuration. Never hardcode secrets, use strong algorithms, and set appropriate expiration times.

```go
package auth

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"os"
	"time"
)

// Config holds all JWT-related configuration.
// In production, load these values from environment variables or a secrets manager.
type Config struct {
	AccessTokenSecret  []byte
	RefreshTokenSecret []byte
	AccessTokenTTL     time.Duration
	RefreshTokenTTL    time.Duration
	Issuer             string
	Audience           []string
}

// Common errors for JWT operations
var (
	ErrInvalidToken     = errors.New("invalid token")
	ErrExpiredToken     = errors.New("token has expired")
	ErrInvalidClaims    = errors.New("invalid token claims")
	ErrTokenRevoked     = errors.New("token has been revoked")
	ErrInvalidTokenType = errors.New("invalid token type")
)

// NewConfig creates a secure configuration from environment variables.
// It enforces minimum secret lengths and sensible default TTLs.
func NewConfig() (*Config, error) {
	accessSecret := os.Getenv("JWT_ACCESS_SECRET")
	refreshSecret := os.Getenv("JWT_REFRESH_SECRET")

	// Enforce minimum secret length of 32 bytes for security
	if len(accessSecret) < 32 || len(refreshSecret) < 32 {
		return nil, errors.New("JWT secrets must be at least 32 characters")
	}

	return &Config{
		AccessTokenSecret:  []byte(accessSecret),
		RefreshTokenSecret: []byte(refreshSecret),
		AccessTokenTTL:     15 * time.Minute,  // Short-lived access tokens
		RefreshTokenTTL:    7 * 24 * time.Hour, // Longer refresh token lifetime
		Issuer:             "your-app-name",
		Audience:           []string{"your-api"},
	}, nil
}

// GenerateSecureSecret creates a cryptographically secure random secret.
// Use this to generate secrets for your environment configuration.
func GenerateSecureSecret(length int) (string, error) {
	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(bytes), nil
}
```

## The JWT Service

The JWT service encapsulates all token operations. It handles creation, validation, and refresh token rotation with proper security checks.

```go
package auth

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// JWTService handles all JWT operations including creation, validation, and refresh.
type JWTService struct {
	config       *Config
	tokenStore   TokenStore // Interface for token revocation storage
}

// TokenStore defines the interface for token storage operations.
// Implement this with Redis, PostgreSQL, or any persistent storage.
type TokenStore interface {
	// StoreRefreshToken saves a refresh token with its metadata
	StoreRefreshToken(ctx context.Context, tokenID, userID string, expiresAt time.Time) error
	// GetRefreshToken retrieves refresh token metadata
	GetRefreshToken(ctx context.Context, tokenID string) (*RefreshTokenData, error)
	// RevokeRefreshToken marks a refresh token as revoked
	RevokeRefreshToken(ctx context.Context, tokenID string) error
	// RevokeAllUserTokens revokes all tokens for a specific user
	RevokeAllUserTokens(ctx context.Context, userID string) error
	// IsTokenBlacklisted checks if an access token has been blacklisted
	IsTokenBlacklisted(ctx context.Context, tokenID string) (bool, error)
	// BlacklistToken adds an access token to the blacklist
	BlacklistToken(ctx context.Context, tokenID string, expiresAt time.Time) error
	// GetUserTokenVersion returns the current token version for a user
	GetUserTokenVersion(ctx context.Context, userID string) (int, error)
	// IncrementUserTokenVersion increments and returns the new token version
	IncrementUserTokenVersion(ctx context.Context, userID string) (int, error)
}

// RefreshTokenData contains metadata about a stored refresh token.
type RefreshTokenData struct {
	TokenID   string
	UserID    string
	ExpiresAt time.Time
	Revoked   bool
	CreatedAt time.Time
}

// NewJWTService creates a new JWT service with the given configuration.
func NewJWTService(config *Config, store TokenStore) *JWTService {
	return &JWTService{
		config:     config,
		tokenStore: store,
	}
}
```

## Creating Access Tokens

Access tokens are short-lived and carry the user's identity and permissions. We use the HS256 algorithm (HMAC with SHA-256) which is secure for symmetric key scenarios.

```go
// GenerateAccessToken creates a new access token for the given user.
// The token includes user identity, roles, and a version for revocation support.
func (s *JWTService) GenerateAccessToken(ctx context.Context, userID, email string, roles []string) (string, error) {
	// Get the current token version for this user
	version, err := s.tokenStore.GetUserTokenVersion(ctx, userID)
	if err != nil {
		return "", fmt.Errorf("failed to get token version: %w", err)
	}

	now := time.Now()
	tokenID := uuid.New().String()

	claims := CustomClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        tokenID,
			Subject:   userID,
			Issuer:    s.config.Issuer,
			Audience:  s.config.Audience,
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.config.AccessTokenTTL)),
		},
		UserID:       userID,
		Email:        email,
		Roles:        roles,
		TokenVersion: version,
		TokenType:    "access",
	}

	// Create token with HS256 - avoid HS384/HS512 unless you have specific requirements
	// Never use "none" algorithm or RS256 with a symmetric secret
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	signedToken, err := token.SignedString(s.config.AccessTokenSecret)
	if err != nil {
		return "", fmt.Errorf("failed to sign access token: %w", err)
	}

	return signedToken, nil
}
```

## Creating Refresh Tokens

Refresh tokens have longer lifetimes and are stored server-side for revocation capability. Each refresh token gets a unique ID that's stored in the database.

```go
// GenerateRefreshToken creates a new refresh token for the given user.
// The token is stored in the database to enable revocation and rotation.
func (s *JWTService) GenerateRefreshToken(ctx context.Context, userID string) (string, error) {
	now := time.Now()
	tokenID := uuid.New().String()
	expiresAt := now.Add(s.config.RefreshTokenTTL)

	claims := CustomClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        tokenID,
			Subject:   userID,
			Issuer:    s.config.Issuer,
			Audience:  s.config.Audience,
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
		UserID:    userID,
		TokenType: "refresh",
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	signedToken, err := token.SignedString(s.config.RefreshTokenSecret)
	if err != nil {
		return "", fmt.Errorf("failed to sign refresh token: %w", err)
	}

	// Store the refresh token in the database for revocation support
	if err := s.tokenStore.StoreRefreshToken(ctx, tokenID, userID, expiresAt); err != nil {
		return "", fmt.Errorf("failed to store refresh token: %w", err)
	}

	return signedToken, nil
}

// GenerateTokenPair creates both access and refresh tokens for a user.
// This is typically called after successful authentication.
func (s *JWTService) GenerateTokenPair(ctx context.Context, userID, email string, roles []string) (*TokenPair, error) {
	accessToken, err := s.GenerateAccessToken(ctx, userID, email, roles)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.GenerateRefreshToken(ctx, userID)
	if err != nil {
		return nil, err
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    time.Now().Add(s.config.AccessTokenTTL),
	}, nil
}
```

## Validating Access Tokens

Token validation is critical for security. We verify the signature, check expiration, validate claims, and ensure the token hasn't been revoked.

```go
// ValidateAccessToken verifies an access token and returns its claims.
// It performs signature verification, expiration check, claims validation, and revocation check.
func (s *JWTService) ValidateAccessToken(ctx context.Context, tokenString string) (*CustomClaims, error) {
	// Parse the token with strict validation options
	token, err := jwt.ParseWithClaims(
		tokenString,
		&CustomClaims{},
		func(token *jwt.Token) (interface{}, error) {
			// Verify the signing method to prevent algorithm confusion attacks
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return s.config.AccessTokenSecret, nil
		},
		// Enable strict validation options
		jwt.WithValidMethods([]string{"HS256"}),
		jwt.WithIssuer(s.config.Issuer),
		jwt.WithAudience(s.config.Audience[0]),
		jwt.WithExpirationRequired(),
	)

	if err != nil {
		if errors.Is(err, jwt.ErrTokenExpired) {
			return nil, ErrExpiredToken
		}
		return nil, fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}

	claims, ok := token.Claims.(*CustomClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidClaims
	}

	// Verify this is an access token, not a refresh token
	if claims.TokenType != "access" {
		return nil, ErrInvalidTokenType
	}

	// Check if the token has been blacklisted
	blacklisted, err := s.tokenStore.IsTokenBlacklisted(ctx, claims.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to check token blacklist: %w", err)
	}
	if blacklisted {
		return nil, ErrTokenRevoked
	}

	// Verify token version matches current user version (for mass revocation)
	currentVersion, err := s.tokenStore.GetUserTokenVersion(ctx, claims.UserID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user token version: %w", err)
	}
	if claims.TokenVersion < currentVersion {
		return nil, ErrTokenRevoked
	}

	return claims, nil
}
```

## Refresh Token Rotation

Refresh token rotation is a security best practice where each use of a refresh token generates a new one. This limits the window of opportunity for stolen refresh tokens.

```go
// RefreshTokens implements refresh token rotation.
// It validates the refresh token, revokes it, and issues a new token pair.
// This prevents refresh token reuse and limits the damage from stolen tokens.
func (s *JWTService) RefreshTokens(ctx context.Context, refreshTokenString string, email string, roles []string) (*TokenPair, error) {
	// Parse and validate the refresh token
	token, err := jwt.ParseWithClaims(
		refreshTokenString,
		&CustomClaims{},
		func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			return s.config.RefreshTokenSecret, nil
		},
		jwt.WithValidMethods([]string{"HS256"}),
		jwt.WithIssuer(s.config.Issuer),
		jwt.WithAudience(s.config.Audience[0]),
		jwt.WithExpirationRequired(),
	)

	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidToken, err)
	}

	claims, ok := token.Claims.(*CustomClaims)
	if !ok || !token.Valid {
		return nil, ErrInvalidClaims
	}

	// Verify this is a refresh token
	if claims.TokenType != "refresh" {
		return nil, ErrInvalidTokenType
	}

	// Check if the refresh token exists and is not revoked
	storedToken, err := s.tokenStore.GetRefreshToken(ctx, claims.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get stored refresh token: %w", err)
	}
	if storedToken == nil {
		return nil, ErrInvalidToken
	}
	if storedToken.Revoked {
		// Potential token theft detected - revoke all user tokens
		// This is a security measure: if someone tries to use an already-used refresh token,
		// it might indicate the token was stolen
		_ = s.tokenStore.RevokeAllUserTokens(ctx, claims.UserID)
		return nil, ErrTokenRevoked
	}

	// Revoke the old refresh token (rotation)
	if err := s.tokenStore.RevokeRefreshToken(ctx, claims.ID); err != nil {
		return nil, fmt.Errorf("failed to revoke old refresh token: %w", err)
	}

	// Generate new token pair
	return s.GenerateTokenPair(ctx, claims.UserID, email, roles)
}
```

## Token Revocation Strategies

There are multiple approaches to token revocation. Here we implement both blacklisting (for individual tokens) and version-based revocation (for mass revocation).

```go
// RevokeAccessToken adds an access token to the blacklist.
// Use this for immediate revocation of a specific token (e.g., on logout).
func (s *JWTService) RevokeAccessToken(ctx context.Context, tokenString string) error {
	// Parse without full validation - we just need the claims
	token, _, err := jwt.NewParser().ParseUnverified(tokenString, &CustomClaims{})
	if err != nil {
		return fmt.Errorf("failed to parse token: %w", err)
	}

	claims, ok := token.Claims.(*CustomClaims)
	if !ok {
		return ErrInvalidClaims
	}

	// Add to blacklist with the token's original expiration
	// This ensures we don't keep blacklist entries forever
	return s.tokenStore.BlacklistToken(ctx, claims.ID, claims.ExpiresAt.Time)
}

// RevokeAllUserTokens invalidates all tokens for a user.
// Use this when a user changes their password or is compromised.
// This works by incrementing the user's token version, making all existing tokens invalid.
func (s *JWTService) RevokeAllUserTokens(ctx context.Context, userID string) error {
	// Increment the token version - all tokens with lower versions become invalid
	_, err := s.tokenStore.IncrementUserTokenVersion(ctx, userID)
	if err != nil {
		return fmt.Errorf("failed to increment token version: %w", err)
	}

	// Also revoke all refresh tokens in the database
	return s.tokenStore.RevokeAllUserTokens(ctx, userID)
}
```

## Redis Token Store Implementation

Here's a production-ready Redis implementation of the TokenStore interface. Redis is ideal for token storage due to its speed and built-in expiration support.

```go
package auth

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

// RedisTokenStore implements TokenStore using Redis for high-performance token storage.
type RedisTokenStore struct {
	client *redis.Client
}

// Key prefixes for different data types
const (
	refreshTokenPrefix = "refresh_token:"
	blacklistPrefix    = "blacklist:"
	tokenVersionPrefix = "token_version:"
	userTokensPrefix   = "user_tokens:"
)

// NewRedisTokenStore creates a new Redis-backed token store.
func NewRedisTokenStore(addr, password string, db int) *RedisTokenStore {
	client := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})
	return &RedisTokenStore{client: client}
}

// StoreRefreshToken saves a refresh token with automatic expiration.
func (s *RedisTokenStore) StoreRefreshToken(ctx context.Context, tokenID, userID string, expiresAt time.Time) error {
	data := &RefreshTokenData{
		TokenID:   tokenID,
		UserID:    userID,
		ExpiresAt: expiresAt,
		Revoked:   false,
		CreatedAt: time.Now(),
	}

	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}

	// Store with TTL matching the token expiration
	ttl := time.Until(expiresAt)
	if err := s.client.Set(ctx, refreshTokenPrefix+tokenID, jsonData, ttl).Err(); err != nil {
		return err
	}

	// Also add to user's token set for bulk revocation
	return s.client.SAdd(ctx, userTokensPrefix+userID, tokenID).Err()
}

// GetRefreshToken retrieves a refresh token's metadata.
func (s *RedisTokenStore) GetRefreshToken(ctx context.Context, tokenID string) (*RefreshTokenData, error) {
	jsonData, err := s.client.Get(ctx, refreshTokenPrefix+tokenID).Bytes()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var data RefreshTokenData
	if err := json.Unmarshal(jsonData, &data); err != nil {
		return nil, err
	}

	return &data, nil
}

// RevokeRefreshToken marks a refresh token as revoked.
func (s *RedisTokenStore) RevokeRefreshToken(ctx context.Context, tokenID string) error {
	data, err := s.GetRefreshToken(ctx, tokenID)
	if err != nil || data == nil {
		return err
	}

	data.Revoked = true
	jsonData, err := json.Marshal(data)
	if err != nil {
		return err
	}

	// Keep the same TTL
	ttl := time.Until(data.ExpiresAt)
	return s.client.Set(ctx, refreshTokenPrefix+tokenID, jsonData, ttl).Err()
}

// RevokeAllUserTokens revokes all refresh tokens for a user.
func (s *RedisTokenStore) RevokeAllUserTokens(ctx context.Context, userID string) error {
	// Get all token IDs for this user
	tokenIDs, err := s.client.SMembers(ctx, userTokensPrefix+userID).Result()
	if err != nil {
		return err
	}

	// Revoke each token
	for _, tokenID := range tokenIDs {
		if err := s.RevokeRefreshToken(ctx, tokenID); err != nil {
			// Log but continue with other tokens
			continue
		}
	}

	return nil
}

// IsTokenBlacklisted checks if an access token is blacklisted.
func (s *RedisTokenStore) IsTokenBlacklisted(ctx context.Context, tokenID string) (bool, error) {
	exists, err := s.client.Exists(ctx, blacklistPrefix+tokenID).Result()
	return exists > 0, err
}

// BlacklistToken adds an access token to the blacklist.
func (s *RedisTokenStore) BlacklistToken(ctx context.Context, tokenID string, expiresAt time.Time) error {
	ttl := time.Until(expiresAt)
	if ttl <= 0 {
		// Token already expired, no need to blacklist
		return nil
	}
	return s.client.Set(ctx, blacklistPrefix+tokenID, "1", ttl).Err()
}

// GetUserTokenVersion returns the current token version for a user.
func (s *RedisTokenStore) GetUserTokenVersion(ctx context.Context, userID string) (int, error) {
	version, err := s.client.Get(ctx, tokenVersionPrefix+userID).Int()
	if err == redis.Nil {
		return 0, nil // Default version is 0
	}
	return version, err
}

// IncrementUserTokenVersion atomically increments the token version.
func (s *RedisTokenStore) IncrementUserTokenVersion(ctx context.Context, userID string) (int, error) {
	return s.client.Incr(ctx, tokenVersionPrefix+userID).Result()
}
```

## HTTP Middleware for Authentication

This middleware extracts and validates JWT tokens from incoming requests, making the claims available to handlers.

```go
package auth

import (
	"context"
	"net/http"
	"strings"
)

// ContextKey is a custom type for context keys to avoid collisions.
type ContextKey string

const (
	// ClaimsContextKey is the context key for storing JWT claims.
	ClaimsContextKey ContextKey = "claims"
)

// AuthMiddleware creates an HTTP middleware that validates JWT tokens.
// It extracts the token from the Authorization header and validates it.
func AuthMiddleware(jwtService *JWTService) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract the Authorization header
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				http.Error(w, "missing authorization header", http.StatusUnauthorized)
				return
			}

			// Verify Bearer token format
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "bearer") {
				http.Error(w, "invalid authorization header format", http.StatusUnauthorized)
				return
			}

			tokenString := parts[1]

			// Validate the token
			claims, err := jwtService.ValidateAccessToken(r.Context(), tokenString)
			if err != nil {
				switch {
				case errors.Is(err, ErrExpiredToken):
					http.Error(w, "token expired", http.StatusUnauthorized)
				case errors.Is(err, ErrTokenRevoked):
					http.Error(w, "token revoked", http.StatusUnauthorized)
				default:
					http.Error(w, "invalid token", http.StatusUnauthorized)
				}
				return
			}

			// Add claims to the request context
			ctx := context.WithValue(r.Context(), ClaimsContextKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetClaimsFromContext extracts the JWT claims from the request context.
func GetClaimsFromContext(ctx context.Context) (*CustomClaims, bool) {
	claims, ok := ctx.Value(ClaimsContextKey).(*CustomClaims)
	return claims, ok
}

// RequireRoles creates middleware that checks if the user has any of the specified roles.
func RequireRoles(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims, ok := GetClaimsFromContext(r.Context())
			if !ok {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}

			// Check if user has any of the required roles
			hasRole := false
			for _, requiredRole := range roles {
				for _, userRole := range claims.Roles {
					if userRole == requiredRole {
						hasRole = true
						break
					}
				}
				if hasRole {
					break
				}
			}

			if !hasRole {
				http.Error(w, "forbidden", http.StatusForbidden)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
```

## Complete Authentication Handlers

These handlers demonstrate a complete authentication flow including login, token refresh, and logout.

```go
package auth

import (
	"encoding/json"
	"net/http"
	"time"
)

// AuthHandler handles authentication-related HTTP requests.
type AuthHandler struct {
	jwtService  *JWTService
	userService UserService // Your user service interface
}

// UserService defines the interface for user operations.
type UserService interface {
	ValidateCredentials(ctx context.Context, email, password string) (*User, error)
	GetUserByID(ctx context.Context, userID string) (*User, error)
}

// User represents a user in the system.
type User struct {
	ID       string
	Email    string
	Roles    []string
	Password string // Hashed password
}

// LoginRequest represents the login request body.
type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Login handles user authentication and returns a token pair.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid request body", http.StatusBadRequest)
		return
	}

	// Validate credentials
	user, err := h.userService.ValidateCredentials(r.Context(), req.Email, req.Password)
	if err != nil {
		// Use a generic message to prevent user enumeration
		http.Error(w, "invalid credentials", http.StatusUnauthorized)
		return
	}

	// Generate token pair
	tokenPair, err := h.jwtService.GenerateTokenPair(r.Context(), user.ID, user.Email, user.Roles)
	if err != nil {
		http.Error(w, "failed to generate tokens", http.StatusInternalServerError)
		return
	}

	// Set refresh token as HTTP-only cookie for added security
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    tokenPair.RefreshToken,
		HttpOnly: true,
		Secure:   true, // Always use HTTPS in production
		SameSite: http.SameSiteStrictMode,
		Path:     "/api/auth/refresh",
		MaxAge:   int(7 * 24 * time.Hour / time.Second),
	})

	// Return access token in response body
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"access_token": tokenPair.AccessToken,
		"expires_at":   tokenPair.ExpiresAt,
	})
}

// RefreshRequest represents the refresh token request.
type RefreshRequest struct {
	RefreshToken string `json:"refresh_token,omitempty"`
}

// Refresh handles token refresh with rotation.
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var refreshToken string

	// Try to get refresh token from cookie first
	cookie, err := r.Cookie("refresh_token")
	if err == nil {
		refreshToken = cookie.Value
	} else {
		// Fall back to request body
		var req RefreshRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "invalid request body", http.StatusBadRequest)
			return
		}
		refreshToken = req.RefreshToken
	}

	if refreshToken == "" {
		http.Error(w, "refresh token required", http.StatusBadRequest)
		return
	}

	// Parse the refresh token to get user ID
	token, _, _ := jwt.NewParser().ParseUnverified(refreshToken, &CustomClaims{})
	claims := token.Claims.(*CustomClaims)

	// Get user to retrieve current roles
	user, err := h.userService.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		http.Error(w, "user not found", http.StatusUnauthorized)
		return
	}

	// Perform token refresh with rotation
	tokenPair, err := h.jwtService.RefreshTokens(r.Context(), refreshToken, user.Email, user.Roles)
	if err != nil {
		http.Error(w, "invalid refresh token", http.StatusUnauthorized)
		return
	}

	// Update the refresh token cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    tokenPair.RefreshToken,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
		Path:     "/api/auth/refresh",
		MaxAge:   int(7 * 24 * time.Hour / time.Second),
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"access_token": tokenPair.AccessToken,
		"expires_at":   tokenPair.ExpiresAt,
	})
}

// Logout handles user logout by revoking tokens.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	// Get the access token from the Authorization header
	authHeader := r.Header.Get("Authorization")
	if authHeader != "" {
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) == 2 {
			// Revoke the access token
			_ = h.jwtService.RevokeAccessToken(r.Context(), parts[1])
		}
	}

	// Clear the refresh token cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    "",
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
		Path:     "/api/auth/refresh",
		MaxAge:   -1, // Delete the cookie
	})

	w.WriteHeader(http.StatusNoContent)
}
```

## Security Best Practices Summary

When implementing JWT authentication, follow these critical security practices:

### 1. Use Strong Signing Algorithms

Always use HS256, HS384, or HS512 for symmetric keys, or RS256, RS384, RS512 for asymmetric keys. Never accept the "none" algorithm.

### 2. Keep Tokens Short-Lived

Access tokens should expire in 15-30 minutes. This limits the window of opportunity for attackers using stolen tokens.

### 3. Implement Refresh Token Rotation

Always issue a new refresh token when refreshing, and invalidate the old one. This limits damage from stolen refresh tokens.

### 4. Store Secrets Securely

Never hardcode secrets. Use environment variables or a secrets manager like HashiCorp Vault or AWS Secrets Manager.

### 5. Validate All Claims

Always validate the issuer, audience, expiration, and any custom claims. Use strict parsing options.

### 6. Use HTTPS Only

Always transmit tokens over HTTPS. Set the Secure flag on cookies containing tokens.

### 7. Implement Token Revocation

Support both individual token revocation (blacklisting) and mass revocation (version-based).

### 8. Handle Errors Securely

Never leak information about why authentication failed. Use generic error messages.

## Conclusion

Implementing JWT authentication securely in Go requires attention to many details: proper signing algorithms, short token lifetimes, refresh token rotation, and revocation mechanisms. The implementation shown here provides a solid foundation for production-ready authentication.

Remember that security is a continuous process. Stay updated on JWT best practices and regularly audit your authentication implementation for vulnerabilities. Consider using established libraries and following OWASP guidelines for web application security.

For production deployments, also consider:

- Rate limiting on authentication endpoints
- Account lockout after failed attempts
- Audit logging for security events
- Regular rotation of signing secrets
- Monitoring for unusual authentication patterns

By following these patterns and practices, you can build secure, scalable authentication for your Go applications.
