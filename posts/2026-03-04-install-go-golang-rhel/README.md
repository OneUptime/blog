# How to Install Go (Golang) on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Go, Golang, Development, Programming, Linux

Description: Install the Go programming language on RHEL using either the AppStream package or the official tarball for the latest version.

---

Go is a statically typed, compiled language well suited for systems programming, cloud services, and CLI tools. Here is how to install it on RHEL.

## Option 1: Install from AppStream

```bash
# Install Go from RHEL AppStream
sudo dnf install -y golang

# Check version
go version
```

## Option 2: Install the Latest Version from Official Tarball

```bash
# Download the latest Go release
GO_VERSION="1.22.1"
curl -LO "https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz"

# Remove any previous Go installation and extract
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf "go${GO_VERSION}.linux-amd64.tar.gz"

# Clean up
rm "go${GO_VERSION}.linux-amd64.tar.gz"
```

## Configure Environment

```bash
# Add Go to your PATH
cat >> ~/.bashrc << 'PROFILE'
export GOROOT=/usr/local/go
export GOPATH=$HOME/go
export PATH=$GOROOT/bin:$GOPATH/bin:$PATH
PROFILE

source ~/.bashrc

# Verify installation
go version
go env GOROOT GOPATH
```

## Write and Run a Go Program

```bash
# Create a project directory
mkdir -p ~/go/src/hello && cd ~/go/src/hello

# Initialize a Go module
go mod init hello
```

Create the main program:

```go
// main.go
package main

import (
    "fmt"
    "runtime"
)

func main() {
    fmt.Printf("Hello from Go %s on %s/%s\n",
        runtime.Version(), runtime.GOOS, runtime.GOARCH)
}
```

```bash
# Run the program
go run main.go

# Build a binary
go build -o hello main.go
./hello

# Install the binary to $GOPATH/bin
go install
```

## Common Go Commands

```bash
# Format code
go fmt ./...

# Run tests
go test ./...

# Download dependencies
go mod tidy

# Build for a different platform
GOOS=linux GOARCH=arm64 go build -o hello-arm64 main.go

# Check for issues
go vet ./...
```

## Set Up Go Tools

```bash
# Install commonly used Go tools
go install golang.org/x/tools/gopls@latest          # Language server
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest  # Linter
go install github.com/go-delve/delve/cmd/dlv@latest  # Debugger

# Verify tools are accessible
gopls version
golangci-lint --version
dlv version
```

## Update Go

```bash
# If installed from AppStream
sudo dnf update -y golang

# If installed from tarball, repeat the installation steps with the new version
```

Go compiles to static binaries by default, making it an excellent choice for building self-contained applications on RHEL.
