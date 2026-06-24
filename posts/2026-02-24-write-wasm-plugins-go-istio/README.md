# How to Write Wasm Plugins in Go for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebAssembly, Go, TinyGo, Envoy

Description: A guide to writing WebAssembly plugins for Istio using Go and TinyGo with the proxy-wasm Go SDK for custom traffic processing.

---

If your team is already working in Go, you can write Wasm plugins for Istio in Go using the proxy-wasm Go SDK and the standard Go compiler. Go plugins are typically larger than Rust ones and have some limitations, but they let you leverage your existing Go knowledge and ecosystem. This post covers the full workflow from setup to deployment.

## Why Go for Wasm Plugins

Go is a natural choice if:

- Your team already writes Go and does not want to learn Rust
- You have existing Go libraries for business logic you want to reuse
- You prefer Go's simpler syntax and error handling
- You are building a prototype and want to move fast

The tradeoffs compared to Rust:

- **Larger binaries**: Go Wasm modules are often several MB vs 100-500KB for Rust
- **Higher memory usage**: Go's runtime and garbage collector add overhead
- **Host requirements**: The current proxy-wasm Go SDK uses Go 1.24+ WASI reactors and requires a compatible host, such as Envoy 1.33.0 or later

## Setting Up the Development Environment

```bash
# Install Go 1.24 or later (if not already installed)

brew install go  # macOS
# or download from https://go.dev/dl/

# Verify Go
go version
```

Go 1.24 and later can build WASI reactor modules with `GOOS=wasip1`, `GOARCH=wasm`, and `-buildmode=c-shared`, which is what the current proxy-wasm Go SDK uses.

## Creating the Project

```bash
mkdir istio-go-plugin
cd istio-go-plugin
go mod init github.com/myorg/istio-go-plugin
```

Add the proxy-wasm Go SDK:

```bash
go get github.com/proxy-wasm/proxy-wasm-go-sdk
```

## Writing Your First Plugin

Create `main.go`:

```go
package main

import (
	"encoding/json"

	"github.com/proxy-wasm/proxy-wasm-go-sdk/proxywasm"
	"github.com/proxy-wasm/proxy-wasm-go-sdk/proxywasm/types"
)

func main() {}

func init() {
	proxywasm.SetVMContext(&vmContext{})
}

// vmContext implements types.VMContext
type vmContext struct {
	types.DefaultVMContext
}

func (*vmContext) NewPluginContext(contextID uint32) types.PluginContext {
	return &pluginContext{}
}

// pluginContext implements types.PluginContext (equivalent to RootContext in Rust)
type pluginContext struct {
	types.DefaultPluginContext
	config pluginConfig
}

type pluginConfig struct {
	HeaderName  string   `json:"header_name"`
	HeaderValue string   `json:"header_value"`
	BypassPaths []string `json:"bypass_paths"`
}

func (ctx *pluginContext) OnPluginStart(pluginConfigurationSize int) types.OnPluginStartStatus {
	ctx.config = pluginConfig{
		HeaderName:  "x-wasm-plugin",
		HeaderValue: "go-plugin",
	}

	data, err := proxywasm.GetPluginConfiguration()
	if err != nil {
		proxywasm.LogWarnf("failed to get plugin config: %v", err)
		return types.OnPluginStartStatusOK
	}
	if len(data) == 0 {
		return types.OnPluginStartStatusOK
	}

	if err := json.Unmarshal(data, &ctx.config); err != nil {
		proxywasm.LogErrorf("failed to parse plugin config: %v", err)
		return types.OnPluginStartStatusFailed
	}
	if ctx.config.HeaderName == "" {
		ctx.config.HeaderName = "x-wasm-plugin"
	}
	if ctx.config.HeaderValue == "" {
		ctx.config.HeaderValue = "go-plugin"
	}

	proxywasm.LogInfof("Plugin configured: header=%s, value=%s",
		ctx.config.HeaderName, ctx.config.HeaderValue)
	return types.OnPluginStartStatusOK
}

func (ctx *pluginContext) NewHttpContext(contextID uint32) types.HttpContext {
	return &httpContext{
		config: ctx.config,
	}
}

// httpContext implements types.HttpContext
type httpContext struct {
	types.DefaultHttpContext
	config pluginConfig
}

func (ctx *httpContext) OnHttpRequestHeaders(numHeaders int, endOfStream bool) types.Action {
	// Check bypass paths
	path, err := proxywasm.GetHttpRequestHeader(":path")
	if err == nil {
		for _, bp := range ctx.config.BypassPaths {
			if len(path) >= len(bp) && path[:len(bp)] == bp {
				return types.ActionContinue
			}
		}
	}

	return types.ActionContinue
}

func (ctx *httpContext) OnHttpResponseHeaders(numHeaders int, endOfStream bool) types.Action {
	err := proxywasm.AddHttpResponseHeader(ctx.config.HeaderName, ctx.config.HeaderValue)
	if err != nil {
		proxywasm.LogErrorf("failed to add response header: %v", err)
	}
	return types.ActionContinue
}
```

## Building with Go

```bash
GOOS=wasip1 GOARCH=wasm go build -buildmode=c-shared -o plugin.wasm ./main.go
```

The key flags:

- `GOOS=wasip1`: Compiles for the WASI Preview 1 target
- `GOARCH=wasm`: Compiles to WebAssembly
- `-buildmode=c-shared`: Builds a WASI reactor module for the proxy-wasm host

Check the binary size:

```bash
ls -lh plugin.wasm
```

Go Wasm plugins are often several MB. You can reduce the size:

```bash
# Strip debug info and optimize
GOOS=wasip1 GOARCH=wasm go build -buildmode=c-shared -ldflags="-s -w" -o plugin.wasm ./main.go

# Further optimize with wasm-opt
wasm-opt -O3 plugin.wasm -o plugin-optimized.wasm
```

## Building an API Key Validator in Go

Here is a more complete example that validates API keys:

```go
package main

import (
	"encoding/json"
	"strings"

	"github.com/proxy-wasm/proxy-wasm-go-sdk/proxywasm"
	"github.com/proxy-wasm/proxy-wasm-go-sdk/proxywasm/types"
)

func main() {}

func init() {
	proxywasm.SetVMContext(&vmContext{})
}

type vmContext struct {
	types.DefaultVMContext
}

func (*vmContext) NewPluginContext(contextID uint32) types.PluginContext {
	return &pluginContext{}
}

type pluginContext struct {
	types.DefaultPluginContext
	apiKeys     map[string]string // key -> client name
	headerName  string
	bypassPaths []string
}

func (ctx *pluginContext) OnPluginStart(pluginConfigurationSize int) types.OnPluginStartStatus {
	data, err := proxywasm.GetPluginConfiguration()
	if err != nil {
		proxywasm.LogErrorf("failed to get config: %v", err)
		return types.OnPluginStartStatusFailed
	}

	var config struct {
		APIKeys     map[string]string `json:"api_keys"`
		HeaderName  string            `json:"header_name"`
		BypassPaths []string          `json:"bypass_paths"`
	}

	if err := json.Unmarshal(data, &config); err != nil {
		proxywasm.LogErrorf("failed to parse config: %v", err)
		return types.OnPluginStartStatusFailed
	}

	ctx.apiKeys = config.APIKeys
	ctx.headerName = config.HeaderName
	if ctx.headerName == "" {
		ctx.headerName = "x-api-key"
	}
	ctx.bypassPaths = config.BypassPaths

	proxywasm.LogInfof("Loaded %d API keys", len(ctx.apiKeys))
	return types.OnPluginStartStatusOK
}

func (ctx *pluginContext) NewHttpContext(contextID uint32) types.HttpContext {
	return &authHttpContext{
		apiKeys:     ctx.apiKeys,
		headerName:  ctx.headerName,
		bypassPaths: ctx.bypassPaths,
	}
}

type authHttpContext struct {
	types.DefaultHttpContext
	apiKeys     map[string]string
	headerName  string
	bypassPaths []string
}

func (ctx *authHttpContext) OnHttpRequestHeaders(numHeaders int, endOfStream bool) types.Action {
	// Check bypass paths
	path, _ := proxywasm.GetHttpRequestHeader(":path")
	for _, bp := range ctx.bypassPaths {
		if strings.HasPrefix(path, bp) {
			return types.ActionContinue
		}
	}

	// Check API key
	apiKey, err := proxywasm.GetHttpRequestHeader(ctx.headerName)
	if err != nil || apiKey == "" {
		body := `{"error":"missing api key"}`
		proxywasm.SendHttpResponse(401, [][2]string{
			{"content-type", "application/json"},
		}, []byte(body), -1)
		return types.ActionPause
	}

	clientName, valid := ctx.apiKeys[apiKey]
	if !valid {
		body := `{"error":"invalid api key"}`
		proxywasm.SendHttpResponse(403, [][2]string{
			{"content-type", "application/json"},
		}, []byte(body), -1)
		return types.ActionPause
	}

	// Add client identity header
	proxywasm.ReplaceHttpRequestHeader("x-client-name", clientName)
	// Remove API key header
	proxywasm.RemoveHttpRequestHeader(ctx.headerName)

	return types.ActionContinue
}
```

## Working with Request Bodies in Go

```go
func (ctx *httpContext) OnHttpRequestHeaders(numHeaders int, endOfStream bool) types.Action {
	// Remove Content-Length before changing the body size.
	if err := proxywasm.RemoveHttpRequestHeader("content-length"); err != nil {
		proxywasm.LogWarnf("failed to remove content-length: %v", err)
	}
	return types.ActionContinue
}

func (ctx *httpContext) OnHttpRequestBody(bodySize int, endOfStream bool) types.Action {
	if !endOfStream {
		// Wait for the complete body
		return types.ActionPause
	}

	body, err := proxywasm.GetHttpRequestBody(0, bodySize)
	if err != nil {
		proxywasm.LogErrorf("failed to get request body: %v", err)
		return types.ActionContinue
	}

	// Parse JSON body
	var data map[string]interface{}
	if err := json.Unmarshal(body, &data); err != nil {
		proxywasm.LogWarnf("request body is not valid JSON: %v", err)
		return types.ActionContinue
	}

	// Modify the body
	data["processed"] = true
	data["timestamp"] = "2024-01-01T00:00:00Z" // placeholder

	newBody, err := json.Marshal(data)
	if err != nil {
		proxywasm.LogErrorf("failed to marshal modified body: %v", err)
		return types.ActionContinue
	}

	if err := proxywasm.ReplaceHttpRequestBody(newBody); err != nil {
		proxywasm.LogErrorf("failed to replace body: %v", err)
	}

	return types.ActionContinue
}
```

## Making HTTP Callouts in Go

```go
func (ctx *httpContext) OnHttpRequestHeaders(numHeaders int, endOfStream bool) types.Action {
	token, _ := proxywasm.GetHttpRequestHeader("authorization")

	headers := [][2]string{
		{":method", "POST"},
		{":path", "/validate"},
		{":authority", "auth-service.default.svc.cluster.local"},
		{"content-type", "application/json"},
	}

	body, err := json.Marshal(map[string]string{"token": token})
	if err != nil {
		proxywasm.LogErrorf("failed to marshal auth request: %v", err)
		proxywasm.SendHttpResponse(500, nil, []byte("auth request failed"), -1)
		return types.ActionPause
	}

	_, err = proxywasm.DispatchHttpCall(
		"outbound|80||auth-service.default.svc.cluster.local",
		headers,
		body,
		nil,
		5000, // timeout in milliseconds
		ctx.onAuthResponse,
	)

	if err != nil {
		proxywasm.LogErrorf("dispatch failed: %v", err)
		proxywasm.SendHttpResponse(500, nil, []byte("auth service unavailable"), -1)
		return types.ActionPause
	}

	return types.ActionPause
}

func (ctx *httpContext) onAuthResponse(numHeaders, bodySize, numTrailers int) {
	headers, err := proxywasm.GetHttpCallResponseHeaders()
	if err != nil {
		proxywasm.LogErrorf("failed to get auth response headers: %v", err)
		proxywasm.SendHttpResponse(500, nil, []byte("auth service unavailable"), -1)
		return
	}

	status := ""
	for _, header := range headers {
		if header[0] == ":status" {
			status = header[1]
			break
		}
	}

	if status == "200" {
		proxywasm.ResumeHttpRequest()
	} else {
		proxywasm.SendHttpResponse(403, nil, []byte("unauthorized"), -1)
	}
}
```

## Deploying the Go Plugin

```yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: go-auth-plugin
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: api-gateway
  url: oci://registry.example.com/plugins/go-auth:v1.0
  phase: AUTHN
  failStrategy: FAIL_CLOSE
  pluginConfig:
    header_name: x-api-key
    bypass_paths:
    - /health
    - /ready
    api_keys:
      key-abc-123: mobile-app
      key-def-456: web-frontend
```

## Go Wasm Plugin Limitations

Be aware of these limitations when writing Go Wasm plugins:

- **Compatible host required**: The current proxy-wasm Go SDK requires Go 1.24+ and a host with the required proxy-wasm imports, such as Envoy 1.33.0 or later
- **Sandboxed runtime**: Packages that depend on arbitrary local files, sockets, processes, or host OS access are not useful unless the host explicitly exposes those capabilities
- **Use proxy-wasm APIs for network calls**: Plugins should make outbound calls through `DispatchHttpCall` to configured Envoy clusters, not through `net/http`
- **Some cgo libraries do not work**: C bindings are not available in the Wasm environment

Libraries that work well with Go and Wasm:
- `encoding/json`
- `strings`
- `strconv`
- `fmt`

## Summary

Writing Wasm plugins in Go is a practical option for teams with Go expertise. The proxy-wasm Go SDK follows the same architectural patterns as the Rust SDK (VMContext, PluginContext, HttpContext), making it straightforward to port concepts between languages. The main tradeoffs are larger binary sizes and runtime constraints from the Wasm host environment. For most plugin use cases - authentication, header manipulation, logging, and request validation - Go works well.
