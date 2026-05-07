# How to Use Podman for Cross-Compilation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, Cross-Compilation, Multi-Architecture, DevOps

Description: Use Podman to cross-compile software for different CPU architectures using QEMU emulation, multi-platform builds, and cross-compilation toolchains.

---

> Podman makes cross-compilation accessible by letting you build software for ARM, RISC-V, and other architectures directly from your x86 development machine using QEMU emulation and multi-platform container builds.

Building software that runs on different CPU architectures has traditionally been painful. You either need physical hardware for each target architecture, complex cross-compilation toolchains, or remote build services. Podman simplifies this dramatically by integrating with QEMU user-mode emulation to run containers built for foreign architectures transparently. Combined with multi-platform build support, you can produce binaries for ARM64, s390x, ppc64le, and other architectures from a single x86 workstation.

---

## Setting Up QEMU Emulation

Before you can run containers for foreign architectures, you need to install QEMU user-mode emulation on your host:

On Fedora:

```bash
sudo dnf install qemu-user-static
```

On Ubuntu or Debian:

```bash
sudo apt-get install qemu-user-static
```

Register the QEMU binary formats with the kernel:

```bash
sudo podman run --rm --privileged \
  docker.io/multiarch/qemu-user-static --reset -p yes
```

Verify that emulation works:

```bash
podman run --rm --platform linux/arm64 alpine uname -m
# Should output: aarch64

podman run --rm --platform linux/s390x alpine uname -m
# Should output: s390x

```

## Basic Cross-Architecture Builds

Once QEMU is set up, you can build and run containers for any supported architecture:

```bash
# Build a Go application for ARM64
podman build --platform linux/arm64 -t myapp:arm64 .

# Build for multiple platforms at once using a manifest
podman build --platform linux/amd64,linux/arm64 --manifest myapp:multi .
```

A simple Containerfile that works across architectures:

```dockerfile
FROM golang:1.22

WORKDIR /src
COPY . .

RUN go build -o /app ./cmd/server

FROM alpine:3.19
COPY --from=0 /app /app
ENTRYPOINT ["/app"]
```

## Cross-Compiling Go Applications

Go has excellent built-in cross-compilation support. You can use Podman to create a consistent build environment:

```dockerfile
FROM golang:1.22 AS builder

WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN mkdir -p /output

# Build for all target platforms
RUN GOOS=linux GOARCH=amd64 go build -o /output/app-linux-amd64 ./cmd/server
RUN GOOS=linux GOARCH=arm64 go build -o /output/app-linux-arm64 ./cmd/server
RUN GOOS=darwin GOARCH=amd64 go build -o /output/app-darwin-amd64 ./cmd/server
RUN GOOS=darwin GOARCH=arm64 go build -o /output/app-darwin-arm64 ./cmd/server
RUN GOOS=windows GOARCH=amd64 go build -o /output/app-windows-amd64.exe ./cmd/server
```

Build and extract the artifacts:

```bash
podman build -t cross-builder -f Containerfile.cross .

# Copy artifacts out of the image
CONTAINER_ID=$(podman create cross-builder)
podman cp "$CONTAINER_ID:/output" ./dist
podman rm "$CONTAINER_ID"

ls -la dist/
```

## Cross-Compiling C/C++ with Toolchains

For C and C++ projects, set up cross-compilation toolchains inside a container:

```dockerfile
FROM ubuntu:24.04

# Install cross-compilation toolchains
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc-aarch64-linux-gnu \
    g++-aarch64-linux-gnu \
    gcc-arm-linux-gnueabihf \
    g++-arm-linux-gnueabihf \
    gcc-riscv64-linux-gnu \
    g++-riscv64-linux-gnu \
    cmake \
    ninja-build \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
ENTRYPOINT ["bash"]
```

Create CMake toolchain files for each target:

```cmake
# toolchain-aarch64.cmake
set(CMAKE_SYSTEM_NAME Linux)
set(CMAKE_SYSTEM_PROCESSOR aarch64)

set(CMAKE_C_COMPILER aarch64-linux-gnu-gcc)
set(CMAKE_CXX_COMPILER aarch64-linux-gnu-g++)

set(CMAKE_FIND_ROOT_PATH /usr/aarch64-linux-gnu)
set(CMAKE_FIND_ROOT_PATH_MODE_PROGRAM NEVER)
set(CMAKE_FIND_ROOT_PATH_MODE_LIBRARY ONLY)
set(CMAKE_FIND_ROOT_PATH_MODE_INCLUDE ONLY)
```

```bash
podman build -t cross-build-env .

podman run --rm \
  -v $(pwd):/build:Z \
  cross-build-env \
  -c "cmake -B build-arm64 -DCMAKE_TOOLCHAIN_FILE=toolchain-aarch64.cmake -G Ninja && ninja -C build-arm64"
```

## Cross-Compiling Rust Applications

Rust also supports cross-compilation with Podman:

```dockerfile
FROM rust:1.77

# Install cross-compilation targets
RUN rustup target add \
    aarch64-unknown-linux-gnu \
    armv7-unknown-linux-gnueabihf \
    x86_64-unknown-linux-musl

# Install linkers for cross-compilation
RUN apt-get update && apt-get install -y \
    gcc-aarch64-linux-gnu \
    gcc-arm-linux-gnueabihf \
    musl-tools \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
ENTRYPOINT ["bash"]
```

Configure Cargo for cross-compilation:

```toml
# .cargo/config.toml
[target.aarch64-unknown-linux-gnu]
linker = "aarch64-linux-gnu-gcc"

[target.armv7-unknown-linux-gnueabihf]
linker = "arm-linux-gnueabihf-gcc"
```

```bash
podman build -t rust-cross-env .

podman run --rm \
  -v $(pwd):/build:Z \
  -v cargo-cache:/usr/local/cargo/registry \
  rust-cross-env \
  -c "cargo build --release --target aarch64-unknown-linux-gnu"
```

## Multi-Platform Manifest Lists

Create a single image tag that works across multiple architectures using manifest lists:

```bash
# Build architecture-specific images
podman build --platform linux/amd64 -t myapp:amd64 .
podman build --platform linux/arm64 -t myapp:arm64 .

# Create a manifest list
podman manifest create myapp:latest

# Add the architecture-specific images
podman manifest add myapp:latest myapp:amd64
podman manifest add myapp:latest myapp:arm64

# Push the manifest list to a registry
podman manifest push myapp:latest docker://registry.example.com/myapp:latest
```

When someone pulls `myapp:latest`, they automatically get the image built for their architecture.

## Automated Cross-Compilation Script

A comprehensive build script that targets all platforms:

```bash
#!/bin/bash
# cross-build.sh

set -euo pipefail

APP_NAME="myapp"
VERSION="${1:-dev}"
PLATFORMS=("linux/amd64" "linux/arm64" "linux/arm/v7")

echo "Building $APP_NAME version $VERSION for ${#PLATFORMS[@]} platforms"

# Create manifest
if podman manifest exists "${APP_NAME}:${VERSION}"; then
  podman manifest rm "${APP_NAME}:${VERSION}"
fi
podman manifest create "${APP_NAME}:${VERSION}"

for platform in "${PLATFORMS[@]}"; do
    os=$(echo "$platform" | cut -d/ -f1)
    arch=$(echo "$platform" | cut -d/ -f2-)
    tag="${APP_NAME}:${VERSION}-${os}-${arch//\//-}"

    echo "Building for $platform..."
    podman build \
      --platform "$platform" \
      --build-arg VERSION="$VERSION" \
      -t "$tag" \
      .

    podman manifest add "${APP_NAME}:${VERSION}" "$tag"
    echo "  Built $tag"
done

echo "Manifest ${APP_NAME}:${VERSION} created with ${#PLATFORMS[@]} platforms"
podman manifest inspect "${APP_NAME}:${VERSION}"
```

## Testing Cross-Compiled Binaries

Verify that your cross-compiled binaries work correctly using QEMU emulation:

```bash
# Run the ARM64 image on an x86 machine
podman run --rm --platform linux/arm64 myapp:arm64

# Run integration tests against each architecture
for platform in linux/amd64 linux/arm64; do
    echo "Testing on $platform..."
    podman run --rm \
      --platform "$platform" \
      -v $(pwd)/tests:/tests:ro,Z \
      myapp:latest \
      /tests/run_integration_tests.sh
done
```

## CI/CD Integration for Multi-Platform Builds

```yaml
# .github/workflows/multi-platform.yml
name: Multi-Platform Build
on:
  push:
    tags: ['v*']

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up QEMU
        run: |
          sudo apt-get install -y qemu-user-static
          sudo podman run --rm --privileged \
            docker.io/multiarch/qemu-user-static --reset -p yes

      - name: Build multi-platform
        run: |
          for platform in linux/amd64 linux/arm64; do
            podman build --platform "$platform" \
              -t "myapp:${GITHUB_REF_NAME}-$(echo $platform | tr '/' '-')" .
          done
```

## Conclusion

Podman makes cross-compilation practical and accessible. Whether you are using language-native cross-compilation features like Go and Rust provide, traditional cross-compilation toolchains for C and C++, or QEMU emulation to run foreign-architecture containers directly, Podman gives you a consistent and reproducible workflow. Multi-platform manifest lists tie everything together by letting you publish a single image tag that works across all your target architectures. This approach eliminates the need for dedicated build hardware and brings true multi-architecture support to every developer workstation.
