# How to Use Go Embed for Static File Bundling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Embed, Static Files, Web Server, Deployment

Description: A practical guide to using Go's embed package to bundle static files and templates into your binary.

---

One of Go's most underrated features is the `embed` package, introduced in Go 1.16. It solves a problem that Go developers struggled with for years - how to bundle static files like HTML templates, CSS, JavaScript, images, and configuration files directly into your binary.

Before `embed`, you had to either ship files alongside your binary, use third-party tools like `go-bindata`, or write custom code generation scripts. None of these options were elegant. Now, with a few lines of code, you can create truly self-contained applications that are trivial to deploy.

## Why Embed Static Files?

Embedding files into your binary offers several advantages:

**Single binary deployment** - You ship one file. No missing assets, no broken paths, no "works on my machine" issues. Copy the binary to any server and it runs.

**Atomic updates** - When you update your application, everything updates together. No version mismatches between code and templates.

**Simpler containers** - Your Dockerfile becomes a `FROM scratch` dream. No need to copy asset directories or manage volume mounts for static content.

**Easier testing** - Tests run against the same embedded files that production uses. No path manipulation needed.

The trade-off is binary size. If you embed a 50MB video file, your binary grows by 50MB. For most web applications with CSS, JS, and templates, this is rarely a concern.

## The Basics of embed.FS

The `embed` package provides the `embed.FS` type, which implements `io.FS` - the standard filesystem interface. This means embedded files work seamlessly with any Go code that accepts an `io.FS`, including `http.FileServer`, `template.ParseFS`, and `fs.WalkDir`.

Here's the simplest possible example:

```go
package main

import (
    "embed"
    "fmt"
)

// The go:embed directive tells the compiler to embed config.json
// at compile time. The file must exist relative to this source file.
//go:embed config.json
var configFile string

func main() {
    fmt.Println(configFile)
}
```

A few things to note about the directive:

- It must be a comment directly before a variable declaration
- There's no space between `//` and `go:embed`
- The path is relative to the source file containing the directive
- You can embed into `string`, `[]byte`, or `embed.FS`

## Embedding Single Files

For single files, you can embed directly into a string or byte slice:

```go
package main

import (
    _ "embed"
    "fmt"
)

// Embed as a string - useful for text files like configs or SQL
//go:embed schema.sql
var schemaSQL string

// Embed as bytes - useful for binary files like images
//go:embed logo.png
var logoPNG []byte

func main() {
    // schemaSQL contains the entire file content as a string
    fmt.Printf("Schema length: %d characters\n", len(schemaSQL))
    
    // logoPNG contains raw bytes of the PNG file
    fmt.Printf("Logo size: %d bytes\n", len(logoPNG))
}
```

Notice the blank import of `embed`. When embedding into `string` or `[]byte`, you need this import even though you don't reference the package directly. When using `embed.FS`, the import happens naturally.

## Embedding Directories

For multiple files or entire directories, use `embed.FS`:

```go
package main

import (
    "embed"
    "fmt"
    "io/fs"
)

// Embed the entire static directory and everything inside it.
// The path "static" is relative to this Go file.
//go:embed static
var staticFiles embed.FS

func main() {
    // Walk through all embedded files and print their paths
    fs.WalkDir(staticFiles, ".", func(path string, d fs.DirEntry, err error) error {
        if err != nil {
            return err
        }
        if !d.IsDir() {
            fmt.Println(path)
        }
        return nil
    })
}
```

You can also use glob patterns:

```go
// Embed all HTML files in the templates directory
//go:embed templates/*.html
var templates embed.FS

// Embed multiple directories
//go:embed static css js
var assets embed.FS

// Embed specific file types across directories
//go:embed images/*.png images/*.jpg
var images embed.FS
```

One gotcha - by default, `embed` ignores files starting with `.` or `_`. To include them, use the `all:` prefix:

```go
// Include hidden files like .htaccess
//go:embed all:static
var staticWithHidden embed.FS
```

## Serving Embedded Files with http.FileServer

This is where `embed` really shines. Serving a complete web application from embedded files takes just a few lines:

```go
package main

import (
    "embed"
    "io/fs"
    "log"
    "net/http"
)

// Embed the entire web directory containing index.html, css/, js/, etc.
//go:embed web
var webContent embed.FS

func main() {
    // Sub extracts a subtree from the embedded filesystem.
    // This strips the "web" prefix so files are served from root.
    // Without this, you'd access /web/index.html instead of /index.html
    webFS, err := fs.Sub(webContent, "web")
    if err != nil {
        log.Fatal(err)
    }
    
    // Create a file server that serves from our embedded filesystem
    fileServer := http.FileServer(http.FS(webFS))
    
    // Serve static files at the root path
    http.Handle("/", fileServer)
    
    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

The `fs.Sub` call is important. Without it, the embedded path includes the directory name. If your structure is:

```
main.go
web/
  index.html
  css/
    style.css
```

Without `fs.Sub`, you'd need to access `http://localhost:8080/web/index.html`. With `fs.Sub(webContent, "web")`, you access `http://localhost:8080/index.html` directly.

## Embedding HTML Templates

Go's `html/template` package has built-in support for `io.FS`, making template embedding straightforward:

```go
package main

import (
    "embed"
    "html/template"
    "log"
    "net/http"
)

// Embed all template files
//go:embed templates/*.html
var templateFS embed.FS

// Parse templates once at startup
var templates = template.Must(template.ParseFS(templateFS, "templates/*.html"))

// PageData holds data passed to templates
type PageData struct {
    Title   string
    Message string
    Items   []string
}

func homeHandler(w http.ResponseWriter, r *http.Request) {
    data := PageData{
        Title:   "Welcome",
        Message: "Hello from embedded templates!",
        Items:   []string{"Item 1", "Item 2", "Item 3"},
    }
    
    // Execute the specific template by name
    err := templates.ExecuteTemplate(w, "home.html", data)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
    }
}

func main() {
    http.HandleFunc("/", homeHandler)
    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

Your `templates/home.html` might look like:

```html
<!DOCTYPE html>
<html>
<head>
    <title>{{.Title}}</title>
</head>
<body>
    <h1>{{.Message}}</h1>
    <ul>
    {{range .Items}}
        <li>{{.}}</li>
    {{end}}
    </ul>
</body>
</html>
```

For nested templates with layouts, parse them together:

```go
// Embed base layout and all page templates
//go:embed templates/layout.html templates/pages/*.html
var templateFS embed.FS

// Parse layout with each page template
var templates = template.Must(template.ParseFS(templateFS, 
    "templates/layout.html", 
    "templates/pages/*.html",
))
```

## A Complete Web Server Example

Let's put it all together with a realistic example that serves both static assets and dynamic pages:

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

// Embed static assets: CSS, JavaScript, images
//go:embed static
var staticFS embed.FS

// Embed HTML templates
//go:embed templates/*.html
var templateFS embed.FS

// Parse templates at startup - fail fast if there's an error
var templates = template.Must(template.ParseFS(templateFS, "templates/*.html"))

// Application configuration embedded in the binary
//go:embed config.json
var configJSON []byte

// Config holds application settings
type Config struct {
    AppName    string `json:"app_name"`
    APIVersion string `json:"api_version"`
}

var appConfig Config

func init() {
    // Parse embedded config at startup
    if err := json.Unmarshal(configJSON, &appConfig); err != nil {
        log.Fatalf("Failed to parse config: %v", err)
    }
}

func homeHandler(w http.ResponseWriter, r *http.Request) {
    data := map[string]interface{}{
        "AppName": appConfig.AppName,
        "Version": appConfig.APIVersion,
    }
    templates.ExecuteTemplate(w, "index.html", data)
}

func main() {
    // Strip "static" prefix from embedded filesystem
    staticContent, err := fs.Sub(staticFS, "static")
    if err != nil {
        log.Fatal(err)
    }
    
    // Serve static files under /static/ path
    http.Handle("/static/", http.StripPrefix("/static/", 
        http.FileServer(http.FS(staticContent))))
    
    // Dynamic routes
    http.HandleFunc("/", homeHandler)
    
    log.Printf("%s starting on :8080", appConfig.AppName)
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

## Development vs Production Workflow

Embedded files are read at compile time. During development, this means recompiling every time you change a CSS file or template. That's annoying.

The solution is to use a build tag to switch between embedded and disk-based filesystems:

```go
// file: assets_prod.go
//go:build !dev

package main

import (
    "embed"
    "io/fs"
)

//go:embed static
var staticFS embed.FS

//go:embed templates
var templateFS embed.FS

// GetStaticFS returns the embedded static filesystem for production
func GetStaticFS() fs.FS {
    sub, _ := fs.Sub(staticFS, "static")
    return sub
}

// GetTemplateFS returns the embedded template filesystem for production
func GetTemplateFS() fs.FS {
    sub, _ := fs.Sub(templateFS, "templates")
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

// GetStaticFS returns the local static directory for development
// Changes are picked up without recompiling
func GetStaticFS() fs.FS {
    return os.DirFS("static")
}

// GetTemplateFS returns the local templates directory for development
func GetTemplateFS() fs.FS {
    return os.DirFS("templates")
}
```

Now your main code uses these functions:

```go
package main

import (
    "html/template"
    "io/fs"
    "log"
    "net/http"
)

var templates *template.Template

func init() {
    // Load templates from whichever filesystem is active
    var err error
    templates, err = template.ParseFS(GetTemplateFS(), "*.html")
    if err != nil {
        log.Fatal(err)
    }
}

func main() {
    http.Handle("/static/", http.StripPrefix("/static/", 
        http.FileServer(http.FS(GetStaticFS()))))
    // ... rest of setup
}
```

Build for development with live reload of assets:

```bash
go build -tags dev -o app
```

Build for production with embedded files:

```bash
go build -o app
```

## Build Considerations and Binary Size

Every embedded file increases your binary size by exactly the file's size plus a small amount of metadata. This is straightforward to measure:

```bash
# Build without embedding
go build -o app-minimal

# Build with embedding  
go build -o app-full

# Compare sizes
ls -lh app-minimal app-full
```

Some tips to keep binary size reasonable:

**Minify assets before building** - Run your CSS and JavaScript through minifiers. A 500KB JavaScript bundle minified to 100KB saves 400KB in your binary.

**Compress images** - Use tools like `pngquant` or `jpegoptim` before embedding. Better yet, convert to modern formats like WebP.

**Don't embed what you don't need** - Be specific with glob patterns. Embedding `static/*` when you only need `static/css/*` wastes space.

**Consider external CDN for large assets** - Large video files or huge image galleries might be better served from a CDN. Embed only what's essential for the application to function.

You can inspect what's actually embedded in your binary:

```bash
# List embedded files (requires Go 1.18+)
go list -f '{{.EmbedFiles}}' ./...
```

## Error Handling and Validation

Embedded files can't be missing at runtime - the compiler ensures they exist. But you should still validate content:

```go
package main

import (
    "embed"
    "encoding/json"
    "log"
)

//go:embed config.json
var configJSON []byte

type Config struct {
    Required string `json:"required"`
}

func init() {
    var cfg Config
    if err := json.Unmarshal(configJSON, &cfg); err != nil {
        // This catches malformed JSON that exists but is invalid
        log.Fatalf("Invalid embedded config: %v", err)
    }
    if cfg.Required == "" {
        log.Fatal("Config missing required field")
    }
}
```

For templates, parse them at startup and fail fast:

```go
// template.Must panics if parsing fails - exactly what you want at startup
var templates = template.Must(template.ParseFS(templateFS, "templates/*.html"))
```

## Wrapping Up

Go's `embed` package turns deployment from a potential headache into a non-issue. One binary, zero external dependencies, works everywhere Go runs.

The pattern I use for most web applications:

1. Embed static assets (CSS, JS, images) and serve via `http.FileServer`
2. Embed HTML templates and parse with `template.ParseFS`
3. Embed configuration files for defaults
4. Use build tags to switch to disk-based files during development

This gives you the best of both worlds - fast iteration during development and bulletproof deployment in production.

Start with the basics, embed a single template file, and build from there. Once you see how clean the deployment becomes, you'll wonder why you ever dealt with asset path issues.

---

*Deploy single-binary Go applications monitored by [OneUptime](https://oneuptime.com) - no external dependencies needed.*
