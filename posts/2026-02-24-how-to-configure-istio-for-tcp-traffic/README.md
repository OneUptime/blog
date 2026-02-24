# How to Configure Istio for TCP Traffic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, TCP, Service Mesh, Kubernetes, Envoy, Networking

Description: A hands-on guide to configuring Istio for TCP traffic including port naming, TCP routing, connection pooling, and traffic shifting for non-HTTP services.

---

Not everything in your cluster speaks HTTP. Databases, message queues, custom binary protocols, and plenty of other services communicate over raw TCP. Istio handles TCP traffic just fine, but the configuration looks different from HTTP routing, and some features you might be used to simply do not apply at the TCP layer.

## Port Naming for TCP Services

Istio relies on port naming conventions to determine how to handle traffic. For TCP services, prefix your port name with `tcp`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis
  namespace: default
spec:
  selector:
    app: redis
  ports:
    - name: tcp-redis
      port: 6379
      targetPort: 6379
      protocol: TCP
```

If you skip the port naming or use an unrecognized prefix, Istio will fall back to treating it as plain TCP anyway, but being explicit avoids surprises. Named ports also show up cleaner in metrics and telemetry.

## TCP Routing with VirtualService

TCP routing in Istio uses the `tcp` section of a VirtualService instead of the `http` section. Here is a basic example that routes all TCP traffic to a specific service:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: redis-route
  namespace: default
spec:
  hosts:
    - redis.default.svc.cluster.local
  tcp:
    - match:
        - port: 6379
      route:
        - destination:
            host: redis.default.svc.cluster.local
            port:
              number: 6379
```

TCP routing is simpler than HTTP routing because you cannot match on headers, paths, or methods. Your matching options are limited to port numbers and source labels.

## TCP Traffic Shifting

One of the most useful TCP features in Istio is traffic shifting. You can gradually migrate traffic between versions of a TCP service by adjusting weights:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: database-migration
  namespace: default
spec:
  hosts:
    - db.default.svc.cluster.local
  tcp:
    - route:
        - destination:
            host: db.default.svc.cluster.local
            subset: v1
            port:
              number: 5432
          weight: 80
        - destination:
            host: db.default.svc.cluster.local
            subset: v2
            port:
              number: 5432
          weight: 20
```

You need a corresponding DestinationRule that defines the subsets:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: db-subsets
  namespace: default
spec:
  host: db.default.svc.cluster.local
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
```

Keep in mind that TCP traffic shifting works at the connection level, not the request level. When a new connection comes in, Istio picks the destination based on the configured weights. Once established, that connection stays pinned to the chosen backend for its entire lifetime.

## Connection Pooling

For TCP services, connection pooling configuration is handled through DestinationRules:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: redis-pool
  namespace: default
spec:
  host: redis.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 10s
        tcpKeepalive:
          time: 7200s
          interval: 75s
          probes: 9
```

The `maxConnections` setting limits how many TCP connections the sidecar will open to the upstream service. If you hit this limit, new connection attempts will be queued or rejected depending on your outlier detection configuration.

The `tcpKeepalive` section enables TCP keepalive probes, which is important for long-lived connections that might sit idle. Without keepalives, intermediate network devices (load balancers, firewalls) might silently drop idle connections.

## Outlier Detection for TCP

Outlier detection for TCP services works differently than for HTTP. Since there are no HTTP status codes to evaluate, Istio uses connection errors as the signal:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: redis-outlier
  namespace: default
spec:
  host: redis.default.svc.cluster.local
  trafficPolicy:
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

For TCP, `consecutive5xxErrors` counts consecutive connection failures (connection timeouts, connection refused, etc.) rather than HTTP 5xx responses. When a backend hits the threshold, it gets ejected from the load balancing pool for the base ejection time.

## Exposing TCP Through the Gateway

To expose a TCP service through the Istio ingress gateway, configure the Gateway with the TCP protocol:

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
        number: 27017
        name: tcp-mongo
        protocol: TCP
      hosts:
        - "*"
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: mongo-external
  namespace: default
spec:
  hosts:
    - "*"
  gateways:
    - tcp-gateway
  tcp:
    - match:
        - port: 27017
      route:
        - destination:
            host: mongo.default.svc.cluster.local
            port:
              number: 27017
```

You need to make sure the ingress gateway actually listens on that port. If you are using the default Istio installation, you may need to update the ingress gateway Service to add the port:

```bash
kubectl patch svc istio-ingressgateway -n istio-system --type='json' \
  -p='[{"op":"add","path":"/spec/ports/-","value":{"name":"tcp-mongo","port":27017,"targetPort":27017,"protocol":"TCP"}}]'
```

## Authorization Policies for TCP

You can still apply authorization policies to TCP traffic, though your matching options are more limited than with HTTP:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: redis-access
  namespace: default
spec:
  selector:
    matchLabels:
      app: redis
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - cluster.local/ns/default/sa/backend-app
      to:
        - operation:
            ports:
              - "6379"
```

This policy restricts access to the Redis service so that only workloads running with the `backend-app` service account can connect on port 6379. You cannot match on paths or methods for TCP traffic, but you can match on source namespaces, service accounts, and IP ranges.

## mTLS for TCP

Mutual TLS works the same way for TCP as it does for HTTP. Istio's PeerAuthentication policy controls whether mTLS is required:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: redis-mtls
  namespace: default
spec:
  selector:
    matchLabels:
      app: redis
  mtls:
    mode: STRICT
```

With STRICT mode, only mTLS connections are accepted. This means any client that does not have an Istio sidecar will not be able to connect. Use PERMISSIVE mode during migration if you have non-mesh clients that need access.

## What You Cannot Do with TCP

A few things to keep in mind about TCP routing limitations in Istio:

- No header-based routing (there are no headers in raw TCP)
- No retries (Istio does not retry TCP connections)
- No fault injection (no way to inject delays or errors at the TCP level)
- No request-level metrics (you get connection-level metrics instead)
- No request-level tracing (TCP connections show up as single spans)

These are fundamental limitations of working at the TCP layer, not Istio-specific restrictions. If you need any of these features, you need to use a protocol that Istio understands at a higher level, like HTTP or gRPC.

## Debugging TCP Traffic

When troubleshooting TCP traffic, check the Envoy clusters and listeners:

```bash
istioctl proxy-config clusters deploy/redis -n default
istioctl proxy-config listeners deploy/redis -n default
```

Look for your service in the cluster list and verify the correct protocol is detected. You can also check active connections:

```bash
kubectl exec -it deploy/redis -c istio-proxy -- \
  pilot-agent request GET stats | grep tcp
```

This gives you metrics like `tcp.upstream_cx_total`, `tcp.upstream_cx_active`, and `tcp.upstream_cx_connect_fail`, which tell you whether connections are being established and maintained correctly.

## Summary

TCP traffic in Istio is well-supported but operates with a more limited feature set than HTTP. Name your ports with the `tcp` prefix, use the `tcp` section of VirtualService for routing, configure connection pooling and keepalives through DestinationRules, and apply authorization policies for access control. The main things to remember are that routing decisions happen at the connection level, not the request level, and features like retries and fault injection are not available for TCP.
