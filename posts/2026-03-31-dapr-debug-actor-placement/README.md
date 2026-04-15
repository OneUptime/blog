# How to Debug Dapr Actor Placement Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Actor, Placement, Debugging, Troubleshooting

Description: Learn how to diagnose and fix Dapr actor placement issues including placement service failures, actor host registration problems, and actor activation errors.

---

## How Dapr Actor Placement Works

Dapr actors use a placement service to track which app instance hosts which actor. When an actor is invoked, the Dapr sidecar contacts the placement service to find the correct host, then routes the call there. If the placement service is unavailable or an actor host cannot register, actor calls fail with placement-related errors.

## Diagnosing Placement Service Issues

Check if the placement service is running:

```bash
kubectl get pods -n dapr-system | grep placement
```

View placement service logs:

```bash
kubectl logs -n dapr-system -l app=dapr-placement-server --tail=100
```

Look for messages like:
- `host removed from placement table` - an actor host disconnected unexpectedly
- `Failed to receive from host` - network issue between sidecar and placement service
- `disseminating to connected hosts` - normal placement table distribution

If the placement service is not running, no actor calls will succeed. Reinstall Dapr or restart the placement pod:

```bash
kubectl rollout restart statefulset/dapr-placement-server -n dapr-system
```

## Checking Actor Host Registration

Each sidecar registers with the placement service on startup. Check the sidecar log for registration status:

```bash
kubectl logs order-service-7b4c8d9f6-xk2pq -c daprd -n default | grep -i "placement\|actor"
```

Successful registration:

```text
level=info msg="actors: host added" app_id=order-service address=10.244.0.15:50002
```

Failed registration:

```text
level=error msg="error connecting to placement service" err="rpc error: code = Unavailable"
```

## Verifying Actor Configuration

Actors require an actor-capable state store. Check that `actorStateStore: "true"` is set in your component:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: redis:6379
  - name: actorStateStore
    value: "true"
```

If the actor state store is not configured, you will see:

```text
level=error msg="error initializing actors" err="actors: actor state store does not exist or is not properly configured"
```

## Checking Actor Type Registration

Verify your app correctly registers actor types. The sidecar calls your app's `/dapr/config` endpoint at startup:

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/dapr/config")
def dapr_config():
    return {
        "entities": ["OrderActor", "PaymentActor"],
        "actorIdleTimeout": "1h",
        "actorScanInterval": "30s",
        "drainOngoingCallTimeout": "30s",
        "drainRebalancedActors": True
    }
```

Test this endpoint by port-forwarding to the app and calling it locally (the daprd container uses a distroless image with no shell utilities):

```bash
kubectl port-forward order-service-pod 3000:3000

curl -s http://localhost:3000/dapr/config
```

## Diagnosing Actor Activation Failures

When an actor is activated, the sidecar calls the app. If the app returns an error, activation fails:

```bash
kubectl logs order-service-7b4c8d9f6-xk2pq -c daprd | grep -i "actor activation\|OnActivate"
```

Check the app container logs simultaneously:

```bash
kubectl logs order-service-7b4c8d9f6-xk2pq -c order-service | grep -i "actor"
```

## Simulating Actor Calls via the Sidecar HTTP API

Port-forward the sidecar and invoke an actor directly:

```bash
kubectl port-forward order-service-pod 3500:3500

curl -X POST http://localhost:3500/v1.0/actors/OrderActor/order-123/method/getStatus \
  -H "Content-Type: application/json" \
  -d '{}'
```

This bypasses service invocation and directly tests actor routing, isolating placement from other potential issues.

## Summary

Debugging Dapr actor placement issues starts with confirming the placement service pod is healthy, then checking sidecar logs for registration and connectivity errors. Verifying the actor state store has `actorStateStore: "true"` and the app's `/dapr/config` endpoint returns correct actor types resolves the majority of actor startup failures. Port-forwarding the sidecar HTTP API provides a quick way to test actor invocation in isolation.
