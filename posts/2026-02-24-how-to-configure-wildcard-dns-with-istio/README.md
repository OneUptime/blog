# How to Configure Wildcard DNS with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, DNS, Wildcard, Kubernetes, Gateway, Networking

Description: How to set up wildcard DNS routing in Istio for handling dynamic subdomains and multi-tenant applications in your service mesh.

---

Wildcard DNS configuration comes up frequently in multi-tenant applications, where each tenant gets their own subdomain (like `tenant1.app.example.com`, `tenant2.app.example.com`), or when you need to allow access to a large number of external subdomains without listing each one. Istio supports wildcard configurations in several of its resources, though each has some nuances worth knowing about.

## Wildcard Hosts in Gateway

The most common use case is configuring the Istio ingress gateway to accept traffic for any subdomain:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: wildcard-gateway
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
    - "*.app.example.com"
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: wildcard-cert
    hosts:
    - "*.app.example.com"
```

For HTTPS, you'll need a wildcard TLS certificate. You can create one using cert-manager:

```yaml
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: wildcard-cert
  namespace: istio-system
spec:
  secretName: wildcard-cert
  dnsNames:
  - "*.app.example.com"
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
```

## Routing Wildcard Traffic with VirtualService

Once the gateway accepts wildcard traffic, you need a VirtualService to route it. You can match on specific subdomains or use a catch-all:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: wildcard-routing
  namespace: default
spec:
  hosts:
  - "*.app.example.com"
  gateways:
  - istio-system/wildcard-gateway
  http:
  - route:
    - destination:
        host: tenant-router.default.svc.cluster.local
        port:
          number: 8080
```

This sends all subdomain traffic to a `tenant-router` service that can inspect the Host header and route accordingly. Alternatively, you can use header-based matching to route different subdomains to different backends:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: wildcard-routing
  namespace: default
spec:
  hosts:
  - "*.app.example.com"
  gateways:
  - istio-system/wildcard-gateway
  http:
  - match:
    - headers:
        ":authority":
          prefix: "api."
    route:
    - destination:
        host: api-service.default.svc.cluster.local
        port:
          number: 8080
  - match:
    - headers:
        ":authority":
          prefix: "admin."
    route:
    - destination:
        host: admin-service.default.svc.cluster.local
        port:
          number: 8080
  - route:
    - destination:
        host: default-service.default.svc.cluster.local
        port:
          number: 8080
```

## Wildcard ServiceEntry for External Services

When your services need to access many subdomains of an external service, use a wildcard ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: wildcard-external
  namespace: default
spec:
  hosts:
  - "*.googleapis.com"
  ports:
  - number: 443
    name: tls
    protocol: TLS
  resolution: NONE
  location: MESH_EXTERNAL
```

The `resolution: NONE` is important here. With wildcard hostnames, Istio can't pre-resolve the DNS because it doesn't know the actual subdomain until a request comes in. `NONE` tells the sidecar to use the original destination IP as resolved by the application.

## Wildcard DNS with TLS Origination

If your application talks HTTP internally but the external wildcard service needs HTTPS:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: ServiceEntry
metadata:
  name: wildcard-external-https
  namespace: default
spec:
  hosts:
  - "*.partner-api.com"
  ports:
  - number: 443
    name: tls
    protocol: TLS
  - number: 80
    name: http
    protocol: HTTP
  resolution: NONE
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1alpha3
kind: DestinationRule
metadata:
  name: wildcard-external-tls
  namespace: default
spec:
  host: "*.partner-api.com"
  trafficPolicy:
    tls:
      mode: SIMPLE
```

## SNI-Based Wildcard Routing

For TLS passthrough scenarios, you can route based on SNI (Server Name Indication):

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Gateway
metadata:
  name: sni-wildcard-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 443
      name: tls
      protocol: TLS
    tls:
      mode: PASSTHROUGH
    hosts:
    - "*.secure.example.com"
---
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: sni-routing
  namespace: default
spec:
  hosts:
  - "*.secure.example.com"
  gateways:
  - istio-system/sni-wildcard-gateway
  tls:
  - match:
    - port: 443
      sniHosts:
      - "*.secure.example.com"
    route:
    - destination:
        host: backend-service.default.svc.cluster.local
        port:
          number: 443
```

## DNS Configuration for Wildcards

On the DNS side (outside of Istio), you'll need to set up a wildcard DNS record pointing to your ingress gateway's external IP:

```text
*.app.example.com    A    <ingress-gateway-external-ip>
```

Get your ingress gateway's external IP:

```bash
kubectl get svc -n istio-system istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

Or if you're using a hostname-based load balancer:

```bash
kubectl get svc -n istio-system istio-ingressgateway -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

## Sidecar Configuration for Wildcard Egress

If you're using Sidecar resources to limit service discovery scope, make sure to include wildcard ServiceEntry hosts:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: Sidecar
metadata:
  name: default
  namespace: my-namespace
spec:
  egress:
  - hosts:
    - "./*"
    - "istio-system/*"
    - "~/*.googleapis.com"
```

The `~/*` prefix is the notation for ServiceEntry hosts in the Sidecar egress configuration.

## Limitations and Gotchas

1. **Single-level wildcards only**: Istio supports `*.example.com` but not `**.example.com` or `*.*.example.com`. The wildcard matches exactly one level of subdomain.

2. **No wildcard in the middle**: `app.*.example.com` is not supported. The wildcard must be the leftmost component.

3. **TCP and wildcard DNS**: For non-HTTP protocols, wildcard routing is limited because Envoy can't inspect the hostname. TLS traffic can be routed using SNI, but plain TCP traffic with wildcards requires `resolution: NONE`.

4. **Certificate coverage**: Make sure your TLS certificate covers the wildcard domain. A cert for `*.example.com` covers `app.example.com` but not `sub.app.example.com`.

5. **Conflict resolution**: If you have both a wildcard VirtualService and a specific one for `specific.app.example.com`, the specific one takes precedence.

Wildcard DNS in Istio is a practical feature for multi-tenant applications and broad external service access. The key is understanding the resolution strategy, getting TLS right, and being aware of the single-level wildcard limitation.
