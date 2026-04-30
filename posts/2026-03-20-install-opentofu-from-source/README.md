# How to Install OpenTofu from Source

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Source Build, Go, Installation, Infrastructure as Code, DevOps

Description: A comprehensive guide to building and installing OpenTofu from its source code on Linux and macOS.

## Introduction

Building OpenTofu from source gives you the ability to run the latest development builds, contribute to the project, or customize the binary for your specific needs. This guide covers building OpenTofu from source on Linux and macOS.

## Prerequisites

- Go 1.26.2 to build the current `main` branch, or the version declared in `go.mod` for the release you choose
- Git
- Make (optional, if you want to use the repository `make build` target)
- 4 GB RAM (for compilation)
- Linux or macOS

## Step 1: Install Go

```bash
# Install the Go version required by the branch or tag you plan to build.
# The current OpenTofu main branch uses Go 1.26.2.
# Choose the download and install commands for your platform.
GO_VERSION="1.26.2"

# Linux AMD64
curl -LO "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz"

# Install Go on Linux
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf "go${GO_VERSION}.linux-amd64.tar.gz"

# macOS Apple Silicon
# curl -LO "https://go.dev/dl/go${GO_VERSION}.darwin-arm64.pkg"
# sudo installer -pkg "go${GO_VERSION}.darwin-arm64.pkg" -target /

# macOS Intel
# curl -LO "https://go.dev/dl/go${GO_VERSION}.darwin-amd64.pkg"
# sudo installer -pkg "go${GO_VERSION}.darwin-amd64.pkg" -target /

# Add Go to PATH for the current shell if needed
export PATH=$PATH:/usr/local/go/bin

# Verify Go installation
go version
```

## Step 2: Clone the OpenTofu Repository

```bash
# Create a workspace directory
mkdir -p ~/go/src/github.com/opentofu
cd ~/go/src/github.com/opentofu

# Clone the OpenTofu repository
git clone https://github.com/opentofu/opentofu.git
cd opentofu
```

## Step 3: Checkout a Specific Version

```bash
# List available tags
git tag -l --sort=-version:refname | head -20

# Checkout a specific release (recommended)
git checkout v1.11.6

# Or stay on main for the latest development build
git checkout main
```

## Step 4: Build OpenTofu

```bash
# Navigate to the repository root
cd ~/go/src/github.com/opentofu/opentofu

# Build using Go directly (this produces a development build)
go build -o tofu ./cmd/tofu

# Or use Make if available
make build

# The binary will be at ./tofu
```

## Step 5: Install the Binary

```bash
# Move the binary to a directory in PATH
sudo mv tofu /usr/local/bin/
sudo chmod +x /usr/local/bin/tofu

# Verify the installation
tofu version

# A plain go build reports a -dev suffix on tagged releases.
# Use the release-style build below if you want the tagged version string.
```

## Building for Different Platforms (Cross-Compilation)

```bash
# Build for Linux AMD64
GOOS=linux GOARCH=amd64 go build -o tofu-linux-amd64 ./cmd/tofu

# Build for macOS ARM64 (Apple Silicon)
GOOS=darwin GOARCH=arm64 go build -o tofu-darwin-arm64 ./cmd/tofu

# Build for Windows AMD64
GOOS=windows GOARCH=amd64 go build -o tofu-windows-amd64.exe ./cmd/tofu
```

## Running Tests

```bash
# Run unit tests
go test ./...

# Run specific package tests
go test ./internal/command/...

# Run with verbose output
go test -v ./internal/configs/...
```

## Building a Release-Style Binary

```bash
# Build a release-style binary from a release tag
git checkout v1.11.6

go build \
  -ldflags "-X github.com/opentofu/opentofu/version.dev=no" \
  -o tofu \
  ./cmd/tofu

# Check version info
./tofu version
```

## Verifying the Build

```hcl
# test.tf
terraform {
  required_version = ">= 1.11.6"
}

output "source_build" {
  value = "OpenTofu built from source is working!"
}
```

```bash
tofu init
tofu apply -auto-approve
```

## Keeping Your Build Up to Date

```bash
# Switch to main to follow the latest development build
cd ~/go/src/github.com/opentofu/opentofu
git checkout main
git pull --ff-only origin main

# Or fetch tags and switch to a newer stable release
git fetch --tags
# git checkout v1.11.6

# Rebuild
go build -o tofu ./cmd/tofu
sudo mv tofu /usr/local/bin/
tofu version
```

## Conclusion

Building OpenTofu from source provides maximum control and flexibility. Whether you need the latest features before a release, want to contribute to the project, or need to customize the build for your environment, the source build process is straightforward for anyone familiar with Go. The official GitHub repository provides all the tools needed to build a production-ready binary.
