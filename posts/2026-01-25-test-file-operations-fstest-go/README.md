# How to Test File Operations with fstest in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Testing, fstest, File System, Unit Testing

Description: Learn how to use Go's testing/fstest package to create in-memory file systems for testing file operations without touching the disk.

---

Testing code that reads files has traditionally been painful. You either create temporary files that clutter your test directory, or you mock the entire file system with complex interfaces. Go 1.16 introduced the `io/fs` package along with `testing/fstest`, which provides a clean solution: in-memory file systems that behave exactly like real ones.

## Why fstest Matters

Before `fstest`, testing file-reading code meant one of these approaches:

| Approach | Problems |
|----------|----------|
| **Real files in testdata/** | Slow, requires cleanup, path issues in CI |
| **Custom mock interfaces** | Boilerplate, doesn't match real fs behavior |
| **afero or similar libs** | External dependency, learning curve |

The `testing/fstest` package gives you an in-memory file system that implements `io/fs.FS`. Your code reads from it exactly like a real file system, but everything lives in memory. Tests run faster, require no cleanup, and work the same everywhere.

## Basic Usage

The core type is `fstest.MapFS`, which is simply a map from file paths to file contents. Here's a minimal example:

```go
package main

import (
    "io/fs"
    "testing"
    "testing/fstest"
)

func TestReadConfig(t *testing.T) {
    // Create an in-memory file system with one file
    memFS := fstest.MapFS{
        "config.json": &fstest.MapFile{
            Data: []byte(`{"port": 8080, "debug": true}`),
        },
    }

    // Read the file using standard fs.ReadFile
    data, err := fs.ReadFile(memFS, "config.json")
    if err != nil {
        t.Fatalf("failed to read config: %v", err)
    }

    expected := `{"port": 8080, "debug": true}`
    if string(data) != expected {
        t.Errorf("got %q, want %q", string(data), expected)
    }
}
```

The `MapFile` struct holds the file's content in the `Data` field. You can also set `Mode`, `ModTime`, and `Sys` if your code checks file metadata.

## Testing Functions That Accept fs.FS

The real power comes when you design your functions to accept an `fs.FS` parameter instead of hardcoding file system access. This makes testing trivial.

```go
package config

import (
    "encoding/json"
    "io/fs"
)

// AppConfig holds application settings
type AppConfig struct {
    Port    int    `json:"port"`
    Debug   bool   `json:"debug"`
    LogPath string `json:"log_path"`
}

// LoadConfig reads configuration from the given file system
// By accepting fs.FS, this function works with real files in production
// and in-memory files during testing
func LoadConfig(fsys fs.FS, path string) (*AppConfig, error) {
    data, err := fs.ReadFile(fsys, path)
    if err != nil {
        return nil, err
    }

    var cfg AppConfig
    if err := json.Unmarshal(data, &cfg); err != nil {
        return nil, err
    }

    return &cfg, nil
}
```

Now testing becomes straightforward:

```go
package config

import (
    "testing"
    "testing/fstest"
)

func TestLoadConfig(t *testing.T) {
    // Set up in-memory file system with test configuration
    memFS := fstest.MapFS{
        "app/config.json": &fstest.MapFile{
            Data: []byte(`{
                "port": 3000,
                "debug": false,
                "log_path": "/var/log/app.log"
            }`),
        },
    }

    cfg, err := LoadConfig(memFS, "app/config.json")
    if err != nil {
        t.Fatalf("LoadConfig failed: %v", err)
    }

    // Verify each field
    if cfg.Port != 3000 {
        t.Errorf("Port = %d, want 3000", cfg.Port)
    }
    if cfg.Debug != false {
        t.Errorf("Debug = %v, want false", cfg.Debug)
    }
    if cfg.LogPath != "/var/log/app.log" {
        t.Errorf("LogPath = %q, want /var/log/app.log", cfg.LogPath)
    }
}

func TestLoadConfigMissingFile(t *testing.T) {
    // Empty file system - file doesn't exist
    memFS := fstest.MapFS{}

    _, err := LoadConfig(memFS, "missing.json")
    if err == nil {
        t.Error("expected error for missing file, got nil")
    }
}

func TestLoadConfigInvalidJSON(t *testing.T) {
    memFS := fstest.MapFS{
        "bad.json": &fstest.MapFile{
            Data: []byte(`{not valid json`),
        },
    }

    _, err := LoadConfig(memFS, "bad.json")
    if err == nil {
        t.Error("expected error for invalid JSON, got nil")
    }
}
```

## Working with Directories

`fstest.MapFS` handles directories automatically. When you add files with paths containing slashes, the directories are created implicitly. You can also create explicit directory entries.

```go
func TestDirectoryOperations(t *testing.T) {
    memFS := fstest.MapFS{
        // Directories are created automatically for file paths
        "templates/email/welcome.html": &fstest.MapFile{
            Data: []byte("<h1>Welcome!</h1>"),
        },
        "templates/email/reset.html": &fstest.MapFile{
            Data: []byte("<h1>Reset Password</h1>"),
        },
        "templates/sms/alert.txt": &fstest.MapFile{
            Data: []byte("Alert: {{.Message}}"),
        },
        // Explicit empty directory
        "templates/push": &fstest.MapFile{
            Mode: fs.ModeDir,
        },
    }

    // List files in a directory using fs.ReadDir
    entries, err := fs.ReadDir(memFS, "templates/email")
    if err != nil {
        t.Fatalf("ReadDir failed: %v", err)
    }

    if len(entries) != 2 {
        t.Errorf("got %d entries, want 2", len(entries))
    }

    // Verify entry names
    names := make([]string, len(entries))
    for i, e := range entries {
        names[i] = e.Name()
    }
    // Note: entries are sorted alphabetically
    if names[0] != "reset.html" || names[1] != "welcome.html" {
        t.Errorf("unexpected entries: %v", names)
    }
}
```

## Using fs.WalkDir with fstest

The `fs.WalkDir` function works perfectly with `fstest.MapFS`, making it easy to test code that recursively processes directories.

```go
package templates

import (
    "io/fs"
    "path/filepath"
    "strings"
)

// FindTemplates returns all .html files in the given directory tree
func FindTemplates(fsys fs.FS, root string) ([]string, error) {
    var templates []string

    err := fs.WalkDir(fsys, root, func(path string, d fs.DirEntry, err error) error {
        if err != nil {
            return err
        }

        // Skip directories
        if d.IsDir() {
            return nil
        }

        // Collect HTML files
        if strings.HasSuffix(path, ".html") {
            templates = append(templates, path)
        }

        return nil
    })

    return templates, err
}
```

Testing this function:

```go
func TestFindTemplates(t *testing.T) {
    memFS := fstest.MapFS{
        "views/index.html":       &fstest.MapFile{Data: []byte("")},
        "views/about.html":       &fstest.MapFile{Data: []byte("")},
        "views/partials/nav.html": &fstest.MapFile{Data: []byte("")},
        "views/style.css":        &fstest.MapFile{Data: []byte("")}, // Not HTML
        "assets/logo.png":        &fstest.MapFile{Data: []byte("")}, // Different directory
    }

    templates, err := FindTemplates(memFS, "views")
    if err != nil {
        t.Fatalf("FindTemplates failed: %v", err)
    }

    // Should find 3 HTML files, not CSS or files outside views/
    if len(templates) != 3 {
        t.Errorf("got %d templates, want 3: %v", len(templates), templates)
    }
}
```

## Setting File Metadata

Sometimes your code checks file permissions, modification times, or other metadata. `fstest.MapFile` supports all of these:

```go
func TestFileMetadata(t *testing.T) {
    modTime := time.Date(2024, 6, 15, 10, 30, 0, 0, time.UTC)

    memFS := fstest.MapFS{
        "secret.key": &fstest.MapFile{
            Data:    []byte("super-secret-key"),
            Mode:    0600, // Owner read/write only
            ModTime: modTime,
        },
        "public.txt": &fstest.MapFile{
            Data: []byte("public content"),
            Mode: 0644, // World readable
        },
    }

    // Check file info
    info, err := fs.Stat(memFS, "secret.key")
    if err != nil {
        t.Fatalf("Stat failed: %v", err)
    }

    if info.Mode().Perm() != 0600 {
        t.Errorf("Mode = %o, want 0600", info.Mode().Perm())
    }

    if !info.ModTime().Equal(modTime) {
        t.Errorf("ModTime = %v, want %v", info.ModTime(), modTime)
    }
}
```

## Validating File System Structure

The `fstest` package includes a handy function `TestFS` that validates your in-memory file system behaves correctly. This is useful when building custom `fs.FS` implementations.

```go
func TestFileSystemValidity(t *testing.T) {
    memFS := fstest.MapFS{
        "a.txt": &fstest.MapFile{Data: []byte("a")},
        "b.txt": &fstest.MapFile{Data: []byte("b")},
        "sub/c.txt": &fstest.MapFile{Data: []byte("c")},
    }

    // TestFS runs a battery of tests to verify fs.FS compliance
    // Pass the files you expect to exist
    if err := fstest.TestFS(memFS, "a.txt", "b.txt", "sub/c.txt"); err != nil {
        t.Errorf("TestFS failed: %v", err)
    }
}
```

## Production Code Pattern

For production use, your code should accept `fs.FS` but default to the real file system. Here's a common pattern:

```go
package myapp

import (
    "io/fs"
    "os"
)

type App struct {
    fsys fs.FS
}

// Option pattern for configuration
type Option func(*App)

// WithFS sets a custom file system (useful for testing)
func WithFS(fsys fs.FS) Option {
    return func(a *App) {
        a.fsys = fsys
    }
}

// NewApp creates an App with the given options
// Defaults to os.DirFS for real file system access
func NewApp(rootDir string, opts ...Option) *App {
    app := &App{
        fsys: os.DirFS(rootDir), // Default to real file system
    }

    for _, opt := range opts {
        opt(app)
    }

    return app
}
```

In tests, you inject the mock file system:

```go
func TestApp(t *testing.T) {
    memFS := fstest.MapFS{
        "config.yaml": &fstest.MapFile{Data: []byte("key: value")},
    }

    // Inject test file system
    app := NewApp(".", WithFS(memFS))

    // Test app behavior with controlled file contents
}
```

## Limitations

The `fstest.MapFS` type is read-only. You cannot write files to it during tests. If your code needs to write files, you have a few options:

1. Use `os.MkdirTemp` for integration tests that need real writes
2. Abstract writes behind an interface and mock that separately
3. Use a library like `afero` that supports in-memory writes

For most testing scenarios where you need to verify how your code reads and processes files, `fstest` is sufficient and keeps things simple.

## Summary

| Feature | How to Use |
|---------|------------|
| **Create files** | Add entries to `fstest.MapFS` |
| **Set content** | Use `Data` field in `MapFile` |
| **Create directories** | Implicit via paths or explicit with `Mode: fs.ModeDir` |
| **Set permissions** | Use `Mode` field |
| **Set modification time** | Use `ModTime` field |
| **Read files** | Use `fs.ReadFile(memFS, path)` |
| **List directories** | Use `fs.ReadDir(memFS, path)` |
| **Walk trees** | Use `fs.WalkDir(memFS, root, fn)` |

The `testing/fstest` package solves file testing in Go the right way. No external dependencies, no cleanup code, and tests run in milliseconds. Design your functions to accept `fs.FS`, and testing file operations becomes as simple as populating a map.
