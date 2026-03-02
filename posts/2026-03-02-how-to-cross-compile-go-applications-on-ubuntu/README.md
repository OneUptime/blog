# How to Cross-Compile Go Applications on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Go, Golang, Cross-Compilation, DevOps

Description: Cross-compile Go applications on Ubuntu for multiple target platforms including Linux, macOS, Windows, and ARM architectures with practical build scripts.

---

Go's cross-compilation support is one of its standout features. From an Ubuntu build machine, you can produce binaries for Windows, macOS, ARM servers, Raspberry Pi, and more - without any additional toolchains or VMs. The entire process happens through standard Go environment variables.

## How Go Cross-Compilation Works

Go compiles everything to machine code for the target platform, including the standard library. There are no separate cross-compilers or sysroots needed for pure Go code. Two environment variables control the target:

- `GOOS` - Target operating system (linux, windows, darwin, freebsd, etc.)
- `GOARCH` - Target architecture (amd64, arm64, arm, 386, etc.)

```bash
# See all valid GOOS/GOARCH combinations
go tool dist list

# Partial output:
# android/amd64
# darwin/amd64
# darwin/arm64
# freebsd/amd64
# linux/386
# linux/amd64
# linux/arm
# linux/arm64
# windows/386
# windows/amd64
# windows/arm64
```

## Basic Cross-Compilation

```bash
# Current platform baseline
go env GOOS GOARCH

# Compile for Windows 64-bit from Ubuntu
GOOS=windows GOARCH=amd64 go build -o myapp.exe .

# Compile for macOS on Apple Silicon (M1/M2/M3)
GOOS=darwin GOARCH=arm64 go build -o myapp-darwin-arm64 .

# Compile for macOS on Intel
GOOS=darwin GOARCH=amd64 go build -o myapp-darwin-amd64 .

# Compile for Linux ARM 64-bit (AWS Graviton, Raspberry Pi 4 in 64-bit mode)
GOOS=linux GOARCH=arm64 go build -o myapp-linux-arm64 .

# Compile for Linux ARM 32-bit (older Raspberry Pi)
GOOS=linux GOARCH=arm GOARM=7 go build -o myapp-linux-armv7 .

# Compile for Linux 32-bit x86
GOOS=linux GOARCH=386 go build -o myapp-linux-386 .
```

## Build Script for Multiple Platforms

Create a script that builds for all your target platforms:

```bash
#!/bin/bash
# build-all.sh - Build for multiple platforms

set -euo pipefail

APP_NAME="myapp"
VERSION="${VERSION:-dev}"
BUILD_TIME=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
LDFLAGS="-s -w -X main.Version=${VERSION} -X main.BuildTime=${BUILD_TIME} -X main.GitCommit=${GIT_COMMIT}"
OUTPUT_DIR="dist"

# Platform list: OS/ARCH
PLATFORMS=(
    "linux/amd64"
    "linux/arm64"
    "linux/arm"
    "darwin/amd64"
    "darwin/arm64"
    "windows/amd64"
    "windows/arm64"
)

mkdir -p "$OUTPUT_DIR"

for platform in "${PLATFORMS[@]}"; do
    # Split platform into OS and ARCH
    IFS='/' read -r GOOS GOARCH <<< "$platform"

    # Determine the output filename
    output_name="${APP_NAME}-${GOOS}-${GOARCH}"
    if [ "$GOOS" = "windows" ]; then
        output_name="${output_name}.exe"
    fi

    echo "Building for ${GOOS}/${GOARCH}..."

    GOOS="$GOOS" GOARCH="$GOARCH" go build \
        -trimpath \
        -ldflags="$LDFLAGS" \
        -o "${OUTPUT_DIR}/${output_name}" \
        .

    echo "  -> ${OUTPUT_DIR}/${output_name}"
done

echo ""
echo "Build complete. Artifacts:"
ls -lh "$OUTPUT_DIR/"
```

```bash
chmod +x build-all.sh
VERSION=1.2.3 ./build-all.sh
```

## Creating Release Archives

Package binaries with checksums for distribution:

```bash
#!/bin/bash
# package-releases.sh - Package binaries for release

set -euo pipefail

APP_NAME="myapp"
VERSION="${1:-dev}"
DIST_DIR="dist"
RELEASE_DIR="releases/${VERSION}"

mkdir -p "$RELEASE_DIR"

cd "$DIST_DIR"

for binary in *; do
    # Determine archive format
    if [[ "$binary" == *".exe" ]]; then
        # Windows: use zip
        archive_name="${binary%.exe}-${VERSION}.zip"
        zip "../${RELEASE_DIR}/${archive_name}" "$binary"
    else
        # Unix: use tar.gz
        archive_name="${binary}-${VERSION}.tar.gz"
        tar -czf "../${RELEASE_DIR}/${archive_name}" "$binary"
    fi
    echo "Created: ${RELEASE_DIR}/${archive_name}"
done

cd ..

# Generate checksums
cd "$RELEASE_DIR"
sha256sum * > SHA256SUMS
echo ""
echo "Checksums:"
cat SHA256SUMS
```

## Cross-Compilation with CGO

Pure Go code cross-compiles without any extra setup. The complication arises when your code uses CGO (C extensions). CGO requires a C cross-compiler for the target platform.

Check if your code uses CGO:

```bash
# Does the binary use CGO?
CGO_ENABLED=1 go build -v . 2>&1 | grep -i cgo

# Or check deps
go list -f '{{.CgoFiles}}' ./...
```

### Cross-Compiling CGO Code

For Linux targets, install cross-compilers:

```bash
# Install cross-compilers for various architectures
sudo apt update
sudo apt install \
    gcc-aarch64-linux-gnu \    # ARM64 Linux
    gcc-arm-linux-gnueabihf \  # ARM 32-bit Linux (hard float)
    gcc-i686-linux-gnu         # 32-bit x86 Linux
```

Build with the appropriate C compiler:

```bash
# Cross-compile for ARM64 Linux with CGO
GOOS=linux \
GOARCH=arm64 \
CGO_ENABLED=1 \
CC=aarch64-linux-gnu-gcc \
go build -o myapp-linux-arm64 .

# Cross-compile for ARM 32-bit Linux
GOOS=linux \
GOARCH=arm \
GOARM=7 \
CGO_ENABLED=1 \
CC=arm-linux-gnueabihf-gcc \
go build -o myapp-linux-armv7 .
```

### Disabling CGO for Simpler Cross-Compilation

If possible, disable CGO to avoid the cross-compiler requirement:

```bash
# Disable CGO entirely - pure Go compilation
# Works as long as your code and all dependencies don't need C
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o myapp-linux-arm64 .
```

Some packages that use CGO have pure Go alternatives. For example:
- `github.com/mattn/go-sqlite3` (uses CGO) vs `modernc.org/sqlite` (pure Go)
- System calls via CGO vs `golang.org/x/sys` (pure Go)

## Using Docker for Cross-Compilation

For CGO-heavy projects where managing cross-compilers is painful, use the official Go Docker image:

```dockerfile
# Dockerfile.cross-build
FROM golang:1.22 AS builder

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Build for Linux ARM64
RUN GOOS=linux GOARCH=arm64 go build \
    -trimpath \
    -ldflags="-s -w" \
    -o /dist/myapp-linux-arm64 \
    .

# Build for Linux AMD64
RUN GOOS=linux GOARCH=amd64 go build \
    -trimpath \
    -ldflags="-s -w" \
    -o /dist/myapp-linux-amd64 \
    .
```

```bash
# Run the cross-compilation in Docker
docker build -f Dockerfile.cross-build --output dist/ .
```

## Cross-Compiling with Makefile

A Makefile that handles common cross-compilation scenarios:

```makefile
# Makefile

APP      := myapp
VERSION  := $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
LDFLAGS  := -trimpath -ldflags "-s -w -X main.Version=$(VERSION)"

.PHONY: all linux-amd64 linux-arm64 darwin windows clean

all: linux-amd64 linux-arm64 darwin windows

linux-amd64:
	GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build $(LDFLAGS) \
		-o dist/$(APP)-linux-amd64 .

linux-arm64:
	GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build $(LDFLAGS) \
		-o dist/$(APP)-linux-arm64 .

darwin:
	GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) \
		-o dist/$(APP)-darwin-amd64 .
	GOOS=darwin GOARCH=arm64 go build $(LDFLAGS) \
		-o dist/$(APP)-darwin-arm64 .

windows:
	GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build $(LDFLAGS) \
		-o dist/$(APP)-windows-amd64.exe .

clean:
	rm -rf dist/
```

## Verifying Cross-Compiled Binaries

```bash
# Check the target architecture of a compiled binary
file dist/myapp-linux-arm64
# dist/myapp-linux-arm64: ELF 64-bit LSB executable, ARM aarch64

file dist/myapp-linux-amd64
# dist/myapp-linux-amd64: ELF 64-bit LSB executable, x86-64

file dist/myapp-windows-amd64.exe
# dist/myapp-windows-amd64.exe: PE32+ executable (console) x86-64, for MS Windows

file dist/myapp-darwin-arm64
# dist/myapp-darwin-arm64: Mach-O 64-bit arm64 executable

# Check if Linux binaries are statically linked
ldd dist/myapp-linux-amd64
# For CGO_ENABLED=0: "not a dynamic executable"
```

## GitHub Actions CI for Multi-Platform Releases

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'

      - name: Build all platforms
        run: |
          VERSION="${GITHUB_REF_NAME}"
          export VERSION
          ./build-all.sh

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          files: dist/*
          generate_release_notes: true
```

Cross-compilation in Go is mature and reliable for pure Go code. The main caveat is CGO - if you can avoid it, cross-compilation is a single command. If you need CGO, Docker or platform-specific runners in CI are the most maintainable path.
