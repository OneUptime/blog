# How to Handle Long-Running Requests During Shutdown in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Long-Running Requests, Shutdown, Kubernetes, Envoy

Description: Strategies for handling long-running HTTP requests, gRPC streams, and WebSocket connections during pod shutdown in an Istio service mesh.

---

Most advice about Istio shutdown assumes your requests take a few seconds at most. But what about a report that takes 2 minutes to generate? Or a file upload that runs for 10 minutes? Or a gRPC stream that stays open for hours? Long-running requests need special consideration during pod shutdown because the standard drain configuration of 15-20 seconds will kill them before they finish.

## Identifying Long-Running Request Patterns

Before configuring anything, figure out what types of long-running requests your services handle:

```bash
# Check the distribution of request durations
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket{destination_service="report-service.default.svc.cluster.local"}[1h])) by (le))'

# Find the maximum request duration in the last hour
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'histogram_quantile(1.0, sum(rate(istio_request_duration_milliseconds_bucket{destination_service="report-service.default.svc.cluster.local"}[1h])) by (le))'
```

If your p99 is 2 seconds but your max is 300 seconds, you have a long tail that needs special handling.

## Extended Drain Duration

The simplest approach is to set a longer drain duration. If your longest request takes 5 minutes, set the drain duration accordingly:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: report-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 330s
    spec:
      terminationGracePeriodSeconds: 360
      containers:
      - name: report-service
        image: report-service:v1
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 5"]
```

The drain duration is 330 seconds (5.5 minutes), and the grace period is 360 seconds (6 minutes). This gives the longest request time to complete with a 30-second buffer.

The downside is that every pod deletion takes up to 6 minutes, which makes deployments very slow. If you have 10 replicas and `maxUnavailable: 0`, a full rolling update takes over an hour.

## Separating Long and Short Request Paths

A better approach is to route long-running requests to dedicated pods that have extended drain periods, while keeping normal pods with standard timing:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: report-service
  namespace: default
spec:
  hosts:
  - report-service.default.svc.cluster.local
  http:
  - match:
    - uri:
        prefix: /api/reports/generate
    route:
    - destination:
        host: report-service.default.svc.cluster.local
        subset: long-running
    timeout: 600s
  - route:
    - destination:
        host: report-service.default.svc.cluster.local
        subset: standard
    timeout: 30s
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: report-service-dr
spec:
  host: report-service.default.svc.cluster.local
  subsets:
  - name: long-running
    labels:
      pool: long-running
  - name: standard
    labels:
      pool: standard
```

Then have two sets of pods with different shutdown configurations:

```yaml
# Long-running pool
apiVersion: apps/v1
kind: Deployment
metadata:
  name: report-service-long
spec:
  replicas: 2
  template:
    metadata:
      labels:
        app: report-service
        pool: long-running
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 330s
    spec:
      terminationGracePeriodSeconds: 360
      containers:
      - name: report-service
        image: report-service:v1
---
# Standard pool
apiVersion: apps/v1
kind: Deployment
metadata:
  name: report-service-standard
spec:
  replicas: 5
  template:
    metadata:
      labels:
        app: report-service
        pool: standard
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 15s
    spec:
      terminationGracePeriodSeconds: 30
      containers:
      - name: report-service
        image: report-service:v1
```

Now the standard pool deploys quickly, and only the long-running pool has the extended shutdown time.

## Handling gRPC Streams

gRPC streaming connections (both server-side and bidirectional) are inherently long-running. When the sidecar sends a GOAWAY frame, the client should stop opening new streams on that connection and open a new connection to a different pod.

Configure the VirtualService to handle streaming timeouts:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: streaming-service
spec:
  hosts:
  - streaming-service.default.svc.cluster.local
  http:
  - match:
    - uri:
        prefix: /streaming.Service/
    route:
    - destination:
        host: streaming-service.default.svc.cluster.local
    timeout: 0s
```

Setting `timeout: 0s` disables the route-level timeout for streaming endpoints. The drain duration then becomes the controlling factor for how long streams can continue during shutdown.

For the client side, implement reconnection logic that handles GOAWAY:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: streaming-dr
spec:
  host: streaming-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: DO_NOT_UPGRADE
        maxRequestsPerConnection: 0
    loadBalancer:
      simple: LEAST_REQUEST
```

## WebSocket Connections

WebSocket connections present the same challenge. They can live for hours, and there's no standard mechanism for the proxy to tell the client to reconnect.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: ws-service
spec:
  hosts:
  - ws-service.default.svc.cluster.local
  http:
  - match:
    - headers:
        upgrade:
          exact: websocket
    route:
    - destination:
        host: ws-service.default.svc.cluster.local
    timeout: 0s
```

Your application needs to implement its own graceful disconnect for WebSocket clients. When it receives SIGTERM:

1. Send a close frame to all connected clients with a "going away" status
2. Wait for clients to reconnect to other pods
3. After a timeout, forcibly close remaining connections

## Using Job-Based Architecture for Very Long Operations

If operations truly take a long time (30+ minutes), consider refactoring to use jobs instead of synchronous requests:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: report-service
spec:
  hosts:
  - report-service.default.svc.cluster.local
  http:
  - match:
    - uri:
        prefix: /api/reports/generate
      method:
        exact: POST
    route:
    - destination:
        host: report-service.default.svc.cluster.local
    timeout: 10s
  - match:
    - uri:
        prefix: /api/reports/status/
      method:
        exact: GET
    route:
    - destination:
        host: report-service.default.svc.cluster.local
    timeout: 5s
```

The POST to generate a report returns immediately with a job ID. The client polls the status endpoint. The actual work happens in a background job that isn't affected by pod shutdown (or is handled by a separate worker deployment with its own lifecycle management).

## Monitoring Long-Running Request Behavior During Shutdown

Track what happens to long-running requests during deployments:

```bash
# Watch for request cancellations
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'sum(rate(istio_requests_total{destination_service="report-service.default.svc.cluster.local",response_code="499"}[5m]))'

# Monitor connection closures during deployment windows
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'sum(rate(istio_tcp_connections_closed_total{destination_service="report-service.default.svc.cluster.local"}[5m]))'
```

Response code 499 means the client closed the connection before the server finished responding. If you see these spiking during deployments, your drain period is too short for your long-running requests.

## Preventing Long-Running Request Starts During Drain

Once a pod starts draining, you don't want it to accept new long-running requests. Add logic to your application:

```python
class ReportHandler:
    def __init__(self):
        self.draining = False
        self.active_reports = 0

    def handle_sigterm(self, signum, frame):
        self.draining = True

    def generate_report(self, request):
        if self.draining:
            # Return 503 so the client retries on another pod
            return Response(status=503)

        self.active_reports += 1
        try:
            result = self.run_report(request)
            return Response(result, status=200)
        finally:
            self.active_reports -= 1
```

This way, new long-running requests get redirected to healthy pods via retry, while existing ones complete on the draining pod. It's the best of both worlds: fast drain for new requests, patient waiting for in-progress ones.

Long-running requests and zero-downtime deployments are not mutually exclusive. You just need to be more intentional about separating the long and short request paths, configuring appropriate drain periods, and implementing application-level drain awareness.
