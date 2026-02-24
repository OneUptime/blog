# How to Configure Istio for HTTP/2 Traffic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, HTTP/2, Performance, Envoy, Traffic Management

Description: How to configure Istio for HTTP/2 traffic including service port naming, connection management, multiplexing settings, and performance tuning for h2 workloads.

---

HTTP/2 brings significant performance improvements over HTTP/1.1: multiplexed streams, header compression, server push, and binary framing. Istio supports HTTP/2 natively through Envoy, and in many cases, the sidecar-to-sidecar communication already uses HTTP/2 for mTLS connections. But getting the full benefit of HTTP/2 from your clients through the ingress gateway and between services requires proper configuration.

This guide covers how to configure Istio for HTTP/2 traffic end-to-end.

## Port Naming for HTTP/2

Just like HTTP/1.1, Istio relies on port naming to identify HTTP/2 traffic. Use the `http2` or `h2` prefix:

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
  - name: http2
    port: 8080
    targetPort: 8080
  - name: http2-web
    port: 80
    targetPort: 8080
```

Or use the `appProtocol` field:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
  - name: web
    port: 8080
    targetPort: 8080
    appProtocol: http2
```

This tells Istio to use HTTP/2 when connecting to the upstream service.

## How Istio Handles HTTP/2 Internally

Inside the mesh, Istio already uses HTTP/2 for communication between sidecars when mTLS is enabled. The flow looks like this:

```
App (HTTP/1.1 or HTTP/2) -> Client Sidecar (HTTP/2 over mTLS) -> Server Sidecar -> App
```

Even if your application speaks HTTP/1.1, the sidecar-to-sidecar connection uses HTTP/2. This means you get multiplexing between proxies without changing your application. But if your application supports HTTP/2, you can get end-to-end HTTP/2 including the application-to-proxy legs.

## Configuring HTTP/2 at the Ingress Gateway

For external clients to use HTTP/2, configure the ingress gateway:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: h2-gateway
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
      credentialName: my-tls-secret
    hosts:
    - "app.example.com"
```

HTTPS with TLS automatically supports HTTP/2 through ALPN (Application-Layer Protocol Negotiation). Clients that support HTTP/2 will negotiate it during the TLS handshake.

To verify HTTP/2 is working through the gateway:

```bash
curl -v --http2 https://app.example.com/status
```

Look for `< HTTP/2 200` in the output. If you see `< HTTP/1.1 200`, HTTP/2 negotiation failed.

## HTTP/2 Connection Pool Settings

HTTP/2 multiplexes multiple requests over a single connection, so connection pool settings differ from HTTP/1.1:

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
        maxConnections: 10
      http:
        http2MaxRequests: 1000
        maxRequestsPerConnection: 0
        h2UpgradePolicy: DEFAULT
```

Key differences from HTTP/1.1:

- `maxConnections`: With HTTP/2 multiplexing, you need fewer TCP connections. 1-10 connections is often sufficient.
- `http2MaxRequests`: Maximum number of concurrent requests across all connections. This is the primary concurrency limiter for HTTP/2.
- `maxRequestsPerConnection`: Set to 0 for unlimited. HTTP/2 connections are long-lived and designed for many requests.

## H2 Upgrade Policy

The `h2UpgradePolicy` controls how Envoy handles HTTP/1.1 to HTTP/2 upgrades:

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  trafficPolicy:
    connectionPool:
      http:
        h2UpgradePolicy: UPGRADE
```

Options:
- `DEFAULT`: Use mesh-wide default (usually no upgrade)
- `DO_NOT_UPGRADE`: Always use HTTP/1.1
- `UPGRADE`: Upgrade HTTP/1.1 connections to HTTP/2

The `UPGRADE` setting is useful when your application sends HTTP/1.1 but the backend supports HTTP/2. Envoy will upgrade the backend connection to HTTP/2, giving you multiplexing benefits on the backend side.

## End-to-End HTTP/2

For true end-to-end HTTP/2, your application needs to speak HTTP/2 and the port needs to be properly declared:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: h2-service
spec:
  ports:
  - name: http2
    port: 8080
    targetPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: h2-service
spec:
  template:
    spec:
      containers:
      - name: h2-service
        image: h2-service:latest
        ports:
        - containerPort: 8080
        env:
        - name: ENABLE_HTTP2
          value: "true"
```

Verify end-to-end HTTP/2:

```bash
# From inside the mesh
kubectl exec deploy/sleep -c sleep -- \
  curl -v --http2-prior-knowledge http://h2-service:8080/status
```

The `--http2-prior-knowledge` flag tells curl to use HTTP/2 without upgrade negotiation (h2c, or HTTP/2 cleartext).

## HTTP/2 over Cleartext (h2c)

For service-to-service communication within the mesh, you might want HTTP/2 without TLS (since mTLS is handled by the sidecars). This is h2c (HTTP/2 cleartext):

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
  - name: http2
    port: 8080
    appProtocol: http2
```

When Istio sees the `http2` port name or appProtocol, it will use HTTP/2 for the connection from the server sidecar to the application.

## Flow Control and Window Sizes

HTTP/2 uses flow control to prevent any single stream from consuming all bandwidth. Envoy handles this automatically, but you can tune it through EnvoyFilters if needed. For most workloads, the defaults are fine.

If you are seeing slow HTTP/2 performance on high-bandwidth streams, it might be a flow control issue. Check the proxy stats:

```bash
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep "http2"
```

Look for `h2.tx_flush_timeout` or `h2.stream_refused` which indicate flow control problems.

## Monitoring HTTP/2 Performance

Monitor HTTP/2 specific metrics:

```bash
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep "http2\|upstream_cx"
```

Key metrics:
- `http2.rx_messaging_error`: Protocol errors received
- `http2.streams_active`: Currently active streams
- `http2.pending_send_bytes`: Data waiting to be sent (flow control)
- `upstream_cx_http2_total`: Total HTTP/2 connections

## VirtualService Configuration for HTTP/2

VirtualService routing works the same way for HTTP/2 as HTTP/1.1:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-service
spec:
  hosts:
  - my-service
  http:
  - match:
    - headers:
        x-version:
          exact: beta
    route:
    - destination:
        host: my-service
        subset: v2
  - route:
    - destination:
        host: my-service
        subset: v1
```

Header matching, URI matching, and all other routing features work with HTTP/2 because Envoy decompresses the HPACK-encoded headers before evaluating match rules.

## Debugging HTTP/2 Issues

If HTTP/2 is not working as expected, check these areas:

1. Verify the port naming:

```bash
kubectl get svc my-service -o jsonpath='{.spec.ports[*].name}'
```

2. Check what protocol Envoy is actually using:

```bash
istioctl proxy-config clusters deploy/sleep -n default -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for c in data:
    if 'my-service' in c.get('name', ''):
        print(f\"Cluster: {c['name']}\")
        tp = c.get('typedExtensionProtocolOptions', {})
        if 'envoy.extensions.upstreams.http.v3.HttpProtocolOptions' in tp:
            print('  Protocol options configured')
"
```

3. Check for connection errors:

```bash
kubectl exec deploy/my-service -c istio-proxy -- \
  pilot-agent request GET stats | grep "http2.*error"
```

## Wrapping Up

Istio handles HTTP/2 well, and most of the configuration is about telling Istio that your services speak HTTP/2 through proper port naming. The sidecar-to-sidecar communication already uses HTTP/2, so you are getting multiplexing benefits even with HTTP/1.1 applications. For full end-to-end HTTP/2, make sure your ports are named correctly, set appropriate connection pool limits (fewer connections, more concurrent requests), and verify with curl or proxy stats that HTTP/2 is actually being negotiated.
