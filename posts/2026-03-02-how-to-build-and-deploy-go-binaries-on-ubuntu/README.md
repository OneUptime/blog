# How to Build and Deploy Go Binaries on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Go, Golang, Deployment, DevOps

Description: Build optimized Go binaries on Ubuntu, strip debug symbols, create deployment packages, and set up systemd services for production Go applications.

---

One of Go's most compelling features for server deployments is that it compiles to a single, statically linked binary with no runtime dependencies. Deploying a Go application means copying one file and running it. This simplicity makes Go deployments reliable and reproducible, but there are still techniques for producing smaller binaries, managing deployments cleanly, and integrating with systemd.

## Basic Build

```bash
# The simplest build - creates a binary named after the directory
go build .

# Build with a specific output name
go build -o myapp .

# Build a specific package in a monorepo
go build -o bin/api-server ./cmd/api-server/

# Build all binaries in a monorepo
go build -o bin/ ./cmd/...
```

## Build for the Current Platform

```bash
# Check current platform
go env GOOS GOARCH

# Build for the current platform (default behavior)
go build -o myapp .

# Run immediately
./myapp
```

## Optimizing Binary Size

Default Go binaries include debug information and DWARF data. For production deployments, strip these to reduce size:

```bash
# Strip debug information and symbol table
# -s: omit symbol table and debug info
# -w: omit DWARF debug info
go build -ldflags="-s -w" -o myapp .

# Check the size difference
go build -o myapp-debug .
go build -ldflags="-s -w" -o myapp-stripped .
ls -lh myapp-debug myapp-stripped
```

Stripping typically reduces binary size by 30-40%. Stripped binaries can't be analyzed with debuggers or profilers, so keep the debug version around if you need post-mortem analysis.

## Embedding Version Information

Inject build metadata at compile time using ldflags:

```go
// main.go
package main

import (
    "fmt"
    "os"
)

// These variables are set at build time via ldflags
var (
    Version   = "dev"
    BuildTime = "unknown"
    GitCommit = "unknown"
)

func main() {
    if len(os.Args) > 1 && os.Args[1] == "version" {
        fmt.Printf("Version:    %s\n", Version)
        fmt.Printf("BuildTime:  %s\n", BuildTime)
        fmt.Printf("GitCommit:  %s\n", GitCommit)
        return
    }
    // ... rest of your application
}
```

Build with version information:

```bash
# Build with version metadata
VERSION="1.2.3"
BUILD_TIME=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

go build \
    -ldflags="-s -w \
        -X main.Version=${VERSION} \
        -X main.BuildTime=${BUILD_TIME} \
        -X main.GitCommit=${GIT_COMMIT}" \
    -o myapp .

# Verify
./myapp version
# Version:    1.2.3
# BuildTime:  2026-03-02T10:00:00Z
# GitCommit:  abc1234
```

## Reproducible Builds

Go supports reproducible builds when you control the environment:

```bash
# Trim filesystem paths from the binary (removes local paths from stack traces)
go build -trimpath -ldflags="-s -w" -o myapp .

# Use a specific Go version for reproducibility (in CI)
# Pin to an exact Go version in your CI configuration
```

## Creating a Build Script

For consistent builds, use a Makefile:

```makefile
# Makefile

APP_NAME    := myapp
VERSION     := $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
BUILD_TIME  := $(shell date -u '+%Y-%m-%dT%H:%M:%SZ')
GIT_COMMIT  := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
LDFLAGS     := -ldflags "-s -w \
    -X main.Version=$(VERSION) \
    -X main.BuildTime=$(BUILD_TIME) \
    -X main.GitCommit=$(GIT_COMMIT)"

.PHONY: build test clean install

build:
	go build $(LDFLAGS) -trimpath -o bin/$(APP_NAME) .

test:
	go test -race -coverprofile=coverage.out ./...

clean:
	rm -rf bin/ coverage.out

install: build
	sudo cp bin/$(APP_NAME) /usr/local/bin/$(APP_NAME)
```

```bash
# Build
make build

# Check the result
./bin/myapp version
```

## Setting Up a systemd Service

Create a service user and configure systemd for the Go binary:

```bash
# Create a dedicated user
sudo useradd --system --no-create-home --shell /bin/false myapp

# Create application directory
sudo mkdir -p /opt/myapp/{bin,config,logs}
sudo chown -R myapp:myapp /opt/myapp
```

Deploy the binary:

```bash
# Copy the binary
sudo cp bin/myapp /opt/myapp/bin/myapp
sudo chown myapp:myapp /opt/myapp/bin/myapp
sudo chmod 755 /opt/myapp/bin/myapp
```

Create the service unit:

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Go Application
After=network.target
Documentation=https://github.com/yourorg/myapp

[Service]
Type=simple
User=myapp
Group=myapp

# Application directory
WorkingDirectory=/opt/myapp

# The Go binary
ExecStart=/opt/myapp/bin/myapp \
    --config /opt/myapp/config/config.yaml \
    --port 8080

# Reload config on SIGHUP (if your app supports it)
ExecReload=/bin/kill -HUP $MAINPID

# Environment
Environment=APP_ENV=production
EnvironmentFile=/opt/myapp/config/env

# Restart policy
Restart=on-failure
RestartSec=5
StartLimitIntervalSec=30
StartLimitBurst=5

# Resource limits - Go programs can be memory-efficient
MemoryLimit=256M

# Security hardening
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/myapp/logs

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=myapp

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable myapp
sudo systemctl start myapp
sudo systemctl status myapp
```

## Zero-Downtime Deployment Script

```bash
#!/bin/bash
# deploy.sh - deploy a new Go binary with minimal downtime

set -euo pipefail

APP_NAME="myapp"
APP_DIR="/opt/myapp"
BINARY_PATH="${APP_DIR}/bin/${APP_NAME}"
NEW_BINARY="${1:-./bin/${APP_NAME}}"
SERVICE_NAME="${APP_NAME}.service"

if [ ! -f "$NEW_BINARY" ]; then
    echo "Error: binary not found at $NEW_BINARY"
    exit 1
fi

echo "Deploying $APP_NAME..."

# Copy new binary (atomic rename)
# Write to a temp file first, then rename
TMP_BINARY="${BINARY_PATH}.new"
sudo cp "$NEW_BINARY" "$TMP_BINARY"
sudo chown myapp:myapp "$TMP_BINARY"
sudo chmod 755 "$TMP_BINARY"

# Rename is atomic - the old binary remains in place until this point
sudo mv "$TMP_BINARY" "$BINARY_PATH"

echo "Binary deployed. Restarting service..."
sudo systemctl restart "$SERVICE_NAME"

# Wait and check
sleep 2
if sudo systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "Deployment successful - service is running"
    sudo systemctl status "$SERVICE_NAME" --no-pager
else
    echo "ERROR: Service failed to start"
    sudo journalctl -u "$SERVICE_NAME" --no-pager -n 20
    exit 1
fi
```

Usage:

```bash
# Build and deploy
make build
./deploy.sh ./bin/myapp
```

## Using Embedded Files

Go 1.16+ supports embedding static files directly in the binary:

```go
// main.go
package main

import (
    "embed"
    "net/http"
)

// Embed the entire static directory into the binary
//go:embed static/*
var staticFiles embed.FS

//go:embed config/defaults.yaml
var defaultConfig []byte

func main() {
    // Serve embedded static files
    http.Handle("/static/", http.FileServer(http.FS(staticFiles)))
    http.ListenAndServe(":8080", nil)
}
```

The resulting binary includes all static files - no separate deployment of web assets needed.

## Checking Binary Dependencies

Verify your binary is truly static (no external library dependencies):

```bash
# Check dynamic library dependencies
ldd ./myapp
# For a pure Go binary with CGO disabled:
# not a dynamic executable

# If you use CGO, it will list shared libraries
# For example, if using net package with CGO_ENABLED=1:
# linux-vdso.so.1
# libc.so.6
# libpthread.so.0
```

For truly static binaries when CGO is needed:

```bash
# Build with CGO disabled (works for pure Go code)
CGO_ENABLED=0 go build -o myapp .

# For CGO-dependent code, link statically against musl
# (This requires musl-gcc to be installed)
CC=musl-gcc go build -ldflags="-linkmode external -extldflags '-static'" -o myapp .
```

## Monitoring Go Application Health

Go applications can expose their own metrics. A minimal health endpoint:

```go
// Add to your HTTP server setup
http.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    fmt.Fprintf(w, `{"status": "ok", "version": "%s"}`, Version)
})
```

Check it from systemd's perspective with a `ExecStartPost` health check:

```ini
[Service]
ExecStart=/opt/myapp/bin/myapp
ExecStartPost=/bin/bash -c 'for i in $(seq 1 10); do curl -sf http://localhost:8080/healthz && exit 0; sleep 1; done; exit 1'
```

Go binaries' self-contained nature makes them ideal for server deployments - once built correctly with version metadata and deployed through a reproducible process, they behave consistently across environments.
