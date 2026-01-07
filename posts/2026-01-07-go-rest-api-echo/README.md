# How to Build REST APIs in Go with Echo

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Echo, REST API, Web Development, Backend

Description: Build high-performance REST APIs in Go with Echo framework, exploring its unique features, middleware system, and production patterns.

---

## Introduction

Echo is a high-performance, minimalist Go web framework that has gained significant popularity for building REST APIs. Unlike other frameworks, Echo focuses on simplicity without sacrificing power, offering a clean API, excellent documentation, and impressive benchmarks. In this comprehensive guide, we will explore how to build production-ready REST APIs using Echo, covering everything from basic setup to advanced patterns.

## Why Choose Echo?

Echo stands out among Go web frameworks for several reasons:

- **High Performance**: Echo is one of the fastest Go frameworks, with optimized HTTP router
- **Minimalist Design**: Clean API that is easy to learn and use
- **Extensible Middleware**: Rich middleware ecosystem with easy custom middleware creation
- **Automatic TLS**: Built-in support for Let's Encrypt certificates
- **HTTP/2 Support**: Native HTTP/2 support for improved performance
- **Data Binding**: Automatic request data binding with validation
- **Template Rendering**: Built-in template rendering support

## Project Setup

Let's start by setting up a new Echo project with a well-organized structure.

### Installing Echo

First, initialize a new Go module and install Echo:

```bash
# Create project directory and initialize Go module
mkdir echo-rest-api && cd echo-rest-api
go mod init github.com/yourusername/echo-rest-api

# Install Echo v4 and additional dependencies
go get github.com/labstack/echo/v4
go get github.com/labstack/echo/v4/middleware
go get github.com/go-playground/validator/v10
go get github.com/golang-jwt/jwt/v5
```

### Recommended Project Structure

Organize your project with a clean, scalable structure:

```
echo-rest-api/
├── cmd/
│   └── server/
│       └── main.go           # Application entry point
├── internal/
│   ├── config/
│   │   └── config.go         # Configuration management
│   ├── handler/
│   │   ├── handler.go        # Handler initialization
│   │   ├── user.go           # User handlers
│   │   └── product.go        # Product handlers
│   ├── middleware/
│   │   └── custom.go         # Custom middleware
│   ├── model/
│   │   ├── user.go           # User model
│   │   └── product.go        # Product model
│   ├── repository/
│   │   └── repository.go     # Data access layer
│   ├── service/
│   │   └── service.go        # Business logic layer
│   └── validator/
│       └── validator.go      # Custom validators
├── pkg/
│   └── response/
│       └── response.go       # Response utilities
├── go.mod
└── go.sum
```

## Basic Echo Server Setup

Here is a complete example of setting up an Echo server with essential configurations:

```go
// cmd/server/main.go
package main

import (
    "context"
    "net/http"
    "os"
    "os/signal"
    "time"

    "github.com/labstack/echo/v4"
    "github.com/labstack/echo/v4/middleware"
)

func main() {
    // Create a new Echo instance
    // Echo uses a singleton pattern for the main router
    e := echo.New()

    // Configure Echo settings
    e.Debug = true                    // Enable debug mode for development
    e.HideBanner = false              // Show Echo banner on startup

    // Register global middleware
    // These run for every request in the order they are added
    e.Use(middleware.Logger())        // Log all HTTP requests
    e.Use(middleware.Recover())       // Recover from panics gracefully

    // Define a simple health check endpoint
    e.GET("/health", func(c echo.Context) error {
        return c.JSON(http.StatusOK, map[string]string{
            "status": "healthy",
            "time":   time.Now().Format(time.RFC3339),
        })
    })

    // Start server with graceful shutdown support
    // This ensures in-flight requests complete before shutdown
    go func() {
        if err := e.Start(":8080"); err != nil && err != http.ErrServerClosed {
            e.Logger.Fatal("shutting down the server")
        }
    }()

    // Wait for interrupt signal to gracefully shutdown
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, os.Interrupt)
    <-quit

    // Allow 10 seconds for graceful shutdown
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    if err := e.Shutdown(ctx); err != nil {
        e.Logger.Fatal(err)
    }
}
```

## Routing with Path Parameters and Query Strings

Echo provides a powerful and intuitive routing system with support for path parameters, query strings, and wildcards.

### Basic Routing Patterns

```go
// internal/handler/routes.go
package handler

import (
    "net/http"
    "strconv"

    "github.com/labstack/echo/v4"
)

// SetupRoutes configures all application routes
// Organizing routes in a separate function improves maintainability
func SetupRoutes(e *echo.Echo) {
    // API versioning using route groups
    // Groups allow you to apply common prefixes and middleware
    v1 := e.Group("/api/v1")

    // User routes with RESTful conventions
    users := v1.Group("/users")
    users.GET("", listUsers)           // GET /api/v1/users
    users.POST("", createUser)         // POST /api/v1/users
    users.GET("/:id", getUser)         // GET /api/v1/users/:id
    users.PUT("/:id", updateUser)      // PUT /api/v1/users/:id
    users.DELETE("/:id", deleteUser)   // DELETE /api/v1/users/:id

    // Nested routes for related resources
    users.GET("/:id/orders", getUserOrders)  // GET /api/v1/users/:id/orders

    // Product routes
    products := v1.Group("/products")
    products.GET("", listProducts)
    products.GET("/:id", getProduct)
    products.GET("/category/:category", getProductsByCategory)
}
```

### Working with Path Parameters

```go
// internal/handler/user.go
package handler

import (
    "net/http"
    "strconv"

    "github.com/labstack/echo/v4"
)

// getUser demonstrates extracting and validating path parameters
// Path parameters are defined with :paramName in the route
func getUser(c echo.Context) error {
    // Extract the id parameter from the URL path
    // c.Param() returns the value as a string
    idParam := c.Param("id")

    // Convert string to integer with error handling
    // Always validate and convert path parameters appropriately
    id, err := strconv.ParseInt(idParam, 10, 64)
    if err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, "invalid user ID format")
    }

    // Simulate fetching user from database
    user := map[string]interface{}{
        "id":    id,
        "name":  "John Doe",
        "email": "john@example.com",
    }

    return c.JSON(http.StatusOK, user)
}

// getProductsByCategory shows using named path parameters
func getProductsByCategory(c echo.Context) error {
    // Category is a string parameter, no conversion needed
    category := c.Param("category")

    // Validate the category parameter
    validCategories := map[string]bool{
        "electronics": true,
        "clothing":    true,
        "books":       true,
    }

    if !validCategories[category] {
        return echo.NewHTTPError(http.StatusBadRequest, "invalid category")
    }

    products := []map[string]interface{}{
        {"id": 1, "name": "Product 1", "category": category},
        {"id": 2, "name": "Product 2", "category": category},
    }

    return c.JSON(http.StatusOK, products)
}
```

### Query String Parameters

```go
// internal/handler/product.go
package handler

import (
    "net/http"
    "strconv"

    "github.com/labstack/echo/v4"
)

// PaginationParams represents pagination query parameters
// Using a struct makes it easier to manage multiple query params
type PaginationParams struct {
    Page     int    `query:"page"`
    Limit    int    `query:"limit"`
    Sort     string `query:"sort"`
    Order    string `query:"order"`
    Search   string `query:"search"`
}

// listProducts demonstrates various ways to handle query parameters
func listProducts(c echo.Context) error {
    // Method 1: Direct query parameter access
    // Use QueryParam for simple cases with individual parameters
    page := c.QueryParam("page")
    limit := c.QueryParam("limit")

    // QueryParams returns all query parameters as url.Values
    allParams := c.QueryParams()
    _ = allParams // Use as needed

    // Method 2: Bind query parameters to a struct
    // This is the recommended approach for multiple parameters
    params := new(PaginationParams)
    if err := c.Bind(params); err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, "invalid query parameters")
    }

    // Set default values if not provided
    if params.Page == 0 {
        params.Page = 1
    }
    if params.Limit == 0 {
        params.Limit = 10
    }
    if params.Limit > 100 {
        params.Limit = 100  // Cap maximum limit
    }

    // Calculate offset for pagination
    offset := (params.Page - 1) * params.Limit

    // Build response with pagination metadata
    response := map[string]interface{}{
        "data": []map[string]interface{}{
            {"id": 1, "name": "Product 1"},
            {"id": 2, "name": "Product 2"},
        },
        "pagination": map[string]interface{}{
            "page":   params.Page,
            "limit":  params.Limit,
            "offset": offset,
            "total":  100,
        },
        "raw_page":  page,
        "raw_limit": limit,
    }

    return c.JSON(http.StatusOK, response)
}
```

## Built-in Middleware

Echo comes with a comprehensive set of built-in middleware for common web application needs.

### CORS Middleware

```go
// internal/middleware/cors.go
package middleware

import (
    "github.com/labstack/echo/v4"
    "github.com/labstack/echo/v4/middleware"
)

// SetupCORS configures Cross-Origin Resource Sharing
// CORS is essential for APIs consumed by web browsers
func SetupCORS(e *echo.Echo) {
    // Basic CORS configuration allowing all origins
    // Use this only for development or public APIs
    e.Use(middleware.CORS())

    // Production CORS configuration with specific origins
    // Always restrict origins in production environments
    e.Use(middleware.CORSWithConfig(middleware.CORSConfig{
        // AllowOrigins specifies which domains can access the API
        AllowOrigins: []string{
            "https://yourdomain.com",
            "https://app.yourdomain.com",
        },
        // AllowMethods specifies allowed HTTP methods
        AllowMethods: []string{
            echo.GET,
            echo.POST,
            echo.PUT,
            echo.PATCH,
            echo.DELETE,
            echo.OPTIONS,
        },
        // AllowHeaders specifies allowed request headers
        AllowHeaders: []string{
            echo.HeaderOrigin,
            echo.HeaderContentType,
            echo.HeaderAccept,
            echo.HeaderAuthorization,
            "X-Request-ID",
        },
        // ExposeHeaders specifies headers accessible to the client
        ExposeHeaders: []string{
            "X-Total-Count",
            "X-Page-Count",
        },
        // AllowCredentials allows cookies and auth headers
        AllowCredentials: true,
        // MaxAge specifies how long preflight results are cached
        MaxAge: 86400,  // 24 hours
    }))
}
```

### JWT Authentication Middleware

```go
// internal/middleware/jwt.go
package middleware

import (
    "net/http"
    "time"

    "github.com/golang-jwt/jwt/v5"
    "github.com/labstack/echo/v4"
    echojwt "github.com/labstack/echo-jwt/v4"
)

// JWTCustomClaims defines custom JWT claims structure
// Embedding jwt.RegisteredClaims includes standard claims
type JWTCustomClaims struct {
    UserID   int64  `json:"user_id"`
    Username string `json:"username"`
    Role     string `json:"role"`
    jwt.RegisteredClaims
}

// JWTSecret should be loaded from environment in production
var JWTSecret = []byte("your-256-bit-secret")

// SetupJWT configures JWT authentication middleware
func SetupJWT(e *echo.Echo) echo.MiddlewareFunc {
    // Configure JWT middleware with custom settings
    config := echojwt.Config{
        // NewClaimsFunc creates a new claims instance for parsing
        NewClaimsFunc: func(c echo.Context) jwt.Claims {
            return new(JWTCustomClaims)
        },
        // SigningKey is used to validate the token signature
        SigningKey: JWTSecret,
        // TokenLookup specifies where to find the token
        // Format: "<source>:<name>" or multiple sources separated by comma
        TokenLookup: "header:Authorization:Bearer ,cookie:token",
        // ErrorHandler customizes error responses
        ErrorHandler: func(c echo.Context, err error) error {
            return echo.NewHTTPError(http.StatusUnauthorized, "invalid or expired token")
        },
        // SuccessHandler runs after successful token validation
        SuccessHandler: func(c echo.Context) {
            // Token is valid, you can add custom logic here
        },
    }

    return echojwt.WithConfig(config)
}

// GenerateToken creates a new JWT token for a user
// Call this after successful authentication
func GenerateToken(userID int64, username, role string) (string, error) {
    // Create claims with user information and expiration
    claims := &JWTCustomClaims{
        UserID:   userID,
        Username: username,
        Role:     role,
        RegisteredClaims: jwt.RegisteredClaims{
            ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
            IssuedAt:  jwt.NewNumericDate(time.Now()),
            NotBefore: jwt.NewNumericDate(time.Now()),
            Issuer:    "echo-rest-api",
            Subject:   username,
        },
    }

    // Create token with claims and sign it
    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString(JWTSecret)
}

// GetUserFromToken extracts user claims from the JWT in context
// Use this in handlers to access authenticated user info
func GetUserFromToken(c echo.Context) (*JWTCustomClaims, error) {
    // Get the token from context (set by JWT middleware)
    token, ok := c.Get("user").(*jwt.Token)
    if !ok {
        return nil, echo.NewHTTPError(http.StatusUnauthorized, "missing token")
    }

    // Extract and return claims
    claims, ok := token.Claims.(*JWTCustomClaims)
    if !ok {
        return nil, echo.NewHTTPError(http.StatusUnauthorized, "invalid claims")
    }

    return claims, nil
}
```

### Rate Limiting Middleware

```go
// internal/middleware/ratelimit.go
package middleware

import (
    "net/http"
    "sync"
    "time"

    "github.com/labstack/echo/v4"
    "github.com/labstack/echo/v4/middleware"
)

// SetupRateLimiter configures request rate limiting
// Rate limiting protects your API from abuse and ensures fair usage
func SetupRateLimiter(e *echo.Echo) {
    // Use Echo's built-in rate limiter middleware
    // This uses an in-memory store suitable for single-instance deployments
    e.Use(middleware.RateLimiter(middleware.NewRateLimiterMemoryStore(
        // Rate: 20 requests per second per IP
        middleware.RateLimiterMemoryStoreConfig{
            Rate:      20,
            Burst:     30,  // Allow bursts up to 30 requests
            ExpiresIn: 3 * time.Minute,
        },
    )))
}

// SetupAdvancedRateLimiter provides more control over rate limiting
func SetupAdvancedRateLimiter(e *echo.Echo) {
    config := middleware.RateLimiterConfig{
        // Skipper defines a function to skip middleware
        Skipper: func(c echo.Context) bool {
            // Skip rate limiting for health checks
            return c.Path() == "/health"
        },
        // Store is the rate limiter backend
        Store: middleware.NewRateLimiterMemoryStore(
            middleware.RateLimiterMemoryStoreConfig{
                Rate:      10,
                Burst:     20,
                ExpiresIn: 5 * time.Minute,
            },
        ),
        // IdentifierExtractor determines the rate limit key
        IdentifierExtractor: func(c echo.Context) (string, error) {
            // Use API key if present, otherwise use IP
            apiKey := c.Request().Header.Get("X-API-Key")
            if apiKey != "" {
                return apiKey, nil
            }
            return c.RealIP(), nil
        },
        // ErrorHandler customizes the error response
        ErrorHandler: func(c echo.Context, err error) error {
            return c.JSON(http.StatusTooManyRequests, map[string]interface{}{
                "error":       "rate limit exceeded",
                "retry_after": "60 seconds",
            })
        },
        // DenyHandler is called when rate limit is exceeded
        DenyHandler: func(c echo.Context, identifier string, err error) error {
            return c.JSON(http.StatusTooManyRequests, map[string]interface{}{
                "error":      "too many requests",
                "identifier": identifier,
            })
        },
    }

    e.Use(middleware.RateLimiterWithConfig(config))
}
```

## Request Binding and Custom Validators

Echo provides powerful request binding capabilities that automatically parse request data into Go structs.

### Request Binding

```go
// internal/handler/binding.go
package handler

import (
    "net/http"

    "github.com/labstack/echo/v4"
)

// CreateUserRequest represents the request body for creating a user
// Tags define how fields are bound from different sources
type CreateUserRequest struct {
    // json tag binds from JSON body
    Name     string `json:"name" validate:"required,min=2,max=100"`
    Email    string `json:"email" validate:"required,email"`
    Password string `json:"password" validate:"required,min=8"`
    Age      int    `json:"age" validate:"gte=0,lte=150"`
    Role     string `json:"role" validate:"oneof=user admin moderator"`

    // query tag binds from query string
    Referral string `query:"ref"`

    // param tag binds from path parameters
    // Note: Usually path params are handled separately
}

// UpdateUserRequest demonstrates partial updates
// Pointer types allow distinguishing between missing and zero values
type UpdateUserRequest struct {
    Name  *string `json:"name" validate:"omitempty,min=2,max=100"`
    Email *string `json:"email" validate:"omitempty,email"`
    Age   *int    `json:"age" validate:"omitempty,gte=0,lte=150"`
}

// createUser demonstrates request binding with validation
func createUser(c echo.Context) error {
    // Create a new request instance
    req := new(CreateUserRequest)

    // Bind request data to struct
    // Echo automatically detects Content-Type and binds accordingly
    // Supports: JSON, XML, form data, query parameters
    if err := c.Bind(req); err != nil {
        return echo.NewHTTPError(http.StatusBadRequest, err.Error())
    }

    // Validate the bound data
    // Validation is handled by a custom validator (see below)
    if err := c.Validate(req); err != nil {
        return err  // Validator returns properly formatted error
    }

    // Process the validated request
    // In a real app, you would save to database here
    user := map[string]interface{}{
        "id":       1,
        "name":     req.Name,
        "email":    req.Email,
        "age":      req.Age,
        "role":     req.Role,
        "referral": req.Referral,
    }

    return c.JSON(http.StatusCreated, user)
}
```

### Custom Validator Setup

```go
// internal/validator/validator.go
package validator

import (
    "net/http"
    "regexp"
    "strings"

    "github.com/go-playground/validator/v10"
    "github.com/labstack/echo/v4"
)

// CustomValidator wraps go-playground/validator for Echo
// This enables automatic validation in handlers
type CustomValidator struct {
    validator *validator.Validate
}

// NewCustomValidator creates a new validator instance with custom rules
func NewCustomValidator() *CustomValidator {
    v := validator.New()

    // Register custom validation functions
    // These extend the built-in validation rules
    v.RegisterValidation("username", validateUsername)
    v.RegisterValidation("strongpass", validateStrongPassword)
    v.RegisterValidation("phone", validatePhone)

    return &CustomValidator{validator: v}
}

// Validate implements echo.Validator interface
// This method is called when you use c.Validate() in handlers
func (cv *CustomValidator) Validate(i interface{}) error {
    if err := cv.validator.Struct(i); err != nil {
        // Convert validation errors to a user-friendly format
        return formatValidationErrors(err)
    }
    return nil
}

// formatValidationErrors converts validator errors to Echo HTTP errors
func formatValidationErrors(err error) error {
    // Type assert to get validation errors
    validationErrors, ok := err.(validator.ValidationErrors)
    if !ok {
        return echo.NewHTTPError(http.StatusBadRequest, err.Error())
    }

    // Build a map of field errors
    errors := make(map[string]string)
    for _, e := range validationErrors {
        field := strings.ToLower(e.Field())
        errors[field] = formatFieldError(e)
    }

    return echo.NewHTTPError(http.StatusBadRequest, map[string]interface{}{
        "error":   "validation failed",
        "details": errors,
    })
}

// formatFieldError creates a human-readable error message
func formatFieldError(e validator.FieldError) string {
    switch e.Tag() {
    case "required":
        return "this field is required"
    case "email":
        return "invalid email format"
    case "min":
        return "value is too short"
    case "max":
        return "value is too long"
    case "gte":
        return "value is too small"
    case "lte":
        return "value is too large"
    case "oneof":
        return "value must be one of: " + e.Param()
    case "username":
        return "username can only contain letters, numbers, and underscores"
    case "strongpass":
        return "password must contain uppercase, lowercase, number, and special character"
    default:
        return "invalid value"
    }
}

// Custom validation functions

// validateUsername checks if the username format is valid
func validateUsername(fl validator.FieldLevel) bool {
    username := fl.Field().String()
    // Username: 3-20 chars, alphanumeric and underscore only
    matched, _ := regexp.MatchString(`^[a-zA-Z0-9_]{3,20}$`, username)
    return matched
}

// validateStrongPassword checks password strength
func validateStrongPassword(fl validator.FieldLevel) bool {
    password := fl.Field().String()

    // Check minimum length
    if len(password) < 8 {
        return false
    }

    // Check for required character types
    hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(password)
    hasLower := regexp.MustCompile(`[a-z]`).MatchString(password)
    hasNumber := regexp.MustCompile(`[0-9]`).MatchString(password)
    hasSpecial := regexp.MustCompile(`[!@#$%^&*(),.?":{}|<>]`).MatchString(password)

    return hasUpper && hasLower && hasNumber && hasSpecial
}

// validatePhone validates phone number format
func validatePhone(fl validator.FieldLevel) bool {
    phone := fl.Field().String()
    // Simple phone validation: 10-15 digits, optional + prefix
    matched, _ := regexp.MatchString(`^\+?[0-9]{10,15}$`, phone)
    return matched
}
```

### Registering the Validator

```go
// In your main.go, register the custom validator
func main() {
    e := echo.New()

    // Register custom validator
    // This enables c.Validate() calls in handlers
    e.Validator = validator.NewCustomValidator()

    // ... rest of setup
}
```

## Error Handling with HTTPError

Echo provides a structured approach to error handling through HTTPError and custom error handlers.

### Custom Error Handler

```go
// internal/handler/error.go
package handler

import (
    "net/http"

    "github.com/labstack/echo/v4"
)

// APIError represents a structured API error response
type APIError struct {
    Code       int         `json:"code"`
    Message    string      `json:"message"`
    Details    interface{} `json:"details,omitempty"`
    RequestID  string      `json:"request_id,omitempty"`
    StatusText string      `json:"status_text"`
}

// CustomHTTPErrorHandler provides consistent error responses
// Register this to handle all errors uniformly across the API
func CustomHTTPErrorHandler(err error, c echo.Context) {
    // Get request ID for tracing
    requestID := c.Response().Header().Get(echo.HeaderXRequestID)

    // Default error values
    code := http.StatusInternalServerError
    message := "Internal Server Error"
    var details interface{}

    // Handle different error types
    switch e := err.(type) {
    case *echo.HTTPError:
        // Echo HTTP errors (from echo.NewHTTPError)
        code = e.Code
        message = formatMessage(e.Message)
        if e.Internal != nil {
            details = e.Internal.Error()
        }
    case *APIError:
        // Custom API errors
        code = e.Code
        message = e.Message
        details = e.Details
    default:
        // Generic errors - don't expose internal details in production
        if c.Echo().Debug {
            message = err.Error()
        }
    }

    // Build error response
    response := APIError{
        Code:       code,
        Message:    message,
        Details:    details,
        RequestID:  requestID,
        StatusText: http.StatusText(code),
    }

    // Log the error for debugging
    c.Logger().Errorf("Error: %v, Request ID: %s, Path: %s",
        err, requestID, c.Request().URL.Path)

    // Send JSON response
    // Check if response was already committed
    if !c.Response().Committed {
        if c.Request().Method == http.MethodHead {
            err = c.NoContent(code)
        } else {
            err = c.JSON(code, response)
        }
        if err != nil {
            c.Logger().Error(err)
        }
    }
}

// formatMessage converts error message to string
func formatMessage(message interface{}) string {
    switch m := message.(type) {
    case string:
        return m
    case error:
        return m.Error()
    default:
        return "An error occurred"
    }
}

// Common error constructors for consistent error creation

// NewNotFoundError creates a 404 error
func NewNotFoundError(resource string) *echo.HTTPError {
    return echo.NewHTTPError(http.StatusNotFound,
        resource+" not found")
}

// NewValidationError creates a 400 error for validation failures
func NewValidationError(details interface{}) *echo.HTTPError {
    err := echo.NewHTTPError(http.StatusBadRequest, "Validation failed")
    err.Internal = nil
    return err
}

// NewUnauthorizedError creates a 401 error
func NewUnauthorizedError(message string) *echo.HTTPError {
    if message == "" {
        message = "Unauthorized"
    }
    return echo.NewHTTPError(http.StatusUnauthorized, message)
}

// NewForbiddenError creates a 403 error
func NewForbiddenError(message string) *echo.HTTPError {
    if message == "" {
        message = "Access denied"
    }
    return echo.NewHTTPError(http.StatusForbidden, message)
}

// NewConflictError creates a 409 error
func NewConflictError(message string) *echo.HTTPError {
    return echo.NewHTTPError(http.StatusConflict, message)
}
```

### Using Error Handling in Handlers

```go
// Example of using error handling in a handler
func getUser(c echo.Context) error {
    id := c.Param("id")

    // Validate ID format
    if id == "" {
        return echo.NewHTTPError(http.StatusBadRequest, "user ID is required")
    }

    // Simulate database lookup
    user, err := findUserByID(id)
    if err != nil {
        // Return appropriate error based on type
        if err == ErrNotFound {
            return NewNotFoundError("User")
        }
        // Internal errors - don't expose details
        return echo.NewHTTPError(http.StatusInternalServerError,
            "failed to fetch user")
    }

    return c.JSON(http.StatusOK, user)
}
```

## Context Extensions

Echo's Context can be extended with custom functionality through middleware and custom context types.

### Custom Context

```go
// internal/handler/context.go
package handler

import (
    "github.com/labstack/echo/v4"
)

// CustomContext extends Echo's context with application-specific methods
// This provides a clean API for common operations across handlers
type CustomContext struct {
    echo.Context
    UserID    int64
    Username  string
    Role      string
    RequestID string
}

// GetUserID returns the authenticated user's ID
func (c *CustomContext) GetUserID() int64 {
    return c.UserID
}

// IsAdmin checks if the current user has admin role
func (c *CustomContext) IsAdmin() bool {
    return c.Role == "admin"
}

// HasRole checks if the user has a specific role
func (c *CustomContext) HasRole(role string) bool {
    return c.Role == role
}

// Success sends a successful JSON response
func (c *CustomContext) Success(data interface{}) error {
    return c.JSON(200, map[string]interface{}{
        "success": true,
        "data":    data,
    })
}

// Paginate sends a paginated response
func (c *CustomContext) Paginate(data interface{}, total, page, limit int) error {
    return c.JSON(200, map[string]interface{}{
        "success": true,
        "data":    data,
        "pagination": map[string]int{
            "total":       total,
            "page":        page,
            "limit":       limit,
            "total_pages": (total + limit - 1) / limit,
        },
    })
}

// CustomContextMiddleware creates the custom context for each request
func CustomContextMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
    return func(c echo.Context) error {
        // Create custom context wrapping the original
        cc := &CustomContext{
            Context:   c,
            RequestID: c.Response().Header().Get(echo.HeaderXRequestID),
        }

        // If user is authenticated, populate user info
        // This would typically come from JWT claims
        if user := c.Get("user"); user != nil {
            // Extract user info from JWT or session
            cc.UserID = 1       // From JWT claims
            cc.Username = "john" // From JWT claims
            cc.Role = "admin"    // From JWT claims
        }

        return next(cc)
    }
}

// Example handler using custom context
func getUserProfile(c echo.Context) error {
    // Type assert to custom context
    cc, ok := c.(*CustomContext)
    if !ok {
        return echo.NewHTTPError(500, "invalid context")
    }

    // Use custom context methods
    if !cc.IsAdmin() {
        // Non-admins can only view their own profile
    }

    profile := map[string]interface{}{
        "id":         cc.GetUserID(),
        "username":   cc.Username,
        "role":       cc.Role,
        "request_id": cc.RequestID,
    }

    return cc.Success(profile)
}
```

### Context Values and Request Scoped Data

```go
// internal/middleware/context_values.go
package middleware

import (
    "time"

    "github.com/labstack/echo/v4"
)

// ContextKeys for type-safe context value access
const (
    ContextKeyRequestID    = "request_id"
    ContextKeyRequestStart = "request_start"
    ContextKeyUserID       = "user_id"
    ContextKeyTenantID     = "tenant_id"
)

// RequestContextMiddleware adds common values to the request context
func RequestContextMiddleware(next echo.HandlerFunc) echo.HandlerFunc {
    return func(c echo.Context) error {
        // Record request start time for latency tracking
        c.Set(ContextKeyRequestStart, time.Now())

        // Generate or extract request ID
        requestID := c.Request().Header.Get("X-Request-ID")
        if requestID == "" {
            requestID = generateRequestID()
        }
        c.Set(ContextKeyRequestID, requestID)

        // Set request ID in response header for client reference
        c.Response().Header().Set("X-Request-ID", requestID)

        // Extract tenant ID for multi-tenant applications
        tenantID := c.Request().Header.Get("X-Tenant-ID")
        if tenantID != "" {
            c.Set(ContextKeyTenantID, tenantID)
        }

        return next(c)
    }
}

// Helper functions for accessing context values

// GetRequestID retrieves the request ID from context
func GetRequestID(c echo.Context) string {
    if id, ok := c.Get(ContextKeyRequestID).(string); ok {
        return id
    }
    return ""
}

// GetRequestDuration calculates request duration
func GetRequestDuration(c echo.Context) time.Duration {
    if start, ok := c.Get(ContextKeyRequestStart).(time.Time); ok {
        return time.Since(start)
    }
    return 0
}

// GetTenantID retrieves the tenant ID for multi-tenant apps
func GetTenantID(c echo.Context) string {
    if id, ok := c.Get(ContextKeyTenantID).(string); ok {
        return id
    }
    return ""
}

// generateRequestID creates a unique request identifier
func generateRequestID() string {
    // In production, use a proper UUID library
    return time.Now().Format("20060102150405.000000")
}
```

## Putting It All Together

Here is how to wire everything together in your main application:

```go
// cmd/server/main.go
package main

import (
    "context"
    "net/http"
    "os"
    "os/signal"
    "time"

    "github.com/labstack/echo/v4"
    "github.com/labstack/echo/v4/middleware"

    customMiddleware "github.com/yourusername/echo-rest-api/internal/middleware"
    "github.com/yourusername/echo-rest-api/internal/handler"
    "github.com/yourusername/echo-rest-api/internal/validator"
)

func main() {
    // Create Echo instance
    e := echo.New()

    // Configure Echo
    e.Debug = os.Getenv("DEBUG") == "true"
    e.HideBanner = true

    // Register custom validator
    e.Validator = validator.NewCustomValidator()

    // Register custom error handler
    e.HTTPErrorHandler = handler.CustomHTTPErrorHandler

    // Global middleware stack - order matters!
    e.Use(middleware.RequestID())                    // Generate request IDs
    e.Use(customMiddleware.RequestContextMiddleware) // Add request context values
    e.Use(middleware.Logger())                       // Log requests
    e.Use(middleware.Recover())                      // Recover from panics
    e.Use(customMiddleware.CustomContextMiddleware)  // Create custom context

    // Security middleware
    e.Use(middleware.Secure())                       // Security headers
    customMiddleware.SetupCORS(e)                    // CORS configuration
    customMiddleware.SetupRateLimiter(e)             // Rate limiting

    // Public routes (no authentication required)
    e.GET("/health", healthCheck)
    e.POST("/auth/login", handler.Login)
    e.POST("/auth/register", handler.Register)

    // Protected routes (authentication required)
    api := e.Group("/api/v1")
    api.Use(customMiddleware.SetupJWT(e))            // JWT authentication

    // Setup all API routes
    handler.SetupRoutes(api)

    // Start server with graceful shutdown
    go func() {
        port := os.Getenv("PORT")
        if port == "" {
            port = "8080"
        }
        if err := e.Start(":" + port); err != nil && err != http.ErrServerClosed {
            e.Logger.Fatal("shutting down the server")
        }
    }()

    // Graceful shutdown
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, os.Interrupt)
    <-quit

    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    if err := e.Shutdown(ctx); err != nil {
        e.Logger.Fatal(err)
    }
}

func healthCheck(c echo.Context) error {
    return c.JSON(http.StatusOK, map[string]interface{}{
        "status":    "healthy",
        "timestamp": time.Now().Format(time.RFC3339),
    })
}
```

## Conclusion

Echo provides an excellent balance of simplicity and power for building REST APIs in Go. Its high performance, comprehensive middleware system, and clean API make it a strong choice for both small projects and large-scale applications.

Key takeaways from this guide:

1. **Project Structure**: Organize code into logical layers (handlers, services, repositories) for maintainability
2. **Routing**: Use route groups for versioning and applying middleware to related endpoints
3. **Middleware**: Leverage Echo's built-in middleware and create custom middleware for cross-cutting concerns
4. **Validation**: Combine Echo's binding with go-playground/validator for robust request validation
5. **Error Handling**: Implement a custom error handler for consistent, informative error responses
6. **Context Extensions**: Extend Echo's context for application-specific functionality

Echo's documentation is excellent, and the community is active and helpful. For production deployments, consider adding:

- Structured logging with zerolog or zap
- Metrics collection with Prometheus
- Distributed tracing with OpenTelemetry
- API documentation with Swagger/OpenAPI

With these patterns and practices, you are well-equipped to build robust, maintainable REST APIs with Echo.
