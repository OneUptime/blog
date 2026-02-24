# How to Debug Connection Drop Issues During Shutdown in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Connection Drops, Debugging, Shutdown, Kubernetes

Description: Systematic approach to finding and fixing connection drop issues that occur during pod shutdown and deployments in Istio service mesh.

---

You're deploying a new version of your service and your monitoring dashboard lights up with 503 errors, connection resets, and timeout spikes. It lasts for maybe 10-20 seconds, then everything goes back to normal. This happens every single deployment, and it's driving you crazy. Connection drops during shutdown are one of the most common problems people hit with Istio, and they're fixable once you know where to look.

## Gathering Evidence

Before changing any configuration, collect data about when and how connections are being dropped. You need to know the exact failure mode.

Start by checking what errors clients are seeing:

```bash
# Check the client-side sidecar logs during a deployment
kubectl logs deploy/frontend -c istio-proxy -n default --since=2m | \
  grep -E "upstream connect error|disconnect/reset|no healthy upstream|overflow"
```

Common error patterns and what they mean:

- `upstream connect error or disconnect/reset before headers` - The destination pod closed the connection before responding
- `no healthy upstream` - All endpoints are gone from the client's endpoint list
- `upstream reset` - The connection was reset mid-response
- `overflow` - Connection pool is full, usually because connections to draining pods are piling up

## Check the Endpoint Update Timeline

The root cause of most connection drops is the delay between when a pod starts shutting down and when other pods stop sending it traffic. Measure this gap:

```bash
# Watch endpoint changes in real time
kubectl get endpoints web-api -n default -w

# In another terminal, delete a pod
kubectl delete pod web-api-xxxx -n default
```

Note the time between when you delete the pod and when the endpoints list updates. Then check how long it takes for sidecars to receive the update:

```bash
# Check when the sidecar received the endpoint update
istioctl proxy-config endpoints deploy/frontend -n default | grep web-api
```

If there's a multi-second gap, that's your problem window. During that gap, the frontend sidecar is still sending traffic to the terminating pod.

## Analyze Sidecar Proxy Configuration

Check if the draining pod's sidecar has the right drain settings:

```bash
# Get the proxy configuration for the terminating workload
istioctl proxy-config bootstrap deploy/web-api -n default -o json | \
  jq '.bootstrap.staticResources'

# Check the drain duration setting
kubectl get pod web-api-xxxx -n default -o json | \
  jq '.metadata.annotations["proxy.istio.io/config"]'
```

If the annotation is missing or the drain duration isn't set, the sidecar is using the mesh default (5 seconds), which may not be enough.

## Enable Debug Logging on the Proxy

Turn up the log level on the sidecar to see exactly what's happening during shutdown:

```bash
# Set connection manager to debug level
istioctl proxy-config log deploy/web-api -n default \
  --level connection:debug,http:debug,pool:debug

# Tail the logs during a deployment
kubectl logs deploy/web-api -c istio-proxy -n default -f --since=1s
```

With debug logging, you'll see entries like:

```
connection: [C123] closing socket
http: [C123] response complete
pool: [C123] destroying stream
connection: [C456] new connection from 10.0.1.5:34521
```

The key thing to look for is whether new connections are being established after the drain starts. If you see `new connection` entries after `closing socket` entries, the drain isn't working correctly.

## Check the Grace Period Budget

A common cause of connection drops is running out of time. The grace period budget needs to accommodate preStop hooks, drain duration, and application shutdown:

```bash
# Check the pod's termination grace period
kubectl get pod web-api-xxxx -n default -o json | \
  jq '.spec.terminationGracePeriodSeconds'

# Check if the pod was killed by grace period expiry
kubectl describe pod web-api-xxxx -n default | grep -A5 "State:\|Last State:"
```

If you see `Reason: OOMKilled` or if the pod transitions directly from Running to Terminated without going through the drain sequence, the grace period is too short.

Here's a diagnostic checklist:

```bash
# Get all the timing values for a deployment
DEPLOY="web-api"
NS="default"

echo "=== Grace Period ==="
kubectl get deploy $DEPLOY -n $NS -o json | \
  jq '.spec.template.spec.terminationGracePeriodSeconds'

echo "=== Drain Duration ==="
kubectl get deploy $DEPLOY -n $NS -o json | \
  jq '.spec.template.metadata.annotations["proxy.istio.io/config"]'

echo "=== PreStop Hooks ==="
kubectl get deploy $DEPLOY -n $NS -o json | \
  jq '.spec.template.spec.containers[].lifecycle.preStop'

echo "=== Rolling Update Strategy ==="
kubectl get deploy $DEPLOY -n $NS -o json | \
  jq '.spec.strategy'
```

## Test with Controlled Pod Deletion

Instead of debugging during a real deployment, simulate the problem with a controlled pod deletion:

```bash
# Start a continuous request stream
kubectl run loadtest --rm -it --image=curlimages/curl -- \
  sh -c 'while true; do curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" http://web-api.default.svc.cluster.local:8080/health; sleep 0.1; done'

# In another terminal, delete a specific pod
kubectl delete pod web-api-xxxx -n default

# Watch for non-200 responses in the loadtest output
```

This isolates the problem to a single pod deletion. If you see errors, note exactly when they start and stop relative to the pod deletion. The timing tells you which phase of the shutdown is broken.

## Fix 1: Add or Increase PreStop Delay

The most common fix is adding a preStop hook to delay shutdown while endpoints propagate:

```yaml
lifecycle:
  preStop:
    exec:
      command: ["/bin/sh", "-c", "sleep 5"]
```

Five seconds is usually enough for endpoint removal to propagate through the mesh. If your cluster is large or istiod is under heavy load, you might need 7-10 seconds.

## Fix 2: Increase Termination Drain Duration

If connections are being dropped because the drain period is too short:

```yaml
annotations:
  proxy.istio.io/config: |
    terminationDrainDuration: 20s
```

Make sure this is less than `terminationGracePeriodSeconds` minus any preStop hook duration.

## Fix 3: Configure Client-Side Retries

For requests that fail during the endpoint propagation window:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: web-api
spec:
  hosts:
  - web-api.default.svc.cluster.local
  http:
  - route:
    - destination:
        host: web-api.default.svc.cluster.local
    retries:
      attempts: 3
      perTryTimeout: 3s
      retryOn: connect-failure,refused-stream,unavailable
```

## Fix 4: Adjust maxUnavailable

If you're running with `maxUnavailable: 1` or higher, multiple pods can be draining simultaneously, which increases the chance of errors:

```yaml
strategy:
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
```

## Fix 5: Tune Outlier Detection

If outlier detection is too aggressive, it might eject healthy pods that are just slow during the drain transition:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: web-api-dr
spec:
  host: web-api.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
```

Raising `consecutive5xxErrors` from the default (5) to a higher value gives more tolerance for transient errors during the drain window.

## Validating the Fix

After applying fixes, run the same controlled test:

```bash
# Run 1000 requests during a pod deletion
kubectl run loadtest --rm -it --image=fortio/fortio -- \
  load -c 10 -qps 50 -t 60s \
  http://web-api.default.svc.cluster.local:8080/health
```

Trigger the pod deletion during the test and check the results. Zero non-200 responses means your drain configuration is working. If you still see errors, check which fix needs further tuning by looking at the error types and timing.

Connection drops during shutdown are a solvable problem. It just requires getting the timing right across multiple components. The debugging approach is always the same: identify the failure mode, measure the timing gap, and adjust the configuration to close that gap.
