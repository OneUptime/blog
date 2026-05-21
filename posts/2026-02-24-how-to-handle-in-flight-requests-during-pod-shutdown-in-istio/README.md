# How to Handle In-Flight Requests During Pod Shutdown in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Pod Shutdown, In-Flight Requests, Kubernetes, Zero Downtime

Description: Prevent in-flight request failures during pod shutdown in Istio by coordinating sidecar drain, endpoint removal, and application lifecycle hooks.

---

Every time a pod shuts down, there are requests that are actively being processed, waiting in a queue, or mid-flight between the client and server. These in-flight requests are the ones that get dropped during deployments if you don't handle the shutdown sequence carefully. With Istio in the mix, you have an extra component (the sidecar proxy) that needs to participate in this coordination.

## What "In-Flight" Actually Means

An in-flight request can be in several states during pod shutdown:

- **Being processed by the application:** The request has reached the app and is being worked on
- **In the sidecar's connection pool:** The sidecar accepted the request but hasn't forwarded it to the app yet
- **In transit from another pod's sidecar:** A client pod's Envoy has sent the request but it hasn't arrived yet
- **Waiting for a response:** The request was sent, and the client is waiting for the response to come back

Each of these states needs different handling. The goal is to make sure every request in every state either completes successfully or gets retried on a different pod.

## The Timeline Problem

Here's the typical failure scenario. Your deployment has 3 replicas and you trigger a rolling update:

```text
T+0.0s: Kubernetes sends SIGTERM to pod-1
T+0.1s: Pod-1's sidecar starts draining
T+0.5s: Kubernetes API updates endpoints (removes pod-1)
T+1.0s: Some sidecars get the endpoint update
T+3.0s: Most sidecars have removed pod-1 from their pool
T+5.0s: All sidecars have removed pod-1

Meanwhile, between T+0 and T+5, other pods are still sending requests to pod-1.
```

That 5-second window is illustrative, and the exact timing depends on your cluster and control-plane propagation. It is where requests can get dropped if a sending pod's sidecar has not yet observed that pod-1 is terminating.

## Strategy 1: Delay Application Shutdown

The simplest approach is to keep the application running (and processing requests) while the endpoint update propagates:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 20s
    spec:
      terminationGracePeriodSeconds: 40
      containers:
      - name: order-service
        image: order-service:v3
        lifecycle:
          preStop:
            exec:
              command:
              - "/bin/sh"
              - "-c"
              - "sleep 7"
```

The 7-second preStop sleep keeps the application process from receiving its stop signal while Kubernetes propagates the endpoint removal. The Istio proxy's `terminationDrainDuration` controls how long Envoy is allowed to drain once proxy shutdown begins, discouraging new connections and allowing existing connections to complete.

## Strategy 2: Application-Level Drain

For more control, implement drain logic in your application:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 25s
    spec:
      terminationGracePeriodSeconds: 40
      containers:
      - name: order-service
        image: order-service:v3
        lifecycle:
          preStop:
            exec:
              command:
              - "/bin/sh"
              - "-c"
              - |
                # Tell the app to stop accepting new requests
                curl -s -X POST http://localhost:8080/admin/shutdown
                # Wait for in-flight requests to finish
                while curl -s http://localhost:8080/admin/inflight | grep -Eq '"count"[[:space:]]*:[[:space:]]*[1-9]'; do
                  sleep 1
                done
```

This approach uses a shutdown endpoint that tells the application to stop accepting new requests, then polls an in-flight count endpoint until all requests have completed. It's more sophisticated but handles the drain more precisely.

## Strategy 3: Client-Side Retry Configuration

On the client side, configure retries so that requests that fail due to pod shutdown are automatically retried on a healthy pod:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: order-service
  namespace: default
spec:
  hosts:
  - order-service.default.svc.cluster.local
  http:
  - route:
    - destination:
        host: order-service.default.svc.cluster.local
    retries:
      attempts: 3
      perTryTimeout: 5s
      retryOn: connect-failure,refused-stream,unavailable,cancelled
      retryRemoteLocalities: true
```

The `connect-failure` and `refused-stream` conditions catch common errors that can happen when a request hits a draining pod. The `retryRemoteLocalities` option allows retries to other localities when the retry policy and load-balancing configuration can use them.

Important note: only configure retries for idempotent operations. Retrying a non-idempotent request (like a payment charge) can cause duplicate processing.

## Strategy 4: Readiness Probe Coordination

Make your readiness probe fail immediately when shutdown starts. This is the fastest way to get the pod removed from endpoints:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
      - name: order-service
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          periodSeconds: 2
          failureThreshold: 1
          successThreshold: 1
        lifecycle:
          preStop:
            exec:
              command:
              - "/bin/sh"
              - "-c"
              - |
                # Make readiness probe fail
                rm -f /tmp/ready
                # Wait for endpoint removal and in-flight completion
                sleep 15
```

With `failureThreshold: 1` and `periodSeconds: 2`, the pod becomes not-ready after the next failed readiness probe. Kubernetes then updates EndpointSlices, and other pods stop sending traffic after they observe that endpoint update.

Your `/ready` endpoint should check for the existence of `/tmp/ready`:

```python
@app.route('/ready')
def ready():
    if os.path.exists('/tmp/ready'):
        return 'OK', 200
    return 'Draining', 503
```

## Combining All Strategies

The most robust setup combines multiple strategies:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  selector:
    matchLabels:
      app: order-service
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: order-service
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 20s
    spec:
      terminationGracePeriodSeconds: 45
      containers:
      - name: order-service
        image: order-service:v3
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          periodSeconds: 2
          failureThreshold: 1
        lifecycle:
          preStop:
            exec:
              command:
              - "/bin/sh"
              - "-c"
              - |
                rm -f /tmp/ready
                sleep 10
```

Combined with a VirtualService retry policy:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: order-service
spec:
  hosts:
  - order-service.default.svc.cluster.local
  http:
  - route:
    - destination:
        host: order-service.default.svc.cluster.local
    retries:
      attempts: 2
      perTryTimeout: 10s
      retryOn: connect-failure,refused-stream,unavailable
```

And `maxUnavailable: 0` in the deployment strategy, which ensures a new pod is fully ready before an old one starts terminating. This eliminates the capacity gap during rolling updates.

## Verifying Zero Request Loss

Test your setup under realistic load:

```bash
# Start a load test that checks for errors

kubectl run loadtest --image=fortio/fortio --rm -it -- \
  load -c 20 -qps 200 -t 300s -abort-on 503 \
  http://order-service.default.svc.cluster.local:8080/api/orders

# While the load test is running, trigger a deployment
kubectl rollout restart deploy/order-service -n default
```

The `-abort-on 503` flag tells fortio to stop if it receives an HTTP 503 response. Use `-abort-on -1` instead if you specifically want socket errors to abort the run immediately. If the test completes without aborting and the final status-code/error summary is clean, your in-flight request handling is working correctly.

Check the Envoy stats after the test:

```bash
kubectl exec deploy/order-service -c istio-proxy -- \
  pilot-agent request GET stats | grep "retry\|cx_destroy\|rq_error"
```

Retries are expected and fine. Connection destroy and request errors during the deployment window should be zero or low enough that retries cover the remaining failures.

The bottom line: handling in-flight requests during shutdown requires coordination between Kubernetes endpoint removal, Istio sidecar draining, application lifecycle hooks, and client-side retry policies. No single mechanism is sufficient by itself.
