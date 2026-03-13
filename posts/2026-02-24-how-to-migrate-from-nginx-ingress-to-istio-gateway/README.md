# How to Migrate from NGINX Ingress to Istio Gateway

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, NGINX, Ingresses, Migration, Kubernetes, Gateway

Description: A step-by-step guide to migrating from NGINX Ingress Controller to Istio Ingress Gateway with configuration mapping and zero-downtime cutover strategies.

---

NGINX Ingress Controller is probably the most widely used ingress solution for Kubernetes. It works great, but if you're adopting Istio for service mesh capabilities, running both NGINX Ingress and Istio's ingress gateway is redundant. Consolidating on Istio's gateway simplifies your stack and lets external traffic benefit from mesh features like mTLS, traffic management, and observability.

The migration is straightforward because most NGINX Ingress features have direct equivalents in Istio. The challenge is doing it without downtime.

## Mapping NGINX Ingress to Istio Concepts

Here's how NGINX Ingress concepts map to Istio:

| NGINX Ingress | Istio |
|---|---|
| Ingress resource | Gateway + VirtualService |
| annotations | VirtualService/DestinationRule fields |
| nginx.conf snippets | EnvoyFilter |
| rate limiting annotation | EnvoyFilter (local rate limit) |
| SSL termination | Gateway TLS config |
| URL rewriting | VirtualService rewrite |
| Backend protocol | Service port naming |

## Step 1: Inventory Your NGINX Ingress Resources

First, catalog everything you're running through NGINX:

```bash
# List all Ingress resources
kubectl get ingress --all-namespaces

# Get detailed config for each ingress
kubectl get ingress -n <namespace> <ingress-name> -o yaml
```

Look for annotations - these contain most of the NGINX-specific configuration:

```bash
kubectl get ingress --all-namespaces -o json | \
  jq '.items[].metadata.annotations // empty'
```

## Step 2: Install Istio Alongside NGINX

Install Istio without removing NGINX. Both can run simultaneously:

```bash
istioctl install --set profile=default
```

The Istio ingress gateway gets its own LoadBalancer service with a separate external IP. During migration, both NGINX and Istio handle traffic - you'll move services one at a time.

## Step 3: Convert Ingress Resources

### Basic Path-Based Routing

NGINX Ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  annotations:
    kubernetes.io/ingress.class: nginx
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 3000
```

Istio equivalent:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: my-app-gateway
  namespace: default
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "app.example.com"
---
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-app-vs
  namespace: default
spec:
  hosts:
  - "app.example.com"
  gateways:
  - my-app-gateway
  http:
  - match:
    - uri:
        prefix: /api
    route:
    - destination:
        host: api-service
        port:
          number: 8080
  - route:
    - destination:
        host: frontend
        port:
          number: 3000
```

### TLS/SSL Termination

NGINX Ingress:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  annotations:
    kubernetes.io/ingress.class: nginx
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
  - hosts:
    - app.example.com
    secretName: app-tls-secret
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend
            port:
              number: 3000
```

Istio equivalent:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Gateway
metadata:
  name: my-app-gateway
spec:
  selector:
    istio: ingressgateway
  servers:
  - port:
      number: 80
      name: http
      protocol: HTTP
    hosts:
    - "app.example.com"
    tls:
      httpsRedirect: true
  - port:
      number: 443
      name: https
      protocol: HTTPS
    hosts:
    - "app.example.com"
    tls:
      mode: SIMPLE
      credentialName: app-tls-secret
```

Important: NGINX reads TLS secrets from the Ingress namespace. Istio reads them from the `istio-system` namespace (or wherever the gateway runs). Copy your TLS secrets:

```bash
kubectl get secret app-tls-secret -n default -o yaml | \
  sed 's/namespace: default/namespace: istio-system/' | \
  kubectl apply -f -
```

### URL Rewriting

NGINX Ingress:

```yaml
annotations:
  nginx.ingress.kubernetes.io/rewrite-target: /$2
spec:
  rules:
  - host: app.example.com
    http:
      paths:
      - path: /api(/|$)(.*)
        pathType: Prefix
        backend:
          service:
            name: api-service
            port:
              number: 8080
```

Istio equivalent:

```yaml
http:
- match:
  - uri:
      prefix: /api
  rewrite:
    uri: /
  route:
  - destination:
      host: api-service
      port:
        number: 8080
```

### Rate Limiting

NGINX Ingress:

```yaml
annotations:
  nginx.ingress.kubernetes.io/limit-rps: "10"
  nginx.ingress.kubernetes.io/limit-burst-multiplier: "5"
```

Istio equivalent (using EnvoyFilter local rate limit):

```yaml
apiVersion: networking.istio.io/v1alpha3
kind: EnvoyFilter
metadata:
  name: ratelimit
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
            stat_prefix: http_local_rate_limiter
            token_bucket:
              max_tokens: 50
              tokens_per_fill: 10
              fill_interval: 1s
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
```

### CORS Configuration

NGINX Ingress:

```yaml
annotations:
  nginx.ingress.kubernetes.io/enable-cors: "true"
  nginx.ingress.kubernetes.io/cors-allow-origin: "https://app.example.com"
  nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE"
```

Istio equivalent:

```yaml
http:
- corsPolicy:
    allowOrigins:
    - exact: "https://app.example.com"
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
      host: api-service
```

## Step 4: Zero-Downtime Cutover

The cleanest approach is to use DNS-based traffic shifting:

1. Both NGINX and Istio gateways run simultaneously with their own external IPs
2. Update DNS to use weighted records pointing to both IPs
3. Gradually shift DNS weight from NGINX to Istio
4. Once all traffic goes through Istio, remove NGINX

```bash
# Get both external IPs
NGINX_IP=$(kubectl get svc -n ingress-nginx ingress-nginx-controller \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
ISTIO_IP=$(kubectl get svc -n istio-system istio-ingressgateway \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

echo "NGINX: $NGINX_IP"
echo "Istio: $ISTIO_IP"
```

## Step 5: Verify and Clean Up

After all traffic flows through Istio:

```bash
# Verify no traffic hits NGINX
kubectl logs -n ingress-nginx deploy/ingress-nginx-controller --tail=100

# Remove NGINX Ingress resources
kubectl delete ingress --all -n default

# Uninstall NGINX Ingress Controller
helm uninstall ingress-nginx -n ingress-nginx
kubectl delete namespace ingress-nginx
```

## Common Migration Issues

**Port naming**: Istio uses Kubernetes Service port names to detect protocol. Make sure your Service ports are named with the correct prefix (`http-`, `grpc-`, `tcp-`):

```yaml
ports:
- name: http-web
  port: 8080
```

**Connection timeout differences**: NGINX defaults differ from Envoy defaults. If you had custom proxy timeouts in NGINX, replicate them in Istio VirtualService timeout fields.

**Custom NGINX config snippets**: If you used `server-snippet` or `configuration-snippet` annotations, you'll need to find Istio equivalents or use EnvoyFilter for advanced configurations.

Migrating from NGINX Ingress to Istio Gateway is a service-by-service process. Convert the configurations, test each service through the Istio gateway, and then shift traffic. The result is a simpler architecture where your ingress and mesh use the same control plane and configuration language.
