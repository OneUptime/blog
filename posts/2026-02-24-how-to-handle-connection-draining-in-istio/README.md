# How to Handle Connection Draining in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Connection Draining, Kubernetes, Envoy, Traffic Management

Description: Understand and configure connection draining in Istio to ensure existing requests complete before pods are removed from the service mesh.

---

Connection draining is the process of letting existing connections finish while refusing new ones. It's a fundamental part of graceful deployments, and Istio adds its own layer of complexity on top of what Kubernetes already does. If you don't handle connection draining correctly, your users will see random errors every time you deploy a new version of your service.

## How Connection Draining Works in Istio

When a pod is being removed (during a deployment update, scale-down, or deletion), several things happen in sequence:

First, Kubernetes marks the pod as Terminating and starts removing it from Service endpoints. Second, Istio's control plane (istiod) picks up this change and pushes new endpoint lists to all sidecars in the mesh. Third, the Envoy sidecar on the terminating pod enters drain mode.

The challenge is that these three processes happen asynchronously. There's a window where some sidecars still have the old pod in their endpoint list and will keep sending traffic to it, while the pod is already trying to shut down.

## Configuring Drain Duration

The drain duration controls how long the Envoy proxy waits for existing connections to complete after receiving SIGTERM:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 25s
    spec:
      terminationGracePeriodSeconds: 45
      containers:
      - name: api-server
        image: api-server:v2
```

During the drain period, Envoy does the following:

- Stops accepting new connections on inbound listeners
- Sends "Connection: close" headers on HTTP/1.1 responses
- Sends GOAWAY frames on HTTP/2 connections
- Waits for existing requests to complete
- Closes idle connections immediately

## Drain Behavior by Protocol

Connection draining works differently depending on the protocol:

**HTTP/1.1:** Envoy adds a `Connection: close` header to responses. Well-behaved clients will close the connection after receiving the response and open a new one (which will go to a different pod).

**HTTP/2 and gRPC:** Envoy sends a GOAWAY frame, which tells clients to stop opening new streams on this connection. Existing streams complete normally.

**TCP:** There's no protocol-level drain mechanism. Envoy just waits for existing connections to close naturally or until the drain period expires.

For TCP connections, this means you need to make sure your drain period is long enough for all active TCP sessions to complete. If you have long-lived TCP connections, this could be a problem.

## Outlier Detection and Connection Draining

Istio's outlier detection (circuit breaking) can interfere with connection draining. If a pod is slow to respond during shutdown, other pods' sidecars might eject it from the load balancing pool before the endpoint update propagates:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-server-dr
  namespace: default
spec:
  host: api-server.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
    connectionPool:
      tcp:
        maxConnections: 200
      http:
        h2UpgradePolicy: DO_NOT_UPGRADE
        maxRequestsPerConnection: 100
```

The `maxRequestsPerConnection` setting is helpful for draining because it forces clients to periodically close and reopen connections. When they reopen, the new connection goes to the updated endpoint list (which no longer includes the draining pod).

## Handling Drain for WebSocket Connections

WebSocket connections are long-lived and don't respond to HTTP drain signals. You need a different strategy:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: websocket-service
  namespace: default
spec:
  hosts:
  - ws-server.default.svc.cluster.local
  http:
  - match:
    - headers:
        upgrade:
          exact: websocket
    route:
    - destination:
        host: ws-server.default.svc.cluster.local
        port:
          number: 8080
    timeout: 0s
```

Setting `timeout: 0s` disables the route timeout for WebSocket connections. For draining, your application needs to implement its own drain logic. When it receives SIGTERM, it should:

1. Stop accepting new WebSocket connections
2. Send a close frame to all connected clients
3. Wait for clients to reconnect (they'll connect to a new pod)
4. Exit after all connections are closed or the grace period expires

## Monitoring Connection Drain

You can track how well connection draining is working using Envoy's admin interface and metrics:

```bash
# Check active connections during a deployment
kubectl exec deploy/api-server -c istio-proxy -- \
  pilot-agent request GET /stats | grep "cx_active"

# Watch the drain state
kubectl exec deploy/api-server -c istio-proxy -- \
  pilot-agent request GET /server_info | grep state

# Check for connection reset errors across the mesh
kubectl exec -n istio-system deploy/prometheus -- \
  promtool query instant http://localhost:9090 \
  'sum(rate(istio_tcp_connections_closed_total{connection_security_policy="mutual_tls"}[5m])) by (destination_workload)'
```

The server_info endpoint will show the drain state. During normal operation, the state is `LIVE`. When draining starts, it changes to `DRAINING`. If you see pods moving to DRAINING and then connections dropping, the drain period is too short.

## Coordinating Application and Sidecar Drain

The application and sidecar need to coordinate their shutdown. Here's a pattern that works well:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          terminationDrainDuration: 20s
    spec:
      terminationGracePeriodSeconds: 40
      containers:
      - name: api-server
        image: api-server:v2
        ports:
        - containerPort: 8080
        lifecycle:
          preStop:
            exec:
              command:
              - "/bin/sh"
              - "-c"
              - |
                # Signal the app to stop accepting new requests
                curl -X POST http://localhost:8080/admin/drain
                # Wait for existing requests to complete
                sleep 15
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          periodSeconds: 2
          failureThreshold: 1
```

The timeline looks like this:

- T+0: SIGTERM received. PreStop hooks start. Envoy begins drain.
- T+0-2: Readiness probe fails, Kubernetes starts removing from endpoints.
- T+0-5: Endpoint removal propagates across the cluster.
- T+15: PreStop hook completes, application shuts down.
- T+20: Envoy drain period ends, sidecar shuts down.
- T+40: Hard kill if anything is still running.

## Testing Connection Draining

Use a load testing tool to verify zero-downtime deployments:

```bash
# Run a continuous load test
kubectl run loadtest --image=fortio/fortio --rm -it -- \
  load -c 10 -qps 100 -t 120s \
  http://api-server.default.svc.cluster.local:8080/health

# In another terminal, trigger a rolling update
kubectl set image deploy/api-server api-server=api-server:v3 -n default
```

If the load test reports any non-200 responses during the rolling update, your drain configuration needs work. Common causes of failures:

- Drain duration too short for long requests
- PreStop hook not giving enough time for endpoint propagation
- Application not stopping new request acceptance fast enough
- Outlier detection ejecting the pod before drain completes

Connection draining is one of those things that seems simple but has a lot of moving parts. The key is testing under realistic conditions and adjusting timing values based on actual behavior, not theoretical calculations.
