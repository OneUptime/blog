# How to Use Go Workspaces for Monorepos

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Workspaces, Monorepo, Modules, Project Structure

Description: A practical guide to using Go workspaces for managing multiple modules in a monorepo setup.

---

If you have worked with Go modules in a monorepo, you have probably felt the pain of managing local dependencies. Before Go 1.18, the common workaround was scattering `replace` directives in your `go.mod` files - which worked, but was messy and error-prone. Go workspaces solve this problem elegantly.

## What Are Go Workspaces?

Go workspaces, introduced in Go 1.18, let you work with multiple modules simultaneously without modifying individual `go.mod` files. Instead of using `replace` directives to point to local paths, you define a `go.work` file at the root of your project that tells Go which modules belong together.

The key benefit: your `go.mod` files stay clean and commit-ready, while you still get local development convenience.

## The go.work File

The `go.work` file lives at the root of your workspace and has a simple syntax:

```go
// go.work - defines which modules are part of this workspace
go 1.21

use (
    ./api
    ./shared
    ./worker
)
```

When Go finds a `go.work` file in the current directory or any parent directory, it automatically resolves imports between the listed modules locally. No more `replace` directives needed.

## Setting Up a Monorepo Structure

Here is a typical monorepo structure that works well with Go workspaces:

```
myproject/
├── go.work
├── api/
│   ├── go.mod
│   ├── go.sum
│   └── main.go
├── worker/
│   ├── go.mod
│   ├── go.sum
│   └── main.go
└── shared/
    ├── go.mod
    ├── go.sum
    └── utils.go
```

Each service (`api`, `worker`) and shared library (`shared`) is its own Go module with its own `go.mod`. The `go.work` file at the root ties them together.

## Creating Your First Workspace

Start by initializing each module. Here is the setup process:

```bash
# Create the project structure
mkdir -p myproject/{api,worker,shared}
cd myproject

# Initialize each module with its own go.mod
cd api && go mod init github.com/myorg/myproject/api && cd ..
cd worker && go mod init github.com/myorg/myproject/worker && cd ..
cd shared && go mod init github.com/myorg/myproject/shared && cd ..

# Initialize the workspace at the root
go work init ./api ./worker ./shared
```

This creates a `go.work` file that includes all three modules.

## A Working Example

Here is a concrete example showing how modules interact within a workspace.

First, the shared utility module:

```go
// shared/utils.go - common utilities used by multiple services
package shared

import "fmt"

// FormatMessage returns a formatted string with a prefix
func FormatMessage(prefix, message string) string {
    return fmt.Sprintf("[%s] %s", prefix, message)
}

// Config holds common configuration values
type Config struct {
    ServiceName string
    Port        int
    Debug       bool
}
```

The shared module's go.mod is minimal:

```go
// shared/go.mod
module github.com/myorg/myproject/shared

go 1.21
```

Now the API service that imports the shared module:

```go
// api/main.go - REST API service
package main

import (
    "fmt"
    "net/http"
    
    // Import the shared module - Go workspace resolves this locally
    "github.com/myorg/myproject/shared"
)

func main() {
    config := shared.Config{
        ServiceName: "api",
        Port:        8080,
        Debug:       true,
    }
    
    http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        msg := shared.FormatMessage(config.ServiceName, "healthy")
        fmt.Fprint(w, msg)
    })
    
    addr := fmt.Sprintf(":%d", config.Port)
    fmt.Println(shared.FormatMessage(config.ServiceName, "starting on "+addr))
    http.ListenAndServe(addr, nil)
}
```

The API module's go.mod requires the shared module:

```go
// api/go.mod
module github.com/myorg/myproject/api

go 1.21

require github.com/myorg/myproject/shared v0.0.0
```

Note: The version `v0.0.0` does not matter for local development - the workspace overrides it. When you publish, you will update this to a real version.

## Essential Workspace Commands

Go provides several commands for managing workspaces:

### go work init

Creates a new workspace file with the specified modules:

```bash
# Initialize with specific modules
go work init ./api ./worker ./shared

# Initialize empty workspace, add modules later
go work init
```

### go work use

Adds or removes modules from an existing workspace:

```bash
# Add a new module to the workspace
go work use ./newservice

# Add multiple modules at once
go work use ./service1 ./service2

# Remove a module (use the -r flag in the directory)
cd oldservice && go work use -r .
```

### go work sync

Synchronizes the workspace's build list back to the individual module's go.mod files. This is useful when you want to update dependency versions across all modules:

```bash
# Sync workspace dependencies to all modules
go work sync
```

This command ensures that the `go.mod` files have consistent dependency versions based on what the workspace resolved.

### go work edit

Programmatically edit the go.work file:

```bash
# Set the Go version
go work edit -go=1.22

# Add a use directive
go work edit -use=./newmodule

# Drop a use directive
go work edit -dropuse=./oldmodule
```

## Replace Directives vs Workspaces

Before workspaces, the common approach was using `replace` directives in `go.mod`:

```go
// The old way - clutters your go.mod and causes commit issues
module github.com/myorg/myproject/api

go 1.21

require github.com/myorg/myproject/shared v0.0.0

// Had to add and remove this for local dev
replace github.com/myorg/myproject/shared => ../shared
```

Problems with replace directives:

- You have to remember to remove them before committing
- Different developers might have different local paths
- Easy to accidentally commit and break CI/CD
- Gets messy with many modules

Workspaces solve all of these issues. The `go.work` file is typically not committed (add it to `.gitignore`), so each developer can have their own local workspace setup.

## When Not to Commit go.work

A common pattern is to keep `go.work` local and not commit it:

```bash
# .gitignore
go.work
go.work.sum
```

Why? Because the workspace is a development convenience, not a build requirement. In CI/CD, each module should build independently using its `go.mod` dependencies. This keeps your published modules clean and ensures they work in isolation.

However, there are cases where committing `go.work` makes sense - more on that in the CI/CD section.

## Best Practices

### 1. One Module Per Deployable Unit

Each service that gets built and deployed separately should be its own module. Shared code that multiple services import should also be its own module:

```
project/
├── go.work
├── services/
│   ├── api/         # Deployed as api-service
│   │   └── go.mod
│   └── worker/      # Deployed as worker-service
│       └── go.mod
└── pkg/
    ├── database/    # Shared database utilities
    │   └── go.mod
    └── logging/     # Shared logging
        └── go.mod
```

### 2. Use Consistent Module Paths

Follow a consistent naming convention for module paths:

```go
// Good - clear organization
github.com/myorg/myproject/services/api
github.com/myorg/myproject/services/worker
github.com/myorg/myproject/pkg/database

// Avoid - inconsistent structure
github.com/myorg/api
github.com/myorg/myproject-worker
github.com/myorg/db-utils
```

### 3. Keep the Workspace File Simple

Only include modules you are actively developing. If you are only working on the API, your workspace might just be:

```go
// go.work - minimal workspace for API development
go 1.21

use (
    ./api
    ./shared
)
```

You can always add more modules later with `go work use`.

### 4. Version Your Shared Modules

For production, your shared modules should have proper version tags:

```bash
# Tag a release of the shared module
cd shared
git tag shared/v1.2.0
git push origin shared/v1.2.0
```

Then update the dependent modules:

```go
// api/go.mod - use real versions in production
module github.com/myorg/myproject/api

go 1.21

require github.com/myorg/myproject/shared v1.2.0
```

## CI/CD Considerations

### Option 1: Build Modules Independently (Recommended)

The cleanest approach is to build each module independently in CI, without a workspace:

```yaml
# .github/workflows/api.yml
name: API Service

on:
  push:
    paths:
      - 'api/**'
      - 'shared/**'  # Rebuild when shared changes

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-go@v5
        with:
          go-version: '1.21'
      
      # Build from the module directory - no workspace needed
      - name: Build
        working-directory: ./api
        run: go build -v ./...
      
      - name: Test
        working-directory: ./api
        run: go test -v ./...
```

This approach requires that your `go.mod` files have correct, published versions of dependencies.

### Option 2: Use Workspace in CI

If you want to test unreleased changes across modules, you can create a workspace in CI:

```yaml
# .github/workflows/integration.yml
name: Integration Tests

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-go@v5
        with:
          go-version: '1.21'
      
      # Create workspace with all modules
      - name: Setup Workspace
        run: go work init ./api ./worker ./shared
      
      # Run integration tests that span modules
      - name: Integration Tests
        run: go test ./api/... ./worker/... ./shared/...
```

### Option 3: Commit the go.work File

For internal projects where you always build everything together, committing `go.work` simplifies things:

```yaml
# Just works if go.work is committed
- name: Build All
  run: go build ./...

- name: Test All  
  run: go test ./...
```

The tradeoff: you lose the ability to version and release modules independently.

## When to Use Workspaces

**Use workspaces when:**

- You have multiple Go modules in one repository
- You frequently make changes across multiple modules
- You want to test changes locally before publishing
- You are tired of managing replace directives

**Skip workspaces when:**

- You have a single module (nothing to coordinate)
- Your modules are in separate repositories
- You prefer to always use published versions
- Your CI already handles multi-module builds well

## Troubleshooting Common Issues

### "module not found" errors

If Go cannot find a module in your workspace, check:

1. The module is listed in `go.work`
2. The path in `go.work` is correct relative to the workspace root
3. The module has a valid `go.mod` file

```bash
# Verify your workspace setup
cat go.work
go work edit -json  # Shows parsed workspace file
```

### IDE not recognizing workspace

Most Go-aware IDEs (VS Code with gopls, GoLand) support workspaces, but sometimes need a restart:

```bash
# For VS Code, restart gopls
# Command Palette -> Go: Restart Language Server
```

Make sure you open the workspace root folder, not a subfolder.

### Dependencies out of sync

If module dependencies seem inconsistent:

```bash
# Sync workspace to modules
go work sync

# Update all modules
go work edit -use=./module1 -use=./module2
go get -u ./...
go work sync
```

## Wrapping Up

Go workspaces make monorepo development significantly smoother. Instead of fighting with replace directives or maintaining complex build scripts, you get native tooling support for multi-module development.

The key points to remember:

- Use `go work init` to create a workspace
- Add modules with `go work use`
- Keep `go.work` local (in `.gitignore`) for most projects
- Let CI build modules independently using their `go.mod` files

Start small - create a workspace for your existing monorepo and see how it feels. You can always adjust the structure as your needs evolve.

---

*OneUptime is an open-source observability platform that helps you monitor your Go microservices. With distributed tracing, metrics, and log aggregation, you can debug issues across your monorepo services quickly. Check out [OneUptime](https://oneuptime.com) to get started with monitoring your Go applications.*
