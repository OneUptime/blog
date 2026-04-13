# How to Use Wasm Middleware in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Middleware, WebAssembly, WASM, HTTP

Description: Learn how to configure the Dapr Wasm middleware to run custom request and response transformation logic compiled to WebAssembly in the Dapr HTTP pipeline.

---

## Introduction

The Dapr Wasm middleware (`middleware.http.wasm`) executes WebAssembly modules in the HTTP request pipeline using the [http-wasm](https://http-wasm.io/) HTTP Handler ABI. This lets you write custom middleware logic in TinyGo (or any language that implements the http-wasm guest ABI) and run it inside the Dapr sidecar without modifying your application. Under the hood, Dapr uses the [wazero](https://wazero.io/) WebAssembly runtime, which requires no CGO dependencies.

## Use Cases

- Request header injection or validation
- Response body transformation
- Custom authentication logic
- Request logging and tracing enrichment

## Writing a Wasm Middleware in TinyGo

Dapr Wasm middleware guests must implement the [http-wasm HTTP Handler ABI](https://http-wasm.io/http-handler-abi/). The easiest way to do this is with the [`http-wasm-guest-tinygo`](https://github.com/http-wasm/http-wasm-guest-tinygo) SDK.

```go
// middleware/main.go
package main

import (
    "strings"

    "github.com/http-wasm/http-wasm-guest-tinygo/handler"
    "github.com/http-wasm/http-wasm-guest-tinygo/handler/api"
)

func main() {
    handler.HandleRequestFn = handleRequest
}

// handleRequest is called on every inbound HTTP request.
// Return next=true to continue to the next handler, or false to stop.
func handleRequest(req api.Request, resp api.Response) (next bool, reqCtx uint32) {
    // Add a custom header to the request
    req.Headers().Set("X-Processed-By", "dapr-wasm")

    // Example: rewrite a URI prefix
    if uri := req.GetURI(); strings.HasPrefix(uri, "/v2") {
        req.SetURI("/v1" + uri[3:])
    }

    next = true // continue processing
    return
}
```

## Compiling to Wasm with TinyGo

```bash
tinygo build \
  -o middleware.wasm \
  -scheduler=none \
  --no-debug \
  -target=wasi \
  ./middleware/
```

## Language Support

Currently, the only official http-wasm guest SDK is for TinyGo ([`http-wasm-guest-tinygo`](https://github.com/http-wasm/http-wasm-guest-tinygo)). In theory, any language that compiles to Wasm and implements the [http-wasm HTTP Handler ABI](https://http-wasm.io/http-handler-abi/) can be used, but no official guest SDKs exist yet for Rust, C, or AssemblyScript.

## Component Configuration

```yaml
# components/wasm-middleware.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: wasm-middleware
spec:
  type: middleware.http.wasm
  version: v1
  metadata:
    - name: url
      value: "file://./middleware/middleware.wasm"
```

## Loading Wasm from HTTP

```yaml
metadata:
  - name: url
    value: "https://my-storage.example.com/middleware.wasm"
```

## Pipeline Configuration

```yaml
# config/wasm-pipeline.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: wasm-pipeline
spec:
  httpPipeline:
    handlers:
      - name: wasm-middleware
        type: middleware.http.wasm
```

## Running the App

```bash
dapr run \
  --app-id wasm-service \
  --app-port 8080 \
  --config ./config/wasm-pipeline.yaml \
  --components-path ./components \
  -- python app.py
```

## Testing the Wasm Middleware

```bash
curl -v http://localhost:3500/v1.0/invoke/wasm-service/method/hello

# Check that the custom header was injected
# < X-Processed-By: dapr-wasm
```

## Benefits of Wasm Middleware

- Sandboxed execution: Wasm runs in a secure sandbox via the wazero runtime
- High performance: near-native execution speed with no CGO dependencies
- Portable: the same `.wasm` file runs on any platform Dapr supports
- Extensible: the http-wasm ABI is an open standard, and additional language SDKs can be added over time

## Summary

Dapr Wasm middleware extends the sidecar pipeline with custom WebAssembly logic using the http-wasm HTTP Handler ABI. Write your middleware in TinyGo using the `http-wasm-guest-tinygo` SDK, compile it to a `.wasm` binary, reference it in the component YAML, and attach it to the HTTP pipeline. This provides a sandboxed way to add custom request processing without modifying your application or the Dapr sidecar source code.
