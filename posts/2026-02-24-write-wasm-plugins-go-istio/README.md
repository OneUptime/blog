# How to Write Wasm Plugins in Go for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebAssembly, Go, TinyGo, Envoy

Description: A guide to writing WebAssembly plugins for Istio using Go and TinyGo with the proxy-wasm Go SDK for custom traffic processing.

---

If your team is already working in Go, you can write Wasm plugins for Istio in Go using the proxy-wasm Go SDK and TinyGo compiler. Go plugins are typically larger than Rust ones and have some limitations, but they let you leverage your existing Go knowledge and ecosystem. This post covers the full workflow from setup to deployment.

## Why Go for Wasm Plugins

Go is a natural choice if:

- Your team already writes Go and does not want to learn Rust
- You have existing Go libraries for business logic you want to reuse
- You prefer Go's simpler syntax and error handling
- You are building a prototype and want to move fast

The tradeoffs compared to Rust:

- **Larger binaries**: Go Wasm modules are typically 1-5MB vs 100-500KB for Rust
- **Higher memory usage**: Go's runtime and garbage collector add overhead
- **TinyGo required**: Standard Go does not compile to wasm32-wasi. You need TinyGo, which has a subset of the standard library

## Setting Up the Development Environment

```bash
# Install Go (if not already installed)
brew install go  # macOS
# or download from https://go.dev/dl/

# Install TinyGo
brew tap tinygo-org/tools
brew install tinygo

# Verify TinyGo
tinygo version
```

TinyGo is required because the standard Go compiler does not support the `wasm32-wasi` target that Envoy expects. TinyGo compiles Go code to compact Wasm modules.

## Creating the Project

```bash
mkdir istio-go-plugin
cd istio-go-plugin
go mod init github.com/myorg/istio-go-plugin
```

Add the proxy-wasm Go SDK:

```bash
go get github.com/tetratelabs/proxy-wasm-go-sdk
```

## Writing Your First Plugin

Create `main.go`:

```go
package main

import (
	"encoding/json"

	"github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm"
	"github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm/types"
)

func main() {
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
	data, err := proxywasm.GetPluginConfiguration()
	if err != nil {
		proxywasm.LogWarnf("failed to get plugin config: %v", err)
		// Use defaults
		ctx.config = pluginConfig{
			HeaderName:  "x-wasm-plugin",
			HeaderValue: "go-plugin",
		}
		return types.OnPluginStartStatusOK
	}

	if err := json.Unmarshal(data, &ctx.config); err != nil {
		proxywasm.LogErrorf("failed to parse plugin config: %v", err)
		return types.OnPluginStartStatusFailed
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

## Building with TinyGo

```bash
tinygo build -o plugin.wasm -scheduler=none -target=wasi ./main.go
```

The key flags:

- `-scheduler=none`: Disables Go's goroutine scheduler (not needed in Wasm context)
- `-target=wasi`: Compiles to the wasm32-wasi target

Check the binary size:

```bash
ls -lh plugin.wasm
```

Go Wasm plugins are typically 1-5MB. You can reduce the size:

```bash
# Strip debug info and optimize
tinygo build -o plugin.wasm -scheduler=none -target=wasi -no-debug ./main.go

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

	"github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm"
	"github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm/types"
)

func main() {
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

	body := []byte(`{"token":"` + token + `"}`)

	_, err := proxywasm.DispatchHttpCall(
		"auth-service.default.svc.cluster.local",
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
	status, _ := proxywasm.GetHttpCallResponseHeader(":status")

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

## TinyGo Limitations

Be aware of these TinyGo limitations when writing plugins:

- **No reflection**: Many Go libraries that rely on reflection will not work
- **Limited standard library**: Some packages like `net/http`, `os`, and `io/fs` are not available
- **No goroutines in Wasm**: The `scheduler=none` flag means goroutines do not work. All code runs synchronously.
- **Some cgo libraries do not work**: C bindings are not available in the Wasm environment

Libraries that work well with TinyGo and Wasm:
- `encoding/json` (basic usage)
- `strings`
- `strconv`
- `fmt` (limited)

## Summary

Writing Wasm plugins in Go with TinyGo is a practical option for teams with Go expertise. The proxy-wasm Go SDK follows the same architectural patterns as the Rust SDK (VMContext, PluginContext, HttpContext), making it straightforward to port concepts between languages. The main tradeoffs are larger binary sizes and some standard library limitations from TinyGo. For most plugin use cases - authentication, header manipulation, logging, and request validation - Go works well.
