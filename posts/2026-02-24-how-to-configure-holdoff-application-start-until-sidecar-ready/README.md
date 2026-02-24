# How to Configure Holdoff Application Start Until Sidecar Ready

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Sidecar, Startup, Kubernetes, Reliability

Description: How to prevent your application from starting before the Istio sidecar proxy is ready to handle traffic.

---

One of the most frustrating issues in Istio is when your application starts making requests before the sidecar proxy is ready. The result is connection failures during startup - your app tries to call another service, the sidecar is not listening yet, and the request fails. This can cause crash loops if your application does not handle startup failures gracefully. Istio provides a few ways to solve this, and the right approach depends on your Kubernetes version and Istio configuration.

## The Problem

In a standard Kubernetes pod, all containers start at roughly the same time. There is no guarantee about which container starts first. Your application container might be fully booted and making HTTP requests while the sidecar is still waiting for its initial configuration from istiod.

The timeline looks like this:

```
t=0:   Pod scheduled
t=0.1: istio-init container runs (sets up iptables)
t=0.5: istio-init completes
t=0.6: Application container starts
t=0.6: istio-proxy container starts
t=0.7: Application tries to call another service
t=0.7: FAILURE - sidecar not ready yet
t=2.0: istio-proxy connects to istiod, receives config
t=2.5: istio-proxy is ready
t=2.6: Application retries and succeeds (if it retries)
```

That gap between t=0.7 and t=2.5 is the problem.

## Solution 1: holdApplicationUntilProxyStarts

This is the simplest and most widely used solution. It tells Kubernetes to start the application container only after the sidecar reports ready.

Enable it globally:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

Or enable it for specific workloads:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-namespace
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
    spec:
      containers:
      - name: my-app
        image: my-app:latest
```

How it works: Istio injects a `postStart` lifecycle hook on the sidecar container that blocks until the proxy is ready. Since Kubernetes waits for the postStart hook to complete before starting other containers, the application does not start until the proxy is up.

Verify it is working:

```bash
# Check the injected container spec
kubectl get pod my-pod -n my-namespace -o jsonpath='{.spec.containers[?(@.name=="istio-proxy")].lifecycle}'
```

You should see a postStart hook that checks the proxy readiness.

## Solution 2: Native Sidecar Containers (Kubernetes 1.28+)

Starting with Kubernetes 1.28, there is a proper solution for the sidecar ordering problem. Init containers can now have `restartPolicy: Always`, which makes them behave as sidecars that start before regular containers.

Enable native sidecars in Istio:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    pilot:
      env:
        ENABLE_NATIVE_SIDECARS: "true"
```

With this enabled, Istio injects the proxy as a native sidecar init container instead of a regular container. The startup sequence becomes:

```
t=0:   Pod scheduled
t=0.1: istio-init runs (iptables setup)
t=0.5: istio-init completes
t=0.5: istio-proxy starts as native sidecar
t=2.0: istio-proxy is ready
t=2.0: Application container starts
```

This is the cleanest solution because:
- The application is guaranteed to start after the sidecar is ready
- The sidecar properly terminates after all regular containers stop
- No workarounds or lifecycle hooks needed

Check if native sidecars are being used:

```bash
kubectl get pod my-pod -n my-namespace -o jsonpath='{.spec.initContainers[?(@.name=="istio-proxy")].restartPolicy}'
```

If it returns `Always`, native sidecars are active.

## Solution 3: Startup Probe with Sidecar Check

If you cannot use either of the above solutions, you can add a startup probe to your application that checks if the sidecar is ready:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
      - name: my-app
        image: my-app:latest
        startupProbe:
          exec:
            command:
            - sh
            - -c
            - "curl -s http://localhost:15021/healthz/ready > /dev/null"
          failureThreshold: 30
          periodSeconds: 1
```

This probes the sidecar's readiness endpoint every second, up to 30 times. The application is not considered started (and does not receive traffic) until the probe succeeds. However, the application process itself is already running - this just prevents Kubernetes from sending traffic to it.

The limitation is that the application code still starts and might try to make outbound calls before the sidecar is ready. The startup probe only controls when the pod receives inbound traffic.

## Solution 4: Application-Level Retry

The most resilient approach is to make your application tolerant of startup failures. This does not replace the holdoff mechanism but complements it:

```python
# Python example with retry logic
import requests
from tenacity import retry, stop_after_delay, wait_exponential

@retry(stop=stop_after_delay(30), wait=wait_exponential(multiplier=0.5, max=5))
def call_service():
    return requests.get("http://other-service:8080/api")

# On startup
try:
    result = call_service()
except Exception:
    # Handle the case where the service is still not available after retries
    pass
```

```go
// Go example with retry
func callWithRetry(url string, maxRetries int) (*http.Response, error) {
    var lastErr error
    for i := 0; i < maxRetries; i++ {
        resp, err := http.Get(url)
        if err == nil {
            return resp, nil
        }
        lastErr = err
        time.Sleep(time.Duration(i+1) * 500 * time.Millisecond)
    }
    return nil, lastErr
}
```

## Choosing the Right Approach

Here is a quick decision tree:

- **Kubernetes 1.28+ and Istio 1.20+**: Use native sidecars. This is the best option.
- **Older Kubernetes**: Use `holdApplicationUntilProxyStarts: true`.
- **Cannot modify Istio config**: Use startup probes and application-level retry.

For critical services, combine `holdApplicationUntilProxyStarts` with application-level retry for defense in depth.

## Handling Shutdown Ordering

The startup ordering problem has a mirror image at shutdown time. When a pod terminates, the sidecar might shut down before the application finishes draining its connections.

To handle this, configure a termination drain duration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      terminationDrainDuration: 30s
```

Or per pod:

```yaml
annotations:
  proxy.istio.io/config: |
    terminationDrainDuration: 30s
```

This tells the sidecar to keep running for 30 seconds after receiving a SIGTERM, allowing the application time to drain connections.

With native sidecars (Kubernetes 1.28+), the sidecar automatically stays alive until all regular containers have stopped, making the drain duration less critical.

## Verifying the Setup

After configuring the holdoff, verify that the startup order is correct:

```bash
# Watch pod events during startup
kubectl get events -n my-namespace --watch --field-selector involvedObject.name=my-pod

# Check container start times
kubectl get pod my-pod -n my-namespace -o jsonpath='{range .status.containerStatuses[*]}{.name}: {.state.running.startedAt}{"\n"}{end}'

# Check that the application did not have startup failures
kubectl logs my-pod -n my-namespace -c my-app | head -50
```

The istio-proxy container should show a startedAt time earlier than (or equal to) the application container.

Getting the startup ordering right eliminates a whole class of intermittent failures that are hard to debug. The application simply works from the first request because the sidecar is guaranteed to be ready when it starts. If you are seeing random connection failures on pod startup in your Istio mesh, implementing the holdoff is usually the fix.
