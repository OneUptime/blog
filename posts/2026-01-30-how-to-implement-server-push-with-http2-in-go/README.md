# How to Implement Server Push with HTTP/2 in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, HTTP/2, Performance, Web

Description: Learn how to implement HTTP/2 server push in Go to preemptively send resources to clients and improve page load times.

---

HTTP/2 server push allows your server to send resources to the client before the client even requests them. This can significantly reduce page load times by eliminating round trips for critical assets like CSS, JavaScript, and fonts. Go's standard library has built-in support for HTTP/2 server push through the `http.Pusher` interface.

## TLS Requirements for HTTP/2

HTTP/2 requires TLS in practice. While the HTTP/2 specification allows unencrypted connections, browsers only support HTTP/2 over HTTPS. You will need a valid TLS certificate. For development, you can generate a self-signed certificate:

```bash
# Generate a self-signed certificate for development
openssl req -x509 -newkey rsa:2048 -keyout server.key -out server.crt -days 365 -nodes -subj "/CN=localhost"
```

## Setting Up an HTTP/2 Server in Go

Go's `net/http` package automatically uses HTTP/2 when you serve over TLS. Here is a basic setup:

```go
package main

import (
    "log"
    "net/http"
)

func main() {
    mux := http.NewServeMux()

    // Register handlers
    mux.HandleFunc("/", handleIndex)
    mux.HandleFunc("/static/style.css", handleCSS)
    mux.HandleFunc("/static/app.js", handleJS)

    // Start HTTPS server - HTTP/2 is enabled automatically with TLS
    log.Println("Starting server on https://localhost:8443")
    err := http.ListenAndServeTLS(":8443", "server.crt", "server.key", mux)
    if err != nil {
        log.Fatal(err)
    }
}
```

## Using the http.Pusher Interface

The `http.Pusher` interface is the key to server push. You obtain it by type-asserting the `http.ResponseWriter`. Here is how to check if the client supports push and send resources:

```go
func handleIndex(w http.ResponseWriter, r *http.Request) {
    // Check if the ResponseWriter supports Push
    pusher, ok := w.(http.Pusher)
    if ok {
        // Push CSS file to the client
        // The browser will receive this before it parses the HTML
        if err := pusher.Push("/static/style.css", nil); err != nil {
            log.Printf("Failed to push CSS: %v", err)
        }

        // Push JavaScript file
        if err := pusher.Push("/static/app.js", nil); err != nil {
            log.Printf("Failed to push JS: %v", err)
        }
    }

    // Serve the HTML page
    w.Header().Set("Content-Type", "text/html")
    w.Write([]byte(indexHTML))
}
```

The second parameter to `Push()` is `*http.PushOptions`, which lets you customize headers for the pushed request:

```go
// Push with custom headers
opts := &http.PushOptions{
    Header: http.Header{
        "Accept-Encoding": r.Header["Accept-Encoding"],
    },
}
pusher.Push("/static/style.css", opts)
```

## Complete Working Example

Here is a full example that demonstrates server push with an HTML page, CSS, and JavaScript:

```go
package main

import (
    "log"
    "net/http"
)

// HTML page that references CSS and JS files
const indexHTML = `<!DOCTYPE html>
<html>
<head>
    <title>HTTP/2 Server Push Demo</title>
    <link rel="stylesheet" href="/static/style.css">
</head>
<body>
    <h1>HTTP/2 Server Push Demo</h1>
    <p>This page was served with HTTP/2 server push.</p>
    <p>The CSS and JS files were pushed before you requested them.</p>
    <script src="/static/app.js"></script>
</body>
</html>`

const styleCSS = `body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    max-width: 800px;
    margin: 50px auto;
    padding: 20px;
    background-color: #f5f5f5;
}
h1 { color: #333; }
p { color: #666; line-height: 1.6; }`

const appJS = `console.log("App loaded - this script was pushed via HTTP/2");
document.addEventListener("DOMContentLoaded", function() {
    console.log("DOM ready");
});`

func handleIndex(w http.ResponseWriter, r *http.Request) {
    // Only push on the initial page request, not on subsequent requests
    if r.URL.Path != "/" {
        http.NotFound(w, r)
        return
    }

    // Attempt to get the Pusher interface
    pusher, ok := w.(http.Pusher)
    if ok {
        log.Println("Client supports HTTP/2 push, pushing assets...")

        // Push critical CSS - this eliminates one round trip
        if err := pusher.Push("/static/style.css", nil); err != nil {
            log.Printf("Push failed for style.css: %v", err)
        }

        // Push JavaScript needed for page functionality
        if err := pusher.Push("/static/app.js", nil); err != nil {
            log.Printf("Push failed for app.js: %v", err)
        }
    } else {
        log.Println("Client does not support HTTP/2 push")
    }

    w.Header().Set("Content-Type", "text/html; charset=utf-8")
    w.Write([]byte(indexHTML))
}

func handleCSS(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "text/css")
    w.Header().Set("Cache-Control", "public, max-age=86400")
    w.Write([]byte(styleCSS))
}

func handleJS(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/javascript")
    w.Header().Set("Cache-Control", "public, max-age=86400")
    w.Write([]byte(appJS))
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/", handleIndex)
    mux.HandleFunc("/static/style.css", handleCSS)
    mux.HandleFunc("/static/app.js", handleJS)

    log.Println("Starting HTTP/2 server on https://localhost:8443")
    log.Println("Open your browser and check the Network tab to see pushed resources")

    err := http.ListenAndServeTLS(":8443", "server.crt", "server.key", mux)
    if err != nil {
        log.Fatal("Server failed to start: ", err)
    }
}
```

## When to Use Server Push

Server push works best for critical resources that you know the client will need:

- **CSS files** - Push stylesheets to prevent render-blocking
- **JavaScript** - Push scripts needed for initial page functionality
- **Fonts** - Push web fonts to avoid flash of unstyled text
- **Above-the-fold images** - Push hero images or logos

Avoid pushing resources that:
- Are already in the browser cache (the browser will cancel the push)
- Are not needed for initial render
- Are large files that could delay other critical resources

## Verifying Server Push

To verify that server push is working, open Chrome DevTools, go to the Network tab, and look for resources with "Push" in the Initiator column. You can also use `curl` with verbose output:

```bash
curl -v --http2 -k https://localhost:8443/
```

Look for frames marked as `PUSH_PROMISE` in the output.

## Conclusion

HTTP/2 server push is straightforward to implement in Go thanks to the `http.Pusher` interface. By pushing critical assets like CSS and JavaScript, you can eliminate round trips and improve page load times. Remember that HTTP/2 requires TLS, and always check if the client supports push before attempting to use it.
