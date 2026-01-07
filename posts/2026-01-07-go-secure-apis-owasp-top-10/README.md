# How to Secure Go APIs Against OWASP Top 10

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Security, OWASP, API, Input Validation, Authentication

Description: Protect your Go APIs against OWASP Top 10 vulnerabilities with practical examples covering input validation, SQL injection prevention, authentication hardening, and more.

---

Building secure APIs is not optional in today's threat landscape. The OWASP Top 10 represents the most critical security risks to web applications, and Go developers must understand how to defend against each vulnerability. This guide provides practical, production-ready code examples for securing your Go APIs.

## Understanding the OWASP Top 10

The OWASP Top 10 is a standard awareness document representing the most critical security risks to web applications. For Go APIs, the most relevant vulnerabilities include:

1. **A01:2021 - Broken Access Control**
2. **A02:2021 - Cryptographic Failures**
3. **A03:2021 - Injection**
4. **A04:2021 - Insecure Design**
5. **A05:2021 - Security Misconfiguration**
6. **A06:2021 - Vulnerable and Outdated Components**
7. **A07:2021 - Identification and Authentication Failures**
8. **A08:2021 - Software and Data Integrity Failures**
9. **A09:2021 - Security Logging and Monitoring Failures**
10. **A10:2021 - Server-Side Request Forgery (SSRF)**

Let's dive into practical implementations for each.

## Project Setup

First, let's set up a secure Go API project with the necessary dependencies.

```go
// go.mod - Define your module and dependencies
module secure-api

go 1.22

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/golang-jwt/jwt/v5 v5.2.0
    github.com/lib/pq v1.10.9
    golang.org/x/crypto v0.18.0
    github.com/go-playground/validator/v10 v10.16.0
    github.com/rs/cors v1.10.1
    go.uber.org/zap v1.26.0
    golang.org/x/time v0.5.0
)
```

## A01: Broken Access Control

Broken access control is the number one vulnerability. It occurs when users can act outside their intended permissions.

### Role-Based Access Control (RBAC) Implementation

This middleware enforces role-based permissions on API endpoints.

```go
package middleware

import (
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"
)

// Role represents user roles in the system
type Role string

const (
    RoleAdmin  Role = "admin"
    RoleUser   Role = "user"
    RoleGuest  Role = "guest"
)

// Permission defines what actions are allowed on resources
type Permission struct {
    Resource string
    Action   string
}

// RolePermissions maps roles to their allowed permissions
var RolePermissions = map[Role][]Permission{
    RoleAdmin: {
        {Resource: "*", Action: "*"},
    },
    RoleUser: {
        {Resource: "profile", Action: "read"},
        {Resource: "profile", Action: "update"},
        {Resource: "orders", Action: "read"},
        {Resource: "orders", Action: "create"},
    },
    RoleGuest: {
        {Resource: "products", Action: "read"},
    },
}

// RequirePermission creates middleware that enforces permission checks
func RequirePermission(resource, action string) gin.HandlerFunc {
    return func(c *gin.Context) {
        // Extract user role from context (set by auth middleware)
        userRole, exists := c.Get("userRole")
        if !exists {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "authentication required",
            })
            return
        }

        role := Role(userRole.(string))

        // Check if user has required permission
        if !hasPermission(role, resource, action) {
            c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
                "error": "insufficient permissions",
            })
            return
        }

        c.Next()
    }
}

// hasPermission checks if a role has the specified permission
func hasPermission(role Role, resource, action string) bool {
    permissions, exists := RolePermissions[role]
    if !exists {
        return false
    }

    for _, p := range permissions {
        // Wildcard check for admin
        if p.Resource == "*" && p.Action == "*" {
            return true
        }
        if p.Resource == resource && p.Action == action {
            return true
        }
    }
    return false
}
```

### Object-Level Authorization

Always verify that users can only access their own resources.

```go
package handlers

import (
    "database/sql"
    "net/http"
    "strconv"

    "github.com/gin-gonic/gin"
)

type OrderHandler struct {
    db *sql.DB
}

// GetOrder retrieves an order only if it belongs to the authenticated user
func (h *OrderHandler) GetOrder(c *gin.Context) {
    // Get authenticated user ID from context
    userID, _ := c.Get("userID")

    // Parse order ID from URL parameter
    orderID, err := strconv.ParseInt(c.Param("id"), 10, 64)
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "invalid order ID"})
        return
    }

    // Always include user_id in the WHERE clause to prevent IDOR attacks
    var order Order
    err = h.db.QueryRow(`
        SELECT id, user_id, product_id, quantity, status, created_at
        FROM orders
        WHERE id = $1 AND user_id = $2
    `, orderID, userID).Scan(
        &order.ID, &order.UserID, &order.ProductID,
        &order.Quantity, &order.Status, &order.CreatedAt,
    )

    if err == sql.ErrNoRows {
        // Return 404 instead of 403 to avoid leaking information
        c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
        return
    }
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": "database error"})
        return
    }

    c.JSON(http.StatusOK, order)
}
```

## A02: Cryptographic Failures

Protect sensitive data with proper encryption and secure password handling.

### Secure Password Hashing with Argon2id

Argon2id is the recommended algorithm for password hashing.

```go
package auth

import (
    "crypto/rand"
    "crypto/subtle"
    "encoding/base64"
    "errors"
    "fmt"
    "strings"

    "golang.org/x/crypto/argon2"
)

// Argon2idParams defines the parameters for Argon2id hashing
type Argon2idParams struct {
    Memory      uint32
    Iterations  uint32
    Parallelism uint8
    SaltLength  uint32
    KeyLength   uint32
}

// DefaultParams provides secure defaults for Argon2id
var DefaultParams = &Argon2idParams{
    Memory:      64 * 1024, // 64 MB
    Iterations:  3,
    Parallelism: 2,
    SaltLength:  16,
    KeyLength:   32,
}

// HashPassword creates a secure hash of the password using Argon2id
func HashPassword(password string) (string, error) {
    p := DefaultParams

    // Generate a cryptographically secure random salt
    salt := make([]byte, p.SaltLength)
    if _, err := rand.Read(salt); err != nil {
        return "", err
    }

    // Hash the password with Argon2id
    hash := argon2.IDKey(
        []byte(password),
        salt,
        p.Iterations,
        p.Memory,
        p.Parallelism,
        p.KeyLength,
    )

    // Encode the hash in a standard format
    encodedHash := fmt.Sprintf(
        "$argon2id$v=%d$m=%d,t=%d,p=%d$%s$%s",
        argon2.Version,
        p.Memory,
        p.Iterations,
        p.Parallelism,
        base64.RawStdEncoding.EncodeToString(salt),
        base64.RawStdEncoding.EncodeToString(hash),
    )

    return encodedHash, nil
}

// VerifyPassword checks if a password matches the stored hash
func VerifyPassword(password, encodedHash string) (bool, error) {
    // Parse the encoded hash
    parts := strings.Split(encodedHash, "$")
    if len(parts) != 6 {
        return false, errors.New("invalid hash format")
    }

    var version int
    var memory, iterations uint32
    var parallelism uint8

    _, err := fmt.Sscanf(parts[2], "v=%d", &version)
    if err != nil {
        return false, err
    }

    _, err = fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memory, &iterations, &parallelism)
    if err != nil {
        return false, err
    }

    salt, err := base64.RawStdEncoding.DecodeString(parts[4])
    if err != nil {
        return false, err
    }

    storedHash, err := base64.RawStdEncoding.DecodeString(parts[5])
    if err != nil {
        return false, err
    }

    // Compute hash with same parameters
    computedHash := argon2.IDKey(
        []byte(password),
        salt,
        iterations,
        memory,
        parallelism,
        uint32(len(storedHash)),
    )

    // Use constant-time comparison to prevent timing attacks
    return subtle.ConstantTimeCompare(storedHash, computedHash) == 1, nil
}
```

## A03: Injection Prevention

SQL injection and other injection attacks remain critical threats.

### Parameterized Queries with database/sql

Always use parameterized queries, never string concatenation.

```go
package repository

import (
    "context"
    "database/sql"
    "time"
)

type UserRepository struct {
    db *sql.DB
}

type User struct {
    ID        int64
    Email     string
    Name      string
    CreatedAt time.Time
}

// INSECURE: Never do this - vulnerable to SQL injection
// func (r *UserRepository) FindByEmailUnsafe(email string) (*User, error) {
//     query := "SELECT * FROM users WHERE email = '" + email + "'"
//     return r.db.Query(query)
// }

// SECURE: Always use parameterized queries
func (r *UserRepository) FindByEmail(ctx context.Context, email string) (*User, error) {
    // Use $1, $2, etc. for PostgreSQL placeholders
    // Use ?, ?, etc. for MySQL placeholders
    query := `
        SELECT id, email, name, created_at
        FROM users
        WHERE email = $1
    `

    var user User
    err := r.db.QueryRowContext(ctx, query, email).Scan(
        &user.ID,
        &user.Email,
        &user.Name,
        &user.CreatedAt,
    )

    if err == sql.ErrNoRows {
        return nil, nil
    }
    if err != nil {
        return nil, err
    }

    return &user, nil
}

// SearchUsers demonstrates safe handling of dynamic queries
func (r *UserRepository) SearchUsers(ctx context.Context, filters SearchFilters) ([]User, error) {
    // Build query dynamically but safely
    query := `SELECT id, email, name, created_at FROM users WHERE 1=1`
    args := []interface{}{}
    argIndex := 1

    if filters.Name != "" {
        query += fmt.Sprintf(" AND name ILIKE $%d", argIndex)
        args = append(args, "%"+filters.Name+"%")
        argIndex++
    }

    if filters.Email != "" {
        query += fmt.Sprintf(" AND email = $%d", argIndex)
        args = append(args, filters.Email)
        argIndex++
    }

    // Safe ORDER BY - validate against allowed columns
    allowedSortColumns := map[string]bool{
        "created_at": true,
        "name":       true,
        "email":      true,
    }

    if filters.SortBy != "" && allowedSortColumns[filters.SortBy] {
        sortOrder := "ASC"
        if filters.SortDesc {
            sortOrder = "DESC"
        }
        query += fmt.Sprintf(" ORDER BY %s %s", filters.SortBy, sortOrder)
    }

    rows, err := r.db.QueryContext(ctx, query, args...)
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var users []User
    for rows.Next() {
        var u User
        if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.CreatedAt); err != nil {
            return nil, err
        }
        users = append(users, u)
    }

    return users, nil
}
```

### Command Injection Prevention

Avoid shell commands when possible, or sanitize inputs rigorously.

```go
package utils

import (
    "errors"
    "os/exec"
    "regexp"
    "strings"
)

// SafeFilename validates that a filename contains only safe characters
func SafeFilename(filename string) error {
    // Allow only alphanumeric, dash, underscore, and dot
    validPattern := regexp.MustCompile(`^[a-zA-Z0-9_\-\.]+$`)
    if !validPattern.MatchString(filename) {
        return errors.New("invalid filename characters")
    }

    // Prevent directory traversal
    if strings.Contains(filename, "..") {
        return errors.New("directory traversal not allowed")
    }

    return nil
}

// ProcessFile demonstrates safe command execution
func ProcessFile(filename string) error {
    // Validate filename first
    if err := SafeFilename(filename); err != nil {
        return err
    }

    // Use exec.Command with separate arguments (not shell execution)
    // This prevents shell injection
    cmd := exec.Command("convert", filename, "-resize", "100x100", "output.png")

    // Set a safe working directory
    cmd.Dir = "/var/uploads"

    // Clear environment to prevent environment variable attacks
    cmd.Env = []string{}

    return cmd.Run()
}
```

## A04: Insecure Design - Input Validation

Comprehensive input validation is the first line of defense.

### Request Validation with go-playground/validator

Define strict validation rules for all input data.

```go
package dto

import (
    "regexp"
    "unicode"

    "github.com/go-playground/validator/v10"
)

// Initialize validator with custom validations
var validate *validator.Validate

func init() {
    validate = validator.New()

    // Register custom password validation
    validate.RegisterValidation("strongpassword", validateStrongPassword)

    // Register custom username validation
    validate.RegisterValidation("safename", validateSafeName)
}

// CreateUserRequest defines the structure for user registration
type CreateUserRequest struct {
    Email    string `json:"email" validate:"required,email,max=255"`
    Username string `json:"username" validate:"required,min=3,max=30,safename"`
    Password string `json:"password" validate:"required,min=12,max=128,strongpassword"`
    Name     string `json:"name" validate:"required,min=2,max=100"`
    Age      int    `json:"age" validate:"omitempty,gte=13,lte=150"`
}

// validateStrongPassword ensures password meets security requirements
func validateStrongPassword(fl validator.FieldLevel) bool {
    password := fl.Field().String()

    var (
        hasUpper   bool
        hasLower   bool
        hasNumber  bool
        hasSpecial bool
    )

    for _, char := range password {
        switch {
        case unicode.IsUpper(char):
            hasUpper = true
        case unicode.IsLower(char):
            hasLower = true
        case unicode.IsDigit(char):
            hasNumber = true
        case unicode.IsPunct(char) || unicode.IsSymbol(char):
            hasSpecial = true
        }
    }

    return hasUpper && hasLower && hasNumber && hasSpecial
}

// validateSafeName prevents injection in usernames
func validateSafeName(fl validator.FieldLevel) bool {
    name := fl.Field().String()

    // Only allow alphanumeric, underscore, and dash
    safePattern := regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)
    return safePattern.MatchString(name)
}

// Validate validates the request struct
func (r *CreateUserRequest) Validate() error {
    return validate.Struct(r)
}

// ValidateRequest is a generic validation function for any struct
func ValidateRequest(req interface{}) error {
    return validate.Struct(req)
}
```

### Input Sanitization Middleware

Sanitize all input before processing.

```go
package middleware

import (
    "bytes"
    "html"
    "io"
    "net/http"
    "regexp"
    "strings"

    "github.com/gin-gonic/gin"
)

// InputSanitizer provides methods to clean user input
type InputSanitizer struct {
    // Maximum allowed request body size (1MB default)
    MaxBodySize int64
}

func NewInputSanitizer() *InputSanitizer {
    return &InputSanitizer{
        MaxBodySize: 1 << 20, // 1 MB
    }
}

// Middleware returns a Gin middleware that sanitizes input
func (s *InputSanitizer) Middleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Limit request body size to prevent DoS
        c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, s.MaxBodySize)

        // Sanitize query parameters
        for key, values := range c.Request.URL.Query() {
            for i, value := range values {
                c.Request.URL.Query()[key][i] = s.SanitizeString(value)
            }
        }

        c.Next()
    }
}

// SanitizeString removes potentially dangerous characters
func (s *InputSanitizer) SanitizeString(input string) string {
    // Remove null bytes
    input = strings.ReplaceAll(input, "\x00", "")

    // HTML escape to prevent XSS
    input = html.EscapeString(input)

    // Remove control characters except newline and tab
    controlChars := regexp.MustCompile(`[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]`)
    input = controlChars.ReplaceAllString(input, "")

    // Trim whitespace
    input = strings.TrimSpace(input)

    return input
}

// SanitizeEmail specifically sanitizes email addresses
func (s *InputSanitizer) SanitizeEmail(email string) string {
    email = strings.TrimSpace(email)
    email = strings.ToLower(email)

    // Remove any characters that shouldn't be in an email
    validEmail := regexp.MustCompile(`[^a-z0-9@._+-]`)
    email = validEmail.ReplaceAllString(email, "")

    return email
}
```

## A05: Security Misconfiguration

Proper security headers and CORS configuration are essential.

### Security Headers Middleware

Add comprehensive security headers to all responses.

```go
package middleware

import (
    "github.com/gin-gonic/gin"
)

// SecurityHeaders adds security headers to all responses
func SecurityHeaders() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Prevent MIME type sniffing
        c.Header("X-Content-Type-Options", "nosniff")

        // Enable XSS filter in browsers (legacy, but still useful)
        c.Header("X-XSS-Protection", "1; mode=block")

        // Prevent clickjacking
        c.Header("X-Frame-Options", "DENY")

        // Control referrer information
        c.Header("Referrer-Policy", "strict-origin-when-cross-origin")

        // Permissions Policy (formerly Feature Policy)
        c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")

        // Content Security Policy - adjust based on your needs
        c.Header("Content-Security-Policy",
            "default-src 'self'; "+
            "script-src 'self'; "+
            "style-src 'self' 'unsafe-inline'; "+
            "img-src 'self' data: https:; "+
            "font-src 'self'; "+
            "connect-src 'self'; "+
            "frame-ancestors 'none'; "+
            "form-action 'self'; "+
            "base-uri 'self'")

        // Strict Transport Security (for HTTPS)
        c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")

        // Prevent caching of sensitive responses
        if c.Request.URL.Path != "/public" {
            c.Header("Cache-Control", "no-store, no-cache, must-revalidate, private")
            c.Header("Pragma", "no-cache")
            c.Header("Expires", "0")
        }

        c.Next()
    }
}
```

### CORS Configuration

Configure CORS securely for your API.

```go
package config

import (
    "time"

    "github.com/gin-gonic/gin"
    "github.com/rs/cors"
)

// CORSConfig holds CORS configuration
type CORSConfig struct {
    AllowedOrigins   []string
    AllowedMethods   []string
    AllowedHeaders   []string
    ExposedHeaders   []string
    AllowCredentials bool
    MaxAge           int
}

// DefaultCORSConfig returns a secure CORS configuration
func DefaultCORSConfig() CORSConfig {
    return CORSConfig{
        // Explicitly list allowed origins - never use "*" with credentials
        AllowedOrigins: []string{
            "https://yourdomain.com",
            "https://app.yourdomain.com",
        },
        AllowedMethods: []string{
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS",
        },
        AllowedHeaders: []string{
            "Origin",
            "Content-Type",
            "Accept",
            "Authorization",
            "X-Request-ID",
        },
        ExposedHeaders: []string{
            "X-Request-ID",
            "X-RateLimit-Remaining",
        },
        AllowCredentials: true,
        MaxAge:           int(12 * time.Hour / time.Second),
    }
}

// CORSMiddleware creates a CORS handler using rs/cors
func CORSMiddleware(config CORSConfig) gin.HandlerFunc {
    c := cors.New(cors.Options{
        AllowedOrigins:   config.AllowedOrigins,
        AllowedMethods:   config.AllowedMethods,
        AllowedHeaders:   config.AllowedHeaders,
        ExposedHeaders:   config.ExposedHeaders,
        AllowCredentials: config.AllowCredentials,
        MaxAge:           config.MaxAge,
        // Debug mode for development only
        Debug: false,
    })

    return func(ctx *gin.Context) {
        c.HandlerFunc(ctx.Writer, ctx.Request)
        if ctx.Request.Method == "OPTIONS" {
            ctx.AbortWithStatus(204)
            return
        }
        ctx.Next()
    }
}
```

## A07: Authentication and Session Management

Secure authentication is critical for API security.

### JWT Authentication with Proper Claims

Implement secure JWT handling with refresh tokens.

```go
package auth

import (
    "crypto/rand"
    "encoding/base64"
    "errors"
    "time"

    "github.com/golang-jwt/jwt/v5"
)

var (
    ErrInvalidToken = errors.New("invalid token")
    ErrExpiredToken = errors.New("token has expired")
)

// TokenConfig holds JWT configuration
type TokenConfig struct {
    AccessTokenSecret  []byte
    RefreshTokenSecret []byte
    AccessTokenTTL     time.Duration
    RefreshTokenTTL    time.Duration
    Issuer             string
    Audience           []string
}

// Claims represents custom JWT claims
type Claims struct {
    UserID   int64    `json:"uid"`
    Email    string   `json:"email"`
    Role     string   `json:"role"`
    TokenID  string   `json:"jti"`
    jwt.RegisteredClaims
}

type TokenService struct {
    config TokenConfig
}

func NewTokenService(config TokenConfig) *TokenService {
    return &TokenService{config: config}
}

// GenerateTokenPair creates both access and refresh tokens
func (s *TokenService) GenerateTokenPair(userID int64, email, role string) (accessToken, refreshToken string, err error) {
    // Generate unique token ID to enable revocation
    tokenID, err := generateTokenID()
    if err != nil {
        return "", "", err
    }

    now := time.Now()

    // Create access token claims
    accessClaims := Claims{
        UserID:  userID,
        Email:   email,
        Role:    role,
        TokenID: tokenID,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(now.Add(s.config.AccessTokenTTL)),
            IssuedAt:  jwt.NewNumericDate(now),
            NotBefore: jwt.NewNumericDate(now),
            Issuer:    s.config.Issuer,
            Audience:  s.config.Audience,
        },
    }

    // Sign access token with HS256 (or RS256 for production)
    accessJWT := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims)
    accessToken, err = accessJWT.SignedString(s.config.AccessTokenSecret)
    if err != nil {
        return "", "", err
    }

    // Create refresh token with longer expiry
    refreshClaims := jwt.RegisteredClaims{
        ExpiresAt: jwt.NewNumericDate(now.Add(s.config.RefreshTokenTTL)),
        IssuedAt:  jwt.NewNumericDate(now),
        NotBefore: jwt.NewNumericDate(now),
        Issuer:    s.config.Issuer,
        Subject:   tokenID, // Link to access token
    }

    refreshJWT := jwt.NewWithClaims(jwt.SigningMethodHS256, refreshClaims)
    refreshToken, err = refreshJWT.SignedString(s.config.RefreshTokenSecret)
    if err != nil {
        return "", "", err
    }

    return accessToken, refreshToken, nil
}

// ValidateAccessToken validates and parses an access token
func (s *TokenService) ValidateAccessToken(tokenString string) (*Claims, error) {
    token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
        // Verify signing method
        if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
            return nil, ErrInvalidToken
        }
        return s.config.AccessTokenSecret, nil
    })

    if err != nil {
        if errors.Is(err, jwt.ErrTokenExpired) {
            return nil, ErrExpiredToken
        }
        return nil, ErrInvalidToken
    }

    claims, ok := token.Claims.(*Claims)
    if !ok || !token.Valid {
        return nil, ErrInvalidToken
    }

    return claims, nil
}

// generateTokenID creates a cryptographically secure token identifier
func generateTokenID() (string, error) {
    b := make([]byte, 32)
    if _, err := rand.Read(b); err != nil {
        return "", err
    }
    return base64.URLEncoding.EncodeToString(b), nil
}
```

### Rate Limiting

Protect against brute force and DoS attacks.

```go
package middleware

import (
    "net/http"
    "sync"
    "time"

    "github.com/gin-gonic/gin"
    "golang.org/x/time/rate"
)

// RateLimiter implements per-client rate limiting
type RateLimiter struct {
    clients map[string]*rate.Limiter
    mu      sync.RWMutex
    rate    rate.Limit
    burst   int
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(r rate.Limit, b int) *RateLimiter {
    rl := &RateLimiter{
        clients: make(map[string]*rate.Limiter),
        rate:    r,
        burst:   b,
    }

    // Clean up old entries periodically
    go rl.cleanup()

    return rl
}

// getClient retrieves or creates a limiter for the given key
func (rl *RateLimiter) getClient(key string) *rate.Limiter {
    rl.mu.Lock()
    defer rl.mu.Unlock()

    limiter, exists := rl.clients[key]
    if !exists {
        limiter = rate.NewLimiter(rl.rate, rl.burst)
        rl.clients[key] = limiter
    }

    return limiter
}

// cleanup removes stale entries
func (rl *RateLimiter) cleanup() {
    for {
        time.Sleep(time.Minute)
        rl.mu.Lock()
        // In production, track last access time and remove inactive clients
        rl.mu.Unlock()
    }
}

// Middleware returns a rate limiting middleware
func (rl *RateLimiter) Middleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Use IP address as key (consider user ID for authenticated requests)
        key := c.ClientIP()

        limiter := rl.getClient(key)

        if !limiter.Allow() {
            c.Header("Retry-After", "60")
            c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
                "error": "rate limit exceeded",
            })
            return
        }

        c.Next()
    }
}

// LoginRateLimiter provides stricter limits for login attempts
type LoginRateLimiter struct {
    attempts map[string]*loginAttempt
    mu       sync.RWMutex
}

type loginAttempt struct {
    count    int
    lastTry  time.Time
    lockout  time.Time
}

// NewLoginRateLimiter creates a rate limiter specifically for login
func NewLoginRateLimiter() *LoginRateLimiter {
    return &LoginRateLimiter{
        attempts: make(map[string]*loginAttempt),
    }
}

// CheckLoginAllowed returns whether a login attempt is allowed
func (lr *LoginRateLimiter) CheckLoginAllowed(identifier string) (bool, time.Duration) {
    lr.mu.Lock()
    defer lr.mu.Unlock()

    attempt, exists := lr.attempts[identifier]
    if !exists {
        lr.attempts[identifier] = &loginAttempt{count: 0, lastTry: time.Now()}
        return true, 0
    }

    // Check if still in lockout period
    if time.Now().Before(attempt.lockout) {
        return false, time.Until(attempt.lockout)
    }

    // Reset if last attempt was over an hour ago
    if time.Since(attempt.lastTry) > time.Hour {
        attempt.count = 0
    }

    return true, 0
}

// RecordFailedAttempt records a failed login and applies lockout if needed
func (lr *LoginRateLimiter) RecordFailedAttempt(identifier string) {
    lr.mu.Lock()
    defer lr.mu.Unlock()

    attempt, exists := lr.attempts[identifier]
    if !exists {
        lr.attempts[identifier] = &loginAttempt{count: 1, lastTry: time.Now()}
        return
    }

    attempt.count++
    attempt.lastTry = time.Now()

    // Progressive lockout
    switch {
    case attempt.count >= 10:
        attempt.lockout = time.Now().Add(time.Hour)
    case attempt.count >= 5:
        attempt.lockout = time.Now().Add(15 * time.Minute)
    case attempt.count >= 3:
        attempt.lockout = time.Now().Add(time.Minute)
    }
}
```

## A09: Security Logging and Monitoring

Comprehensive logging is essential for detecting and responding to attacks.

### Structured Security Logging

Implement detailed logging for security events.

```go
package logging

import (
    "time"

    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

// SecurityLogger provides structured security event logging
type SecurityLogger struct {
    logger *zap.Logger
}

// SecurityEvent represents a security-related event
type SecurityEvent struct {
    EventType   string
    UserID      int64
    IP          string
    UserAgent   string
    RequestPath string
    Success     bool
    Details     map[string]interface{}
}

// NewSecurityLogger creates a new security logger
func NewSecurityLogger() (*SecurityLogger, error) {
    config := zap.Config{
        Level:       zap.NewAtomicLevelAt(zap.InfoLevel),
        Development: false,
        Encoding:    "json",
        EncoderConfig: zapcore.EncoderConfig{
            TimeKey:        "timestamp",
            LevelKey:       "level",
            NameKey:        "logger",
            MessageKey:     "message",
            StacktraceKey:  "stacktrace",
            EncodeLevel:    zapcore.LowercaseLevelEncoder,
            EncodeTime:     zapcore.ISO8601TimeEncoder,
            EncodeDuration: zapcore.MillisDurationEncoder,
        },
        OutputPaths:      []string{"stdout", "/var/log/security.log"},
        ErrorOutputPaths: []string{"stderr"},
    }

    logger, err := config.Build()
    if err != nil {
        return nil, err
    }

    return &SecurityLogger{logger: logger}, nil
}

// LogAuthEvent logs authentication-related events
func (sl *SecurityLogger) LogAuthEvent(event SecurityEvent) {
    fields := []zap.Field{
        zap.String("event_type", event.EventType),
        zap.Int64("user_id", event.UserID),
        zap.String("ip_address", event.IP),
        zap.String("user_agent", event.UserAgent),
        zap.String("request_path", event.RequestPath),
        zap.Bool("success", event.Success),
        zap.Time("event_time", time.Now()),
    }

    for k, v := range event.Details {
        fields = append(fields, zap.Any(k, v))
    }

    if event.Success {
        sl.logger.Info("security_event", fields...)
    } else {
        sl.logger.Warn("security_event", fields...)
    }
}

// LogSuspiciousActivity logs potential attack attempts
func (sl *SecurityLogger) LogSuspiciousActivity(ip, userAgent, path string, reason string) {
    sl.logger.Warn("suspicious_activity",
        zap.String("ip_address", ip),
        zap.String("user_agent", userAgent),
        zap.String("request_path", path),
        zap.String("reason", reason),
        zap.Time("event_time", time.Now()),
    )
}

// LogAccessDenied logs authorization failures
func (sl *SecurityLogger) LogAccessDenied(userID int64, resource, action, ip string) {
    sl.logger.Warn("access_denied",
        zap.Int64("user_id", userID),
        zap.String("resource", resource),
        zap.String("action", action),
        zap.String("ip_address", ip),
        zap.Time("event_time", time.Now()),
    )
}
```

## A10: Server-Side Request Forgery (SSRF) Prevention

Prevent SSRF attacks when your API makes outbound requests.

```go
package security

import (
    "errors"
    "net"
    "net/http"
    "net/url"
    "strings"
    "time"
)

var (
    ErrInvalidURL       = errors.New("invalid URL")
    ErrBlockedHost      = errors.New("host is blocked")
    ErrPrivateIPBlocked = errors.New("private IP addresses are not allowed")
)

// SSRFProtector validates and restricts outbound requests
type SSRFProtector struct {
    AllowedHosts   []string
    BlockedHosts   []string
    AllowPrivateIP bool
    AllowLocalhost bool
}

// NewSSRFProtector creates a new SSRF protector with secure defaults
func NewSSRFProtector() *SSRFProtector {
    return &SSRFProtector{
        AllowedHosts:   []string{},
        BlockedHosts:   []string{},
        AllowPrivateIP: false,
        AllowLocalhost: false,
    }
}

// ValidateURL checks if a URL is safe to request
func (p *SSRFProtector) ValidateURL(rawURL string) error {
    parsedURL, err := url.Parse(rawURL)
    if err != nil {
        return ErrInvalidURL
    }

    // Only allow HTTP and HTTPS
    if parsedURL.Scheme != "http" && parsedURL.Scheme != "https" {
        return ErrInvalidURL
    }

    host := parsedURL.Hostname()

    // Check blocked hosts
    for _, blocked := range p.BlockedHosts {
        if strings.EqualFold(host, blocked) {
            return ErrBlockedHost
        }
    }

    // If allowlist is specified, check against it
    if len(p.AllowedHosts) > 0 {
        allowed := false
        for _, h := range p.AllowedHosts {
            if strings.EqualFold(host, h) {
                allowed = true
                break
            }
        }
        if !allowed {
            return ErrBlockedHost
        }
    }

    // Resolve hostname to IP and check for private ranges
    ips, err := net.LookupIP(host)
    if err != nil {
        return err
    }

    for _, ip := range ips {
        if !p.AllowLocalhost && isLocalhost(ip) {
            return ErrPrivateIPBlocked
        }
        if !p.AllowPrivateIP && isPrivateIP(ip) {
            return ErrPrivateIPBlocked
        }
    }

    return nil
}

// isLocalhost checks if IP is localhost
func isLocalhost(ip net.IP) bool {
    return ip.IsLoopback()
}

// isPrivateIP checks if IP is in a private range
func isPrivateIP(ip net.IP) bool {
    privateRanges := []string{
        "10.0.0.0/8",
        "172.16.0.0/12",
        "192.168.0.0/16",
        "169.254.0.0/16", // Link-local
        "fc00::/7",       // IPv6 private
        "fe80::/10",      // IPv6 link-local
    }

    for _, cidr := range privateRanges {
        _, network, err := net.ParseCIDR(cidr)
        if err != nil {
            continue
        }
        if network.Contains(ip) {
            return true
        }
    }

    return false
}

// SafeHTTPClient returns an HTTP client configured to prevent SSRF
func (p *SSRFProtector) SafeHTTPClient() *http.Client {
    return &http.Client{
        Timeout: 10 * time.Second,
        CheckRedirect: func(req *http.Request, via []*http.Request) error {
            // Limit redirects
            if len(via) >= 3 {
                return errors.New("too many redirects")
            }
            // Validate each redirect URL
            return p.ValidateURL(req.URL.String())
        },
    }
}
```

## Putting It All Together

Here's how to wire everything together in your main application.

```go
package main

import (
    "log"
    "time"

    "github.com/gin-gonic/gin"
    "golang.org/x/time/rate"

    "secure-api/config"
    "secure-api/middleware"
    "secure-api/auth"
    "secure-api/handlers"
    "secure-api/logging"
)

func main() {
    // Set Gin to release mode in production
    gin.SetMode(gin.ReleaseMode)

    // Initialize components
    securityLogger, err := logging.NewSecurityLogger()
    if err != nil {
        log.Fatal(err)
    }

    tokenConfig := auth.TokenConfig{
        AccessTokenSecret:  []byte("your-256-bit-secret"), // Use env var in production
        RefreshTokenSecret: []byte("another-256-bit-secret"),
        AccessTokenTTL:     15 * time.Minute,
        RefreshTokenTTL:    7 * 24 * time.Hour,
        Issuer:             "your-api",
        Audience:           []string{"your-app"},
    }
    tokenService := auth.NewTokenService(tokenConfig)

    // Create router
    router := gin.New()

    // Apply global middleware
    router.Use(gin.Recovery())
    router.Use(middleware.SecurityHeaders())
    router.Use(config.CORSMiddleware(config.DefaultCORSConfig()))

    // Rate limiting - 100 requests per minute per IP
    rateLimiter := middleware.NewRateLimiter(rate.Every(time.Minute/100), 10)
    router.Use(rateLimiter.Middleware())

    // Input sanitization
    sanitizer := middleware.NewInputSanitizer()
    router.Use(sanitizer.Middleware())

    // Public routes
    public := router.Group("/api/v1")
    {
        authHandler := handlers.NewAuthHandler(tokenService, securityLogger)
        public.POST("/register", authHandler.Register)
        public.POST("/login", authHandler.Login)
        public.POST("/refresh", authHandler.RefreshToken)
    }

    // Protected routes
    protected := router.Group("/api/v1")
    protected.Use(middleware.AuthMiddleware(tokenService))
    {
        // User routes - require user permissions
        userHandler := handlers.NewUserHandler()
        protected.GET("/profile",
            middleware.RequirePermission("profile", "read"),
            userHandler.GetProfile)
        protected.PUT("/profile",
            middleware.RequirePermission("profile", "update"),
            userHandler.UpdateProfile)

        // Order routes
        orderHandler := handlers.NewOrderHandler()
        protected.GET("/orders",
            middleware.RequirePermission("orders", "read"),
            orderHandler.ListOrders)
        protected.POST("/orders",
            middleware.RequirePermission("orders", "create"),
            orderHandler.CreateOrder)
        protected.GET("/orders/:id",
            middleware.RequirePermission("orders", "read"),
            orderHandler.GetOrder)
    }

    // Admin routes
    admin := router.Group("/api/v1/admin")
    admin.Use(middleware.AuthMiddleware(tokenService))
    admin.Use(middleware.RequireRole("admin"))
    {
        adminHandler := handlers.NewAdminHandler()
        admin.GET("/users", adminHandler.ListUsers)
        admin.DELETE("/users/:id", adminHandler.DeleteUser)
    }

    // Start server with TLS in production
    log.Fatal(router.Run(":8080"))
}
```

## Security Checklist

Before deploying your Go API, verify these security measures:

**Authentication and Authorization**
- [ ] Passwords hashed with Argon2id or bcrypt
- [ ] JWT tokens with short expiration times
- [ ] Refresh token rotation implemented
- [ ] Role-based access control enforced
- [ ] Object-level authorization checks in place

**Input Validation**
- [ ] All input validated with strict rules
- [ ] Request body size limited
- [ ] File upload restrictions implemented
- [ ] SQL injection prevented with parameterized queries

**Security Headers**
- [ ] Content-Security-Policy configured
- [ ] Strict-Transport-Security enabled
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY

**Rate Limiting and DoS Protection**
- [ ] Global rate limiting implemented
- [ ] Stricter limits on authentication endpoints
- [ ] Request timeouts configured
- [ ] Memory limits set

**Logging and Monitoring**
- [ ] Security events logged with context
- [ ] Failed authentication attempts tracked
- [ ] Logs do not contain sensitive data
- [ ] Alerting configured for suspicious activity

**CORS and Network Security**
- [ ] CORS origins explicitly whitelisted
- [ ] SSRF protections in place
- [ ] TLS 1.2+ required
- [ ] Internal services not exposed

## Conclusion

Securing Go APIs against OWASP Top 10 vulnerabilities requires a defense-in-depth approach. By implementing proper input validation, parameterized queries, secure authentication, and comprehensive logging, you can significantly reduce your attack surface.

Remember that security is an ongoing process. Regularly update dependencies, conduct security audits, and stay informed about new vulnerabilities and best practices.

The code examples in this guide provide a solid foundation, but always adapt them to your specific requirements and conduct thorough security testing before deployment.

## Additional Resources

- [OWASP Top 10](https://owasp.org/Top10/)
- [Go Security Best Practices](https://golang.org/doc/security)
- [OWASP Go Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Go_Security_Cheat_Sheet.html)
- [JWT Best Practices](https://auth0.com/docs/secure/tokens/json-web-tokens/jwt-security-best-practices)
