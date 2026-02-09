# How to Configure Istio Egress Gateway with SNI Routing for External HTTPS Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Istio, Egress Gateway, SNI, Kubernetes, Security

Description: Learn how to configure Istio egress gateway with SNI routing to control and monitor outbound HTTPS traffic to external services while maintaining TLS encryption end-to-end.

---

Controlling egress traffic is critical for security and compliance. Istio egress gateways centralize outbound traffic through dedicated proxies where you can apply policies, log connections, and monitor external service usage. SNI routing lets the gateway handle HTTPS traffic without terminating TLS.

## Understanding SNI Routing in Egress Gateways

Server Name Indication (SNI) is a TLS extension that includes the hostname in the TLS handshake. Istio egress gateways can route based on SNI without decrypting traffic, maintaining end-to-end encryption while still providing observability and control.

Without an egress gateway, pods connect directly to external services. With an egress gateway, traffic routes through the gateway which can log connections, apply rate limits, and enforce access policies. SNI routing works for HTTPS traffic where the client expects the destination's certificate.

This is essential for compliance requirements like PCI-DSS that mandate logging all external connections. It also helps identify which services call which external APIs.

## Prerequisites

You need a Kubernetes cluster with Istio installed including the egress gateway:

```bash
istioctl install --set components.egressGateways[0].name=istio-egressgateway \
  --set components.egressGateways[0].enabled=true
```

Verify the egress gateway is running:

```bash
kubectl get pods -n istio-system -l istio=egressgateway
```

Deploy a sample application:

```yaml
# client-app.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: client
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: client
  template:
    metadata:
      labels:
        app: client
    spec:
      containers:
      - name: client
        image: curlimages/curl:latest
        command: ["/bin/sleep", "infinity"]
```

```bash
kubectl apply -f client-app.yaml
```

## Creating a ServiceEntry for External Service

Define the external service you want to access through the egress gateway:

```yaml
# serviceentry-external.yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: default
spec:
  hosts:
  - api.external-service.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
```

```bash
kubectl apply -f serviceentry-external.yaml
```

This tells Istio that api.external-service.com is an external service. Without additional configuration, pods still connect directly.

## Configuring Gateway for Egress Traffic

Create a Gateway resource for the egress gateway:

```yaml
# gateway-egress.yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: egress-gateway
  namespace: default
spec:
  selector:
    istio: egressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - api.external-service.com
    tls:
      mode: PASSTHROUGH
```

```bash
kubectl apply -f gateway-egress.yaml
```

The PASSTHROUGH mode means the gateway doesn't terminate TLS. It routes based on SNI while keeping traffic encrypted.

## Creating VirtualService for SNI Routing

Configure routing from pods to the egress gateway and from the gateway to the external service:

```yaml
# virtualservice-egress.yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: external-api-routing
  namespace: default
spec:
  hosts:
  - api.external-service.com
  gateways:
  - mesh
  - egress-gateway
  tls:
  # Route from sidecar to egress gateway
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
  # Route from egress gateway to external service
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
      weight: 100
```

```bash
kubectl apply -f virtualservice-egress.yaml
```

This creates a two-hop route: client sidecar -> egress gateway -> external service.

## Testing SNI Routing

Test that traffic flows through the egress gateway:

```bash
kubectl exec -it deploy/client -- curl -v https://api.external-service.com/endpoint
```

Check egress gateway logs to verify traffic passed through:

```bash
kubectl logs -n istio-system -l istio=egressgateway -c istio-proxy | grep "api.external-service.com"
```

You should see access logs for the external service request.

## Routing Multiple External Services

Configure multiple external services through the same gateway:

```yaml
# serviceentry-multiple.yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-services
  namespace: default
spec:
  hosts:
  - api.github.com
  - api.stripe.com
  - storage.googleapis.com
  ports:
  - number: 443
    name: https
    protocol: HTTPS
  location: MESH_EXTERNAL
  resolution: DNS
---
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: egress-gateway
  namespace: default
spec:
  selector:
    istio: egressgateway
  servers:
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "*.github.com"
    - "*.stripe.com"
    - "*.googleapis.com"
    tls:
      mode: PASSTHROUGH
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: external-services-routing
  namespace: default
spec:
  hosts:
  - api.github.com
  - api.stripe.com
  - storage.googleapis.com
  gateways:
  - mesh
  - egress-gateway
  tls:
  - match:
    - gateways:
      - mesh
      port: 443
      sniHosts:
      - api.github.com
      - api.stripe.com
      - storage.googleapis.com
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
      - api.github.com
      - api.stripe.com
      - storage.googleapis.com
    route:
    - destination:
        host: api.github.com
        port:
          number: 443
      weight: 33
    - destination:
        host: api.stripe.com
        port:
          number: 443
      weight: 33
    - destination:
        host: storage.googleapis.com
        port:
          number: 443
      weight: 34
```

The VirtualService needs separate destination entries for each host when routing from the gateway.

## Applying Authorization Policies

Control which services can access external APIs:

```yaml
# authz-egress.yaml
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: egress-gateway-access
  namespace: istio-system
spec:
  selector:
    matchLabels:
      istio: egressgateway
  action: ALLOW
  rules:
  # Allow only specific service accounts to use egress
  - from:
    - source:
        principals:
        - "cluster.local/ns/default/sa/payment-service"
        - "cluster.local/ns/default/sa/notification-service"
    to:
    - operation:
        hosts:
        - "api.stripe.com"
        - "api.sendgrid.com"
```

```bash
kubectl apply -f authz-egress.yaml
```

Only payment-service and notification-service can access external APIs through the egress gateway.

## Monitoring Egress Traffic

Query Prometheus for egress gateway metrics:

```promql
# Request rate through egress gateway
sum(rate(istio_requests_total{
  destination_workload="istio-egressgateway"
}[5m])) by (destination_service_name)

# Egress gateway response times
histogram_quantile(0.95,
  sum(rate(istio_request_duration_milliseconds_bucket{
    destination_workload="istio-egressgateway"
  }[5m])) by (le, destination_service_name)
)
```

View egress traffic in Kiali dashboard to visualize which services call which external APIs.

## Implementing Rate Limiting

Apply rate limits to external API calls:

```yaml
# envoyfilter-rate-limit.yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: egress-rate-limit
  namespace: istio-system
spec:
  workloadSelector:
    labels:
      istio: egressgateway
  configPatches:
  - applyTo: HTTP_FILTER
    match:
      context: GATEWAY
      listener:
        filterChain:
          filter:
            name: "envoy.filters.network.http_connection_manager"
    patch:
      operation: INSERT_BEFORE
      value:
        name: envoy.filters.http.local_ratelimit
        typed_config:
          "@type": type.googleapis.com/envoy.extensions.filters.http.local_ratelimit.v3.LocalRateLimit
          stat_prefix: http_local_rate_limiter
          token_bucket:
            max_tokens: 100
            tokens_per_fill: 100
            fill_interval: 60s
```

This limits egress traffic to 100 requests per minute through the gateway.

## Conclusion

Istio egress gateways with SNI routing centralize outbound HTTPS traffic without terminating TLS. Configure ServiceEntry, Gateway, and VirtualService resources to route external traffic through dedicated egress proxies.

Apply authorization policies to control which services can access external APIs. Monitor egress traffic for compliance and debugging. Use rate limiting to protect against runaway external API usage.

SNI routing maintains end-to-end encryption while providing visibility and control over egress traffic. This is essential for security, compliance, and cost management in production Kubernetes environments.
