# How to Containerize a Gin (Go) Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Gin, Go, Golang, Containerization, Backend, DevOps, API

Description: A practical guide to containerizing Gin framework applications in Go with Docker multi-stage builds and production optimization

---

Gin is the most popular Go web framework, known for its speed and familiar API. It provides routing, middleware, JSON handling, and request validation in a clean package. Go's compilation to a single static binary makes Gin applications ideal for Docker containerization. The final image can be as small as 10MB while running a fully functional web server. This guide covers the entire process from project setup to production deployment.

## Prerequisites

You need:

- Go 1.21+
- Docker Engine 20.10+
- Basic Go experience

## Creating a Gin Project

Initialize a new Go project and install Gin:

```bash
mkdir my-gin-app && cd my-gin-app
go mod init my-gin-app
go get github.com/gin-gonic/gin
```

Create the main application:

```go
// main.go - Gin application
package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

func main() {
	// Set Gin to release mode in production
	if os.Getenv("GIN_MODE") == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// Root route
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "Hello from Gin!"})
	})

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// API group
	api := r.Group("/api/v1")
	{
		api.GET("/users", listUsers)
		api.GET("/users/:id", getUser)
		api.POST("/users", createUser)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting Gin server on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func listUsers(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"users": []string{}})
}

func getUser(c *gin.Context) {
	id := c.Param("id")
	c.JSON(http.StatusOK, gin.H{"id": id})
}

func createUser(c *gin.Context) {
	c.JSON(http.StatusCreated, gin.H{"status": "created"})
}
```

Verify it runs:

```bash
go run main.go
curl http://localhost:8080
```

## The Multi-Stage Dockerfile

Go compiles to a self-contained binary, making the multi-stage build pattern extremely effective.

This Dockerfile produces a minimal container:

```dockerfile
# Stage 1: Build the Go application
FROM golang:1.22-alpine AS build

WORKDIR /app

# Cache Go module downloads
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy source and build
COPY . .

# Build a statically linked binary
# CGO_ENABLED=0 removes C library dependencies
# -ldflags strips debug info for a smaller binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w" \
    -o /app/server .

# Stage 2: Minimal production image
FROM scratch

# CA certificates for outbound HTTPS calls
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy the binary
COPY --from=build /app/server /server

EXPOSE 8080

ENTRYPOINT ["/server"]
```

## Alpine Alternative

When you need shell access or debugging tools:

```dockerfile
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/server /server

USER appuser
EXPOSE 8080
ENTRYPOINT ["/server"]
```

Alpine adds a few megabytes but gives you `sh`, `wget`, and other diagnostic tools.

## The .dockerignore File

```
.git
.gitignore
*.md
.vscode
.env
tmp/
vendor/
```

## Building and Running

```bash
# Build
docker build -t my-gin-app:latest .

# Run
docker run -d -p 8080:8080 --name gin-app my-gin-app:latest

# Test
curl http://localhost:8080
curl http://localhost:8080/health
curl http://localhost:8080/api/v1/users

# Image size
docker images my-gin-app
```

With `scratch`, expect around 10-15MB. With Alpine, around 18-25MB.

## Docker Compose Configuration

A full development stack with PostgreSQL and Redis:

```yaml
version: "3.8"

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - GIN_MODE=release
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=gin
      - DB_PASSWORD=secret
      - DB_NAME=gindb
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: gin
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: gindb
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U gin"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

## Gin Middleware for Docker

Gin has a flexible middleware system. Here are middleware patterns useful in containerized environments.

Request ID middleware for distributed tracing:

```go
// middleware/requestid.go - Add a unique request ID to each request
package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if the request already has an ID (from a load balancer or API gateway)
		requestID := c.GetHeader("X-Request-ID")
		if requestID == "" {
			requestID = uuid.New().String()
		}
		c.Set("RequestID", requestID)
		c.Header("X-Request-ID", requestID)
		c.Next()
	}
}
```

Rate limiting middleware:

```go
// middleware/ratelimit.go - Simple in-memory rate limiter
package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

func RateLimiter(maxRequests int, window time.Duration) gin.HandlerFunc {
	type client struct {
		count    int
		lastSeen time.Time
	}

	var mu sync.Mutex
	clients := make(map[string]*client)

	return func(c *gin.Context) {
		ip := c.ClientIP()
		mu.Lock()
		defer mu.Unlock()

		cl, exists := clients[ip]
		if !exists || time.Since(cl.lastSeen) > window {
			clients[ip] = &client{count: 1, lastSeen: time.Now()}
			c.Next()
			return
		}

		if cl.count >= maxRequests {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			return
		}

		cl.count++
		c.Next()
	}
}
```

Register middleware in your router:

```go
r := gin.New()
r.Use(gin.Recovery())
r.Use(middleware.RequestID())
r.Use(middleware.RateLimiter(100, time.Minute))
```

## Graceful Shutdown

Implement proper shutdown handling for container lifecycle management:

```go
// main.go - Graceful shutdown with Gin
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
)

func main() {
	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()

	r.GET("/", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "Hello from Gin!"})
	})

	srv := &http.Server{
		Addr:    ":8080",
		Handler: r,
	}

	// Start server in a goroutine
	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("Server error:", err)
		}
	}()

	// Wait for termination signals
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	// Give 15 seconds for active requests to complete
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exited cleanly")
}
```

## Structured Logging

Gin's default logger writes human-readable text. For Docker log aggregation, switch to JSON output.

Install zerolog:

```bash
go get github.com/rs/zerolog
```

Replace the default logger:

```go
// Use zerolog for JSON-structured output
import (
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
)

func JSONLogger() gin.HandlerFunc {
	logger := zerolog.New(os.Stdout).With().Timestamp().Logger()

	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		logger.Info().
			Str("method", c.Request.Method).
			Str("path", c.Request.URL.Path).
			Int("status", c.Writer.Status()).
			Dur("latency", time.Since(start)).
			Str("ip", c.ClientIP()).
			Msg("request")
	}
}
```

## Development Workflow

Development setup with hot reload:

```dockerfile
# Dockerfile.dev
FROM golang:1.22-alpine
WORKDIR /app
RUN go install github.com/air-verse/air@latest
COPY go.mod go.sum ./
RUN go mod download
COPY . .
EXPOSE 8080
ENV GIN_MODE=debug
CMD ["air"]
```

```yaml
version: "3.8"

services:
  api-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "8080:8080"
    volumes:
      - .:/app
    environment:
      - GIN_MODE=debug
      - PORT=8080
```

## Conclusion

Gin and Docker form one of the most efficient combinations for web API deployment. The compiled Go binary drops into a `scratch` image, producing containers around 10MB that start in milliseconds. Gin's middleware system handles cross-cutting concerns like rate limiting, request tracing, and CORS cleanly. Add Docker Compose for database and cache services, implement graceful shutdown for proper container lifecycle management, and switch to structured logging for Docker-native log collection. The simplicity of this stack, from Gin's familiar API to Docker's portable deployment, makes it a solid choice for production microservices.
