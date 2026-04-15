# How to Fix Dapr API Returning 500 Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, API, Troubleshooting, Error Handling, Debugging

Description: Diagnose and fix Dapr API 500 Internal Server Error responses by tracing errors through sidecar logs, component health, and application handlers.

---

Dapr API 500 errors can originate from the sidecar, the component backend, or your application handler. Systematically tracing the error chain is essential to finding the root cause.

## Understanding Dapr Error Responses

When Dapr returns a 500, it includes an error code and message:

```json
{
  "errorCode": "ERR_STATE_GET",
  "message": "fail to get abc from state store statestore: connection refused"
}
```

The error code identifies which building block failed. Common codes:

- `ERR_STATE_GET` / `ERR_STATE_SAVE` - state store issues
- `ERR_PUBSUB_PUBLISH_MESSAGE` - pub/sub issues
- `ERR_INVOKE_OUTPUT_BINDING` - binding issues
- `ERR_DIRECT_INVOKE` - service invocation issues

## Step 1: Enable Debug Logging

```yaml
annotations:
  dapr.io/log-level: "debug"
```

Reproduce the 500 error, then check sidecar logs:

```bash
kubectl logs <pod-name> -c daprd -n <namespace> | grep -i "error\|ERR_"
```

## Step 2: Check Component Health

Many 500s are caused by a component backend being unavailable:

```bash
# Test Redis directly
kubectl exec -it <pod> -c daprd -- redis-cli -h redis-master ping

# Test Kafka broker
kubectl exec -it <pod> -- kafka-broker-api-versions.sh \
  --bootstrap-server kafka:9092
```

## Step 3: Trace with OpenTelemetry

Enable distributed tracing to see the full call chain:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: http://zipkin:9411/api/v2/spans
```

Look up the trace ID from the failing request in Zipkin or Jaeger to see exactly where it failed.

## Step 4: Test the Dapr API Directly

Bypass your application code and call the Dapr HTTP API directly:

```bash
# Test state store
curl -X POST http://localhost:3500/v1.0/state/statestore \
  -H "Content-Type: application/json" \
  -d '[{"key":"test","value":"hello"}]'

# Test pub/sub publish
curl -X POST http://localhost:3500/v1.0/publish/pubsub/test-topic \
  -H "Content-Type: application/json" \
  -d '{"message": "test"}'
```

If direct API calls also return 500, the issue is in Dapr or the component, not your app.

## Step 5: Check Application Handler Errors

If direct API calls succeed but your app integration fails, the 500 may come from your app's handler when Dapr invokes it. For pub/sub, your handler returning 500 causes Dapr to return 500 upstream:

```python
@app.route('/orders', methods=['POST'])
def handle_order():
    try:
        data = request.json
        # your logic
        return '', 200
    except Exception as e:
        app.logger.error(f"Handler error: {e}")
        return f"Error: {e}", 500  # This causes Dapr to retry
```

Catch exceptions and return explicit success/retry signals.

## Common Fixes

```bash
# Restart the component backend
kubectl rollout restart deployment redis -n <namespace>

# Refresh component credentials
kubectl delete secret redis-credentials -n <namespace>
kubectl apply -f redis-credentials.yaml -n <namespace>

# Restart the Dapr sidecar (restart the pod)
kubectl rollout restart deployment <app-deployment> -n <namespace>
```

## Summary

Dapr API 500 errors trace back to three layers: the component backend (unavailable or misconfigured), the Dapr sidecar (component init failure, version bug), or your application handler (returning 500 for pub/sub subscriptions). Enable debug logging, test components directly from within the cluster, and use distributed tracing to pinpoint exactly which layer is generating the error.
