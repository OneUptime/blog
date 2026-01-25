# How to Bundle Static Assets into Go Binaries with go:embed

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, go:embed, Static Assets, Binary, Deployment

Description: Learn how to use Go's built-in embed directive to bundle static files like HTML, CSS, JavaScript, and images directly into your compiled binary for simpler deployments and distribution.

---

One of Go's most compelling features is the ability to compile your entire application into a single binary. No runtime dependencies, no external files to manage - just copy the binary to your server and run it. But historically, if your application needed static assets like HTML templates, CSS files, or images, you had to ship those separately. That changed with Go 1.16, which introduced the `embed` package.

The `go:embed` directive lets you include files and directories directly in your compiled binary. The result is a self-contained executable that carries everything it needs. This matters for CLI tools, web servers, and any application where deployment simplicity is a priority.

## Why Embed Static Assets?

Before diving into the how, let's talk about the why. Embedding assets solves several real problems:

**Simplified deployment.** Instead of managing a binary plus a folder of assets, you deploy one file. No more "works on my machine" issues where someone forgot to copy the templates directory.

**Atomic updates.** When you update your application, assets and code update together. There's no window where you have a new binary running against old templates.

**Easier distribution.** If you're building a CLI tool or desktop application, users download one file. No installer needed, no extraction step.

**Immutability.** Embedded files can't be accidentally modified on disk. What you compiled is what runs.

## Basic Usage: Embedding a Single File

The simplest case is embedding one file. Here's how it looks:

```go
package main

import (
    _ "embed"
    "fmt"
)

// The go:embed directive tells the compiler to include this file
//go:embed config.json
var configData string

func main() {
    // configData now contains the entire contents of config.json
    fmt.Println(configData)
}
```

A few things to note:

- The `//go:embed` comment must appear directly before the variable declaration
- There's no space between `//` and `go:embed`
- You need to import `embed` - even if you only use the directive (hence the blank import)
- The variable can be `string` or `[]byte` for single files

If you want the raw bytes instead of a string:

```go
//go:embed logo.png
var logoBytes []byte
```

## Embedding Multiple Files and Directories

Real applications usually have more than one static file. The `embed.FS` type handles directories and multiple files:

```go
package main

import (
    "embed"
    "io/fs"
    "log"
    "net/http"
)

// Embed the entire static directory
//go:embed static/*
var staticFiles embed.FS

func main() {
    // Serve files from the embedded filesystem
    // Sub() strips the "static" prefix so /style.css maps to static/style.css
    staticFS, err := fs.Sub(staticFiles, "static")
    if err != nil {
        log.Fatal(err)
    }

    http.Handle("/", http.FileServer(http.FS(staticFS)))
    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

The `embed.FS` type implements `io/fs.FS`, which means it works with the standard library's filesystem abstractions. You can use it with `http.FileServer`, template parsing, and anything else that accepts an `fs.FS`.

## Embedding HTML Templates

Web applications commonly use Go's `html/template` package. Here's how to embed and parse templates:

```go
package main

import (
    "embed"
    "html/template"
    "log"
    "net/http"
)

//go:embed templates/*.html
var templateFS embed.FS

// Parse templates once at startup
var templates = template.Must(template.ParseFS(templateFS, "templates/*.html"))

func homeHandler(w http.ResponseWriter, r *http.Request) {
    data := map[string]string{
        "Title":   "Welcome",
        "Message": "Hello from embedded templates!",
    }

    err := templates.ExecuteTemplate(w, "home.html", data)
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
    }
}

func main() {
    http.HandleFunc("/", homeHandler)
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

The `template.ParseFS` function understands glob patterns, so `templates/*.html` grabs all HTML files in that directory.

## Embedding Nested Directory Structures

For larger applications with deeply nested static files, you can embed entire directory trees:

```go
//go:embed web/dist
var webDist embed.FS
```

This embeds everything under `web/dist`, preserving the directory structure. A file at `web/dist/js/app.js` becomes accessible at that same path in the embedded filesystem.

You can also use multiple embed directives for the same variable:

```go
//go:embed static/css/*
//go:embed static/js/*
//go:embed static/images/*
var assets embed.FS
```

Or combine patterns on one line:

```go
//go:embed static/css/* static/js/* static/images/*
var assets embed.FS
```

## Pattern Matching Rules

The embed directive supports several pattern types:

- `file.txt` - exact file match
- `dir/*` - all files in a directory (not recursive)
- `dir/**` - not supported; use `dir` instead
- `dir` - the directory and all contents recursively

One gotcha: by default, files starting with `.` or `_` are excluded. If you need to embed something like `.gitkeep` or `_redirects`, use the `all:` prefix:

```go
//go:embed all:static
var staticFiles embed.FS
```

## Building a Self-Contained Web Server

Let's put it together with a complete example - a web server that embeds its entire frontend:

```go
package main

import (
    "embed"
    "encoding/json"
    "io/fs"
    "log"
    "net/http"
)

//go:embed frontend/build
var frontendFS embed.FS

//go:embed version.txt
var version string

func main() {
    // Strip the frontend/build prefix for cleaner URLs
    distFS, err := fs.Sub(frontendFS, "frontend/build")
    if err != nil {
        log.Fatal(err)
    }

    mux := http.NewServeMux()

    // API endpoint
    mux.HandleFunc("/api/version", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]string{"version": version})
    })

    // Serve embedded static files for everything else
    mux.Handle("/", http.FileServer(http.FS(distFS)))

    log.Printf("Starting server (version %s) on :8080", version)
    log.Fatal(http.ListenAndServe(":8080", mux))
}
```

Build this with `go build -o server .` and you get a single binary containing your entire frontend. Copy it to any Linux server and run it - no Node.js, no nginx, no Docker required.

## Development vs Production

During development, you probably want to edit static files without recompiling. A common pattern is to use a build tag:

```go
//go:build !dev

package main

import "embed"

//go:embed static
var staticFS embed.FS
```

Then create a `static_dev.go` file:

```go
//go:build dev

package main

import "os"

var staticFS = os.DirFS("static")
```

Build for production normally, but use `go run -tags dev .` during development to read files from disk.

## Binary Size Considerations

Embedded files increase your binary size directly - a 5MB image adds 5MB to the binary. For most web assets this is fine. The Go compiler doesn't compress embedded data, so if size matters, consider:

- Minifying CSS and JavaScript before embedding
- Compressing images appropriately
- Using gzip compression at the HTTP layer (the embedded files themselves stay uncompressed)

You can check what's embedded by examining the binary:

```bash
# See approximate size contribution
go build -o app .
ls -lh app
```

## Conclusion

The `go:embed` directive is one of those features that feels obvious in hindsight. It takes Go's "single binary deployment" story and extends it to applications with static assets. No more deployment scripts that copy files around, no more version mismatches between code and templates.

For web services, CLI tools, or any application where deployment simplicity matters, embedding your static assets makes the operational story much cleaner. Your binary is the deployment artifact. Copy it, run it, done.
