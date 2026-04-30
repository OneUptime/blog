# How to Set Up a Go Development Environment with Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Go, Golang, Development, DevOps

Description: Build a complete Go development environment with live-reload, debugging, and database services using Docker and Portainer.

## Introduction

Go's fast compile times make it excellent for containerized development. This guide builds a Go development environment with Air (live-reload), Delve (debugger), and supporting services, all managed through Portainer.

## Step 1: Create the Development Dockerfile

```dockerfile
# Dockerfile.dev - Go development image

FROM golang:1.22-alpine

# Install development tools
RUN apk add --no-cache \
    git \
    curl \
    bash \
    procps \
    make \
    gcc \
    musl-dev

WORKDIR /app

# Install Go development tools
RUN go install github.com/air-verse/air@latest && \
    go install github.com/go-delve/delve/cmd/dlv@latest && \
    go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest && \
    go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest && \
    go install github.com/swaggo/swag/cmd/swag@latest

# Pre-download dependencies
COPY go.mod go.sum ./
RUN go mod download

EXPOSE 8080   # Application
EXPOSE 2345   # Delve debugger
```

## Step 2: Configure Air for Hot-Reload

```toml
# .air.toml - Live reload configuration
root = "."
tmp_dir = "/tmp/air"

[build]
  # Build command
  cmd = "go build -gcflags='all=-N -l' -o /tmp/air/main ./cmd/server"
  # Binary path
  bin = "/tmp/air/main"
  # Files to watch
  include_ext = ["go", "tpl", "tmpl", "html", "yaml", "yml"]
  # Directories to exclude
  exclude_dir = ["vendor", "testdata", "tmp", ".git"]
  # Delay before rebuild (ms)
  delay = 500
  # Kill process on rebuild
  kill_delay = "500ms"
  # Log build errors
  send_interrupt = false

[log]
  time = true
  main_only = false

[color]
  main = "magenta"
  watcher = "cyan"
  build = "yellow"
  runner = "green"
```

## Step 3: Deploy the Go Stack in Portainer

In Portainer, use absolute host paths for `build.context` and bind mounts; relative paths like `.` only work for Git-deployed stacks when relative path volumes are enabled. If your Portainer environment is remote, build the image outside Portainer and replace the `build:` block with an `image:` reference.

```yaml
# docker-compose.yml - Go Development Stack

networks:
  go_dev:
    driver: bridge

volumes:
  go_cache:
  postgres_data:
  redis_data:

services:
  # Go application with Air hot-reload
  app:
    build:
      # Replace with the absolute path to your Go project on the Docker host
      context: /absolute/path/to/your/go/project
      dockerfile: Dockerfile.dev
    container_name: go_app
    restart: unless-stopped
    ports:
      - "8080:8080"   # Application
      - "2345:2345"   # Delve debugger
    environment:
      - APP_ENV=development
      - DATABASE_URL=postgres://devuser:devpassword@postgres:5432/devdb?sslmode=disable
      - REDIS_URL=redis://redis:6379/0
      - LOG_LEVEL=debug
    volumes:
      # Mount source code
      - /absolute/path/to/your/go/project:/app
      # Cache Go modules
      - go_cache:/go/pkg/mod
    # Use Air for hot-reload
    command: air
    security_opt:
      - "seccomp:unconfined"  # Required for Delve
    cap_add:
      - SYS_PTRACE             # Required for Delve
    networks:
      - go_dev
    depends_on:
      - postgres
      - redis

  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    container_name: go_postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=devdb
      - POSTGRES_USER=devuser
      - POSTGRES_PASSWORD=devpassword
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - go_dev

  # Redis
  redis:
    image: redis:7-alpine
    container_name: go_redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    networks:
      - go_dev
```

## Step 4: Example Go Application

```go
// cmd/server/main.go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "log/slog"
    "net/http"
    "os"

    "github.com/go-chi/chi/v5"
    "github.com/go-chi/chi/v5/middleware"
    _ "github.com/lib/pq"
    "github.com/redis/go-redis/v9"
)

func main() {
    logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

    // Connect to PostgreSQL
    db, err := sql.Open("postgres", os.Getenv("DATABASE_URL"))
    if err != nil {
        logger.Error("failed to connect to database", "error", err)
        os.Exit(1)
    }
    defer db.Close()

    // Connect to Redis
    opt, err := redis.ParseURL(os.Getenv("REDIS_URL"))
    if err != nil {
        logger.Error("failed to parse Redis URL", "error", err)
        os.Exit(1)
    }
    rdb := redis.NewClient(opt)
    defer rdb.Close()

    // Verify connections
    if err := db.PingContext(context.Background()); err != nil {
        logger.Error("database ping failed", "error", err)
        os.Exit(1)
    }

    if err := rdb.Ping(context.Background()).Err(); err != nil {
        logger.Error("redis ping failed", "error", err)
        os.Exit(1)
    }

    r := chi.NewRouter()
    r.Use(middleware.Logger)
    r.Use(middleware.Recoverer)

    r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")

        dbStatus := "ok"
        if err := db.PingContext(r.Context()); err != nil {
            dbStatus = "error"
        }

        redisStatus := "ok"
        if err := rdb.Ping(r.Context()).Err(); err != nil {
            redisStatus = "error"
        }

        fmt.Fprintf(w, `{"status":"ok","db":"%s","redis":"%s"}`, dbStatus, redisStatus)
    })

    port := ":8080"
    logger.Info("server starting", "port", port)
    if err := http.ListenAndServe(port, r); err != nil {
        logger.Error("server failed", "error", err)
        os.Exit(1)
    }
}
```

## Step 5: Database Migrations

```bash
# Create migration files
mkdir -p migrations

# Create first migration
cat > migrations/000001_create_users.up.sql << 'EOF'
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
EOF

cat > migrations/000001_create_users.down.sql << 'EOF'
DROP TABLE IF EXISTS users;
EOF

# Run migrations
docker exec go_app migrate \
  -path /app/migrations \
  -database "postgres://devuser:devpassword@postgres:5432/devdb?sslmode=disable" \
  up

# Rollback
docker exec go_app migrate \
  -path /app/migrations \
  -database "postgres://devuser:devpassword@postgres:5432/devdb?sslmode=disable" \
  down 1
```

## Step 6: Remote Debugging with Delve

```json
// VS Code .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Connect to Go in Docker",
      "type": "go",
      "debugAdapter": "dlv-dap",
      "request": "attach",
      "mode": "remote",
      "port": 2345,
      "host": "127.0.0.1",
      "substitutePath": [
        {
          "from": "${workspaceFolder}",
          "to": "/app"
        }
      ]
    }
  ]
}
```

```bash
# Attach Delve to the Air-managed process in the running container
docker exec -d go_app sh -lc 'dlv attach "$(pgrep -f /tmp/air/main)" \
  --headless --listen=:2345 \
  --api-version=2 \
  --accept-multiclient \
  --continue'
```

## Step 7: Running Tests

```bash
# Run all tests
docker exec go_app go test ./...

# Run with race detector
docker exec go_app go test -race ./...

# Run with coverage
docker exec go_app go test -cover -coverprofile=coverage.out ./...
docker exec go_app go tool cover -html=coverage.out -o coverage.html

# Run specific test
docker exec go_app go test -run TestUserService -v ./internal/services/...
```

## Conclusion

Your Go development environment is now containerized and managed through Portainer. Air provides instant hot-reload on code changes (Go compiles fast enough for this to feel snappy), Delve enables full debugging from VS Code or GoLand, and all supporting services are pre-configured. Portainer makes it easy to monitor logs, restart services, and view resource usage across your entire development stack.
