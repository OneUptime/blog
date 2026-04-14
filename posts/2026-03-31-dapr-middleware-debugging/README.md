# How to Debug Middleware Issues in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Middleware, Debugging, Observability, HTTP

Description: A practical guide to debugging Dapr middleware issues including misconfigured pipelines, component loading errors, and request/response inspection techniques.

---

## Common Middleware Issues in Dapr

Debugging middleware problems in Dapr requires understanding how the middleware pipeline is assembled at startup and how requests flow through it. Common issues include:

- Middleware component fails to load due to missing metadata
- Pipeline configuration not applied to the correct app
- Middleware running in wrong order
- WASM module crashes or panics silently

## Enable Debug Logging in Dapr Sidecar

The first step in debugging any middleware issue is enabling verbose logging on the Dapr sidecar:

```bash
dapr run --app-id myapp --log-level debug -- ./myapp
```

For Kubernetes, set the log level via annotation:

```yaml
annotations:
  dapr.io/log-level: "debug"
```

Debug logs will show which components are loaded and in what order the middleware pipeline is assembled.

## Verify Component and Configuration Loading

Check that your middleware component and configuration are properly applied:

```bash
kubectl get components -n default
kubectl get configurations -n default
kubectl describe component response-transformer -n default
```

If the component has errors, look at the events section:

```bash
kubectl describe pod myapp-pod -n default | grep -A 20 Events
```

## Inspect the Middleware Pipeline at Runtime

Dapr exposes a metadata endpoint that shows loaded components:

```bash
curl http://localhost:3500/v1.0/metadata
```

The response includes all loaded components. If your middleware component is missing from this list, there is a loading error.

Sample response showing components:

```json
{
  "id": "myapp",
  "activeActorsCount": [],
  "components": [
    {
      "name": "response-transformer",
      "type": "middleware.http.uppercase",
      "version": "v1"
    }
  ]
}
```

## Use a Passthrough Middleware to Verify the Pipeline

A useful debugging technique is to insert a permissive middleware at the start of the pipeline to verify the pipeline is assembled correctly. The routerchecker middleware with a wildcard pattern lets all requests through while appearing in debug logs:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: request-logger
spec:
  type: middleware.http.routerchecker
  version: v1
  metadata:
    - name: rule
      value: ".*"
```

Then update your pipeline configuration to prepend this component:

```yaml
spec:
  httpPipeline:
    handlers:
      - name: request-logger
        type: middleware.http.routerchecker
      - name: response-transformer
        type: middleware.http.uppercase
```

## Check WASM Middleware Errors

WASM middleware failures often appear as silent 500 errors. Enable detailed WASM logging:

```bash
dapr run --app-id myapp --log-level debug \
  --config ./config.yaml -- ./myapp 2>&1 | grep -i wasm
```

Ensure your WASM binary is valid:

```bash
wasm-validate response-transform.wasm
```

## Validate Configuration Is Applied to the Correct App

Verify the pod annotation references the correct configuration:

```bash
kubectl get pod myapp-pod -o jsonpath='{.metadata.annotations}'
```

Expected output:

```json
{"dapr.io/config": "pipeline-config", "dapr.io/enabled": "true"}
```

## Summary

Debugging Dapr middleware starts with enabling debug logging and checking component load status via the metadata API. Use the `kubectl describe` commands to surface component errors, verify pipeline configuration annotations on pods, and validate WASM binaries when using custom transforms. Inserting a permissive passthrough middleware like routerchecker helps verify that the pipeline is assembled and processing requests correctly.
