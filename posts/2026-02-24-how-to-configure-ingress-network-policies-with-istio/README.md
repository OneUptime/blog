# How to Configure Ingress Network Policies with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Ingresses, Network Policies, Kubernetes, Gateway

Description: Configure and secure ingress traffic into your Kubernetes cluster using Istio gateways, authorization policies, and TLS settings.

---

Ingress is where your cluster meets the outside world. Every request from users, partners, or third-party services comes through your ingress. Getting the ingress configuration right is critical because a misconfigured ingress can expose internal services, leak sensitive data, or let attackers straight into your cluster. Istio gives you a lot of control over ingress traffic through its Gateway resource, VirtualService routing, and authorization policies.

## The Istio Ingress Gateway

Istio uses a dedicated Envoy proxy deployment as its ingress gateway. This is separate from the sidecar proxies running alongside your workloads. It sits at the edge of your mesh and handles all incoming traffic.

By default, the Istio ingress gateway doesn't expose any services. You need to explicitly configure what traffic gets in and where it goes.

Check that your ingress gateway is running:

```bash
kubectl get pods -n istio-system -l istio=ingressgateway
kubectl get svc -n istio-system istio-ingressgateway
```

## Configuring TLS at the Gateway

Always terminate TLS at the ingress gateway. Never let unencrypted HTTP traffic into your mesh.

Create a TLS secret:

```bash
kubectl create secret tls api-tls-cert \
  --cert=cert.pem \
  --key=key.pem \
  -n istio-system
```

Configure the Gateway to use it:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: api-gateway
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
      credentialName: api-tls-cert
    hosts:
    - "api.example.com"
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "api.example.com"
    tls:
      httpsRedirect: true
```

The second server block redirects HTTP to HTTPS. Users who hit port 80 get a 301 redirect.

## Routing Traffic to Services

Use VirtualService to control which services receive ingress traffic:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-routing
  namespace: default
spec:
  hosts:
  - "api.example.com"
  gateways:
  - istio-system/api-gateway
  http:
  - match:
    - uri:
        prefix: "/v1/users"
    route:
    - destination:
        host: user-service.backend.svc.cluster.local
        port:
          number: 8080
  - match:
    - uri:
        prefix: "/v1/orders"
    route:
    - destination:
        host: order-service.backend.svc.cluster.local
        port:
          number: 8080
  - match:
    - uri:
        prefix: "/health"
    route:
    - destination:
        host: health-check.backend.svc.cluster.local
        port:
          number: 8080
```

Only the paths you define are reachable. Any request to an unmatched path gets a 404 from the gateway.

## Restricting Access by Source IP

For services that should only be accessible from specific IP ranges (like admin panels or internal APIs), use authorization policies on the gateway:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-office-ips
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
  - from:
    - source:
        ipBlocks:
        - "203.0.113.0/24"
        - "198.51.100.0/24"
    to:
    - operation:
        paths: ["/admin/*"]
  - to:
    - operation:
        paths: ["/v1/*", "/health"]
```

This allows anyone to access `/v1/*` and `/health`, but restricts `/admin/*` to specific IP ranges. Note that for IP-based rules to work correctly, you need to make sure the original client IP is preserved. If your ingress gateway is behind a load balancer, configure `externalTrafficPolicy: Local` on the gateway service or use proxy protocol.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: istio-ingressgateway
  namespace: istio-system
spec:
  externalTrafficPolicy: Local
  type: LoadBalancer
```

## Adding JWT Authentication at Ingress

Validate JWT tokens at the gateway before requests reach your services:

```yaml
apiVersion: security.istio.io/v1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  jwtRules:
  - issuer: "https://auth.example.com"
    jwksUri: "https://auth.example.com/.well-known/jwks.json"
    outputPayloadToHeader: "x-jwt-payload"
```

Then enforce that certain paths require valid tokens:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: require-auth
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: DENY
  rules:
  - from:
    - source:
        notRequestPrincipals: ["*"]
    to:
    - operation:
        paths: ["/v1/users/*", "/v1/orders/*"]
        notPaths: ["/v1/users/register", "/v1/users/login"]
```

This denies requests to protected endpoints if there's no valid JWT. Registration and login endpoints are excluded since users won't have a token yet.

## Rate Limiting at Ingress

Protect your services from abuse by adding rate limiting at the gateway. You can use Istio's local rate limiter or connect to an external rate limiting service.

For a simple local rate limiter:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ingress-rate-limit
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: GATEWAY
      listener:
        filterChain:
          filter:
            name: "envoy.filters.network.http_connection_manager"
            subFilter:
              name: "envoy.filters.http.router"
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.local_ratelimit
        typed_config:
          "@type": type.googleapis.com/udpa.type.v1.TypedStruct
          type_url: type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
          value:
            stat_prefix: http_local_rate_limiter
            token_bucket:
              max_tokens: 1000
              tokens_per_fill: 1000
              fill_interval: 60s
```

## Configuring CORS at the Gateway

If your API is called from web browsers, configure CORS at the VirtualService level:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api-routing
  namespace: default
spec:
  hosts:
  - "api.example.com"
  gateways:
  - istio-system/api-gateway
  http:
  - match:
    - uri:
        prefix: "/v1/"
    corsPolicy:
      allowOrigins:
      - exact: "https://app.example.com"
      - exact: "https://admin.example.com"
      allowMethods:
      - GET
      - POST
      - PUT
      - DELETE
      allowHeaders:
      - authorization
      - content-type
      maxAge: "24h"
    route:
    - destination:
        host: api-service.backend.svc.cluster.local
        port:
          number: 8080
```

## Monitoring Ingress Traffic

Keep an eye on what's coming through your ingress:

```bash
# Check access logs
kubectl logs -l istio=ingressgateway -n istio-system -f

# Query Prometheus for ingress metrics
istio_requests_total{reporter="destination",destination_service_name="istio-ingressgateway"}
```

Set up dashboards for key ingress metrics:

- Request rate by path and status code
- P99 latency at the gateway
- 4xx and 5xx error rates
- Rejected requests (403s from authorization policies)

```bash
# Check the gateway configuration is correct
istioctl proxy-config routes deploy/istio-ingressgateway -n istio-system
```

## Common Ingress Mistakes

A few things that trip people up with ingress configuration:

Forgetting to bind the VirtualService to the Gateway. Without the `gateways` field, the VirtualService only applies to mesh-internal traffic.

Misconfigured TLS credentials. The `credentialName` in the Gateway must match a secret in the `istio-system` namespace (unless you're using SDS with a custom secret discovery service).

Exposing too many paths. Start with the minimum paths your API needs and add more as required. Every exposed path is an attack surface.

Not testing with the actual DNS hostname. Ingress routing is host-based. Testing with an IP address or a wrong hostname will give you different results than production traffic.

Ingress network policies with Istio are your first line of defense. Take the time to configure them properly, keep them minimal, and monitor them continuously. A well-configured ingress gateway significantly reduces your cluster's attack surface.
