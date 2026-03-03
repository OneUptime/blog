# How to Install Go (Golang) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Go, Golang, Development, Programming

Description: Install Go on Ubuntu from official binaries, configure the workspace, set up environment variables, and verify the installation with a test program.

---

Go (often called Golang) is a statically typed, compiled language from Google. It's widely used for building servers, CLIs, and systems tools. The standard way to install Go on Ubuntu is from the official binary releases at golang.org - the Ubuntu package repositories tend to lag behind current releases significantly.

## Why Not Use apt to Install Go

Ubuntu's apt repositories include Go, but it's often several versions behind. Go has an active release cycle with security fixes, and running an outdated version can leave you without language features and security patches. Installing from official binaries takes a few extra steps but gives you current versions and makes updates straightforward.

```bash
# What apt provides (often outdated)
apt show golang | grep Version

# Compare with the current version at golang.org
```

## Downloading the Official Go Binary

Find the latest release at [go.dev/dl](https://go.dev/dl/). At the time of writing, Go 1.22 is current, but always check for the actual latest.

```bash
# Download the latest Go binary for Linux amd64
GO_VERSION="1.22.1"
wget https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz

# Verify the checksum against the hash on the download page
sha256sum go${GO_VERSION}.linux-amd64.tar.gz
```

## Installing Go

The standard installation directory is `/usr/local/go`:

```bash
# Remove any existing Go installation
sudo rm -rf /usr/local/go

# Extract the archive to /usr/local
sudo tar -C /usr/local -xzf go${GO_VERSION}.linux-amd64.tar.gz

# Verify the installation
/usr/local/go/bin/go version
```

## Configuring the Environment

Add Go's binary directory to your PATH. Edit `~/.bashrc` or `~/.profile`:

```bash
nano ~/.bashrc
```

Add these lines at the end:

```bash
# Go installation
export PATH="$PATH:/usr/local/go/bin"

# Go workspace (where your code and installed binaries live)
export GOPATH="$HOME/go"
export PATH="$PATH:$GOPATH/bin"
```

Apply the changes:

```bash
source ~/.bashrc
```

## Verifying the Installation

```bash
# Check Go version
go version
# go version go1.22.1 linux/amd64

# Check environment configuration
go env

# Verify key environment variables
go env GOROOT   # Should be /usr/local/go
go env GOPATH   # Should be $HOME/go
go env GOPROXY  # Module proxy configuration
```

## Writing and Running Your First Go Program

```bash
# Create a test directory
mkdir -p ~/gotest
cd ~/gotest

# Initialize a module
go mod init example.com/hello
```

```go
// main.go
package main

import (
    "fmt"
    "runtime"
)

func main() {
    fmt.Printf("Hello from Go %s\n", runtime.Version())
    fmt.Printf("OS: %s, Arch: %s\n", runtime.GOOS, runtime.GOARCH)
}
```

```bash
# Run directly
go run main.go

# Build a binary
go build -o hello .
./hello

# Clean up
rm hello
```

## Understanding Go's Directory Structure

After installation, Go uses a workspace model:

```text
/usr/local/go/          <- GOROOT: the Go installation
  bin/
    go                  <- The go command
    gofmt               <- Code formatter
  src/                  <- Go standard library source
  pkg/                  <- Compiled standard library packages

$HOME/go/               <- GOPATH: your workspace
  bin/                  <- Installed binaries go here (go install)
  pkg/                  <- Compiled package cache
  src/                  <- Legacy location for pre-modules code
```

Modern Go (1.11+) uses modules, so you no longer need to put your code inside `$GOPATH/src`. Put projects anywhere on your filesystem.

## Installing Go Tools

Common development tools are installed with `go install`:

```bash
# Language server (for editor integration)
go install golang.org/x/tools/gopls@latest

# Static analysis tool
go install honnef.co/go/tools/cmd/staticcheck@latest

# Code linter
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Test coverage visualizer
go install github.com/nikolaydubina/go-cover-treemap@latest

# Installed binaries land in $GOPATH/bin
ls $GOPATH/bin
```

## Updating Go

To update to a newer Go version, repeat the download and extract steps:

```bash
# Download new version
NEW_VERSION="1.22.2"
wget https://go.dev/dl/go${NEW_VERSION}.linux-amd64.tar.gz

# Remove old installation
sudo rm -rf /usr/local/go

# Install new version
sudo tar -C /usr/local -xzf go${NEW_VERSION}.linux-amd64.tar.gz

# Verify
go version
```

Your `GOPATH` and installed tools from `go install` are unaffected by Go version updates.

## System-Wide Installation for Multiple Users

For a multi-user server where all users should have Go available:

```bash
# Go is already installed to /usr/local/go (system-wide location)
# Make it available to all users via /etc/profile.d/

sudo nano /etc/profile.d/go.sh
```

```bash
#!/bin/bash
# /etc/profile.d/go.sh
export PATH="$PATH:/usr/local/go/bin"
```

```bash
sudo chmod +x /etc/profile.d/go.sh
```

Each user still has their own `GOPATH` at `$HOME/go` by default.

## Installing Go with the Snap Package

Snap offers an alternative that stays updated automatically:

```bash
# Install the latest stable Go snap
sudo snap install go --classic

# The --classic flag is required because Go needs full system access
go version
```

The snap version is typically current and updates automatically, but the `--classic` confinement means it has the same access as a manually installed binary. Either approach works fine.

## ARM and Other Architectures

For ARM-based Ubuntu servers (Raspberry Pi, AWS Graviton):

```bash
# ARM 64-bit (aarch64)
GO_VERSION="1.22.1"
wget https://go.dev/dl/go${GO_VERSION}.linux-arm64.tar.gz
sudo tar -C /usr/local -xzf go${GO_VERSION}.linux-arm64.tar.gz

# ARM 32-bit
wget https://go.dev/dl/go${GO_VERSION}.linux-armv6l.tar.gz
sudo tar -C /usr/local -xzf go${GO_VERSION}.linux-armv6l.tar.gz
```

## Troubleshooting

**`go: command not found` after installation** - The PATH change isn't active. Run `source ~/.bashrc` or open a new terminal.

**Wrong Go version running** - You may have an apt-installed version taking precedence. Check:

```bash
which go
# If it shows /usr/bin/go, that's the apt version

# Remove it if you want to use only the manually installed version
sudo apt remove golang golang-go
```

**Permission errors when installing tools** - The `$GOPATH/bin` directory must be writable by your user:

```bash
mkdir -p $HOME/go/bin
# GOPATH defaults to $HOME/go - this should already be user-owned
```

With Go installed from the official binaries, you have the current compiler, standard library, and toolchain. The language's stability guarantees mean upgrading to newer patch and minor versions is generally low-risk.
