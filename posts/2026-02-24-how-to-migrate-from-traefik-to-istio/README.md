# How to Migrate from Traefik to Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Traefik, Migration, Kubernetes, Service Mesh, Ingresses

Description: A practical guide to migrating from Traefik ingress and middleware to Istio Gateway and VirtualService with configuration mapping and migration steps.

---

Traefik is a popular choice for Kubernetes ingress, especially teams that like its auto-discovery, middleware chain concept, and IngressRoute CRDs. But if you're moving to a full service mesh architecture, consolidating on Istio makes sense. Running both Traefik for ingress and Istio for mesh traffic means maintaining two separate systems for traffic management.

This guide walks through the migration from Traefik to Istio, mapping Traefik concepts to Istio equivalents and showing you how to move services without downtime.

## Concept Mapping

| Traefik | Istio |
|---|---|
| IngressRoute | Gateway + VirtualService |
| Middleware | VirtualService fields / EnvoyFilter |
| ServersTransport | DestinationRule |
| TLSOption | Gateway TLS config |
| entryPoints | Gateway server ports |
| Routers | VirtualService match rules |
| Services (weighted) | VirtualService destination weights |
| Circuit breaker middleware | DestinationRule outlierDetection |
| Rate limiting middleware | EnvoyFilter |
| StripPrefix middleware | VirtualService rewrite |
| Headers middleware | VirtualService headers |

## Step 1: Audit Your Traefik Configuration

List all Traefik-specific resources:

```bash
# IngressRoutes
kubectl get ingressroute --all-namespaces

# Middlewares
kubectl get middleware --all-namespaces

# TLS options
kubectl get tlsoption --all-namespaces

# ServersTransports
kubectl get serverstransport --all-namespaces
```

Export each for reference:

```bash
kubectl get ingressroute -n default my-app -o yaml > traefik-my-app.yaml
kubectl get middleware -n default --all -o yaml > traefik-middlewares.yaml
```

## Step 2: Install Istio Alongside Traefik

Install Istio without removing Traefik:

```bash
istioctl install --set profile=default

# Enable sidecar injection for your namespaces
kubectl label namespace default istio-injection=enabled

# Restart deployments to get sidecars
kubectl rollout restart deployment -n default
```

Both ingress controllers can coexist because they use separate LoadBalancer services.

## Step 3: Convert IngressRoutes

### Basic Routing

Traefik IngressRoute:

```yaml
apiVersion: traefik.io/v1alpha1
kind: IngressRoute
metadata:
  name: my-app
  namespace: default
spec:
  entryPoints:
  - web
  - websecure
  routes:
  - match: Host(`app.example.com`) && PathPrefix(`/api`)
    kind: Rule
    services:
    - name: api-service
      port: 8080
  - match: Host(`app.example.com`)
    kind: Rule
    services:
    - name: frontend
      port: 3000
  tls:
    secretName: app-tls
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
      credentialName: app-tls
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

Remember to copy TLS secrets to the istio-system namespace:

```bash
kubectl get secret app-tls -n default -o yaml | \
  sed 's/namespace: default/namespace: istio-system/' | \
  kubectl apply -f -
```

### Weighted Load Balancing

Traefik:

```yaml
spec:
  routes:
  - match: Host(`app.example.com`)
    kind: Rule
    services:
    - name: app-v1
      port: 8080
      weight: 80
    - name: app-v2
      port: 8080
      weight: 20
```

Istio:

```yaml
http:
- route:
  - destination:
      host: app-service
      subset: v1
    weight: 80
  - destination:
      host: app-service
      subset: v2
    weight: 20
```

With the DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: app-service-dr
spec:
  host: app-service
  subsets:
  - name: v1
    labels:
      version: v1
  - name: v2
    labels:
      version: v2
```

## Step 4: Convert Middlewares

### StripPrefix Middleware

Traefik:

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: strip-api
spec:
  stripPrefix:
    prefixes:
    - /api
```

Istio:

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
```

### Headers Middleware

Traefik:

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: security-headers
spec:
  headers:
    customRequestHeaders:
      X-Forwarded-Proto: https
    customResponseHeaders:
      X-Frame-Options: DENY
      X-Content-Type-Options: nosniff
      Strict-Transport-Security: max-age=31536000
```

Istio (request headers in VirtualService):

```yaml
http:
- headers:
    request:
      add:
        x-forwarded-proto: https
    response:
      add:
        x-frame-options: DENY
        x-content-type-options: nosniff
        strict-transport-security: max-age=31536000
  route:
  - destination:
      host: api-service
```

### Circuit Breaker Middleware

Traefik:

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: circuit-breaker
spec:
  circuitBreaker:
    expression: LatencyAtQuantileMS(50.0) > 100
```

Istio:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: api-service-dr
spec:
  host: api-service
  trafficPolicy:
    connectionPool:
      http:
        http1MaxPendingRequests: 100
        http2MaxRequests: 500
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 10s
      baseEjectionTime: 30s
      maxEjectionPercent: 50
```

Istio's circuit breaking works differently from Traefik's. Traefik uses an expression-based approach, while Istio uses outlier detection (ejecting unhealthy endpoints) and connection pool limits. The end result is similar - protecting your services from cascading failures.

### Retry Middleware

Traefik:

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: retry
spec:
  retry:
    attempts: 3
    initialInterval: 100ms
```

Istio:

```yaml
http:
- retries:
    attempts: 3
    perTryTimeout: 2s
    retryOn: 5xx,reset,connect-failure
  route:
  - destination:
      host: api-service
```

Istio doesn't support exponential backoff through VirtualService config. It adds jitter to retry timing automatically.

## Step 5: Migration Strategy

Run both Traefik and Istio simultaneously and migrate services one at a time:

1. Create the Istio Gateway and VirtualService for a service
2. Test it through the Istio gateway IP:

```bash
ISTIO_IP=$(kubectl get svc -n istio-system istio-ingressgateway \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}')

curl -H "Host: app.example.com" https://$ISTIO_IP/api/health
```

3. Once verified, update DNS to point to the Istio gateway
4. Remove the Traefik IngressRoute for that service
5. Repeat for the next service

## Step 6: Clean Up

After all services are migrated:

```bash
# Remove all Traefik CRDs
kubectl delete ingressroute --all --all-namespaces
kubectl delete middleware --all --all-namespaces
kubectl delete tlsoption --all --all-namespaces

# Uninstall Traefik
helm uninstall traefik -n traefik
kubectl delete namespace traefik

# Remove Traefik CRD definitions
kubectl delete crd ingressroutes.traefik.io
kubectl delete crd middlewares.traefik.io
kubectl delete crd tlsoptions.traefik.io
kubectl delete crd serverstransports.traefik.io
```

## Key Differences to Watch For

**Middleware chaining**: Traefik lets you chain multiple middlewares on a route. Istio applies all configuration within a single VirtualService route definition. If you had complex middleware chains, you may need to combine them into a single Istio route configuration.

**Auto-discovery**: Traefik can auto-discover services through labels and annotations. Istio requires explicit VirtualService and Gateway configuration for external access (though internal mesh routing works automatically).

**Dashboard**: Traefik has a built-in dashboard. For Istio, use Kiali for service mesh visualization and traffic monitoring.

The migration from Traefik to Istio is mostly a configuration translation exercise. The concepts map well between the two, and running them side by side during the transition means you can migrate at your own pace without any downtime risk.
