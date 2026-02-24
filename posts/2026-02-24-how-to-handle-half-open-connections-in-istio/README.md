# How to Handle Half-Open Connections in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Half-Open Connections, TCP, Envoy, Connection Management

Description: How to detect and handle half-open TCP connections in Istio to prevent resource leaks and hanging requests in your service mesh.

---

Half-open connections are one of those sneaky problems that can quietly degrade your service mesh. A half-open TCP connection happens when one side of the connection thinks it's still open while the other side has closed or crashed without sending a proper FIN or RST packet. The result is a connection that consumes resources, never completes, and can cause requests to hang indefinitely.

In a service mesh like Istio, half-open connections are particularly problematic because both the application and the Envoy sidecar maintain connection pools. A half-open connection in either layer can cause cascading issues.

## How Half-Open Connections Happen

Several scenarios create half-open connections:

1. **Network partition** - A network issue prevents the FIN/RST packet from reaching the other side
2. **Process crash** - The remote application crashes without going through normal TCP shutdown
3. **Firewall timeout** - A stateful firewall silently drops the connection after an idle timeout
4. **Cloud NAT gateway timeout** - NAT gateways (like AWS NAT Gateway) drop idle connections after their timeout (typically 350 seconds)
5. **Node failure** - The remote node goes down without sending any packets

In all these cases, the local side keeps the connection in ESTABLISHED state, unaware that nothing is on the other end.

## Detecting Half-Open Connections

You can look for signs of half-open connections in several places:

```bash
# Check connection states in the Envoy proxy
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep upstream_cx_active

# Check for connections that have been open for a long time
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep upstream_cx_length_ms

# Look for timeout errors which may indicate half-open connections
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep upstream_rq_timeout

# Check TCP connection states at the OS level
kubectl exec my-pod -c istio-proxy -- ss -tnp | grep ESTABLISHED
```

If you see connections in ESTABLISHED state that have been idle for a very long time, they might be half-open.

## TCP Keep-Alive as the Primary Defense

TCP keep-alive is the most fundamental protection against half-open connections. It works by sending periodic probe packets on idle connections. If the probes don't get a response, the OS closes the connection.

Configure TCP keep-alive in Istio using a `DestinationRule`:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: backend-keepalive
spec:
  host: backend-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        tcpKeepalive:
          time: 300s
          interval: 30s
          probes: 3
        connectTimeout: 10s
```

With these settings:
- After 300 seconds of idle time, the OS starts sending keep-alive probes
- Probes are sent every 30 seconds
- After 3 failed probes (90 seconds), the connection is closed

Total detection time: 300 + (30 * 3) = 390 seconds from the last activity. That might seem long, but it's much better than never detecting the dead connection.

For faster detection, reduce the values:

```yaml
tcpKeepalive:
  time: 60s
  interval: 10s
  probes: 3
```

Now detection happens in 60 + (10 * 3) = 90 seconds. Be careful with very aggressive settings though - they generate more network traffic and can cause false positives on temporarily congested networks.

## Connection Timeouts

Envoy provides several timeout knobs that help with half-open connections:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: backend-timeouts
spec:
  host: backend-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        connectTimeout: 5s
        maxConnections: 100
      http:
        idleTimeout: 300s
        maxRequestsPerConnection: 1000
```

The `connectTimeout` prevents hanging on connection establishment. The `idleTimeout` closes connections that have been idle for too long. And `maxRequestsPerConnection` forces periodic connection recycling, which naturally cleans up any stale connections.

## HTTP Timeouts for Request-Level Protection

Even with TCP keep-alive, an individual request can hang if the remote side accepts the connection but never responds. Request-level timeouts catch this:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: backend-vs
spec:
  hosts:
    - backend-service
  http:
    - route:
        - destination:
            host: backend-service
      timeout: 30s
```

This ensures that no request waits more than 30 seconds for a response. If a half-open connection causes a request to hang, the timeout triggers and the client gets an error instead of waiting forever.

## Circuit Breaking

Circuit breaking complements keep-alive by limiting the damage from unhealthy connections:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: backend-circuit-breaker
spec:
  host: backend-service.default.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
        tcpKeepalive:
          time: 120s
          interval: 15s
          probes: 3
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 200
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
```

The `maxConnections` limit prevents resource exhaustion from too many connections piling up. Outlier detection ejects endpoints that are returning errors, which can happen when requests are sent over half-open connections.

## Handling Cloud NAT Timeouts

If your services communicate across subnets through a NAT gateway, the NAT timeout is a common source of half-open connections. AWS NAT Gateway, for example, drops idle TCP connections after 350 seconds.

The fix is to set TCP keep-alive time lower than the NAT timeout:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: cross-subnet-service
spec:
  host: cross-subnet-service.other-namespace.svc.cluster.local
  trafficPolicy:
    connectionPool:
      tcp:
        tcpKeepalive:
          time: 120s
          interval: 30s
          probes: 3
```

With `time: 120s`, keep-alive probes start well before the NAT gateway's 350-second timeout, keeping the NAT mapping alive.

## Global Keep-Alive Settings

For mesh-wide protection, set TCP keep-alive at the global level:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    tcpKeepalive:
      time: 300s
      interval: 30s
      probes: 3
```

This applies to all connections in the mesh unless overridden by a per-service DestinationRule.

## Monitoring for Half-Open Connections

Set up monitoring to detect half-open connection issues:

```bash
# Watch for increasing connection counts without corresponding request activity
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep -E "upstream_cx_(active|total|destroy)"

# Check for request timeouts which may indicate half-open connections
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep "upstream_rq_timeout"

# Monitor connection pool overflow
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep "upstream_cx_overflow"
```

In Prometheus, track these metrics:
- `envoy_cluster_upstream_cx_active` - Active connections per cluster
- `envoy_cluster_upstream_cx_connect_timeout` - Connect timeouts
- `envoy_cluster_upstream_rq_timeout` - Request timeouts
- `envoy_cluster_upstream_cx_destroy_with_active_rq` - Connections destroyed while requests were in-flight

A spike in timeouts combined with high active connection counts is a strong signal of half-open connections.

## Summary

The defense against half-open connections in Istio is layered: TCP keep-alive for detection, connection timeouts for cleanup, request timeouts for limiting user impact, and circuit breaking for preventing cascading failures. Set TCP keep-alive on all services by default and tune it per-service when needed, especially for cross-network or cross-NAT communication.
