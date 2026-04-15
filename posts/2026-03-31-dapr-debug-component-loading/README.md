# How to Debug Dapr Component Loading Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Component, Debugging, Troubleshooting, Configuration

Description: Learn how to diagnose and fix Dapr component loading failures by analyzing sidecar logs, validating component YAML, and checking dependency connectivity.

---

## How Dapr Loads Components

At startup, the Dapr sidecar reads component YAML files from the components directory (or Kubernetes CRDs) and initializes each component. If a component fails to initialize, the sidecar may start but the component will be unavailable, causing runtime errors when your app tries to use it. Understanding the loading sequence helps narrow down failures quickly.

## Reading Component Loading Logs

Enable verbose logging to see detailed component loading output:

```bash
# Self-hosted
dapr run \
  --app-id order-service \
  --app-port 3000 \
  --log-level debug \
  --resources-path ./components \
  -- node src/index.js
```

On Kubernetes, set the `dapr.io/log-level` annotation on your pod to increase log verbosity:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-service"
        dapr.io/log-level: "debug"
```

Typical successful component loading log:

```text
time="2026-03-31T10:00:00Z" level=info msg="Component loaded" app_id=order-service name=statestore type=state.redis/v1
```

Failed loading log:

```text
time="2026-03-31T10:00:01Z" level=error msg="Error initializing component" app_id=order-service name=statestore type=state.redis/v1 error="dial tcp redis:6379: connect: connection refused"
```

## Common Component Loading Errors

**1. Connection refused - dependency not ready**

```text
error="dial tcp redis:6379: connect: connection refused"
```

The Redis host is unreachable. Check if Redis is running:

```bash
# Self-hosted
docker ps | grep redis
redis-cli -h redis -p 6379 ping

# Kubernetes
kubectl get pods | grep redis
kubectl exec -it redis-pod -- redis-cli ping
```

**2. Invalid YAML syntax**

```text
error="error reading component file: yaml: line 5: did not find expected key"
```

Validate your component YAML:

```bash
# Use a YAML linter to check syntax
yamllint ./components/statestore.yaml
```

**3. Missing secret key reference**

```text
error="error getting secret: secret redisPassword not found in secretstore kubernetes"
```

The `secretKeyRef` in the component references a Kubernetes secret that does not exist. Create it:

```bash
kubectl create secret generic redis-secret --from-literal=redisPassword=mypassword
kubectl get secret redis-secret -o yaml
```

## Validating Component YAML

Check the component YAML against the Dapr schema. A minimal valid Redis state store component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
  - name: redisPassword
    value: ""
```

Common mistakes:
- Missing `namespace` field in Kubernetes mode
- Wrong `version` value (use `v1`, not `1`)
- Incorrect `type` string (check the Dapr component reference documentation)
- `value` field using number instead of string for numeric metadata

## Checking the Metadata Endpoint

After startup, query the sidecar metadata endpoint to see which components loaded:

```bash
curl http://localhost:3500/v1.0/metadata | jq '.components'
```

Output:

```json
[
  {"name": "statestore", "type": "state.redis", "version": "v1", "capabilities": ["ETAG", "TRANSACTIONAL", "TTL"]},
  {"name": "pubsub", "type": "pubsub.redis", "version": "v1", "capabilities": []}
]
```

If a component is missing from this list, it failed to load. The sidecar log will have the error.

## Scoping Components to Specific Apps

If a component is loaded but not accessible to your app, check if scoping is configured:

```yaml
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
scopes:
  - order-service
  - inventory-service
```

Components with `scopes` are only available to listed app IDs. If your `app-id` is not in the list, the component will not be injected.

## Summary

Debugging Dapr component loading starts with the sidecar logs at startup, which clearly identify which components loaded successfully and which failed. The most common failures are network connectivity issues (dependency not reachable), invalid YAML syntax, and missing secret references. The `/v1.0/metadata` endpoint provides a quick runtime view of all successfully loaded components to confirm the current state.
