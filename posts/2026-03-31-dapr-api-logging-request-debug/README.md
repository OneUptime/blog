# How to Enable API Logging in Dapr for Request Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Logging, Debug, API, Observability

Description: Enable Dapr API request logging to capture HTTP and gRPC call details for debugging service invocation, pub/sub, and state store issues.

---

When debugging Dapr service behavior, you need visibility into exactly which API calls are being made, their parameters, and the responses. Dapr provides API logging that records every request through the sidecar, enabling detailed request-level debugging.

## What API Logging Captures

When enabled, Dapr API logging records:
- HTTP method and route for every sidecar API call
- gRPC method names
- App ID and instance information
- User agent details

## Enabling API Logging

Enable API logging via Kubernetes annotation:

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
        dapr.io/enable-api-logging: "true"
        dapr.io/log-level: "debug"
        dapr.io/log-as-json: "true"
```

## Sample API Log Output

With API logging enabled, the sidecar logs each request:

```json
{"time":"2026-03-31T10:00:01Z","level":"debug","msg":"HTTP API Called","method":"GET","path":"/v1.0/state/statestore/order-123","status":200,"duration":"12ms","app_id":"order-service"}
{"time":"2026-03-31T10:00:02Z","level":"debug","msg":"HTTP API Called","method":"POST","path":"/v1.0/publish/pubsub/orders","status":204,"duration":"5ms","app_id":"order-service"}
{"time":"2026-03-31T10:00:03Z","level":"debug","msg":"HTTP API Called","method":"POST","path":"/v1.0/invoke/inventory-service/method/check","status":200,"duration":"45ms","app_id":"order-service"}
```

## Filtering API Logs

Use jq to parse and filter the JSON logs:

```bash
# Show only state store calls
kubectl logs deploy/order-service -c daprd | \
  jq -c 'select(.path | test("/v1.0/state/"))' | head -20

# Show slow requests over 100ms
kubectl logs deploy/order-service -c daprd | \
  jq -c 'select(.duration and (.duration | ltrimstr("ms") | tonumber) > 100)'

# Show only failed requests
kubectl logs deploy/order-service -c daprd | \
  jq -c 'select(.status >= 400)'

# Count requests by path
kubectl logs deploy/order-service -c daprd | \
  jq -r '.path' | sort | uniq -c | sort -rn | head -10
```

## Enabling API Logging in Self-Hosted Mode

```bash
dapr run \
  --app-id order-service \
  --app-port 8080 \
  --enable-api-logging \
  --log-level debug \
  -- node server.js
```

## Disabling in Production

API logging generates high log volume in production. Disable it after debugging:

```yaml
metadata:
  annotations:
    dapr.io/enable-api-logging: "false"
    dapr.io/log-level: "info"
```

```bash
kubectl rollout restart deployment/order-service
```

## Identifying Common Issues via API Logs

```bash
# Find all 500 errors
kubectl logs deploy/order-service -c daprd | jq -c 'select(.status == 500)'

# Find component errors
kubectl logs deploy/order-service -c daprd | jq -c 'select(.msg | test("error|Error|ERROR"))'

# Check if pub/sub subscription is working
kubectl logs deploy/order-service -c daprd | jq -c 'select(.path | test("subscribe"))'
```

## Summary

Dapr API logging provides request-level visibility into every sidecar API call including HTTP method and route. Enable it temporarily via the `dapr.io/enable-api-logging: "true"` annotation when debugging issues. Disable it in production after investigation to avoid excessive log volume and storage costs.
