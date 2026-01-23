# How to Use Build Tags in Go for Conditional Compilation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Build Tags, Conditional Compilation, Cross-Platform, Debugging

Description: Learn how to use Go build tags for conditional compilation to create platform-specific code, debug builds, feature flags, and integration tests.

---

Build tags (also called build constraints) let you include or exclude files from compilation based on conditions like target OS, architecture, or custom flags. This enables platform-specific code and feature toggles.

---

## Basic Build Tag Syntax

Go 1.17+ uses the `//go:build` directive:

```go
//go:build linux

package main

func platformSpecific() string {
    return "This only compiles on Linux"
}
```

The older syntax (still supported) uses `// +build`:

```go
// +build linux

package main
```

---

## OS-Specific Code

Create files for different operating systems:

```go
// file: platform_linux.go
//go:build linux

package main

import "syscall"

func getSystemInfo() string {
    var uname syscall.Utsname
    syscall.Uname(&uname)
    return string(uname.Nodename[:])
}
```

```go
// file: platform_darwin.go
//go:build darwin

package main

import "os/exec"

func getSystemInfo() string {
    out, _ := exec.Command("hostname").Output()
    return string(out)
}
```

```go
// file: platform_windows.go
//go:build windows

package main

import "os"

func getSystemInfo() string {
    name, _ := os.Hostname()
    return name
}
```

---

## Architecture-Specific Code

```go
// file: arch_amd64.go
//go:build amd64

package main

func optimizedFunction() {
    // Use AMD64-specific optimizations
}
```

```go
// file: arch_arm64.go
//go:build arm64

package main

func optimizedFunction() {
    // Use ARM64-specific optimizations
}
```

---

## Boolean Expressions

### AND (comma)

```go
//go:build linux && amd64
```
Builds only on Linux AND amd64.

### OR (||)

```go
//go:build linux || darwin
```
Builds on Linux OR macOS.

### NOT (!)

```go
//go:build !windows
```
Builds on everything EXCEPT Windows.

### Complex Expressions

```go
//go:build (linux || darwin) && amd64
```
Builds on (Linux OR macOS) AND amd64.

```go
//go:build linux && !cgo
```
Builds on Linux when CGO is disabled.

---

## Custom Build Tags

Define your own tags for feature flags:

```go
// file: feature_premium.go
//go:build premium

package main

func getPlan() string {
    return "Premium"
}

func enableAdvancedFeatures() {
    // Premium-only features
}
```

```go
// file: feature_free.go
//go:build !premium

package main

func getPlan() string {
    return "Free"
}

func enableAdvancedFeatures() {
    // No-op or basic features
}
```

Build with the tag:
```bash
go build -tags premium
```

---

## Debug Builds

```go
// file: debug.go
//go:build debug

package main

import "log"

func debugLog(format string, args ...interface{}) {
    log.Printf("[DEBUG] "+format, args...)
}
```

```go
// file: release.go
//go:build !debug

package main

func debugLog(format string, args ...interface{}) {
    // No-op in release builds
}
```

Build for debugging:
```bash
go build -tags debug
```

---

## Integration Tests

Separate integration tests from unit tests:

```go
// file: db_integration_test.go
//go:build integration

package db

import (
    "testing"
)

func TestDatabaseConnection(t *testing.T) {
    // This test requires a real database
    db, err := Connect(os.Getenv("DATABASE_URL"))
    if err != nil {
        t.Fatalf("Failed to connect: %v", err)
    }
    defer db.Close()
    
    // Run integration tests...
}
```

Run only unit tests:
```bash
go test ./...
```

Run integration tests:
```bash
go test -tags integration ./...
```

---

## CGO Control

```go
// file: native_cgo.go
//go:build cgo

package main

/*
#include <stdlib.h>
*/
import "C"

func nativeAlloc(size int) unsafe.Pointer {
    return C.malloc(C.size_t(size))
}
```

```go
// file: native_nocgo.go
//go:build !cgo

package main

func nativeAlloc(size int) unsafe.Pointer {
    // Pure Go fallback
    return nil
}
```

Build without CGO:
```bash
CGO_ENABLED=0 go build
```

---

## File Naming Conventions

Go automatically applies build constraints based on filename suffixes:

| Filename | Constraint |
|----------|------------|
| `file_linux.go` | `//go:build linux` |
| `file_darwin.go` | `//go:build darwin` |
| `file_windows.go` | `//go:build windows` |
| `file_amd64.go` | `//go:build amd64` |
| `file_arm64.go` | `//go:build arm64` |
| `file_linux_amd64.go` | `//go:build linux && amd64` |

You can combine with explicit tags:

```go
// file: file_linux.go
//go:build linux && !cgo

package main
// Builds on Linux without CGO
```

---

## Ignore Files

Prevent a file from ever being compiled:

```go
//go:build ignore

package main

// This file is never compiled
// Useful for documentation, generators, etc.
```

---

## Available Built-in Tags

### Operating Systems
- `linux`, `darwin`, `windows`, `freebsd`, `netbsd`, `openbsd`
- `dragonfly`, `solaris`, `plan9`, `js`, `aix`

### Architectures
- `386`, `amd64`, `arm`, `arm64`
- `ppc64`, `ppc64le`, `mips`, `mipsle`
- `mips64`, `mips64le`, `s390x`, `wasm`, `riscv64`

### Other
- `cgo` - CGO enabled
- `gc` - gc compiler (standard)
- `gccgo` - gccgo compiler
- `go1.21` - Go version (go1.X and later)
- `race` - race detector enabled

---

## Version Constraints

Require minimum Go version:

```go
//go:build go1.21

package main

// Uses features from Go 1.21+
```

Exclude newer versions:

```go
//go:build !go1.21

package main

// Fallback for older Go versions
```

---

## Multiple Tags in Makefile

```makefile
.PHONY: build-dev build-prod build-all

build-dev:
	go build -tags "debug logging" -o app-dev

build-prod:
	go build -tags "premium production" -o app-prod

build-all:
	GOOS=linux GOARCH=amd64 go build -o app-linux-amd64
	GOOS=darwin GOARCH=amd64 go build -o app-darwin-amd64
	GOOS=darwin GOARCH=arm64 go build -o app-darwin-arm64
	GOOS=windows GOARCH=amd64 go build -o app-windows-amd64.exe
```

---

## Checking Build Constraints

List files that would be compiled:

```bash
go list -f '{{.GoFiles}}' ./...
go list -f '{{.GoFiles}}' -tags integration ./...
```

See which tags affect a file:

```bash
go list -f '{{.IgnoredGoFiles}}' ./...
```

---

## Summary

| Use Case | Tag Example |
|----------|-------------|
| Platform-specific | `//go:build linux` |
| Architecture | `//go:build amd64` |
| Feature flags | `//go:build premium` |
| Debug builds | `//go:build debug` |
| Integration tests | `//go:build integration` |
| CGO control | `//go:build cgo` or `!cgo` |
| Version requirement | `//go:build go1.21` |

**Best Practices:**

1. Use `//go:build` syntax (Go 1.17+)
2. Prefer file suffixes for simple OS/arch targeting
3. Use custom tags for feature flags
4. Keep build tag logic simple
5. Document what tags are available in your project
6. Test with multiple tag combinations in CI

---

*Building Go applications for multiple platforms? [OneUptime](https://oneuptime.com) provides cross-platform monitoring to ensure your application works correctly on all target environments.*
