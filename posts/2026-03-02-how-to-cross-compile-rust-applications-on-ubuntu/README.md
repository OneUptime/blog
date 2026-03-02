# How to Cross-Compile Rust Applications on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Rust, Cross-Compilation, Development, DevOps

Description: Cross-compile Rust applications on Ubuntu for Linux, Windows, macOS, and ARM targets using rustup targets, cargo, and cross toolchains.

---

Rust cross-compilation is more involved than Go's, but `rustup` and the `cross` tool make it manageable. From an Ubuntu machine, you can produce Rust binaries for Windows, ARM Linux servers, macOS (to a degree), and embedded targets. This guide covers the full workflow.

## Prerequisites

Have Rust installed via `rustup`. If not:

```bash
# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Verify
rustc --version
cargo --version
rustup --version
```

## Understanding Rust Targets

Rust identifies targets by a "target triple" in the format `architecture-vendor-os-abi`. Examples:

- `x86_64-unknown-linux-gnu` - 64-bit Linux (glibc)
- `x86_64-unknown-linux-musl` - 64-bit Linux (musl libc, statically linked)
- `aarch64-unknown-linux-gnu` - ARM64 Linux
- `armv7-unknown-linux-gnueabihf` - ARMv7 Linux (Raspberry Pi 32-bit)
- `x86_64-pc-windows-gnu` - 64-bit Windows (via MinGW)
- `x86_64-apple-darwin` - 64-bit macOS (Intel)
- `aarch64-apple-darwin` - ARM64 macOS (Apple Silicon)

```bash
# List installed targets
rustup target list --installed

# List all available targets
rustup target list

# Check current default target
rustc -vV | grep host
```

## Adding Targets with rustup

```bash
# Add common targets
rustup target add x86_64-unknown-linux-musl      # Static Linux
rustup target add aarch64-unknown-linux-gnu       # ARM64 Linux
rustup target add armv7-unknown-linux-gnueabihf  # ARMv7 Linux
rustup target add x86_64-pc-windows-gnu          # Windows via MinGW
rustup target add aarch64-apple-darwin           # macOS ARM64
```

## Installing Cross-Compilers

Rust needs a C linker for each target. Install them with apt:

```bash
sudo apt update

# ARM64 Linux
sudo apt install gcc-aarch64-linux-gnu

# ARMv7 Linux
sudo apt install gcc-arm-linux-gnueabihf

# Windows (MinGW)
sudo apt install gcc-mingw-w64-x86-64

# musl (for static binaries - musl-gcc)
sudo apt install musl-tools
```

## Configuring the Linker

Tell Cargo which linker to use for each target. Create or edit `~/.cargo/config.toml`:

```toml
# ~/.cargo/config.toml

[target.aarch64-unknown-linux-gnu]
linker = "aarch64-linux-gnu-gcc"

[target.armv7-unknown-linux-gnueabihf]
linker = "arm-linux-gnueabihf-gcc"

[target.x86_64-pc-windows-gnu]
linker = "x86_64-w64-mingw32-gcc"
ar = "x86_64-w64-mingw32-ar"

[target.x86_64-unknown-linux-musl]
linker = "x86_64-linux-musl-gcc"
```

For project-specific configuration, put the same content in `.cargo/config.toml` inside your project directory.

## Building for Specific Targets

```bash
# Build for ARM64 Linux
cargo build --release --target aarch64-unknown-linux-gnu

# Build for ARMv7 Linux (Raspberry Pi)
cargo build --release --target armv7-unknown-linux-gnueabihf

# Build for Windows
cargo build --release --target x86_64-pc-windows-gnu

# Build for static Linux binary (musl)
cargo build --release --target x86_64-unknown-linux-musl
```

Output lands in `target/<target-triple>/release/`:

```bash
# Check the binary
file target/aarch64-unknown-linux-gnu/release/myapp
# target/aarch64-unknown-linux-gnu/release/myapp: ELF 64-bit LSB executable, ARM aarch64

file target/x86_64-pc-windows-gnu/release/myapp.exe
# target/x86_64-pc-windows-gnu/release/myapp.exe: PE32+ executable, x86-64
```

## Using `cross` for Easier Cross-Compilation

The `cross` tool provides Docker-based cross-compilation that handles linkers and system headers automatically. It's the easiest approach for complex targets:

```bash
# Install cross
cargo install cross --git https://github.com/cross-rs/cross

# Ensure Docker is running
sudo systemctl start docker
sudo usermod -aG docker $USER
newgrp docker

# Build with cross - same interface as cargo
cross build --release --target aarch64-unknown-linux-gnu
cross build --release --target armv7-unknown-linux-gnueabihf
cross build --release --target x86_64-unknown-linux-musl
```

`cross` automatically pulls the appropriate Docker image with the correct toolchain. No manual linker configuration needed.

## Building Static Linux Binaries with musl

For truly portable Linux binaries that run on any Linux distribution without glibc version compatibility issues:

```bash
# Install musl tools
sudo apt install musl-tools

# Add the musl target
rustup target add x86_64-unknown-linux-musl

# Configure linker (add to ~/.cargo/config.toml)
# [target.x86_64-unknown-linux-musl]
# linker = "musl-gcc"

# Build
cargo build --release --target x86_64-unknown-linux-musl

# Verify it's statically linked
ldd target/x86_64-unknown-linux-musl/release/myapp
# Not a dynamic executable
```

musl binaries run on any Linux regardless of the glibc version on the target - useful for deploying to systems with older glibc versions.

## Build Script for Multiple Targets

```bash
#!/bin/bash
# build-all.sh - Build Rust app for multiple targets

set -euo pipefail

APP_NAME="myapp"
VERSION="${VERSION:-$(cargo metadata --no-deps --format-version 1 | python3 -c "import sys,json; print(json.load(sys.stdin)['packages'][0]['version'])")}"
DIST_DIR="dist"

mkdir -p "$DIST_DIR"

declare -A TARGETS=(
    ["x86_64-unknown-linux-gnu"]="${APP_NAME}-linux-amd64"
    ["x86_64-unknown-linux-musl"]="${APP_NAME}-linux-amd64-musl"
    ["aarch64-unknown-linux-gnu"]="${APP_NAME}-linux-arm64"
    ["armv7-unknown-linux-gnueabihf"]="${APP_NAME}-linux-armv7"
    ["x86_64-pc-windows-gnu"]="${APP_NAME}-windows-amd64.exe"
)

for target in "${!TARGETS[@]}"; do
    output="${TARGETS[$target]}"
    echo "Building for ${target}..."

    if cross build --release --target "${target}" 2>/dev/null; then
        # Determine source binary name
        if [[ "$target" == *"windows"* ]]; then
            src="target/${target}/release/${APP_NAME}.exe"
        else
            src="target/${target}/release/${APP_NAME}"
        fi

        cp "$src" "${DIST_DIR}/${output}"
        echo "  -> ${DIST_DIR}/${output} ($(du -h "${DIST_DIR}/${output}" | cut -f1))"
    else
        echo "  FAILED for ${target}"
    fi
done

echo ""
echo "Artifacts:"
ls -lh "$DIST_DIR/"
```

## Handling Conditional Dependencies

Sometimes dependencies behave differently per target. Use Cargo's target-specific dependencies:

```toml
# Cargo.toml

[dependencies]
serde = { version = "1.0", features = ["derive"] }

# Only on Unix-like systems
[target.'cfg(unix)'.dependencies]
libc = "0.2"

# Only on Windows
[target.'cfg(windows)'.dependencies]
winapi = { version = "0.3", features = ["winsock2"] }

# Only for a specific target
[target.x86_64-unknown-linux-musl.dependencies]
openssl = { version = "0.10", features = ["vendored"] }
```

The `vendored` feature for openssl is important for musl targets - it compiles OpenSSL from source and links it statically instead of using the system library.

## macOS Targets from Ubuntu

Cross-compiling for macOS is more complex due to Apple's toolchain licensing. The `osxcross` project provides a way to build a macOS cross-toolchain:

```bash
# Install prerequisites
sudo apt install cmake libssl-dev lzma-dev libxml2-dev

# Clone osxcross
git clone https://github.com/tpoechtrager/osxcross ~/osxcross
cd ~/osxcross

# You need a macOS SDK tarball (get it from a Mac or from legal sources)
# Place MacOSX14.0.sdk.tar.xz in the tarballs/ directory

# Build the cross toolchain
UNATTENDED=1 ./build.sh

# Add to PATH
export PATH="$PATH:$HOME/osxcross/target/bin"
```

Then configure Cargo:

```toml
# ~/.cargo/config.toml
[target.x86_64-apple-darwin]
linker = "x86_64-apple-darwin21-clang"

[target.aarch64-apple-darwin]
linker = "aarch64-apple-darwin21-clang"
```

```bash
# Add Rust targets
rustup target add x86_64-apple-darwin
rustup target add aarch64-apple-darwin

# Build
CC=o64-clang cargo build --release --target x86_64-apple-darwin
```

In practice, building macOS binaries in CI is usually done by running macOS GitHub Actions runners rather than cross-compiling from Linux.

## GitHub Actions Multi-Platform Release

```yaml
# .github/workflows/release.yml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: ubuntu-latest
            target: x86_64-unknown-linux-gnu
            artifact: myapp-linux-amd64
          - os: ubuntu-latest
            target: x86_64-unknown-linux-musl
            artifact: myapp-linux-amd64-musl
          - os: ubuntu-latest
            target: aarch64-unknown-linux-gnu
            artifact: myapp-linux-arm64
          - os: ubuntu-latest
            target: x86_64-pc-windows-gnu
            artifact: myapp-windows-amd64.exe
          - os: macos-latest
            target: aarch64-apple-darwin
            artifact: myapp-darwin-arm64

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - name: Install cross (Linux only)
        if: matrix.os == 'ubuntu-latest'
        run: cargo install cross --git https://github.com/cross-rs/cross

      - name: Build (using cross on Linux)
        if: matrix.os == 'ubuntu-latest'
        run: cross build --release --target ${{ matrix.target }}

      - name: Build (native macOS)
        if: matrix.os == 'macos-latest'
        run: cargo build --release --target ${{ matrix.target }}

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.artifact }}
          path: target/${{ matrix.target }}/release/myapp*
```

Cross-compilation for Rust requires more setup than Go, but tools like `cross` reduce the friction significantly by managing toolchains through Docker. For CI pipelines, a combination of `cross` for Linux targets and native macOS runners for Apple platforms covers the common deployment scenarios.
