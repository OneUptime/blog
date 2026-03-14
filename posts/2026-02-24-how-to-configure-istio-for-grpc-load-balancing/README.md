# How to Configure Istio for gRPC Load Balancing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, GRPC, Load Balancing, Kubernetes, Service Mesh

Description: Learn how to configure Istio for proper gRPC load balancing across your Kubernetes services, including connection-level and request-level strategies.

---

gRPC uses HTTP/2 under the hood, and that creates a tricky problem for load balancing. Unlike HTTP/1.1, where each request gets its own connection, HTTP/2 multiplexes multiple requests over a single long-lived connection. This means traditional connection-level load balancing (like what a basic Kubernetes Service does) will just pin all traffic to one pod. Not great.

Istio solves this because the Envoy sidecar proxy understands HTTP/2 and can do request-level (L7) load balancing. But you need to set things up correctly. Here is how.

## Why gRPC Load Balancing Is Different

A standard Kubernetes Service uses kube-proxy, which operates at L4 (TCP level). When a gRPC client connects, kube-proxy picks one backend pod and all subsequent requests on that connection go to the same pod. You end up with hot spots where one pod is overloaded and others are idle.

Istio's sidecar intercepts outbound traffic and, because Envoy understands HTTP/2 framing, it can distribute individual gRPC requests across multiple pods even over a single connection.

## Basic Setup

First, make sure your Kubernetes Service is declared with the right port naming. Istio uses port names to detect the protocol:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: grpc-backend
  namespace: default
spec:
  selector:
    app: grpc-backend
  ports:
    - name: grpc
      port: 50051
      targetPort: 50051
      protocol: TCP
```

The port name `grpc` tells Istio this is a gRPC service. You can also use `grpc-web` or any name prefixed with `grpc-`. Without this naming convention, Istio treats the traffic as opaque TCP and you lose L7 load balancing.

## Configuring the Load Balancing Algorithm

By default, Istio uses round-robin. You can change this with a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: grpc-backend-lb
  namespace: default
spec:
  host: grpc-backend.default.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      simple: ROUND_ROBIN
```

The available options are:

- `ROUND_ROBIN` - distributes requests evenly across all healthy endpoints
- `LEAST_REQUEST` - sends to the endpoint with fewest active requests (often best for gRPC)
- `RANDOM` - picks a random endpoint
- `PASSTHROUGH` - sends directly to the endpoint without any balancing

For gRPC workloads, `LEAST_REQUEST` tends to work well because gRPC calls can vary wildly in duration. A unary call might take 5ms while a server-streaming call takes 30 seconds. Round-robin does not account for that.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: grpc-backend-lb
  namespace: default
spec:
  host: grpc-backend.default.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
```

## Consistent Hashing for Sticky Sessions

Sometimes you need affinity, for example if your gRPC service maintains in-memory state. You can use consistent hashing:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: grpc-backend-sticky
  namespace: default
spec:
  host: grpc-backend.default.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      consistentHash:
        httpHeaderName: x-user-id
```

This routes all requests with the same `x-user-id` header to the same backend pod. Other options for the hash key include `useSourceIp: true` and `httpCookie` (though cookies are less common in gRPC).

## Connection Pool Settings

For gRPC, tuning the connection pool matters. You want to control how many HTTP/2 connections Envoy opens to each backend:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: grpc-backend-pool
  namespace: default
spec:
  host: grpc-backend.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: UPGRADE
        maxRequestsPerConnection: 0
      tcp:
        maxConnections: 100
    loadBalancer:
      simple: LEAST_REQUEST
```

Setting `h2UpgradePolicy: UPGRADE` ensures HTTP/2 is used. `maxRequestsPerConnection: 0` means unlimited requests per connection (which is what you want for HTTP/2). `maxConnections` limits the total number of TCP connections to each backend.

## Verifying Load Balancing Is Working

Deploy a simple gRPC service with multiple replicas:

```bash
kubectl scale deployment grpc-backend --replicas=3
```

Then generate some traffic and check the distribution. You can look at Envoy's stats:

```bash
kubectl exec -it <client-pod> -c istio-proxy -- \
  pilot-agent request GET stats | grep grpc-backend | grep upstream_rq
```

You should see requests spread across multiple endpoints. If all traffic is going to one pod, check that:

1. Your Service port is named correctly (starts with `grpc`)
2. The sidecar is injected on both client and server pods
3. You are not using a headless Service with DNS round-robin (Istio handles this differently)

## Traffic Splitting for gRPC

You can also split gRPC traffic across different versions using a VirtualService:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: grpc-backend-vs
  namespace: default
spec:
  hosts:
    - grpc-backend.default.svc.cluster.local
  http:
    - route:
        - destination:
            host: grpc-backend.default.svc.cluster.local
            subset: v1
          weight: 80
        - destination:
            host: grpc-backend.default.svc.cluster.local
            subset: v2
          weight: 20
```

With the corresponding DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: grpc-backend-versions
  namespace: default
spec:
  host: grpc-backend.default.svc.cluster.local
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
  trafficPolicy:
    loadBalancer:
      simple: LEAST_REQUEST
```

## Locality-Aware Load Balancing

If your cluster spans multiple zones, Istio can prefer local endpoints:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: grpc-backend-locality
  namespace: default
spec:
  host: grpc-backend.default.svc.cluster.local
  trafficPolicy:
    loadBalancer:
      localityLbSetting:
        enabled: true
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
```

Note that locality-aware load balancing requires outlier detection to be configured. Without it, Istio cannot detect unhealthy endpoints in a zone and failover to another zone.

## Common Pitfalls

A few things that trip people up with gRPC load balancing in Istio:

**Client-side keepalives conflicting with Envoy.** If your gRPC client sends keepalive pings too aggressively, Envoy might reject them. Set `keepalive_time` to at least 10 seconds on the client side.

**Using headless Services.** When you use a headless Service (clusterIP: None), DNS returns all pod IPs directly. The gRPC client might do its own load balancing, which conflicts with Envoy's. Stick with regular ClusterIP Services and let Istio handle distribution.

**Missing protocol detection.** If your port is not named `grpc` or `grpc-*`, Istio falls back to TCP-level balancing. Always name your ports correctly or use the `appProtocol` field:

```yaml
ports:
  - name: server
    port: 50051
    appProtocol: grpc
```

**Not enabling outlier detection.** Without outlier detection, unhealthy pods keep receiving traffic. Always pair your load balancer config with outlier detection for production workloads.

gRPC load balancing in Istio works reliably once you get the configuration right. The key things to remember are proper port naming, choosing the right algorithm (usually LEAST_REQUEST), and always enabling outlier detection for production services.
