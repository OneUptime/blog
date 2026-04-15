# How to Debug Failed Service Invocations in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Debug, Service Invocation, Troubleshooting, Logging

Description: Learn how to debug failed Dapr service invocations using sidecar logs, Dapr dashboard, distributed tracing, and common error resolution techniques.

---

## Common Failure Modes

Service invocation failures in Dapr typically fall into these categories:

- App ID not found (404)
- Target app not responding (503)
- mTLS certificate issues (401)
- Access control policy denial (403)
- Timeout exceeded (408)
- Application error propagated (500)

## Step 1: Check the Sidecar Logs

The Dapr sidecar logs contain detailed invocation traces:

```bash
# Kubernetes - check daprd container logs
kubectl logs <pod-name> -c daprd

# Self-hosted - logs are printed to stdout
dapr run --app-id myapp --log-level debug -- node app.js
```

Look for lines like:

```text
time="2024-01-15T10:00:00Z" level=error msg="error invoking app" app_id=order-service err="connection refused"
```

## Step 2: Verify the Target App Is Running

```bash
# Kubernetes
kubectl get pods -l app=order-service
kubectl describe pod <pod-name>

# Self-hosted
dapr list
# Check that order-service appears in the list
```

## Step 3: Test Direct Connectivity

Check if the target app is reachable on its app port directly:

```bash
# Port-forward the app port and test directly
kubectl port-forward svc/order-service 3000:3000
curl http://localhost:3000/orders
```

## Step 4: Inspect Distributed Traces

If you have Zipkin or Jaeger configured, inspect the trace for the failed call:

```bash
# Port-forward Zipkin
kubectl port-forward svc/zipkin 9411:9411
# Open http://localhost:9411 and search by app ID
```

Traces show exact timing, which hop failed, and HTTP status codes.

## Step 5: Check Dapr Health Endpoints

```bash
# Check sidecar health
curl http://localhost:3500/v1.0/healthz

# Check sidecar outbound readiness (components initialized, ready for outbound calls)
curl http://localhost:3500/v1.0/healthz/outbound
```

## Common Error Resolutions

```bash
# 404 - App ID not found: check dapr list or kubectl get pods annotations
kubectl get pods -o jsonpath='{.items[*].metadata.annotations.dapr\.io/app-id}'

# 503 - App not ready: check if app has registered its endpoints
curl http://localhost:3500/v1.0/metadata

# 401 - mTLS issue: restart the sentry service
kubectl rollout restart deployment dapr-sentry -n dapr-system
```

## Enabling Debug Logging

```yaml
annotations:
  dapr.io/log-level: "debug"
  dapr.io/log-as-json: "true"
```

## Summary

Debug failed Dapr service invocations by first checking sidecar logs for error messages, then verifying the target app is running and reachable. Use distributed traces in Zipkin or Jaeger to pinpoint the failing hop. Enable debug-level logging on the sidecar for detailed request and response information.
