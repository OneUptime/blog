# How to Set Up Go Workspace and GOPATH on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Go, Golang, Development, Workspace

Description: Configure the Go workspace and GOPATH on Ubuntu, understand the modern module system, and organize Go projects for efficient development.

---

The Go workspace and `GOPATH` are concepts that confuse many new Go developers, especially since the introduction of Go modules changed the workflow significantly. Understanding both the legacy `GOPATH`-based approach and the modern module approach helps you work effectively with Go on Ubuntu, especially when dealing with older codebases or tools that still expect the traditional layout.

## GOPATH: What It Is and What It Does

`GOPATH` is an environment variable pointing to a directory tree that Go uses for:

1. **Downloaded module cache** - `$GOPATH/pkg/mod/` stores cached module downloads
2. **Installed binaries** - `go install` puts executables in `$GOPATH/bin/`
3. **Legacy source code** - pre-modules projects lived in `$GOPATH/src/`

The default `GOPATH` is `$HOME/go`. You rarely need to change this.

```bash
# Check current GOPATH
go env GOPATH
# /home/youruser/go

# Check GOROOT (where Go itself is installed - don't change this)
go env GOROOT
# /usr/local/go
```

## The Go Workspace Directory Structure

```text
$HOME/go/                     <- GOPATH root
├── bin/                      <- Installed binaries (go install)
│   ├── gopls
│   ├── staticcheck
│   └── golangci-lint
├── pkg/
│   └── mod/                  <- Module cache
│       ├── github.com/
│       │   └── user/repo@v1.2.3/
│       └── golang.org/
└── src/                      <- Legacy; not used with modules
```

Add `$GOPATH/bin` to your PATH so installed binaries are accessible:

```bash
# Add to ~/.bashrc
export GOPATH="$HOME/go"
export PATH="$PATH:/usr/local/go/bin:$GOPATH/bin"
```

```bash
source ~/.bashrc
```

## Go Modules: The Modern Way

Since Go 1.11, the module system is the standard way to manage dependencies. With modules, your code can live anywhere on the filesystem - not just inside `$GOPATH/src`.

### Creating a New Module

```bash
# Create a project directory anywhere you like
mkdir -p ~/projects/myapp
cd ~/projects/myapp

# Initialize a Go module
# The module path should be the import path others use to import your code
# For public code: github.com/yourusername/myapp
# For private/local code: any unique path works
go mod init github.com/yourusername/myapp
```

This creates `go.mod`:

```text
module github.com/yourusername/myapp

go 1.22
```

### Project Structure

A typical Go project:

```text
myapp/
├── go.mod              <- Module definition and dependencies
├── go.sum              <- Checksums for dependency verification
├── main.go             <- Entry point (for executables)
├── internal/           <- Internal packages (not importable externally)
│   └── config/
│       └── config.go
├── pkg/                <- Exported packages (importable by others)
│   └── api/
│       └── api.go
└── cmd/                <- Multiple command binaries
    ├── server/
    │   └── main.go
    └── migrate/
        └── main.go
```

### Adding Dependencies

```bash
# Add a dependency
go get github.com/gin-gonic/gin@v1.9.1

# Add a specific version
go get golang.org/x/crypto@v0.20.0

# Update a dependency to latest
go get github.com/gin-gonic/gin@latest

# Update all dependencies to their latest patch versions
go get -u ./...

# Remove unused dependencies and tidy go.mod
go mod tidy
```

After `go get`, the `go.mod` is updated:

```text
module github.com/yourusername/myapp

go 1.22

require (
    github.com/gin-gonic/gin v1.9.1
    golang.org/x/crypto v0.20.0
)
```

## Multi-Module Workspaces (Go 1.18+)

When working on multiple related modules simultaneously (a library and an app that uses it), Go workspaces let you use local versions of modules without replacing directives in go.mod:

```bash
# Project layout
~/projects/
├── mylib/        <- A library module
│   ├── go.mod
│   └── lib.go
└── myapp/        <- An application that uses mylib
    ├── go.mod
    └── main.go

# Create a workspace directory
mkdir -p ~/projects/workspace
cd ~/projects/workspace

# Initialize the workspace
go work init

# Add modules to the workspace
go work use ~/projects/mylib
go work use ~/projects/myapp
```

This creates a `go.work` file:

```text
go 1.22

use (
    ../mylib
    ../myapp
)
```

Now when you build `myapp`, Go uses the local `mylib` source instead of the published version. Changes to `mylib` are immediately reflected without publishing.

## Configuring Module Proxy Settings

Go downloads modules through a proxy by default. Configure this:

```bash
# Check current proxy settings
go env GOPROXY
# https://proxy.golang.org,direct

# Use direct download (no proxy) - useful in air-gapped environments
go env -w GOPROXY=direct

# Use a corporate proxy
go env -w GOPROXY=https://goproxy.corp.internal,direct

# Bypass the proxy for internal modules
go env -w GOPRIVATE=gitlab.corp.internal,github.com/yourorg
```

Settings from `go env -w` are stored in `$(go env GOENV)`, which is `$HOME/.config/go/env` on Linux.

## Vendoring Dependencies

For reproducible builds without network access, vendor your dependencies:

```bash
# Download all dependencies to vendor/ directory
go mod vendor

# Build using the vendored directory
go build -mod=vendor ./...

# Verify the vendor directory is consistent with go.mod
go mod verify
```

The `vendor/` directory contains copies of all dependencies and can be committed to version control.

## Configuring a Private Module Registry

For organizations running their own module proxy (like Athens or JFrog Artifactory):

```bash
# Set up private proxy with fallback to public proxy
go env -w GOPROXY="https://athens.corp.internal,https://proxy.golang.org,direct"

# Specify which paths are private (bypass public proxy)
go env -w GOPRIVATE="gitlab.corp.internal,github.com/corp-org"

# Disable sum checking for private modules
go env -w GONOSUMCHECK="gitlab.corp.internal/*"
```

## Setting GOPATH to a Custom Location

If you want a non-standard GOPATH (for example, a separate disk):

```bash
# Add to ~/.bashrc
export GOPATH="/data/go"
export PATH="$PATH:/usr/local/go/bin:$GOPATH/bin"

# Create the directory structure
mkdir -p /data/go/{bin,pkg,src}
```

## Useful go env Variables

```bash
# View all Go environment variables
go env

# Key variables:
go env GOPATH       # Workspace root
go env GOROOT       # Go installation
go env GOPROXY      # Module proxy
go env GOPRIVATE    # Private module patterns
go env GOMODCACHE   # Module cache location (inside GOPATH/pkg/mod)
go env GOARCH       # Target architecture
go env GOOS         # Target operating system
go env CGO_ENABLED  # Whether cgo is enabled
```

## Cleaning the Module Cache

The module cache can grow large over time:

```bash
# Show module cache size
du -sh $(go env GOMODCACHE)

# Clean specific modules from cache
go clean -modcache

# WARNING: -modcache clears the entire cache
# Go will re-download modules on next build
```

## Common Project Patterns

### Single Application

```bash
mkdir myapp && cd myapp
go mod init github.com/user/myapp
# Write main.go
go build -o myapp .
```

### Library Package

```bash
mkdir mylib && cd mylib
go mod init github.com/user/mylib
# Write library code (no main package)
go test ./...
```

### Monorepo with Multiple Services

```bash
mkdir company && cd company
go mod init github.com/company/platform

# Create multiple cmd directories
mkdir -p cmd/{api-server,worker,migrate}
# Each cmd/ directory has its own main.go
# Shared code lives in pkg/ or internal/

# Build a specific binary
go build -o bin/api-server ./cmd/api-server/

# Build all binaries
go build -o bin/ ./cmd/...
```

The Go workspace and module system are designed to be low-friction once you understand the layout. The key insight is that `GOPATH` is mainly about the module cache and installed tools now, not where you put your code.
