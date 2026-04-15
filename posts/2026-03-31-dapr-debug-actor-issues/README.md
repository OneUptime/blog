# How to Debug Actor Issues in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Debugging, Troubleshooting, Observability

Description: Learn how to debug common Dapr actor issues including stuck actors, state corruption, placement failures, and method invocation errors using logs and HTTP APIs.

---

Debugging distributed actor systems requires understanding how Dapr routes calls, manages state, and handles failures. This guide covers the most common actor debugging scenarios and the tools to diagnose them.

## Enabling Debug Logging

Set Dapr log level to debug to see actor routing and state operations:

```bash
dapr run --app-id my-service \
  --app-port 8080 \
  --log-level debug \
  -- ./my-service
```

In Kubernetes, patch the deployment annotations:

```yaml
annotations:
  dapr.io/log-level: "debug"
```

## Checking Actor Placement

Verify that your actor type is registered with the placement service:

```bash
# Check placement service state
curl http://localhost:8080/placement/state | jq .
```

Expected output includes your actor types:

```json
{
  "hostList": [
    {
      "name": "my-service-pod-abc",
      "namespace": "default",
      "appId": "my-service",
      "actorTypes": ["Counter", "BankAccount"]
    }
  ]
}
```

If your actor type is missing, check that your app responds correctly to the `/dapr/config` endpoint.

## Verifying the /dapr/config Endpoint

```bash
curl http://localhost:8080/dapr/config
```

This must return valid JSON with your actor types:

```json
{
  "entities": ["Counter", "BankAccount"],
  "actorIdleTimeout": "1h"
}
```

A missing or malformed response causes Dapr to not register your actor types.

## Inspecting Actor State Directly

Query actor state via the Dapr HTTP API:

```bash
curl http://localhost:3500/v1.0/actors/Counter/counter-001/state/count
```

This bypasses actor method invocation and reads state directly from the state store.

## Common Error: ERR_ACTOR_INSTANCE_MISSING

This error means the placement service cannot find a host for the actor type:

```text
level=error msg="error from actor service: ERR_ACTOR_INSTANCE_MISSING"
```

Causes:
- App not running or not reachable on the configured `app-port`
- Actor type not included in `/dapr/config` response
- Placement service not running

Fix:

```bash
# Check if app is healthy
curl http://localhost:8080/healthz

# Restart Dapr sidecar
kubectl rollout restart deployment/my-service
```

## Common Error: Actor Method Timeout

If actor methods hang, check for infinite loops or blocked I/O:

```go
// Always use context timeouts in actor methods
func (a *MyActor) SlowMethod(ctx context.Context) error {
  ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
  defer cancel()

  return callExternalService(ctx)
}
```

## Tracing Actor Calls with Zipkin

Enable distributed tracing to see the full call path:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: daprconfig
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: "http://zipkin:9411/api/v2/spans"
```

Actor invocations appear as spans in Zipkin, letting you trace the full call chain across services.

## Summary

Debugging Dapr actor issues typically starts with checking placement registration, verifying the `/dapr/config` endpoint, and inspecting Dapr sidecar logs at debug level. Direct state access via the HTTP API helps diagnose state corruption without going through actor logic. Enabling distributed tracing provides end-to-end visibility into actor call chains across services.
