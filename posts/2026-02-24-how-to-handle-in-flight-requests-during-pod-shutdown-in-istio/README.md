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

That 5-second window is where requests get dropped. The sending pod's sidecar doesn't know pod-1 is shutting down yet.

## Strategy 1: Delay Application Shutdown

The simplest approach is to keep the application running (and processing requests) while the endpoint update propagates:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    metadata:
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

The 7-second preStop sleep keeps the application alive while Kubernetes propagates the endpoint removal. During this time, the sidecar is draining (sending Connection: close headers), so no new connections are established. But existing connections can still complete their requests.

## Strategy 2: Application-Level Drain

For more control, implement drain logic in your application:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
    metadata:
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
                while curl -s http://localhost:8080/admin/inflight | grep -q '"count":[^0]'; do
                  sleep 1
                done
```

This approach uses a shutdown endpoint that tells the application to stop accepting new requests, then polls an in-flight count endpoint until all requests have completed. It's more sophisticated but handles the drain more precisely.

## Strategy 3: Client-Side Retry Configuration

On the client side, configure retries so that requests that fail due to pod shutdown are automatically retried on a healthy pod:

```yaml
apiVersion: networking.istio.io/v1beta1
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
      retryOn: connect-failure,refused-stream,unavailable,cancelled,retriable-status-codes
      retryRemoteLocalities: true
```

The `connect-failure` and `refused-stream` conditions catch the exact errors that happen when a request hits a draining pod. The `retryRemoteLocalities` option ensures retries go to pods in a different zone if the local pods are all draining.

Important note: only configure retries for idempotent operations. Retrying a non-idempotent request (like a payment charge) can cause duplicate processing.

## Strategy 4: Readiness Probe Coordination

Make your readiness probe fail immediately when shutdown starts. This is the fastest way to get the pod removed from endpoints:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  template:
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
                rm /tmp/ready
                # Wait for endpoint removal and in-flight completion
                sleep 15
```

With `failureThreshold: 1` and `periodSeconds: 2`, the pod becomes not-ready within 2 seconds of the preStop hook running. Kubernetes removes it from endpoints right away, and other pods stop sending traffic to it.

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
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
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
                rm /tmp/ready
                sleep 10
```

Combined with a VirtualService retry policy:

```yaml
apiVersion: networking.istio.io/v1beta1
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
  load -c 20 -qps 200 -t 300s -abort-on 1 \
  http://order-service.default.svc.cluster.local:8080/api/orders

# While the load test is running, trigger a deployment
kubectl rollout restart deploy/order-service -n default
```

The `-abort-on 1` flag tells fortio to stop if it sees any error percentage above 1%. If the test completes without aborting, your in-flight request handling is working correctly.

Check the Envoy stats after the test:

```bash
kubectl exec deploy/order-service -c istio-proxy -- \
  pilot-agent request GET /stats | grep "retry\|cx_destroy\|rq_error"
```

Retries are expected and fine. Connection destroy and request errors during the deployment window should be zero (or near zero with retries handling the remainder).

The bottom line: handling in-flight requests during shutdown requires coordination between Kubernetes endpoint removal, Istio sidecar draining, application lifecycle hooks, and client-side retry policies. No single mechanism is sufficient by itself.
