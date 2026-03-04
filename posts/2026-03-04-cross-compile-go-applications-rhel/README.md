# How to Cross-Compile Go Applications on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Go, Golang, Cross-Compilation, Development, Linux

Description: Use Go's built-in cross-compilation support on RHEL to build binaries for multiple operating systems and architectures from a single machine.

---

Go has excellent built-in support for cross-compilation. You can build binaries for Windows, macOS, ARM, and more directly from your RHEL workstation without any extra toolchains.

## Understanding GOOS and GOARCH

Go uses two environment variables for cross-compilation:
- `GOOS`: Target operating system (linux, darwin, windows, freebsd, etc.)
- `GOARCH`: Target architecture (amd64, arm64, arm, 386, etc.)

```bash
# List all supported platform combinations
go tool dist list
```

## Basic Cross-Compilation

```bash
# Create a sample application
mkdir -p ~/go/src/myapp && cd ~/go/src/myapp
go mod init myapp
```

```go
// main.go
package main

import (
    "fmt"
    "net/http"
    "runtime"
)

func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Running on %s/%s\n", runtime.GOOS, runtime.GOARCH)
    })
    fmt.Println("Server starting on :8080")
    http.ListenAndServe(":8080", nil)
}
```

```bash
# Build for Linux AMD64 (native)
GOOS=linux GOARCH=amd64 go build -o myapp-linux-amd64

# Build for Linux ARM64 (e.g., AWS Graviton, Raspberry Pi 4)
GOOS=linux GOARCH=arm64 go build -o myapp-linux-arm64

# Build for macOS AMD64
GOOS=darwin GOARCH=amd64 go build -o myapp-darwin-amd64

# Build for macOS ARM64 (Apple Silicon)
GOOS=darwin GOARCH=arm64 go build -o myapp-darwin-arm64

# Build for Windows AMD64
GOOS=windows GOARCH=amd64 go build -o myapp-windows-amd64.exe

# Verify the binaries
file myapp-*
```

## Build Script for Multiple Platforms

```bash
#!/bin/bash
# build-all.sh - Build for multiple platforms

APP_NAME="myapp"
VERSION="1.0.0"
OUTPUT_DIR="dist"

# Define target platforms
PLATFORMS=(
    "linux/amd64"
    "linux/arm64"
    "darwin/amd64"
    "darwin/arm64"
    "windows/amd64"
)

mkdir -p "$OUTPUT_DIR"

for PLATFORM in "${PLATFORMS[@]}"; do
    GOOS="${PLATFORM%/*}"
    GOARCH="${PLATFORM#*/}"
    OUTPUT="${OUTPUT_DIR}/${APP_NAME}-${VERSION}-${GOOS}-${GOARCH}"

    # Add .exe for Windows
    if [ "$GOOS" = "windows" ]; then
        OUTPUT="${OUTPUT}.exe"
    fi

    echo "Building for $GOOS/$GOARCH..."
    GOOS=$GOOS GOARCH=$GOARCH go build \
        -ldflags="-s -w -X main.version=${VERSION}" \
        -o "$OUTPUT" .
done

# List all built binaries
ls -lh "$OUTPUT_DIR"/
```

## Cross-Compilation with CGo

When your code uses CGo (C bindings), cross-compilation requires a cross-compiler:

```bash
# Disable CGo for pure Go cross-compilation
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o myapp-arm64

# If you need CGo for cross-compilation, install cross-compilers
sudo dnf install -y gcc-aarch64-linux-gnu
CC=aarch64-linux-gnu-gcc CGO_ENABLED=1 GOOS=linux GOARCH=arm64 go build -o myapp-arm64-cgo
```

## Build Flags for Production

```bash
# Strip debug info for smaller binaries
CGO_ENABLED=0 go build -ldflags="-s -w" -o myapp

# Inject version information at build time
go build -ldflags="-X main.version=1.0.0 -X main.buildDate=$(date -u +%Y-%m-%dT%H:%M:%SZ)" -o myapp
```

Go's cross-compilation makes it trivial to build and distribute applications for any platform from a single RHEL build server.
