# How to Containerize a Fiber (Go) Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Fiber, Go, Golang, Containerization, Backend, DevOps, Microservices

Description: Learn how to containerize a Go Fiber web application with Docker using multi-stage builds and minimal scratch images

---

Fiber is a Go web framework inspired by Express.js, built on top of Fasthttp for extreme performance. It gives Go developers a familiar API while delivering throughput numbers that put most frameworks to shame. Docker and Go are a natural match because Go compiles to a single static binary, meaning your production container can be incredibly small. This guide walks through containerizing a Fiber application, from the first Dockerfile to production deployment with tiny container images.

## Prerequisites

You need:

- Go 1.21+
- Docker Engine 20.10+
- Basic Go knowledge

## Setting Up a Fiber Project

Create a new Go module and install Fiber:

```bash
mkdir my-fiber-app && cd my-fiber-app
go mod init my-fiber-app
go get github.com/gofiber/fiber/v2
```

Create the main application file:

```go
// main.go - Fiber application entry point
package main

import (
	"log"
	"os"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
)

func main() {
	app := fiber.New(fiber.Config{
		// Disable the startup banner in production
		DisableStartupMessage: os.Getenv("ENV") == "production",
	})

	// Register middleware
	app.Use(logger.New())
	app.Use(recover.New())

	// Routes
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"message": "Hello from Fiber!"})
	})

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	// Read port from environment or default to 3000
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}

	log.Fatal(app.Listen(":" + port))
}
```

Test it:

```bash
go run main.go
curl http://localhost:3000
```

## The Multi-Stage Dockerfile

Go's static binary compilation is the secret sauce for tiny Docker images. The build stage uses the full Go toolchain, and the production stage uses `scratch` or `alpine` with just the binary.

This Dockerfile produces a minimal production image:

```dockerfile
# Stage 1: Build the Go binary
FROM golang:1.22-alpine AS build

WORKDIR /app

# Copy go module files for dependency caching
COPY go.mod go.sum ./

# Download dependencies (cached unless go.mod or go.sum changes)
RUN go mod download

# Copy the source code
COPY . .

# Build a statically linked binary
# CGO_ENABLED=0 ensures no C library dependencies
# -ldflags="-s -w" strips debug info for a smaller binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server .

# Stage 2: Minimal production image
FROM scratch

# Copy the binary from the build stage
COPY --from=build /app/server /server

# Copy CA certificates for HTTPS requests
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

EXPOSE 3000

# Run the binary
ENTRYPOINT ["/server"]
```

## Understanding the Scratch Image

The `scratch` image is literally empty. It has no shell, no package manager, no system utilities. Your Go binary is the only thing in the container. This produces the smallest possible image and has the smallest attack surface.

However, `scratch` has trade-offs:
- You cannot `docker exec` into the container for debugging
- No shell means no `sh` or `bash`
- You need to include CA certificates manually for HTTPS

If you need debugging capabilities, use Alpine instead:

```dockerfile
# Alternative: Alpine-based production image
FROM alpine:3.19

# Install CA certificates
RUN apk --no-cache add ca-certificates

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /app/server /server

USER appuser

EXPOSE 3000
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
vendor/
```

## Building and Running

```bash
# Build the image
docker build -t my-fiber-app:latest .

# Run the container
docker run -d -p 3000:3000 --name fiber-app my-fiber-app:latest

# Check the image size
docker images my-fiber-app
```

A Fiber app on `scratch` typically weighs between 8-15MB. That is remarkably small compared to Node.js or Python containers.

## Docker Compose with PostgreSQL

Most web applications need a database. Here is a Compose setup with PostgreSQL.

```yaml
version: "3.8"

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - ENV=production
      - PORT=3000
      - DATABASE_URL=postgresql://fiber:secret@postgres:5432/fiberdb?sslmode=disable
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: fiber
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: fiberdb
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fiber"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

## Connecting to a Database

Fiber does not include a database layer, so you choose your own. GORM is a popular Go ORM.

Install GORM:

```bash
go get gorm.io/gorm
go get gorm.io/driver/postgres
```

Database connection code:

```go
// database/database.go - PostgreSQL connection with GORM
package database

import (
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect() {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = "host=localhost user=fiber password=secret dbname=fiberdb port=5432 sslmode=disable"
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	log.Println("Database connected successfully")
}
```

**Important note**: If you use `CGO_ENABLED=0` (needed for `scratch`), make sure your database driver does not require CGO. The `gorm.io/driver/postgres` driver uses `pgx` by default, which is pure Go and works fine without CGO.

## Graceful Shutdown

Handle termination signals properly so Fiber can finish processing requests:

```go
// main.go - Graceful shutdown
package main

import (
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/gofiber/fiber/v2"
)

func main() {
	app := fiber.New()

	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"message": "Hello!"})
	})

	// Start server in a goroutine
	go func() {
		if err := app.Listen(":3000"); err != nil {
			log.Fatal(err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	if err := app.Shutdown(); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}
	log.Println("Server exited cleanly")
}
```

## Development Workflow

For development with auto-reload, use Air:

```bash
go install github.com/air-verse/air@latest
```

Development Compose file:

```yaml
version: "3.8"

services:
  api-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - .:/app
    environment:
      - ENV=development

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: fiber
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: fiberdb
    ports:
      - "5432:5432"
```

Development Dockerfile:

```dockerfile
FROM golang:1.22-alpine

WORKDIR /app

# Install Air for hot reload
RUN go install github.com/air-verse/air@latest

COPY go.mod go.sum ./
RUN go mod download

COPY . .

EXPOSE 3000

# Use Air for automatic rebuilds on file changes
CMD ["air"]
```

## Conclusion

Go and Docker are a perfect pair. Fiber's compiled binary drops into a `scratch` or Alpine image, producing containers under 15MB. These images start in milliseconds and use minimal memory. The multi-stage build pattern separates the heavy Go toolchain from the lightweight production runtime. Add database connectivity through Docker Compose, handle graceful shutdown for clean container stops, and use Air for a smooth development experience. The result is a deployment pipeline that is fast, small, and reliable.
