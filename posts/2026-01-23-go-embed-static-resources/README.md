# How to Bundle Static Resources Inside Go Binaries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Embed, Static Files, Binary, Assets, Templates

Description: Learn how to embed static files like HTML templates, CSS, JavaScript, images, and configuration files directly into your Go binary using the embed package.

---

One of Go's best features is producing single binary deployments. With Go 1.16+, the `embed` package makes it easy to include static files directly in your binary. No more worrying about missing assets in production.

---

## The embed Package

Go's `embed` package lets you include files at compile time:

```go
package main

import (
    "embed"
    "fmt"
)

//go:embed hello.txt
var content string

func main() {
    fmt.Println(content)
}
```

The `//go:embed` directive tells the compiler to include `hello.txt` in the binary.

---

## Embedding Patterns

### Single File as String

```go
package main

import (
    _ "embed"
    "fmt"
)

//go:embed config.json
var configJSON string

func main() {
    fmt.Println(configJSON)
}
```

### Single File as Bytes

```go
package main

import (
    _ "embed"
)

//go:embed image.png
var imageData []byte

func main() {
    // imageData contains raw bytes of the PNG file
    fmt.Printf("Image size: %d bytes\n", len(imageData))
}
```

### Directory as embed.FS

```go
package main

import (
    "embed"
    "io/fs"
    "log"
)

//go:embed templates/*
var templates embed.FS

func main() {
    // List all files in templates/
    entries, err := fs.ReadDir(templates, "templates")
    if err != nil {
        log.Fatal(err)
    }
    
    for _, entry := range entries {
        fmt.Println(entry.Name())
    }
}
```

---

## Common Use Cases

### Embedding HTML Templates

```go
package main

import (
    "embed"
    "html/template"
    "net/http"
)

//go:embed templates/*.html
var templateFS embed.FS

var templates *template.Template

func init() {
    // Parse all templates from embedded filesystem
    templates = template.Must(template.ParseFS(templateFS, "templates/*.html"))
}

type PageData struct {
    Title   string
    Message string
}

func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        data := PageData{
            Title:   "Welcome",
            Message: "Hello from embedded templates!",
        }
        templates.ExecuteTemplate(w, "index.html", data)
    })
    
    http.ListenAndServe(":8080", nil)
}
```

Create `templates/index.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>{{.Title}}</title>
</head>
<body>
    <h1>{{.Message}}</h1>
</body>
</html>
```

---

### Embedding Static Web Assets

```go
package main

import (
    "embed"
    "io/fs"
    "net/http"
)

//go:embed static/*
var staticFS embed.FS

func main() {
    // Strip the "static" prefix from paths
    staticContent, _ := fs.Sub(staticFS, "static")
    
    // Serve files at /static/
    http.Handle("/static/", http.StripPrefix("/static/", 
        http.FileServer(http.FS(staticContent))))
    
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "text/html")
        w.Write([]byte(`
            <!DOCTYPE html>
            <html>
            <head>
                <link rel="stylesheet" href="/static/style.css">
            </head>
            <body>
                <h1>Hello!</h1>
                <script src="/static/app.js"></script>
            </body>
            </html>
        `))
    })
    
    http.ListenAndServe(":8080", nil)
}
```

---

### Embedding Configuration Files

```go
package main

import (
    _ "embed"
    "encoding/json"
    "fmt"
)

//go:embed config/defaults.json
var defaultConfigJSON []byte

type Config struct {
    AppName     string   `json:"appName"`
    Port        int      `json:"port"`
    Debug       bool     `json:"debug"`
    AllowedHosts []string `json:"allowedHosts"`
}

func loadConfig() (*Config, error) {
    var config Config
    if err := json.Unmarshal(defaultConfigJSON, &config); err != nil {
        return nil, err
    }
    return &config, nil
}

func main() {
    config, err := loadConfig()
    if err != nil {
        panic(err)
    }
    
    fmt.Printf("App: %s, Port: %d\n", config.AppName, config.Port)
}
```

---

### Embedding SQL Migration Files

```go
package main

import (
    "database/sql"
    "embed"
    "fmt"
    "io/fs"
    "sort"
    "strings"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

func runMigrations(db *sql.DB) error {
    // Get all SQL files
    entries, err := fs.ReadDir(migrationsFS, "migrations")
    if err != nil {
        return err
    }
    
    // Sort migrations by filename (e.g., 001_create_users.sql)
    var filenames []string
    for _, entry := range entries {
        if strings.HasSuffix(entry.Name(), ".sql") {
            filenames = append(filenames, entry.Name())
        }
    }
    sort.Strings(filenames)
    
    // Execute each migration
    for _, filename := range filenames {
        content, err := fs.ReadFile(migrationsFS, "migrations/"+filename)
        if err != nil {
            return err
        }
        
        fmt.Printf("Running migration: %s\n", filename)
        if _, err := db.Exec(string(content)); err != nil {
            return fmt.Errorf("migration %s failed: %w", filename, err)
        }
    }
    
    return nil
}

func main() {
    // Example usage (would need actual DB connection)
    fmt.Println("Migrations embedded successfully")
    
    // List embedded migrations
    entries, _ := fs.ReadDir(migrationsFS, "migrations")
    for _, e := range entries {
        fmt.Println(" -", e.Name())
    }
}
```

---

## Multiple Embed Directives

You can embed multiple patterns:

```go
package main

import (
    "embed"
)

// Embed multiple directories
//go:embed templates/* static/* config/*
var assets embed.FS

// Or use multiple directives
//go:embed templates/*
//go:embed static/*
//go:embed config/*
var multiAssets embed.FS
```

---

## Recursive Embedding

Use `all:` prefix to include files starting with `.` or `_`:

```go
package main

import (
    "embed"
)

// Normal embed - excludes .gitkeep, _hidden, etc.
//go:embed static/*
var publicAssets embed.FS

// With all: prefix - includes ALL files
//go:embed all:static/*
var allAssets embed.FS
```

---

## Pattern Matching

Embed supports glob patterns:

```go
package main

import (
    "embed"
)

// All .go files in current directory
//go:embed *.go
var sourceFiles embed.FS

// All JSON files recursively
//go:embed config/**/*.json
var configFiles embed.FS

// Multiple specific files
//go:embed logo.png favicon.ico robots.txt
var rootFiles embed.FS
```

---

## Development vs Production Pattern

Use build tags to switch between embedded and live files:

```go
// file: assets_prod.go
//go:build !dev

package main

import (
    "embed"
    "io/fs"
)

//go:embed static/*
var staticFS embed.FS

func getStaticFS() fs.FS {
    sub, _ := fs.Sub(staticFS, "static")
    return sub
}
```

```go
// file: assets_dev.go
//go:build dev

package main

import (
    "io/fs"
    "os"
)

func getStaticFS() fs.FS {
    // Use live filesystem during development
    return os.DirFS("static")
}
```

Build for production:

```bash
go build -o myapp
```

Build for development:

```bash
go build -tags dev -o myapp
```

---

## Embedding Version Information

```go
package main

import (
    _ "embed"
    "fmt"
    "strings"
)

//go:embed version.txt
var version string

func main() {
    fmt.Printf("Version: %s\n", strings.TrimSpace(version))
}
```

---

## Complete Web Server Example

```go
package main

import (
    "embed"
    "encoding/json"
    "html/template"
    "io/fs"
    "log"
    "net/http"
)

//go:embed web/templates/*.html
var templateFS embed.FS

//go:embed web/static/*
var staticFS embed.FS

//go:embed config/app.json
var configJSON []byte

type Config struct {
    Port    string `json:"port"`
    AppName string `json:"appName"`
}

type Server struct {
    config    *Config
    templates *template.Template
}

func NewServer() (*Server, error) {
    // Load config
    var config Config
    if err := json.Unmarshal(configJSON, &config); err != nil {
        return nil, err
    }
    
    // Parse templates
    templates, err := template.ParseFS(templateFS, "web/templates/*.html")
    if err != nil {
        return nil, err
    }
    
    return &Server{
        config:    &config,
        templates: templates,
    }, nil
}

func (s *Server) handleHome(w http.ResponseWriter, r *http.Request) {
    data := map[string]string{
        "AppName": s.config.AppName,
    }
    s.templates.ExecuteTemplate(w, "home.html", data)
}

func main() {
    server, err := NewServer()
    if err != nil {
        log.Fatal(err)
    }
    
    // Serve static files
    staticContent, _ := fs.Sub(staticFS, "web/static")
    http.Handle("/static/", http.StripPrefix("/static/", 
        http.FileServer(http.FS(staticContent))))
    
    // Routes
    http.HandleFunc("/", server.handleHome)
    
    log.Printf("Starting %s on port %s", server.config.AppName, server.config.Port)
    log.Fatal(http.ListenAndServe(":"+server.config.Port, nil))
}
```

---

## Checking Embedded Files at Runtime

```go
package main

import (
    "embed"
    "fmt"
    "io/fs"
)

//go:embed assets/*
var assets embed.FS

func listEmbeddedFiles() {
    fs.WalkDir(assets, ".", func(path string, d fs.DirEntry, err error) error {
        if err != nil {
            return err
        }
        
        if !d.IsDir() {
            info, _ := d.Info()
            fmt.Printf("%s (%d bytes)\n", path, info.Size())
        }
        return nil
    })
}

func main() {
    fmt.Println("Embedded files:")
    listEmbeddedFiles()
}
```

---

## Limitations and Gotchas

1. **Compile-time only**: Changes require recompilation
2. **Memory usage**: Embedded files live in memory
3. **No symlinks**: Symbolic links are not followed
4. **Path separators**: Always use forward slashes `/`
5. **Relative paths**: Paths are relative to the Go source file

```go
// WRONG - absolute paths don't work
//go:embed /etc/config.json

// WRONG - parent directories don't work
//go:embed ../shared/config.json

// CORRECT - relative to this source file
//go:embed config.json
```

---

## Summary

The `embed` package provides several ways to bundle files:

| Variable Type | Usage |
|--------------|-------|
| `string` | Single text file |
| `[]byte` | Single binary file |
| `embed.FS` | Multiple files/directories |

**Best Practices:**

1. Use `embed.FS` for multiple related files
2. Use `fs.Sub()` to create clean path prefixes
3. Consider build tags for development mode
4. Embed configuration defaults, override at runtime
5. Be mindful of binary size with large assets

---

*Deploying Go applications? [OneUptime](https://oneuptime.com) helps you monitor your services with distributed tracing and real-time alerts, ensuring your embedded assets are served correctly.*
