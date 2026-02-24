# How to Configure VirtualService for TCP Traffic Routing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, VirtualService, TCP Routing, Traffic Management, Kubernetes

Description: Learn how to configure Istio VirtualService for TCP traffic routing to manage non-HTTP protocols like databases and message queues.

---

Not everything speaks HTTP. Databases, message queues, custom TCP protocols, and many legacy services communicate over raw TCP. Istio supports TCP traffic routing through VirtualService, though the options are more limited compared to HTTP routing. You cannot match on headers or paths (because those are HTTP concepts), but you can do port-based routing and weighted traffic splitting.

## TCP vs HTTP Routing in Istio

The main difference is what you can match on:

| Feature | HTTP Routing | TCP Routing |
|---------|-------------|-------------|
| URI matching | Yes | No |
| Header matching | Yes | No |
| Weight-based splitting | Yes | Yes |
| Timeout | Yes | Yes |
| Retries | Yes | No |
| Fault injection | Yes | No |
| Port matching | Yes | Yes |
| Source label matching | Yes | Yes |

TCP routing uses the `tcp` section of VirtualService instead of the `http` section.

## Basic TCP Routing

Here is a simple TCP routing configuration for a database proxy:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: database
  namespace: default
spec:
  hosts:
    - database
  tcp:
    - route:
        - destination:
            host: database
            port:
              number: 5432
```

This routes all TCP traffic on port 5432 to the database service.

## Weighted TCP Routing

You can split TCP traffic between versions, just like HTTP:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: redis
  namespace: default
spec:
  hosts:
    - redis
  tcp:
    - route:
        - destination:
            host: redis
            subset: v6
            port:
              number: 6379
          weight: 80
        - destination:
            host: redis
            subset: v7
            port:
              number: 6379
          weight: 20
```

With the matching DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: redis
  namespace: default
spec:
  host: redis
  subsets:
    - name: v6
      labels:
        version: v6
    - name: v7
      labels:
        version: v7
```

80% of new TCP connections go to Redis v6 and 20% go to Redis v7. This is useful for canary-testing a database or cache upgrade.

## TCP Routing with Port Matching

You can match on the destination port:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: multi-port-service
  namespace: default
spec:
  hosts:
    - multi-port-service
  tcp:
    - match:
        - port: 5432
      route:
        - destination:
            host: postgres-service
            port:
              number: 5432
    - match:
        - port: 6379
      route:
        - destination:
            host: redis-service
            port:
              number: 6379
    - match:
        - port: 27017
      route:
        - destination:
            host: mongo-service
            port:
              number: 27017
```

Different ports go to different backend services.

## TCP Routing Through a Gateway

To expose TCP services through the Istio ingress gateway:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: tcp-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 5432
        name: tcp-postgres
        protocol: TCP
      hosts:
        - "db.example.com"
    - port:
        number: 6379
        name: tcp-redis
        protocol: TCP
      hosts:
        - "cache.example.com"
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: tcp-services
  namespace: default
spec:
  hosts:
    - "db.example.com"
    - "cache.example.com"
  gateways:
    - tcp-gateway
  tcp:
    - match:
        - port: 5432
      route:
        - destination:
            host: postgres
            port:
              number: 5432
    - match:
        - port: 6379
      route:
        - destination:
            host: redis
            port:
              number: 6379
```

Note: You need to configure the Istio ingress gateway Service to expose these TCP ports:

```bash
kubectl edit svc istio-ingressgateway -n istio-system
```

Add the ports:

```yaml
- name: tcp-postgres
  port: 5432
  targetPort: 5432
- name: tcp-redis
  port: 6379
  targetPort: 6379
```

## Source-Based TCP Routing

You can route TCP traffic based on which workload is making the connection:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: database
  namespace: default
spec:
  hosts:
    - database
  tcp:
    - match:
        - sourceLabels:
            app: admin-tool
      route:
        - destination:
            host: database-primary
            port:
              number: 5432
    - route:
        - destination:
            host: database-replica
            port:
              number: 5432
```

Admin tools connect to the primary database, while all other services connect to a read replica.

## Blue-Green for TCP Services

Blue-green deployments work for TCP services too:

```yaml
# Phase 1: All traffic to blue
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-tcp-service
  namespace: default
spec:
  hosts:
    - my-tcp-service
  tcp:
    - route:
        - destination:
            host: my-tcp-service
            subset: blue
            port:
              number: 9000
          weight: 100
```

```yaml
# Phase 2: Switch to green
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-tcp-service
  namespace: default
spec:
  hosts:
    - my-tcp-service
  tcp:
    - route:
        - destination:
            host: my-tcp-service
            subset: green
            port:
              number: 9000
          weight: 100
```

## Connection Pool Settings for TCP

TCP services often need tuned connection pool settings:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: database
  namespace: default
spec:
  host: database
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
        tcpKeepalive:
          time: 300s
          interval: 75s
          probes: 3
```

- `maxConnections` limits how many connections each sidecar can have to the destination
- `connectTimeout` is how long to wait for a connection to establish
- `tcpKeepalive` detects and cleans up dead connections

## Circuit Breaking for TCP

You can configure circuit breaking for TCP services:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: database
  namespace: default
spec:
  host: database
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
      maxEjectionPercent: 50
    connectionPool:
      tcp:
        maxConnections: 50
```

If a database pod has 5 consecutive errors within 30 seconds, it gets ejected from the load balancing pool for 60 seconds.

## Debugging TCP Routing

TCP routing issues can be harder to debug than HTTP because you cannot inspect headers or URLs:

```bash
# Check the TCP route configuration
istioctl proxy-config routes deploy/my-client -o json

# Check cluster configuration for TCP destinations
istioctl proxy-config clusters deploy/my-client -o json | grep database

# Check endpoint resolution
istioctl proxy-config endpoints deploy/my-client --cluster "outbound|5432||database.default.svc.cluster.local"

# Check for connection issues in Envoy stats
kubectl exec deploy/my-client -c istio-proxy -- curl -s localhost:15090/stats/prometheus | grep cx_connect
```

## Mixed HTTP and TCP VirtualService

A single VirtualService can handle both HTTP and TCP traffic:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service
  namespace: default
spec:
  hosts:
    - my-service
  http:
    - match:
        - port: 8080
      route:
        - destination:
            host: my-service
            port:
              number: 8080
  tcp:
    - match:
        - port: 9000
      route:
        - destination:
            host: my-service
            port:
              number: 9000
```

Port 8080 is handled as HTTP with full HTTP routing capabilities, while port 9000 is handled as raw TCP.

## Limitations of TCP Routing

1. **No content-based routing** - You cannot inspect TCP payloads for routing decisions
2. **No retries** - TCP does not have the concept of retries at the connection level
3. **No fault injection** - You cannot inject delays or errors into TCP streams
4. **No request mirroring** - Mirroring is an HTTP-only feature
5. **Limited metrics** - TCP metrics are connection-based (bytes sent/received, connection count) rather than request-based

TCP routing in Istio covers the basics well: version-based routing, traffic splitting, and connection management. For more advanced TCP protocol handling, you might need protocol-specific proxies, but for general traffic management, VirtualService TCP routing gets the job done.
