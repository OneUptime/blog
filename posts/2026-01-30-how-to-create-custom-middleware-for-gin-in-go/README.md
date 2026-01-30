# How to Create Custom Middleware for Gin in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Gin, Middleware, Web

Description: Learn how to create custom middleware for the Gin web framework in Go for authentication, logging, rate limiting, and more.

---

Gin is one of the most popular web frameworks for Go, known for its speed and minimalist design. One of its most powerful features is the middleware system, which allows you to intercept and process HTTP requests before they reach your handlers. In this post, we will explore how to create custom middleware for common use cases.

## Understanding Gin Middleware Basics

A middleware in Gin is simply a function that takes a `*gin.Context` parameter. The context contains all the information about the request and response, plus methods to control the request flow.

```go
// Basic middleware structure
func MyMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Code before the request is processed

        c.Next() // Process the next handler

        // Code after the request is processed
    }
}
```

## The Role of c.Next() and c.Abort()

Two critical methods control the middleware chain:

- `c.Next()` - Passes control to the next middleware or handler in the chain
- `c.Abort()` - Stops the chain and prevents subsequent handlers from running

```go
func ConditionalMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        if someCondition {
            c.Next() // Continue to the next handler
        } else {
            c.Abort() // Stop the chain
            c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
        }
    }
}
```

## Authentication Middleware

Authentication is one of the most common middleware use cases. Here is a JWT-based authentication middleware:

```go
package middleware

import (
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"
    "github.com/golang-jwt/jwt/v5"
)

// AuthMiddleware validates JWT tokens from the Authorization header
func AuthMiddleware(secretKey string) gin.HandlerFunc {
    return func(c *gin.Context) {
        // Get the Authorization header
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "Authorization header is required",
            })
            return
        }

        // Check for Bearer prefix
        parts := strings.Split(authHeader, " ")
        if len(parts) != 2 || parts[0] != "Bearer" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "Invalid authorization format",
            })
            return
        }

        // Parse and validate the token
        token, err := jwt.Parse(parts[1], func(token *jwt.Token) (interface{}, error) {
            return []byte(secretKey), nil
        })

        if err != nil || !token.Valid {
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
                "error": "Invalid or expired token",
            })
            return
        }

        // Extract claims and store in context for handlers to use
        if claims, ok := token.Claims.(jwt.MapClaims); ok {
            c.Set("userID", claims["sub"])
            c.Set("email", claims["email"])
        }

        c.Next()
    }
}
```

## Logging Middleware

A logging middleware helps track requests and measure performance:

```go
package middleware

import (
    "log"
    "time"

    "github.com/gin-gonic/gin"
)

// LoggingMiddleware logs request details and response time
func LoggingMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Record the start time
        startTime := time.Now()

        // Get request details
        path := c.Request.URL.Path
        method := c.Request.Method
        clientIP := c.ClientIP()

        // Process the request
        c.Next()

        // Calculate the duration
        duration := time.Since(startTime)
        statusCode := c.Writer.Status()

        // Log the request details
        log.Printf("[%s] %s %s - %d - %v - %s",
            method,
            path,
            clientIP,
            statusCode,
            duration,
            c.Errors.String(),
        )
    }
}
```

## Rate Limiting Middleware

Rate limiting protects your API from abuse. Here is a simple token bucket implementation:

```go
package middleware

import (
    "net/http"
    "sync"
    "time"

    "github.com/gin-gonic/gin"
)

// RateLimiter stores client request counts
type RateLimiter struct {
    clients map[string]*clientData
    mu      sync.Mutex
    rate    int           // requests allowed per window
    window  time.Duration // time window
}

type clientData struct {
    count     int
    resetTime time.Time
}

// NewRateLimiter creates a rate limiter with specified limits
func NewRateLimiter(rate int, window time.Duration) *RateLimiter {
    return &RateLimiter{
        clients: make(map[string]*clientData),
        rate:    rate,
        window:  window,
    }
}

// RateLimitMiddleware limits requests per client IP
func (rl *RateLimiter) RateLimitMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        clientIP := c.ClientIP()

        rl.mu.Lock()
        defer rl.mu.Unlock()

        // Get or create client data
        client, exists := rl.clients[clientIP]
        if !exists || time.Now().After(client.resetTime) {
            rl.clients[clientIP] = &clientData{
                count:     1,
                resetTime: time.Now().Add(rl.window),
            }
            c.Next()
            return
        }

        // Check if rate limit exceeded
        if client.count >= rl.rate {
            c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
                "error": "Rate limit exceeded. Try again later.",
            })
            return
        }

        client.count++
        c.Next()
    }
}
```

## Error Handling Middleware

A centralized error handling middleware catches panics and formats error responses:

```go
package middleware

import (
    "log"
    "net/http"

    "github.com/gin-gonic/gin"
)

// ErrorHandlingMiddleware recovers from panics and handles errors
func ErrorHandlingMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        defer func() {
            if err := recover(); err != nil {
                // Log the panic for debugging
                log.Printf("Panic recovered: %v", err)

                // Return a generic error to the client
                c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{
                    "error": "An unexpected error occurred",
                })
            }
        }()

        c.Next()

        // Handle any errors added during request processing
        if len(c.Errors) > 0 {
            c.JSON(c.Writer.Status(), gin.H{
                "errors": c.Errors.Errors(),
            })
        }
    }
}
```

## Putting It All Together

Here is how to register multiple middleware in your Gin application:

```go
package main

import (
    "time"

    "github.com/gin-gonic/gin"
    "myapp/middleware"
)

func main() {
    r := gin.New() // Use New() instead of Default() for custom middleware

    // Global middleware - applied to all routes
    r.Use(middleware.ErrorHandlingMiddleware())
    r.Use(middleware.LoggingMiddleware())

    // Create rate limiter: 100 requests per minute
    rateLimiter := middleware.NewRateLimiter(100, time.Minute)
    r.Use(rateLimiter.RateLimitMiddleware())

    // Public routes
    r.GET("/health", healthCheck)

    // Protected routes with authentication
    protected := r.Group("/api")
    protected.Use(middleware.AuthMiddleware("your-secret-key"))
    {
        protected.GET("/profile", getProfile)
        protected.POST("/data", createData)
    }

    r.Run(":8080")
}
```

## Conclusion

Custom middleware in Gin provides a clean way to handle cross-cutting concerns like authentication, logging, rate limiting, and error handling. By understanding how `c.Next()` and `c.Abort()` control the request flow, you can build powerful middleware that keeps your handlers focused on business logic. Start with the examples above and adapt them to your specific needs.
