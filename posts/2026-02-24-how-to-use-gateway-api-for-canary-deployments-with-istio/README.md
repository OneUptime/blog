# How to Use Gateway API for Canary Deployments with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Gateway API, Canary Deployments, Kubernetes, Traffic Management

Description: A step-by-step guide to implementing canary deployments using the Kubernetes Gateway API with Istio, covering weight-based splitting, header-based targeting, and progressive rollouts.

---

Canary deployments let you release a new version of your service to a small percentage of traffic before rolling it out to everyone. If the canary version has bugs or performance issues, only a fraction of users are affected, and you can quickly roll back. The Kubernetes Gateway API with Istio makes canary deployments straightforward through weight-based traffic splitting and header-based routing.

## The Canary Deployment Pattern

A canary deployment works like this:

1. Deploy the new version alongside the current version
2. Send a small percentage of traffic (say 5%) to the new version
3. Monitor error rates, latency, and business metrics
4. If things look good, gradually increase the percentage
5. Once at 100%, remove the old version

You need two things: the ability to run both versions simultaneously, and the ability to control what percentage of traffic goes where.

## Setting Up the Services

First, deploy both versions of your application. Each version needs its own Kubernetes Service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-stable
  namespace: production
spec:
  replicas: 5
  selector:
    matchLabels:
      app: my-app
      version: stable
  template:
    metadata:
      labels:
        app: my-app
        version: stable
    spec:
      containers:
      - name: app
        image: my-app:v1.0.0
        ports:
        - containerPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-canary
  namespace: production
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
      version: canary
  template:
    metadata:
      labels:
        app: my-app
        version: canary
    spec:
      containers:
      - name: app
        image: my-app:v2.0.0
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: my-app-stable
  namespace: production
spec:
  selector:
    app: my-app
    version: stable
  ports:
  - port: 80
    targetPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: my-app-canary
  namespace: production
spec:
  selector:
    app: my-app
    version: canary
  ports:
  - port: 80
    targetPort: 8080
```

## Setting Up the Gateway

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: web-gateway
  namespace: production
spec:
  gatewayClassName: istio
  listeners:
  - name: http
    protocol: HTTP
    port: 80
    allowedRoutes:
      namespaces:
        from: Same
```

## Weight-Based Canary: Starting at 5%

Create an HTTPRoute with weighted backends:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-app-canary-route
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  hostnames:
  - "app.example.com"
  rules:
  - backendRefs:
    - name: my-app-stable
      port: 80
      weight: 95
    - name: my-app-canary
      port: 80
      weight: 5
```

5% of all requests now go to the canary version. The weight distribution is enforced by Envoy, so it's precise across a large number of requests.

## Progressive Rollout

As you gain confidence, increase the canary weight:

**10% canary:**

```yaml
rules:
- backendRefs:
  - name: my-app-stable
    port: 80
    weight: 90
  - name: my-app-canary
    port: 80
    weight: 10
```

**25% canary:**

```yaml
rules:
- backendRefs:
  - name: my-app-stable
    port: 80
    weight: 75
  - name: my-app-canary
    port: 80
    weight: 25
```

**50% canary:**

```yaml
rules:
- backendRefs:
  - name: my-app-stable
    port: 80
    weight: 50
  - name: my-app-canary
    port: 80
    weight: 50
```

**100% canary (full rollout):**

```yaml
rules:
- backendRefs:
  - name: my-app-canary
    port: 80
    weight: 100
```

At each step, monitor your metrics before proceeding to the next stage.

## Header-Based Canary: Internal Testing First

Before exposing the canary to real users, let your team test it using headers:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-app-canary-route
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  hostnames:
  - "app.example.com"
  rules:
  # Internal testers with the canary header go to the canary
  - matches:
    - headers:
      - name: x-canary
        value: "true"
    backendRefs:
    - name: my-app-canary
      port: 80
  # Everyone else goes to stable
  - backendRefs:
    - name: my-app-stable
      port: 80
```

Team members can test the canary by adding the header:

```bash
curl -H "x-canary: true" http://app.example.com/
```

Once internal testing passes, switch to weight-based splitting for the gradual rollout.

## Combined Approach: Headers + Weights

The most robust approach combines both. Internal testers always see the canary, while a percentage of regular users also get it:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-app-canary-route
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  hostnames:
  - "app.example.com"
  rules:
  # Force canary for internal testers
  - matches:
    - headers:
      - name: x-canary
        value: "true"
    backendRefs:
    - name: my-app-canary
      port: 80
  # Weight-based split for everyone else
  - backendRefs:
    - name: my-app-stable
      port: 80
      weight: 90
    - name: my-app-canary
      port: 80
      weight: 10
```

## Per-Route Canary

Sometimes you want to canary only specific endpoints. Maybe you changed the `/api/checkout` endpoint and want to test just that path:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: checkout-canary-route
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  hostnames:
  - "app.example.com"
  rules:
  # Only the checkout path gets canary traffic
  - matches:
    - path:
        type: PathPrefix
        value: /api/checkout
    backendRefs:
    - name: my-app-stable
      port: 80
      weight: 95
    - name: my-app-canary
      port: 80
      weight: 5
  # All other paths go to stable only
  - backendRefs:
    - name: my-app-stable
      port: 80
```

## Monitoring the Canary

You need to compare metrics between the stable and canary versions. With Istio, Envoy generates metrics tagged by destination service.

Check error rates:

```bash
# From Prometheus - compare error rates
# Canary error rate
rate(istio_requests_total{destination_service="my-app-canary.production.svc.cluster.local",response_code=~"5.."}[5m])
/
rate(istio_requests_total{destination_service="my-app-canary.production.svc.cluster.local"}[5m])

# Stable error rate
rate(istio_requests_total{destination_service="my-app-stable.production.svc.cluster.local",response_code=~"5.."}[5m])
/
rate(istio_requests_total{destination_service="my-app-stable.production.svc.cluster.local"}[5m])
```

Check latency:

```bash
# P99 latency for canary
histogram_quantile(0.99, rate(istio_request_duration_milliseconds_bucket{destination_service="my-app-canary.production.svc.cluster.local"}[5m]))

# P99 latency for stable
histogram_quantile(0.99, rate(istio_request_duration_milliseconds_bucket{destination_service="my-app-stable.production.svc.cluster.local"}[5m]))
```

## Rolling Back

If the canary shows problems, route all traffic back to stable:

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-app-canary-route
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  hostnames:
  - "app.example.com"
  rules:
  - backendRefs:
    - name: my-app-stable
      port: 80
```

Apply it immediately:

```bash
kubectl apply -f rollback-route.yaml
```

The change takes effect within seconds as Istio pushes the new route config to all Envoy proxies.

## Completing the Rollout

After the canary is fully validated at 100% traffic:

1. Update the stable deployment to the new version
2. Scale down and remove the canary deployment
3. Update the HTTPRoute to point only to the stable service
4. Remove the canary-specific Service

```bash
# Update stable to new version
kubectl set image deployment/my-app-stable app=my-app:v2.0.0 -n production

# Remove canary
kubectl delete deployment my-app-canary -n production
kubectl delete service my-app-canary -n production

# Update route to just stable
kubectl apply -f - <<EOF
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: my-app-canary-route
  namespace: production
spec:
  parentRefs:
  - name: web-gateway
  hostnames:
  - "app.example.com"
  rules:
  - backendRefs:
    - name: my-app-stable
      port: 80
EOF
```

## Automation with Flagger

For automated canary deployments, consider using Flagger, which integrates with the Gateway API:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: my-app
  namespace: production
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  gatewayRefs:
  - name: web-gateway
    namespace: production
  service:
    port: 80
  analysis:
    interval: 1m
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    metrics:
    - name: request-success-rate
      thresholdRange:
        min: 99
      interval: 1m
```

Flagger automatically manages the canary Service, HTTPRoute weights, and progressive rollout based on metric analysis.

Canary deployments with the Gateway API give you precise control over traffic distribution without any client-side changes. The combination of weight-based splitting, header routing, and Istio's built-in observability makes it straightforward to ship with confidence.
