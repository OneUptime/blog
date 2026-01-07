# How to Build REST APIs in Go with Gin

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Gin, REST API, Web Development, Backend

Description: Build production-ready REST APIs in Go with Gin framework covering routing, middleware, request validation, and error handling patterns.

---

Building REST APIs in Go has become increasingly popular due to Go's excellent performance, simplicity, and built-in concurrency support. The Gin framework stands out as one of the most widely adopted HTTP web frameworks for Go, offering a martini-like API with up to 40x faster performance. In this comprehensive guide, we will explore how to build production-ready REST APIs using Gin, covering routing, middleware, request validation, and error handling patterns.

## Prerequisites

Before we begin, ensure you have the following installed:

- Go 1.21 or later
- A code editor of your choice
- Basic familiarity with Go programming

## Setting Up the Project

Let's start by creating a new Go project and installing the Gin framework.

Create a new directory for your project and initialize the Go module:

```bash
mkdir go-gin-api
cd go-gin-api
go mod init github.com/yourusername/go-gin-api
```

Install Gin and other required dependencies:

```bash
go get -u github.com/gin-gonic/gin
go get -u github.com/go-playground/validator/v10
go get -u github.com/google/uuid
```

## Project Structure

A well-organized project structure is crucial for maintainability. Here is the recommended structure for a Gin-based API:

```
go-gin-api/
├── cmd/
│   └── api/
│       └── main.go           # Application entry point
├── internal/
│   ├── config/
│   │   └── config.go         # Configuration management
│   ├── handlers/
│   │   ├── user.go           # User handlers
│   │   └── health.go         # Health check handlers
│   ├── middleware/
│   │   ├── auth.go           # Authentication middleware
│   │   ├── logging.go        # Request logging middleware
│   │   └── recovery.go       # Panic recovery middleware
│   ├── models/
│   │   ├── user.go           # User model and DTOs
│   │   └── response.go       # Standard response structures
│   ├── routes/
│   │   └── routes.go         # Route definitions
│   └── validators/
│       └── custom.go         # Custom validation rules
├── pkg/
│   └── errors/
│       └── errors.go         # Custom error types
├── go.mod
└── go.sum
```

## Basic Gin Setup

Let's start with the main application entry point that sets up the Gin server:

```go
// cmd/api/main.go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/yourusername/go-gin-api/internal/routes"
)

func main() {
    // Set Gin mode based on environment
    // Use ReleaseMode in production for better performance
    if os.Getenv("GIN_MODE") == "release" {
        gin.SetMode(gin.ReleaseMode)
    }

    // Create a new Gin engine with default middleware
    // Default() includes Logger and Recovery middleware
    router := gin.Default()

    // Setup all routes
    routes.SetupRoutes(router)

    // Configure the HTTP server with timeouts
    srv := &http.Server{
        Addr:         ":8080",
        Handler:      router,
        ReadTimeout:  15 * time.Second,
        WriteTimeout: 15 * time.Second,
        IdleTimeout:  60 * time.Second,
    }

    // Start server in a goroutine for graceful shutdown
    go func() {
        log.Printf("Server starting on port 8080")
        if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
            log.Fatalf("Failed to start server: %v", err)
        }
    }()

    // Wait for interrupt signal for graceful shutdown
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit
    log.Println("Shutting down server...")

    // Give outstanding requests 5 seconds to complete
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    if err := srv.Shutdown(ctx); err != nil {
        log.Fatalf("Server forced to shutdown: %v", err)
    }

    log.Println("Server exited gracefully")
}
```

## Routing and Route Groups

Gin provides a powerful routing system with support for path parameters, query strings, and route groups. Route groups help organize related endpoints and apply middleware to specific sets of routes.

Here is how to set up comprehensive routing:

```go
// internal/routes/routes.go
package routes

import (
    "github.com/gin-gonic/gin"
    "github.com/yourusername/go-gin-api/internal/handlers"
    "github.com/yourusername/go-gin-api/internal/middleware"
)

// SetupRoutes configures all application routes
func SetupRoutes(router *gin.Engine) {
    // Apply global middleware
    router.Use(middleware.RequestLogger())
    router.Use(middleware.CustomRecovery())
    router.Use(middleware.CORS())

    // Health check endpoint - no authentication required
    router.GET("/health", handlers.HealthCheck)
    router.GET("/ready", handlers.ReadinessCheck)

    // API version 1 group
    v1 := router.Group("/api/v1")
    {
        // Public routes - no authentication required
        public := v1.Group("/")
        {
            public.POST("/auth/login", handlers.Login)
            public.POST("/auth/register", handlers.Register)
            public.POST("/auth/refresh", handlers.RefreshToken)
        }

        // Protected routes - authentication required
        protected := v1.Group("/")
        protected.Use(middleware.AuthMiddleware())
        {
            // User routes
            users := protected.Group("/users")
            {
                users.GET("", handlers.ListUsers)
                users.GET("/:id", handlers.GetUser)
                users.POST("", handlers.CreateUser)
                users.PUT("/:id", handlers.UpdateUser)
                users.DELETE("/:id", handlers.DeleteUser)
            }

            // Admin routes - requires admin role
            admin := protected.Group("/admin")
            admin.Use(middleware.RoleMiddleware("admin"))
            {
                admin.GET("/stats", handlers.GetStats)
                admin.GET("/audit-logs", handlers.GetAuditLogs)
            }
        }
    }

    // Handle 404 - No route found
    router.NoRoute(func(c *gin.Context) {
        c.JSON(404, gin.H{
            "success": false,
            "error": gin.H{
                "code":    "NOT_FOUND",
                "message": "The requested resource was not found",
            },
        })
    })
}
```

## Custom Middleware

Middleware functions in Gin are handlers that execute before or after the main handler. They are essential for cross-cutting concerns like authentication, logging, and error handling.

### Authentication Middleware

This middleware validates JWT tokens and extracts user information:

```go
// internal/middleware/auth.go
package middleware

import (
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"
)

// User represents the authenticated user context
type User struct {
    ID    string   `json:"id"`
    Email string   `json:"email"`
    Roles []string `json:"roles"`
}

// AuthMiddleware validates the JWT token and sets user context
func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Extract the Authorization header
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "success": false,
                "error": gin.H{
                    "code":    "UNAUTHORIZED",
                    "message": "Authorization header is required",
                },
            })
            return
        }

        // Check for Bearer token format
        parts := strings.SplitN(authHeader, " ", 2)
        if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "success": false,
                "error": gin.H{
                    "code":    "INVALID_TOKEN_FORMAT",
                    "message": "Authorization header must be in 'Bearer <token>' format",
                },
            })
            return
        }

        token := parts[1]

        // Validate the JWT token (simplified example)
        // In production, use a proper JWT library like golang-jwt/jwt
        user, err := validateToken(token)
        if err != nil {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "success": false,
                "error": gin.H{
                    "code":    "INVALID_TOKEN",
                    "message": "The provided token is invalid or expired",
                },
            })
            return
        }

        // Store user information in context for downstream handlers
        c.Set("user", user)
        c.Set("userID", user.ID)

        c.Next()
    }
}

// RoleMiddleware checks if the user has the required role
func RoleMiddleware(requiredRoles ...string) gin.HandlerFunc {
    return func(c *gin.Context) {
        // Get user from context (set by AuthMiddleware)
        userInterface, exists := c.Get("user")
        if !exists {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "success": false,
                "error": gin.H{
                    "code":    "UNAUTHORIZED",
                    "message": "User not authenticated",
                },
            })
            return
        }

        user := userInterface.(*User)

        // Check if user has any of the required roles
        hasRole := false
        for _, requiredRole := range requiredRoles {
            for _, userRole := range user.Roles {
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
            c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
                "success": false,
                "error": gin.H{
                    "code":    "FORBIDDEN",
                    "message": "You do not have permission to access this resource",
                },
            })
            return
        }

        c.Next()
    }
}

// validateToken validates the JWT token and returns the user
// This is a simplified example - use a proper JWT library in production
func validateToken(token string) (*User, error) {
    // In a real application, validate the JWT signature and claims
    // using a library like github.com/golang-jwt/jwt/v5
    return &User{
        ID:    "user-123",
        Email: "user@example.com",
        Roles: []string{"user"},
    }, nil
}
```

### Request Logging Middleware

Structured logging is essential for debugging and monitoring:

```go
// internal/middleware/logging.go
package middleware

import (
    "log"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
)

// RequestLogger logs details about each HTTP request
func RequestLogger() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Generate a unique request ID for tracing
        requestID := uuid.New().String()
        c.Set("requestID", requestID)
        c.Header("X-Request-ID", requestID)

        // Record the start time
        startTime := time.Now()

        // Get the request path and method
        path := c.Request.URL.Path
        query := c.Request.URL.RawQuery
        method := c.Request.Method
        clientIP := c.ClientIP()
        userAgent := c.Request.UserAgent()

        // Process the request
        c.Next()

        // Calculate the latency
        latency := time.Since(startTime)

        // Get the response status
        statusCode := c.Writer.Status()

        // Get any errors that occurred
        errorMessage := c.Errors.ByType(gin.ErrorTypePrivate).String()

        // Log the request details in a structured format
        log.Printf(
            "[HTTP] %s | %3d | %13v | %15s | %-7s %s%s | %s | errors: %s",
            requestID[:8],
            statusCode,
            latency,
            clientIP,
            method,
            path,
            formatQuery(query),
            userAgent,
            errorMessage,
        )
    }
}

// formatQuery adds a ? prefix if the query string is not empty
func formatQuery(query string) string {
    if query != "" {
        return "?" + query
    }
    return ""
}
```

### Custom Recovery Middleware

Handle panics gracefully and return proper error responses:

```go
// internal/middleware/recovery.go
package middleware

import (
    "log"
    "net/http"
    "runtime/debug"

    "github.com/gin-gonic/gin"
)

// CustomRecovery handles panics and returns a proper error response
func CustomRecovery() gin.HandlerFunc {
    return func(c *gin.Context) {
        defer func() {
            if err := recover(); err != nil {
                // Log the stack trace for debugging
                log.Printf("[PANIC RECOVERED] %v\n%s", err, debug.Stack())

                // Get request ID if available
                requestID, _ := c.Get("requestID")

                // Return a generic error response to the client
                // Never expose internal error details in production
                c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
                    "success": false,
                    "error": gin.H{
                        "code":       "INTERNAL_ERROR",
                        "message":    "An unexpected error occurred. Please try again later.",
                        "request_id": requestID,
                    },
                })
            }
        }()

        c.Next()
    }
}

// CORS middleware handles Cross-Origin Resource Sharing
func CORS() gin.HandlerFunc {
    return func(c *gin.Context) {
        origin := c.Request.Header.Get("Origin")

        // Configure allowed origins - in production, use a whitelist
        c.Header("Access-Control-Allow-Origin", origin)
        c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Request-ID")
        c.Header("Access-Control-Expose-Headers", "X-Request-ID")
        c.Header("Access-Control-Allow-Credentials", "true")
        c.Header("Access-Control-Max-Age", "86400")

        // Handle preflight requests
        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(http.StatusNoContent)
            return
        }

        c.Next()
    }
}
```

## Request Binding and Validation

Gin provides powerful request binding capabilities with built-in validation using the validator library. This ensures incoming data meets your requirements before processing.

### Models with Validation Tags

Define your models with validation rules:

```go
// internal/models/user.go
package models

import (
    "time"
)

// CreateUserRequest represents the request body for creating a user
type CreateUserRequest struct {
    Email     string `json:"email" binding:"required,email" example:"user@example.com"`
    Password  string `json:"password" binding:"required,min=8,max=72" example:"securepassword123"`
    FirstName string `json:"first_name" binding:"required,min=1,max=50" example:"John"`
    LastName  string `json:"last_name" binding:"required,min=1,max=50" example:"Doe"`
    Phone     string `json:"phone" binding:"omitempty,e164" example:"+1234567890"`
    Role      string `json:"role" binding:"omitempty,oneof=user admin moderator" example:"user"`
}

// UpdateUserRequest represents the request body for updating a user
type UpdateUserRequest struct {
    FirstName *string `json:"first_name" binding:"omitempty,min=1,max=50"`
    LastName  *string `json:"last_name" binding:"omitempty,min=1,max=50"`
    Phone     *string `json:"phone" binding:"omitempty,e164"`
    Avatar    *string `json:"avatar" binding:"omitempty,url"`
}

// User represents a user in the system
type User struct {
    ID        string    `json:"id"`
    Email     string    `json:"email"`
    FirstName string    `json:"first_name"`
    LastName  string    `json:"last_name"`
    Phone     string    `json:"phone,omitempty"`
    Avatar    string    `json:"avatar,omitempty"`
    Role      string    `json:"role"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

// LoginRequest represents the login request body
type LoginRequest struct {
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required"`
}

// PaginationQuery represents pagination parameters
type PaginationQuery struct {
    Page     int    `form:"page" binding:"omitempty,min=1"`
    PageSize int    `form:"page_size" binding:"omitempty,min=1,max=100"`
    Sort     string `form:"sort" binding:"omitempty,oneof=created_at updated_at email"`
    Order    string `form:"order" binding:"omitempty,oneof=asc desc"`
}

// SetDefaults sets default values for pagination
func (p *PaginationQuery) SetDefaults() {
    if p.Page == 0 {
        p.Page = 1
    }
    if p.PageSize == 0 {
        p.PageSize = 20
    }
    if p.Sort == "" {
        p.Sort = "created_at"
    }
    if p.Order == "" {
        p.Order = "desc"
    }
}
```

### Custom Validators

Create custom validation rules for specific business requirements:

```go
// internal/validators/custom.go
package validators

import (
    "regexp"
    "unicode"

    "github.com/gin-gonic/gin/binding"
    "github.com/go-playground/validator/v10"
)

// RegisterCustomValidators registers all custom validation rules
func RegisterCustomValidators() {
    if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
        // Register custom validation for strong passwords
        v.RegisterValidation("strongpassword", validateStrongPassword)

        // Register custom validation for usernames
        v.RegisterValidation("username", validateUsername)

        // Register custom validation for slug format
        v.RegisterValidation("slug", validateSlug)
    }
}

// validateStrongPassword checks if password meets security requirements
func validateStrongPassword(fl validator.FieldLevel) bool {
    password := fl.Field().String()

    var (
        hasMinLen  = len(password) >= 8
        hasUpper   = false
        hasLower   = false
        hasNumber  = false
        hasSpecial = false
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

    return hasMinLen && hasUpper && hasLower && hasNumber && hasSpecial
}

// validateUsername checks if username follows the allowed pattern
func validateUsername(fl validator.FieldLevel) bool {
    username := fl.Field().String()
    // Username must be 3-30 characters, alphanumeric with underscores
    pattern := regexp.MustCompile(`^[a-zA-Z][a-zA-Z0-9_]{2,29}$`)
    return pattern.MatchString(username)
}

// validateSlug checks if the value is a valid URL slug
func validateSlug(fl validator.FieldLevel) bool {
    slug := fl.Field().String()
    // Slug must be lowercase alphanumeric with hyphens
    pattern := regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
    return pattern.MatchString(slug)
}
```

### Handler with Binding and Validation

Here is how to use binding and validation in handlers:

```go
// internal/handlers/user.go
package handlers

import (
    "net/http"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "github.com/yourusername/go-gin-api/internal/models"
    "github.com/yourusername/go-gin-api/pkg/errors"
)

// CreateUser handles the creation of a new user
func CreateUser(c *gin.Context) {
    var req models.CreateUserRequest

    // Bind JSON body to struct and validate
    if err := c.ShouldBindJSON(&req); err != nil {
        // Parse validation errors and return user-friendly messages
        validationErrors := errors.ParseValidationErrors(err)
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "error": gin.H{
                "code":    "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": validationErrors,
            },
        })
        return
    }

    // Create the user (simplified - would normally save to database)
    user := models.User{
        ID:        uuid.New().String(),
        Email:     req.Email,
        FirstName: req.FirstName,
        LastName:  req.LastName,
        Phone:     req.Phone,
        Role:      req.Role,
        CreatedAt: time.Now(),
        UpdatedAt: time.Now(),
    }

    // Set default role if not provided
    if user.Role == "" {
        user.Role = "user"
    }

    c.JSON(http.StatusCreated, gin.H{
        "success": true,
        "data":    user,
    })
}

// GetUser retrieves a user by ID from the path parameter
func GetUser(c *gin.Context) {
    // Get the user ID from the URL path parameter
    userID := c.Param("id")

    // Validate UUID format
    if _, err := uuid.Parse(userID); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "error": gin.H{
                "code":    "INVALID_ID",
                "message": "The provided ID is not a valid UUID",
            },
        })
        return
    }

    // Fetch user from database (simplified example)
    user := models.User{
        ID:        userID,
        Email:     "user@example.com",
        FirstName: "John",
        LastName:  "Doe",
        Role:      "user",
        CreatedAt: time.Now().Add(-24 * time.Hour),
        UpdatedAt: time.Now(),
    }

    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    user,
    })
}

// ListUsers retrieves a paginated list of users
func ListUsers(c *gin.Context) {
    var query models.PaginationQuery

    // Bind query parameters
    if err := c.ShouldBindQuery(&query); err != nil {
        validationErrors := errors.ParseValidationErrors(err)
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "error": gin.H{
                "code":    "VALIDATION_ERROR",
                "message": "Invalid query parameters",
                "details": validationErrors,
            },
        })
        return
    }

    // Set default pagination values
    query.SetDefaults()

    // Fetch users from database (simplified example)
    users := []models.User{
        {
            ID:        uuid.New().String(),
            Email:     "user1@example.com",
            FirstName: "Alice",
            LastName:  "Smith",
            Role:      "user",
            CreatedAt: time.Now().Add(-48 * time.Hour),
            UpdatedAt: time.Now().Add(-24 * time.Hour),
        },
        {
            ID:        uuid.New().String(),
            Email:     "user2@example.com",
            FirstName: "Bob",
            LastName:  "Johnson",
            Role:      "admin",
            CreatedAt: time.Now().Add(-72 * time.Hour),
            UpdatedAt: time.Now().Add(-12 * time.Hour),
        },
    }

    // Return paginated response
    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    users,
        "meta": gin.H{
            "page":        query.Page,
            "page_size":   query.PageSize,
            "total_items": 2,
            "total_pages": 1,
        },
    })
}

// UpdateUser handles updating an existing user
func UpdateUser(c *gin.Context) {
    userID := c.Param("id")

    // Validate UUID format
    if _, err := uuid.Parse(userID); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "error": gin.H{
                "code":    "INVALID_ID",
                "message": "The provided ID is not a valid UUID",
            },
        })
        return
    }

    var req models.UpdateUserRequest

    // Bind and validate the request body
    if err := c.ShouldBindJSON(&req); err != nil {
        validationErrors := errors.ParseValidationErrors(err)
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "error": gin.H{
                "code":    "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": validationErrors,
            },
        })
        return
    }

    // Update the user (simplified - would normally update in database)
    user := models.User{
        ID:        userID,
        Email:     "user@example.com",
        FirstName: "John",
        LastName:  "Doe",
        Role:      "user",
        CreatedAt: time.Now().Add(-24 * time.Hour),
        UpdatedAt: time.Now(),
    }

    // Apply partial updates
    if req.FirstName != nil {
        user.FirstName = *req.FirstName
    }
    if req.LastName != nil {
        user.LastName = *req.LastName
    }
    if req.Phone != nil {
        user.Phone = *req.Phone
    }
    if req.Avatar != nil {
        user.Avatar = *req.Avatar
    }

    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    user,
    })
}

// DeleteUser handles deleting a user
func DeleteUser(c *gin.Context) {
    userID := c.Param("id")

    // Validate UUID format
    if _, err := uuid.Parse(userID); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "success": false,
            "error": gin.H{
                "code":    "INVALID_ID",
                "message": "The provided ID is not a valid UUID",
            },
        })
        return
    }

    // Delete the user from database (simplified example)
    // In a real application, you would soft-delete or hard-delete the user

    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "message": "User deleted successfully",
    })
}
```

## Error Handling Patterns

Consistent error handling is crucial for a good API experience. Create custom error types and a centralized error handling mechanism:

```go
// pkg/errors/errors.go
package errors

import (
    "fmt"
    "net/http"
    "strings"

    "github.com/go-playground/validator/v10"
)

// AppError represents an application error with context
type AppError struct {
    Code       string            `json:"code"`
    Message    string            `json:"message"`
    StatusCode int               `json:"-"`
    Details    map[string]string `json:"details,omitempty"`
    Err        error             `json:"-"`
}

// Error implements the error interface
func (e *AppError) Error() string {
    if e.Err != nil {
        return fmt.Sprintf("%s: %v", e.Message, e.Err)
    }
    return e.Message
}

// Unwrap returns the wrapped error
func (e *AppError) Unwrap() error {
    return e.Err
}

// Common error constructors for consistent error creation
func NewBadRequest(message string) *AppError {
    return &AppError{
        Code:       "BAD_REQUEST",
        Message:    message,
        StatusCode: http.StatusBadRequest,
    }
}

func NewNotFound(resource string) *AppError {
    return &AppError{
        Code:       "NOT_FOUND",
        Message:    fmt.Sprintf("%s not found", resource),
        StatusCode: http.StatusNotFound,
    }
}

func NewUnauthorized(message string) *AppError {
    return &AppError{
        Code:       "UNAUTHORIZED",
        Message:    message,
        StatusCode: http.StatusUnauthorized,
    }
}

func NewForbidden(message string) *AppError {
    return &AppError{
        Code:       "FORBIDDEN",
        Message:    message,
        StatusCode: http.StatusForbidden,
    }
}

func NewConflict(message string) *AppError {
    return &AppError{
        Code:       "CONFLICT",
        Message:    message,
        StatusCode: http.StatusConflict,
    }
}

func NewInternalError(err error) *AppError {
    return &AppError{
        Code:       "INTERNAL_ERROR",
        Message:    "An unexpected error occurred",
        StatusCode: http.StatusInternalServerError,
        Err:        err,
    }
}

func NewValidationError(details map[string]string) *AppError {
    return &AppError{
        Code:       "VALIDATION_ERROR",
        Message:    "Request validation failed",
        StatusCode: http.StatusBadRequest,
        Details:    details,
    }
}

// ParseValidationErrors converts validator errors to a user-friendly format
func ParseValidationErrors(err error) map[string]string {
    errors := make(map[string]string)

    if validationErrors, ok := err.(validator.ValidationErrors); ok {
        for _, e := range validationErrors {
            field := toSnakeCase(e.Field())
            errors[field] = getValidationMessage(e)
        }
    } else {
        // Handle other types of binding errors
        errors["body"] = "Invalid request body"
    }

    return errors
}

// getValidationMessage returns a human-readable message for a validation error
func getValidationMessage(e validator.FieldError) string {
    field := toSnakeCase(e.Field())

    switch e.Tag() {
    case "required":
        return fmt.Sprintf("%s is required", field)
    case "email":
        return "Invalid email format"
    case "min":
        return fmt.Sprintf("%s must be at least %s characters", field, e.Param())
    case "max":
        return fmt.Sprintf("%s must be at most %s characters", field, e.Param())
    case "oneof":
        return fmt.Sprintf("%s must be one of: %s", field, e.Param())
    case "url":
        return "Invalid URL format"
    case "e164":
        return "Invalid phone number format (use E.164 format: +1234567890)"
    case "uuid":
        return "Invalid UUID format"
    case "strongpassword":
        return "Password must contain at least 8 characters, including uppercase, lowercase, number, and special character"
    default:
        return fmt.Sprintf("%s is invalid", field)
    }
}

// toSnakeCase converts a string from PascalCase to snake_case
func toSnakeCase(s string) string {
    var result strings.Builder
    for i, r := range s {
        if i > 0 && r >= 'A' && r <= 'Z' {
            result.WriteRune('_')
        }
        result.WriteRune(r)
    }
    return strings.ToLower(result.String())
}
```

## Response Formatting

Standardize your API responses for consistency:

```go
// internal/models/response.go
package models

// Response represents a standard API response
type Response struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Error   *ErrorInfo  `json:"error,omitempty"`
    Meta    *MetaInfo   `json:"meta,omitempty"`
}

// ErrorInfo contains error details
type ErrorInfo struct {
    Code      string            `json:"code"`
    Message   string            `json:"message"`
    Details   map[string]string `json:"details,omitempty"`
    RequestID string            `json:"request_id,omitempty"`
}

// MetaInfo contains metadata for paginated responses
type MetaInfo struct {
    Page       int   `json:"page"`
    PageSize   int   `json:"page_size"`
    TotalItems int64 `json:"total_items"`
    TotalPages int   `json:"total_pages"`
}

// NewSuccessResponse creates a success response
func NewSuccessResponse(data interface{}) Response {
    return Response{
        Success: true,
        Data:    data,
    }
}

// NewPaginatedResponse creates a paginated success response
func NewPaginatedResponse(data interface{}, page, pageSize int, totalItems int64) Response {
    totalPages := int(totalItems) / pageSize
    if int(totalItems)%pageSize > 0 {
        totalPages++
    }

    return Response{
        Success: true,
        Data:    data,
        Meta: &MetaInfo{
            Page:       page,
            PageSize:   pageSize,
            TotalItems: totalItems,
            TotalPages: totalPages,
        },
    }
}

// NewErrorResponse creates an error response
func NewErrorResponse(code, message string, details map[string]string) Response {
    return Response{
        Success: false,
        Error: &ErrorInfo{
            Code:    code,
            Message: message,
            Details: details,
        },
    }
}
```

## Health Check Handlers

Health and readiness checks are essential for Kubernetes deployments and load balancer health checks:

```go
// internal/handlers/health.go
package handlers

import (
    "net/http"
    "time"

    "github.com/gin-gonic/gin"
)

var startTime = time.Now()

// HealthCheck returns the health status of the service
func HealthCheck(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{
        "status":    "healthy",
        "timestamp": time.Now().UTC().Format(time.RFC3339),
        "uptime":    time.Since(startTime).String(),
    })
}

// ReadinessCheck verifies that the service is ready to accept traffic
func ReadinessCheck(c *gin.Context) {
    // Check database connection
    dbReady := checkDatabaseConnection()

    // Check cache connection
    cacheReady := checkCacheConnection()

    // Check external service dependencies
    externalReady := checkExternalServices()

    allReady := dbReady && cacheReady && externalReady

    status := http.StatusOK
    if !allReady {
        status = http.StatusServiceUnavailable
    }

    c.JSON(status, gin.H{
        "ready":     allReady,
        "timestamp": time.Now().UTC().Format(time.RFC3339),
        "checks": gin.H{
            "database": dbReady,
            "cache":    cacheReady,
            "external": externalReady,
        },
    })
}

// Placeholder functions for readiness checks
func checkDatabaseConnection() bool {
    // In a real application, ping the database
    return true
}

func checkCacheConnection() bool {
    // In a real application, ping Redis/Memcached
    return true
}

func checkExternalServices() bool {
    // In a real application, check external API availability
    return true
}

// Login handles user authentication
func Login(c *gin.Context) {
    // Placeholder implementation
    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": gin.H{
            "token": "jwt-token-here",
        },
    })
}

// Register handles user registration
func Register(c *gin.Context) {
    // Placeholder implementation
    c.JSON(http.StatusCreated, gin.H{
        "success": true,
        "message": "User registered successfully",
    })
}

// RefreshToken handles token refresh
func RefreshToken(c *gin.Context) {
    // Placeholder implementation
    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": gin.H{
            "token": "new-jwt-token-here",
        },
    })
}

// GetStats returns admin statistics
func GetStats(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data": gin.H{
            "total_users":     1500,
            "active_sessions": 342,
            "requests_today":  45678,
        },
    })
}

// GetAuditLogs returns audit logs
func GetAuditLogs(c *gin.Context) {
    c.JSON(http.StatusOK, gin.H{
        "success": true,
        "data":    []gin.H{},
    })
}
```

## Testing Your API

Write comprehensive tests for your handlers:

```go
// internal/handlers/user_test.go
package handlers_test

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/assert"
    "github.com/yourusername/go-gin-api/internal/handlers"
)

func setupRouter() *gin.Engine {
    gin.SetMode(gin.TestMode)
    router := gin.New()
    return router
}

func TestCreateUser_Success(t *testing.T) {
    router := setupRouter()
    router.POST("/users", handlers.CreateUser)

    reqBody := map[string]interface{}{
        "email":      "test@example.com",
        "password":   "SecurePass123!",
        "first_name": "John",
        "last_name":  "Doe",
    }
    jsonBody, _ := json.Marshal(reqBody)

    req := httptest.NewRequest(http.MethodPost, "/users", bytes.NewBuffer(jsonBody))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()

    router.ServeHTTP(w, req)

    assert.Equal(t, http.StatusCreated, w.Code)

    var response map[string]interface{}
    err := json.Unmarshal(w.Body.Bytes(), &response)
    assert.NoError(t, err)
    assert.True(t, response["success"].(bool))
}

func TestCreateUser_ValidationError(t *testing.T) {
    router := setupRouter()
    router.POST("/users", handlers.CreateUser)

    // Missing required fields
    reqBody := map[string]interface{}{
        "email": "invalid-email",
    }
    jsonBody, _ := json.Marshal(reqBody)

    req := httptest.NewRequest(http.MethodPost, "/users", bytes.NewBuffer(jsonBody))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()

    router.ServeHTTP(w, req)

    assert.Equal(t, http.StatusBadRequest, w.Code)

    var response map[string]interface{}
    err := json.Unmarshal(w.Body.Bytes(), &response)
    assert.NoError(t, err)
    assert.False(t, response["success"].(bool))
    assert.Equal(t, "VALIDATION_ERROR", response["error"].(map[string]interface{})["code"])
}

func TestGetUser_InvalidID(t *testing.T) {
    router := setupRouter()
    router.GET("/users/:id", handlers.GetUser)

    req := httptest.NewRequest(http.MethodGet, "/users/invalid-uuid", nil)
    w := httptest.NewRecorder()

    router.ServeHTTP(w, req)

    assert.Equal(t, http.StatusBadRequest, w.Code)

    var response map[string]interface{}
    err := json.Unmarshal(w.Body.Bytes(), &response)
    assert.NoError(t, err)
    assert.Equal(t, "INVALID_ID", response["error"].(map[string]interface{})["code"])
}
```

## Running the Application

To run your API server, execute the following command:

```bash
go run cmd/api/main.go
```

Test the endpoints using curl:

```bash
# Health check
curl http://localhost:8080/health

# Create a user (requires authentication in production)
curl -X POST http://localhost:8080/api/v1/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "email": "newuser@example.com",
    "password": "SecurePass123!",
    "first_name": "Jane",
    "last_name": "Smith"
  }'

# Get a user by ID
curl http://localhost:8080/api/v1/users/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer your-jwt-token"

# List users with pagination
curl "http://localhost:8080/api/v1/users?page=1&page_size=10" \
  -H "Authorization: Bearer your-jwt-token"
```

## Best Practices Summary

When building REST APIs with Gin, keep these best practices in mind:

1. **Project Structure**: Organize your code into logical packages (handlers, middleware, models, routes) to maintain clarity and separation of concerns.

2. **Middleware Order**: Apply middleware in the correct order. Global middleware like logging and recovery should come first, followed by authentication, and then route-specific middleware.

3. **Validation**: Always validate incoming requests using struct tags and custom validators. Return clear, actionable error messages.

4. **Error Handling**: Create consistent error responses with unique error codes. Never expose internal error details to clients in production.

5. **Response Format**: Standardize your API responses with a consistent structure including success status, data, and error information.

6. **Graceful Shutdown**: Implement graceful shutdown to allow in-flight requests to complete before the server stops.

7. **Health Checks**: Include health and readiness endpoints for monitoring and orchestration systems like Kubernetes.

8. **Testing**: Write comprehensive tests for your handlers, including both success and error cases.

## Conclusion

Building REST APIs in Go with Gin provides an excellent balance of performance and developer productivity. The framework's intuitive routing system, built-in validation support, and flexible middleware architecture make it ideal for building production-ready APIs. By following the patterns and practices outlined in this guide, you can create maintainable, secure, and well-structured APIs that scale with your application's needs.

The combination of Go's strong typing, excellent concurrency support, and Gin's lightweight yet powerful features makes this stack particularly well-suited for high-performance microservices and API backends. Remember to always validate input, handle errors gracefully, and maintain consistent response formats to provide the best experience for your API consumers.
