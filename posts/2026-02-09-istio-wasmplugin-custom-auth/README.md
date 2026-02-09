# How to Use Istio WasmPlugin to Add Custom Authentication Logic at the Proxy Level

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, WebAssembly, WASM, Authentication, Envoy, Proxy

Description: Learn how to extend Istio with custom authentication logic using WebAssembly plugins to implement specialized security requirements beyond standard JWT and mTLS authentication.

---

While Istio provides built-in JWT and mTLS authentication, some scenarios require custom logic like proprietary token formats, legacy authentication schemes, or complex validation rules. WebAssembly (Wasm) plugins let you inject custom authentication code into Envoy proxies without modifying Istio or rebuilding containers.

## Understanding Wasm Plugins in Istio

WebAssembly is a portable binary format that runs in sandboxed environments. Istio's WasmPlugin resource loads Wasm modules into Envoy proxies where they process requests and responses. This extends proxy functionality without changing the underlying platform.

Wasm plugins run at the proxy level, intercepting every request before it reaches your application. They can inspect headers, validate credentials, call external services, modify requests, and reject unauthorized access. The plugin code runs efficiently in the same process as Envoy.

This approach is more performant than sidecar containers and more flexible than Envoy filters written in C++. You write plugins in languages like Rust, Go, or C++ that compile to Wasm.

## Prerequisites

You need a Kubernetes cluster with Istio 1.12 or later:

```bash
istioctl install --set profile=demo
kubectl label namespace default istio-injection=enabled
```

Install Rust and TinyGo for Wasm development (optional if using pre-built modules):

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-wasi

# TinyGo
wget https://github.com/tinygo-org/tinygo/releases/download/v0.30.0/tinygo_0.30.0_amd64.deb
sudo dpkg -i tinygo_0.30.0_amd64.deb
```

## Building a Simple Authentication Plugin

Create a Wasm plugin that validates custom authentication tokens. Here's a Go example using TinyGo:

```go
// main.go
package main

import (
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
}

func (*pluginContext) NewHttpContext(contextID uint32) types.HttpContext {
	return &httpContext{}
}

type httpContext struct {
	types.DefaultHttpContext
}

func (ctx *httpContext) OnHttpRequestHeaders(numHeaders int, endOfStream bool) types.Action {
	// Get custom auth token from header
	token, err := proxywasm.GetHttpRequestHeader("x-custom-auth")
	if err != nil {
		proxywasm.LogWarn("No auth token found")
		return types.ActionContinue
	}

	// Validate token (simple example - check prefix)
	if len(token) < 10 || token[:4] != "CAT-" {
		proxywasm.LogWarn("Invalid token format")
		proxywasm.SendHttpResponse(401, [][2]string{
			{"content-type", "application/json"},
		}, []byte(`{"error":"unauthorized"}`), -1)
		return types.ActionPause
	}

	// Extract user ID from token
	userID := token[4:]

	// Add user ID to request header for upstream service
	proxywasm.AddHttpRequestHeader("x-user-id", userID)
	proxywasm.LogInfo("Authenticated user: " + userID)

	return types.ActionContinue
}
```

Build the Wasm module:

```bash
tinygo build -o custom-auth.wasm -scheduler=none -target=wasi main.go
```

## Deploying the Wasm Plugin

Push the Wasm module to a container registry or serve it from HTTP:

```bash
# Build container with Wasm module
cat <<EOF > Dockerfile
FROM scratch
COPY custom-auth.wasm /plugin.wasm
EOF

docker build -t your-registry/custom-auth-wasm:v1 .
docker push your-registry/custom-auth-wasm:v1
```

Create a WasmPlugin resource:

```yaml
# wasmplugin-custom-auth.yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: custom-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  url: oci://your-registry/custom-auth-wasm:v1
  phase: AUTHN
  pluginConfig:
    # Configuration passed to the plugin
    requiredPrefix: "CAT-"
```

```bash
kubectl apply -f wasmplugin-custom-auth.yaml
```

## Testing the Custom Authentication Plugin

Deploy a test application:

```yaml
# httpbin.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: httpbin
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: httpbin
  template:
    metadata:
      labels:
        app: httpbin
    spec:
      containers:
      - name: httpbin
        image: kennethreitz/httpbin:latest
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: httpbin
  namespace: default
spec:
  selector:
    app: httpbin
  ports:
  - port: 8000
    targetPort: 80
```

```bash
kubectl apply -f httpbin.yaml
```

Test the authentication:

```bash
# Request without token - should be rejected
kubectl run test --image=curlimages/curl --rm -it -- \
  curl -v http://httpbin:8000/headers

# Request with invalid token - should be rejected
kubectl run test --image=curlimages/curl --rm -it -- \
  curl -H "x-custom-auth: invalid" http://httpbin:8000/headers

# Request with valid token - should succeed
kubectl run test --image=curlimages/curl --rm -it -- \
  curl -H "x-custom-auth: CAT-user123" http://httpbin:8000/headers
```

Check proxy logs to see the plugin working:

```bash
kubectl logs deploy/httpbin -c istio-proxy | grep "custom-auth"
```

## Implementing Token Validation with External API

Enhance the plugin to call an external validation service:

```go
func (ctx *httpContext) OnHttpRequestHeaders(numHeaders int, endOfStream bool) types.Action {
	token, err := proxywasm.GetHttpRequestHeader("x-custom-auth")
	if err != nil {
		return ctx.sendUnauthorized()
	}

	// Call external validation service
	headers := [][2]string{
		{":method", "POST"},
		{":path", "/validate"},
		{":authority", "auth-service.default.svc.cluster.local"},
		{"content-type", "application/json"},
	}

	body := []byte(`{"token":"` + token + `"}`)

	_, err = proxywasm.DispatchHttpCall(
		"auth-service",
		headers,
		body,
		nil,
		5000, // 5 second timeout
		ctx.callbackValidateToken,
	)

	if err != nil {
		proxywasm.LogError("Failed to dispatch validation request")
		return ctx.sendUnauthorized()
	}

	// Wait for callback
	return types.ActionPause
}

func (ctx *httpContext) callbackValidateToken(numHeaders, bodySize, numTrailers int) {
	// Read response body
	body, err := proxywasm.GetHttpCallResponseBody(0, bodySize)
	if err != nil {
		proxywasm.LogError("Failed to read validation response")
		ctx.sendUnauthorized()
		return
	}

	// Check if token is valid (parse JSON response)
	if string(body) == `{"valid":true}` {
		proxywasm.LogInfo("Token validated successfully")
		proxywasm.ResumeHttpRequest()
	} else {
		ctx.sendUnauthorized()
	}
}

func (ctx *httpContext) sendUnauthorized() types.Action {
	proxywasm.SendHttpResponse(401, [][2]string{
		{"content-type", "application/json"},
	}, []byte(`{"error":"unauthorized"}`), -1)
	return types.ActionPause
}
```

This pattern lets you integrate with existing authentication services.

## Configuring Plugin Parameters

Pass configuration to your plugin:

```yaml
# wasmplugin-config.yaml
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: custom-auth
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  url: oci://your-registry/custom-auth-wasm:v1
  phase: AUTHN
  pluginConfig:
    validationEndpoint: "http://auth-service.default.svc.cluster.local/validate"
    timeout: 5000
    cacheEnabled: true
    cacheTTL: 300
```

Access configuration in your plugin:

```go
type pluginContext struct {
	types.DefaultPluginContext
	config Config
}

type Config struct {
	ValidationEndpoint string `json:"validationEndpoint"`
	Timeout            int    `json:"timeout"`
	CacheEnabled       bool   `json:"cacheEnabled"`
	CacheTTL           int    `json:"cacheTTL"`
}

func (ctx *pluginContext) OnPluginStart(pluginConfigurationSize int) types.OnPluginStartStatus {
	data, err := proxywasm.GetPluginConfiguration()
	if err != nil {
		proxywasm.LogError("Failed to get plugin configuration")
		return types.OnPluginStartStatusFailed
	}

	if err := json.Unmarshal(data, &ctx.config); err != nil {
		proxywasm.LogError("Failed to parse plugin configuration")
		return types.OnPluginStartStatusFailed
	}

	return types.OnPluginStartStatusOK
}
```

## Implementing Rate Limiting in Wasm

Add rate limiting to your authentication plugin:

```go
type httpContext struct {
	types.DefaultHttpContext
	requestCounts map[string]int
}

func (ctx *httpContext) OnHttpRequestHeaders(numHeaders int, endOfStream bool) types.Action {
	userID, _ := proxywasm.GetHttpRequestHeader("x-user-id")

	// Check rate limit
	count := ctx.requestCounts[userID]
	if count >= 100 {
		proxywasm.SendHttpResponse(429, [][2]string{
			{"content-type", "application/json"},
			{"retry-after", "60"},
		}, []byte(`{"error":"rate limit exceeded"}`), -1)
		return types.ActionPause
	}

	// Increment counter
	ctx.requestCounts[userID] = count + 1

	return types.ActionContinue
}
```

## Debugging Wasm Plugins

Enable debug logging:

```bash
istioctl proxy-config log deploy/httpbin --level wasm:debug
```

Check Wasm plugin status:

```bash
kubectl describe wasmplugin custom-auth -n default
```

View plugin logs:

```bash
kubectl logs deploy/httpbin -c istio-proxy | grep wasm
```

Common issues:

- Plugin fails to load: Check URL is accessible and format is correct
- Authentication not working: Verify selector matches pod labels
- Performance issues: Profile plugin code and optimize

## Monitoring Plugin Performance

Query metrics for Wasm plugin execution:

```promql
# Plugin execution duration
histogram_quantile(0.95,
  sum(rate(envoy_wasm_vm_duration_milliseconds_bucket[5m])) by (le)
)

# Plugin failures
rate(envoy_wasm_vm_failures_total[5m])
```

Set alerts for plugin failures or high latency.

## Conclusion

Istio WasmPlugins extend authentication beyond built-in JWT and mTLS capabilities. Write custom logic in Rust, Go, or C++ that compiles to WebAssembly and runs in Envoy proxies.

Plugins can validate proprietary tokens, call external services, implement rate limiting, and enforce complex authentication rules. Configure plugins per-workload using selectors and pass parameters through pluginConfig.

Monitor plugin performance and debug issues using Istio's logging and metrics. Start with simple validation logic and add complexity as needed. This gives you unlimited flexibility for specialized authentication requirements without modifying Istio or your applications.
