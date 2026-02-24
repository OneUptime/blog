# How to Handle Services with Multiple Ports in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Services, Ports, Networking

Description: Configure and manage Kubernetes services with multiple ports in Istio, covering port naming, traffic routing, load balancing, and common pitfalls.

---

Most production services expose more than one port. You have your main application port, maybe a separate port for health checks, another for metrics, one for admin endpoints, and possibly a debug port. When Istio is in the picture, each of these ports needs to be handled correctly or you will run into routing issues, broken health checks, or missing metrics.

## Defining Multi-Port Services

Start with a properly defined Service and Deployment. The key is naming every port with a protocol prefix so Istio knows how to handle each one:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: backend-service
spec:
  selector:
    app: backend
  ports:
  - name: http-api
    port: 8080
    targetPort: 8080
  - name: http-admin
    port: 8081
    targetPort: 8081
  - name: http-metrics
    port: 9090
    targetPort: 9090
  - name: grpc-internal
    port: 50051
    targetPort: 50051
```

And the corresponding Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: my-backend:v1
        ports:
        - containerPort: 8080
          name: http-api
        - containerPort: 8081
          name: http-admin
        - containerPort: 9090
          name: http-metrics
        - containerPort: 50051
          name: grpc-internal
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8081
        readinessProbe:
          httpGet:
            path: /ready
            port: 8081
```

## Routing to Specific Ports

When you have multiple ports, your VirtualService needs to specify which port to route to. If you omit the port, Istio might route to the wrong one.

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: backend-routes
spec:
  hosts:
  - backend-service
  http:
  - match:
    - port: 8080
      uri:
        prefix: /api/v2
    route:
    - destination:
        host: backend-service
        port:
          number: 8080
        subset: v2
  - match:
    - port: 8080
    route:
    - destination:
        host: backend-service
        port:
          number: 8080
        subset: v1
```

For the gRPC port:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: backend-grpc-routes
spec:
  hosts:
  - backend-service
  http:
  - match:
    - port: 50051
    route:
    - destination:
        host: backend-service
        port:
          number: 50051
    timeout: 30s
    retries:
      attempts: 3
      retryOn: unavailable
```

## Port-Level Traffic Policies

Different ports often need different traffic policies. Your API port might need aggressive circuit breaking, while your metrics port should have simple direct routing.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: backend-policies
spec:
  host: backend-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
  portLevelSettings:
  - port:
      number: 8080
    connectionPool:
      http:
        http1MaxPendingRequests: 50
        http2MaxRequests: 100
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
  - port:
      number: 50051
    connectionPool:
      http:
        http2MaxRequests: 200
    outlierDetection:
      consecutiveGatewayErrors: 5
      interval: 15s
      baseEjectionTime: 60s
  - port:
      number: 9090
    connectionPool:
      http:
        http1MaxPendingRequests: 10
    outlierDetection:
      consecutive5xxErrors: 10
      interval: 30s
      baseEjectionTime: 10s
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

The metrics port (9090) has relaxed limits because metrics scraping is less critical than API traffic. If the metrics endpoint is temporarily down, you can tolerate it.

## Exposing Multiple Ports Through Ingress

If you need to expose multiple ports of the same service through the ingress gateway, configure the Gateway and VirtualService accordingly:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: backend-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: backend-tls
    hosts:
    - "api.example.com"
    - "admin.example.com"
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: backend-external
spec:
  hosts:
  - "api.example.com"
  gateways:
  - istio-system/backend-gateway
  http:
  - route:
    - destination:
        host: backend-service
        port:
          number: 8080
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: backend-admin-external
spec:
  hosts:
  - "admin.example.com"
  gateways:
  - istio-system/backend-gateway
  http:
  - route:
    - destination:
        host: backend-service
        port:
          number: 8081
```

The API endpoint goes to port 8080, and the admin endpoint goes to port 8081, each on its own hostname.

## Health Checks and Multiple Ports

When Istio's sidecar is injected, Kubernetes health checks still go directly to the application container. But if you configure Istio's health check rewriting, probes go through the sidecar on port 15021:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/rewriteAppHTTPProbers: "true"
    spec:
      containers:
      - name: backend
        livenessProbe:
          httpGet:
            path: /healthz
            port: 8081
```

With `rewriteAppHTTPProbers: "true"`, Istio rewrites the probe to go through port 15021, which means the probe goes through the sidecar. This is useful when your application port requires mTLS and kubelet cannot do mTLS.

## Excluding Ports from the Mesh

Sometimes you want certain ports to bypass the Istio sidecar entirely. Metrics endpoints and debug ports are common candidates:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeInboundPorts: "9090,8081"
    spec:
      containers:
      - name: backend
        ports:
        - containerPort: 8080
        - containerPort: 8081
        - containerPort: 9090
        - containerPort: 50051
```

Now ports 9090 (metrics) and 8081 (admin) bypass the sidecar. Traffic on those ports is not encrypted with mTLS, is not logged by Envoy, and is not subject to authorization policies. Use this only for ports that do not need mesh features.

## Monitoring Multiple Ports

Istio generates separate metrics for each port. You can query traffic per port:

```promql
sum(rate(istio_requests_total{
  reporter="destination",
  destination_service="backend-service.my-namespace.svc.cluster.local"
}[5m])) by (destination_port)
```

This breaks down request rates by port, so you can see how much traffic each port handles.

## Debugging Multi-Port Issues

When a specific port is not working as expected, check the proxy configuration for that port:

```bash
# List all listeners
istioctl proxy-config listener deploy/backend -n my-namespace

# Check the specific port listener
istioctl proxy-config listener deploy/backend -n my-namespace --port 50051 -o json
```

Check if traffic is reaching the correct port:

```bash
# Test each port individually
kubectl exec deploy/sleep -- curl -s http://backend-service:8080/health
kubectl exec deploy/sleep -- curl -s http://backend-service:8081/admin/status
kubectl exec deploy/sleep -- curl -s http://backend-service:9090/metrics
```

If one port works but another does not, the issue is likely protocol detection or a missing port name prefix.

## Common Pitfalls

**Unnamed ports.** If a port does not have a name, Istio might not detect the protocol correctly. Always name your ports.

**Duplicate port names.** Each port name in a Service must be unique. You cannot have two ports both named `http`.

**Port conflicts with sidecars.** Ports 15000-15090 are reserved by the Istio sidecar. If your application uses any of these, the sidecar will fail to start.

**Missing targetPort.** If `targetPort` is not specified, it defaults to the `port` value. This is fine unless your application listens on a different port than what the Service exposes.

**Service port vs container port mismatch.** The Service port is what clients connect to. The targetPort is what the container listens on. Make sure these match correctly, especially when you have many ports.

```yaml
# This exposes port 80 externally but routes to 8080 on the container
ports:
- name: http-api
  port: 80
  targetPort: 8080
```

## Summary

Multi-port services in Istio work well when you name ports correctly, specify protocol-appropriate routing rules, and configure per-port traffic policies. Use port exclusions for ports that do not need mesh features, and always check the proxy configuration when debugging. The most common issues come from missing or incorrect port names, so get those right and everything else falls into place.
