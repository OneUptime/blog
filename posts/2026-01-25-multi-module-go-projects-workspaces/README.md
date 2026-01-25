# How to Manage Multi-Module Go Projects with Workspaces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Modules, Workspaces, Project Structure, Go Modules

Description: Learn how to use Go workspaces to manage multiple modules in a single repository, enabling seamless local development without constant version bumps or replace directives.

---

If you have ever worked on a Go project with multiple modules in the same repository, you know the pain. You make a change in one module, and suddenly you are updating go.mod files, pushing tags, or adding `replace` directives everywhere. Go 1.18 introduced workspaces to solve exactly this problem.

Workspaces let you work on multiple modules simultaneously while Go resolves dependencies locally. No more publishing intermediate versions just to test changes across packages.

## When You Actually Need Workspaces

Not every project needs workspaces. Here is when they make sense:

- **Monorepos with multiple services**: You have `api/`, `worker/`, and `shared/` modules that depend on each other.
- **Developing a library alongside an application**: You are building a library and want to test changes in a real app without publishing.
- **Microservices sharing common packages**: Several services import the same internal packages.

If you have a single module, stick with the standard `go.mod` setup. Workspaces add complexity that is not worth it for simple projects.

## Setting Up Your First Workspace

Let's say you have this project structure - a monorepo with an API service, a worker service, and shared packages they both use.

```
myproject/
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
    └── utils.go
```

Each directory is its own module with its own `go.mod`. The `api` and `worker` modules both import `shared`.

Initialize the workspace from the project root. This creates a go.work file that tells Go which modules to include.

```bash
# Create the workspace file at the project root
cd myproject
go work init

# Add each module to the workspace
go work use ./api
go work use ./worker
go work use ./shared
```

This generates a `go.work` file:

```go
// go.work - defines which modules are part of this workspace
go 1.21

use (
    ./api
    ./worker
    ./shared
)
```

Now when you run `go build` or `go test` from anywhere in the project, Go automatically uses local versions of your modules instead of fetching them from a remote repository.

## How Module Resolution Changes

Without workspaces, if `api/go.mod` requires `github.com/myorg/myproject/shared v1.0.0`, Go downloads that version from the module proxy. You would need to tag and push changes to `shared` before `api` can use them.

With workspaces enabled, Go sees the local `./shared` directory and uses it directly. The version in `go.mod` is effectively ignored during local development.

Here is what your api module's go.mod looks like - notice it still references the remote path, but the workspace overrides it locally.

```go
// api/go.mod
module github.com/myorg/myproject/api

go 1.21

require github.com/myorg/myproject/shared v1.0.0
```

The import in your code stays the same:

```go
// api/main.go
package main

import (
    "fmt"
    // Import uses the full module path, workspace handles local resolution
    "github.com/myorg/myproject/shared"
)

func main() {
    // Call a function from the shared module
    result := shared.FormatTimestamp()
    fmt.Println(result)
}
```

## Adding External Dependencies

Workspaces do not change how external dependencies work. Each module still manages its own `go.mod` for third-party packages.

When you need to add a dependency, run the command from within the specific module directory.

```bash
# Add a dependency to the api module specifically
cd api
go get github.com/gin-gonic/gin@latest

# Add a dependency to the worker module
cd ../worker
go get github.com/rabbitmq/amqp091-go@latest
```

Each module maintains its own `go.sum` for checksums. The workspace only affects how modules within the workspace resolve each other.

## Syncing Dependencies Across Modules

When multiple modules depend on the same external package, version conflicts can happen. Use `go work sync` to align versions across all workspace modules.

```bash
# Sync dependency versions across all modules in the workspace
go work sync
```

This updates each module's `go.mod` to use consistent versions of shared dependencies. Run this after adding new dependencies or when you see version mismatch warnings.

## CI/CD Considerations

Here is where things get tricky. Your `go.work` file is great for local development, but you probably do not want it in CI.

The workspace file should stay local because CI builds should test each module independently using its declared dependencies in go.mod.

```bash
# .gitignore - exclude the workspace file from version control
go.work
go.work.sum
```

In CI, build each module separately to verify the published dependency versions work correctly.

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        # Test each module independently
        module: [api, worker, shared]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.21'
      # Run tests from within each module directory
      - run: cd ${{ matrix.module }} && go test ./...
```

Alternatively, if you want CI to use the workspace (for integration tests, for example), commit the `go.work` file but understand that you are testing local module versions, not what is published.

## Common Pitfalls and How to Avoid Them

### Forgetting to Add New Modules

When you create a new module, you need to explicitly add it to the workspace. Go does not auto-discover modules.

```bash
# After creating a new module, add it to the workspace
mkdir -p newservice
cd newservice
go mod init github.com/myorg/myproject/newservice
cd ..
go work use ./newservice
```

### IDE Confusion

Some editors get confused when opening a subdirectory instead of the workspace root. Always open your editor at the project root where `go.work` lives.

For VS Code, the Go extension picks up `go.work` automatically. For GoLand, you may need to configure the project root in settings.

### Circular Dependencies

Workspaces do not magically fix circular dependencies. If `api` imports `shared` and `shared` imports `api`, you still have a problem.

```
# This will fail regardless of workspaces
api -> shared -> api  (circular import)
```

Restructure your code to break the cycle, usually by extracting the shared dependency into a third module that both can import.

### Version Drift Between Local and Published

Since workspaces override versions, you might develop against a local `shared` that has breaking changes, but `api/go.mod` still says `v1.0.0`. When someone clones without the workspace, they get the old version.

Keep module versions updated as you develop. When `shared` has significant changes, bump the version in both `shared/go.mod` and update the requirement in consuming modules.

```bash
# Update the shared module version after making changes
cd shared
# Edit go.mod to bump version, then tag it
cd ../api
go get github.com/myorg/myproject/shared@v1.1.0
```

## Best Practices

1. **Keep go.work local**: Use `.gitignore` unless your team agrees to commit it.

2. **Run go work sync regularly**: Especially after updating external dependencies.

3. **Test without workspaces before releasing**: Disable the workspace temporarily to verify published versions work.

```bash
# Temporarily disable the workspace to test with published versions
GOWORK=off go build ./...
```

4. **Use semantic versioning**: Even for internal modules. It makes dependency management predictable.

5. **Document the workspace setup**: Add a note in your README so new team members know to run `go work init` and `go work use`.

## Workspace Commands Reference

Here is a quick reference for the workspace commands you will use most often.

```bash
# Initialize a new workspace in the current directory
go work init

# Add a module to the workspace
go work use ./path/to/module

# Add multiple modules at once
go work use ./api ./worker ./shared

# Sync dependency versions across all modules
go work sync

# Edit go.work directly (opens in editor)
go work edit -use=./newmodule

# Remove a module from the workspace
go work edit -dropuse=./oldmodule

# Temporarily disable workspace (useful for testing)
GOWORK=off go build ./...
```

---

Go workspaces solve a real pain point in multi-module development. Once you set them up, making changes across modules becomes seamless - edit, build, test, repeat. Just remember that workspaces are a development tool, not a replacement for proper version management. Keep your `go.mod` files accurate, and you will have the best of both worlds.
