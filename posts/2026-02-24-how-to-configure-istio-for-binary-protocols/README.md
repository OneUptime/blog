# How to Configure Istio for Binary Protocols

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Binary Protocol, TCP, Kubernetes, Envoy, Service Mesh

Description: Learn how to configure Istio to handle custom binary protocols over TCP including port naming, connection management, and telemetry for non-HTTP services.

---

Many production systems rely on custom binary protocols that do not fit neatly into the HTTP or gRPC categories. Think about Thrift, Protocol Buffers over raw TCP, custom game server protocols, financial trading protocols like FIX, or proprietary communication formats between microservices. Istio can handle these, but you need to configure it correctly to avoid breaking your binary traffic.

## Treating Binary Protocols as TCP

The most important thing to understand is that Istio treats custom binary protocols as opaque TCP traffic. It cannot inspect or understand the contents of binary protocol messages. All the HTTP-level features like header-based routing, retries, and request-level metrics do not apply.

Your starting point is always correct port naming:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: trading-engine
  namespace: default
spec:
  selector:
    app: trading-engine
  ports:
    - name: tcp-fix
      port: 9878
      targetPort: 9878
      protocol: TCP
```

The `tcp-` prefix tells Istio to use the TCP filter chain for this port. Without this, Istio will try to sniff the protocol, and since your binary protocol probably does not look like HTTP, it will eventually fall back to TCP anyway, but only after an unnecessary delay.

## Why Protocol Sniffing Fails for Binary Protocols

When Istio encounters traffic on a port without an explicit protocol name, it reads the first bytes of the connection and tries to match them against known patterns. For binary protocols, the initial bytes might accidentally look like the beginning of an HTTP request, causing Istio to apply the wrong filter chain.

For example, if your binary protocol starts with the bytes `0x47 0x45 0x54`, that spells "GET" in ASCII. Istio would think this is an HTTP GET request and try to parse the rest of the stream as HTTP, which would fail spectacularly.

Even if your protocol does not collide with HTTP byte patterns, the sniffing process adds latency to connection establishment. For latency-sensitive binary protocols, this is unacceptable.

Always use explicit port naming. There is no good reason to rely on sniffing for binary protocols.

## Server-First Binary Protocols

Some binary protocols have the server send data first. If your protocol works this way, the `tcp-` port prefix is not just recommended but required. Without it, Istio will wait for the client to send data for protocol sniffing, the server will be waiting too, and you end up with a deadlock.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: custom-server
  namespace: default
spec:
  selector:
    app: custom-server
  ports:
    - name: tcp-custom
      port: 5555
      targetPort: 5555
      protocol: TCP
```

## Connection Management

Binary protocols often maintain long-lived connections, and some use connection pooling at the application level. Configure Istio's connection pooling to accommodate your protocol's connection patterns:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: trading-engine
  namespace: default
spec:
  host: trading-engine.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 500
        connectTimeout: 5s
        tcpKeepalive:
          time: 300s
          interval: 60s
          probes: 5
```

Setting `maxConnections` too low can cause connection failures if your binary protocol opens many concurrent connections. Set it based on your expected connection count with some headroom.

TCP keepalives are particularly important for long-lived binary protocol connections. Without them, firewalls and load balancers in your network path may silently drop idle connections. Setting `time: 300s` means a keepalive probe is sent after 300 seconds of inactivity on the connection.

## Routing Binary Protocol Traffic

TCP routing options are limited compared to HTTP, but you can still do useful things:

### Traffic Splitting

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: trading-engine-split
  namespace: default
spec:
  hosts:
    - trading-engine.default.svc.cluster.local
  tcp:
    - route:
        - destination:
            host: trading-engine.default.svc.cluster.local
            subset: v1
          weight: 90
        - destination:
            host: trading-engine.default.svc.cluster.local
            subset: v2
          weight: 10
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: trading-engine-versions
  namespace: default
spec:
  host: trading-engine.default.svc.cluster.local
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

Remember that for TCP, the routing decision happens at connection establishment. A connection that lands on v1 stays on v1 for its entire lifetime. The 90/10 split means 90% of new connections go to v1, not 90% of messages.

### Source-Based Routing

You can route TCP traffic based on the source:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: trading-engine-source
  namespace: default
spec:
  hosts:
    - trading-engine.default.svc.cluster.local
  tcp:
    - match:
        - sourceLabels:
            app: premium-client
      route:
        - destination:
            host: trading-engine.default.svc.cluster.local
            subset: dedicated
    - route:
        - destination:
            host: trading-engine.default.svc.cluster.local
            subset: shared
```

This sends traffic from pods labeled `app: premium-client` to a dedicated subset while all other traffic goes to the shared pool.

## Outlier Detection

Circuit breaking for binary protocol services relies on connection-level failures since Istio cannot inspect the protocol content:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: trading-engine-outlier
  namespace: default
spec:
  host: trading-engine.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 30
    connectionPool:
      tcp:
        maxConnections: 500
```

For TCP traffic, `consecutive5xxErrors` counts consecutive connection failures (refused connections, connection resets, timeouts), not HTTP 5xx responses. When a backend accumulates three consecutive failures, it gets ejected from the pool for 30 seconds.

## Security Policies

You can still apply authorization policies to binary protocol traffic. The matching is based on network-level attributes rather than protocol-level ones:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: trading-engine-access
  namespace: default
spec:
  selector:
    matchLabels:
      app: trading-engine
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/default/sa/order-service
              - cluster.local/ns/default/sa/market-data-service
      to:
        - operation:
            ports:
              - "9878"
```

This restricts access to only the specified service accounts on port 9878. Even though Istio cannot understand your binary protocol, it can still enforce who is allowed to connect.

## Telemetry for Binary Protocols

Istio collects TCP-level metrics for binary protocol traffic. These are less granular than HTTP metrics but still useful:

- `istio_tcp_connections_opened_total`: Number of TCP connections opened
- `istio_tcp_connections_closed_total`: Number of TCP connections closed
- `istio_tcp_sent_bytes_total`: Total bytes sent
- `istio_tcp_received_bytes_total`: Total bytes received

You can query these in Prometheus:

```promql
rate(istio_tcp_sent_bytes_total{destination_service="trading-engine.default.svc.cluster.local"}[5m])
```

For more detailed protocol-level metrics, you need to instrument your application directly and expose a Prometheus endpoint:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: trading-engine
spec:
  template:
    metadata:
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "9090"
        prometheus.io/path: "/metrics"
    spec:
      containers:
        - name: trading
          image: trading-engine:v1
          ports:
            - containerPort: 9878
              protocol: TCP
            - containerPort: 9090
              name: http-metrics
              protocol: TCP
```

## Using EnvoyFilter for Advanced Binary Protocol Handling

If you need more than basic TCP proxying, you can use EnvoyFilter to add custom Envoy filters for your binary protocol. For example, if your protocol has a length-prefixed framing, you could use the `envoy.filters.network.direct_response` or write a custom Envoy filter in Lua or Wasm.

This is advanced territory and usually not necessary unless you need protocol-aware load balancing or request-level metrics for your binary protocol.

## Summary

Binary protocols in Istio are handled as opaque TCP traffic. Name your ports with the `tcp-` prefix, configure appropriate connection pooling and keepalives, and use TCP-level routing for traffic management. Security policies work based on network identity rather than protocol content. For monitoring, you get connection-level metrics from Istio and should add application-level metrics for protocol-specific observability. The key principle is to be explicit about port naming and not rely on protocol sniffing, which will only cause delays and potential misdetection for binary traffic.
