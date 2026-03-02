# How to Handle Mixed Protocol Services in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Protocol, HTTP, gRPC, TCP, Service Mesh

Description: Configure Istio to properly handle services that expose multiple protocols like HTTP, gRPC, and TCP on different ports with correct protocol detection.

---

Real-world services rarely speak just one protocol. A typical microservice might expose an HTTP REST API on one port, a gRPC endpoint on another, and a TCP metrics port on a third. Istio needs to know which protocol each port uses so it can apply the right filters, routing rules, and security policies. Get the protocol detection wrong and you will see strange errors, failed connections, or silently dropped traffic.

## How Istio Detects Protocols

Istio uses three mechanisms to determine what protocol a port speaks:

1. **Explicit port naming** in the Service definition
2. **The `appProtocol` field** on the Service port
3. **Automatic protocol detection** (sniffing)

Explicit naming is the most reliable. Name your ports with a protocol prefix:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
  - name: http-api
    port: 8080
    targetPort: 8080
  - name: grpc-internal
    port: 9090
    targetPort: 9090
  - name: tcp-metrics
    port: 9100
    targetPort: 9100
  selector:
    app: my-service
```

Istio recognizes these prefixes:
- `http`, `http2` for HTTP
- `grpc`, `grpc-web` for gRPC
- `tcp` for raw TCP
- `tls` for passthrough TLS
- `https` for HTTPS (TLS origination at sidecar)
- `mongo`, `mysql`, `redis` for database protocols
- `udp` for UDP

The `appProtocol` field is an alternative that does not require naming conventions:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
  - name: api
    port: 8080
    appProtocol: http
  - name: internal
    port: 9090
    appProtocol: grpc
  - name: metrics
    port: 9100
    appProtocol: tcp
  selector:
    app: my-service
```

## What Happens When Protocol Detection Is Wrong

If Istio thinks a port is HTTP but the service actually speaks gRPC, you get subtle bugs. HTTP/1.1 routing rules get applied to HTTP/2 traffic. Load balancing might not work correctly. Retries might corrupt binary gRPC messages.

If Istio thinks a port is TCP but it is actually HTTP, you lose all the Layer 7 features: no HTTP routing, no retries, no metrics broken down by path or status code, and no header-based authorization.

Common symptoms of wrong protocol detection:

- gRPC calls fail with generic connection errors
- HTTP metrics show "unknown" for response codes
- VirtualService routing rules do not take effect
- Services intermittently disconnect

## Configuring a Service with HTTP, gRPC, and TCP

Here is a complete example of a service that exposes all three protocols:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: multi-protocol-service
spec:
  ports:
  - name: http-api
    port: 8080
    targetPort: 8080
  - name: grpc-rpc
    port: 9090
    targetPort: 9090
  - name: tcp-debug
    port: 9200
    targetPort: 9200
  selector:
    app: multi-protocol-service
```

The Deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: multi-protocol-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: multi-protocol-service
  template:
    metadata:
      labels:
        app: multi-protocol-service
    spec:
      containers:
      - name: app
        image: my-multi-protocol-app:latest
        ports:
        - containerPort: 8080
          name: http-api
        - containerPort: 9090
          name: grpc-rpc
        - containerPort: 9200
          name: tcp-debug
```

## Routing Rules for Mixed Protocol Services

VirtualService routing rules need to match the protocol of each port. You cannot use HTTP match rules for a TCP port.

HTTP routing for the REST API:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-routes
spec:
  hosts:
  - multi-protocol-service
  http:
  - match:
    - port: 8080
      uri:
        prefix: /v2/
    route:
    - destination:
        host: multi-protocol-service
        port:
          number: 8080
        subset: v2
  - match:
    - port: 8080
    route:
    - destination:
        host: multi-protocol-service
        port:
          number: 8080
        subset: v1
```

gRPC routing:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: grpc-routes
spec:
  hosts:
  - multi-protocol-service
  http:
  - match:
    - port: 9090
    route:
    - destination:
        host: multi-protocol-service
        port:
          number: 9090
    retries:
      attempts: 3
      retryOn: unavailable,resource-exhausted
```

Note that gRPC routing uses the `http` section in VirtualService because gRPC is HTTP/2. The retry conditions use gRPC-specific status codes.

TCP routing (if needed):

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: tcp-routes
spec:
  hosts:
  - multi-protocol-service
  tcp:
  - match:
    - port: 9200
    route:
    - destination:
        host: multi-protocol-service
        port:
          number: 9200
```

## DestinationRules for Mixed Protocols

When configuring traffic policies, you can set different policies per port:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: multi-protocol-policy
spec:
  host: multi-protocol-service
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
        number: 9090
      connectionPool:
        http:
          h2UpgradePolicy: DEFAULT
          http2MaxRequests: 200
      outlierDetection:
        consecutiveGatewayErrors: 5
        interval: 10s
        baseEjectionTime: 30s
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

## Handling Protocol Upgrades

Some services start with HTTP/1.1 and upgrade to WebSocket or HTTP/2. Istio handles this through the upgrade mechanism:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: websocket-upgrade
spec:
  workloadSelector:
    labels:
      app: multi-protocol-service
  configPatches:
  - applyTo: NETWORK_FILTER
    match:
      context: SIDECAR_INBOUND
      listener:
        portNumber: 8080
        filterChain:
          filter:
            name: envoy.filters.network.http_connection_manager
    patch:
      operation: MERGE
      value:
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
          upgrade_configs:
          - upgrade_type: websocket
```

For VirtualService-level WebSocket support, it is simpler. Istio supports WebSocket upgrades by default on HTTP routes, but you can explicitly allow them:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: websocket-routes
spec:
  hosts:
  - multi-protocol-service
  http:
  - match:
    - uri:
        prefix: /ws
      port: 8080
    route:
    - destination:
        host: multi-protocol-service
        port:
          number: 8080
```

## Debugging Protocol Issues

When things are not working, check what protocol Istio detected for each port:

```bash
istioctl proxy-config cluster deploy/multi-protocol-service -n my-namespace -o json | \
  jq '.[] | {name: .name, type: .type, metadata: .metadata}'
```

Check the listeners to see how each port is configured:

```bash
istioctl proxy-config listener deploy/multi-protocol-service -n my-namespace
```

Look at the filter chain for each port. HTTP ports should have `envoy.filters.network.http_connection_manager` while TCP ports should have `envoy.filters.network.tcp_proxy`.

If a port is detected as the wrong protocol, the most reliable fix is updating the Service port name to use the correct prefix.

## Auto Protocol Detection Pitfalls

Istio's automatic protocol detection works by examining the first few bytes of a connection. If the first bytes look like an HTTP request, Istio treats it as HTTP. Otherwise, it falls back to TCP.

This detection has a timeout. If the client connects but does not send data immediately (which is common with some TCP protocols where the server speaks first), Istio might time out the detection and treat it as TCP.

Disable auto-detection for ports where you know the protocol:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  annotations:
    # This is not an actual annotation - use port naming instead
spec:
  ports:
  - name: tcp-custom-protocol
    port: 5555
    targetPort: 5555
```

By naming it `tcp-custom-protocol`, you tell Istio explicitly that this is TCP, skipping auto-detection entirely.

## Summary

Handling mixed protocol services in Istio comes down to being explicit about protocols. Name your ports with the right prefix, use the `appProtocol` field for clarity, and configure protocol-specific routing rules and traffic policies per port. When debugging, check the proxy configuration to verify Istio detected the right protocol. Automatic detection works for simple cases but explicit declaration is always more reliable.
