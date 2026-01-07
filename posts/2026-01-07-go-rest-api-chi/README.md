# How to Build REST APIs in Go with Chi

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Chi, REST API, Web Development, Backend

Description: Build lightweight REST APIs in Go with Chi router, leveraging its stdlib compatibility and composable middleware patterns.

---

## Introduction

Building REST APIs in Go is a rewarding experience. The language's simplicity, performance, and excellent standard library make it an ideal choice for backend development. While Go's `net/http` package provides everything you need to build web servers, routing can become cumbersome for complex APIs.

Enter **Chi** - a lightweight, idiomatic, and composable router for building Go HTTP services. Chi is 100% compatible with `net/http`, which means you can use any `http.Handler` or `http.HandlerFunc` seamlessly. This compatibility makes Chi incredibly powerful and flexible.

In this comprehensive guide, we'll explore Chi from the ground up, building a complete REST API while learning best practices along the way.

## Why Choose Chi Over Other Routers?

Before diving into code, let's understand why Chi stands out among Go routers:

### 1. Standard Library Compatibility

Chi is built on top of `net/http`, meaning it doesn't reinvent the wheel. Every handler you write is a standard `http.Handler` or `http.HandlerFunc`. This makes your code portable and easy to integrate with other Go packages.

### 2. Zero External Dependencies

Chi has no external dependencies beyond the Go standard library. This results in smaller binaries and fewer potential security vulnerabilities.

### 3. Composable Middleware

Chi's middleware system is elegant and powerful. You can chain middleware, create middleware groups, and apply them selectively to different routes.

### 4. Lightweight and Fast

Chi is one of the fastest routers in the Go ecosystem while remaining feature-rich. It uses a radix tree for route matching, providing excellent performance even with complex routing patterns.

### 5. Sub-Routers

Chi supports mounting sub-routers, allowing you to organize your API into logical groups with their own middleware stacks.

## Getting Started with Chi

Let's begin by setting up a new Go project and installing Chi.

### Project Setup

First, create a new directory and initialize a Go module:

```bash
mkdir go-chi-api
cd go-chi-api
go mod init github.com/yourusername/go-chi-api
```

Install Chi using Go modules:

```bash
go get -u github.com/go-chi/chi/v5
```

### Your First Chi Server

Let's create a basic HTTP server with Chi. This example demonstrates the simplest possible Chi application.

```go
package main

import (
    "net/http"

    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"
)

func main() {
    // Create a new Chi router instance
    // This router implements http.Handler interface
    r := chi.NewRouter()

    // Add built-in middleware for logging and panic recovery
    // Logger logs the start and end of each request with timing
    r.Use(middleware.Logger)
    // Recoverer gracefully handles panics and returns a 500 error
    r.Use(middleware.Recoverer)

    // Define a simple GET route at the root path
    // The handler function receives standard http.ResponseWriter and *http.Request
    r.Get("/", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("Welcome to the Chi API!"))
    })

    // Start the HTTP server on port 3000
    // Chi router satisfies http.Handler, so it works with http.ListenAndServe
    http.ListenAndServe(":3000", r)
}
```

Run the server and test it:

```bash
go run main.go
# In another terminal:
curl http://localhost:3000
```

## Routing in Chi

Chi provides a clean and intuitive API for defining routes. Let's explore the various routing patterns available.

### HTTP Method Routing

Chi supports all standard HTTP methods with dedicated functions. Each method function accepts a path pattern and a handler.

```go
package main

import (
    "encoding/json"
    "net/http"

    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"
)

// User represents a user in our system
type User struct {
    ID    string `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

func main() {
    r := chi.NewRouter()
    r.Use(middleware.Logger)

    // GET request - retrieve resources
    // Used for fetching data without side effects
    r.Get("/users", func(w http.ResponseWriter, r *http.Request) {
        users := []User{
            {ID: "1", Name: "Alice", Email: "alice@example.com"},
            {ID: "2", Name: "Bob", Email: "bob@example.com"},
        }
        json.NewEncoder(w).Encode(users)
    })

    // POST request - create new resources
    // Used for submitting data to create new entities
    r.Post("/users", func(w http.ResponseWriter, r *http.Request) {
        var user User
        json.NewDecoder(r.Body).Decode(&user)
        // In a real app, you'd save to database here
        w.WriteHeader(http.StatusCreated)
        json.NewEncoder(w).Encode(user)
    })

    // PUT request - update existing resources (full replacement)
    // Used for completely replacing an existing entity
    r.Put("/users/{id}", func(w http.ResponseWriter, r *http.Request) {
        id := chi.URLParam(r, "id")
        var user User
        json.NewDecoder(r.Body).Decode(&user)
        user.ID = id
        json.NewEncoder(w).Encode(user)
    })

    // PATCH request - partial update of resources
    // Used for updating specific fields of an entity
    r.Patch("/users/{id}", func(w http.ResponseWriter, r *http.Request) {
        id := chi.URLParam(r, "id")
        w.Write([]byte("Partially updated user: " + id))
    })

    // DELETE request - remove resources
    // Used for deleting entities
    r.Delete("/users/{id}", func(w http.ResponseWriter, r *http.Request) {
        id := chi.URLParam(r, "id")
        w.WriteHeader(http.StatusNoContent)
        _ = id // In real app, delete from database
    })

    http.ListenAndServe(":3000", r)
}
```

### URL Parameters with chi.URLParam

Chi makes it easy to capture dynamic segments from URLs. Use curly braces `{}` to define URL parameters and `chi.URLParam()` to retrieve them.

```go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"

    "github.com/go-chi/chi/v5"
)

// Article represents a blog article
type Article struct {
    ID       string `json:"id"`
    Title    string `json:"title"`
    Category string `json:"category"`
    Author   string `json:"author"`
}

func main() {
    r := chi.NewRouter()

    // Single URL parameter
    // The {id} syntax captures the value from the URL
    r.Get("/articles/{id}", func(w http.ResponseWriter, r *http.Request) {
        // chi.URLParam extracts the parameter value from the request context
        articleID := chi.URLParam(r, "id")

        article := Article{
            ID:    articleID,
            Title: "Understanding Go Interfaces",
        }
        json.NewEncoder(w).Encode(article)
    })

    // Multiple URL parameters
    // You can have multiple parameters in a single route
    r.Get("/categories/{category}/articles/{articleID}", func(w http.ResponseWriter, r *http.Request) {
        category := chi.URLParam(r, "category")
        articleID := chi.URLParam(r, "articleID")

        response := map[string]string{
            "category":  category,
            "articleID": articleID,
            "message":   fmt.Sprintf("Fetching article %s from category %s", articleID, category),
        }
        json.NewEncoder(w).Encode(response)
    })

    // Nested resource pattern
    // Common RESTful pattern for related resources
    r.Get("/users/{userID}/posts/{postID}/comments/{commentID}", func(w http.ResponseWriter, r *http.Request) {
        userID := chi.URLParam(r, "userID")
        postID := chi.URLParam(r, "postID")
        commentID := chi.URLParam(r, "commentID")

        response := map[string]string{
            "userID":    userID,
            "postID":    postID,
            "commentID": commentID,
        }
        json.NewEncoder(w).Encode(response)
    })

    http.ListenAndServe(":3000", r)
}
```

### Regex Patterns in Routes

Chi supports regex patterns for URL parameters, giving you fine-grained control over what values are accepted.

```go
package main

import (
    "net/http"

    "github.com/go-chi/chi/v5"
)

func main() {
    r := chi.NewRouter()

    // Match only numeric IDs using regex
    // The pattern {id:[0-9]+} only matches digits
    r.Get("/products/{id:[0-9]+}", func(w http.ResponseWriter, r *http.Request) {
        id := chi.URLParam(r, "id")
        w.Write([]byte("Product ID (numeric only): " + id))
    })

    // Match slugs with alphanumeric and hyphens
    // Useful for SEO-friendly URLs
    r.Get("/blog/{slug:[a-z0-9-]+}", func(w http.ResponseWriter, r *http.Request) {
        slug := chi.URLParam(r, "slug")
        w.Write([]byte("Blog post slug: " + slug))
    })

    // Match UUID pattern
    // Validates that the parameter is a valid UUID format
    r.Get("/orders/{uuid:[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}}", func(w http.ResponseWriter, r *http.Request) {
        uuid := chi.URLParam(r, "uuid")
        w.Write([]byte("Order UUID: " + uuid))
    })

    http.ListenAndServe(":3000", r)
}
```

## Middleware in Chi

Middleware is a core concept in Chi. It allows you to execute code before and after handlers, perfect for logging, authentication, CORS, and more.

### Understanding Middleware

In Chi, middleware is simply a function that takes an `http.Handler` and returns an `http.Handler`. This pattern allows middleware to be chained together.

```go
// Middleware signature in Chi
func(next http.Handler) http.Handler
```

### Built-in Middleware

Chi comes with several useful middleware out of the box. Let's explore the most commonly used ones.

```go
package main

import (
    "net/http"
    "time"

    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"
)

func main() {
    r := chi.NewRouter()

    // RequestID adds a unique request ID to each request
    // Useful for tracing requests across services
    r.Use(middleware.RequestID)

    // RealIP extracts the real client IP from X-Forwarded-For headers
    // Essential when running behind a proxy or load balancer
    r.Use(middleware.RealIP)

    // Logger logs request details including method, path, and timing
    // Great for debugging and monitoring
    r.Use(middleware.Logger)

    // Recoverer catches panics and returns a 500 error
    // Prevents the server from crashing on unexpected errors
    r.Use(middleware.Recoverer)

    // Timeout sets a timeout for request processing
    // Prevents long-running requests from consuming resources
    r.Use(middleware.Timeout(60 * time.Second))

    // Compress enables gzip compression for responses
    // Reduces bandwidth usage for large responses
    r.Use(middleware.Compress(5))

    // Heartbeat provides a health check endpoint
    // Useful for load balancers and monitoring systems
    r.Use(middleware.Heartbeat("/health"))

    r.Get("/", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte("Hello with middleware!"))
    })

    http.ListenAndServe(":3000", r)
}
```

### Creating Custom Middleware

Creating your own middleware is straightforward. Here are several examples of custom middleware for common use cases.

```go
package main

import (
    "context"
    "log"
    "net/http"
    "strings"
    "time"

    "github.com/go-chi/chi/v5"
)

// Custom context key type to avoid collisions
type contextKey string

const userContextKey contextKey = "user"

// TimingMiddleware measures and logs request duration
// This is useful for performance monitoring
func TimingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()

        // Call the next handler in the chain
        next.ServeHTTP(w, r)

        // Log the duration after the request completes
        duration := time.Since(start)
        log.Printf("Request %s %s took %v", r.Method, r.URL.Path, duration)
    })
}

// ContentTypeJSON sets the Content-Type header for JSON responses
// Apply this to API routes that return JSON
func ContentTypeJSON(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        next.ServeHTTP(w, r)
    })
}

// AuthMiddleware validates authentication tokens
// Returns 401 Unauthorized if no valid token is present
func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Extract the Authorization header
        authHeader := r.Header.Get("Authorization")

        // Check if the header exists and has the correct format
        if authHeader == "" {
            http.Error(w, "Authorization header required", http.StatusUnauthorized)
            return
        }

        // Validate Bearer token format
        if !strings.HasPrefix(authHeader, "Bearer ") {
            http.Error(w, "Invalid authorization format", http.StatusUnauthorized)
            return
        }

        token := strings.TrimPrefix(authHeader, "Bearer ")

        // In a real application, validate the token against your auth service
        // This is a simplified example
        if token == "" {
            http.Error(w, "Invalid token", http.StatusUnauthorized)
            return
        }

        // Add user information to the request context
        // This makes it available to downstream handlers
        ctx := context.WithValue(r.Context(), userContextKey, "authenticated-user")
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

// CORSMiddleware handles Cross-Origin Resource Sharing
// Essential for APIs consumed by web browsers
func CORSMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Set CORS headers
        w.Header().Set("Access-Control-Allow-Origin", "*")
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Accept, Authorization, Content-Type, X-CSRF-Token")
        w.Header().Set("Access-Control-Expose-Headers", "Link")
        w.Header().Set("Access-Control-Max-Age", "300")

        // Handle preflight requests
        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }

        next.ServeHTTP(w, r)
    })
}

// RateLimitMiddleware implements simple rate limiting
// In production, use a more sophisticated solution with Redis
func RateLimitMiddleware(requestsPerSecond int) func(http.Handler) http.Handler {
    // This is a simplified example - use a proper rate limiter in production
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Implement rate limiting logic here
            // For production, consider using golang.org/x/time/rate
            next.ServeHTTP(w, r)
        })
    }
}

func main() {
    r := chi.NewRouter()

    // Apply middleware in order
    // Middleware executes top-to-bottom for requests
    // and bottom-to-top for responses
    r.Use(CORSMiddleware)
    r.Use(TimingMiddleware)
    r.Use(ContentTypeJSON)

    // Public routes - no authentication required
    r.Get("/", func(w http.ResponseWriter, r *http.Request) {
        w.Write([]byte(`{"message": "Welcome to the API"}`))
    })

    // Protected routes - require authentication
    r.Group(func(r chi.Router) {
        r.Use(AuthMiddleware)

        r.Get("/protected", func(w http.ResponseWriter, r *http.Request) {
            user := r.Context().Value(userContextKey)
            w.Write([]byte(`{"message": "Hello, ` + user.(string) + `"}`))
        })
    })

    http.ListenAndServe(":3000", r)
}
```

## Sub-Routers and Route Groups

Chi's sub-router feature allows you to organize your API into logical sections, each with its own middleware stack.

### Using Route Groups

Route groups let you apply middleware to a subset of routes without affecting others.

```go
package main

import (
    "encoding/json"
    "net/http"

    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"
)

func main() {
    r := chi.NewRouter()
    r.Use(middleware.Logger)

    // Public routes - accessible to everyone
    r.Group(func(r chi.Router) {
        r.Get("/", func(w http.ResponseWriter, r *http.Request) {
            w.Write([]byte("Public homepage"))
        })

        r.Get("/about", func(w http.ResponseWriter, r *http.Request) {
            w.Write([]byte("About us"))
        })
    })

    // API routes - with JSON content type
    r.Group(func(r chi.Router) {
        // This middleware only applies to routes in this group
        r.Use(func(next http.Handler) http.Handler {
            return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
                w.Header().Set("Content-Type", "application/json")
                next.ServeHTTP(w, r)
            })
        })

        r.Get("/api/status", func(w http.ResponseWriter, r *http.Request) {
            json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
        })
    })

    // Admin routes - require authentication
    r.Group(func(r chi.Router) {
        r.Use(AdminAuthMiddleware)

        r.Get("/admin/dashboard", func(w http.ResponseWriter, r *http.Request) {
            w.Write([]byte("Admin dashboard"))
        })

        r.Get("/admin/users", func(w http.ResponseWriter, r *http.Request) {
            w.Write([]byte("User management"))
        })
    })

    http.ListenAndServe(":3000", r)
}

// AdminAuthMiddleware checks for admin privileges
func AdminAuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Simplified admin check - use proper authentication in production
        adminToken := r.Header.Get("X-Admin-Token")
        if adminToken != "secret-admin-token" {
            http.Error(w, "Admin access required", http.StatusForbidden)
            return
        }
        next.ServeHTTP(w, r)
    })
}
```

### Mounting Sub-Routers

Sub-routers allow you to create modular, reusable route handlers that can be mounted at different paths.

```go
package main

import (
    "encoding/json"
    "net/http"

    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"
)

// User represents a user entity
type User struct {
    ID    string `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

// Product represents a product entity
type Product struct {
    ID    string  `json:"id"`
    Name  string  `json:"name"`
    Price float64 `json:"price"`
}

// UsersRouter creates a sub-router for user-related endpoints
// This keeps user logic organized and reusable
func UsersRouter() chi.Router {
    r := chi.NewRouter()

    // List all users
    r.Get("/", func(w http.ResponseWriter, r *http.Request) {
        users := []User{
            {ID: "1", Name: "Alice", Email: "alice@example.com"},
            {ID: "2", Name: "Bob", Email: "bob@example.com"},
        }
        json.NewEncoder(w).Encode(users)
    })

    // Get user by ID
    r.Get("/{id}", func(w http.ResponseWriter, r *http.Request) {
        id := chi.URLParam(r, "id")
        user := User{ID: id, Name: "Alice", Email: "alice@example.com"}
        json.NewEncoder(w).Encode(user)
    })

    // Create new user
    r.Post("/", func(w http.ResponseWriter, r *http.Request) {
        var user User
        json.NewDecoder(r.Body).Decode(&user)
        w.WriteHeader(http.StatusCreated)
        json.NewEncoder(w).Encode(user)
    })

    // Update user
    r.Put("/{id}", func(w http.ResponseWriter, r *http.Request) {
        id := chi.URLParam(r, "id")
        var user User
        json.NewDecoder(r.Body).Decode(&user)
        user.ID = id
        json.NewEncoder(w).Encode(user)
    })

    // Delete user
    r.Delete("/{id}", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusNoContent)
    })

    return r
}

// ProductsRouter creates a sub-router for product-related endpoints
func ProductsRouter() chi.Router {
    r := chi.NewRouter()

    // List all products
    r.Get("/", func(w http.ResponseWriter, r *http.Request) {
        products := []Product{
            {ID: "1", Name: "Laptop", Price: 999.99},
            {ID: "2", Name: "Mouse", Price: 29.99},
        }
        json.NewEncoder(w).Encode(products)
    })

    // Get product by ID
    r.Get("/{id}", func(w http.ResponseWriter, r *http.Request) {
        id := chi.URLParam(r, "id")
        product := Product{ID: id, Name: "Laptop", Price: 999.99}
        json.NewEncoder(w).Encode(product)
    })

    return r
}

func main() {
    r := chi.NewRouter()
    r.Use(middleware.Logger)
    r.Use(middleware.Recoverer)

    // Set JSON content type for all API routes
    r.Use(func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            w.Header().Set("Content-Type", "application/json")
            next.ServeHTTP(w, r)
        })
    })

    // Mount sub-routers at specific paths
    // All routes in UsersRouter will be prefixed with /api/users
    r.Mount("/api/users", UsersRouter())

    // All routes in ProductsRouter will be prefixed with /api/products
    r.Mount("/api/products", ProductsRouter())

    // Root API info
    r.Get("/api", func(w http.ResponseWriter, r *http.Request) {
        info := map[string]interface{}{
            "version": "1.0.0",
            "endpoints": []string{
                "/api/users",
                "/api/products",
            },
        }
        json.NewEncoder(w).Encode(info)
    })

    http.ListenAndServe(":3000", r)
}
```

## Integration with Standard Library Handlers

One of Chi's greatest strengths is its seamless integration with Go's standard library. Any `http.Handler` or `http.HandlerFunc` works with Chi.

### Using Standard Library Handlers

```go
package main

import (
    "fmt"
    "net/http"
    "net/http/pprof"

    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"
)

// StandardHandler implements http.Handler interface
// This demonstrates that any stdlib handler works with Chi
type StandardHandler struct {
    message string
}

func (h *StandardHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "Message: %s", h.message)
}

// StandardHandlerFunc is a regular http.HandlerFunc
// Chi accepts these directly
func StandardHandlerFunc(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("This is a standard http.HandlerFunc"))
}

func main() {
    r := chi.NewRouter()
    r.Use(middleware.Logger)

    // Use http.Handler directly
    // Chi's Handle method accepts any http.Handler
    r.Handle("/handler", &StandardHandler{message: "Hello from handler"})

    // Use http.HandlerFunc directly
    // Chi's HandleFunc method accepts any http.HandlerFunc
    r.HandleFunc("/handlerfunc", StandardHandlerFunc)

    // Mount pprof handlers for profiling
    // These are standard library handlers
    r.Mount("/debug", http.StripPrefix("/debug", http.HandlerFunc(pprof.Index)))

    // Or mount the entire pprof handler set
    r.Route("/debug/pprof", func(r chi.Router) {
        r.HandleFunc("/", pprof.Index)
        r.HandleFunc("/cmdline", pprof.Cmdline)
        r.HandleFunc("/profile", pprof.Profile)
        r.HandleFunc("/symbol", pprof.Symbol)
        r.HandleFunc("/trace", pprof.Trace)
        r.Handle("/heap", pprof.Handler("heap"))
        r.Handle("/goroutine", pprof.Handler("goroutine"))
    })

    // Serve static files using http.FileServer
    // This is a standard library file server
    filesDir := http.Dir("./static")
    fileServer := http.FileServer(filesDir)
    r.Handle("/static/*", http.StripPrefix("/static", fileServer))

    http.ListenAndServe(":3000", r)
}
```

### Creating Reusable Handler Patterns

```go
package main

import (
    "encoding/json"
    "log"
    "net/http"

    "github.com/go-chi/chi/v5"
)

// APIResponse is a standard API response structure
type APIResponse struct {
    Success bool        `json:"success"`
    Data    interface{} `json:"data,omitempty"`
    Error   string      `json:"error,omitempty"`
}

// APIHandler wraps handlers to provide consistent error handling
// This pattern reduces boilerplate in route handlers
type APIHandler func(w http.ResponseWriter, r *http.Request) error

// ServeHTTP implements http.Handler for APIHandler
// This allows APIHandler to be used as a standard handler
func (fn APIHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")

    // Call the actual handler
    if err := fn(w, r); err != nil {
        // Log the error for debugging
        log.Printf("API Error: %v", err)

        // Send error response
        w.WriteHeader(http.StatusInternalServerError)
        json.NewEncoder(w).Encode(APIResponse{
            Success: false,
            Error:   err.Error(),
        })
        return
    }
}

// GetUsersHandler demonstrates the APIHandler pattern
func GetUsersHandler(w http.ResponseWriter, r *http.Request) error {
    users := []map[string]string{
        {"id": "1", "name": "Alice"},
        {"id": "2", "name": "Bob"},
    }

    return json.NewEncoder(w).Encode(APIResponse{
        Success: true,
        Data:    users,
    })
}

func main() {
    r := chi.NewRouter()

    // Use the custom APIHandler type
    // It implements http.Handler, so Chi accepts it directly
    r.Method("GET", "/api/users", APIHandler(GetUsersHandler))

    http.ListenAndServe(":3000", r)
}
```

## Building a Complete REST API

Let's put everything together to build a complete, production-ready REST API for a book management system.

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "sync"
    "time"

    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"
)

// Book represents a book entity in our system
type Book struct {
    ID          string    `json:"id"`
    Title       string    `json:"title"`
    Author      string    `json:"author"`
    ISBN        string    `json:"isbn"`
    PublishedAt time.Time `json:"published_at"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

// BookStore is a thread-safe in-memory book storage
// In production, replace with a proper database
type BookStore struct {
    mu     sync.RWMutex
    books  map[string]Book
    nextID int
}

// NewBookStore creates a new BookStore instance
func NewBookStore() *BookStore {
    return &BookStore{
        books:  make(map[string]Book),
        nextID: 1,
    }
}

// GetAll returns all books
func (s *BookStore) GetAll() []Book {
    s.mu.RLock()
    defer s.mu.RUnlock()

    books := make([]Book, 0, len(s.books))
    for _, book := range s.books {
        books = append(books, book)
    }
    return books
}

// Get returns a book by ID
func (s *BookStore) Get(id string) (Book, bool) {
    s.mu.RLock()
    defer s.mu.RUnlock()

    book, ok := s.books[id]
    return book, ok
}

// Create adds a new book
func (s *BookStore) Create(book Book) Book {
    s.mu.Lock()
    defer s.mu.Unlock()

    book.ID = fmt.Sprintf("%d", s.nextID)
    s.nextID++
    book.CreatedAt = time.Now()
    book.UpdatedAt = time.Now()
    s.books[book.ID] = book
    return book
}

// Update modifies an existing book
func (s *BookStore) Update(id string, book Book) (Book, bool) {
    s.mu.Lock()
    defer s.mu.Unlock()

    if existing, ok := s.books[id]; ok {
        book.ID = id
        book.CreatedAt = existing.CreatedAt
        book.UpdatedAt = time.Now()
        s.books[id] = book
        return book, true
    }
    return Book{}, false
}

// Delete removes a book
func (s *BookStore) Delete(id string) bool {
    s.mu.Lock()
    defer s.mu.Unlock()

    if _, ok := s.books[id]; ok {
        delete(s.books, id)
        return true
    }
    return false
}

// BookHandler handles book-related HTTP requests
type BookHandler struct {
    store *BookStore
}

// NewBookHandler creates a new BookHandler
func NewBookHandler(store *BookStore) *BookHandler {
    return &BookHandler{store: store}
}

// Routes returns a chi.Router with all book routes
func (h *BookHandler) Routes() chi.Router {
    r := chi.NewRouter()

    // Apply book-specific middleware
    r.Use(h.BookCtx)

    r.Get("/", h.List)
    r.Post("/", h.Create)

    // Routes that require a book ID
    r.Route("/{bookID}", func(r chi.Router) {
        r.Get("/", h.Get)
        r.Put("/", h.Update)
        r.Delete("/", h.Delete)
    })

    return r
}

// BookCtx middleware loads book context for routes with bookID
func (h *BookHandler) BookCtx(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        bookID := chi.URLParam(r, "bookID")
        if bookID != "" {
            book, ok := h.store.Get(bookID)
            if !ok {
                http.Error(w, "Book not found", http.StatusNotFound)
                return
            }
            ctx := context.WithValue(r.Context(), "book", book)
            next.ServeHTTP(w, r.WithContext(ctx))
            return
        }
        next.ServeHTTP(w, r)
    })
}

// List returns all books
func (h *BookHandler) List(w http.ResponseWriter, r *http.Request) {
    books := h.store.GetAll()
    respondJSON(w, http.StatusOK, books)
}

// Get returns a single book
func (h *BookHandler) Get(w http.ResponseWriter, r *http.Request) {
    book := r.Context().Value("book").(Book)
    respondJSON(w, http.StatusOK, book)
}

// Create adds a new book
func (h *BookHandler) Create(w http.ResponseWriter, r *http.Request) {
    var book Book
    if err := json.NewDecoder(r.Body).Decode(&book); err != nil {
        respondError(w, http.StatusBadRequest, "Invalid request body")
        return
    }

    // Validate required fields
    if book.Title == "" || book.Author == "" {
        respondError(w, http.StatusBadRequest, "Title and author are required")
        return
    }

    created := h.store.Create(book)
    respondJSON(w, http.StatusCreated, created)
}

// Update modifies an existing book
func (h *BookHandler) Update(w http.ResponseWriter, r *http.Request) {
    bookID := chi.URLParam(r, "bookID")

    var book Book
    if err := json.NewDecoder(r.Body).Decode(&book); err != nil {
        respondError(w, http.StatusBadRequest, "Invalid request body")
        return
    }

    updated, ok := h.store.Update(bookID, book)
    if !ok {
        respondError(w, http.StatusNotFound, "Book not found")
        return
    }

    respondJSON(w, http.StatusOK, updated)
}

// Delete removes a book
func (h *BookHandler) Delete(w http.ResponseWriter, r *http.Request) {
    bookID := chi.URLParam(r, "bookID")

    if !h.store.Delete(bookID) {
        respondError(w, http.StatusNotFound, "Book not found")
        return
    }

    w.WriteHeader(http.StatusNoContent)
}

// respondJSON sends a JSON response
func respondJSON(w http.ResponseWriter, status int, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(data)
}

// respondError sends an error response
func respondError(w http.ResponseWriter, status int, message string) {
    respondJSON(w, status, map[string]string{"error": message})
}

func main() {
    // Initialize the book store with sample data
    store := NewBookStore()
    store.Create(Book{
        Title:       "The Go Programming Language",
        Author:      "Alan Donovan & Brian Kernighan",
        ISBN:        "978-0134190440",
        PublishedAt: time.Date(2015, 10, 26, 0, 0, 0, 0, time.UTC),
    })
    store.Create(Book{
        Title:       "Learning Go",
        Author:      "Jon Bodner",
        ISBN:        "978-1492077213",
        PublishedAt: time.Date(2021, 3, 23, 0, 0, 0, 0, time.UTC),
    })

    // Create the main router
    r := chi.NewRouter()

    // Global middleware stack
    r.Use(middleware.RequestID)
    r.Use(middleware.RealIP)
    r.Use(middleware.Logger)
    r.Use(middleware.Recoverer)
    r.Use(middleware.Timeout(60 * time.Second))

    // Health check endpoint
    r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
        respondJSON(w, http.StatusOK, map[string]string{
            "status": "healthy",
            "time":   time.Now().Format(time.RFC3339),
        })
    })

    // API routes
    r.Route("/api/v1", func(r chi.Router) {
        // Mount the book handler
        bookHandler := NewBookHandler(store)
        r.Mount("/books", bookHandler.Routes())
    })

    // Start the server
    addr := ":3000"
    log.Printf("Starting server on %s", addr)
    log.Fatal(http.ListenAndServe(addr, r))
}
```

## Testing Your Chi API

Testing Chi handlers is straightforward since they're standard `http.Handler` implementations.

```go
package main

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/go-chi/chi/v5"
)

// TestListBooks tests the list books endpoint
func TestListBooks(t *testing.T) {
    // Create a new store with test data
    store := NewBookStore()
    store.Create(Book{Title: "Test Book", Author: "Test Author"})

    // Create the handler
    handler := NewBookHandler(store)

    // Create a test router
    r := chi.NewRouter()
    r.Mount("/books", handler.Routes())

    // Create a test request
    req := httptest.NewRequest("GET", "/books", nil)
    w := httptest.NewRecorder()

    // Execute the request
    r.ServeHTTP(w, req)

    // Check the status code
    if w.Code != http.StatusOK {
        t.Errorf("Expected status %d, got %d", http.StatusOK, w.Code)
    }

    // Parse the response
    var books []Book
    json.NewDecoder(w.Body).Decode(&books)

    if len(books) != 1 {
        t.Errorf("Expected 1 book, got %d", len(books))
    }
}

// TestCreateBook tests the create book endpoint
func TestCreateBook(t *testing.T) {
    store := NewBookStore()
    handler := NewBookHandler(store)

    r := chi.NewRouter()
    r.Mount("/books", handler.Routes())

    // Create request body
    book := Book{Title: "New Book", Author: "New Author"}
    body, _ := json.Marshal(book)

    req := httptest.NewRequest("POST", "/books", bytes.NewBuffer(body))
    req.Header.Set("Content-Type", "application/json")
    w := httptest.NewRecorder()

    r.ServeHTTP(w, req)

    if w.Code != http.StatusCreated {
        t.Errorf("Expected status %d, got %d", http.StatusCreated, w.Code)
    }

    var created Book
    json.NewDecoder(w.Body).Decode(&created)

    if created.Title != "New Book" {
        t.Errorf("Expected title 'New Book', got '%s'", created.Title)
    }
}

// TestGetBookNotFound tests the 404 response
func TestGetBookNotFound(t *testing.T) {
    store := NewBookStore()
    handler := NewBookHandler(store)

    r := chi.NewRouter()
    r.Mount("/books", handler.Routes())

    req := httptest.NewRequest("GET", "/books/999", nil)
    w := httptest.NewRecorder()

    r.ServeHTTP(w, req)

    if w.Code != http.StatusNotFound {
        t.Errorf("Expected status %d, got %d", http.StatusNotFound, w.Code)
    }
}
```

## Best Practices for Chi APIs

### 1. Organize Routes by Domain

Keep related routes together in their own files and use sub-routers for modularity.

### 2. Use Middleware Wisely

Apply middleware at the appropriate level - global middleware for cross-cutting concerns, group middleware for specific features.

### 3. Handle Errors Consistently

Create error handling utilities that provide consistent error responses across your API.

### 4. Document Your API

Use OpenAPI/Swagger to document your endpoints. Consider using `go-chi/docgen` for automatic route documentation.

### 5. Validate Input

Always validate incoming data before processing. Consider using validation libraries like `go-playground/validator`.

### 6. Use Context Appropriately

Pass request-scoped values through context, but don't overuse it. Keep the context small and focused.

## Conclusion

Chi provides an excellent balance between simplicity and power for building REST APIs in Go. Its commitment to `net/http` compatibility means your handlers remain portable and your knowledge of the standard library directly applies.

Key takeaways:
- Chi is lightweight with zero external dependencies
- Full compatibility with `net/http` handlers and middleware
- Composable middleware chains for clean, organized code
- Sub-routers enable modular API design
- URL parameters are easily accessible with `chi.URLParam`

Whether you're building a small microservice or a large API, Chi's flexibility and performance make it an excellent choice. Its design philosophy aligns perfectly with Go's simplicity-first approach, making your code easy to understand and maintain.

## Resources

- [Chi GitHub Repository](https://github.com/go-chi/chi)
- [Chi Documentation](https://go-chi.io/)
- [Go net/http Documentation](https://pkg.go.dev/net/http)
- [Chi Examples](https://github.com/go-chi/chi/tree/master/_examples)
