# How to Set Up a Go Development Environment with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Go, Golang, Development Environment, Docker, Air, Hot Reload

Description: Learn how to set up a Go development environment with live reload using Air in a Docker container managed by Portainer.

---

Go's fast compilation makes containerized development practical. Using `air` for live reload gives you near-instant feedback on code changes without leaving your Docker environment managed by Portainer.

## Dev Environment Compose Stack

```yaml
services:
  go-dev:
    image: golang:1.26-alpine
    restart: unless-stopped
    ports:
      - "8080:8080"    # Application
      - "2345:2345"    # Delve debugger
    environment:
      CGO_ENABLED: "0"
      GOPATH: /go
    volumes:
      - /path/to/your/project:/app
      # Cache Go modules to speed up builds
      - go_module_cache:/go/pkg/mod
    working_dir: /app
    # Install air (live reload) and run it
    command: >
      sh -c "
        go install github.com/air-verse/air@latest &&
        go install github.com/go-delve/delve/cmd/dlv@latest &&
        air
      "

volumes:
  go_module_cache:
```

## Air Configuration

Create `.air.toml` in your project root:

```toml
# .air.toml

root = "."
tmp_dir = "tmp"

[build]
  # Command to build the app
  cmd = "go build -gcflags='all=-N -l' -o ./tmp/main ./src"
  # Binary to run after build
  entrypoint = ["./tmp/main"]
  # Watch these directories
  include_dir = ["src", "internal", "pkg"]
  # Exclude these
  exclude_dir = ["tmp", "vendor"]
  # Watch these file extensions
  include_ext = ["go", "tpl", "tmpl", "html"]

[log]
  time = true
```

## Simple Go HTTP Server

```go
// src/main.go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "os"
)

func main() {
    mux := http.NewServeMux()

    mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
    })

    mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        // Edit and save - air reloads automatically
        w.Write([]byte("Go development environment ready"))
    })

    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    log.Printf("Starting server on :%s", port)
    log.Fatal(http.ListenAndServe(":"+port, mux))
}
```

## Remote Debugging with Delve

```bash
# Start with Delve instead of air:
# dlv debug ./src --headless --listen=:2345 --api-version=2 --accept-multiclient

# VS Code launch.json
{
  "type": "go",
  "debugAdapter": "dlv-dap",
  "request": "attach",
  "mode": "remote",
  "port": 2345,
  "host": "127.0.0.1",
  "substitutePath": [
    {
      "from": "${workspaceFolder}",
      "to": "/app"
    }
  ]
}
```
