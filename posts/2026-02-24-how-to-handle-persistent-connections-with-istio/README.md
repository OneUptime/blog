# How to Handle Persistent Connections with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Connection Pooling, Load Balancing, Envoy

Description: How to properly manage long-lived and persistent connections in Istio to prevent load balancing issues and connection exhaustion in your service mesh.

---

Persistent connections are everywhere in modern applications. HTTP/2 multiplexes requests over a single connection, gRPC keeps connections open for streaming, databases use connection pools, and WebSockets maintain long-lived connections. When you put Istio in front of these workloads, the Envoy sidecar sits in the middle of every connection, and you need to understand how it handles them.

The biggest issue with persistent connections in a service mesh is load balancing. When a connection is established, all traffic on that connection goes to the same backend. If connections are long-lived and carry lots of requests, you end up with uneven load distribution. This guide covers how to handle that and other persistent connection challenges.

## The Load Balancing Problem

Consider a gRPC service with 3 replicas behind a Kubernetes Service. A client creates a single gRPC channel (which uses one HTTP/2 connection). All RPCs on that channel go to the same backend pod because they share one connection. Even though Istio is doing L7 load balancing, it made the routing decision once when the connection was established.

You can see this imbalance in your metrics:

```promql
sum(rate(istio_requests_total{destination_service="my-grpc-service"}[5m])) by (destination_workload_namespace, destination_workload, destination_canonical_revision)
```

If one pod is handling 90% of traffic while the other two are idle, you have a persistent connection load balancing problem.

## Fixing gRPC Load Balancing

For gRPC specifically, Istio can do per-request load balancing because it understands the HTTP/2 protocol. The key is making sure your DestinationRule enables this:

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

With Istio's L7 processing, each gRPC call (which is an HTTP/2 stream) can be routed independently. This happens automatically for services with ports named `grpc-*` or `http2-*`:

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
- `maxConnections` - Maximum number of TCP connections to the service. Once reached, new connection attempts are queued.
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

Make sure the sidecar's `maxConnections` is at least as high as your application's connection pool size. If your app pool allows 50 connections and you have 4 replicas, the sidecar needs to support at least 200 connections (50 * 4) to the database service.

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

Setting `timeout: 0s` disables the request timeout, which is necessary for WebSocket connections that can last hours. Without this, Envoy will terminate the connection after the default timeout (15 seconds for HTTP).

Also configure idle timeout for WebSocket connections:

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

For services with many persistent connections, you might also want to enable connection draining at the Envoy level through the DestinationRule:

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

Setting `maxRequestsPerConnection` forces connections to be recycled periodically. This means during a rolling deployment, connections naturally migrate to new pods as old connections reach their request limit and get closed.

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
