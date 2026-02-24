# How to Debug Wasm Plugin Issues in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, WebAssembly, Debugging, Envoy, Troubleshooting

Description: Systematic techniques for debugging WebAssembly plugin issues in Istio including loading failures, runtime errors, and performance problems.

---

Wasm plugins in Istio can fail in several ways: they might not load at all, they might load but crash at runtime, they might produce unexpected behavior, or they might cause performance problems. Debugging these issues requires a combination of Envoy logs, proxy configuration inspection, and understanding of the Wasm runtime. This post covers systematic debugging techniques for each category of failure.

## Common Failure Categories

Wasm plugin issues fall into four main categories:

1. **Loading failures** - The plugin binary cannot be fetched or loaded
2. **Configuration failures** - The plugin loads but rejects its configuration
3. **Runtime errors** - The plugin panics or produces incorrect results
4. **Performance issues** - The plugin works but adds too much latency or uses too much memory

Each requires a different debugging approach.

## Debugging Loading Failures

When a Wasm plugin fails to load, the most common causes are:

- The Wasm binary URL is wrong or inaccessible
- Registry authentication failed
- The binary is not a valid Wasm module
- The binary was compiled for the wrong target

Start by checking the proxy logs:

```bash
# Check the istio-proxy container logs for Wasm errors
kubectl logs -n my-app -l app=my-service -c istio-proxy | grep -i "wasm\|plugin\|failed"
```

Common error messages and their causes:

```
# URL not reachable
"Failed to fetch Wasm plugin" -> Check the URL in the WasmPlugin resource

# Registry auth failure
"Failed to pull Wasm module" -> Check imagePullSecret configuration

# Invalid Wasm binary
"Failed to initialize Wasm VM" -> The file is not a valid Wasm module

# Wrong compilation target
"Failed to load Wasm module" -> Recompile with wasm32-wasi target
```

Verify the WasmPlugin resource:

```bash
# Check the resource exists and has the right config
kubectl get wasmplugin -n my-app -o yaml

# Check for status conditions
kubectl describe wasmplugin my-plugin -n my-app
```

If using an OCI registry, verify the artifact exists:

```bash
# Check if the artifact is in the registry
oras manifest fetch registry.example.com/plugins/my-plugin:v1.0

# Try pulling it manually
oras pull registry.example.com/plugins/my-plugin:v1.0
```

If using a private registry, verify the pull secret:

```bash
# Check the secret exists
kubectl get secret registry-creds -n my-app

# Test registry access
kubectl run test-pull --image=registry.example.com/test --rm -it -- /bin/sh
```

## Debugging Configuration Failures

If the plugin loads but its `on_configure` callback fails, the plugin will be rejected by Envoy. Check for these issues:

```bash
# Enable debug logging for Wasm
kubectl exec -n my-app $(kubectl get pod -n my-app -l app=my-service -o jsonpath='{.items[0].metadata.name}') -c istio-proxy -- curl -s -X POST "localhost:15000/logging?wasm=debug"

# Check logs after changing log level
kubectl logs -n my-app -l app=my-service -c istio-proxy --tail=100 | grep -i wasm
```

Configuration issues usually happen because:

- The `pluginConfig` YAML has a different structure than what the plugin expects
- Required configuration fields are missing
- Values have the wrong type (string instead of number, etc.)

To debug, add defensive logging in your plugin's `on_configure`:

```rust
fn on_configure(&mut self, _size: usize) -> bool {
    match self.get_plugin_configuration() {
        None => {
            log::error!("No plugin configuration provided");
            return false;
        }
        Some(config_bytes) => {
            let config_str = String::from_utf8_lossy(&config_bytes);
            log::info!("Received configuration: {}", config_str);

            match serde_json::from_slice::<serde_json::Value>(&config_bytes) {
                Ok(config) => {
                    log::info!("Parsed configuration successfully");
                    // ... process config
                }
                Err(e) => {
                    log::error!("Failed to parse configuration: {}", e);
                    return false;
                }
            }
        }
    }
    true
}
```

## Debugging Runtime Errors

Runtime errors are the trickiest to debug because the plugin loaded and configured successfully but behaves incorrectly during request processing. Common symptoms:

- Requests hang (plugin returns `Action::Pause` without resuming)
- Wrong HTTP responses (plugin sends unexpected status codes)
- Headers are missing or have wrong values
- Plugin panics cause 500 errors

**Step 1: Enable Wasm debug logging**

```bash
POD=$(kubectl get pod -n my-app -l app=my-service -o jsonpath='{.items[0].metadata.name}')

# Enable debug logging
kubectl exec -n my-app $POD -c istio-proxy -- curl -s -X POST "localhost:15000/logging?wasm=debug&http=debug"

# Make a test request
kubectl exec test-pod -n my-app -- curl -v http://my-service:8080/api/test

# Check logs
kubectl logs -n my-app $POD -c istio-proxy --tail=200
```

**Step 2: Check Envoy configuration**

Verify the Wasm filter is properly configured in Envoy's filter chain:

```bash
# Dump the full Envoy configuration
istioctl proxy-config all $POD -n my-app -o json > envoy-config.json

# Search for Wasm filter configuration
cat envoy-config.json | python3 -m json.tool | grep -A 20 "envoy.filters.http.wasm"
```

**Step 3: Check for panics**

Wasm panics show up in Envoy logs as:

```
Wasm VM failed to handle request headers
```

or

```
proxy_on_request_headers returned WasmResult::InternalFailure
```

If your plugin is panicking, add error handling around every operation that could fail:

```rust
fn on_http_request_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
    let path = self.get_http_request_header(":path").unwrap_or_else(|| {
        log::warn!("No :path header found");
        String::new()
    });

    // Guard against empty values
    if path.is_empty() {
        return Action::Continue;
    }

    // ... rest of the logic
    Action::Continue
}
```

**Step 4: Test with a minimal reproduction**

Create a stripped-down version of your plugin that only logs and passes through:

```rust
fn on_http_request_headers(&mut self, _num_headers: usize, _end_of_stream: bool) -> Action {
    log::info!("on_http_request_headers called");
    let headers = self.get_http_request_headers();
    for (name, value) in &headers {
        log::info!("  {}: {}", name, value);
    }
    Action::Continue
}
```

Then gradually add back functionality until the bug appears.

## Debugging Performance Issues

Wasm plugins can cause latency if they:

- Do too much work in header/body callbacks
- Make HTTP callouts that are slow
- Allocate too much memory
- Have inefficient string processing

**Measuring plugin latency:**

```bash
# Check Envoy stats for Wasm-specific metrics
kubectl exec -n my-app $POD -c istio-proxy -- curl -s localhost:15000/stats | grep wasm

# Look for these stats:
# wasm.envoy_wasm_runtime.wasm_vm_active - number of active VMs
# wasm.envoy_wasm_runtime.wasm_vm_created - total VMs created
```

**Comparing latency with and without the plugin:**

```bash
# With plugin
for i in $(seq 1 100); do
  kubectl exec test-pod -n my-app -- curl -s -o /dev/null -w "%{time_total}\n" http://my-service:8080/api/test
done | awk '{sum+=$1} END {print "avg:", sum/NR}'

# Remove the plugin temporarily
kubectl delete wasmplugin my-plugin -n my-app

# Without plugin
for i in $(seq 1 100); do
  kubectl exec test-pod -n my-app -- curl -s -o /dev/null -w "%{time_total}\n" http://my-service:8080/api/test
done | awk '{sum+=$1} END {print "avg:", sum/NR}'
```

**Memory usage:**

```bash
# Check proxy memory usage
kubectl top pod $POD -n my-app --containers
```

## Quick Debugging Checklist

When a Wasm plugin is not working, run through this checklist:

```bash
# 1. Is the WasmPlugin resource applied?
kubectl get wasmplugin -n my-app

# 2. Does the selector match the target pods?
kubectl get pods -n my-app -l app=my-service

# 3. Is the Wasm binary accessible?
kubectl logs -n my-app $POD -c istio-proxy | grep -i "wasm.*fail\|wasm.*error"

# 4. Is the plugin loaded in Envoy?
istioctl proxy-config listener $POD -n my-app -o json | grep -c wasm

# 5. Are there runtime errors?
kubectl logs -n my-app $POD -c istio-proxy | grep -i "panic\|InternalFailure\|wasm.*error"

# 6. Is the proxy healthy?
kubectl exec -n my-app $POD -c istio-proxy -- curl -s localhost:15021/healthz/ready
```

## Using istioctl analyze

istioctl can detect some Wasm plugin configuration issues:

```bash
istioctl analyze -n my-app
```

This checks for common issues like mismatched selectors, missing resources, and configuration conflicts.

## Summary

Debugging Wasm plugins in Istio involves checking four areas: loading (URL accessibility and binary validity), configuration (parsing and validation), runtime behavior (panics, incorrect logic), and performance (latency and memory). Enable Wasm debug logging as your first step, check proxy logs for error messages, use istioctl proxy-config to verify the plugin is in the filter chain, and test systematically by adding logging and simplifying your plugin until the issue is isolated.
