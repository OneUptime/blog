# How to Build a REST API with Go and Gin Framework

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Gin, REST API, Web Development, Backend

Description: Learn how to build a production-ready REST API with Go and the Gin framework. This guide covers routing, middleware, request validation, error handling, and best practices.

---

> Go has become one of the most popular languages for building APIs due to its simplicity, performance, and excellent concurrency support. Gin is a lightweight HTTP framework that makes building REST APIs in Go both fast and enjoyable. This guide walks you through building a complete REST API from scratch.

Gin provides a martini-like API with performance up to 40x faster than other frameworks. It includes routing, middleware support, JSON validation, and error handling out of the box.

---

## Prerequisites

Before we start, make sure you have:

- Go 1.21 or later installed
- Basic understanding of Go syntax
- A text editor or IDE
- curl or Postman for testing

---

## Project Setup

First, create a new directory for your project and initialize a Go module:

```bash
mkdir go-gin-api
cd go-gin-api
go mod init github.com/yourusername/go-gin-api
```

Install Gin and other dependencies we will need:

```bash
go get -u github.com/gin-gonic/gin
go get -u github.com/go-playground/validator/v10
go get -u github.com/google/uuid
```

---

## Project Structure

A well-organized project structure makes your code maintainable. Here is the structure we will use:

```
go-gin-api/
├── main.go
├── handlers/
│   └── book_handler.go
├── models/
│   └── book.go
├── middleware/
│   └── auth.go
│   └── logging.go
├── routes/
│   └── routes.go
├── validators/
│   └── validators.go
└── go.mod
```

---

## Creating the Data Model

Let's start by defining our data model. We will build a simple book management API.

Create the models directory and add the book model:

```go
// models/book.go
package models

import (
    "time"
)

// Book represents a book in our system
type Book struct {
    ID          string    `json:"id"`
    Title       string    `json:"title" binding:"required,min=1,max=200"`
    Author      string    `json:"author" binding:"required,min=1,max=100"`
    ISBN        string    `json:"isbn" binding:"required,isbn"`
    PublishedAt time.Time `json:"published_at"`
    Pages       int       `json:"pages" binding:"required,min=1"`
    Genre       string    `json:"genre" binding:"required,oneof=fiction non-fiction mystery thriller romance sci-fi"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

// BookStore is an in-memory store for books
// In production, you would use a database
type BookStore struct {
    books map[string]*Book
}

// NewBookStore creates a new BookStore instance
func NewBookStore() *BookStore {
    return &BookStore{
        books: make(map[string]*Book),
    }
}

// GetAll returns all books
func (s *BookStore) GetAll() []*Book {
    books := make([]*Book, 0, len(s.books))
    for _, book := range s.books {
        books = append(books, book)
    }
    return books
}

// GetByID returns a book by its ID
func (s *BookStore) GetByID(id string) (*Book, bool) {
    book, exists := s.books[id]
    return book, exists
}

// Create adds a new book to the store
func (s *BookStore) Create(book *Book) {
    s.books[book.ID] = book
}

// Update modifies an existing book
func (s *BookStore) Update(book *Book) {
    s.books[book.ID] = book
}

// Delete removes a book from the store
func (s *BookStore) Delete(id string) bool {
    if _, exists := s.books[id]; exists {
        delete(s.books, id)
        return true
    }
    return false
}
```

Notice the struct tags on the Book fields. The `json` tag controls JSON serialization, while the `binding` tag enables Gin's built-in validation.

---

## Custom Validators

Gin uses the validator package under the hood. Let's add a custom ISBN validator:

```go
// validators/validators.go
package validators

import (
    "regexp"

    "github.com/go-playground/validator/v10"
)

// ISBNValidator validates ISBN-10 and ISBN-13 formats
func ISBNValidator(fl validator.FieldLevel) bool {
    isbn := fl.Field().String()

    // ISBN-10 pattern (with or without dashes)
    isbn10Pattern := `^(?:\d[- ]?){9}[\dXx]$`

    // ISBN-13 pattern (with or without dashes)
    isbn13Pattern := `^(?:\d[- ]?){13}$`

    isbn10Regex := regexp.MustCompile(isbn10Pattern)
    isbn13Regex := regexp.MustCompile(isbn13Pattern)

    return isbn10Regex.MatchString(isbn) || isbn13Regex.MatchString(isbn)
}

// RegisterCustomValidators registers all custom validators with Gin
func RegisterCustomValidators(v *validator.Validate) {
    v.RegisterValidation("isbn", ISBNValidator)
}
```

---

## Request and Response Types

Define clear request and response structures for your API:

```go
// models/requests.go
package models

// CreateBookRequest represents the request body for creating a book
type CreateBookRequest struct {
    Title       string `json:"title" binding:"required,min=1,max=200"`
    Author      string `json:"author" binding:"required,min=1,max=100"`
    ISBN        string `json:"isbn" binding:"required,isbn"`
    PublishedAt string `json:"published_at" binding:"required"`
    Pages       int    `json:"pages" binding:"required,min=1"`
    Genre       string `json:"genre" binding:"required,oneof=fiction non-fiction mystery thriller romance sci-fi"`
}

// UpdateBookRequest represents the request body for updating a book
type UpdateBookRequest struct {
    Title       string `json:"title" binding:"omitempty,min=1,max=200"`
    Author      string `json:"author" binding:"omitempty,min=1,max=100"`
    ISBN        string `json:"isbn" binding:"omitempty,isbn"`
    PublishedAt string `json:"published_at"`
    Pages       int    `json:"pages" binding:"omitempty,min=1"`
    Genre       string `json:"genre" binding:"omitempty,oneof=fiction non-fiction mystery thriller romance sci-fi"`
}

// APIResponse is a standard response wrapper
type APIResponse struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Error   *APIError   `json:"error,omitempty"`
    Meta    *Meta       `json:"meta,omitempty"`
}

// APIError represents an error response
type APIError struct {
    Code    string            `json:"code"`
    Message string            `json:"message"`
    Details map[string]string `json:"details,omitempty"`
}

// Meta contains pagination and other metadata
type Meta struct {
    Total   int `json:"total"`
    Page    int `json:"page"`
    PerPage int `json:"per_page"`
}
```

---

## Building the Handlers

Handlers contain the business logic for each endpoint. Let's create comprehensive handlers:

```go
// handlers/book_handler.go
package handlers

import (
    "net/http"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/go-playground/validator/v10"
    "github.com/google/uuid"
    "github.com/yourusername/go-gin-api/models"
)

// BookHandler handles book-related requests
type BookHandler struct {
    store *models.BookStore
}

// NewBookHandler creates a new BookHandler instance
func NewBookHandler(store *models.BookStore) *BookHandler {
    return &BookHandler{store: store}
}

// GetAllBooks returns all books
// GET /api/v1/books
func (h *BookHandler) GetAllBooks(c *gin.Context) {
    books := h.store.GetAll()

    c.JSON(http.StatusOK, models.APIResponse{
        Success: true,
        Data:    books,
        Meta: &models.Meta{
            Total:   len(books),
            Page:    1,
            PerPage: len(books),
        },
    })
}

// GetBookByID returns a single book by ID
// GET /api/v1/books/:id
func (h *BookHandler) GetBookByID(c *gin.Context) {
    id := c.Param("id")

    book, exists := h.store.GetByID(id)
    if !exists {
        c.JSON(http.StatusNotFound, models.APIResponse{
            Success: false,
            Error: &models.APIError{
                Code:    "BOOK_NOT_FOUND",
                Message: "The requested book was not found",
            },
        })
        return
    }

    c.JSON(http.StatusOK, models.APIResponse{
        Success: true,
        Data:    book,
    })
}

// CreateBook creates a new book
// POST /api/v1/books
func (h *BookHandler) CreateBook(c *gin.Context) {
    var req models.CreateBookRequest

    // Bind and validate the request body
    if err := c.ShouldBindJSON(&req); err != nil {
        handleValidationError(c, err)
        return
    }

    // Parse the published date
    publishedAt, err := time.Parse("2006-01-02", req.PublishedAt)
    if err != nil {
        c.JSON(http.StatusBadRequest, models.APIResponse{
            Success: false,
            Error: &models.APIError{
                Code:    "INVALID_DATE_FORMAT",
                Message: "Published date must be in YYYY-MM-DD format",
            },
        })
        return
    }

    // Create the book
    now := time.Now()
    book := &models.Book{
        ID:          uuid.New().String(),
        Title:       req.Title,
        Author:      req.Author,
        ISBN:        req.ISBN,
        PublishedAt: publishedAt,
        Pages:       req.Pages,
        Genre:       req.Genre,
        CreatedAt:   now,
        UpdatedAt:   now,
    }

    h.store.Create(book)

    c.JSON(http.StatusCreated, models.APIResponse{
        Success: true,
        Data:    book,
    })
}

// UpdateBook updates an existing book
// PUT /api/v1/books/:id
func (h *BookHandler) UpdateBook(c *gin.Context) {
    id := c.Param("id")

    // Check if book exists
    book, exists := h.store.GetByID(id)
    if !exists {
        c.JSON(http.StatusNotFound, models.APIResponse{
            Success: false,
            Error: &models.APIError{
                Code:    "BOOK_NOT_FOUND",
                Message: "The requested book was not found",
            },
        })
        return
    }

    var req models.UpdateBookRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        handleValidationError(c, err)
        return
    }

    // Update only provided fields
    if req.Title != "" {
        book.Title = req.Title
    }
    if req.Author != "" {
        book.Author = req.Author
    }
    if req.ISBN != "" {
        book.ISBN = req.ISBN
    }
    if req.PublishedAt != "" {
        publishedAt, err := time.Parse("2006-01-02", req.PublishedAt)
        if err != nil {
            c.JSON(http.StatusBadRequest, models.APIResponse{
                Success: false,
                Error: &models.APIError{
                    Code:    "INVALID_DATE_FORMAT",
                    Message: "Published date must be in YYYY-MM-DD format",
                },
            })
            return
        }
        book.PublishedAt = publishedAt
    }
    if req.Pages > 0 {
        book.Pages = req.Pages
    }
    if req.Genre != "" {
        book.Genre = req.Genre
    }

    book.UpdatedAt = time.Now()
    h.store.Update(book)

    c.JSON(http.StatusOK, models.APIResponse{
        Success: true,
        Data:    book,
    })
}

// DeleteBook deletes a book
// DELETE /api/v1/books/:id
func (h *BookHandler) DeleteBook(c *gin.Context) {
    id := c.Param("id")

    if !h.store.Delete(id) {
        c.JSON(http.StatusNotFound, models.APIResponse{
            Success: false,
            Error: &models.APIError{
                Code:    "BOOK_NOT_FOUND",
                Message: "The requested book was not found",
            },
        })
        return
    }

    c.JSON(http.StatusOK, models.APIResponse{
        Success: true,
        Data:    map[string]string{"message": "Book deleted successfully"},
    })
}

// handleValidationError converts validation errors to API errors
func handleValidationError(c *gin.Context, err error) {
    details := make(map[string]string)

    if validationErrors, ok := err.(validator.ValidationErrors); ok {
        for _, e := range validationErrors {
            field := e.Field()
            switch e.Tag() {
            case "required":
                details[field] = field + " is required"
            case "min":
                details[field] = field + " must be at least " + e.Param()
            case "max":
                details[field] = field + " must be at most " + e.Param()
            case "isbn":
                details[field] = field + " must be a valid ISBN"
            case "oneof":
                details[field] = field + " must be one of: " + e.Param()
            default:
                details[field] = field + " is invalid"
            }
        }
    }

    c.JSON(http.StatusBadRequest, models.APIResponse{
        Success: false,
        Error: &models.APIError{
            Code:    "VALIDATION_ERROR",
            Message: "Request validation failed",
            Details: details,
        },
    })
}
```

---

## Middleware

Middleware functions run before or after your handlers. They are perfect for logging, authentication, and request processing.

### Logging Middleware

```go
// middleware/logging.go
package middleware

import (
    "log"
    "time"

    "github.com/gin-gonic/gin"
)

// Logger creates a logging middleware
func Logger() gin.HandlerFunc {
    return func(c *gin.Context) {
        // Start timer
        start := time.Now()
        path := c.Request.URL.Path
        method := c.Request.Method

        // Process request
        c.Next()

        // Calculate latency
        latency := time.Since(start)
        statusCode := c.Writer.Status()
        clientIP := c.ClientIP()

        // Log the request
        log.Printf(
            "[%s] %s %s %d %v %s",
            method,
            path,
            clientIP,
            statusCode,
            latency,
            c.Errors.String(),
        )
    }
}
```

### Authentication Middleware

```go
// middleware/auth.go
package middleware

import (
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"
    "github.com/yourusername/go-gin-api/models"
)

// APIKeyAuth validates API key authentication
func APIKeyAuth(validKeys map[string]bool) gin.HandlerFunc {
    return func(c *gin.Context) {
        apiKey := c.GetHeader("X-API-Key")

        if apiKey == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, models.APIResponse{
                Success: false,
                Error: &models.APIError{
                    Code:    "MISSING_API_KEY",
                    Message: "API key is required",
                },
            })
            return
        }

        if !validKeys[apiKey] {
            c.AbortWithStatusJSON(http.StatusUnauthorized, models.APIResponse{
                Success: false,
                Error: &models.APIError{
                    Code:    "INVALID_API_KEY",
                    Message: "The provided API key is invalid",
                },
            })
            return
        }

        c.Next()
    }
}

// BearerAuth validates Bearer token authentication
func BearerAuth(validateToken func(string) bool) gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")

        if authHeader == "" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, models.APIResponse{
                Success: false,
                Error: &models.APIError{
                    Code:    "MISSING_AUTH_HEADER",
                    Message: "Authorization header is required",
                },
            })
            return
        }

        // Check for Bearer prefix
        parts := strings.SplitN(authHeader, " ", 2)
        if len(parts) != 2 || parts[0] != "Bearer" {
            c.AbortWithStatusJSON(http.StatusUnauthorized, models.APIResponse{
                Success: false,
                Error: &models.APIError{
                    Code:    "INVALID_AUTH_FORMAT",
                    Message: "Authorization header must be in format: Bearer <token>",
                },
            })
            return
        }

        token := parts[1]
        if !validateToken(token) {
            c.AbortWithStatusJSON(http.StatusUnauthorized, models.APIResponse{
                Success: false,
                Error: &models.APIError{
                    Code:    "INVALID_TOKEN",
                    Message: "The provided token is invalid or expired",
                },
            })
            return
        }

        c.Next()
    }
}
```

### CORS Middleware

```go
// middleware/cors.go
package middleware

import (
    "github.com/gin-gonic/gin"
)

// CORSConfig holds CORS configuration
type CORSConfig struct {
    AllowOrigins     []string
    AllowMethods     []string
    AllowHeaders     []string
    ExposeHeaders    []string
    AllowCredentials bool
    MaxAge           int
}

// CORS creates a CORS middleware with the given configuration
func CORS(config CORSConfig) gin.HandlerFunc {
    return func(c *gin.Context) {
        origin := c.Request.Header.Get("Origin")

        // Check if origin is allowed
        allowed := false
        for _, o := range config.AllowOrigins {
            if o == "*" || o == origin {
                allowed = true
                break
            }
        }

        if allowed {
            c.Header("Access-Control-Allow-Origin", origin)
        }

        c.Header("Access-Control-Allow-Methods", strings.Join(config.AllowMethods, ", "))
        c.Header("Access-Control-Allow-Headers", strings.Join(config.AllowHeaders, ", "))
        c.Header("Access-Control-Expose-Headers", strings.Join(config.ExposeHeaders, ", "))

        if config.AllowCredentials {
            c.Header("Access-Control-Allow-Credentials", "true")
        }

        if config.MaxAge > 0 {
            c.Header("Access-Control-Max-Age", strconv.Itoa(config.MaxAge))
        }

        // Handle preflight requests
        if c.Request.Method == "OPTIONS" {
            c.AbortWithStatus(http.StatusNoContent)
            return
        }

        c.Next()
    }
}
```

### Rate Limiting Middleware

```go
// middleware/ratelimit.go
package middleware

import (
    "net/http"
    "sync"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/yourusername/go-gin-api/models"
)

// RateLimiter implements a simple rate limiting mechanism
type RateLimiter struct {
    requests    map[string][]time.Time
    mu          sync.Mutex
    maxRequests int
    window      time.Duration
}

// NewRateLimiter creates a new rate limiter
func NewRateLimiter(maxRequests int, window time.Duration) *RateLimiter {
    return &RateLimiter{
        requests:    make(map[string][]time.Time),
        maxRequests: maxRequests,
        window:      window,
    }
}

// RateLimit creates a rate limiting middleware
func (rl *RateLimiter) RateLimit() gin.HandlerFunc {
    return func(c *gin.Context) {
        clientIP := c.ClientIP()
        now := time.Now()

        rl.mu.Lock()

        // Clean up old requests
        windowStart := now.Add(-rl.window)
        validRequests := make([]time.Time, 0)
        for _, t := range rl.requests[clientIP] {
            if t.After(windowStart) {
                validRequests = append(validRequests, t)
            }
        }
        rl.requests[clientIP] = validRequests

        // Check rate limit
        if len(rl.requests[clientIP]) >= rl.maxRequests {
            rl.mu.Unlock()

            c.AbortWithStatusJSON(http.StatusTooManyRequests, models.APIResponse{
                Success: false,
                Error: &models.APIError{
                    Code:    "RATE_LIMIT_EXCEEDED",
                    Message: "Too many requests. Please try again later.",
                },
            })
            return
        }

        // Record this request
        rl.requests[clientIP] = append(rl.requests[clientIP], now)
        rl.mu.Unlock()

        c.Next()
    }
}
```

---

## Setting Up Routes

Organize your routes in a dedicated file:

```go
// routes/routes.go
package routes

import (
    "github.com/gin-gonic/gin"
    "github.com/yourusername/go-gin-api/handlers"
    "github.com/yourusername/go-gin-api/middleware"
    "github.com/yourusername/go-gin-api/models"
)

// SetupRoutes configures all API routes
func SetupRoutes(router *gin.Engine, store *models.BookStore) {
    // Create handlers
    bookHandler := handlers.NewBookHandler(store)

    // Create rate limiter (100 requests per minute)
    rateLimiter := middleware.NewRateLimiter(100, time.Minute)

    // API key validation (in production, load from config or database)
    validAPIKeys := map[string]bool{
        "your-api-key-here": true,
    }

    // Public routes (no authentication required)
    public := router.Group("/api/v1")
    public.Use(rateLimiter.RateLimit())
    {
        public.GET("/health", func(c *gin.Context) {
            c.JSON(http.StatusOK, gin.H{
                "status": "healthy",
                "time":   time.Now().UTC(),
            })
        })
    }

    // Protected routes (require API key)
    protected := router.Group("/api/v1")
    protected.Use(middleware.APIKeyAuth(validAPIKeys))
    protected.Use(rateLimiter.RateLimit())
    {
        // Book routes
        books := protected.Group("/books")
        {
            books.GET("", bookHandler.GetAllBooks)
            books.GET("/:id", bookHandler.GetBookByID)
            books.POST("", bookHandler.CreateBook)
            books.PUT("/:id", bookHandler.UpdateBook)
            books.DELETE("/:id", bookHandler.DeleteBook)
        }
    }
}
```

---

## Error Handling

Implement a global error handler to catch panics and unhandled errors:

```go
// middleware/recovery.go
package middleware

import (
    "log"
    "net/http"
    "runtime/debug"

    "github.com/gin-gonic/gin"
    "github.com/yourusername/go-gin-api/models"
)

// Recovery creates a panic recovery middleware
func Recovery() gin.HandlerFunc {
    return func(c *gin.Context) {
        defer func() {
            if err := recover(); err != nil {
                // Log the stack trace
                log.Printf("Panic recovered: %v\n%s", err, debug.Stack())

                c.AbortWithStatusJSON(http.StatusInternalServerError, models.APIResponse{
                    Success: false,
                    Error: &models.APIError{
                        Code:    "INTERNAL_SERVER_ERROR",
                        Message: "An unexpected error occurred",
                    },
                })
            }
        }()

        c.Next()
    }
}
```

---

## The Main Application

Now let's bring everything together in the main file:

```go
// main.go
package main

import (
    "log"
    "os"
    "time"

    "github.com/gin-gonic/gin"
    "github.com/gin-gonic/gin/binding"
    "github.com/go-playground/validator/v10"
    "github.com/yourusername/go-gin-api/middleware"
    "github.com/yourusername/go-gin-api/models"
    "github.com/yourusername/go-gin-api/routes"
    "github.com/yourusername/go-gin-api/validators"
)

func main() {
    // Set Gin mode based on environment
    mode := os.Getenv("GIN_MODE")
    if mode == "" {
        mode = gin.DebugMode
    }
    gin.SetMode(mode)

    // Create the Gin router
    router := gin.New()

    // Register custom validators
    if v, ok := binding.Validator.Engine().(*validator.Validate); ok {
        validators.RegisterCustomValidators(v)
    }

    // Add global middleware
    router.Use(middleware.Recovery())
    router.Use(middleware.Logger())
    router.Use(middleware.CORS(middleware.CORSConfig{
        AllowOrigins:     []string{"*"},
        AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
        AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-API-Key"},
        ExposeHeaders:    []string{"Content-Length"},
        AllowCredentials: true,
        MaxAge:           86400,
    }))

    // Create the book store
    store := models.NewBookStore()

    // Seed some sample data
    seedData(store)

    // Setup routes
    routes.SetupRoutes(router, store)

    // Get port from environment or use default
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    log.Printf("Server starting on port %s", port)

    // Start the server
    if err := router.Run(":" + port); err != nil {
        log.Fatalf("Failed to start server: %v", err)
    }
}

// seedData adds sample books to the store
func seedData(store *models.BookStore) {
    sampleBooks := []*models.Book{
        {
            ID:          "1",
            Title:       "The Go Programming Language",
            Author:      "Alan Donovan and Brian Kernighan",
            ISBN:        "978-0134190440",
            PublishedAt: time.Date(2015, 10, 26, 0, 0, 0, 0, time.UTC),
            Pages:       380,
            Genre:       "non-fiction",
            CreatedAt:   time.Now(),
            UpdatedAt:   time.Now(),
        },
        {
            ID:          "2",
            Title:       "Concurrency in Go",
            Author:      "Katherine Cox-Buday",
            ISBN:        "978-1491941195",
            PublishedAt: time.Date(2017, 8, 24, 0, 0, 0, 0, time.UTC),
            Pages:       238,
            Genre:       "non-fiction",
            CreatedAt:   time.Now(),
            UpdatedAt:   time.Now(),
        },
    }

    for _, book := range sampleBooks {
        store.Create(book)
    }

    log.Printf("Seeded %d sample books", len(sampleBooks))
}
```

---

## Testing the API

Run your server:

```bash
go run main.go
```

Test the endpoints with curl:

```bash
# Health check (no auth required)
curl http://localhost:8080/api/v1/health

# Get all books (requires API key)
curl -H "X-API-Key: your-api-key-here" http://localhost:8080/api/v1/books

# Get a specific book
curl -H "X-API-Key: your-api-key-here" http://localhost:8080/api/v1/books/1

# Create a new book
curl -X POST http://localhost:8080/api/v1/books \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Learning Go",
    "author": "Jon Bodner",
    "isbn": "978-1492077213",
    "published_at": "2021-03-23",
    "pages": 375,
    "genre": "non-fiction"
  }'

# Update a book
curl -X PUT http://localhost:8080/api/v1/books/1 \
  -H "X-API-Key: your-api-key-here" \
  -H "Content-Type: application/json" \
  -d '{
    "pages": 400
  }'

# Delete a book
curl -X DELETE http://localhost:8080/api/v1/books/1 \
  -H "X-API-Key: your-api-key-here"
```

---

## Writing Unit Tests

Testing is crucial for production code. Here is how to test your handlers:

```go
// handlers/book_handler_test.go
package handlers

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/gin-gonic/gin"
    "github.com/yourusername/go-gin-api/models"
)

func setupTestRouter() (*gin.Engine, *models.BookStore) {
    gin.SetMode(gin.TestMode)
    router := gin.New()
    store := models.NewBookStore()
    handler := NewBookHandler(store)

    router.GET("/books", handler.GetAllBooks)
    router.GET("/books/:id", handler.GetBookByID)
    router.POST("/books", handler.CreateBook)
    router.PUT("/books/:id", handler.UpdateBook)
    router.DELETE("/books/:id", handler.DeleteBook)

    return router, store
}

func TestGetAllBooks(t *testing.T) {
    router, store := setupTestRouter()

    // Add a test book
    store.Create(&models.Book{
        ID:    "test-1",
        Title: "Test Book",
    })

    w := httptest.NewRecorder()
    req, _ := http.NewRequest("GET", "/books", nil)
    router.ServeHTTP(w, req)

    if w.Code != http.StatusOK {
        t.Errorf("Expected status 200, got %d", w.Code)
    }

    var response models.APIResponse
    json.Unmarshal(w.Body.Bytes(), &response)

    if !response.Success {
        t.Error("Expected success to be true")
    }
}

func TestCreateBook(t *testing.T) {
    router, _ := setupTestRouter()

    book := map[string]interface{}{
        "title":        "New Book",
        "author":       "Test Author",
        "isbn":         "978-0134190440",
        "published_at": "2023-01-01",
        "pages":        200,
        "genre":        "fiction",
    }

    body, _ := json.Marshal(book)
    w := httptest.NewRecorder()
    req, _ := http.NewRequest("POST", "/books", bytes.NewBuffer(body))
    req.Header.Set("Content-Type", "application/json")
    router.ServeHTTP(w, req)

    if w.Code != http.StatusCreated {
        t.Errorf("Expected status 201, got %d", w.Code)
    }
}

func TestGetBookByIDNotFound(t *testing.T) {
    router, _ := setupTestRouter()

    w := httptest.NewRecorder()
    req, _ := http.NewRequest("GET", "/books/nonexistent", nil)
    router.ServeHTTP(w, req)

    if w.Code != http.StatusNotFound {
        t.Errorf("Expected status 404, got %d", w.Code)
    }
}

func TestCreateBookValidation(t *testing.T) {
    router, _ := setupTestRouter()

    // Missing required fields
    book := map[string]interface{}{
        "title": "Incomplete Book",
    }

    body, _ := json.Marshal(book)
    w := httptest.NewRecorder()
    req, _ := http.NewRequest("POST", "/books", bytes.NewBuffer(body))
    req.Header.Set("Content-Type", "application/json")
    router.ServeHTTP(w, req)

    if w.Code != http.StatusBadRequest {
        t.Errorf("Expected status 400, got %d", w.Code)
    }
}
```

Run the tests:

```bash
go test ./... -v
```

---

## Best Practices

Here are key practices to follow when building APIs with Gin:

### 1. Use Proper HTTP Status Codes

| Status Code | Use Case |
|-------------|----------|
| **200 OK** | Successful GET, PUT, DELETE |
| **201 Created** | Successful POST |
| **204 No Content** | Successful DELETE with no body |
| **400 Bad Request** | Validation errors |
| **401 Unauthorized** | Missing or invalid authentication |
| **403 Forbidden** | Authenticated but not authorized |
| **404 Not Found** | Resource does not exist |
| **429 Too Many Requests** | Rate limit exceeded |
| **500 Internal Server Error** | Unexpected server errors |

### 2. Version Your API

Always version your API from the start:

```go
v1 := router.Group("/api/v1")
v2 := router.Group("/api/v2")
```

### 3. Use Consistent Response Formats

Every response should follow the same structure:

```go
type APIResponse struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Error   *APIError   `json:"error,omitempty"`
}
```

### 4. Validate Input Early

Use Gin's binding tags and custom validators to catch bad input before it reaches your business logic.

### 5. Log Everything

Log requests, responses, and errors. Use structured logging for easy analysis.

### 6. Handle Timeouts

Set appropriate timeouts to prevent hanging requests:

```go
srv := &http.Server{
    Addr:         ":8080",
    Handler:      router,
    ReadTimeout:  10 * time.Second,
    WriteTimeout: 10 * time.Second,
    IdleTimeout:  120 * time.Second,
}
```

### 7. Graceful Shutdown

Handle shutdown signals properly:

```go
quit := make(chan os.Signal, 1)
signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
<-quit

ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
defer cancel()

if err := srv.Shutdown(ctx); err != nil {
    log.Fatalf("Server forced to shutdown: %v", err)
}
```

---

## Production Considerations

When deploying to production, consider these additional factors:

- **Database**: Replace the in-memory store with a real database like PostgreSQL
- **Caching**: Add Redis for caching frequently accessed data
- **Configuration**: Use environment variables or a configuration management system
- **Secrets**: Never hardcode API keys or credentials
- **Logging**: Use a structured logging library like zerolog or zap
- **Metrics**: Add Prometheus metrics for observability
- **Health Checks**: Include readiness and liveness endpoints for container orchestration

---

## Conclusion

Building REST APIs with Go and Gin is straightforward once you understand the core concepts. Gin provides a clean, fast foundation while giving you the flexibility to structure your application as needed.

Key takeaways from this guide:

- **Project structure matters** - organize your code into logical packages
- **Validation is essential** - use binding tags and custom validators
- **Middleware is powerful** - logging, auth, rate limiting all fit naturally
- **Consistent responses** - always use the same response format
- **Test your code** - write unit tests for your handlers

The combination of Go's performance and Gin's simplicity makes it an excellent choice for building production APIs that can handle significant traffic with minimal resources.

---

*Building an API is just the first step. Keeping it running reliably is where the real challenge begins. [OneUptime](https://oneuptime.com) provides comprehensive API monitoring, uptime tracking, and incident management to ensure your Go APIs stay healthy in production. Set up alerts, track response times, and get notified before your users notice any issues.*

**Related Reading:**
- [How to Implement Rate Limiting in FastAPI](https://oneuptime.com/blog/post/2025-01-06-fastapi-rate-limiting/view)
- [Best Practices for API Security](https://oneuptime.com/blog/post/2026-02-12-api-security-best-practices-aws/view)
