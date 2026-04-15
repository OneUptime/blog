# How to Debug State Management Issues in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Debugging, Observability, Microservice

Description: Learn systematic approaches to debug Dapr state management issues including connection failures, key not found errors, ETag conflicts, and serialization problems.

---

## Introduction

State management bugs in Dapr can manifest in several ways: keys that seem to disappear, unexpected `409 Conflict` errors, connection timeouts, or data that looks correct in the sidecar log but wrong in the application. This guide provides a systematic debugging toolkit for diagnosing and resolving these issues.

## Common Issues and Symptoms

| Symptom | Likely Cause |
|---------|-------------|
| `404 / empty response` on get | Key does not exist, wrong store name, prefix mismatch |
| `409 Conflict` | ETag mismatch in first-write-wins mode |
| `500 Internal Server Error` | State store unreachable, component misconfigured |
| `403 Forbidden` | App not in component scopes |
| Data looks stale | Eventual consistency, reading from replica |
| Unexpected deserialization | Value stored as string vs. object |

## Step 1: Verify the Component is Loaded

```bash
# List all components
dapr components -k

# Check component status
kubectl get component statestore -o yaml

# Watch Dapr operator for component load errors
kubectl logs deployment/dapr-operator -n dapr-system | grep -i "statestore"
```

Expected output when healthy:

```text
INFO component loaded. name: statestore type: state.redis/v1
```

## Step 2: Enable Debug Logging on the Sidecar

```yaml
# Set log level to debug on the deployment
annotations:
  dapr.io/enabled: "true"
  dapr.io/app-id: "myapp"
  dapr.io/log-level: "debug"
```

Or for self-hosted:

```bash
dapr run --app-id myapp --log-level debug -- ./myapp
```

Then watch the sidecar logs:

```bash
kubectl logs deployment/myapp -c daprd --follow | grep -i "state"
```

## Step 3: Test the State API Directly

Bypass your application code and call the Dapr API directly from within the pod:

```bash
# Exec into the application pod
kubectl exec -it deploy/myapp -- sh

# Test save state
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key": "debug-test", "value": "hello"}]'

# Test get state
curl -v http://localhost:3500/v1.0/state/statestore/debug-test
```

If this works but your app code fails, the issue is in your application, not Dapr.

## Step 4: Inspect Keys Directly in the State Store

```bash
# Redis: check what keys exist with the Dapr prefix
redis-cli -h redis-master KEYS "myapp||*"

# Check a specific key (note the double pipe separator)
redis-cli -h redis-master GET "myapp||order-001"

# Check TTL on a key
redis-cli -h redis-master TTL "myapp||session-abc"
# -1 = no expiry, -2 = key does not exist, N = seconds until expiry
```

## Step 5: Diagnose Key Not Found

```bash
# Check what key prefix is configured
kubectl get component statestore -o jsonpath='{.spec.metadata[?(@.name=="keyPrefix")].value}'

# If keyPrefix=appid (default), the key is stored as:
# {appId}||{yourKey}

# Verify your app ID
dapr list -k | grep myapp

# Read through the API using just the key (Dapr adds the prefix automatically)
curl http://localhost:3500/v1.0/state/statestore/order-001
```

## Step 6: Diagnose ETag Conflicts

```bash
# Turn on verbose logging to see ETag values
curl -v http://localhost:3500/v1.0/state/statestore/order-001 2>&1 | grep -i etag

# Reproduce the conflict
ETAG="3"  # Use the actual ETag from above
# Write with an intentionally wrong ETag to confirm conflict behavior
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d "[{\"key\":\"order-001\",\"value\":\"test\",\"etag\":\"wrong-etag\",\"options\":{\"concurrency\":\"first-write\"}}]"
# Expected: 409 Conflict
```

## Step 7: Verify Serialization

```bash
# Check what value type is stored
redis-cli -h redis-master TYPE "myapp||order-001"
# string (JSON), not hash or list

# Inspect raw stored value
redis-cli -h redis-master GET "myapp||order-001"
# Should match what your app writes
```

Common serialization mistake:

```python
# WRONG: stores the Python repr string
client.save_state("statestore", "order-1", str({"item": "laptop"}))
# Stored: "{'item': 'laptop'}" - not valid JSON!

# CORRECT: use json.dumps
import json
client.save_state("statestore", "order-1", json.dumps({"item": "laptop"}))
# Stored: '{"item": "laptop"}' - valid JSON
```

## Step 8: Check Component Health

```bash
# Dapr health endpoint (checks all components)
curl http://localhost:3500/v1.0/healthz

# Outbound health (Dapr 1.13+)
curl http://localhost:3500/v1.0/healthz/outbound

# Metadata endpoint shows component status
curl http://localhost:3500/v1.0/metadata | jq '.components'
```

## Step 9: Check Dapr Metrics

```bash
# Port-forward Prometheus metrics
kubectl port-forward deployment/myapp 9090:9090

# Check error rates
curl -s http://localhost:9090/metrics | grep dapr_component_state_count

# Look for error labels
curl -s http://localhost:9090/metrics | \
  grep 'dapr_component_state_count{.*status="error"'
```

## Debugging Checklist

```json
[ ] Component YAML is syntactically valid (kubectl apply succeeds)
[ ] Component shows "loaded" in Dapr operator logs
[ ] State store backend is reachable from the Dapr sidecar
[ ] App ID matches the expected key prefix
[ ] Store name in API calls matches the component metadata.name
[ ] Value is serialized as valid JSON (not Python repr or binary)
[ ] ETag handling is correct (first-write vs last-write mode)
[ ] App is in component scopes (if scopes are set)
[ ] Secret references resolve correctly
[ ] TTL is set correctly (not too short)
```

## Summary

Debug Dapr state management issues systematically: verify component loading, enable debug sidecar logging, test the Dapr HTTP API directly from inside the pod, inspect keys in the backend store with the correct prefixed key format, check ETag values, and verify JSON serialization. The most common issues are key prefix mismatches (the `keyPrefix` setting), incorrect JSON serialization, and ETag conflicts in first-write-wins mode. Use Dapr's metadata endpoint and Prometheus metrics to monitor component health in production.
