# How to Use Podman for Go Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Podman, Go, Golang, Container, Development

Description: A practical guide to using Podman for Go development, covering module management, building binaries, web server development, testing, debugging, and producing minimal production images.

---

> Podman and Go are a natural pairing. Go can compile to static binaries, and Podman runs containers without a daemon. Together they produce lean, self-contained applications with minimal overhead.

Go already has excellent tooling for managing dependencies and cross-compiling binaries. But containerized development still offers real benefits: consistent build environments across teams, easy integration with databases and external services, and the ability to test against specific OS and architecture combinations. Podman is a particularly good fit because Go developers tend to value simplicity and minimal dependencies, and Podman delivers exactly that.

This guide covers practical Podman workflows for Go projects, from writing and testing code to building production-ready container images.

---

## Choosing a Go Base Image

The official Go images come in a few variants:

```bash
# Full image - Debian-based, includes gcc and common build tools

podman pull docker.io/library/golang:1.26

# Alpine image - smaller, musl-based
podman pull docker.io/library/golang:1.26-alpine
```

For development, the full `golang:1.26` image is easier to work with because some Go packages use cgo and need gcc. The Alpine variant is smaller but may require installing build tools for certain dependencies.

## Running Go Code in a Container

```bash
# Run a Go file directly
podman run --rm \
  -v $(pwd):/app:Z \
  -w /app \
  docker.io/library/golang:1.26 \
  go run main.go

# Start an interactive shell in a Go environment
podman run -it --rm \
  -v $(pwd):/app:Z \
  -w /app \
  docker.io/library/golang:1.26 \
  bash
```

## Setting Up a Go Project with Modules

Create a simple Go web server. First, initialize the module:

```bash
# Initialize the Go module inside a container
podman run --rm \
  -v $(pwd):/app:Z \
  -w /app \
  docker.io/library/golang:1.26 \
  go mod init github.com/yourname/myapp
```

Create `main.go`:

```go
// main.go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "os"
)

type Response struct {
    Message string `json:"message"`
    Host    string `json:"host"`
}

func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        hostname, _ := os.Hostname()
        resp := Response{
            Message: "Hello from Go inside Podman",
            Host:    hostname,
        }
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(resp)
    })

    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]string{"status": "healthy"})
    })

    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    log.Printf("Server starting on port %s", port)
    log.Fatal(http.ListenAndServe(":"+port, nil))
}
```

## Creating a Development Containerfile

```dockerfile
FROM docker.io/library/golang:1.26

# Install air for live reloading during development
RUN go install github.com/air-verse/air@latest

WORKDIR /app

# Copy go.mod first for dependency caching
COPY go.mod ./
RUN go mod download

# Copy source code
COPY . .

EXPOSE 8080

# Use air for hot reload in development
CMD ["air"]
```

You need an `.air.toml` configuration file in your project root:

```toml
# .air.toml - configuration for the air live reload tool
root = "."
tmp_dir = "tmp"

[build]
  cmd = "go build -o ./tmp/main ."
  entrypoint = ["./tmp/main"]
  delay = 1000
  exclude_dir = ["tmp", "vendor"]
  exclude_regex = ["_test\\.go"]
  include_ext = ["go", "tpl", "tmpl", "html"]

[log]
  time = false

[misc]
  clean_on_exit = true
```

Build and run:

```bash
# Build the development image
podman build -t go-dev .

# Run with source mounted for live reloading
podman run -it --rm \
  -v $(pwd):/app:Z \
  -p 8080:8080 \
  go-dev
```

When you save a `.go` file, `air` detects the change, recompiles, and restarts the server automatically.

## Caching Go Modules

Go modules are downloaded to `$GOPATH/pkg/mod`. Use a named volume to persist them across container restarts:

```bash
# Create a volume for the Go module cache
podman volume create go-mod-cache

# Run with the module cache mounted
podman run -it --rm \
  -v $(pwd):/app:Z \
  -v go-mod-cache:/go/pkg/mod \
  -w /app \
  -p 8080:8080 \
  docker.io/library/golang:1.26 \
  go run main.go
```

This prevents Go from re-downloading all dependencies every time you create a new container.

## Multi-Container Setup with a Database

Here is a `compose.yaml` for a Go API with PostgreSQL:

```yaml
services:
  app:
    build: .
    ports:
      - "8080:8080"
    volumes:
      - .:/app:Z
      - go-mod-cache:/go/pkg/mod
      - go-build-cache:/root/.cache/go-build
    environment:
      DATABASE_URL: postgres://gouser:gopass@db:5432/godb?sslmode=disable
    depends_on:
      - db

  db:
    image: docker.io/library/postgres:16-alpine
    environment:
      POSTGRES_USER: gouser
      POSTGRES_PASSWORD: gopass
      POSTGRES_DB: godb
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  go-mod-cache:
  go-build-cache:
  pgdata:
```

Notice the `go-build-cache` volume. Go caches compiled packages in `~/.cache/go-build`. Persisting this cache makes incremental rebuilds much faster.

```bash
# Start the stack
podman compose up -d

# View logs
podman compose logs -f app

# Run a command in the app container
podman compose exec app go test ./...
```

## Running Tests

```bash
# Run all tests
podman run --rm \
  -v $(pwd):/app:Z \
  -v go-mod-cache:/go/pkg/mod \
  -w /app \
  docker.io/library/golang:1.26 \
  go test ./... -v

# Run tests with race detection
podman run --rm \
  -v $(pwd):/app:Z \
  -v go-mod-cache:/go/pkg/mod \
  -w /app \
  docker.io/library/golang:1.26 \
  go test -race ./... -v

# Run tests with coverage
podman run --rm \
  -v $(pwd):/app:Z \
  -v go-mod-cache:/go/pkg/mod \
  -w /app \
  docker.io/library/golang:1.26 \
  sh -c 'go test ./... -coverprofile=coverage.out && go tool cover -func=coverage.out'

# Run benchmarks
podman run --rm \
  -v $(pwd):/app:Z \
  -v go-mod-cache:/go/pkg/mod \
  -w /app \
  docker.io/library/golang:1.26 \
  go test -bench=. -benchmem ./...
```

## Debugging Go in a Container

Use Delve, the Go debugger, for remote debugging:

```bash
# Run with Delve debugger
podman run -it --rm \
  -v $(pwd):/app:Z \
  -v go-mod-cache:/go/pkg/mod \
  -w /app \
  -p 8080:8080 \
  -p 2345:2345 \
  --security-opt=seccomp=unconfined \
  docker.io/library/golang:1.26 \
  bash -c "go install github.com/go-delve/delve/cmd/dlv@latest && dlv debug . --headless --listen=:2345 --accept-multiclient"
```

The `--security-opt=seccomp=unconfined` flag is needed because Delve uses ptrace, which is blocked by the default seccomp profile.

VS Code `launch.json` for attaching to the container:

```json
{
  "name": "Attach to Container",
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
```

## Cross-Compiling for Different Platforms

Go makes cross-compilation trivial, and doing it inside a container ensures consistent results:

```bash
# Build for Linux AMD64
podman run --rm \
  -v $(pwd):/app:Z \
  -w /app \
  -e GOOS=linux -e GOARCH=amd64 \
  docker.io/library/golang:1.26 \
  sh -c 'mkdir -p bin && go build -o bin/myapp-linux-amd64'

# Build for Linux ARM64
podman run --rm \
  -v $(pwd):/app:Z \
  -w /app \
  -e GOOS=linux -e GOARCH=arm64 \
  docker.io/library/golang:1.26 \
  sh -c 'mkdir -p bin && go build -o bin/myapp-linux-arm64'

# Build for macOS ARM64
podman run --rm \
  -v $(pwd):/app:Z \
  -w /app \
  -e GOOS=darwin -e GOARCH=arm64 \
  docker.io/library/golang:1.26 \
  sh -c 'mkdir -p bin && go build -o bin/myapp-darwin-arm64'
```

## Building a Minimal Production Image

With `CGO_ENABLED=0`, Go can compile to a single static binary, which means your production image can be incredibly small. The `scratch` image contains literally nothing: no shell, no libraries, no OS.

```dockerfile
# Stage 1: Build the binary
FROM docker.io/library/golang:1.26 AS builder
WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY . .

# Build a statically linked binary
RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-w -s" \
    -o /app/server .

# Stage 2: Create the minimal runtime image
FROM scratch

# Copy CA certificates for HTTPS requests
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy the binary
COPY --from=builder /app/server /server

EXPOSE 8080

ENTRYPOINT ["/server"]
```

Build and test:

```bash
# Build the production image
podman build -t my-go-app:prod -f Containerfile.prod .

# Check the image size (typically 10-20 MB)
podman images my-go-app:prod

# Run it
podman run --rm -p 8080:8080 my-go-app:prod
```

The `-ldflags="-w -s"` flags strip debug information and symbol tables from the binary, reducing its size. `CGO_ENABLED=0` ensures a fully static binary that does not depend on any shared libraries.

## Conclusion

Go and Podman complement each other well. Go's ability to produce static binaries makes for tiny production images, and Podman's daemonless design keeps the development workflow simple. The key practices are: cache Go modules and build artifacts in named volumes for fast iteration, use `air` for live reloading during development, and take advantage of multi-stage builds with `scratch` base images for production. The result is a development environment that is fast, reproducible, and produces deployment artifacts measured in megabytes rather than hundreds of megabytes.
