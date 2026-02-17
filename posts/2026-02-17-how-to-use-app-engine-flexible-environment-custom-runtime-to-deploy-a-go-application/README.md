# How to Use App Engine Flexible Environment Custom Runtime to Deploy a Go Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, App Engine, Go, Flexible Environment, Custom Runtime

Description: Deploy a Go application on App Engine Flexible Environment using a custom Docker runtime with optimized builds and production-ready configuration.

---

Go is a natural fit for App Engine Flexible Environment. Go applications compile to a single binary with no runtime dependencies, produce tiny Docker images, start up in milliseconds, and handle high concurrency with goroutines. While App Engine has a built-in Go runtime for Standard Environment, using a custom runtime on Flex gives you full control over the Go version, build process, and system dependencies.

In this guide, I will walk through deploying a Go application to App Engine Flex with a custom Docker runtime, covering the multi-stage Dockerfile, application structure, health checks, and performance considerations.

## Project Structure

Here is a typical Go project layout for an App Engine Flex deployment:

```
my-go-app/
  cmd/
    server/
      main.go        # Application entry point
  internal/
    handlers/
      handlers.go    # HTTP request handlers
    middleware/
      middleware.go   # HTTP middleware
  go.mod
  go.sum
  Dockerfile
  .dockerignore
  app.yaml
```

## The Application Code

Start with a production-ready HTTP server:

```go
// cmd/server/main.go - Application entry point
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "my-go-app/internal/handlers"
    "my-go-app/internal/middleware"
)

func main() {
    // Get port from environment (App Engine sets PORT)
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    // Set up the HTTP router
    mux := http.NewServeMux()

    // Register health check endpoints
    mux.HandleFunc("/_ah/health", handlers.HealthCheck)
    mux.HandleFunc("/_ah/live", handlers.LivenessCheck)
    mux.HandleFunc("/_ah/ready", handlers.ReadinessCheck)

    // Register application routes
    mux.HandleFunc("/", handlers.Home)
    mux.HandleFunc("/api/data", handlers.GetData)

    // Wrap with middleware
    handler := middleware.Logging(middleware.Recovery(mux))

    // Configure the HTTP server
    server := &http.Server{
        Addr:         ":" + port,
        Handler:      handler,
        ReadTimeout:  15 * time.Second,
        WriteTimeout: 30 * time.Second,
        IdleTimeout:  60 * time.Second,
    }

    // Start server in a goroutine
    go func() {
        log.Printf("Server starting on port %s", port)
        if err := server.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatalf("Server error: %v", err)
        }
    }()

    // Wait for shutdown signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
    <-quit

    log.Println("Shutting down server...")

    // Graceful shutdown with 30-second deadline
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := server.Shutdown(ctx); err != nil {
        log.Fatalf("Server forced shutdown: %v", err)
    }

    log.Println("Server stopped")
}
```

The handlers:

```go
// internal/handlers/handlers.go - HTTP request handlers
package handlers

import (
    "encoding/json"
    "net/http"
    "runtime"
    "time"
)

// Home handles the root endpoint
func Home(w http.ResponseWriter, r *http.Request) {
    response := map[string]interface{}{
        "message":    "Hello from Go on App Engine Flex",
        "goVersion":  runtime.Version(),
        "timestamp":  time.Now().UTC().Format(time.RFC3339),
        "goroutines": runtime.NumGoroutine(),
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// GetData handles the data API endpoint
func GetData(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodGet {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    // Your data fetching logic here
    data := map[string]interface{}{
        "items": []string{"item1", "item2", "item3"},
        "count": 3,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(data)
}

// HealthCheck handles the legacy health check endpoint
func HealthCheck(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}

// LivenessCheck verifies the process is alive
func LivenessCheck(w http.ResponseWriter, r *http.Request) {
    // Lightweight check - just verify the process can respond
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}

// ReadinessCheck verifies the app can handle traffic
func ReadinessCheck(w http.ResponseWriter, r *http.Request) {
    // Add dependency checks here (database, cache, etc.)
    // Return 503 if any critical dependency is unavailable

    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}
```

The middleware:

```go
// internal/middleware/middleware.go - HTTP middleware
package middleware

import (
    "log"
    "net/http"
    "time"
)

// Logging middleware logs request details
func Logging(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()

        // Wrap the response writer to capture the status code
        wrapped := &statusWriter{ResponseWriter: w, status: 200}
        next.ServeHTTP(wrapped, r)

        duration := time.Since(start)
        log.Printf("%s %s %d %v", r.Method, r.URL.Path, wrapped.status, duration)
    })
}

// Recovery middleware catches panics and returns 500
func Recovery(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        defer func() {
            if err := recover(); err != nil {
                log.Printf("Panic recovered: %v", err)
                http.Error(w, "Internal Server Error", http.StatusInternalServerError)
            }
        }()
        next.ServeHTTP(w, r)
    })
}

type statusWriter struct {
    http.ResponseWriter
    status int
}

func (w *statusWriter) WriteHeader(status int) {
    w.status = status
    w.ResponseWriter.WriteHeader(status)
}
```

## The Dockerfile

This is where Go really shines. The multi-stage build produces a tiny final image:

```dockerfile
# Dockerfile - Multi-stage build for Go application
# Stage 1: Build the Go binary
FROM golang:1.22-alpine AS builder

# Install git for fetching dependencies (if using private repos)
RUN apk add --no-cache git ca-certificates

WORKDIR /app

# Copy go.mod and go.sum first for dependency caching
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the source code
COPY . .

# Build the binary with optimizations
# CGO_ENABLED=0 produces a statically linked binary
# -ldflags="-s -w" strips debug info for smaller binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w" \
    -o /server \
    ./cmd/server/

# Stage 2: Minimal runtime image
FROM scratch

# Copy CA certificates for HTTPS requests
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy the compiled binary
COPY --from=builder /server /server

# App Engine Flex requires port 8080
ENV PORT=8080
EXPOSE 8080

# Run the binary
ENTRYPOINT ["/server"]
```

Using `FROM scratch` as the base image means the final Docker image contains only your binary and CA certificates. A typical Go web application binary is 10-20MB, compared to 100MB+ for Node.js or Python images. This means faster deployments and faster instance startup.

If your application needs additional files (like templates or static assets), add them:

```dockerfile
# If you need templates or static files
FROM scratch
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /server /server
COPY --from=builder /app/templates /templates
COPY --from=builder /app/static /static
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/server"]
```

## The .dockerignore

Keep the build context clean:

```
# .dockerignore
.git
.gitignore
*.md
app.yaml
.gcloudignore
vendor/  # if not vendoring
```

## App Engine Configuration

```yaml
# app.yaml - App Engine Flexible custom runtime
runtime: custom
env: flex

resources:
  cpu: 1
  memory_gb: 0.5    # Go is memory efficient - 512MB is generous
  disk_size_gb: 10

automatic_scaling:
  min_num_instances: 1
  max_num_instances: 10
  cool_down_period_sec: 60   # Go starts fast, shorter cooldown is fine
  cpu_utilization:
    target_utilization: 0.7   # Go handles concurrency well, higher target

liveness_check:
  path: "/_ah/live"
  check_interval_sec: 30
  timeout_sec: 4
  failure_threshold: 4
  success_threshold: 2

readiness_check:
  path: "/_ah/ready"
  check_interval_sec: 5
  timeout_sec: 4
  failure_threshold: 2
  success_threshold: 2
  app_start_timeout_sec: 60  # Go starts very fast

env_variables:
  APP_ENV: "production"
```

Notice the `app_start_timeout_sec: 60`. Go binaries start in milliseconds, so 60 seconds is more than enough. Compare this to Java or Python applications that might need 300 seconds.

## Building and Testing Locally

Test your application before deploying:

```bash
# Run locally
go run ./cmd/server/

# Build and test the Docker image
docker build -t my-go-app .
docker run -p 8080:8080 -e PORT=8080 my-go-app

# Test endpoints
curl http://localhost:8080/
curl http://localhost:8080/_ah/health
curl http://localhost:8080/api/data
```

Check the image size:

```bash
# The image should be very small
docker images my-go-app
# REPOSITORY   TAG     IMAGE ID     CREATED        SIZE
# my-go-app    latest  abc123       2 minutes ago  15MB
```

## Deploying

Deploy to App Engine Flex:

```bash
# Deploy to App Engine
gcloud app deploy app.yaml --project=your-project-id
```

The deployment process:
1. Source code uploaded to Cloud Storage
2. Docker image built with Cloud Build
3. Image pushed to Container Registry
4. New instances created with the image
5. Health checks verify the instances
6. Traffic routed to new instances

Because the Go binary and Docker image are so small, the Cloud Build step is fast - typically under 2 minutes.

## Adding Database Connectivity

Here is how to connect to Cloud SQL from Go:

```go
// internal/database/database.go - Cloud SQL connection
package database

import (
    "database/sql"
    "fmt"
    "os"

    _ "github.com/lib/pq" // PostgreSQL driver
)

func NewConnection() (*sql.DB, error) {
    // On App Engine Flex, connect via Unix socket
    socketDir := "/cloudsql"
    instanceConnectionName := os.Getenv("CLOUD_SQL_CONNECTION_NAME")
    dbUser := os.Getenv("DB_USER")
    dbPass := os.Getenv("DB_PASS")
    dbName := os.Getenv("DB_NAME")

    // Build the connection string for PostgreSQL via Unix socket
    dsn := fmt.Sprintf(
        "user=%s password=%s dbname=%s host=%s/%s sslmode=disable",
        dbUser, dbPass, dbName, socketDir, instanceConnectionName,
    )

    db, err := sql.Open("postgres", dsn)
    if err != nil {
        return nil, fmt.Errorf("failed to open database: %w", err)
    }

    // Configure connection pool
    db.SetMaxOpenConns(10)
    db.SetMaxIdleConns(5)
    db.SetConnMaxLifetime(30 * 60) // 30 minutes

    // Verify connectivity
    if err := db.Ping(); err != nil {
        return nil, fmt.Errorf("failed to ping database: %w", err)
    }

    return db, nil
}
```

Update `app.yaml` for Cloud SQL:

```yaml
# Add Cloud SQL connection to app.yaml
beta_settings:
  cloud_sql_instances: "your-project:us-central1:your-instance"

env_variables:
  CLOUD_SQL_CONNECTION_NAME: "your-project:us-central1:your-instance"
  DB_USER: "app"
  DB_NAME: "mydb"
```

## Performance Tuning for Go on App Engine

Go on App Engine Flex performs exceptionally well. Here are a few tuning tips:

Set GOMAXPROCS to match your CPU allocation:

```go
import "runtime"

func init() {
    // Match GOMAXPROCS to the allocated CPU
    // For 1 CPU in app.yaml, this is already the default
    runtime.GOMAXPROCS(runtime.NumCPU())
}
```

Use connection pooling for database and HTTP clients:

```go
// Reuse HTTP clients with connection pooling
var httpClient = &http.Client{
    Timeout: 10 * time.Second,
    Transport: &http.Transport{
        MaxIdleConns:        100,
        MaxIdleConnsPerHost: 10,
        IdleConnTimeout:     90 * time.Second,
    },
}
```

Enable gzip compression for API responses:

```go
// Middleware for gzip compression
func GzipMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        if strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
            gz := gzip.NewWriter(w)
            defer gz.Close()
            w.Header().Set("Content-Encoding", "gzip")
            next.ServeHTTP(&gzipResponseWriter{Writer: gz, ResponseWriter: w}, r)
        } else {
            next.ServeHTTP(w, r)
        }
    })
}
```

## Summary

Deploying Go on App Engine Flex with a custom runtime leverages Go's strengths perfectly. The multi-stage Docker build produces images under 20MB, instances start in milliseconds, and Go's goroutine-based concurrency handles high request volumes efficiently with minimal memory. The key pieces are a proper `Dockerfile` with `CGO_ENABLED=0` for static linking, health check endpoints for App Engine's instance management, and graceful shutdown handling for clean instance termination. Go applications on Flex can typically use smaller instance sizes than equivalent Python or Node.js applications, which translates to real cost savings.
