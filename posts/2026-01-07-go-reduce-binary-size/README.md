# How to Profile and Reduce Go Binary Size

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Binary Size, Optimization, Docker, DevOps

Description: Reduce Go binary size using symbol stripping, ldflags, UPX compression, and dependency analysis for smaller container images.

---

Go produces statically linked binaries that contain the entire runtime, making deployment simple but often resulting in larger executable sizes. While a typical "Hello World" program in C might be a few kilobytes, the same in Go can easily exceed 1MB. This guide explores comprehensive techniques to profile and reduce Go binary sizes for production deployments.

## Why Binary Size Matters

Before diving into optimization techniques, understanding why binary size matters helps prioritize which optimizations are worth the effort.

### Container Image Size

In containerized environments, binary size directly impacts:

- **Pull times**: Larger images take longer to download from registries
- **Storage costs**: Cloud registries charge based on storage used
- **Cold start times**: Serverless platforms like AWS Lambda have size limits and slower cold starts with larger binaries
- **Network bandwidth**: In Kubernetes clusters, node scaling requires pulling images repeatedly

### Embedded Systems and IoT

For embedded applications, constraints are even more critical:

- **Flash storage**: Limited storage capacity on microcontrollers
- **Memory**: Smaller binaries often correlate with lower runtime memory usage
- **OTA updates**: Smaller binaries mean faster and cheaper over-the-air updates

### Edge Computing

Edge deployments benefit from smaller binaries through:

- **Faster deployment**: Updates propagate quickly across distributed edge nodes
- **Reduced bandwidth**: Important for deployments with limited connectivity
- **Lower resource requirements**: Edge devices often have constrained resources

## Understanding Go Binary Composition

Before optimizing, you need to understand what makes up a Go binary. Go binaries contain several components:

- **Runtime**: The Go runtime for garbage collection, goroutine scheduling, etc.
- **Debug information**: DWARF debugging symbols and metadata
- **Symbol table**: Function and variable names for debugging
- **Type information**: Reflection data for runtime type operations
- **Actual code**: Your application logic and imported packages

## Profiling Binary Size with go tool nm

The first step in optimization is understanding what consumes space in your binary.

### Basic Usage of go tool nm

The `nm` tool lists symbols in a Go binary, helping identify large components.

```bash
# Build a simple binary for analysis
go build -o myapp main.go

# List all symbols sorted by size (largest first)
go tool nm -size myapp | sort -t ' ' -k2 -rn | head -50
```

### Understanding Symbol Output

The output shows symbol address, size, type, and name:

```
 1048576 T runtime.(*mheap).alloc
  524288 T runtime.mallocgc
  262144 R runtime.typelink
```

Symbol types include:
- **T**: Text (code) segment
- **R**: Read-only data
- **D**: Data segment
- **B**: BSS (uninitialized data)

### Creating a Size Analysis Script

This script provides a comprehensive breakdown of binary size by package.

```bash
#!/bin/bash
# analyze-binary.sh - Analyze Go binary size by package

BINARY=$1

if [ -z "$BINARY" ]; then
    echo "Usage: $0 <binary>"
    exit 1
fi

echo "=== Binary Size Analysis ==="
echo "Total size: $(ls -lh $BINARY | awk '{print $5}')"
echo ""

echo "=== Top 20 Largest Symbols ==="
go tool nm -size $BINARY | sort -t ' ' -k2 -rn | head -20
echo ""

echo "=== Size by Package (estimated) ==="
go tool nm -size $BINARY | awk '{
    split($4, parts, ".");
    pkg = parts[1];
    size[$4] = $2;
    pkgsize[pkg] += $2;
}
END {
    for (p in pkgsize) {
        printf "%10d %s\n", pkgsize[p], p;
    }
}' | sort -rn | head -20
```

### Using go build with Size Debugging

Go provides built-in options to understand what gets included during compilation.

```bash
# Show what packages are being compiled
go build -v -o myapp main.go

# Show detailed build information including package sizes
go build -x -o myapp main.go 2>&1 | grep -E "^(#|compile)"
```

## Stripping Debug Symbols with ldflags

The quickest wins in binary size reduction come from stripping debug information.

### Understanding ldflags Options

The `-ldflags` option passes flags to the Go linker:

- `-s`: Omit the symbol table and debug information
- `-w`: Omit the DWARF symbol table

```bash
# Build with debug symbols stripped (most common approach)
go build -ldflags="-s -w" -o myapp main.go
```

### Comparing Build Sizes

Let's create a comparison script to measure the impact of different flags.

```go
// main.go - A sample application for testing binary sizes
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
    "os"
)

type Config struct {
    Port    string `json:"port"`
    Host    string `json:"host"`
    Debug   bool   `json:"debug"`
    Version string `json:"version"`
}

func main() {
    config := Config{
        Port:    os.Getenv("PORT"),
        Host:    os.Getenv("HOST"),
        Debug:   os.Getenv("DEBUG") == "true",
        Version: "1.0.0",
    }

    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        json.NewEncoder(w).Encode(config)
    })

    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
        fmt.Fprintf(w, "OK")
    })

    addr := fmt.Sprintf("%s:%s", config.Host, config.Port)
    fmt.Printf("Starting server on %s\n", addr)
    http.ListenAndServe(addr, nil)
}
```

```bash
#!/bin/bash
# compare-builds.sh - Compare binary sizes with different build options

echo "Building with different optimization levels..."

# Standard build
go build -o myapp-standard main.go
STANDARD_SIZE=$(ls -l myapp-standard | awk '{print $5}')

# With ldflags -s -w
go build -ldflags="-s -w" -o myapp-stripped main.go
STRIPPED_SIZE=$(ls -l myapp-stripped | awk '{print $5}')

# Calculate reduction percentage
REDUCTION=$(echo "scale=2; (1 - $STRIPPED_SIZE / $STANDARD_SIZE) * 100" | bc)

echo ""
echo "=== Build Comparison ==="
echo "Standard build:     $(ls -lh myapp-standard | awk '{print $5}')"
echo "Stripped (-s -w):   $(ls -lh myapp-stripped | awk '{print $5}')"
echo "Size reduction:     ${REDUCTION}%"

# Cleanup
rm -f myapp-standard myapp-stripped
```

### Additional ldflags for Size Reduction

You can combine multiple linker flags for additional optimization.

```bash
# Comprehensive ldflags for minimal binary size
go build -ldflags="-s -w -X main.version=1.0.0" -o myapp main.go

# Using trimpath to remove file system paths from the binary
go build -trimpath -ldflags="-s -w" -o myapp main.go
```

### Build Tags for Conditional Compilation

Use build tags to exclude unnecessary code from production builds.

```go
// debug.go - Only included in debug builds
//go:build debug

package main

import "log"

func debugLog(msg string) {
    log.Printf("[DEBUG] %s", msg)
}
```

```go
// debug_stub.go - Included when debug tag is not set
//go:build !debug

package main

func debugLog(msg string) {
    // No-op in production
}
```

```bash
# Build without debug code
go build -ldflags="-s -w" -o myapp main.go

# Build with debug code
go build -tags=debug -o myapp-debug main.go
```

## UPX Compression

UPX (Ultimate Packer for eXecutables) can significantly reduce binary size through compression.

### Installing UPX

```bash
# macOS
brew install upx

# Ubuntu/Debian
apt-get install upx

# Alpine Linux
apk add upx

# Using Go to install upx
# UPX is not a Go tool, must be installed via package manager
```

### Basic UPX Usage

```bash
# Build the stripped binary first
go build -ldflags="-s -w" -o myapp main.go

# Compress with UPX (default compression)
upx myapp

# Compress with maximum compression (slower but smaller)
upx --best myapp

# Compress with brute force optimization (slowest but smallest)
upx --brute myapp
```

### Compression Level Comparison

This script compares different UPX compression levels.

```bash
#!/bin/bash
# upx-compare.sh - Compare UPX compression levels

# Build the base binary
go build -ldflags="-s -w" -o myapp main.go
ORIGINAL_SIZE=$(ls -l myapp | awk '{print $5}')

echo "=== UPX Compression Comparison ==="
echo "Original (stripped): $(ls -lh myapp | awk '{print $5}')"

# Test different compression levels
for level in 1 5 9; do
    cp myapp "myapp-upx-$level"
    upx -$level "myapp-upx-$level" > /dev/null 2>&1
    SIZE=$(ls -l "myapp-upx-$level" | awk '{print $5}')
    REDUCTION=$(echo "scale=2; (1 - $SIZE / $ORIGINAL_SIZE) * 100" | bc)
    echo "UPX level $level:       $(ls -lh "myapp-upx-$level" | awk '{print $5}') (${REDUCTION}% smaller)"
done

# Test --best
cp myapp myapp-upx-best
upx --best myapp-upx-best > /dev/null 2>&1
SIZE=$(ls -l myapp-upx-best | awk '{print $5}')
REDUCTION=$(echo "scale=2; (1 - $SIZE / $ORIGINAL_SIZE) * 100" | bc)
echo "UPX --best:          $(ls -lh myapp-upx-best | awk '{print $5}') (${REDUCTION}% smaller)"

# Cleanup
rm -f myapp myapp-upx-*
```

### UPX Pros and Cons

Understanding the tradeoffs helps decide when UPX is appropriate.

**Pros:**
- Significant size reduction (often 50-70%)
- Self-extracting, no runtime dependency
- Works on multiple platforms

**Cons:**
- Slower startup time (decompression overhead)
- Increased memory usage during decompression
- Some antivirus software flags UPX-compressed binaries
- Debugging becomes more difficult
- Not compatible with all binary analysis tools

### When to Use UPX

```go
// upx-decision.go - Guide for when to use UPX
package main

/*
Use UPX when:
- Binary size is critical (embedded systems, bandwidth-limited deployments)
- Startup time is not critical (not serverless cold starts)
- Long-running processes that start infrequently
- Distribution where download size matters more than startup

Avoid UPX when:
- Serverless functions (Lambda, Cloud Functions)
- Containers that scale frequently
- Security-sensitive environments (antivirus concerns)
- When debugging production issues
- Short-lived processes that start frequently
*/
```

### UPX with Docker Multi-stage Builds

Combining UPX with Docker multi-stage builds for optimal container images.

```dockerfile
# Dockerfile - Multi-stage build with UPX compression
FROM golang:1.21-alpine AS builder

# Install UPX
RUN apk add --no-cache upx

WORKDIR /app

# Copy go mod files first for caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o myapp .

# Compress with UPX
RUN upx --best myapp

# Final minimal image
FROM scratch

# Copy the compressed binary
COPY --from=builder /app/myapp /myapp

# Copy CA certificates for HTTPS
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

ENTRYPOINT ["/myapp"]
```

## Dependency Analysis and Trimming

Large dependencies can significantly bloat binary size. Analyzing and trimming dependencies is crucial.

### Analyzing Module Dependencies

```bash
# List all direct dependencies
go list -m all

# Show module graph
go mod graph

# Find why a specific module is included
go mod why github.com/some/package

# Calculate the size impact of each dependency
go list -json ./... | jq -r '.Deps[]' | sort -u
```

### Visualizing Dependency Sizes

This tool helps visualize which packages contribute most to binary size.

```go
// analyze-deps.go - Analyze dependency impact on binary size
package main

import (
    "fmt"
    "os"
    "os/exec"
    "sort"
    "strings"
)

func main() {
    // Get list of all packages in the binary
    cmd := exec.Command("go", "list", "-f", "{{.ImportPath}}", "./...")
    output, err := cmd.Output()
    if err != nil {
        fmt.Fprintf(os.Stderr, "Error: %v\n", err)
        os.Exit(1)
    }

    packages := strings.Split(strings.TrimSpace(string(output)), "\n")

    fmt.Printf("Found %d packages\n", len(packages))
    fmt.Println("\nTo analyze each package's contribution:")
    fmt.Println("1. Build your binary with: go build -o myapp")
    fmt.Println("2. Run: go tool nm -size myapp | grep <package_name>")
}
```

### Replacing Heavy Dependencies

Common heavy dependencies and their lighter alternatives.

```go
// dependency-alternatives.go - Lighter alternatives to common packages
package main

/*
Heavy Dependency Alternatives:

1. JSON Parsing
   - encoding/json (stdlib) -> github.com/goccy/go-json (faster, similar size)
   - For simple cases, consider manual parsing

2. HTTP Routing
   - gorilla/mux -> net/http (stdlib)
   - gin-gonic/gin -> labstack/echo (lighter)
   - For simple APIs, stdlib is sufficient

3. Logging
   - sirupsen/logrus -> log/slog (Go 1.21+, stdlib)
   - uber-go/zap -> zerolog (lighter)

4. Configuration
   - spf13/viper -> knadh/koanf (lighter)
   - spf13/viper -> envconfig (for env-only config)

5. CLI
   - spf13/cobra -> urfave/cli (lighter)
   - spf13/cobra -> flag (stdlib, for simple CLIs)

6. Database
   - gorm.io/gorm -> database/sql + manual queries
   - For simple CRUD, raw SQL is smaller

7. HTTP Client
   - go-resty/resty -> net/http (stdlib)
   - stdlib http.Client is usually sufficient
*/

import (
    "log/slog"
    "net/http"
    "os"
)

func main() {
    // Using stdlib slog instead of logrus/zap
    logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
    logger.Info("Starting server")

    // Using stdlib http instead of gorilla/mux
    http.HandleFunc("/api/v1/health", func(w http.ResponseWriter, r *http.Request) {
        w.WriteHeader(http.StatusOK)
    })

    http.ListenAndServe(":8080", nil)
}
```

### Creating a Minimal HTTP Server

Demonstrating how stdlib can replace heavy frameworks.

```go
// minimal-server.go - Minimal HTTP server using only stdlib
package main

import (
    "context"
    "encoding/json"
    "log/slog"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

// Response represents a standard API response
type Response struct {
    Status  string      `json:"status"`
    Data    interface{} `json:"data,omitempty"`
    Error   string      `json:"error,omitempty"`
}

// Simple router using stdlib
type Router struct {
    mux    *http.ServeMux
    logger *slog.Logger
}

// NewRouter creates a new router instance
func NewRouter(logger *slog.Logger) *Router {
    return &Router{
        mux:    http.NewServeMux(),
        logger: logger,
    }
}

// HandleFunc registers a handler with logging middleware
func (r *Router) HandleFunc(pattern string, handler http.HandlerFunc) {
    r.mux.HandleFunc(pattern, func(w http.ResponseWriter, req *http.Request) {
        start := time.Now()
        handler(w, req)
        r.logger.Info("request",
            "method", req.Method,
            "path", req.URL.Path,
            "duration", time.Since(start),
        )
    })
}

// ServeHTTP implements http.Handler
func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
    r.mux.ServeHTTP(w, req)
}

// JSON helper to write JSON responses
func JSON(w http.ResponseWriter, status int, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(data)
}

func main() {
    logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
    router := NewRouter(logger)

    router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        JSON(w, http.StatusOK, Response{Status: "healthy"})
    })

    router.HandleFunc("/api/data", func(w http.ResponseWriter, r *http.Request) {
        JSON(w, http.StatusOK, Response{
            Status: "success",
            Data:   map[string]string{"message": "Hello, World!"},
        })
    })

    server := &http.Server{
        Addr:         ":8080",
        Handler:      router,
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 10 * time.Second,
    }

    // Graceful shutdown
    go func() {
        sigChan := make(chan os.Signal, 1)
        signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
        <-sigChan

        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()

        server.Shutdown(ctx)
    }()

    logger.Info("Starting server", "addr", ":8080")
    server.ListenAndServe()
}
```

### Using go mod tidy and vendor

Keep dependencies clean and controlled.

```bash
# Remove unused dependencies
go mod tidy

# Vendor dependencies for reproducible builds
go mod vendor

# Build using vendored dependencies
go build -mod=vendor -ldflags="-s -w" -o myapp main.go
```

## TinyGo for Extreme Size Reduction

TinyGo is an alternative Go compiler that produces much smaller binaries.

### Installing TinyGo

```bash
# macOS
brew tap tinygo-org/tools
brew install tinygo

# Ubuntu/Debian
wget https://github.com/tinygo-org/tinygo/releases/download/v0.30.0/tinygo_0.30.0_amd64.deb
sudo dpkg -i tinygo_0.30.0_amd64.deb

# Docker
docker pull tinygo/tinygo:0.30.0
```

### Building with TinyGo

```bash
# Build for native platform
tinygo build -o myapp-tiny main.go

# Build with size optimization
tinygo build -o myapp-tiny -opt=z main.go

# Build for WebAssembly
tinygo build -o myapp.wasm -target=wasm main.go
```

### TinyGo Limitations

Understanding TinyGo's limitations is crucial before adoption.

```go
// tinygo-limitations.go - What TinyGo doesn't support
package main

/*
TinyGo Limitations:

1. Reflection
   - Limited reflection support
   - encoding/json works but with limitations
   - Some reflection-heavy packages won't work

2. Goroutines
   - Supported but with different scheduler
   - Some edge cases may behave differently

3. CGO
   - Not supported on all targets
   - Different linking behavior

4. Standard Library
   - Most stdlib works, but not all
   - Some packages have reduced functionality

5. Third-party Packages
   - Many work, but not all
   - Heavy reflection users often fail
   - Test your specific dependencies

Packages that typically DON'T work:
- gorm
- most ORMs
- some serialization libraries
- heavy reflection-based frameworks

Packages that typically DO work:
- net/http (basic usage)
- encoding/json (with limitations)
- database/sql (basic drivers)
- most utility libraries
*/
```

### TinyGo Size Comparison

```bash
#!/bin/bash
# tinygo-compare.sh - Compare Go vs TinyGo binary sizes

# Simple Hello World for comparison
cat > hello.go << 'EOF'
package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}
EOF

echo "=== Hello World Comparison ==="

# Standard Go
go build -ldflags="-s -w" -o hello-go hello.go
echo "Go (stripped):    $(ls -lh hello-go | awk '{print $5}')"

# TinyGo
tinygo build -o hello-tinygo hello.go
echo "TinyGo:           $(ls -lh hello-tinygo | awk '{print $5}')"

# TinyGo with size optimization
tinygo build -opt=z -o hello-tinygo-opt hello.go
echo "TinyGo (opt=z):   $(ls -lh hello-tinygo-opt | awk '{print $5}')"

rm -f hello.go hello-go hello-tinygo hello-tinygo-opt
```

### TinyGo for WebAssembly

TinyGo excels at WebAssembly compilation with minimal sizes.

```go
// wasm-example.go - TinyGo WebAssembly example
package main

import "syscall/js"

func add(this js.Value, args []js.Value) interface{} {
    if len(args) != 2 {
        return "Error: expected 2 arguments"
    }
    return args[0].Float() + args[1].Float()
}

func main() {
    // Register function for JavaScript
    js.Global().Set("goAdd", js.FuncOf(add))

    // Keep the program running
    select {}
}
```

```bash
# Build for WebAssembly with TinyGo
tinygo build -o main.wasm -target=wasm -opt=z wasm-example.go

# Compare sizes
echo "TinyGo WASM: $(ls -lh main.wasm | awk '{print $5}')"

# Standard Go WASM would be much larger
GOOS=js GOARCH=wasm go build -o main-go.wasm wasm-example.go
echo "Go WASM: $(ls -lh main-go.wasm | awk '{print $5}')"
```

## Docker Image Size Impact

Binary size directly affects container image size. Here's how to minimize Docker images.

### Base Image Selection

Different base images have different size implications.

```dockerfile
# Size comparison of different base images
# ubuntu:22.04 - ~77MB
# debian:bookworm-slim - ~74MB
# alpine:3.18 - ~7MB
# distroless/static - ~2MB
# scratch - 0MB (just your binary)
```

### Multi-stage Build Pattern

The recommended pattern for minimal Go containers.

```dockerfile
# Dockerfile.optimized - Fully optimized Go container build
# Stage 1: Build environment
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git upx ca-certificates tzdata

# Create non-root user for final image
RUN adduser -D -g '' appuser

WORKDIR /build

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build with all optimizations
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -trimpath \
    -ldflags="-s -w -X main.version=${VERSION:-dev}" \
    -o app .

# Compress the binary
RUN upx --best --lzma app

# Stage 2: Minimal runtime
FROM scratch

# Import CA certificates for HTTPS
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Import timezone data
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo

# Import non-root user
COPY --from=builder /etc/passwd /etc/passwd

# Copy the binary
COPY --from=builder /build/app /app

# Use non-root user
USER appuser

# Expose port
EXPOSE 8080

ENTRYPOINT ["/app"]
```

### Comparing Image Sizes

Script to compare different Docker image optimization strategies.

```bash
#!/bin/bash
# docker-size-compare.sh - Compare Docker image sizes

APP_NAME="myapp"

echo "Building Docker images with different strategies..."

# Strategy 1: Naive approach (golang base)
cat > Dockerfile.naive << 'EOF'
FROM golang:1.21
WORKDIR /app
COPY . .
RUN go build -o app .
CMD ["./app"]
EOF
docker build -f Dockerfile.naive -t ${APP_NAME}:naive . > /dev/null 2>&1

# Strategy 2: Alpine with stripped binary
cat > Dockerfile.alpine << 'EOF'
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o app .

FROM alpine:3.18
COPY --from=builder /app/app /app
CMD ["/app"]
EOF
docker build -f Dockerfile.alpine -t ${APP_NAME}:alpine . > /dev/null 2>&1

# Strategy 3: Scratch with stripped binary
cat > Dockerfile.scratch << 'EOF'
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o app .

FROM scratch
COPY --from=builder /app/app /app
CMD ["/app"]
EOF
docker build -f Dockerfile.scratch -t ${APP_NAME}:scratch . > /dev/null 2>&1

# Strategy 4: Scratch with UPX compression
cat > Dockerfile.upx << 'EOF'
FROM golang:1.21-alpine AS builder
RUN apk add --no-cache upx
WORKDIR /app
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o app .
RUN upx --best app

FROM scratch
COPY --from=builder /app/app /app
CMD ["/app"]
EOF
docker build -f Dockerfile.upx -t ${APP_NAME}:upx . > /dev/null 2>&1

echo ""
echo "=== Docker Image Size Comparison ==="
echo "Naive (golang base):     $(docker images ${APP_NAME}:naive --format '{{.Size}}')"
echo "Alpine (stripped):       $(docker images ${APP_NAME}:alpine --format '{{.Size}}')"
echo "Scratch (stripped):      $(docker images ${APP_NAME}:scratch --format '{{.Size}}')"
echo "Scratch (UPX):           $(docker images ${APP_NAME}:upx --format '{{.Size}}')"

# Cleanup
rm -f Dockerfile.naive Dockerfile.alpine Dockerfile.scratch Dockerfile.upx
```

### Distroless Images

Google's distroless images provide a middle ground between scratch and alpine.

```dockerfile
# Dockerfile.distroless - Using Google's distroless images
FROM golang:1.21 AS builder

WORKDIR /app
COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build \
    -ldflags="-s -w" \
    -o app .

# Use distroless for a minimal but more complete runtime
FROM gcr.io/distroless/static-debian12

COPY --from=builder /app/app /app

USER nonroot:nonroot

ENTRYPOINT ["/app"]
```

### Docker Build Caching Strategies

Optimize build times while maintaining small images.

```dockerfile
# Dockerfile.cached - Optimized build caching
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Cache go modules (changes less frequently)
COPY go.mod go.sum ./
RUN go mod download

# Cache build dependencies
RUN go install github.com/some/codegen-tool@latest

# Copy source (changes frequently)
COPY . .

# Build with cached dependencies
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o app .

FROM scratch
COPY --from=builder /app/app /app
ENTRYPOINT ["/app"]
```

## Complete Optimization Pipeline

Bringing everything together into a comprehensive build pipeline.

### Makefile for Binary Optimization

```makefile
# Makefile - Complete binary optimization pipeline
.PHONY: all build build-prod build-tiny analyze clean docker

# Variables
BINARY_NAME=myapp
VERSION?=dev
LDFLAGS=-s -w -X main.version=$(VERSION)

# Default target
all: build

# Development build
build:
	go build -o $(BINARY_NAME) .

# Production build with all optimizations
build-prod:
	CGO_ENABLED=0 go build \
		-trimpath \
		-ldflags="$(LDFLAGS)" \
		-o $(BINARY_NAME) .
	@echo "Build complete: $$(ls -lh $(BINARY_NAME) | awk '{print $$5}')"

# Production build with UPX compression
build-prod-upx: build-prod
	upx --best $(BINARY_NAME)
	@echo "Compressed: $$(ls -lh $(BINARY_NAME) | awk '{print $$5}')"

# TinyGo build
build-tiny:
	tinygo build -o $(BINARY_NAME)-tiny -opt=z .
	@echo "TinyGo build: $$(ls -lh $(BINARY_NAME)-tiny | awk '{print $$5}')"

# Analyze binary size
analyze: build-prod
	@echo "=== Symbol Analysis ==="
	@go tool nm -size $(BINARY_NAME) | sort -t ' ' -k2 -rn | head -20
	@echo ""
	@echo "=== Size Summary ==="
	@ls -lh $(BINARY_NAME)

# Compare all build methods
compare:
	@echo "Building with different methods..."
	@go build -o $(BINARY_NAME)-std .
	@go build -ldflags="$(LDFLAGS)" -o $(BINARY_NAME)-stripped .
	@go build -ldflags="$(LDFLAGS)" -trimpath -o $(BINARY_NAME)-trimpath .
	@echo ""
	@echo "=== Size Comparison ==="
	@echo "Standard:   $$(ls -lh $(BINARY_NAME)-std | awk '{print $$5}')"
	@echo "Stripped:   $$(ls -lh $(BINARY_NAME)-stripped | awk '{print $$5}')"
	@echo "Trimpath:   $$(ls -lh $(BINARY_NAME)-trimpath | awk '{print $$5}')"
	@rm -f $(BINARY_NAME)-std $(BINARY_NAME)-stripped $(BINARY_NAME)-trimpath

# Build Docker image
docker:
	docker build -t $(BINARY_NAME):latest .
	@echo "Image size: $$(docker images $(BINARY_NAME):latest --format '{{.Size}}')"

# Clean build artifacts
clean:
	rm -f $(BINARY_NAME) $(BINARY_NAME)-*
	go clean
```

### CI/CD Pipeline Example

GitHub Actions workflow for optimized builds.

```yaml
# .github/workflows/build.yml - CI pipeline with size optimization
name: Build and Analyze

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'

      - name: Install UPX
        run: sudo apt-get install -y upx

      - name: Build Standard
        run: |
          go build -o myapp-std .
          echo "Standard: $(ls -lh myapp-std | awk '{print $5}')"

      - name: Build Optimized
        run: |
          CGO_ENABLED=0 go build \
            -trimpath \
            -ldflags="-s -w" \
            -o myapp-opt .
          echo "Optimized: $(ls -lh myapp-opt | awk '{print $5}')"

      - name: Build with UPX
        run: |
          cp myapp-opt myapp-upx
          upx --best myapp-upx
          echo "UPX: $(ls -lh myapp-upx | awk '{print $5}')"

      - name: Analyze Binary
        run: |
          echo "=== Top 20 Largest Symbols ==="
          go tool nm -size myapp-opt | sort -t ' ' -k2 -rn | head -20

      - name: Size Report
        run: |
          echo "## Binary Size Report" >> $GITHUB_STEP_SUMMARY
          echo "| Build Type | Size |" >> $GITHUB_STEP_SUMMARY
          echo "|------------|------|" >> $GITHUB_STEP_SUMMARY
          echo "| Standard | $(ls -lh myapp-std | awk '{print $5}') |" >> $GITHUB_STEP_SUMMARY
          echo "| Optimized | $(ls -lh myapp-opt | awk '{print $5}') |" >> $GITHUB_STEP_SUMMARY
          echo "| UPX | $(ls -lh myapp-upx | awk '{print $5}') |" >> $GITHUB_STEP_SUMMARY
```

## Summary and Best Practices

### Quick Reference Guide

```bash
# Quick wins (always use)
go build -ldflags="-s -w" -o app .

# More optimization
CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o app .

# Maximum compression (consider tradeoffs)
CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o app . && upx --best app

# For embedded/WASM
tinygo build -opt=z -o app .
```

### Decision Matrix

| Scenario | Recommended Approach |
|----------|---------------------|
| General production | `-ldflags="-s -w"` + scratch image |
| Size-critical | Add UPX compression |
| Serverless | `-ldflags="-s -w"` only (no UPX) |
| Embedded systems | TinyGo if compatible |
| WebAssembly | TinyGo with `-opt=z` |
| Development | Standard build |

### Key Takeaways

1. **Always strip debug symbols** with `-ldflags="-s -w"` for production
2. **Use scratch or distroless** base images for containers
3. **Analyze dependencies** and replace heavy ones with lighter alternatives
4. **Consider TinyGo** for embedded systems and WebAssembly
5. **Use UPX carefully** - weigh size savings against startup time
6. **Profile before optimizing** - use `go tool nm` to understand what's in your binary
7. **Automate size tracking** in CI/CD to catch binary bloat early

By applying these techniques systematically, you can often reduce Go binary sizes by 70-90%, significantly improving deployment efficiency and reducing infrastructure costs.
