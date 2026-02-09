# How to Containerize a Chi (Go) Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Chi, Go, Golang, Containerization, Backend, DevOps, HTTP Router

Description: How to containerize a Chi router Go application with Docker, from multi-stage builds to production deployment with minimal images

---

Chi is a lightweight, composable Go HTTP router built on top of the standard library's `net/http`. Unlike full-featured frameworks, Chi adds just routing and middleware without replacing Go's standard patterns. This makes it a favorite among Go developers who want structure without abstraction overhead. Docker containerization works beautifully with Chi because the resulting binary is small, fast, and self-contained. This guide covers the complete workflow.

## Prerequisites

You need:

- Go 1.21+
- Docker Engine 20.10+
- Basic understanding of Go's `net/http` package

## Setting Up a Chi Project

Create a new module and install Chi:

```bash
mkdir my-chi-app && cd my-chi-app
go mod init my-chi-app
go get github.com/go-chi/chi/v5
go get github.com/go-chi/chi/v5/middleware
```

Create the main application file:

```go
// main.go - Chi router application
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
)

func main() {
	r := chi.NewRouter()

	// Standard middleware stack
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.Timeout(60 * time.Second))

	// Routes
	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		respondJSON(w, http.StatusOK, map[string]string{"message": "Hello from Chi!"})
	})

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	// API subrouter
	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/users", listUsers)
		r.Get("/users/{id}", getUser)
		r.Post("/users", createUser)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func listUsers(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusOK, map[string]interface{}{"users": []string{}})
}

func getUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	respondJSON(w, http.StatusOK, map[string]string{"id": id})
}

func createUser(w http.ResponseWriter, r *http.Request) {
	respondJSON(w, http.StatusCreated, map[string]string{"status": "created"})
}
```

Test locally:

```bash
go run main.go
curl http://localhost:8080
curl http://localhost:8080/api/v1/users
```

## Why Chi Works Well with Docker

Chi sticks close to Go's standard library. It uses `net/http` handlers and `http.Handler` interfaces throughout. This means Chi applications compile to small, dependency-light binaries. When packed into a `scratch` Docker image, the total container size stays under 15MB in most cases.

Chi's compatibility with `net/http` also means standard Go practices for graceful shutdown, timeouts, and middleware all work without special adapters.

## The Dockerfile

This multi-stage Dockerfile compiles Chi and packages the binary:

```dockerfile
# Stage 1: Build
FROM golang:1.22-alpine AS build

WORKDIR /app

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-s -w" \
    -o /app/server .

# Stage 2: Production (scratch for minimal size)
FROM scratch

# CA certificates for outbound HTTPS
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy the binary
COPY --from=build /app/server /server

EXPOSE 8080

ENTRYPOINT ["/server"]
```

For teams that need debugging capabilities in production, use Alpine:

```dockerfile
# Alternative: Alpine with shell access
FROM alpine:3.19
RUN apk --no-cache add ca-certificates
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=build /app/server /server
USER appuser
EXPOSE 8080
ENTRYPOINT ["/server"]
```

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
# Build
docker build -t my-chi-app:latest .

# Run
docker run -d -p 8080:8080 --name chi-app my-chi-app:latest

# Test
curl http://localhost:8080
curl http://localhost:8080/health

# Check image size
docker images my-chi-app
```

Expect roughly 8-12MB with `scratch`, 15-20MB with Alpine.

## Docker Compose Setup

A complete setup with PostgreSQL:

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
      - DATABASE_URL=postgres://chi:secret@postgres:5432/chidb?sslmode=disable
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: chi
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: chidb
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U chi"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

## Chi Middleware Patterns

Chi's middleware system follows the standard `func(http.Handler) http.Handler` pattern. Here are middleware examples useful in Docker deployments.

Custom CORS middleware:

```go
// middleware/cors.go - CORS middleware for containerized APIs
package middleware

import (
	"net/http"
	"os"
)

func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := os.Getenv("CORS_ORIGIN")
		if origin == "" {
			origin = "*"
		}

		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next.ServeHTTP(w, r)
	})
}
```

Register it:

```go
r := chi.NewRouter()
r.Use(middleware.CORS)
```

## Graceful Shutdown

Since Chi uses `net/http`, the standard graceful shutdown pattern applies:

```go
// main.go - Graceful shutdown with Chi
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
)

func main() {
	r := chi.NewRouter()

	r.Get("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("Hello"))
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:         ":" + port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in a goroutine
	go func() {
		log.Printf("Starting server on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	// Wait for termination signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down gracefully...")

	// Allow 15 seconds for in-flight requests to complete
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Forced shutdown:", err)
	}

	log.Println("Server stopped")
}
```

Docker sends SIGTERM when you run `docker stop`. This code catches it and drains active connections before exiting.

## Development with Hot Reload

Use Air for automatic rebuilding during development:

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

```yaml
# docker-compose.dev.yml
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
      - PORT=8080
```

## Project Structure for Larger Apps

As your Chi application grows, organize it for clean Docker builds:

```
my-chi-app/
  cmd/
    server/
      main.go        # Entry point
  internal/
    handler/         # HTTP handlers
    middleware/      # Custom middleware
    model/           # Data models
    repository/      # Database access
    service/         # Business logic
  go.mod
  go.sum
  Dockerfile
  docker-compose.yml
```

Update the build command in the Dockerfile:

```dockerfile
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server ./cmd/server
```

## Conclusion

Chi's minimal, standard-library-first approach is ideal for Docker containerization. The compiled binary is small, the dependency tree is tight, and the standard `net/http` patterns mean no special handling for shutdown, timeouts, or middleware. Use the `scratch` image for the tiniest possible containers, or Alpine when you need shell access. Combine with Docker Compose for database integration and Air for development hot reload, and you have a complete, production-ready setup.
