# How to Configure VirtualService for TLS Traffic Routing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, VirtualService, TLS, Traffic Routing, Kubernetes

Description: Learn how to configure Istio VirtualService for TLS passthrough routing based on SNI to manage encrypted traffic without terminating TLS.

---

TLS traffic routing in Istio handles encrypted connections where you do not want (or cannot) terminate TLS at the proxy. Instead of decrypting the traffic, Istio routes it based on the Server Name Indication (SNI) field in the TLS handshake. This is called TLS passthrough, and it is useful when your backend services handle their own TLS termination.

## TLS Routing vs HTTP Routing

The key difference is that with TLS routing, the proxy cannot see inside the encrypted payload. It can only route based on:

- **SNI hostname** - The server name the client includes in the TLS ClientHello message
- **Port** - The destination port
- **Source labels** - Which workload is making the connection

You cannot match on paths, headers, or anything inside the encrypted payload. If you need that level of control, you need to terminate TLS at the proxy and use HTTP routing instead.

## How SNI-Based Routing Works

When a TLS client connects, it sends a ClientHello message that includes the SNI field. This field contains the hostname the client is trying to reach. Istio reads this field and uses it to make routing decisions, then forwards the encrypted traffic to the appropriate backend without decryption.

```mermaid
graph LR
    A[Client] -->|TLS ClientHello<br>SNI: api.example.com| B[Istio Proxy]
    B -->|Encrypted traffic| C[api.example.com backend]
```

## Basic TLS Routing

Here is a simple TLS routing configuration:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: tls-routing
  namespace: default
spec:
  hosts:
    - "api.example.com"
  tls:
    - match:
        - sniHosts:
            - "api.example.com"
          port: 443
      route:
        - destination:
            host: api-service
            port:
              number: 443
```

The `tls` section of VirtualService is specifically for TLS passthrough routing. Traffic with SNI `api.example.com` on port 443 gets forwarded to `api-service`.

## Gateway Configuration for TLS Passthrough

To receive TLS traffic from outside the mesh and pass it through without termination:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: tls-passthrough-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: tls
        protocol: TLS
      hosts:
        - "api.example.com"
        - "admin.example.com"
      tls:
        mode: PASSTHROUGH
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: tls-routing
  namespace: default
spec:
  hosts:
    - "api.example.com"
    - "admin.example.com"
  gateways:
    - tls-passthrough-gateway
  tls:
    - match:
        - sniHosts:
            - "api.example.com"
          port: 443
      route:
        - destination:
            host: api-service
            port:
              number: 443
    - match:
        - sniHosts:
            - "admin.example.com"
          port: 443
      route:
        - destination:
            host: admin-service
            port:
              number: 443
```

The key is `tls.mode: PASSTHROUGH` on the Gateway. This tells Istio not to terminate TLS but to forward the encrypted traffic as-is.

## Routing Multiple TLS Services on the Same Port

SNI-based routing lets you run multiple TLS services on port 443:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: multi-tls-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
    - port:
        number: 443
        name: tls
        protocol: TLS
      hosts:
        - "*.example.com"
      tls:
        mode: PASSTHROUGH
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: tls-multi-route
  namespace: default
spec:
  hosts:
    - "*.example.com"
  gateways:
    - multi-tls-gateway
  tls:
    - match:
        - sniHosts:
            - "api.example.com"
      route:
        - destination:
            host: api-service
            port:
              number: 443
    - match:
        - sniHosts:
            - "web.example.com"
      route:
        - destination:
            host: web-service
            port:
              number: 443
    - match:
        - sniHosts:
            - "grpc.example.com"
      route:
        - destination:
            host: grpc-service
            port:
              number: 443
```

All three services share port 443 but are distinguished by their SNI hostname.

## Weighted TLS Routing

You can do traffic splitting for TLS traffic:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: tls-canary
  namespace: default
spec:
  hosts:
    - "api.example.com"
  gateways:
    - tls-gateway
  tls:
    - match:
        - sniHosts:
            - "api.example.com"
      route:
        - destination:
            host: api-service
            subset: v1
            port:
              number: 443
          weight: 90
        - destination:
            host: api-service
            subset: v2
            port:
              number: 443
          weight: 10
```

90% of new TLS connections go to v1, 10% go to v2.

## Mesh-Internal TLS Routing

For services within the mesh that use their own TLS (not Istio mutual TLS):

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: internal-tls
  namespace: default
spec:
  hosts:
    - secure-service
  tls:
    - match:
        - port: 8443
          sniHosts:
            - "secure-service.default.svc.cluster.local"
      route:
        - destination:
            host: secure-service
            port:
              number: 8443
```

You also need a DestinationRule to tell Istio that the backend expects TLS:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: secure-service
  namespace: default
spec:
  host: secure-service
  trafficPolicy:
    tls:
      mode: SIMPLE
```

## TLS Origination

Sometimes you want Istio to originate a TLS connection to an external service. This is when your app talks HTTP to the sidecar, and the sidecar talks HTTPS to the external service:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: default
spec:
  hosts:
    - api.external.com
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: external-api
  namespace: default
spec:
  host: api.external.com
  trafficPolicy:
    tls:
      mode: SIMPLE
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: external-api
  namespace: default
spec:
  hosts:
    - api.external.com
  tls:
    - match:
        - sniHosts:
            - api.external.com
          port: 443
      route:
        - destination:
            host: api.external.com
            port:
              number: 443
```

## TLS vs HTTPS in Gateway Configuration

There is an important difference between TLS and HTTPS in Gateway configuration:

- `protocol: HTTPS` - Istio terminates TLS and inspects the HTTP traffic. You can use `http` routing rules.
- `protocol: TLS` with `mode: PASSTHROUGH` - Istio does not terminate TLS. You must use `tls` routing rules.
- `protocol: TLS` with `mode: SIMPLE` or `mode: MUTUAL` - Istio terminates TLS and you can use `http` or `tcp` routing.

Choose based on whether you need to inspect the traffic content.

## Debugging TLS Routing

TLS routing problems can be tricky because you cannot inspect the encrypted payload:

```bash
# Check the proxy config for TLS routes
istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system -o json

# Check listeners for TLS config
istioctl proxy-config listeners deploy/istio-ingressgateway -n istio-system -o json

# Verify SNI is being sent
openssl s_client -connect api.example.com:443 -servername api.example.com

# Check Envoy access logs
kubectl logs deploy/istio-ingressgateway -n istio-system | tail -20

# Validate configuration
istioctl analyze
```

Common issues:
- **Missing SNI** - Some clients do not send SNI. Without SNI, TLS routing cannot work.
- **Gateway mode mismatch** - Using `SIMPLE` when you mean `PASSTHROUGH` or vice versa.
- **Port conflicts** - Two gateways trying to listen on the same port with different TLS settings.

## When to Use TLS Routing

Use TLS passthrough routing when:
- Your backend handles its own TLS certificates and termination
- You need end-to-end encryption without any proxy decryption
- Compliance requirements mandate that the proxy must not see plaintext traffic
- You are routing to services that use client certificate authentication

Use HTTPS (TLS termination at the proxy) when:
- You need HTTP-level routing (paths, headers, etc.)
- You want to centralize certificate management
- You need HTTP-specific features like retries, fault injection, or mirroring

TLS routing in Istio is more limited than HTTP routing, but it fills an important gap for services that need encrypted passthrough. The SNI-based matching lets you multiplex multiple services on a single port, and weighted routing gives you canary deployment capabilities even for encrypted traffic.
