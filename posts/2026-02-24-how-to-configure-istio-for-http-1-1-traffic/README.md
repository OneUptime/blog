# How to Configure Istio for HTTP/1.1 Traffic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, HTTP, Traffic Management, Envoy, Protocol Configuration

Description: How to configure Istio to properly handle HTTP/1.1 traffic including port naming, connection management, keep-alive settings, and protocol detection.

---

Most services still use HTTP/1.1, and Istio handles it well out of the box. But there are configuration details that matter for performance, reliability, and correct behavior. Things like port naming conventions, connection pooling, and keep-alive settings all affect how HTTP/1.1 traffic flows through the mesh.

This guide covers how to configure Istio specifically for HTTP/1.1 traffic.

## Port Naming for HTTP/1.1

Istio uses port naming conventions to determine the protocol for each service port. For HTTP/1.1, name your ports with the `http` prefix:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: default
spec:
  selector:
    app: my-service
  ports:
  - name: http
    port: 80
    targetPort: 8080
  - name: http-api
    port: 8080
    targetPort: 8080
  - name: http-metrics
    port: 9090
    targetPort: 9090
```

Valid HTTP/1.1 port names include: `http`, `http-*`, `http2` (for HTTP/2). Without a proper port name, Istio falls back to protocol sniffing, which adds latency to the first request on each connection.

You can also use the `appProtocol` field:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
  - name: web
    port: 80
    targetPort: 8080
    appProtocol: http
```

## Understanding Protocol Detection

When a port is not named with a recognized prefix, Istio uses automatic protocol detection. For HTTP/1.1, this works by inspecting the first few bytes of each new connection. The downside is that this adds a small delay (typically 100-200ms) and does not work for server-first protocols.

To avoid protocol detection overhead, always name your ports:

```bash
# Check if protocol detection is being used
istioctl proxy-config clusters deploy/my-service -n default -o json | \
  python3 -c "
import json, sys
clusters = json.load(sys.stdin)
for c in clusters:
    name = c.get('name', '')
    if 'my-service' in name:
        metadata = c.get('metadata', {}).get('filterMetadata', {})
        istio_meta = metadata.get('istio', {})
        print(f\"{name}: protocol={istio_meta.get('default_original_port', 'unknown')}\")
"
```

## Connection Pool Configuration

HTTP/1.1 uses one request per connection at a time (no multiplexing). This means you need more connections to handle concurrent requests compared to HTTP/2. Configure the connection pool in a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
  namespace: default
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
      http:
        http1MaxPendingRequests: 100
        maxRequestsPerConnection: 10
        h2UpgradePolicy: DEFAULT
```

Key settings for HTTP/1.1:

- `maxConnections`: Maximum number of TCP connections to the upstream. Since HTTP/1.1 uses one request per connection, this effectively limits concurrency.
- `http1MaxPendingRequests`: Maximum number of requests waiting for a connection from the pool.
- `maxRequestsPerConnection`: How many requests to send on a single connection before closing it. Set to 0 for unlimited. Setting a finite value helps with load distribution.
- `h2UpgradePolicy`: Controls whether HTTP/1.1 connections can be upgraded to HTTP/2. Set to `DO_NOT_UPGRADE` to force HTTP/1.1.

## Forcing HTTP/1.1 (Preventing H2 Upgrade)

Some backends do not support HTTP/2. Force HTTP/1.1 to prevent Envoy from upgrading:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: legacy-service
  namespace: default
spec:
  host: legacy-service
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: DO_NOT_UPGRADE
```

This is important for services that advertise HTTP/2 support (e.g., through ALPN) but do not actually handle it correctly.

## Keep-Alive Configuration

HTTP/1.1 keep-alive allows multiple requests on a single TCP connection. Istio's Envoy proxy manages keep-alive through TCP keep-alive settings:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
  namespace: default
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        tcpKeepalive:
          time: 300s
          interval: 30s
          probes: 3
```

TCP keep-alive settings:
- `time`: How long a connection is idle before sending the first keep-alive probe (300 seconds)
- `interval`: Time between subsequent probes (30 seconds)
- `probes`: Number of failed probes before the connection is considered dead (3)

## Configuring Timeouts

Set request and idle timeouts for HTTP/1.1 traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service
  namespace: default
spec:
  hosts:
  - my-service
  http:
  - timeout: 30s
    route:
    - destination:
        host: my-service
```

For the connection idle timeout (how long a keep-alive connection stays open without any requests):

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
        connectTimeout: 5s
```

## Handling Chunked Transfer Encoding

HTTP/1.1 supports chunked transfer encoding for streaming responses. Istio handles this transparently, but be aware of buffering behavior. By default, Envoy may buffer the response before forwarding it.

If you need streaming without buffering, consider using a route-level configuration:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: streaming-service
spec:
  hosts:
  - streaming-service
  http:
  - route:
    - destination:
        host: streaming-service
```

For large file uploads or downloads, you may need to increase the maximum request body size through an EnvoyFilter if the defaults are not sufficient.

## Retry Configuration for HTTP/1.1

Configure retries for transient failures:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - retries:
      attempts: 3
      perTryTimeout: 5s
      retryOn: 5xx,reset,connect-failure,retriable-4xx
    route:
    - destination:
        host: my-service
```

The `retryOn` field specifies which conditions trigger a retry. For HTTP/1.1:
- `5xx`: Retry on 5xx status codes
- `reset`: Retry on connection reset
- `connect-failure`: Retry when unable to connect
- `retriable-4xx`: Retry on specific 4xx codes (like 409)

## Ingress Gateway Configuration for HTTP/1.1

Configure the ingress gateway for HTTP/1.1 traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: http-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "*.example.com"
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
spec:
  hosts:
  - "app.example.com"
  gateways:
  - istio-system/http-gateway
  http:
  - route:
    - destination:
        host: my-service
        port:
          number: 8080
```

## Redirecting HTTP to HTTPS

For production, redirect HTTP/1.1 traffic to HTTPS:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: http-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "*.example.com"
    tls:
      httpsRedirect: true
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "*.example.com"
    tls:
      mode: SIMPLE
      credentialName: my-tls-secret
```

## Monitoring HTTP/1.1 Traffic

Check connection pool stats for HTTP/1.1:

```bash
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep -E "upstream_cx|upstream_rq"
```

Key metrics:
- `upstream_cx_active`: Active connections
- `upstream_cx_total`: Total connections created
- `upstream_rq_active`: Active requests
- `upstream_rq_pending_overflow`: Requests rejected by circuit breaker

## Wrapping Up

HTTP/1.1 is the workhorse of web traffic, and Istio handles it reliably when configured correctly. Name your ports properly to avoid protocol detection overhead, size your connection pools based on expected concurrency, and use keep-alive to reduce connection setup costs. For services that must stay on HTTP/1.1, use the `DO_NOT_UPGRADE` h2 upgrade policy. These configurations are straightforward but make a measurable difference in performance and reliability.
