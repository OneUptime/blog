# How to Build a Go HTTP Service and Deploy It to Cloud Run with Minimal Docker Image

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, Go, Docker, Microservices, Containers

Description: Build a Go HTTP service and deploy it to Cloud Run using a minimal Docker image with multi-stage builds, scratch base images, and optimized binary compilation.

---

Go is one of the best languages for Cloud Run. It compiles to a single static binary, starts in milliseconds, and uses minimal memory. When you pair a Go binary with a scratch or distroless base image, you get container images under 20MB that cold start faster than almost anything else on Cloud Run.

In this post, I will build a Go HTTP service from scratch and deploy it to Cloud Run with the smallest possible container image.

## The HTTP Service

Start with a clean Go project:

```bash
mkdir go-service && cd go-service
go mod init example.com/go-service
```

Here is a production-ready HTTP service with routing, middleware, and graceful shutdown:

```go
// main.go - HTTP service for Cloud Run
package main

import (
    "context"
    "encoding/json"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    // Cloud Run sets the PORT environment variable
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    // Create a new router
    mux := http.NewServeMux()

    // Register routes
    mux.HandleFunc("GET /health", healthHandler)
    mux.HandleFunc("GET /api/items", listItemsHandler)
    mux.HandleFunc("GET /api/items/{id}", getItemHandler)
    mux.HandleFunc("POST /api/items", createItemHandler)

    // Wrap with logging middleware
    handler := loggingMiddleware(mux)

    // Configure the server
    server := &http.Server{
        Addr:         ":" + port,
        Handler:      handler,
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 30 * time.Second,
        IdleTimeout:  60 * time.Second,
    }

    // Start the server in a goroutine
    go func() {
        log.Printf("Starting server on port %s", port)
        if err := server.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatalf("Server error: %v", err)
        }
    }()

    // Wait for shutdown signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGTERM, syscall.SIGINT)
    <-quit

    // Graceful shutdown with timeout
    log.Println("Shutting down server...")
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    if err := server.Shutdown(ctx); err != nil {
        log.Fatalf("Server forced shutdown: %v", err)
    }
    log.Println("Server stopped")
}
```

## Route Handlers

```go
// handlers.go - HTTP request handlers
package main

import (
    "encoding/json"
    "net/http"
    "sync"
    "time"
)

// Item represents a data object
type Item struct {
    ID          string    `json:"id"`
    Name        string    `json:"name"`
    Description string    `json:"description"`
    CreatedAt   time.Time `json:"created_at"`
}

// In-memory store (replace with a database in production)
var (
    items   = make(map[string]Item)
    itemsMu sync.RWMutex
    counter int
)

// Health check endpoint for Cloud Run probes
func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

// List all items
func listItemsHandler(w http.ResponseWriter, r *http.Request) {
    itemsMu.RLock()
    defer itemsMu.RUnlock()

    result := make([]Item, 0, len(items))
    for _, item := range items {
        result = append(result, item)
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(result)
}

// Get a single item by ID
func getItemHandler(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")

    itemsMu.RLock()
    item, exists := items[id]
    itemsMu.RUnlock()

    if !exists {
        http.Error(w, `{"error": "item not found"}`, http.StatusNotFound)
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(item)
}

// Create a new item
func createItemHandler(w http.ResponseWriter, r *http.Request) {
    var req struct {
        Name        string `json:"name"`
        Description string `json:"description"`
    }

    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, `{"error": "invalid request body"}`, http.StatusBadRequest)
        return
    }

    if req.Name == "" {
        http.Error(w, `{"error": "name is required"}`, http.StatusBadRequest)
        return
    }

    itemsMu.Lock()
    counter++
    id := fmt.Sprintf("item-%d", counter)
    item := Item{
        ID:          id,
        Name:        req.Name,
        Description: req.Description,
        CreatedAt:   time.Now(),
    }
    items[id] = item
    itemsMu.Unlock()

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(item)
}
```

## Logging Middleware

```go
// middleware.go - HTTP middleware
package main

import (
    "log"
    "net/http"
    "time"
)

// responseWriter wraps http.ResponseWriter to capture the status code
type responseWriter struct {
    http.ResponseWriter
    statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
    rw.statusCode = code
    rw.ResponseWriter.WriteHeader(code)
}

// loggingMiddleware logs each request with method, path, status, and duration
func loggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()

        wrapped := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
        next.ServeHTTP(wrapped, r)

        duration := time.Since(start)
        log.Printf("%s %s %d %v", r.Method, r.URL.Path,
            wrapped.statusCode, duration)
    })
}
```

## The Minimal Dockerfile

This is where the image size optimization happens. A multi-stage build compiles the Go binary, then copies just the binary into a scratch image:

```dockerfile
# Stage 1: Build the Go binary
FROM golang:1.22-alpine AS build

WORKDIR /app

# Copy go.mod and go.sum first for layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build a statically linked binary
# CGO_ENABLED=0 ensures no C library dependencies
# -ldflags="-s -w" strips debug info for smaller binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o /server .

# Stage 2: Create the minimal runtime image
FROM scratch

# Copy the binary from the build stage
COPY --from=build /server /server

# Copy CA certificates for HTTPS calls to external services
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Expose the port
EXPOSE 8080

# Run the binary
ENTRYPOINT ["/server"]
```

The `scratch` image is literally empty - zero bytes. Your final image contains only your Go binary and the CA certificates. A typical Go service produces an image of 10-15MB.

If you need a minimal image that is not completely empty (for debugging), use distroless:

```dockerfile
# Alternative: use distroless for a slightly larger but more debuggable image
FROM gcr.io/distroless/static-debian12
COPY --from=build /server /server
ENTRYPOINT ["/server"]
```

## Building and Testing Locally

```bash
# Build the Docker image
docker build -t go-service .

# Check the image size
docker images go-service
# REPOSITORY    TAG       IMAGE ID       CREATED          SIZE
# go-service    latest    abc123def456   10 seconds ago   12.3MB

# Run locally
docker run -p 8080:8080 go-service

# Test the endpoints
curl http://localhost:8080/health
curl -X POST http://localhost:8080/api/items \
    -H "Content-Type: application/json" \
    -d '{"name": "Test Item", "description": "A test"}'
curl http://localhost:8080/api/items
```

## Deploying to Cloud Run

```bash
# Build and push using Cloud Build
gcloud builds submit --tag gcr.io/my-project/go-service

# Deploy to Cloud Run
gcloud run deploy go-service \
    --image gcr.io/my-project/go-service:latest \
    --platform managed \
    --region us-central1 \
    --memory 128Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 100 \
    --concurrency 80 \
    --timeout 60s \
    --allow-unauthenticated
```

Notice the `--memory 128Mi`. A Go service with an in-memory store runs comfortably in 128MB. With a database connection, 256MB is usually plenty.

## Optimizing for Cold Start

Go services already cold start fast, but you can squeeze out a bit more:

```bash
# Deploy with startup CPU boost enabled
gcloud run deploy go-service \
    --image gcr.io/my-project/go-service:latest \
    --cpu-boost \
    --region us-central1 \
    --memory 128Mi
```

The `--cpu-boost` flag gives your container extra CPU during startup, which helps with the initial request processing.

## Adding Health Check Probes

```bash
# Deploy with startup and liveness probes
gcloud run deploy go-service \
    --image gcr.io/my-project/go-service:latest \
    --startup-probe "httpGet.path=/health,httpGet.port=8080,initialDelaySeconds=0,periodSeconds=1,failureThreshold=3" \
    --liveness-probe "httpGet.path=/health,httpGet.port=8080,periodSeconds=30" \
    --region us-central1 \
    --memory 128Mi
```

## Concurrency Settings

Go handles concurrency natively with goroutines, so you can set the Cloud Run concurrency higher than you would for other languages:

```bash
# Go can handle many concurrent requests per instance
gcloud run deploy go-service \
    --image gcr.io/my-project/go-service:latest \
    --concurrency 250 \
    --region us-central1
```

Each incoming request runs in its own goroutine, and Go's scheduler efficiently multiplexes goroutines across OS threads. A single Cloud Run instance with 1 vCPU can handle hundreds of concurrent requests.

## Wrapping Up

Go and Cloud Run are a great combination. A statically compiled Go binary in a scratch or distroless image gives you the smallest possible container - typically 10-15MB. Cold starts are measured in milliseconds. Memory usage is minimal. And Go's goroutine-based concurrency model lets you handle many concurrent requests per instance, which means fewer instances and lower cost. The multi-stage Docker build is the key technique: compile with the full Go toolchain, then copy just the binary into an empty image.
