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

```text
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

The Istio ingress gateway needs to be configured to parse PROXY protocol headers from the upstream load balancer. For all TCP listeners on gateways, set `gatewayTopology.proxyProtocol` in your `IstioOperator` configuration:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      gatewayTopology:
        proxyProtocol: {}
```

Alternatively, you can configure a specific gateway workload with the `proxy.istio.io/config` pod annotation:

```yaml
metadata:
  annotations:
    "proxy.istio.io/config": '{"gatewayTopology" : { "proxyProtocol": {} }}'
```

If you use a custom `EnvoyFilter` instead, note the ordering: the `proxy_protocol` listener filter must come before the `tls_inspector` filter. This is because PROXY protocol header is the first thing on the connection, before the TLS handshake.

For example, to insert the listener filter before `tls_inspector` on the HTTPS listener:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: proxy-protocol-https-listener
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
    - applyTo: LISTENER_FILTER
      match:
        context: GATEWAY
        listener:
          portNumber: 8443
          listenerFilter: envoy.filters.listener.tls_inspector
      patch:
        operation: INSERT_BEFORE
        value:
          name: envoy.filters.listener.proxy_protocol
          typed_config:
            "@type": type.googleapis.com/envoy.extensions.filters.listener.proxy_protocol.v3.ProxyProtocol
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
    service.beta.kubernetes.io/aws-load-balancer-type: "external"
    service.beta.kubernetes.io/aws-load-balancer-nlb-target-type: "instance"
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

The `aws-load-balancer-proxy-protocol` annotation enables PROXY protocol v2 on all target groups when using the AWS Load Balancer Controller. You can also use `service.beta.kubernetes.io/aws-load-balancer-target-group-attributes: proxy_protocol_v2.enabled=true`.

### HAProxy

In your HAProxy configuration:

```text
frontend https_front
    bind *:443
    default_backend istio_gateway

backend istio_gateway
    server gw1 10.0.0.10:8443 send-proxy-v2
```

The `send-proxy-v2` directive tells HAProxy to add PROXY protocol v2 headers.

## Sending PROXY Protocol from Istio

In some cases, you might need Istio to send PROXY protocol headers to an upstream service. For example, if your backend expects PROXY protocol. You can configure this by wrapping the cluster's transport socket:

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
          transport_socket:
            name: envoy.transport_sockets.upstream_proxy_protocol
            typed_config:
              "@type": type.googleapis.com/envoy.extensions.transport_sockets.proxy_protocol.v3.ProxyProtocolUpstreamTransport
              config:
                version: V2
              transport_socket:
                name: envoy.transport_sockets.raw_buffer
                typed_config:
                  "@type": type.googleapis.com/envoy.extensions.transport_sockets.raw_buffer.v3.RawBuffer
```

For the upstream PROXY protocol case, you'll typically wrap the upstream cluster's transport socket with `envoy.transport_sockets.upstream_proxy_protocol`.

## Testing PROXY Protocol Configuration

After configuring, you need to verify it's working. The tricky part is that regular HTTP clients don't send the PROXY protocol header by default.

Use `curl --haproxy-protocol` for PROXY protocol v1 testing, or a tool like `socat` or `ncat` if you need to craft the header yourself:

```bash
curl --haproxy-protocol http://<gateway-ip>/
```

```bash
# Send a request with PROXY protocol v1 header

echo -e "PROXY TCP4 192.168.1.100 10.0.0.5 12345 80\r\nGET / HTTP/1.1\r\nHost: my-app.example.com\r\n\r\n" | \
  ncat <gateway-ip> 80
```

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

For HTTP traffic, Istio sets or appends the client IP from PROXY protocol in `X-Forwarded-For` and `X-Envoy-External-Address`. If `numTrustedProxies` is also configured and an `X-Forwarded-For` header is received, Istio uses the XFF-based trusted client address calculation instead of the PROXY protocol address.

This means your AuthorizationPolicy can use `remoteIpBlocks` to match on the real client IP even when traffic comes through a Layer 4 load balancer, as long as PROXY protocol is the source of the trusted client address. That's a powerful combination for building proper access control at the mesh edge.
