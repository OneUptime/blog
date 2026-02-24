# How to Test Wasm Plugins Locally Before Deploying to Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebAssembly, Testing, Envoy, Development

Description: Methods for testing WebAssembly plugins locally before deploying to Istio, including unit tests, Envoy standalone, Docker setups, and integration testing.

---

Deploying a broken Wasm plugin to your Istio mesh can disrupt traffic for your services. Testing locally before pushing to production is not optional - it is essential. This post covers multiple testing strategies, from unit tests in your plugin's language to running a full Envoy instance locally with your plugin loaded.

## Testing Strategy Overview

A complete testing strategy for Wasm plugins has four layers:

1. **Unit tests** - Test your plugin logic without Envoy
2. **Envoy standalone tests** - Run Envoy locally with your plugin
3. **Docker Compose integration tests** - Test with realistic upstream services
4. **Kubernetes staging tests** - Test in a staging Istio cluster before production

Each layer catches different categories of bugs.

## Unit Testing in Rust

The proxy-wasm Rust SDK includes a test framework that lets you test plugin logic without running Envoy:

Add the test dependency to `Cargo.toml`:

```toml
[dev-dependencies]
proxy-wasm-test-framework = "0.1"
```

Write tests in a `tests/` directory:

```rust
// tests/integration_test.rs
use proxy_wasm_test_framework::tester;
use proxy_wasm_test_framework::types::*;

#[test]
fn test_adds_response_header() {
    let args = tester::MockSettings {
        wasm_path: "target/wasm32-wasi/release/my_plugin.wasm".to_string(),
        plugin_config: r#"{"header_name":"x-test","header_value":"hello"}"#.to_string(),
        ..Default::default()
    };

    let mut test = tester::mock(args).unwrap();

    // Start the plugin
    test.call_start();
    test.call_configure(args.plugin_config.len());

    // Create an HTTP context
    let http_context = test.create_http_context();

    // Send request headers
    test.call_proxy_on_request_headers(http_context, 0, false);

    // Send response headers
    test.call_proxy_on_response_headers(http_context, 0, false);

    // Verify the response header was added
    let headers = test.get_response_headers(http_context);
    assert!(headers.iter().any(|(k, v)| k == "x-test" && v == "hello"));
}

#[test]
fn test_rejects_missing_api_key() {
    let args = tester::MockSettings {
        wasm_path: "target/wasm32-wasi/release/my_plugin.wasm".to_string(),
        plugin_config: r#"{"api_keys":{"key1":"client1"}}"#.to_string(),
        ..Default::default()
    };

    let mut test = tester::mock(args).unwrap();
    test.call_start();
    test.call_configure(args.plugin_config.len());

    let http_context = test.create_http_context();

    // Send request without API key header
    let action = test.call_proxy_on_request_headers(http_context, 0, false);

    // Should have sent a local response (401)
    assert_eq!(action, Action::Pause);
    let response = test.get_sent_local_response(http_context);
    assert_eq!(response.unwrap().status_code, 401);
}
```

Run the tests:

```bash
# Build the Wasm binary first
cargo build --target wasm32-wasi --release

# Run tests
cargo test
```

## Unit Testing in Go

For Go plugins, write standard Go tests but mock the proxy-wasm functions:

```go
// plugin_test.go
package main

import (
	"testing"

	"github.com/tetratelabs/proxy-wasm-go-sdk/proxytest"
	"github.com/tetratelabs/proxy-wasm-go-sdk/proxywasm/types"
)

func TestOnHttpRequestHeaders(t *testing.T) {
	opt := proxytest.NewEmulatorOption().
		WithVMContext(&vmContext{}).
		WithPluginConfiguration([]byte(`{"header_name":"x-test","header_value":"hello"}`))

	host, reset := proxytest.NewHostEmulator(opt)
	defer reset()

	// Initialize the plugin
	host.StartPlugin()

	// Create HTTP context
	contextID := host.InitializeHttpContext()

	// Set request headers
	host.CallOnRequestHeaders(contextID,
		[][2]string{
			{":path", "/api/test"},
			{":method", "GET"},
		}, false)

	// Call response headers
	action := host.CallOnResponseHeaders(contextID,
		[][2]string{
			{":status", "200"},
		}, false)

	if action != types.ActionContinue {
		t.Errorf("expected ActionContinue, got %v", action)
	}

	// Check that our header was added
	responseHeaders := host.GetCurrentResponseHeaders(contextID)
	found := false
	for _, h := range responseHeaders {
		if h[0] == "x-test" && h[1] == "hello" {
			found = true
			break
		}
	}
	if !found {
		t.Error("expected x-test header in response")
	}
}

func TestRejectsInvalidAPIKey(t *testing.T) {
	opt := proxytest.NewEmulatorOption().
		WithVMContext(&vmContext{}).
		WithPluginConfiguration([]byte(`{
			"api_keys": {"valid-key": "client1"},
			"header_name": "x-api-key"
		}`))

	host, reset := proxytest.NewHostEmulator(opt)
	defer reset()

	host.StartPlugin()
	contextID := host.InitializeHttpContext()

	// Send request with invalid API key
	action := host.CallOnRequestHeaders(contextID,
		[][2]string{
			{":path", "/api/data"},
			{":method", "GET"},
			{"x-api-key", "invalid-key"},
		}, false)

	if action != types.ActionPause {
		t.Errorf("expected ActionPause (request rejected), got %v", action)
	}

	// Check that a 403 local response was sent
	localResponse := host.GetSentLocalResponse(contextID)
	if localResponse.StatusCode != 403 {
		t.Errorf("expected 403, got %d", localResponse.StatusCode)
	}
}
```

Run tests:

```bash
go test ./... -v
```

## Testing with Envoy Standalone

The most reliable local test is running your plugin in an actual Envoy instance. Create a minimal Envoy configuration:

```yaml
# envoy.yaml
admin:
  address:
    socket_address:
      address: 0.0.0.0
      port_value: 9901

static_resources:
  listeners:
  - name: main
    address:
      socket_address:
        address: 0.0.0.0
        port_value: 8080
    filter_chains:
    - filters:
      - name: envoy.filters.network.http_connection_manager
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          stat_prefix: ingress_http
          route_config:
            name: local_route
            virtual_hosts:
            - name: local_service
              domains: ["*"]
              routes:
              - match:
                  prefix: "/"
                route:
                  cluster: upstream
          http_filters:
          - name: envoy.filters.http.wasm
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.wasm.v3.Wasm
              config:
                name: my_plugin
                root_id: my_plugin_root_id
                configuration:
                  "@type": type.googleapis.com/google.protobuf.StringValue
                  value: |
                    {"header_name":"x-test","header_value":"from-wasm"}
                vm_config:
                  runtime: envoy.wasm.runtime.v8
                  code:
                    local:
                      filename: /etc/envoy/plugin.wasm
          - name: envoy.filters.http.router
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

  clusters:
  - name: upstream
    type: STRICT_DNS
    load_assignment:
      cluster_name: upstream
      endpoints:
      - lb_endpoints:
        - endpoint:
            address:
              socket_address:
                address: upstream
                port_value: 8080
```

Run Envoy with Docker:

```bash
# Start an upstream test server
docker run -d --name upstream --network=host hashicorp/http-echo -listen=:8081 -text="hello from upstream"

# Run Envoy with the plugin
docker run -d --name envoy --network=host \
  -v $(pwd)/envoy.yaml:/etc/envoy/envoy.yaml \
  -v $(pwd)/plugin.wasm:/etc/envoy/plugin.wasm \
  envoyproxy/envoy:v1.31-latest \
  -c /etc/envoy/envoy.yaml --log-level debug

# Test
curl -v http://localhost:8080/test
```

Check for your custom header in the response:

```bash
curl -s -D - http://localhost:8080/test | grep x-test
# Should show: x-test: from-wasm
```

## Docker Compose Integration Tests

For more realistic testing, use Docker Compose with multiple services:

```yaml
# docker-compose.yaml
version: '3'
services:
  envoy:
    image: envoyproxy/envoy:v1.31-latest
    volumes:
      - ./envoy.yaml:/etc/envoy/envoy.yaml
      - ./plugin.wasm:/etc/envoy/plugin.wasm
    ports:
      - "8080:8080"
      - "9901:9901"
    command: -c /etc/envoy/envoy.yaml --log-level info

  upstream:
    image: hashicorp/http-echo
    command: ["-listen=:8080", "-text=hello"]

  test:
    image: curlimages/curl
    depends_on:
      - envoy
      - upstream
    entrypoint: ["sh", "-c"]
    command:
      - |
        sleep 5
        echo "Test 1: Basic request"
        curl -s -o /dev/null -w "%{http_code}" http://envoy:8080/test
        echo ""

        echo "Test 2: Check custom header"
        curl -s -D - http://envoy:8080/test | grep x-test

        echo "Test 3: Auth rejection"
        curl -s -o /dev/null -w "%{http_code}" http://envoy:8080/api/protected
        echo ""
```

Run the tests:

```bash
docker-compose up --build --abort-on-container-exit
```

## Automated Testing Script

Create a test script that builds, deploys locally, and validates:

```bash
#!/bin/bash
# test.sh

set -e

echo "Building plugin..."
cargo build --target wasm32-wasi --release
cp target/wasm32-wasi/release/my_plugin.wasm plugin.wasm

echo "Starting test environment..."
docker-compose up -d envoy upstream
sleep 3

echo "Running tests..."
FAILURES=0

# Test 1: Plugin loads successfully
echo -n "Test: Plugin loads... "
if docker logs envoy 2>&1 | grep -q "wasm.*created"; then
    echo "PASS"
else
    echo "FAIL"
    FAILURES=$((FAILURES + 1))
fi

# Test 2: Custom header is added
echo -n "Test: Custom header present... "
HEADER=$(curl -s -D - http://localhost:8080/test 2>/dev/null | grep "x-test")
if [ -n "$HEADER" ]; then
    echo "PASS"
else
    echo "FAIL"
    FAILURES=$((FAILURES + 1))
fi

# Test 3: Health endpoint is accessible
echo -n "Test: Health endpoint... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)
if [ "$STATUS" = "200" ]; then
    echo "PASS"
else
    echo "FAIL (got $STATUS)"
    FAILURES=$((FAILURES + 1))
fi

# Test 4: Missing API key returns 401
echo -n "Test: Missing API key returns 401... "
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/data)
if [ "$STATUS" = "401" ]; then
    echo "PASS"
else
    echo "FAIL (got $STATUS)"
    FAILURES=$((FAILURES + 1))
fi

echo "Cleaning up..."
docker-compose down

if [ $FAILURES -gt 0 ]; then
    echo "FAILED: $FAILURES tests failed"
    exit 1
else
    echo "ALL TESTS PASSED"
fi
```

Make it executable and run:

```bash
chmod +x test.sh
./test.sh
```

## Testing in a Staging Istio Cluster

Before deploying to production, test in a staging cluster:

```bash
# Push the plugin to a staging tag
oras push registry.example.com/plugins/my-plugin:staging \
  plugin.wasm:application/vnd.module.wasm.content.layer.v1+wasm

# Deploy to staging namespace
kubectl apply -f - <<EOF
apiVersion: extensions.istio.io/v1alpha1
kind: WasmPlugin
metadata:
  name: my-plugin
  namespace: staging
spec:
  selector:
    matchLabels:
      app: test-service
  url: oci://registry.example.com/plugins/my-plugin:staging
  imagePullPolicy: Always
EOF

# Run integration tests against the staging service
kubectl run test-runner -n staging --rm -it --image=curlimages/curl -- \
  curl -v http://test-service:8080/api/test
```

## Debugging Test Failures

When tests fail, check these things:

```bash
# Check Envoy Wasm logs
docker logs envoy 2>&1 | grep -i "wasm\|plugin"

# Check Envoy admin interface
curl http://localhost:9901/stats | grep wasm

# Check Envoy config dump
curl http://localhost:9901/config_dump | python3 -m json.tool | grep -A 20 wasm

# Check if the Wasm binary is valid
file plugin.wasm
# Should show: WebAssembly (wasm) binary module version 0x1 (MVP)
```

## Summary

Testing Wasm plugins before deploying to Istio requires a multi-layered approach. Start with unit tests using the proxy-wasm test framework in your language, then test with a standalone Envoy instance to verify real proxy behavior, use Docker Compose for integration tests with upstream services, and finally validate in a staging Istio cluster. Automate this pipeline in your CI/CD system so every plugin change goes through all testing layers before reaching production.
