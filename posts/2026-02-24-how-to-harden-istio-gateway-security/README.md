# How to Harden Istio Gateway Security

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Security, Gateway, Kubernetes, TLS, Hardening

Description: How to secure Istio ingress and egress gateways against common attack vectors with TLS hardening, rate limiting, and access controls.

---

Istio gateways are where your mesh meets the outside world. They handle incoming traffic from users, partner APIs, and other external systems. They also control what traffic leaves your mesh. Because gateways sit at the boundary, they are the most exposed components in your Istio deployment and need the most attention when it comes to security.

This guide covers practical steps to harden both ingress and egress gateways.

## TLS Configuration

The most basic gateway security measure is properly configured TLS. Never expose services over plain HTTP in production.

**Configure strong TLS settings:**

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
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
      credentialName: main-tls-cert
      minProtocolVersion: TLSV1_3
      cipherSuites:
      - TLS_AES_256_GCM_SHA384
      - TLS_AES_128_GCM_SHA256
      - TLS_CHACHA20_POLY1305_SHA256
    hosts:
    - "app.example.com"
    - "api.example.com"
```

Key points:
- Set `minProtocolVersion` to `TLSV1_3` if all your clients support it. Otherwise use `TLSV1_2` as the minimum.
- Explicitly list cipher suites instead of relying on defaults. Remove weak ciphers.
- Use `credentialName` to reference a Kubernetes secret containing the TLS certificate.

**Create the TLS secret:**

```bash
kubectl create secret tls main-tls-cert -n istio-system \
  --cert=fullchain.pem \
  --key=privkey.pem
```

**For mutual TLS (client certificate verification):**

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: mtls-gateway
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
      mode: MUTUAL
      credentialName: mtls-cert
      minProtocolVersion: TLSV1_2
    hosts:
    - "partner-api.example.com"
```

## Redirect HTTP to HTTPS

Always redirect HTTP traffic to HTTPS:

```yaml
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: main-gateway
  namespace: istio-system
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    tls:
      httpsRedirect: true
    hosts:
    - "app.example.com"
  - port:
      number: 443
      name: https
      protocol: HTTPS
    tls:
      mode: SIMPLE
      credentialName: main-tls-cert
      minProtocolVersion: TLSV1_3
    hosts:
    - "app.example.com"
```

## Rate Limiting at the Gateway

Apply rate limiting at the gateway to protect against DDoS and abuse:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: gateway-ratelimit
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
            name: envoy.filters.network.http_connection_manager
            subFilter:
              name: envoy.filters.http.router
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.local_ratelimit
        typed_config:
          "@type": type.googleapis.com/udpa.type.v1.TypedStruct
          type_url: type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
          value:
            stat_prefix: gateway_rate_limiter
            token_bucket:
              max_tokens: 1000
              tokens_per_fill: 1000
              fill_interval: 60s
            filter_enabled:
              runtime_key: local_rate_limit_enabled
              default_value:
                numerator: 100
                denominator: HUNDRED
            filter_enforced:
              runtime_key: local_rate_limit_enforced
              default_value:
                numerator: 100
                denominator: HUNDRED
            response_headers_to_add:
            - append_action: OVERWRITE_IF_EXISTS_OR_ADD
              header:
                key: x-rate-limited
                value: "true"
```

## Security Headers

Add security headers to all responses from the gateway:

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: security-headers
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: ingressgateway
  configPatches:
  - applyTo: ROUTE_CONFIGURATION
    match:
      context: GATEWAY
    patch:
      operation: MERGE
      value:
        response_headers_to_add:
        - header:
            key: Strict-Transport-Security
            value: "max-age=31536000; includeSubDomains"
          append: false
        - header:
            key: X-Content-Type-Options
            value: "nosniff"
          append: false
        - header:
            key: X-Frame-Options
            value: "DENY"
          append: false
        - header:
            key: X-XSS-Protection
            value: "1; mode=block"
          append: false
        - header:
            key: Content-Security-Policy
            value: "default-src 'self'"
          append: false
```

## Restrict Gateway Pod Security

The gateway pods themselves need hardening:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    ingressGateways:
    - name: istio-ingressgateway
      k8s:
        podAnnotations:
          seccomp.security.alpha.kubernetes.io/pod: runtime/default
        resources:
          requests:
            cpu: 500m
            memory: 256Mi
          limits:
            cpu: 2000m
            memory: 1Gi
        hpaSpec:
          minReplicas: 2
          maxReplicas: 10
```

## Network Policies for the Gateway

Restrict which pods can communicate with the gateway:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: ingress-gateway-policy
  namespace: istio-system
spec:
  podSelector:
    matchLabels:
      istio: ingressgateway
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - ports:
    - port: 80
      protocol: TCP
    - port: 443
      protocol: TCP
    - port: 15021
      protocol: TCP
  egress:
  - to:
    - namespaceSelector: {}
    ports:
    - port: 8080
      protocol: TCP
    - port: 443
      protocol: TCP
  - to:
    - namespaceSelector:
        matchLabels:
          name: istio-system
    ports:
    - port: 15012
      protocol: TCP
```

## Egress Gateway Security

Egress gateways control outbound traffic. They are just as important as ingress gateways for security.

**Force all outbound traffic through the egress gateway:**

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    outboundTrafficPolicy:
      mode: REGISTRY_ONLY
  components:
    egressGateways:
    - name: istio-egressgateway
      enabled: true
```

**Route external traffic through the egress gateway:**

```yaml
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: istio-system
spec:
  hosts:
  - api.external-service.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  resolution: DNS
  location: MESH_EXTERNAL
---
apiVersion: networking.istio.io/v1
kind: Gateway
metadata:
  name: egress-gateway
  namespace: istio-system
spec:
  selector:
    istio: egressgateway
  servers:
  - port:
      number: 443
      name: tls
      protocol: TLS
    hosts:
    - api.external-service.com
    tls:
      mode: PASSTHROUGH
---
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: external-api-route
  namespace: istio-system
spec:
  hosts:
  - api.external-service.com
  gateways:
  - mesh
  - egress-gateway
  tls:
  - match:
    - gateways:
      - mesh
      port: 443
      sniHosts:
      - api.external-service.com
    route:
    - destination:
        host: istio-egressgateway.istio-system.svc.cluster.local
        port:
          number: 443
  - match:
    - gateways:
      - egress-gateway
      port: 443
      sniHosts:
      - api.external-service.com
    route:
    - destination:
        host: api.external-service.com
        port:
          number: 443
```

## Authorization Policies on the Gateway

Apply fine-grained access control at the gateway level:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: gateway-authz
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: ingressgateway
  action: ALLOW
  rules:
  - to:
    - operation:
        hosts: ["app.example.com"]
        methods: ["GET", "POST", "PUT", "DELETE"]
        paths: ["/api/*"]
  - to:
    - operation:
        hosts: ["app.example.com"]
        methods: ["GET"]
        paths: ["/health", "/ready"]
```

## Monitoring Gateway Security

Set up alerts for security-relevant events:

```promql
# Unusual increase in 401/403 responses
sum(rate(istio_requests_total{reporter="source", destination_workload="istio-ingressgateway", response_code=~"401|403"}[5m])) > 100

# TLS handshake failures
sum(rate(envoy_listener_ssl_handshake_errors{pod=~"istio-ingressgateway.*"}[5m])) > 10

# Rate limit hits
sum(rate(envoy_http_local_rate_limit_rate_limited{pod=~"istio-ingressgateway.*"}[5m])) > 0
```

Gateway security is about layering multiple defenses: TLS, rate limiting, security headers, authorization policies, network policies, and monitoring. Each layer catches things the others might miss, and together they create a robust security boundary for your mesh.
