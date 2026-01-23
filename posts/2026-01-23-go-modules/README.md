# How to Manage Dependencies with Go Modules

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Modules, Dependencies, go.mod, Vendoring, Package Management

Description: Master Go modules for dependency management including go.mod, go.sum, version selection, vendoring, and best practices for managing packages.

---

Go modules are the standard way to manage dependencies in Go. They provide reproducible builds, semantic versioning, and work outside of GOPATH. This guide covers everything you need to know.

---

## Creating a New Module

```bash
mkdir myproject
cd myproject
go mod init github.com/username/myproject
```

This creates `go.mod`:

```
module github.com/username/myproject

go 1.21
```

---

## Adding Dependencies

Dependencies are added automatically when you import and build:

```go
package main

import (
    "fmt"
    "github.com/gin-gonic/gin"
)

func main() {
    r := gin.Default()
    r.GET("/", func(c *gin.Context) {
        c.String(200, "Hello")
    })
    r.Run()
}
```

```bash
go build
# or
go mod tidy
```

The `go.mod` is updated:

```
module github.com/username/myproject

go 1.21

require github.com/gin-gonic/gin v1.9.1
```

---

## Understanding go.mod

```
module github.com/username/myproject

go 1.21

require (
    github.com/gin-gonic/gin v1.9.1
    github.com/stretchr/testify v1.8.4
)

require (
    // Indirect dependencies (dependencies of dependencies)
    github.com/bytedance/sonic v1.10.0 // indirect
    github.com/pelletier/go-toml/v2 v2.1.0 // indirect
)

exclude github.com/old/package v1.2.3

replace github.com/original/pkg => github.com/fork/pkg v1.0.0
```

**Directives:**

| Directive | Purpose |
|-----------|---------|
| `module` | Module path (import path) |
| `go` | Minimum Go version |
| `require` | Dependencies with versions |
| `exclude` | Versions to exclude |
| `replace` | Override module location |
| `retract` | Versions this module retracts |

---

## Understanding go.sum

The `go.sum` file contains cryptographic checksums:

```
github.com/gin-gonic/gin v1.9.1 h1:4idEAncQnU5cB7BeOkPtxjfCSye0AAm1R0RVIqJ+Jmg=
github.com/gin-gonic/gin v1.9.1/go.mod h1:hPrL...=
```

**Never edit go.sum manually!** It's managed by Go tools.

---

## Version Selection

### Specific Version

```bash
go get github.com/gin-gonic/gin@v1.9.1
```

### Latest Version

```bash
go get github.com/gin-gonic/gin@latest
```

### Specific Commit

```bash
go get github.com/gin-gonic/gin@abc1234
```

### Branch

```bash
go get github.com/gin-gonic/gin@main
```

### Upgrade All

```bash
go get -u ./...
```

### Upgrade Patch Versions Only

```bash
go get -u=patch ./...
```

---

## go mod Commands

```bash
# Initialize module
go mod init github.com/user/project

# Add missing / remove unused dependencies
go mod tidy

# Download dependencies to cache
go mod download

# Copy dependencies to vendor/
go mod vendor

# Verify dependencies
go mod verify

# Show module graph
go mod graph

# Explain why a dependency is needed
go mod why github.com/some/pkg

# Edit go.mod (add require, replace, etc.)
go mod edit -require github.com/pkg@v1.0.0
go mod edit -replace old/pkg=new/pkg@v1.0.0
```

---

## Semantic Import Versioning

For major versions 2+, include version in import path:

```go
import (
    "github.com/user/pkg/v2"  // Version 2.x
    "github.com/user/pkg/v3"  // Version 3.x
)
```

Module declaration for v2+:

```
// go.mod for v2
module github.com/user/pkg/v2

go 1.21
```

---

## Using Replace Directive

### Local Development

Replace a dependency with local code:

```
replace github.com/original/pkg => ../local-pkg
```

### Fork

Use your fork of a dependency:

```
replace github.com/original/pkg => github.com/yourfork/pkg v1.0.0
```

### Fix Vulnerability

Replace a vulnerable transitive dependency:

```
replace github.com/vulnerable/pkg v1.2.3 => github.com/vulnerable/pkg v1.2.4
```

---

## Vendoring

Copy dependencies into your project:

```bash
go mod vendor
```

This creates a `vendor/` directory. Build using vendor:

```bash
go build -mod=vendor
```

**When to vendor:**
- Reproducible builds without network
- Auditing dependencies
- Air-gapped environments

**go.mod with vendor:**
```
module myproject

go 1.21

require github.com/gin-gonic/gin v1.9.1
```

---

## Private Modules

Configure for private repositories:

```bash
# Set GOPRIVATE for private module paths
go env -w GOPRIVATE=github.com/mycompany/*

# Or use .netrc for authentication
echo "machine github.com login username password token" >> ~/.netrc
```

For GitLab/GitHub tokens:

```bash
git config --global url."https://oauth2:${TOKEN}@gitlab.com".insteadOf "https://gitlab.com"
```

---

## Workspaces (Multi-Module Development)

For developing multiple modules together (Go 1.18+):

```bash
# Create workspace
go work init ./module-a ./module-b

# Add module to workspace  
go work use ./module-c
```

Creates `go.work`:

```
go 1.21

use (
    ./module-a
    ./module-b
    ./module-c
)
```

Changes in `module-a` are immediately visible to `module-b` without publishing.

---

## Upgrading Dependencies

### Check for Updates

```bash
go list -m -u all
```

Output shows available updates:

```
github.com/gin-gonic/gin v1.9.0 [v1.9.1]
github.com/stretchr/testify v1.8.0 [v1.8.4]
```

### Upgrade Specific Package

```bash
go get github.com/gin-gonic/gin@latest
```

### Upgrade All Direct Dependencies

```bash
go get -u ./...
go mod tidy
```

### Check for Vulnerabilities

```bash
go install golang.org/x/vuln/cmd/govulncheck@latest
govulncheck ./...
```

---

## Retracting Versions

If you published a broken version, retract it in go.mod:

```
module github.com/user/pkg

go 1.21

retract (
    v1.0.0 // Critical bug in authentication
    [v1.1.0, v1.1.3] // Security vulnerability
)
```

Publish a new version with retract directive.

---

## Best Practices

### 1. Always Run go mod tidy

```bash
go mod tidy
```

Removes unused dependencies and adds missing ones.

### 2. Commit go.sum

```bash
git add go.mod go.sum
git commit -m "Update dependencies"
```

Both files should be in version control.

### 3. Pin Versions in Libraries

For libraries, use minimal version requirements:

```
require github.com/pkg v1.0.0
```

For applications, you can be more specific.

### 4. Review Dependency Updates

```bash
# See what changed
go mod graph | grep pkg
go mod why github.com/some/pkg
```

### 5. Use Renovate or Dependabot

Automate dependency updates in CI:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: gomod
    directory: "/"
    schedule:
      interval: weekly
```

---

## Troubleshooting

### Clear Module Cache

```bash
go clean -modcache
```

### Verify Checksums

```bash
go mod verify
```

### Debug Module Resolution

```bash
GODEBUG=http2debug=1 go get github.com/some/pkg
```

### Force Specific Version

```bash
go mod edit -require github.com/pkg@v1.2.3
go mod tidy
```

---

## Summary

| Command | Purpose |
|---------|---------|
| `go mod init` | Create new module |
| `go mod tidy` | Sync dependencies |
| `go mod download` | Download dependencies |
| `go mod vendor` | Copy to vendor/ |
| `go mod verify` | Verify checksums |
| `go mod graph` | Show dependency graph |
| `go mod why` | Explain dependency |
| `go get pkg@version` | Add/update dependency |
| `go get -u ./...` | Update all |
| `go work init` | Create workspace |

**Key Files:**
- `go.mod` - Module definition and dependencies
- `go.sum` - Cryptographic checksums
- `go.work` - Workspace configuration

---

*Managing complex Go projects? [OneUptime](https://oneuptime.com) helps you monitor your applications and track dependency-related issues in production.*
