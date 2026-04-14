# How to Simulate Sidecar Failures for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Sidecar, Failure, Chaos Engineering, Kubernetes

Description: Simulate Dapr sidecar failures using container kill, OOM injection, and resource exhaustion to test how your application handles sidecar unavailability.

---

## The Dapr Sidecar as a Failure Point

Every Dapr-enabled pod runs the `daprd` sidecar container. If the sidecar crashes, your application loses access to all Dapr building blocks - state management, service invocation, pub/sub, and bindings. Understanding how your application behaves during sidecar downtime is essential.

## Scenario 1: Container Kill via kubectl

The fastest way to simulate sidecar failure is to kill the `daprd` process:

```bash
# Find a Dapr-enabled pod
kubectl get pods -l dapr.io/enabled=true

# Kill the daprd container in the pod
kubectl exec orderservice-7d9f4b6c8-xk2m9 -c daprd -- kill -9 1

# Watch Kubernetes restart the sidecar
kubectl get pod orderservice-7d9f4b6c8-xk2m9 -w
```

Kubernetes will restart the `daprd` container according to the pod's restart policy, typically within a few seconds.

## Scenario 2: Chaos Mesh Container Kill

Automate and repeat sidecar kills using Chaos Mesh:

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: dapr-sidecar-kill
  namespace: default
spec:
  action: container-kill
  mode: random-max-percent
  value: "30"
  selector:
    namespaces:
      - default
    expressionSelectors:
      - key: dapr.io/enabled
        operator: In
        values:
          - "true"
  containerNames:
    - daprd
  duration: "10m"
```

```bash
kubectl apply -f sidecar-kill-chaos.yaml
```

## Scenario 3: OOM Kill the Sidecar

Inject memory pressure to trigger an OOM kill:

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: dapr-sidecar-oom
  namespace: default
spec:
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: orderservice
  stressors:
    memory:
      workers: 1
      size: "256MB"
  containerNames:
    - daprd
  duration: "5m"
```

## Test Application Behavior During Sidecar Downtime

Your application should handle sidecar unavailability gracefully. Test the response:

```bash
# While sidecar is down, send requests to the app
while true; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/orders)
  echo "$(date): HTTP $STATUS"
  sleep 1
done
```

Expected behavior:
- State store calls fail with connection refused
- Application should return cached data or a graceful error
- After sidecar restarts, normal operation resumes

## Implement a Health Check for Sidecar Availability

```javascript
const { DaprClient } = require('@dapr/dapr');

async function checkDaprHealth() {
    try {
        const client = new DaprClient({ daprHost: '127.0.0.1', daprPort: '3500' });
        await client.health.isHealthy();
        return true;
    } catch (err) {
        console.warn('Dapr sidecar unavailable:', err.message);
        return false;
    }
}

// Use in your route handlers
app.get('/api/orders/:id', async (req, res) => {
    const daprReady = await checkDaprHealth();
    if (!daprReady) {
        return res.status(503).json({ error: 'Service temporarily unavailable' });
    }
    // Normal processing...
});
```

## Monitor Sidecar Restart Events

```bash
# Watch for sidecar restart events
kubectl get events --field-selector reason=BackOff | grep daprd

# Check restart count
kubectl get pods -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .status.containerStatuses[*]}{.name}{": "}{.restartCount}{"\n"}{end}{end}'
```

## Summary

Simulating Dapr sidecar failures reveals how your application behaves when it loses access to building blocks like state management and service invocation. Using container kill via kubectl or Chaos Mesh, and implementing health checks that detect sidecar unavailability, ensures your application degrades gracefully rather than crashing when the sidecar restarts.
