# How to Set Up Hot Reloading in Docker for Go with Air

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Docker, Development, Hot Reloading, DevOps

Description: Set up fast development loops for Go applications in Docker using Air for automatic hot reloading on code changes.

---

## Introduction

One of the biggest challenges when developing Go applications inside Docker containers is the slow feedback loop. Every time you make a code change, you typically need to rebuild the entire Docker image, which can take anywhere from 30 seconds to several minutes depending on your project size and dependencies.

This frustrating workflow kills developer productivity and breaks the flow state that's essential for efficient coding. Fortunately, there's a solution: **Air** - a live-reloading tool for Go applications that watches your source files and automatically rebuilds and restarts your application when changes are detected.

In this comprehensive guide, you'll learn how to set up Air with Docker to create a blazing-fast development environment where code changes are reflected in seconds, not minutes.

## What is Air?

Air is a live-reloading utility for Go applications, similar to what `nodemon` provides for Node.js. When you save a file, Air:

1. Detects the file change
2. Rebuilds your Go application
3. Restarts the running process
4. All within seconds

This creates an incredibly responsive development experience where you can see your changes almost immediately after saving.

## Prerequisites

Before we begin, make sure you have the following installed on your development machine:

- Docker (version 20.10 or later)
- Docker Compose (version 2.0 or later)
- A Go project to work with (we'll create a sample one)
- Basic familiarity with Go and Docker

## Project Structure

Let's start by setting up our project structure. We'll create a simple Go web application that demonstrates the hot-reloading capabilities.

Here's the directory structure we'll create:

```
my-go-app/
├── .air.toml           # Air configuration file
├── Dockerfile          # Development Dockerfile
├── Dockerfile.prod     # Production Dockerfile
├── docker-compose.yml  # Docker Compose for development
├── go.mod              # Go module file
├── go.sum              # Go dependencies checksum
├── main.go             # Main application entry point
├── internal/
│   ├── handlers/
│   │   └── handlers.go # HTTP handlers
│   └── config/
│       └── config.go   # Application configuration
└── tmp/                # Air's temporary build directory (auto-generated)
```

## Step 1: Create the Sample Go Application

First, let's create our sample Go application. This will be a simple HTTP server that we'll use to demonstrate hot reloading.

### Initialize the Go Module

Create a new directory and initialize the Go module:

```bash
mkdir my-go-app && cd my-go-app
go mod init github.com/yourusername/my-go-app
```

### Main Application File

Create the main application entry point that sets up the HTTP server and routes:

```go
// main.go
package main

import (
    "fmt"
    "log"
    "net/http"
    "os"

    "github.com/yourusername/my-go-app/internal/config"
    "github.com/yourusername/my-go-app/internal/handlers"
)

func main() {
    // Load application configuration from environment variables
    cfg := config.Load()

    // Create a new HTTP router/mux
    mux := http.NewServeMux()

    // Register our application routes
    // Each handler is responsible for a specific endpoint
    mux.HandleFunc("/", handlers.HomeHandler)
    mux.HandleFunc("/health", handlers.HealthHandler)
    mux.HandleFunc("/api/users", handlers.UsersHandler)

    // Build the server address from configuration
    addr := fmt.Sprintf(":%s", cfg.Port)

    // Log startup information
    log.Printf("Starting server on %s", addr)
    log.Printf("Environment: %s", cfg.Environment)

    // Start the HTTP server
    // This blocks until the server is shut down
    if err := http.ListenAndServe(addr, mux); err != nil {
        log.Fatalf("Server failed to start: %v", err)
        os.Exit(1)
    }
}
```

### Configuration Module

Create the configuration module that handles environment variables:

```go
// internal/config/config.go
package config

import (
    "os"
)

// Config holds all application configuration
// These values are typically loaded from environment variables
type Config struct {
    Port        string
    Environment string
    DatabaseURL string
    LogLevel    string
}

// Load reads configuration from environment variables
// with sensible defaults for development
func Load() *Config {
    return &Config{
        // Server port - defaults to 8080 for local development
        Port: getEnv("PORT", "8080"),

        // Environment name - useful for conditional behavior
        Environment: getEnv("ENVIRONMENT", "development"),

        // Database connection string
        DatabaseURL: getEnv("DATABASE_URL", "postgres://localhost:5432/myapp"),

        // Logging verbosity level
        LogLevel: getEnv("LOG_LEVEL", "debug"),
    }
}

// getEnv retrieves an environment variable or returns a default value
// This pattern makes configuration flexible and testable
func getEnv(key, defaultValue string) string {
    if value, exists := os.LookupEnv(key); exists {
        return value
    }
    return defaultValue
}
```

### HTTP Handlers

Create the HTTP handlers that respond to requests:

```go
// internal/handlers/handlers.go
package handlers

import (
    "encoding/json"
    "net/http"
    "time"
)

// Response is a generic JSON response structure
// Used for consistent API responses across all endpoints
type Response struct {
    Message   string      `json:"message"`
    Data      interface{} `json:"data,omitempty"`
    Timestamp time.Time   `json:"timestamp"`
}

// User represents a user in our system
// In a real application, this would come from a database
type User struct {
    ID    int    `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

// HomeHandler handles requests to the root endpoint
// Returns a welcome message - try changing this to see hot reload in action!
func HomeHandler(w http.ResponseWriter, r *http.Request) {
    // Only accept requests to exactly "/"
    if r.URL.Path != "/" {
        http.NotFound(w, r)
        return
    }

    response := Response{
        Message:   "Welcome to the Go Hot Reload Demo!",
        Timestamp: time.Now(),
    }

    // Set content type and encode response as JSON
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// HealthHandler provides a health check endpoint
// Useful for container orchestration and load balancers
func HealthHandler(w http.ResponseWriter, r *http.Request) {
    response := Response{
        Message:   "OK",
        Data:      map[string]string{"status": "healthy"},
        Timestamp: time.Now(),
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

// UsersHandler returns a list of mock users
// Demonstrates JSON serialization with hot reloading
func UsersHandler(w http.ResponseWriter, r *http.Request) {
    // Mock user data - in production, this would come from a database
    users := []User{
        {ID: 1, Name: "Alice Johnson", Email: "alice@example.com"},
        {ID: 2, Name: "Bob Smith", Email: "bob@example.com"},
        {ID: 3, Name: "Charlie Brown", Email: "charlie@example.com"},
    }

    response := Response{
        Message:   "Users retrieved successfully",
        Data:      users,
        Timestamp: time.Now(),
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}
```

## Step 2: Install and Configure Air

Now let's set up Air for hot reloading. Air uses a TOML configuration file to define its behavior.

### The Air Configuration File

Create the `.air.toml` file in your project root. This file controls how Air watches files, builds your application, and handles the reload process:

```toml
# .air.toml - Air Configuration for Hot Reloading
# This file configures how Air watches and rebuilds your Go application

# Root directory for watching - use "." for current directory
root = "."

# Temporary directory where Air stores build artifacts
# This directory is created automatically and should be gitignored
tmp_dir = "tmp"

[build]
# Command to build your application
# Add any build flags you need here (like -race for race detection)
cmd = "go build -o ./tmp/main ."

# Path to the built binary that Air will execute
bin = "./tmp/main"

# Arguments to pass to your application when running
# Useful for passing flags or configuration
args_bin = []

# Pre-build command - runs before each build
# Useful for code generation, proto compilation, etc.
pre_cmd = []

# Post-build command - runs after each successful build
# Useful for running migrations or other setup tasks
post_cmd = []

# Enable polling mode for file watching (useful for Docker on some OSes)
# Set to true if you're on Windows or using certain Docker setups
poll = false

# Polling interval in milliseconds (only used if poll = true)
poll_interval = 500

# Build delay after file change is detected (in milliseconds)
# Helps batch multiple rapid changes into one rebuild
delay = 1000

# Stop running the old binary before building the new one
# Recommended to avoid port conflicts
stop_on_error = true

# Send interrupt signal before killing process
# Allows graceful shutdown of your application
send_interrupt = true

# Delay after interrupt before force killing (in milliseconds)
kill_delay = 500

# Rerun binary on build error - useful for debugging
rerun = false

# Delay before rerunning (in milliseconds)
rerun_delay = 500

[build.log]
# Enable build-time logging
time = true

# Show build time in output
main_only = false

[color]
# Customize output colors for better readability in terminal
main = "magenta"
watcher = "cyan"
build = "yellow"
runner = "green"

[log]
# Log output settings
# Time format for logs (Go time format)
time = true

# Only show main binary output (hide Air's internal logs)
main_only = false

[misc]
# Clean temporary directory on exit
clean_on_exit = true

[screen]
# Clear screen on rebuild for cleaner output
clear_on_rebuild = true

# Keep scroll position (set to false for always scrolling to top)
keep_scroll = true

[proxy]
# Proxy configuration (optional, for advanced setups)
enabled = false
proxy_port = 8090
app_port = 8080

[include]
# Directories to watch for changes
# Air will only watch these directories for file changes
dir = ["."]

[exclude]
# Directories to exclude from watching
# These directories will be ignored when detecting file changes
dir = [
    "tmp",
    "vendor",
    "node_modules",
    ".git",
    "testdata",
    "docs",
    "scripts",
]

# File patterns to exclude from watching
# Useful for ignoring generated files, tests, or documentation
regex = [
    "_test\\.go$",
    "_mock\\.go$",
    "\\.pb\\.go$",
    "swagger\\.json$",
    "\\.md$",
]

# File extensions to watch - only these file types trigger rebuilds
# Add more extensions if you have other file types that should trigger rebuilds
[include_ext]
list = ["go", "tpl", "tmpl", "html", "env"]

# File extensions to exclude - these never trigger rebuilds
[exclude_ext]
list = ["tmp", "log", "pid"]

# Specific files to exclude from watching
[exclude_file]
list = [
    "go.sum",
    ".air.toml",
]

# Specific directories to watch (alternative to include.dir)
[include_dir]
list = []

# Specific files to watch (in addition to extension-based matching)
[include_file]
list = []

# Exclude unchanged files from triggering rebuilds
[exclude_unchanged]
enabled = false
```

### Key Configuration Options Explained

Let's break down the most important configuration options:

**Build Section:**
- `cmd`: The command to compile your Go application. You can add flags like `-race` for race detection or `-ldflags` for version information.
- `bin`: Path where the compiled binary is stored. Air runs this after each successful build.
- `delay`: Time to wait after detecting a change before rebuilding. This batches multiple rapid changes into one build.

**Exclude Section:**
- `dir`: Directories to ignore. Always exclude `tmp`, `vendor`, `.git`, and any generated directories.
- `regex`: Regular expressions for files to ignore. Test files and generated protobuf files are good candidates.

**Include Extensions:**
- `list`: File extensions that trigger a rebuild. Add any template or configuration files your application uses.

## Step 3: Create the Development Dockerfile

Now let's create a Dockerfile specifically optimized for development with Air:

```dockerfile
# Dockerfile (Development)
# This Dockerfile is optimized for development with hot reloading
# It includes Air and mounts your source code as a volume

# Use the official Go image as our base
# Alpine variant is smaller but we use the full image for better compatibility
FROM golang:1.22-bookworm

# Set the working directory inside the container
# All subsequent commands will run from this directory
WORKDIR /app

# Install Air for hot reloading
# We install it globally so it's available in the PATH
RUN go install github.com/cosmtrek/air@latest

# Install additional development tools (optional but useful)
# - delve: Go debugger for debugging inside containers
# - golangci-lint: Linter for code quality checks
RUN go install github.com/go-delve/delve/cmd/dlv@latest && \
    curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin v1.55.2

# Copy go.mod and go.sum first for better layer caching
# This layer only rebuilds when dependencies change
COPY go.mod go.sum* ./

# Download all dependencies
# This is cached separately from source code changes
RUN go mod download && go mod verify

# Copy the Air configuration file
# This tells Air how to watch and rebuild our application
COPY .air.toml ./

# Note: We do NOT copy source code here!
# Source code is mounted as a volume in docker-compose
# This enables hot reloading without rebuilding the image

# Expose the application port
# Make sure this matches your application's listening port
EXPOSE 8080

# Expose delve debugger port (optional, for debugging)
EXPOSE 2345

# Set environment variables for development
ENV GO111MODULE=on
ENV CGO_ENABLED=0
ENV GOOS=linux
ENV GOARCH=amd64

# Default command: run Air for hot reloading
# Air will watch for changes and rebuild automatically
CMD ["air", "-c", ".air.toml"]
```

### Production Dockerfile (For Reference)

It's helpful to also have a production Dockerfile for comparison. This shows the difference between development and production builds:

```dockerfile
# Dockerfile.prod (Production)
# Multi-stage build for minimal production image

# Stage 1: Build the application
FROM golang:1.22-bookworm AS builder

WORKDIR /app

# Copy dependency files first for caching
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# Copy source code and build
COPY . .

# Build with optimizations and strip debug info
# CGO_ENABLED=0 creates a static binary
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags='-w -s -extldflags "-static"' \
    -a -installsuffix cgo \
    -o /app/main .

# Stage 2: Create minimal runtime image
FROM alpine:3.19

# Add CA certificates for HTTPS requests
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Copy only the binary from builder stage
COPY --from=builder /app/main .

# Create non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

USER appuser

EXPOSE 8080

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

ENTRYPOINT ["/app/main"]
```

## Step 4: Set Up Docker Compose

Docker Compose orchestrates our development environment, handling volume mounts, environment variables, and service dependencies:

```yaml
# docker-compose.yml
# Development environment with hot reloading

version: '3.8'

services:
  # Main Go application with Air hot reloading
  app:
    # Build from our development Dockerfile
    build:
      context: .
      dockerfile: Dockerfile

    # Container name for easy reference
    container_name: go-hot-reload-app

    # Expose ports: host:container
    ports:
      - "8080:8080"     # Application port
      - "2345:2345"     # Delve debugger port (optional)

    # Volume mounts - THE KEY TO HOT RELOADING
    # Mount source code as a volume so changes are reflected immediately
    volumes:
      # Mount the entire project directory
      # This allows Air to see file changes in real-time
      - .:/app

      # Anonymous volume for Go module cache
      # Prevents re-downloading dependencies on every restart
      - go-mod-cache:/go/pkg/mod

      # Anonymous volume for Go build cache
      # Speeds up subsequent builds significantly
      - go-build-cache:/root/.cache/go-build

      # Exclude the tmp directory from syncing
      # This prevents conflicts with Air's build artifacts
      - /app/tmp

    # Environment variables for the application
    environment:
      # Application configuration
      - PORT=8080
      - ENVIRONMENT=development
      - LOG_LEVEL=debug

      # Database connection (if using)
      - DATABASE_URL=postgres://postgres:password@db:5432/myapp?sslmode=disable

      # Go specific settings
      - GO111MODULE=on
      - GOPROXY=https://proxy.golang.org,direct

      # Air specific settings
      - AIR_BUILD_DELAY=500

    # Override the default command if needed
    # Uncomment to use delve debugger instead
    # command: dlv debug --headless --listen=:2345 --api-version=2 --accept-multiclient

    # Depend on database being ready (if using)
    depends_on:
      db:
        condition: service_healthy

    # Restart policy for development
    restart: unless-stopped

    # Network for service communication
    networks:
      - app-network

  # PostgreSQL database service (optional)
  db:
    image: postgres:16-alpine
    container_name: go-hot-reload-db

    # Database configuration
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=myapp

    # Persist database data
    volumes:
      - postgres-data:/var/lib/postgresql/data
      # Initialize database with custom scripts
      - ./scripts/init-db.sql:/docker-entrypoint-initdb.d/init.sql:ro

    # Expose PostgreSQL port
    ports:
      - "5432:5432"

    # Health check for dependency management
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

    networks:
      - app-network

  # Redis cache service (optional)
  redis:
    image: redis:7-alpine
    container_name: go-hot-reload-redis

    # Redis configuration
    command: redis-server --appendonly yes

    # Persist Redis data
    volumes:
      - redis-data:/data

    # Expose Redis port
    ports:
      - "6379:6379"

    # Health check
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

    networks:
      - app-network

# Named volumes for data persistence and caching
volumes:
  # Go module cache - shared across rebuilds
  go-mod-cache:
    driver: local

  # Go build cache - speeds up compilation
  go-build-cache:
    driver: local

  # PostgreSQL data persistence
  postgres-data:
    driver: local

  # Redis data persistence
  redis-data:
    driver: local

# Network for inter-service communication
networks:
  app-network:
    driver: bridge
```

## Step 5: Understanding Volume Mounts

Volume mounts are the key to hot reloading in Docker. Let's examine each mount and its purpose:

### Source Code Mount

```yaml
- .:/app
```

This mounts your entire project directory into the container at `/app`. When you edit files on your host machine, those changes are immediately visible inside the container. Air watches these files and triggers a rebuild.

### Module Cache Volume

```yaml
- go-mod-cache:/go/pkg/mod
```

This named volume persists the Go module cache between container restarts. Without this, every restart would re-download all dependencies.

### Build Cache Volume

```yaml
- go-build-cache:/root/.cache/go-build
```

Go's build cache stores compiled packages. Persisting this cache dramatically speeds up incremental builds since unchanged packages don't need to be recompiled.

### Excluding the tmp Directory

```yaml
- /app/tmp
```

This creates an anonymous volume for the `tmp` directory, preventing Air's build artifacts from syncing back to your host. This avoids potential conflicts and keeps your local directory clean.

## Step 6: Running the Development Environment

Now let's start the development environment and see hot reloading in action.

### Start the Services

Build and start all services with Docker Compose:

```bash
# Build the images and start all services
docker-compose up --build

# Or run in detached mode (background)
docker-compose up -d --build

# View logs in detached mode
docker-compose logs -f app
```

### Verify Hot Reloading Works

Once the services are running, you should see output like:

```
go-hot-reload-app  |
go-hot-reload-app  |   __    _   ___
go-hot-reload-app  |  / /\  | | | |_)
go-hot-reload-app  | /_/--\ |_| |_| \_ v1.49.0, built with Go go1.22
go-hot-reload-app  |
go-hot-reload-app  | watching .
go-hot-reload-app  | !exclude tmp
go-hot-reload-app  | building...
go-hot-reload-app  | running...
go-hot-reload-app  | 2024/01/07 10:30:00 Starting server on :8080
go-hot-reload-app  | 2024/01/07 10:30:00 Environment: development
```

### Test Hot Reloading

Now make a change to see hot reloading in action:

1. Open `internal/handlers/handlers.go`
2. Change the welcome message in `HomeHandler`
3. Save the file
4. Watch the terminal - you should see Air rebuild and restart
5. Refresh your browser to see the change

The output will show something like:

```
go-hot-reload-app  | internal/handlers/handlers.go has changed
go-hot-reload-app  | building...
go-hot-reload-app  | running...
go-hot-reload-app  | 2024/01/07 10:31:15 Starting server on :8080
```

### Common Commands

Here are useful commands for managing your development environment:

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (fresh start)
docker-compose down -v

# Rebuild a specific service
docker-compose build app

# View real-time logs
docker-compose logs -f

# Execute commands in the container
docker-compose exec app go test ./...

# Run a one-off command
docker-compose run --rm app go mod tidy

# Restart a specific service
docker-compose restart app
```

## Step 7: Advanced Configuration

Let's explore some advanced configurations for specific use cases.

### Debugging with Delve

To enable debugging, modify your Docker Compose command:

```yaml
# In docker-compose.yml, add to the app service:
command: >
  sh -c "go install github.com/go-delve/delve/cmd/dlv@latest &&
         dlv debug --headless --listen=:2345 --api-version=2 --accept-multiclient ./..."
```

Then connect your IDE's debugger to `localhost:2345`.

### Conditional Configuration with Environment

Create a `.air.toml.template` and generate the actual config based on environment:

```bash
#!/bin/bash
# scripts/generate-air-config.sh
# Generate Air configuration based on environment

if [ "$ENVIRONMENT" = "production" ]; then
    # Production settings - faster builds, no debug
    export BUILD_FLAGS="-ldflags='-w -s'"
    export POLL_MODE="false"
else
    # Development settings - race detection, verbose
    export BUILD_FLAGS="-race"
    export POLL_MODE="true"
fi

envsubst < .air.toml.template > .air.toml
```

### Multi-Module Monorepo Setup

For projects with multiple Go modules, create a custom Air configuration:

```toml
# .air.toml for monorepo
root = "."
tmp_dir = "tmp"

[build]
# Build all services
cmd = "make build-all"
bin = "./tmp/main"
delay = 2000

[include]
dir = [
    "cmd",
    "pkg",
    "internal",
    "services/auth",
    "services/api",
]
```

### Using Air with Private Go Modules

If your project uses private Go modules, configure authentication in Docker:

```dockerfile
# Dockerfile addition for private modules
ARG GITHUB_TOKEN

# Configure Git to use token for private repos
RUN git config --global url."https://${GITHUB_TOKEN}@github.com/".insteadOf "https://github.com/"

# Set GOPRIVATE for your organization
ENV GOPRIVATE=github.com/yourorg/*
```

## Step 8: Performance Optimization

Here are tips to maximize hot reload performance:

### 1. Use Build Tags for Development

Create development-only code:

```go
//go:build dev
// +build dev

package main

func init() {
    // Development-only initialization
    log.Println("Running in development mode")
}
```

Build with: `go build -tags dev`

### 2. Optimize File Watching

Reduce watched directories in `.air.toml`:

```toml
[include]
dir = ["cmd", "internal", "pkg"]

[exclude]
dir = [
    "vendor",
    "node_modules",
    ".git",
    "tmp",
    "docs",
    "scripts",
    "test",
    "testdata",
    ".github",
    "deploy",
]
```

### 3. Increase Build Delay for Large Projects

For large projects, increase the delay to batch changes:

```toml
[build]
delay = 2000  # 2 seconds
```

### 4. Use Docker BuildKit

Enable BuildKit for faster builds:

```yaml
# docker-compose.yml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        BUILDKIT_INLINE_CACHE: 1
```

Run with:

```bash
DOCKER_BUILDKIT=1 docker-compose build
```

## Troubleshooting Common Issues

### File Changes Not Detected

**Problem:** Air doesn't detect file changes.

**Solutions:**

1. Enable polling mode for Docker on macOS/Windows:

```toml
[build]
poll = true
poll_interval = 500
```

2. Check volume mount syntax:

```yaml
volumes:
  - ./:/app  # Use ./ instead of just .
```

3. Verify file permissions inside container:

```bash
docker-compose exec app ls -la /app
```

### Port Already in Use

**Problem:** `bind: address already in use` error.

**Solution:** Configure Air to kill the old process properly:

```toml
[build]
stop_on_error = true
send_interrupt = true
kill_delay = 500
```

### Slow Rebuilds

**Problem:** Rebuilds take too long.

**Solutions:**

1. Use build cache volumes (as shown in docker-compose.yml)
2. Exclude more directories from watching
3. Use incremental builds with `-mod=readonly`

### Container Runs Out of Memory

**Problem:** Go build consumes too much memory.

**Solution:** Limit Go's memory usage:

```yaml
environment:
  - GOGC=50  # Reduce garbage collection threshold
  - GOMEMLIMIT=512MiB  # Limit memory usage
```

### Binary Not Found

**Problem:** `./tmp/main: no such file or directory`

**Solutions:**

1. Ensure the tmp directory exists:

```toml
[build]
pre_cmd = ["mkdir -p tmp"]
```

2. Check build output path matches bin path:

```toml
[build]
cmd = "go build -o ./tmp/main ."
bin = "./tmp/main"
```

## Best Practices Summary

1. **Always use volumes for Go caches** - This dramatically speeds up builds and dependency resolution.

2. **Exclude aggressively** - The fewer files Air watches, the faster it detects relevant changes.

3. **Use separate Dockerfiles** - Keep development and production Dockerfiles separate for clarity.

4. **Persist data volumes** - Use named volumes for databases and caches to avoid data loss.

5. **Enable polling on macOS/Windows** - File system events don't always propagate correctly in Docker on these platforms.

6. **Use build delays** - Batch rapid changes into single rebuilds to avoid unnecessary work.

7. **Monitor resource usage** - Go builds can be memory-intensive; set appropriate limits.

8. **Version your Air config** - Include `.air.toml` in version control so the team has consistent settings.

## Conclusion

Setting up hot reloading for Go applications in Docker with Air transforms the development experience. Instead of waiting for full image rebuilds, you get sub-second feedback on code changes, making development feel as responsive as working natively.

The key components we covered:

- **Air**: The hot reloading tool that watches files and rebuilds your application
- **Volume mounts**: Enable real-time code syncing between host and container
- **Docker Compose**: Orchestrates the development environment with proper caching
- **Configuration**: Fine-tuned settings for optimal rebuild performance

With this setup, you can enjoy the isolation and consistency benefits of Docker while maintaining the fast iteration cycles essential for productive development.

## Additional Resources

- [Air GitHub Repository](https://github.com/cosmtrek/air) - Official Air documentation and source code
- [Docker Compose Documentation](https://docs.docker.com/compose/) - Complete Docker Compose reference
- [Go Modules Reference](https://go.dev/ref/mod) - Official Go modules documentation
- [Delve Debugger](https://github.com/go-delve/delve) - Go debugger for container debugging

## Next Steps

Now that you have hot reloading working, consider these enhancements:

1. **Add debugging support** - Configure Delve for step-through debugging in containers
2. **Set up testing** - Run tests automatically on file changes
3. **Configure linting** - Add golangci-lint to your pre-build commands
4. **Implement graceful shutdown** - Handle SIGTERM properly for clean restarts
5. **Add observability** - Integrate logging and metrics for development insights

Happy coding with your new lightning-fast Go development environment!
