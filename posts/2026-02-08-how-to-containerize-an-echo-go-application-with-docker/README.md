# How to Containerize an Echo (Go) Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Echo, Go, Golang, Containerization, Backend, DevOps, API

Description: A hands-on guide to containerizing Echo framework applications in Go using Docker multi-stage builds and minimal images

---

Echo is a high-performance, minimalist Go web framework. It provides a clean routing API, middleware support, and built-in features like data binding and validation. Like all Go frameworks, Echo benefits enormously from Docker containerization because the compiled binary can run in an ultra-minimal container. This guide covers the entire process, from project setup through production deployment with multi-stage builds.

## Prerequisites

You need:

- Go 1.21+
- Docker Engine 20.10+
- Familiarity with Go modules

## Creating an Echo Project

Set up a new Go module with Echo:

```bash
mkdir my-echo-app && cd my-echo-app
go mod init my-echo-app
go get github.com/labstack/echo/v4
go get github.com/labstack/echo/v4/middleware
```

Create the main application:

```go
// main.go - Echo application
package main

import (
	"net/http"
	"os"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
)

func main() {
	e := echo.New()

	// Middleware
	e.Use(middleware.Logger())
	e.Use(middleware.Recover())
	e.Use(middleware.CORS())

	// Routes
	e.GET("/", hello)
	e.GET("/health", healthCheck)

	// API group with versioning
	api := e.Group("/api/v1")
	api.GET("/users", getUsers)
	api.GET("/users/:id", getUser)

	// Read port from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	e.Logger.Fatal(e.Start(":" + port))
}

func hello(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{"message": "Hello from Echo!"})
}

func healthCheck(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}

func getUsers(c echo.Context) error {
	return c.JSON(http.StatusOK, map[string]interface{}{"users": []string{}})
}

func getUser(c echo.Context) error {
	id := c.Param("id")
	return c.JSON(http.StatusOK, map[string]string{"id": id})
}
```

Verify the application runs:

```bash
go run main.go
curl http://localhost:8080
```

## Writing the Dockerfile

Go's static compilation makes multi-stage Docker builds extremely effective. The build stage compiles everything, and the production stage holds nothing but the binary.

This Dockerfile produces a minimal production image:

```dockerfile
# Stage 1: Build the application
FROM golang:1.22-alpine AS build

WORKDIR /app

# Download dependencies first for layer caching
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy source code
COPY . .

# Build a static binary without CGO dependencies
# -ldflags strips debug information for a smaller binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w" \
    -o /app/server .

# Stage 2: Run in a minimal container
FROM scratch

# Import CA certificates for HTTPS connections
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy the compiled binary
COPY --from=build /app/server /server

EXPOSE 8080

ENTRYPOINT ["/server"]
```

## Using Alpine Instead of Scratch

If you need shell access for debugging or require additional system tools:

```dockerfile
# Alternative production stage with Alpine
FROM alpine:3.19

RUN apk --no-cache add ca-certificates tzdata

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/server /server

USER appuser

EXPOSE 8080
ENTRYPOINT ["/server"]
```

The Alpine version adds roughly 7MB but gives you shell access and timezone data.

## The .dockerignore File

```
.git
.gitignore
*.md
.vscode
.env
tmp/
```

## Building and Running

```bash
# Build the image
docker build -t my-echo-app:latest .

# Run the container
docker run -d -p 8080:8080 --name echo-app my-echo-app:latest

# Test the API
curl http://localhost:8080
curl http://localhost:8080/health
curl http://localhost:8080/api/v1/users
```

Check the image size:

```bash
docker images my-echo-app
```

With `scratch`, expect something around 8-12MB. With Alpine, around 15-20MB.

## Docker Compose Configuration

A Compose file with a database for a complete development environment:

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
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_USER=echo
      - DB_PASSWORD=secret
      - DB_NAME=echodb
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: echo
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: echodb
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U echo"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

## Structured Logging

Echo's default logger outputs to stdout, which Docker captures automatically. For structured JSON logging, use a custom logger.

Install zerolog:

```bash
go get github.com/rs/zerolog
```

Configure structured logging:

```go
// main.go - Structured logging with zerolog
package main

import (
	"os"

	"github.com/labstack/echo/v4"
	echomiddleware "github.com/labstack/echo/v4/middleware"
	"github.com/rs/zerolog"
)

func main() {
	// Configure zerolog for JSON output (ideal for Docker log aggregation)
	logger := zerolog.New(os.Stdout).With().Timestamp().Logger()

	e := echo.New()
	e.HideBanner = true

	// Use Echo's built-in logger middleware
	e.Use(echomiddleware.RequestLoggerWithConfig(echomiddleware.RequestLoggerConfig{
		LogURI:    true,
		LogStatus: true,
		LogMethod: true,
		LogValuesFunc: func(c echo.Context, v echomiddleware.RequestLoggerValues) error {
			logger.Info().
				Str("method", v.Method).
				Str("uri", v.URI).
				Int("status", v.Status).
				Msg("request")
			return nil
		},
	}))

	// ... routes ...
	e.Logger.Fatal(e.Start(":8080"))
}
```

JSON-formatted logs are easy to parse with log aggregation tools like Fluentd, Loki, or the ELK stack.

## Echo Middleware in Docker

Echo has a rich set of built-in middleware. Here are some useful ones for containerized deployments:

```go
// Middleware configuration for production containers
func setupMiddleware(e *echo.Echo) {
	// Rate limiting protects your container from being overwhelmed
	e.Use(echomiddleware.RateLimiter(
		echomiddleware.NewRateLimiterMemoryStore(20),
	))

	// Request ID for tracing across microservices
	e.Use(echomiddleware.RequestID())

	// Timeout middleware prevents slow requests from tying up resources
	e.Use(echomiddleware.TimeoutWithConfig(echomiddleware.TimeoutConfig{
		Timeout: 30 * time.Second,
	}))

	// Gzip compression reduces bandwidth
	e.Use(echomiddleware.Gzip())
}
```

## Graceful Shutdown

Handle container stop signals for clean shutdown:

```go
// main.go - Graceful shutdown
package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/labstack/echo/v4"
)

func main() {
	e := echo.New()

	// ... routes and middleware ...

	// Start server in a goroutine
	go func() {
		if err := e.Start(":8080"); err != nil {
			e.Logger.Info("Shutting down the server")
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	// Give the server 10 seconds to finish processing requests
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := e.Shutdown(ctx); err != nil {
		e.Logger.Fatal(err)
	}
}
```

## Development with Air

For automatic rebuilds during development:

```dockerfile
# Dockerfile.dev
FROM golang:1.22-alpine

WORKDIR /app
RUN go install github.com/air-verse/air@latest

COPY go.mod go.sum ./
RUN go mod download

COPY . .
EXPOSE 8080

CMD ["air"]
```

Create an `.air.toml` configuration:

```toml
# .air.toml - Air configuration for hot reload
[build]
  cmd = "go build -o ./tmp/server ."
  bin = "./tmp/server"
  delay = 1000
  exclude_dir = ["tmp", "vendor", ".git"]
  include_ext = ["go", "html", "css", "js"]
```

## Conclusion

Echo and Docker work together seamlessly. The framework's minimal footprint translates to tiny container images when combined with Go's static binary compilation. Use `scratch` for the smallest possible production image or Alpine when you need debugging tools. Add structured logging for Docker-native log management, implement graceful shutdown for clean container lifecycle management, and use Docker Compose for database integration. The result is a production-grade deployment pipeline built on one of Go's most capable web frameworks.
