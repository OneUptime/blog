# How to Configure Proxy Protocol in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Proxy Protocol, Envoy, Load Balancer, Networking

Description: Complete guide to configuring PROXY protocol in Istio for preserving client connection information through load balancers and proxies.

---

PROXY protocol is a simple protocol for conveying client connection metadata (source IP, destination IP, ports) across TCP proxies. When a TCP connection passes through a load balancer or reverse proxy, the original client information is normally lost. PROXY protocol solves this by prepending a small header to the TCP stream with the original connection details.

In Istio, you'll most commonly need PROXY protocol when your ingress gateway sits behind a TCP/Network load balancer (like AWS NLB or a bare-metal HAProxy) that doesn't operate at the HTTP level and can't add HTTP headers like `X-Forwarded-For`.

## PROXY Protocol Versions

There are two versions:

- **v1** - Human-readable text format. Easy to debug but slightly slower to parse.
- **v2** - Binary format. More efficient and supports additional metadata through TLV (Type-Length-Value) fields.

A v1 header looks like this:

```
PROXY TCP4 192.168.1.100 10.0.0.5 56324 443\r\n
```

This tells the receiving server that the real client is `192.168.1.100:56324` and the original destination was `10.0.0.5:443`.

## When You Need PROXY Protocol

You need PROXY protocol when:

- Your external load balancer is a Layer 4 (TCP) load balancer
- You need the real client IP at the Istio gateway
- The load balancer supports PROXY protocol (AWS NLB, HAProxy, etc.)
- You can't use `externalTrafficPolicy: Local` (maybe due to uneven node distribution)

You don't need PROXY protocol when:

- Your load balancer operates at Layer 7 (like AWS ALB or GCP GCLB) and can add XFF headers
- All your traffic is internal to the mesh
- You're using `externalTrafficPolicy: Local` and that's sufficient

## Configuring the Istio Ingress Gateway to Accept PROXY Protocol

The Istio ingress gateway needs to be configured to parse PROXY protocol headers from the upstream load balancer. This is done using an `EnvoyFilter`:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: proxy-protocol-listener
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: LISTENER
      match:
        context: GATEWAY
        listener:
          portNumber: 8080
      patch:
        operation: MERGE
        value:
          listenerFilters:
            - name: envoy.filters.listener.proxy_protocol
              typedConfig:
                "@type": type.googleapis.com/envoy.extensions.filters.listener.proxy_protocol.v3.ProxyProtocol
            - name: envoy.filters.listener.tls_inspector
              typedConfig:
                "@type": type.googleapis.com/envoy.extensions.filters.listener.tls_inspector.v3.TlsInspector
```

Note the ordering: the `proxy_protocol` filter must come before the `tls_inspector` filter. This is because PROXY protocol header is the first thing on the connection, before the TLS handshake.

If you want to handle both HTTP (port 8080) and HTTPS (port 8443) with PROXY protocol:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: proxy-protocol-all-listeners
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: LISTENER
      match:
        context: GATEWAY
        listener:
          portNumber: 8080
      patch:
        operation: MERGE
        value:
          listenerFilters:
            - name: envoy.filters.listener.proxy_protocol
              typedConfig:
                "@type": type.googleapis.com/envoy.extensions.filters.listener.proxy_protocol.v3.ProxyProtocol
            - name: envoy.filters.listener.tls_inspector
              typedConfig:
                "@type": type.googleapis.com/envoy.extensions.filters.listener.tls_inspector.v3.TlsInspector
    - applyTo: LISTENER
      match:
        context: GATEWAY
        listener:
          portNumber: 8443
      patch:
        operation: MERGE
        value:
          listenerFilters:
            - name: envoy.filters.listener.proxy_protocol
              typedConfig:
                "@type": type.googleapis.com/envoy.extensions.filters.listener.proxy_protocol.v3.ProxyProtocol
            - name: envoy.filters.listener.tls_inspector
              typedConfig:
                "@type": type.googleapis.com/envoy.extensions.filters.listener.tls_inspector.v3.TlsInspector
```

## Configuring the Load Balancer

Your load balancer must be configured to send PROXY protocol headers. Here are examples for common setups:

### AWS Network Load Balancer

For AWS NLB, annotate the gateway Service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
    service.beta.kubernetes.io/aws-load-balancer-proxy-protocol: "*"
spec:
  type: LoadBalancer
  ports:
    - port: 80
      targetPort: 8080
      name: http2
    - port: 443
      targetPort: 8443
      name: https
```

### HAProxy

In your HAProxy configuration:

```
frontend https_front
    bind *:443
    default_backend istio_gateway

backend istio_gateway
    server gw1 10.0.0.10:8443 send-proxy-v2
```

The `send-proxy-v2` directive tells HAProxy to add PROXY protocol v2 headers.

## Sending PROXY Protocol from Istio

In some cases, you might need Istio to send PROXY protocol headers to an upstream service. For example, if your backend expects PROXY protocol. You can configure this with a transport socket on the cluster:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: upstream-proxy-protocol
  namespace: default
spec:
  workloadSelector:
    labels:
      app: my-app
  configPatches:
    - applyTo: CLUSTER
      match:
        context: SIDECAR_OUTBOUND
        cluster:
          service: backend-service.default.svc.cluster.local
          portNumber: 8080
      patch:
        operation: MERGE
        value:
          upstreamConnectionOptions:
            happyEyeballsConfig: {}
          transportSocket: {}
```

For the upstream PROXY protocol case, you'll typically use an Envoy filter that adds the protocol header to the outgoing connection.

## Testing PROXY Protocol Configuration

After configuring, you need to verify it's working. The tricky part is that you can't just `curl` a PROXY protocol endpoint - regular HTTP clients don't send the PROXY protocol header.

Use a tool like `socat` or `ncat` for testing:

```bash
# Send a request with PROXY protocol v1 header
echo -e "PROXY TCP4 192.168.1.100 10.0.0.5 12345 80\r\nGET / HTTP/1.1\r\nHost: my-app.example.com\r\n\r\n" | \
  ncat <gateway-ip> 80
```

Or use `curl` with HAProxy's `hatcp` tool if available:

```bash
# Check what source IP the gateway sees
kubectl logs -n istio-system -l istio=ingressgateway --tail=20
```

Look for the `x_forwarded_for` or `downstream_remote_address` fields in the access log. If PROXY protocol is working correctly, you should see the real client IP (192.168.1.100 in our test) rather than the load balancer's IP.

## Debugging Common Issues

**Connection resets immediately:** This usually means the PROXY protocol listener filter is missing or misconfigured. The gateway expects a PROXY protocol header but the client isn't sending one (or vice versa).

```bash
# Check if the EnvoyFilter was applied
istioctl proxy-config listener -n istio-system istio-ingressgateway-pod --port 8080 -o json | grep proxy_protocol
```

**Seeing load balancer IP instead of client IP:** The PROXY protocol filter might not be in the correct position in the listener filter chain. It must be the first filter.

**TLS handshake failures:** Make sure `proxy_protocol` comes before `tls_inspector` in the listener filters. Envoy needs to strip the PROXY protocol header before it can inspect the TLS ClientHello.

```bash
# Verify listener filter ordering
istioctl proxy-config listener -n istio-system istio-ingressgateway-pod -o json | \
  python3 -m json.tool | grep -A2 "listener_filters"
```

## Combining PROXY Protocol with mTLS

When you combine PROXY protocol with Istio's mTLS, the flow looks like this:

1. Client connects to load balancer
2. Load balancer adds PROXY protocol header and forwards to gateway
3. Gateway's `proxy_protocol` filter reads and strips the header
4. Gateway's `tls_inspector` detects TLS
5. TLS handshake (either passthrough or termination)
6. Envoy uses the extracted client IP for XFF headers, logging, and authorization

This means your AuthorizationPolicy can use `remoteIpBlocks` to match on the real client IP even when traffic comes through a Layer 4 load balancer. That's a powerful combination for building proper access control at the mesh edge.
