# How to Build Production-Ready REST APIs with Go Fiber and PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Fiber, PostgreSQL, REST API, Backend

Description: A practical guide to building production-ready REST APIs using Go Fiber and PostgreSQL, covering project structure, database connections, CRUD operations, middleware, error handling, and deployment best practices.

---

> Go Fiber has become one of the fastest web frameworks in the Go ecosystem, inspired by Express.js but built on top of Fasthttp. Combined with PostgreSQL, you get a rock-solid foundation for building APIs that can handle serious traffic without breaking a sweat.

This guide walks you through building a complete REST API from scratch, focusing on patterns and practices that actually work in production. We will cover everything from project setup to graceful shutdown handling.

---

## Prerequisites

Before diving in, make sure you have:
- Go 1.21 or higher installed
- PostgreSQL running locally or remotely
- Basic familiarity with Go syntax
- A code editor (VS Code with Go extension recommended)

---

## Project Structure

A well-organized project structure saves you headaches down the road. Here is a layout that scales well:

```
myapi/
├── cmd/
│   └── server/
│       └── main.go          # Application entry point
├── internal/
│   ├── config/
│   │   └── config.go        # Configuration management
│   ├── database/
│   │   └── postgres.go      # Database connection
│   ├── handlers/
│   │   └── user.go          # HTTP handlers
│   ├── models/
│   │   └── user.go          # Data models
│   ├── repository/
│   │   └── user.go          # Database operations
│   └── middleware/
│       └── auth.go          # Custom middleware
├── go.mod
├── go.sum
└── .env
```

---

## Getting Started

Initialize your Go module and install the required dependencies. Fiber v2 is the current stable version with the best performance characteristics:

```bash
# Initialize the Go module
go mod init myapi

# Install Fiber - the web framework
go get github.com/gofiber/fiber/v2

# Install pgx - the PostgreSQL driver (faster than lib/pq)
go get github.com/jackc/pgx/v5

# Install for environment variable management
go get github.com/joho/godotenv
```

---

## Configuration Management

Never hardcode configuration values. This config loader reads from environment variables with sensible defaults for local development:

```go
// internal/config/config.go
package config

import (
    "os"
    "strconv"
)

type Config struct {
    ServerPort  string
    DatabaseURL string
    Environment string
}

// Load reads configuration from environment variables.
// Falls back to defaults suitable for local development.
func Load() *Config {
    return &Config{
        ServerPort:  getEnv("SERVER_PORT", "3000"),
        DatabaseURL: getEnv("DATABASE_URL", "postgres://localhost:5432/myapi?sslmode=disable"),
        Environment: getEnv("ENVIRONMENT", "development"),
    }
}

func getEnv(key, fallback string) string {
    if value, exists := os.LookupEnv(key); exists {
        return value
    }
    return fallback
}
```

---

## Database Connection with Connection Pooling

Connection pooling is critical for production. The pgxpool package handles this efficiently. Always set reasonable limits to prevent resource exhaustion:

```go
// internal/database/postgres.go
package database

import (
    "context"
    "fmt"
    "time"

    "github.com/jackc/pgx/v5/pgxpool"
)

// NewPostgresPool creates a connection pool with production-ready settings.
// The pool automatically manages connections and handles reconnection.
func NewPostgresPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
    config, err := pgxpool.ParseConfig(databaseURL)
    if err != nil {
        return nil, fmt.Errorf("failed to parse database URL: %w", err)
    }

    // Connection pool settings - adjust based on your workload
    config.MaxConns = 25                      // Maximum connections in the pool
    config.MinConns = 5                       // Keep at least 5 connections ready
    config.MaxConnLifetime = time.Hour        // Recycle connections hourly
    config.MaxConnIdleTime = 30 * time.Minute // Close idle connections after 30 min
    config.HealthCheckPeriod = time.Minute    // Check connection health every minute

    pool, err := pgxpool.NewWithConfig(ctx, config)
    if err != nil {
        return nil, fmt.Errorf("failed to create connection pool: %w", err)
    }

    // Verify the connection actually works
    if err := pool.Ping(ctx); err != nil {
        return nil, fmt.Errorf("failed to ping database: %w", err)
    }

    return pool, nil
}
```

---

## Defining Models

Keep your models simple and focused. Use struct tags for JSON serialization and add validation tags if you use a validation library:

```go
// internal/models/user.go
package models

import "time"

type User struct {
    ID        int64     `json:"id"`
    Email     string    `json:"email"`
    Name      string    `json:"name"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
}

// CreateUserRequest contains fields for creating a new user.
// Separate request types let you control what clients can set.
type CreateUserRequest struct {
    Email string `json:"email"`
    Name  string `json:"name"`
}

// UpdateUserRequest contains fields that can be updated.
type UpdateUserRequest struct {
    Email string `json:"email,omitempty"`
    Name  string `json:"name,omitempty"`
}
```

---

## Repository Layer

The repository pattern separates database operations from business logic. This makes testing easier and keeps your handlers clean:

```go
// internal/repository/user.go
package repository

import (
    "context"
    "errors"
    "fmt"

    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
    "myapi/internal/models"
)

var ErrNotFound = errors.New("record not found")

type UserRepository struct {
    pool *pgxpool.Pool
}

func NewUserRepository(pool *pgxpool.Pool) *UserRepository {
    return &UserRepository{pool: pool}
}

// Create inserts a new user and returns the created record.
// Uses RETURNING to get the generated ID and timestamps in one query.
func (r *UserRepository) Create(ctx context.Context, req *models.CreateUserRequest) (*models.User, error) {
    query := `
        INSERT INTO users (email, name, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        RETURNING id, email, name, created_at, updated_at
    `

    var user models.User
    err := r.pool.QueryRow(ctx, query, req.Email, req.Name).Scan(
        &user.ID, &user.Email, &user.Name, &user.CreatedAt, &user.UpdatedAt,
    )
    if err != nil {
        return nil, fmt.Errorf("failed to create user: %w", err)
    }

    return &user, nil
}

// GetByID retrieves a single user by their ID.
func (r *UserRepository) GetByID(ctx context.Context, id int64) (*models.User, error) {
    query := `SELECT id, email, name, created_at, updated_at FROM users WHERE id = $1`

    var user models.User
    err := r.pool.QueryRow(ctx, query, id).Scan(
        &user.ID, &user.Email, &user.Name, &user.CreatedAt, &user.UpdatedAt,
    )
    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            return nil, ErrNotFound
        }
        return nil, fmt.Errorf("failed to get user: %w", err)
    }

    return &user, nil
}

// List returns paginated users. Always use pagination in production
// to prevent accidentally loading millions of records.
func (r *UserRepository) List(ctx context.Context, limit, offset int) ([]models.User, error) {
    query := `
        SELECT id, email, name, created_at, updated_at
        FROM users
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
    `

    rows, err := r.pool.Query(ctx, query, limit, offset)
    if err != nil {
        return nil, fmt.Errorf("failed to list users: %w", err)
    }
    defer rows.Close()

    var users []models.User
    for rows.Next() {
        var user models.User
        if err := rows.Scan(&user.ID, &user.Email, &user.Name, &user.CreatedAt, &user.UpdatedAt); err != nil {
            return nil, fmt.Errorf("failed to scan user: %w", err)
        }
        users = append(users, user)
    }

    return users, nil
}

// Delete removes a user by ID.
func (r *UserRepository) Delete(ctx context.Context, id int64) error {
    query := `DELETE FROM users WHERE id = $1`

    result, err := r.pool.Exec(ctx, query, id)
    if err != nil {
        return fmt.Errorf("failed to delete user: %w", err)
    }

    if result.RowsAffected() == 0 {
        return ErrNotFound
    }

    return nil
}
```

---

## HTTP Handlers

Handlers should be thin - validate input, call the repository, and format the response. Let Fiber handle the HTTP details:

```go
// internal/handlers/user.go
package handlers

import (
    "errors"
    "strconv"

    "github.com/gofiber/fiber/v2"
    "myapi/internal/models"
    "myapi/internal/repository"
)

type UserHandler struct {
    repo *repository.UserRepository
}

func NewUserHandler(repo *repository.UserRepository) *UserHandler {
    return &UserHandler{repo: repo}
}

// Create handles POST /api/users
func (h *UserHandler) Create(c *fiber.Ctx) error {
    var req models.CreateUserRequest
    if err := c.BodyParser(&req); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid request body",
        })
    }

    // Basic validation - consider using a validation library for complex rules
    if req.Email == "" || req.Name == "" {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Email and name are required",
        })
    }

    user, err := h.repo.Create(c.Context(), &req)
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to create user",
        })
    }

    return c.Status(fiber.StatusCreated).JSON(user)
}

// Get handles GET /api/users/:id
func (h *UserHandler) Get(c *fiber.Ctx) error {
    id, err := strconv.ParseInt(c.Params("id"), 10, 64)
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid user ID",
        })
    }

    user, err := h.repo.GetByID(c.Context(), id)
    if err != nil {
        if errors.Is(err, repository.ErrNotFound) {
            return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
                "error": "User not found",
            })
        }
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to get user",
        })
    }

    return c.JSON(user)
}

// List handles GET /api/users with pagination
func (h *UserHandler) List(c *fiber.Ctx) error {
    limit := c.QueryInt("limit", 20)
    offset := c.QueryInt("offset", 0)

    // Cap the limit to prevent abuse
    if limit > 100 {
        limit = 100
    }

    users, err := h.repo.List(c.Context(), limit, offset)
    if err != nil {
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to list users",
        })
    }

    return c.JSON(fiber.Map{
        "users":  users,
        "limit":  limit,
        "offset": offset,
    })
}

// Delete handles DELETE /api/users/:id
func (h *UserHandler) Delete(c *fiber.Ctx) error {
    id, err := strconv.ParseInt(c.Params("id"), 10, 64)
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "error": "Invalid user ID",
        })
    }

    if err := h.repo.Delete(c.Context(), id); err != nil {
        if errors.Is(err, repository.ErrNotFound) {
            return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
                "error": "User not found",
            })
        }
        return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
            "error": "Failed to delete user",
        })
    }

    return c.SendStatus(fiber.StatusNoContent)
}
```

---

## Middleware for Logging and Recovery

Production APIs need proper logging and panic recovery. Fiber provides built-in middleware, but you can customize them:

```go
// internal/middleware/logging.go
package middleware

import (
    "log"
    "time"

    "github.com/gofiber/fiber/v2"
)

// RequestLogger logs each request with timing information.
func RequestLogger() fiber.Handler {
    return func(c *fiber.Ctx) error {
        start := time.Now()

        // Process the request
        err := c.Next()

        // Log after the request completes
        log.Printf(
            "%s %s %d %s",
            c.Method(),
            c.Path(),
            c.Response().StatusCode(),
            time.Since(start),
        )

        return err
    }
}
```

---

## Putting It All Together

The main function wires everything together. Note the graceful shutdown handling - this ensures in-flight requests complete before the server stops:

```go
// cmd/server/main.go
package main

import (
    "context"
    "log"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/cors"
    "github.com/gofiber/fiber/v2/middleware/recover"
    "github.com/joho/godotenv"

    "myapi/internal/config"
    "myapi/internal/database"
    "myapi/internal/handlers"
    "myapi/internal/middleware"
    "myapi/internal/repository"
)

func main() {
    // Load .env file if it exists (for local development)
    _ = godotenv.Load()

    cfg := config.Load()

    // Set up database connection with a timeout
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    pool, err := database.NewPostgresPool(ctx, cfg.DatabaseURL)
    if err != nil {
        log.Fatalf("Failed to connect to database: %v", err)
    }
    defer pool.Close()

    // Initialize repositories and handlers
    userRepo := repository.NewUserRepository(pool)
    userHandler := handlers.NewUserHandler(userRepo)

    // Create Fiber app with production settings
    app := fiber.New(fiber.Config{
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 10 * time.Second,
        IdleTimeout:  120 * time.Second,
        // Return clean JSON errors instead of text
        ErrorHandler: func(c *fiber.Ctx, err error) error {
            code := fiber.StatusInternalServerError
            if e, ok := err.(*fiber.Error); ok {
                code = e.Code
            }
            return c.Status(code).JSON(fiber.Map{
                "error": err.Error(),
            })
        },
    })

    // Apply middleware
    app.Use(recover.New())              // Recover from panics
    app.Use(middleware.RequestLogger()) // Log requests
    app.Use(cors.New())                 // Enable CORS

    // Health check endpoint - useful for load balancers
    app.Get("/health", func(c *fiber.Ctx) error {
        return c.JSON(fiber.Map{"status": "healthy"})
    })

    // API routes
    api := app.Group("/api")
    users := api.Group("/users")
    users.Post("/", userHandler.Create)
    users.Get("/", userHandler.List)
    users.Get("/:id", userHandler.Get)
    users.Delete("/:id", userHandler.Delete)

    // Graceful shutdown setup
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

    go func() {
        if err := app.Listen(":" + cfg.ServerPort); err != nil {
            log.Fatalf("Server error: %v", err)
        }
    }()

    log.Printf("Server started on port %s", cfg.ServerPort)

    // Wait for shutdown signal
    <-quit
    log.Println("Shutting down server...")

    // Give in-flight requests 10 seconds to complete
    if err := app.ShutdownWithTimeout(10 * time.Second); err != nil {
        log.Fatalf("Server forced to shutdown: %v", err)
    }

    log.Println("Server stopped")
}
```

---

## Database Migration

Create your users table before running the API. Here is the SQL:

```sql
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
```

---

## Common Pitfalls to Avoid

**1. Not using connection pooling** - Opening a new connection per request kills performance. Always use a pool.

**2. Missing context timeouts** - Database queries can hang forever without timeouts. Always pass context with deadlines for database operations.

**3. Returning internal errors to clients** - Log the real error server-side, but return generic messages to clients to avoid leaking implementation details.

**4. No pagination** - A simple `SELECT * FROM users` can bring down your server when the table grows.

**5. Skipping graceful shutdown** - Without it, you will drop requests during deployments.

---

## Testing Your API

Once running, test your endpoints:

```bash
# Create a user
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email": "john@example.com", "name": "John Doe"}'

# List users
curl http://localhost:3000/api/users

# Get a specific user
curl http://localhost:3000/api/users/1

# Delete a user
curl -X DELETE http://localhost:3000/api/users/1
```

---

## Conclusion

You now have a solid foundation for building production REST APIs with Go Fiber and PostgreSQL. The patterns covered here - connection pooling, repository pattern, proper error handling, and graceful shutdown - will serve you well as your API grows.

Next steps to consider:
- Add authentication middleware (JWT or API keys)
- Implement rate limiting
- Add request validation using a library like go-playground/validator
- Set up structured logging with zerolog or zap
- Add metrics with Prometheus

Go Fiber's performance combined with PostgreSQL's reliability makes this stack excellent for high-traffic APIs. The code is straightforward to maintain, test, and deploy.

---

*Building production APIs requires solid observability. [OneUptime](https://oneuptime.com) helps you monitor your Go APIs with distributed tracing, metrics, and alerting - all in one platform.*
