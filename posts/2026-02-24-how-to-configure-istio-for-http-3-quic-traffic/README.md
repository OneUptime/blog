# How to Configure Istio for HTTP/3 (QUIC) Traffic

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, HTTP/3, QUIC, Performance, Ingress Gateway

Description: How to configure Istio for HTTP/3 and QUIC traffic at the ingress gateway, including prerequisites, limitations, and practical configuration examples.

---

HTTP/3 is the latest major version of the HTTP protocol, built on QUIC instead of TCP. It provides faster connection establishment, better performance over lossy networks, and eliminates head-of-line blocking at the transport layer. Istio has experimental support for HTTP/3 at the ingress gateway, allowing external clients to connect using QUIC while the mesh continues to use HTTP/2 and HTTP/1.1 internally.

This guide covers how to enable and configure HTTP/3 support in Istio.

## Understanding HTTP/3 in Istio

HTTP/3 support in Istio is primarily at the ingress gateway level. The internal mesh traffic between sidecars continues to use HTTP/2 over mTLS on TCP. The architecture looks like this:

```
Client --(HTTP/3 over QUIC)--> Ingress Gateway --(HTTP/2 over mTLS)--> Service
```

The ingress gateway terminates the QUIC connection and forwards the request into the mesh using the standard HTTP/2 transport.

## Prerequisites

Before enabling HTTP/3, verify your setup meets these requirements:

1. Istio version 1.22 or later with experimental QUIC support
2. A load balancer that passes through UDP traffic (QUIC runs on UDP)
3. Clients that support HTTP/3

Check your Istio version:

```bash
istioctl version
```

## Enabling HTTP/3 on the Ingress Gateway

Enable QUIC/HTTP/3 support when installing Istio:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
metadata:
  name: istio
spec:
  meshConfig:
    defaultConfig:
      proxyMetadata: {}
  components:
    ingressGateways:
    - name: istio-ingressgateway
      enabled: true
      k8s:
        service:
          ports:
          - name: http2
            port: 80
            targetPort: 8080
          - name: https
            port: 443
            targetPort: 8443
          - name: https-quic
            port: 443
            protocol: UDP
            targetPort: 8443
        overlays:
        - kind: Deployment
          name: istio-ingressgateway
          patches:
          - path: spec.template.spec.containers[0].ports
            value:
            - containerPort: 8080
              protocol: TCP
            - containerPort: 8443
              protocol: TCP
            - containerPort: 8443
              protocol: UDP
```

The key is adding a UDP port on 443 alongside the TCP port. QUIC uses the same port number as HTTPS but over UDP.

## Configuring the Gateway Resource

Create a Gateway that accepts HTTP/3 traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: http3-gateway
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
      credentialName: my-tls-cert
    hosts:
    - "app.example.com"
```

The same Gateway resource handles both HTTPS (TCP) and HTTP/3 (QUIC). Envoy uses ALPN negotiation to determine which protocol the client supports.

## Configuring the VirtualService

VirtualService configuration is the same regardless of whether the client uses HTTP/1.1, HTTP/2, or HTTP/3:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: my-app
spec:
  hosts:
  - "app.example.com"
  gateways:
  - istio-system/http3-gateway
  http:
  - route:
    - destination:
        host: my-service
        port:
          number: 8080
```

## Load Balancer Configuration

Your cloud load balancer must support UDP traffic on port 443. This is not always the default.

For AWS:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
  annotations:
    service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
spec:
  type: LoadBalancer
  ports:
  - name: https
    port: 443
    targetPort: 8443
    protocol: TCP
  - name: https-quic
    port: 443
    targetPort: 8443
    protocol: UDP
```

Network Load Balancers (NLB) on AWS support UDP. Classic Load Balancers and Application Load Balancers do not.

For GCP, the default network load balancer supports both TCP and UDP.

## Alt-Svc Header

For clients to discover HTTP/3 support, the server needs to send an `Alt-Svc` header in HTTP/2 responses. Envoy can be configured to send this header automatically through an EnvoyFilter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: alt-svc-header
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: HTTP_ROUTE
    match:
      context: GATEWAY
    patch:
      operation: MERGE
      value:
        responseHeadersToAdd:
        - header:
            key: alt-svc
            value: 'h3=":443"; ma=86400'
          append: false
```

This tells clients: "HTTP/3 is available on port 443, and this information is valid for 86400 seconds (24 hours)."

The typical flow is:
1. Client makes initial request over HTTP/2 (TCP)
2. Server responds with `Alt-Svc: h3=":443"; ma=86400`
3. Client's next request uses HTTP/3 (QUIC)

## Testing HTTP/3

Test with curl (version 7.88+ compiled with HTTP/3 support):

```bash
# First request - HTTP/2 (gets Alt-Svc header)
curl -v --http2 https://app.example.com/

# Force HTTP/3
curl -v --http3 https://app.example.com/
```

Not all curl builds have HTTP/3 support. Check:

```bash
curl --version | grep HTTP3
```

If your curl does not support HTTP/3, you can use tools like `xh` or `h3i` for testing.

## Connection Migration

One of QUIC's best features is connection migration. When a client's IP address changes (e.g., switching from Wi-Fi to cellular), the QUIC connection survives because it is identified by a connection ID rather than the IP/port tuple. This is handled transparently by Envoy and the QUIC implementation.

## Performance Considerations

HTTP/3 provides the most benefit in these scenarios:

- **High latency networks**: QUIC's 0-RTT connection establishment is significant when RTT is high
- **Lossy networks**: QUIC handles packet loss better than TCP because it avoids head-of-line blocking
- **Mobile clients**: Connection migration keeps connections alive during network changes

For internal mesh traffic on a reliable data center network, HTTP/3 provides minimal benefit over HTTP/2. That is why Istio only supports it at the ingress gateway.

## Monitoring HTTP/3 Traffic

Check QUIC-specific stats on the ingress gateway:

```bash
kubectl exec -n istio-system deploy/istio-ingressgateway -- \
  pilot-agent request GET stats | grep "quic\|http3"
```

Look for metrics like:
- `http3.downstream.rx.quic_connection_count`: Active QUIC connections
- `http3.downstream.rx.quic_reset_stream_error`: Stream errors

## Limitations

Current limitations of HTTP/3 in Istio:

1. **Gateway only**: HTTP/3 is only supported at the ingress gateway, not for mesh-internal traffic
2. **Experimental**: The feature may change between Istio versions
3. **No server push**: HTTP/3 server push is not commonly used and may not be supported
4. **UDP firewalls**: Many corporate firewalls block UDP on port 443. Clients will fall back to HTTP/2 over TCP
5. **Load balancer support**: Not all cloud load balancers handle UDP correctly

## Fallback to HTTP/2

Clients that do not support HTTP/3 or when UDP is blocked will automatically fall back to HTTP/2 over TCP. This happens transparently. Your Gateway and VirtualService configurations do not need to change.

The TCP and UDP listeners on port 443 coexist, so the ingress gateway handles both protocols simultaneously.

## Wrapping Up

HTTP/3 in Istio is a forward-looking feature that benefits mobile and high-latency clients. The setup requires enabling UDP on your load balancer and ingress gateway, configuring Alt-Svc headers for protocol discovery, and making sure your TLS certificates are in order. For most internal service mesh traffic, HTTP/2 over mTLS remains the right choice. Use HTTP/3 at the edge where its benefits, faster connection setup, better loss resilience, and connection migration, actually make a difference for your users.
