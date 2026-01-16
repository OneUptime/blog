# How to Set Up a Go (Golang) Development Environment on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Go, Golang, Development, Programming, Tutorial

Description: Complete guide to setting up a Go development environment on Ubuntu.

---

Go (Golang) is a statically typed, compiled programming language designed at Google. Known for its simplicity, efficiency, and excellent support for concurrent programming, Go has become a popular choice for building web servers, microservices, CLI tools, and cloud-native applications. This comprehensive guide will walk you through setting up a complete Go development environment on Ubuntu.

## Prerequisites

Before we begin, ensure you have:
- Ubuntu 20.04 LTS or later (this guide works with Ubuntu 22.04 and 24.04)
- A user account with sudo privileges
- Terminal access
- Basic familiarity with the command line

## Installing Go (Official Method)

The recommended way to install Go is by downloading it directly from the official Go website. This ensures you get the latest stable version.

### Step 1: Remove Any Existing Go Installation

If you have a previous Go installation, remove it first:

```bash
# Remove existing Go installation (if any)
sudo rm -rf /usr/local/go
```

### Step 2: Download the Latest Go Version

Visit the [official Go downloads page](https://go.dev/dl/) to find the latest version. As of this writing, Go 1.22 is the latest stable release.

```bash
# Download Go (replace version number with the latest)
wget https://go.dev/dl/go1.22.0.linux-amd64.tar.gz

# Verify the download (optional but recommended)
# Check the SHA256 checksum on the downloads page
sha256sum go1.22.0.linux-amd64.tar.gz
```

### Step 3: Extract and Install Go

```bash
# Extract the archive to /usr/local
sudo tar -C /usr/local -xzf go1.22.0.linux-amd64.tar.gz

# Clean up the downloaded archive
rm go1.22.0.linux-amd64.tar.gz
```

### Step 4: Verify the Installation

```bash
# Check Go version
/usr/local/go/bin/go version
# Output: go version go1.22.0 linux/amd64
```

## Setting Up GOPATH and GOROOT

Understanding and configuring Go's environment variables is crucial for a proper setup.

### Understanding GOROOT and GOPATH

- **GOROOT**: The location where Go is installed (typically `/usr/local/go`)
- **GOPATH**: Your workspace directory where Go stores downloaded packages and compiled binaries

### Configuring Environment Variables

Add the following to your shell configuration file (`~/.bashrc` for Bash or `~/.zshrc` for Zsh):

```bash
# Open your shell configuration file
nano ~/.bashrc

# Add these lines at the end of the file:

# Go environment variables
export GOROOT=/usr/local/go
export GOPATH=$HOME/go
export PATH=$PATH:$GOROOT/bin:$GOPATH/bin

# Optional: Enable Go modules (default in Go 1.16+)
export GO111MODULE=on
```

Apply the changes:

```bash
# Reload shell configuration
source ~/.bashrc

# Verify the configuration
echo $GOROOT    # Should print: /usr/local/go
echo $GOPATH    # Should print: /home/yourusername/go
go version      # Should print the installed Go version
go env          # Display all Go environment variables
```

### Create the GOPATH Directory Structure

```bash
# Create the Go workspace directories
mkdir -p $GOPATH/{bin,src,pkg}

# bin/  - Contains compiled executable binaries
# src/  - Contains Go source files (legacy, less used with modules)
# pkg/  - Contains compiled package objects
```

## Understanding Go Modules

Go modules are the official dependency management system introduced in Go 1.11 and made the default in Go 1.16. They allow you to work outside of GOPATH and provide reproducible builds.

### Initializing a New Module

```bash
# Create a new project directory
mkdir -p ~/projects/myapp
cd ~/projects/myapp

# Initialize a new Go module
# The module path is typically your repository URL
go mod init github.com/yourusername/myapp

# This creates a go.mod file
cat go.mod
# Output:
# module github.com/yourusername/myapp
#
# go 1.22
```

### The go.mod File Explained

```go
// go.mod - Module definition file

module github.com/yourusername/myapp  // Module path (import path prefix)

go 1.22  // Minimum Go version required

require (
    github.com/gin-gonic/gin v1.9.1      // Direct dependency
    github.com/stretchr/testify v1.8.4   // Testing dependency
)

require (
    // Indirect dependencies (dependencies of your dependencies)
    github.com/go-playground/validator/v10 v10.14.0 // indirect
)
```

### Common Module Commands

```bash
# Add a dependency
go get github.com/gin-gonic/gin

# Add a specific version
go get github.com/gin-gonic/gin@v1.9.1

# Update all dependencies to latest minor/patch versions
go get -u ./...

# Update a specific dependency
go get -u github.com/gin-gonic/gin

# Remove unused dependencies
go mod tidy

# Download dependencies to local cache
go mod download

# Verify dependencies
go mod verify

# Show dependency graph
go mod graph

# Create a vendor directory with all dependencies
go mod vendor
```

### The go.sum File

The `go.sum` file contains cryptographic checksums of module versions:

```
github.com/gin-gonic/gin v1.9.1 h1:4+fr/el88TOO3ewCmQr8cx/CtZ/umlIRIs5M4NTNjf8=
github.com/gin-gonic/gin v1.9.1/go.mod h1:hPrL7YrpYKXt5YId3A/Tnip5kqbEAP+KLuI3SUcPTeU=
```

Always commit both `go.mod` and `go.sum` to version control.

## IDE Setup: VS Code with Go Extension

Visual Studio Code is an excellent free IDE for Go development with outstanding tooling support.

### Step 1: Install VS Code

```bash
# Method 1: Using snap (recommended)
sudo snap install code --classic

# Method 2: Using apt repository
# Import Microsoft GPG key
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -D -o root -g root -m 644 packages.microsoft.gpg /etc/apt/keyrings/packages.microsoft.gpg

# Add the repository
sudo sh -c 'echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/keyrings/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list'

# Install VS Code
sudo apt update
sudo apt install code
```

### Step 2: Install the Go Extension

1. Open VS Code
2. Press `Ctrl+Shift+X` to open Extensions
3. Search for "Go" by the Go Team at Google
4. Click Install

Alternatively, install from the command line:

```bash
code --install-extension golang.go
```

### Step 3: Install Go Tools

When you open a Go file for the first time, VS Code will prompt you to install additional tools. Click "Install All" or run:

```bash
# Install all Go tools used by VS Code
go install golang.org/x/tools/gopls@latest           # Language server
go install github.com/go-delve/delve/cmd/dlv@latest  # Debugger
go install honnef.co/go/tools/cmd/staticcheck@latest # Static analyzer
go install github.com/fatih/gomodifytags@latest      # Struct tag modifier
go install github.com/josharian/impl@latest          # Interface implementation generator
go install github.com/cweill/gotests/gotests@latest  # Test generator
go install github.com/haya14busa/goplay/cmd/goplay@latest # Go playground
```

### Step 4: Configure VS Code Settings

Create or edit `.vscode/settings.json` in your project:

```json
{
    // Go configuration
    "go.useLanguageServer": true,
    "go.lintTool": "staticcheck",
    "go.lintOnSave": "package",
    "go.formatTool": "goimports",
    "go.testOnSave": false,
    "go.coverOnSave": false,
    "go.vetOnSave": "package",

    // Editor settings for Go
    "[go]": {
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
            "source.organizeImports": "explicit"
        },
        "editor.snippetSuggestions": "none"
    },
    "[go.mod]": {
        "editor.formatOnSave": true,
        "editor.codeActionsOnSave": {
            "source.organizeImports": "explicit"
        }
    },

    // gopls settings
    "gopls": {
        "usePlaceholders": true,
        "staticcheck": true,
        "analyses": {
            "unusedparams": true,
            "shadow": true
        }
    }
}
```

## Go Project Structure

A well-organized project structure makes your code maintainable and follows Go conventions.

### Basic Project Structure

```
myapp/
├── go.mod              # Module definition
├── go.sum              # Dependency checksums
├── main.go             # Application entry point
├── README.md           # Project documentation
├── Makefile            # Build automation
├── .gitignore          # Git ignore file
│
├── cmd/                # Command-line applications
│   └── myapp/
│       └── main.go     # Main entry point for CLI
│
├── internal/           # Private application code (not importable)
│   ├── config/
│   │   └── config.go   # Configuration handling
│   ├── handlers/
│   │   └── handlers.go # HTTP handlers
│   └── database/
│       └── database.go # Database operations
│
├── pkg/                # Public library code (importable by external projects)
│   └── utils/
│       └── utils.go    # Utility functions
│
├── api/                # API definitions (OpenAPI/Swagger, Protocol Buffers)
│   └── openapi.yaml
│
├── web/                # Web assets (templates, static files)
│   ├── templates/
│   └── static/
│
├── scripts/            # Build, install, analysis scripts
│   └── build.sh
│
├── configs/            # Configuration files
│   └── config.yaml
│
├── test/               # Additional test data and integration tests
│   └── testdata/
│
└── docs/               # Documentation
    └── architecture.md
```

### Example: Simple Project Layout

Let's create a complete example project:

```bash
# Create project directory
mkdir -p ~/projects/gowebapp
cd ~/projects/gowebapp

# Initialize module
go mod init github.com/yourusername/gowebapp
```

Create the main application file:

```go
// main.go - Application entry point
package main

import (
    "fmt"
    "log"
    "net/http"
    "os"
    "time"
)

// Config holds application configuration
type Config struct {
    Port         string
    ReadTimeout  time.Duration
    WriteTimeout time.Duration
}

// loadConfig loads configuration from environment variables
func loadConfig() *Config {
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080" // Default port
    }

    return &Config{
        Port:         port,
        ReadTimeout:  15 * time.Second,
        WriteTimeout: 15 * time.Second,
    }
}

// helloHandler handles requests to the root endpoint
func helloHandler(w http.ResponseWriter, r *http.Request) {
    // Log the incoming request
    log.Printf("Received %s request from %s for %s", r.Method, r.RemoteAddr, r.URL.Path)

    // Set response headers
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)

    // Write response
    fmt.Fprintf(w, `{"message": "Hello, World!", "timestamp": "%s"}`, time.Now().Format(time.RFC3339))
}

// healthHandler provides a health check endpoint
func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    fmt.Fprint(w, `{"status": "healthy"}`)
}

func main() {
    // Load configuration
    config := loadConfig()

    // Create a new ServeMux (router)
    mux := http.NewServeMux()

    // Register handlers
    mux.HandleFunc("/", helloHandler)
    mux.HandleFunc("/health", healthHandler)

    // Create HTTP server with timeouts
    server := &http.Server{
        Addr:         ":" + config.Port,
        Handler:      mux,
        ReadTimeout:  config.ReadTimeout,
        WriteTimeout: config.WriteTimeout,
    }

    // Start the server
    log.Printf("Starting server on port %s...", config.Port)
    if err := server.ListenAndServe(); err != nil {
        log.Fatalf("Server failed to start: %v", err)
    }
}
```

## Building and Running Go Programs

Go provides simple and powerful build tools.

### Running Programs

```bash
# Run directly (compiles and executes in one step)
go run main.go

# Run with multiple files
go run .

# Run with arguments
go run main.go --config=config.yaml

# Run with environment variables
PORT=3000 go run main.go
```

### Building Programs

```bash
# Build the current package
go build

# Build with a specific output name
go build -o myapp

# Build with optimizations (strip debug info)
go build -ldflags="-s -w" -o myapp

# Build with version information embedded
VERSION=$(git describe --tags --always)
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
go build -ldflags="-X main.Version=$VERSION -X main.BuildTime=$BUILD_TIME" -o myapp

# Build all packages in the module
go build ./...

# Install the binary to $GOPATH/bin
go install
```

### Build Tags and Conditional Compilation

```go
// +build linux darwin
// +build !windows

// This file will only be compiled on Linux or macOS, but not Windows
package main
```

Or using the newer syntax (Go 1.17+):

```go
//go:build (linux || darwin) && !windows

package main
```

### Creating a Makefile

```makefile
# Makefile - Build automation for Go projects

# Variables
BINARY_NAME=myapp
VERSION=$(shell git describe --tags --always --dirty)
BUILD_TIME=$(shell date -u +"%Y-%m-%dT%H:%M:%SZ")
LDFLAGS=-ldflags "-s -w -X main.Version=$(VERSION) -X main.BuildTime=$(BUILD_TIME)"

# Default target
.PHONY: all
all: build

# Build the application
.PHONY: build
build:
	@echo "Building $(BINARY_NAME)..."
	go build $(LDFLAGS) -o bin/$(BINARY_NAME) .

# Run the application
.PHONY: run
run:
	go run .

# Run tests
.PHONY: test
test:
	go test -v -race -coverprofile=coverage.out ./...

# Show test coverage
.PHONY: coverage
coverage: test
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

# Run linter
.PHONY: lint
lint:
	staticcheck ./...
	go vet ./...

# Format code
.PHONY: fmt
fmt:
	gofmt -s -w .
	goimports -w .

# Clean build artifacts
.PHONY: clean
clean:
	rm -rf bin/
	rm -f coverage.out coverage.html

# Download dependencies
.PHONY: deps
deps:
	go mod download
	go mod tidy

# Build for multiple platforms
.PHONY: build-all
build-all:
	GOOS=linux GOARCH=amd64 go build $(LDFLAGS) -o bin/$(BINARY_NAME)-linux-amd64 .
	GOOS=darwin GOARCH=amd64 go build $(LDFLAGS) -o bin/$(BINARY_NAME)-darwin-amd64 .
	GOOS=darwin GOARCH=arm64 go build $(LDFLAGS) -o bin/$(BINARY_NAME)-darwin-arm64 .
	GOOS=windows GOARCH=amd64 go build $(LDFLAGS) -o bin/$(BINARY_NAME)-windows-amd64.exe .

# Help
.PHONY: help
help:
	@echo "Available targets:"
	@echo "  build      - Build the application"
	@echo "  run        - Run the application"
	@echo "  test       - Run tests with coverage"
	@echo "  coverage   - Generate coverage report"
	@echo "  lint       - Run linters"
	@echo "  fmt        - Format code"
	@echo "  clean      - Clean build artifacts"
	@echo "  deps       - Download and tidy dependencies"
	@echo "  build-all  - Build for all platforms"
```

## Testing in Go

Go has a built-in testing framework that's simple yet powerful.

### Writing Tests

Create a test file with the `_test.go` suffix:

```go
// calculator.go - A simple calculator package
package calculator

import "errors"

// Add returns the sum of two integers
func Add(a, b int) int {
    return a + b
}

// Subtract returns the difference of two integers
func Subtract(a, b int) int {
    return a - b
}

// Multiply returns the product of two integers
func Multiply(a, b int) int {
    return a * b
}

// Divide returns the quotient of two integers
// Returns an error if dividing by zero
func Divide(a, b int) (int, error) {
    if b == 0 {
        return 0, errors.New("division by zero")
    }
    return a / b, nil
}
```

```go
// calculator_test.go - Tests for the calculator package
package calculator

import (
    "testing"
)

// TestAdd tests the Add function
func TestAdd(t *testing.T) {
    // Simple test case
    result := Add(2, 3)
    expected := 5

    if result != expected {
        t.Errorf("Add(2, 3) = %d; want %d", result, expected)
    }
}

// TestAddTableDriven demonstrates table-driven tests
func TestAddTableDriven(t *testing.T) {
    // Define test cases as a slice of structs
    testCases := []struct {
        name     string // Test case name for clear error messages
        a, b     int    // Input values
        expected int    // Expected result
    }{
        {"positive numbers", 2, 3, 5},
        {"negative numbers", -2, -3, -5},
        {"mixed numbers", -2, 3, 1},
        {"with zero", 5, 0, 5},
        {"both zero", 0, 0, 0},
    }

    // Run each test case
    for _, tc := range testCases {
        t.Run(tc.name, func(t *testing.T) {
            result := Add(tc.a, tc.b)
            if result != tc.expected {
                t.Errorf("Add(%d, %d) = %d; want %d", tc.a, tc.b, result, tc.expected)
            }
        })
    }
}

// TestDivide tests the Divide function including error cases
func TestDivide(t *testing.T) {
    // Test successful division
    t.Run("successful division", func(t *testing.T) {
        result, err := Divide(10, 2)
        if err != nil {
            t.Fatalf("unexpected error: %v", err)
        }
        if result != 5 {
            t.Errorf("Divide(10, 2) = %d; want 5", result)
        }
    })

    // Test division by zero
    t.Run("division by zero", func(t *testing.T) {
        _, err := Divide(10, 0)
        if err == nil {
            t.Error("expected error for division by zero, got nil")
        }
    })
}

// TestSubtract tests the Subtract function
func TestSubtract(t *testing.T) {
    result := Subtract(5, 3)
    if result != 2 {
        t.Errorf("Subtract(5, 3) = %d; want 2", result)
    }
}

// TestMultiply tests the Multiply function
func TestMultiply(t *testing.T) {
    result := Multiply(4, 3)
    if result != 12 {
        t.Errorf("Multiply(4, 3) = %d; want 12", result)
    }
}
```

### Benchmark Tests

```go
// calculator_benchmark_test.go - Benchmark tests
package calculator

import "testing"

// BenchmarkAdd benchmarks the Add function
func BenchmarkAdd(b *testing.B) {
    // b.N is automatically adjusted by the testing framework
    for i := 0; i < b.N; i++ {
        Add(100, 200)
    }
}

// BenchmarkDivide benchmarks the Divide function
func BenchmarkDivide(b *testing.B) {
    for i := 0; i < b.N; i++ {
        Divide(100, 5)
    }
}

// BenchmarkAddParallel benchmarks Add in parallel
func BenchmarkAddParallel(b *testing.B) {
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            Add(100, 200)
        }
    })
}
```

### Running Tests

```bash
# Run all tests in the current package
go test

# Run tests with verbose output
go test -v

# Run tests in all packages
go test ./...

# Run specific test function
go test -run TestAdd

# Run tests matching a pattern
go test -run "TestAdd.*"

# Run tests with race detector
go test -race ./...

# Run tests with coverage
go test -cover ./...

# Generate coverage profile
go test -coverprofile=coverage.out ./...

# View coverage in browser
go tool cover -html=coverage.out

# Run benchmarks
go test -bench=. ./...

# Run benchmarks with memory allocation stats
go test -bench=. -benchmem ./...

# Run tests with timeout
go test -timeout 30s ./...

# Skip long-running tests
go test -short ./...
```

### Example Tests and Testable Examples

```go
// example_test.go - Example tests that appear in documentation
package calculator_test

import (
    "fmt"
    "github.com/yourusername/calculator"
)

// ExampleAdd demonstrates how to use the Add function
// The output comment is verified by go test
func ExampleAdd() {
    result := calculator.Add(2, 3)
    fmt.Println(result)
    // Output: 5
}

// ExampleDivide demonstrates division with error handling
func ExampleDivide() {
    result, err := calculator.Divide(10, 2)
    if err != nil {
        fmt.Println("Error:", err)
        return
    }
    fmt.Println(result)
    // Output: 5
}
```

## Debugging with Delve

Delve is the standard debugger for Go. It provides a powerful debugging experience for Go programs.

### Installing Delve

```bash
# Install Delve
go install github.com/go-delve/delve/cmd/dlv@latest

# Verify installation
dlv version
```

### Basic Debugging Commands

```bash
# Start debugging a program
dlv debug main.go

# Debug with arguments
dlv debug main.go -- --config=config.yaml

# Attach to a running process
dlv attach <pid>

# Debug a test
dlv test -- -test.run TestFunctionName

# Debug a compiled binary
dlv exec ./myapp
```

### Delve Commands Inside the Debugger

```
# Breakpoints
(dlv) break main.go:25                 # Set breakpoint at line 25
(dlv) break main.main                  # Set breakpoint at function
(dlv) breakpoints                      # List all breakpoints
(dlv) clear 1                          # Clear breakpoint 1
(dlv) clearall                         # Clear all breakpoints

# Execution control
(dlv) continue (or c)                  # Continue execution
(dlv) next (or n)                      # Step over
(dlv) step (or s)                      # Step into
(dlv) stepout (or so)                  # Step out of function
(dlv) restart (or r)                   # Restart program

# Inspection
(dlv) print myVar                      # Print variable value
(dlv) locals                           # Print all local variables
(dlv) args                             # Print function arguments
(dlv) whatis myVar                     # Print type of variable
(dlv) stack                            # Print stack trace
(dlv) goroutines                       # List all goroutines
(dlv) goroutine 1                      # Switch to goroutine 1

# Exit
(dlv) exit (or quit)                   # Exit debugger
```

### VS Code Debugging Configuration

Create `.vscode/launch.json`:

```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Launch Package",
            "type": "go",
            "request": "launch",
            "mode": "auto",
            "program": "${workspaceFolder}",
            "env": {
                "PORT": "8080"
            },
            "args": []
        },
        {
            "name": "Launch File",
            "type": "go",
            "request": "launch",
            "mode": "debug",
            "program": "${file}"
        },
        {
            "name": "Debug Test",
            "type": "go",
            "request": "launch",
            "mode": "test",
            "program": "${workspaceFolder}",
            "args": [
                "-test.v",
                "-test.run",
                "TestFunctionName"
            ]
        },
        {
            "name": "Attach to Process",
            "type": "go",
            "request": "attach",
            "mode": "local",
            "processId": 0
        }
    ]
}
```

### Debugging Example

```go
// debug_example.go - A program to practice debugging
package main

import "fmt"

func main() {
    numbers := []int{1, 2, 3, 4, 5}

    // Set a breakpoint here to inspect the slice
    sum := calculateSum(numbers)

    // Set a breakpoint here to see the result
    fmt.Printf("Sum: %d\n", sum)

    // Step into this function to debug
    doubled := doubleValues(numbers)
    fmt.Printf("Doubled: %v\n", doubled)
}

func calculateSum(nums []int) int {
    total := 0
    for _, n := range nums {
        // Inspect 'n' and 'total' at each iteration
        total += n
    }
    return total
}

func doubleValues(nums []int) []int {
    result := make([]int, len(nums))
    for i, n := range nums {
        result[i] = n * 2
    }
    return result
}
```

## Dependency Management

Go modules provide comprehensive dependency management.

### Adding Dependencies

```bash
# Add a dependency (automatically updates go.mod)
go get github.com/gin-gonic/gin

# Add a specific version
go get github.com/gin-gonic/gin@v1.9.1

# Add a specific commit
go get github.com/gin-gonic/gin@abc123

# Add a branch
go get github.com/gin-gonic/gin@master

# Add development tools (won't be included in your binary)
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
```

### Managing Dependencies

```bash
# Update all dependencies to latest compatible versions
go get -u ./...

# Update only patch versions (safer)
go get -u=patch ./...

# Update a specific dependency
go get -u github.com/gin-gonic/gin

# Remove unused dependencies from go.mod
go mod tidy

# Download all dependencies
go mod download

# Verify dependency integrity
go mod verify

# Print dependency graph
go mod graph

# Explain why a dependency is needed
go mod why github.com/some/dependency

# Create vendor directory
go mod vendor

# Build using vendor directory
go build -mod=vendor ./...
```

### Working with Private Repositories

```bash
# Configure Go to use SSH for private repos
git config --global url."git@github.com:".insteadOf "https://github.com/"

# Set GOPRIVATE for private modules
export GOPRIVATE=github.com/mycompany/*

# Or add to .bashrc
echo 'export GOPRIVATE=github.com/mycompany/*' >> ~/.bashrc
```

### Replacing Dependencies

Use `replace` directives in `go.mod` for local development or forks:

```go
// go.mod
module github.com/yourusername/myapp

go 1.22

require (
    github.com/gin-gonic/gin v1.9.1
)

// Replace with a local path during development
replace github.com/gin-gonic/gin => ../my-gin-fork

// Or replace with a different repository
replace github.com/original/repo => github.com/fork/repo v1.0.0
```

## Cross-Compilation

One of Go's powerful features is easy cross-compilation for different operating systems and architectures.

### Basic Cross-Compilation

```bash
# Compile for Linux (AMD64)
GOOS=linux GOARCH=amd64 go build -o myapp-linux-amd64 .

# Compile for Linux (ARM64 - e.g., Raspberry Pi 4, AWS Graviton)
GOOS=linux GOARCH=arm64 go build -o myapp-linux-arm64 .

# Compile for macOS (Intel)
GOOS=darwin GOARCH=amd64 go build -o myapp-darwin-amd64 .

# Compile for macOS (Apple Silicon)
GOOS=darwin GOARCH=arm64 go build -o myapp-darwin-arm64 .

# Compile for Windows
GOOS=windows GOARCH=amd64 go build -o myapp-windows-amd64.exe .

# Compile for FreeBSD
GOOS=freebsd GOARCH=amd64 go build -o myapp-freebsd-amd64 .
```

### List Supported Platforms

```bash
# List all supported OS/Architecture combinations
go tool dist list

# Common combinations:
# linux/amd64      - Standard Linux servers
# linux/arm64     - ARM servers (AWS Graviton, Raspberry Pi 4)
# linux/arm       - 32-bit ARM (older Raspberry Pi)
# darwin/amd64   - macOS Intel
# darwin/arm64   - macOS Apple Silicon
# windows/amd64  - Windows 64-bit
# windows/386     - Windows 32-bit
# freebsd/amd64  - FreeBSD
```

### Cross-Compilation Script

```bash
#!/bin/bash
# build-all.sh - Build for multiple platforms

APP_NAME="myapp"
VERSION=$(git describe --tags --always --dirty)
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
LDFLAGS="-s -w -X main.Version=$VERSION -X main.BuildTime=$BUILD_TIME"

# Create output directory
mkdir -p dist

# Platforms to build for
PLATFORMS=(
    "linux/amd64"
    "linux/arm64"
    "darwin/amd64"
    "darwin/arm64"
    "windows/amd64"
)

for PLATFORM in "${PLATFORMS[@]}"; do
    # Split platform into OS and ARCH
    GOOS="${PLATFORM%/*}"
    GOARCH="${PLATFORM#*/}"

    # Set output filename
    OUTPUT="dist/${APP_NAME}-${GOOS}-${GOARCH}"
    if [ "$GOOS" = "windows" ]; then
        OUTPUT="${OUTPUT}.exe"
    fi

    echo "Building for $GOOS/$GOARCH..."

    # Build
    GOOS=$GOOS GOARCH=$GOARCH go build -ldflags="$LDFLAGS" -o "$OUTPUT" .

    if [ $? -ne 0 ]; then
        echo "Failed to build for $GOOS/$GOARCH"
        exit 1
    fi
done

echo "Build complete! Binaries are in the dist/ directory."
ls -la dist/
```

### CGO and Cross-Compilation

By default, CGO is disabled during cross-compilation. If you need CGO:

```bash
# Cross-compile with CGO (requires cross-compiler toolchain)
CGO_ENABLED=1 CC=x86_64-linux-gnu-gcc GOOS=linux GOARCH=amd64 go build .

# For most projects, disabling CGO is recommended for easier cross-compilation
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build .
```

## Useful Go Tools

Go has a rich ecosystem of development tools.

### Code Formatting and Style

```bash
# gofmt - Standard Go formatter
gofmt -w .                    # Format all Go files in place
gofmt -d .                    # Show diff of formatting changes
gofmt -s -w .                 # Simplify code while formatting

# goimports - Formats code and manages imports
go install golang.org/x/tools/cmd/goimports@latest
goimports -w .                # Format and fix imports

# gofumpt - Stricter gofmt
go install mvdan.cc/gofumpt@latest
gofumpt -w .
```

### Static Analysis

```bash
# go vet - Built-in static analyzer
go vet ./...

# staticcheck - Advanced static analyzer
go install honnef.co/go/tools/cmd/staticcheck@latest
staticcheck ./...

# golangci-lint - Meta linter (runs multiple linters)
# Install
curl -sSfL https://raw.githubusercontent.com/golangci/golangci-lint/master/install.sh | sh -s -- -b $(go env GOPATH)/bin v1.55.2

# Or using go install
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest

# Run all linters
golangci-lint run

# Run with specific linters
golangci-lint run --enable=gofmt,govet,errcheck
```

### golangci-lint Configuration

Create `.golangci.yml` in your project root:

```yaml
# .golangci.yml - golangci-lint configuration
run:
  timeout: 5m
  tests: true

linters:
  enable:
    - gofmt
    - govet
    - errcheck
    - staticcheck
    - unused
    - gosimple
    - ineffassign
    - typecheck
    - gocritic
    - gocyclo
    - dupl
    - misspell
    - unparam
    - nakedret
    - prealloc

linters-settings:
  gocyclo:
    min-complexity: 15
  dupl:
    threshold: 100
  gocritic:
    enabled-tags:
      - diagnostic
      - style
      - performance
  misspell:
    locale: US

issues:
  exclude-rules:
    - path: _test\.go
      linters:
        - dupl
        - gocritic
```

### Documentation Tools

```bash
# godoc - Documentation server
go install golang.org/x/tools/cmd/godoc@latest
godoc -http=:6060           # Start doc server at http://localhost:6060

# pkgsite - Modern documentation server
go install golang.org/x/pkgsite/cmd/pkgsite@latest
pkgsite -http=:8080 .
```

### Other Useful Tools

```bash
# gomodifytags - Add/modify struct tags
go install github.com/fatih/gomodifytags@latest
gomodifytags -file myfile.go -struct MyStruct -add-tags json

# impl - Generate interface implementations
go install github.com/josharian/impl@latest
impl 'r *Repository' io.Reader

# gotests - Generate test boilerplate
go install github.com/cweill/gotests/gotests@latest
gotests -all -w myfile.go

# go-callvis - Visualize call graph
go install github.com/ofabry/go-callvis@latest
go-callvis -group pkg,type ./...

# govulncheck - Check for vulnerabilities
go install golang.org/x/vuln/cmd/govulncheck@latest
govulncheck ./...

# errcheck - Find unchecked errors
go install github.com/kisielk/errcheck@latest
errcheck ./...

# deadcode - Find unused code
go install golang.org/x/tools/cmd/deadcode@latest
deadcode ./...
```

### Complete Example: Setting Up a New Project

Here's a complete script to set up a new Go project with all best practices:

```bash
#!/bin/bash
# setup-go-project.sh - Set up a new Go project with best practices

PROJECT_NAME=$1
GITHUB_USER=$2

if [ -z "$PROJECT_NAME" ] || [ -z "$GITHUB_USER" ]; then
    echo "Usage: ./setup-go-project.sh <project-name> <github-username>"
    exit 1
fi

# Create project directory
mkdir -p "$PROJECT_NAME"
cd "$PROJECT_NAME"

# Initialize Git repository
git init

# Initialize Go module
go mod init "github.com/$GITHUB_USER/$PROJECT_NAME"

# Create directory structure
mkdir -p cmd/$PROJECT_NAME
mkdir -p internal/{config,handlers}
mkdir -p pkg
mkdir -p api
mkdir -p scripts
mkdir -p test/testdata

# Create main.go
cat > cmd/$PROJECT_NAME/main.go << 'EOF'
package main

import (
    "fmt"
    "os"
)

// Version is set during build time
var Version = "dev"

func main() {
    fmt.Printf("Starting %s version %s\n", os.Args[0], Version)
}
EOF

# Create .gitignore
cat > .gitignore << 'EOF'
# Binaries
*.exe
*.exe~
*.dll
*.so
*.dylib
bin/
dist/

# Test binary
*.test

# Output of go coverage
*.out
coverage.html

# Dependency directories
vendor/

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Environment files
.env
.env.local
EOF

# Create .golangci.yml
cat > .golangci.yml << 'EOF'
run:
  timeout: 5m

linters:
  enable:
    - gofmt
    - govet
    - errcheck
    - staticcheck
    - unused
    - gosimple
    - ineffassign
    - misspell
EOF

# Create Makefile
cat > Makefile << 'EOF'
BINARY_NAME=$(shell basename $(CURDIR))
VERSION=$(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")

.PHONY: build run test lint clean

build:
	go build -ldflags="-X main.Version=$(VERSION)" -o bin/$(BINARY_NAME) ./cmd/$(BINARY_NAME)

run:
	go run ./cmd/$(BINARY_NAME)

test:
	go test -v -race -coverprofile=coverage.out ./...

lint:
	golangci-lint run

clean:
	rm -rf bin/ coverage.out
EOF

# Create initial commit
git add .
git commit -m "Initial project setup"

echo "Project $PROJECT_NAME created successfully!"
echo "Next steps:"
echo "  cd $PROJECT_NAME"
echo "  make build"
echo "  make run"
```

## Complete Working Example

Here's a complete, production-ready example of a REST API server:

```go
// main.go - Complete REST API example
package main

import (
    "context"
    "encoding/json"
    "log"
    "net/http"
    "os"
    "os/signal"
    "sync"
    "syscall"
    "time"
)

// User represents a user in our system
type User struct {
    ID        string    `json:"id"`
    Name      string    `json:"name"`
    Email     string    `json:"email"`
    CreatedAt time.Time `json:"created_at"`
}

// UserStore provides thread-safe storage for users
type UserStore struct {
    mu    sync.RWMutex
    users map[string]User
}

// NewUserStore creates a new UserStore instance
func NewUserStore() *UserStore {
    return &UserStore{
        users: make(map[string]User),
    }
}

// Get retrieves a user by ID
func (s *UserStore) Get(id string) (User, bool) {
    s.mu.RLock()
    defer s.mu.RUnlock()
    user, ok := s.users[id]
    return user, ok
}

// GetAll retrieves all users
func (s *UserStore) GetAll() []User {
    s.mu.RLock()
    defer s.mu.RUnlock()

    users := make([]User, 0, len(s.users))
    for _, user := range s.users {
        users = append(users, user)
    }
    return users
}

// Create adds a new user
func (s *UserStore) Create(user User) {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.users[user.ID] = user
}

// Delete removes a user by ID
func (s *UserStore) Delete(id string) bool {
    s.mu.Lock()
    defer s.mu.Unlock()

    if _, ok := s.users[id]; !ok {
        return false
    }
    delete(s.users, id)
    return true
}

// Server holds the HTTP server and its dependencies
type Server struct {
    store  *UserStore
    server *http.Server
}

// NewServer creates a new Server instance
func NewServer(addr string, store *UserStore) *Server {
    s := &Server{
        store: store,
    }

    // Create router
    mux := http.NewServeMux()

    // Register routes
    mux.HandleFunc("GET /health", s.handleHealth)
    mux.HandleFunc("GET /users", s.handleGetUsers)
    mux.HandleFunc("GET /users/{id}", s.handleGetUser)
    mux.HandleFunc("POST /users", s.handleCreateUser)
    mux.HandleFunc("DELETE /users/{id}", s.handleDeleteUser)

    // Create HTTP server with timeouts
    s.server = &http.Server{
        Addr:         addr,
        Handler:      s.loggingMiddleware(mux),
        ReadTimeout:  15 * time.Second,
        WriteTimeout: 15 * time.Second,
        IdleTimeout:  60 * time.Second,
    }

    return s
}

// loggingMiddleware logs all incoming requests
func (s *Server) loggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()

        // Call the next handler
        next.ServeHTTP(w, r)

        // Log the request
        log.Printf(
            "%s %s %s %v",
            r.Method,
            r.URL.Path,
            r.RemoteAddr,
            time.Since(start),
        )
    })
}

// Start starts the HTTP server
func (s *Server) Start() error {
    log.Printf("Starting server on %s", s.server.Addr)
    return s.server.ListenAndServe()
}

// Shutdown gracefully shuts down the server
func (s *Server) Shutdown(ctx context.Context) error {
    return s.server.Shutdown(ctx)
}

// handleHealth returns the health status
func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
    s.respondJSON(w, http.StatusOK, map[string]string{
        "status": "healthy",
        "time":   time.Now().Format(time.RFC3339),
    })
}

// handleGetUsers returns all users
func (s *Server) handleGetUsers(w http.ResponseWriter, r *http.Request) {
    users := s.store.GetAll()
    s.respondJSON(w, http.StatusOK, users)
}

// handleGetUser returns a specific user
func (s *Server) handleGetUser(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")

    user, ok := s.store.Get(id)
    if !ok {
        s.respondError(w, http.StatusNotFound, "User not found")
        return
    }

    s.respondJSON(w, http.StatusOK, user)
}

// handleCreateUser creates a new user
func (s *Server) handleCreateUser(w http.ResponseWriter, r *http.Request) {
    var user User

    if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
        s.respondError(w, http.StatusBadRequest, "Invalid request body")
        return
    }

    // Validate required fields
    if user.ID == "" || user.Name == "" || user.Email == "" {
        s.respondError(w, http.StatusBadRequest, "Missing required fields: id, name, email")
        return
    }

    // Check if user already exists
    if _, exists := s.store.Get(user.ID); exists {
        s.respondError(w, http.StatusConflict, "User already exists")
        return
    }

    user.CreatedAt = time.Now()
    s.store.Create(user)

    s.respondJSON(w, http.StatusCreated, user)
}

// handleDeleteUser deletes a user
func (s *Server) handleDeleteUser(w http.ResponseWriter, r *http.Request) {
    id := r.PathValue("id")

    if !s.store.Delete(id) {
        s.respondError(w, http.StatusNotFound, "User not found")
        return
    }

    w.WriteHeader(http.StatusNoContent)
}

// respondJSON sends a JSON response
func (s *Server) respondJSON(w http.ResponseWriter, status int, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)

    if err := json.NewEncoder(w).Encode(data); err != nil {
        log.Printf("Error encoding response: %v", err)
    }
}

// respondError sends an error response
func (s *Server) respondError(w http.ResponseWriter, status int, message string) {
    s.respondJSON(w, status, map[string]string{"error": message})
}

func main() {
    // Get configuration from environment
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    // Create user store
    store := NewUserStore()

    // Add some sample data
    store.Create(User{
        ID:        "1",
        Name:      "John Doe",
        Email:     "john@example.com",
        CreatedAt: time.Now(),
    })

    // Create and start server
    server := NewServer(":"+port, store)

    // Channel for shutdown signals
    done := make(chan os.Signal, 1)
    signal.Notify(done, os.Interrupt, syscall.SIGTERM)

    // Start server in goroutine
    go func() {
        if err := server.Start(); err != http.ErrServerClosed {
            log.Fatalf("Server error: %v", err)
        }
    }()

    // Wait for shutdown signal
    <-done
    log.Println("Shutting down server...")

    // Create shutdown context with timeout
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    // Gracefully shutdown
    if err := server.Shutdown(ctx); err != nil {
        log.Fatalf("Server shutdown error: %v", err)
    }

    log.Println("Server stopped")
}
```

```go
// main_test.go - Tests for the REST API
package main

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
)

func TestHandleHealth(t *testing.T) {
    store := NewUserStore()
    server := NewServer(":8080", store)

    req := httptest.NewRequest(http.MethodGet, "/health", nil)
    rec := httptest.NewRecorder()

    server.handleHealth(rec, req)

    if rec.Code != http.StatusOK {
        t.Errorf("Expected status %d, got %d", http.StatusOK, rec.Code)
    }

    var response map[string]string
    if err := json.NewDecoder(rec.Body).Decode(&response); err != nil {
        t.Fatalf("Failed to decode response: %v", err)
    }

    if response["status"] != "healthy" {
        t.Errorf("Expected status 'healthy', got '%s'", response["status"])
    }
}

func TestHandleCreateAndGetUser(t *testing.T) {
    store := NewUserStore()
    server := NewServer(":8080", store)

    // Create user
    user := User{
        ID:    "test-1",
        Name:  "Test User",
        Email: "test@example.com",
    }

    body, _ := json.Marshal(user)
    req := httptest.NewRequest(http.MethodPost, "/users", bytes.NewReader(body))
    rec := httptest.NewRecorder()

    server.handleCreateUser(rec, req)

    if rec.Code != http.StatusCreated {
        t.Errorf("Expected status %d, got %d", http.StatusCreated, rec.Code)
    }

    // Get user
    req = httptest.NewRequest(http.MethodGet, "/users/test-1", nil)
    req.SetPathValue("id", "test-1")
    rec = httptest.NewRecorder()

    server.handleGetUser(rec, req)

    if rec.Code != http.StatusOK {
        t.Errorf("Expected status %d, got %d", http.StatusOK, rec.Code)
    }

    var retrievedUser User
    if err := json.NewDecoder(rec.Body).Decode(&retrievedUser); err != nil {
        t.Fatalf("Failed to decode response: %v", err)
    }

    if retrievedUser.Name != user.Name {
        t.Errorf("Expected name '%s', got '%s'", user.Name, retrievedUser.Name)
    }
}

func TestHandleGetUserNotFound(t *testing.T) {
    store := NewUserStore()
    server := NewServer(":8080", store)

    req := httptest.NewRequest(http.MethodGet, "/users/nonexistent", nil)
    req.SetPathValue("id", "nonexistent")
    rec := httptest.NewRecorder()

    server.handleGetUser(rec, req)

    if rec.Code != http.StatusNotFound {
        t.Errorf("Expected status %d, got %d", http.StatusNotFound, rec.Code)
    }
}

func BenchmarkHandleGetUsers(b *testing.B) {
    store := NewUserStore()

    // Add some users
    for i := 0; i < 100; i++ {
        store.Create(User{
            ID:    string(rune('a' + i)),
            Name:  "User",
            Email: "user@example.com",
        })
    }

    server := NewServer(":8080", store)

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        req := httptest.NewRequest(http.MethodGet, "/users", nil)
        rec := httptest.NewRecorder()
        server.handleGetUsers(rec, req)
    }
}
```

## Summary

You now have a complete Go development environment set up on Ubuntu. Here's a quick recap of what we covered:

1. **Installation**: Downloaded and installed Go from the official source
2. **Environment Variables**: Configured GOROOT, GOPATH, and PATH
3. **Go Modules**: Learned about dependency management with go.mod and go.sum
4. **IDE Setup**: Configured VS Code with the Go extension and essential tools
5. **Project Structure**: Understood best practices for organizing Go projects
6. **Building**: Learned various build commands and created a Makefile
7. **Testing**: Wrote unit tests, table-driven tests, and benchmarks
8. **Debugging**: Set up Delve and VS Code debugging configurations
9. **Dependencies**: Managed dependencies with go get and go mod
10. **Cross-Compilation**: Built binaries for multiple platforms
11. **Tools**: Explored essential Go development tools

With this setup, you're ready to build robust, efficient Go applications!

---

## Monitor Your Go Applications with OneUptime

Once you've built your Go applications and deployed them to production, monitoring becomes essential. **OneUptime** is a comprehensive open-source observability platform that helps you monitor your Go applications effectively.

With OneUptime, you can:

- **Uptime Monitoring**: Track the availability of your Go web services and APIs with checks from multiple global locations
- **Performance Monitoring**: Measure response times and identify slow endpoints in your Go applications
- **Log Management**: Centralize and analyze logs from your Go applications for easier debugging
- **Incident Management**: Get alerted immediately when issues occur and manage incident response efficiently
- **Status Pages**: Keep your users informed about service status with beautiful, customizable status pages
- **On-Call Scheduling**: Ensure the right team members are notified when critical issues arise

OneUptime integrates seamlessly with Go applications. You can use the OpenTelemetry SDK to send traces and metrics:

```go
// Example: Integrating OneUptime with your Go application
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace"
)

// Configure OpenTelemetry to send data to OneUptime
// Visit https://oneuptime.com for setup instructions
```

Start monitoring your Go applications today with OneUptime and ensure your services remain reliable and performant. Visit [https://oneuptime.com](https://oneuptime.com) to get started with free monitoring for your projects.
