# How to Handle Persistent Connections with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Connection Pooling, Load Balancing, Envoy

Description: How to properly manage long-lived and persistent connections in Istio to prevent load balancing issues and connection exhaustion in your service mesh.

---

Persistent connections are everywhere in modern applications. HTTP/2 multiplexes requests over a single connection, gRPC keeps connections open for streaming, databases use connection pools, and WebSockets maintain long-lived connections. When you put Istio in front of these workloads, the Envoy sidecar sits in the middle of every connection, and you need to understand how it handles them.

The biggest issue with persistent connections in a service mesh is load balancing for protocols that are handled as opaque TCP. When a TCP connection is established, all traffic on that connection goes to the same backend. If connections are long-lived and carry lots of requests, you end up with uneven load distribution. HTTP, HTTP/2, and gRPC traffic can be handled at L7 when Istio detects the protocol correctly, but raw TCP, WebSockets, and database connections still need careful connection management. This guide covers how to handle that and other persistent connection challenges.

## The Load Balancing Problem

Consider a gRPC service with 3 replicas behind a Kubernetes Service. A client creates a single gRPC channel, which uses one HTTP/2 connection. If Istio recognizes that traffic as gRPC or HTTP/2, Envoy can route individual HTTP/2 streams. If the service port is named as opaque TCP, or if the traffic is encrypted in a way the sidecar cannot parse, Envoy can only load balance the TCP connection and all traffic on that connection goes to the same backend pod.

You can see this imbalance in your metrics:

```promql
sum(rate(istio_requests_total{destination_service="my-grpc-service.default.svc.cluster.local"}[5m])) by (destination_workload_namespace, destination_workload, destination_canonical_revision)
```

If one revision or workload is handling most of the traffic while other intended destinations are idle, you have a routing or persistent connection load balancing problem. For per-pod analysis, add a pod-level metric dimension through Istio telemetry customization or inspect Envoy endpoint-level metrics.

## Fixing gRPC Load Balancing

For gRPC specifically, Istio can do per-request load balancing because it understands the HTTP/2 protocol. The key is making sure Istio classifies the service as gRPC or HTTP/2; a DestinationRule can then select the load balancing policy and connection behavior:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: grpc-service
spec:
  host: my-grpc-service.default.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN
    connectionPool:
      http:
        h2UpgradePolicy: DEFAULT
        maxRequestsPerConnection: 0
```

With Istio's L7 processing, each gRPC call, which is an HTTP/2 stream, can be load-balanced independently. This happens for services with ports named `grpc-*` or `http2-*`, or with a Kubernetes `appProtocol` value of `grpc` or `http2`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-grpc-service
spec:
  ports:
  - port: 50051
    name: grpc-api
    targetPort: 50051
  selector:
    app: my-grpc-service
```

The port name is critical. If you name it `tcp-api` instead of `grpc-api`, Istio treats it as opaque TCP and can't do per-request routing.

## Connection Pool Configuration

Control how many connections the sidecar maintains to each backend:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
        tcpKeepalive:
          time: 300s
          interval: 75s
          probes: 9
      http:
        h2UpgradePolicy: DEFAULT
        maxRequestsPerConnection: 1000
        maxRetries: 3
```

Key settings:
- `maxConnections` - Maximum number of HTTP/1.1 or TCP connections from one Envoy proxy to the destination host. Once reached, Envoy's connection circuit breaker can reject or overflow new connection attempts.
- `connectTimeout` - How long to wait for a TCP connection to be established.
- `tcpKeepalive` - Keeps idle connections alive and detects dead peers.
- `maxRequestsPerConnection` - After this many requests, the connection is closed and a new one is opened. This helps redistribute traffic. Set to 0 for unlimited.

## Managing Database Connection Pools

Database connections are typically long-lived TCP connections. Applications use connection pools to reuse them. With Istio, there are two layers of connection management: the application's pool and the sidecar's connection handling.

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: postgres-pool
spec:
  host: postgres.database.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 200
        connectTimeout: 10s
        tcpKeepalive:
          time: 600s
          interval: 75s
    tls:
      mode: ISTIO_MUTUAL
```

Make sure each sidecar's `maxConnections` is at least as high as the number of database connections that workload instance can open through that proxy. If each app pod has a pool of 50 connections, the outbound sidecar for that pod needs to allow at least 50 connections to the database service. The database itself still needs capacity for the total across replicas, such as 200 connections for 4 app replicas with 50 connections each.

## Handling WebSocket Connections

WebSocket connections are long-lived HTTP connections that get upgraded. Istio supports WebSockets, but you need to configure them correctly:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: websocket-service
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
        port:
          number: 8080
    timeout: 0s
```

Setting `timeout: 0s` disables the route timeout, which is useful if you have configured HTTP request timeouts elsewhere and want this route exempt. Istio's VirtualService HTTP timeout is disabled by default, so this field is only needed when overriding a nonzero timeout.

Also configure an upstream HTTP connection idle timeout if you want idle pooled HTTP connections to close only after a longer interval:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: websocket-dr
spec:
  host: ws-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        idleTimeout: 3600s
```

## TCP Keepalive Configuration

For any long-lived TCP connections, configure keepalives to detect dead connections and prevent intermediate network devices from dropping idle connections:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: long-lived-tcp
spec:
  host: my-tcp-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        tcpKeepalive:
          time: 300s
          interval: 75s
          probes: 9
```

- `time` - Time a connection needs to be idle before TCP starts sending keepalive probes
- `interval` - Time between keepalive probes
- `probes` - Number of unacknowledged probes before closing the connection

Without keepalives, cloud load balancers and NAT gateways will silently drop idle connections after their idle timeout (often 5-10 minutes). The client doesn't know the connection is dead until it tries to send data and gets a reset.

## Connection Draining During Deployments

When you deploy a new version of a service, persistent connections to the old pods need to be drained. Configure appropriate drain duration:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-service
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          drainDuration: 60s
          proxyMetadata:
            EXIT_ON_ZERO_ACTIVE_CONNECTIONS: "true"
    spec:
      terminationGracePeriodSeconds: 70
```

For services with many persistent HTTP connections, you might also want to encourage connection recycling through the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        maxRequestsPerConnection: 100
```

Setting `maxRequestsPerConnection` forces HTTP connections to be recycled periodically. This can help during a rolling deployment because connections naturally migrate to new pods as old HTTP connections reach their request limit and get closed. It does not drain arbitrary TCP or WebSocket connections.

## Monitoring Connection Health

Keep an eye on connection metrics:

```promql
# Active connections per destination

envoy_cluster_upstream_cx_active{cluster_name=~"outbound.*"}

# Connection timeouts
rate(envoy_cluster_upstream_cx_connect_timeout[5m])

# Connection pool overflow (requests dropped because pool is full)
rate(envoy_cluster_upstream_cx_overflow[5m])
```

If `upstream_cx_overflow` is non-zero, your `maxConnections` is too low. If `upstream_cx_connect_timeout` is increasing, backends are slow to accept connections or the connect timeout is too aggressive.

Getting persistent connections right with Istio comes down to proper port naming, reasonable connection pool limits, keepalive configuration, and understanding how your load balancing strategy interacts with long-lived connections.
