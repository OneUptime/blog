# How to Configure Protocol Detection Settings in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Protocol Detection, Envoy, Networking, Service Mesh

Description: How to configure and troubleshoot Istio's automatic protocol detection for HTTP, TCP, and server-first protocols in your mesh.

---

Istio needs to know the protocol of your traffic to apply the right filters. HTTP traffic gets routing, retries, and detailed metrics. TCP traffic gets basic connection-level handling. When port names or `appProtocol` don't explicitly specify the protocol, Istio falls back to automatic protocol detection, which inspects the first bytes of a connection to figure out the protocol.

While protocol detection works in many cases, it's not foolproof. Misconfigured detection can cause connection timeouts, broken server-first protocols, and degraded performance. Knowing how to configure and troubleshoot it saves a lot of debugging time.

## How Protocol Detection Works

When Envoy receives a new connection on a port without explicit protocol configuration, it uses its `FilterChainMatch` with `transportProtocol` and the HTTP inspector listener filter to detect the protocol:

1. Envoy reads the first few bytes of the connection (without consuming them)
2. The HTTP inspector checks if the bytes match an HTTP request pattern
3. If it matches, the HTTP filter chain is selected
4. If it doesn't match within the timeout, the TCP filter chain is selected

The detection happens at the listener level, before any filter chain processing. You can see this in the listener configuration:

```bash
istioctl proxy-config listener my-pod --port 15006 -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for lf in data[0].get('listenerFilters', []):
    print(lf['name'])
"
```

You should see `envoy.filters.listener.http_inspector` in the output.

## The Protocol Detection Timeout

The detection timeout determines how long Envoy waits for client data before deciding the protocol is not HTTP:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    protocolDetectionTimeout: 100ms
```

The default is `100ms` for outbound connections and `0ms` (disabled - infinite wait) for inbound connections on permissive mTLS.

A few things to consider about this timeout:

- **Too short** - May misidentify slow clients as TCP when they're actually HTTP
- **Too long** - Adds latency to TCP connections and breaks server-first protocols
- **Zero** - Disables the timeout entirely. Envoy waits indefinitely for client data. This breaks server-first protocols.

## Configuring Per-Port Protocol

The most reliable approach is to avoid protocol detection entirely by explicitly declaring the protocol on every port:

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
      appProtocol: http
    - name: grpc-rpc
      port: 9090
      targetPort: 9090
      appProtocol: grpc
    - name: tcp-db
      port: 5432
      targetPort: 5432
      appProtocol: tcp
```

With explicit protocols, Envoy doesn't need to sniff the connection. It immediately selects the right filter chain.

## Handling Server-First Protocols

Server-first protocols are the biggest problem for protocol detection. These protocols have the server send the initial data:

- MySQL (sends greeting packet)
- PostgreSQL (server sends authentication request)
- SMTP (sends banner)
- MongoDB (older wire protocol versions)
- Redis (can be server-first in some configurations)

When Envoy is doing protocol detection on an inbound connection for a server-first protocol, here's what happens:

1. Client connects to the server through Envoy
2. Envoy intercepts and waits for client data to detect the protocol
3. The server is also waiting for client data (or trying to send its greeting)
4. Deadlock: neither side sends data because Envoy is in the middle waiting

The fix is to explicitly declare these ports as TCP:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: mysql-service
spec:
  ports:
    - name: tcp-mysql
      port: 3306
      targetPort: 3306
      appProtocol: tcp
```

Or set the detection timeout to a non-zero value so Envoy gives up and falls through to TCP:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    protocolDetectionTimeout: 5000ms
```

But naming the port is better because the timeout approach still adds 5 seconds of delay on every new connection.

## Protocol Detection for Permissive mTLS

In permissive mTLS mode (the default during migration), Envoy accepts both plaintext and mTLS connections. This adds another layer of protocol detection:

1. TLS inspector checks if the connection is TLS
2. If TLS: check if it's Istio mTLS (by ALPN) or regular TLS
3. If not TLS: HTTP inspector checks if it's HTTP
4. If not HTTP: treat as TCP

```bash
# See the filter chains and their match criteria
istioctl proxy-config listener my-pod --port 15006 -o json | \
  python3 -c "
import json, sys
data = json.load(sys.stdin)
for i, fc in enumerate(data[0].get('filterChains', [])):
    match = fc.get('filterChainMatch', {})
    transport = match.get('transportProtocol', 'any')
    alpn = match.get('applicationProtocols', [])
    port = match.get('destinationPort', 'any')
    print(f'Chain {i}: transport={transport}, alpn={alpn}, port={port}')
"
```

## Strict mTLS and Protocol Detection

In strict mTLS mode, all inbound connections must be TLS. This simplifies detection:

```yaml
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
  namespace: default
spec:
  mtls:
    mode: STRICT
```

With strict mTLS:
- The TLS inspector runs first
- Non-TLS connections are rejected
- After TLS termination, HTTP detection happens on the decrypted stream
- There's no ambiguity about the transport layer

## Disabling Protocol Detection for Specific Ports

You can disable protocol detection on specific inbound ports by configuring the Sidecar resource:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: my-app-sidecar
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  ingress:
    - port:
        number: 8080
        protocol: HTTP
        name: http
      defaultEndpoint: 127.0.0.1:8080
    - port:
        number: 5432
        protocol: TCP
        name: tcp
      defaultEndpoint: 127.0.0.1:5432
```

By specifying the protocol in the Sidecar resource's ingress section, you tell Istio exactly what each port speaks. No detection needed.

## Monitoring Protocol Detection

Check if protocol detection is causing issues:

```bash
# Look for protocol detection in Envoy stats
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep http_inspector

# Check for connections being detected as HTTP vs TCP
kubectl exec my-pod -c istio-proxy -- \
  pilot-agent request GET stats | grep downstream_cx_total

# Look at access logs for protocol information
kubectl logs my-pod -c istio-proxy | tail -20
```

If you see connections taking longer than expected on first request, protocol detection timeout might be the cause. Check the time difference between connection establishment and first byte.

## Debugging Protocol Detection Issues

When services aren't working correctly and you suspect protocol detection:

```bash
# Check if the listener has the HTTP inspector
istioctl proxy-config listener my-pod --port 15006 -o json | grep http_inspector

# Verify what filter chain was selected for a connection
# Enable debug logging
istioctl proxy-config log my-pod --level connection:debug,http:debug

# Make a request and check the logs
kubectl logs my-pod -c istio-proxy --tail=20

# Reset log level after debugging
istioctl proxy-config log my-pod --level warning
```

The debug logs show which filter chain was matched and why, which tells you whether protocol detection worked correctly.

Protocol detection is a convenience feature for the transition period when you're adding services to the mesh and haven't updated all port names yet. For production workloads, always declare protocols explicitly through port naming or `appProtocol`. It eliminates an entire class of bugs and removes unnecessary latency.
