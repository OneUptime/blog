# How to Manage Linkerd Service Profiles with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Linkerd, Service Mesh

Description: Learn how to manage Linkerd ServiceProfile resources with ArgoCD for GitOps-driven route-level metrics, retries, and timeout configuration in your service mesh.

---

Linkerd's ServiceProfile is the primary resource for configuring per-route behavior in the Linkerd service mesh. It defines routes for a service, enabling per-route metrics, retries, and timeouts. Unlike Istio which uses multiple CRDs for traffic management, Linkerd consolidates route configuration into a single ServiceProfile resource, making it simpler to manage with ArgoCD.

This guide covers deploying and managing Linkerd ServiceProfiles through ArgoCD for reliable, GitOps-driven mesh configuration.

## What ServiceProfiles Do

A ServiceProfile defines routes on a service and the policies that apply to each route:

```yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: product-service.production.svc.cluster.local
  namespace: production
spec:
  routes:
    - name: GET /api/products
      condition:
        method: GET
        pathRegex: /api/products
      responseClasses:
        - condition:
            status:
              min: 500
              max: 599
          isFailure: true
      timeout: 5s

    - name: POST /api/products
      condition:
        method: POST
        pathRegex: /api/products
      isRetryable: true
      timeout: 10s
```

Key capabilities:
- **Per-route metrics** - get success rate, latency, and request volume for each route
- **Retries** - configure which routes are safe to retry
- **Timeouts** - set per-route timeout values
- **Response classification** - define what counts as a failure

## Installing Linkerd with ArgoCD

Before managing ServiceProfiles, install Linkerd itself through ArgoCD:

```yaml
# Linkerd CRDs
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: linkerd-crds
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "-2"
spec:
  project: infrastructure
  source:
    repoURL: https://helm.linkerd.io/edge
    chart: linkerd-crds
    targetRevision: 2024.2.1
  destination:
    server: https://kubernetes.default.svc
    namespace: linkerd
  syncPolicy:
    automated:
      selfHeal: true
    syncOptions:
      - CreateNamespace=true

---
# Linkerd control plane
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: linkerd-control-plane
  namespace: argocd
  annotations:
    argocd.argoproj.io/sync-wave: "-1"
spec:
  project: infrastructure
  source:
    repoURL: https://helm.linkerd.io/edge
    chart: linkerd-control-plane
    targetRevision: 2024.2.1
    helm:
      valuesObject:
        identityTrustAnchorsPEM: |
          # Your trust anchor certificate
        identity:
          issuer:
            tls:
              crtPEM: |
                # Your issuer certificate
              keyPEM: |
                # Your issuer key
  destination:
    server: https://kubernetes.default.svc
    namespace: linkerd
  syncPolicy:
    automated:
      selfHeal: true
```

## Repository Structure for ServiceProfiles

Organize ServiceProfiles by namespace and service:

```text
linkerd-config/
  base/
    kustomization.yaml
    service-profiles/
      production/
        product-service.yaml
        order-service.yaml
        user-service.yaml
        payment-service.yaml
      shared/
        external-api.yaml
  overlays/
    staging/
      kustomization.yaml
      patches/
        relaxed-timeouts.yaml
    production/
      kustomization.yaml
      patches/
        strict-timeouts.yaml
```

## Creating ServiceProfiles from OpenAPI Specs

Linkerd can generate ServiceProfiles from OpenAPI specs. Automate this in your CI pipeline:

```bash
# Generate ServiceProfile from OpenAPI spec
linkerd profile --open-api product-service-openapi.yaml \
  product-service.production.svc.cluster.local \
  > service-profiles/production/product-service.yaml
```

Or use an ArgoCD pre-sync hook:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: generate-service-profiles
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: profile-gen
          image: cr.l5d.io/linkerd/cli:edge-24.2.1
          command:
            - sh
            - -c
            - |
              # Generate profiles from live traffic data
              linkerd profile --tap deploy/product-service \
                -n production \
                --tap-duration 60s \
                > /output/product-service-profile.yaml
          volumeMounts:
            - name: output
              mountPath: /output
      restartPolicy: Never
      volumes:
        - name: output
          emptyDir: {}
  backoffLimit: 1
```

## ArgoCD Application for ServiceProfiles

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: linkerd-service-profiles
  namespace: argocd
spec:
  project: networking
  source:
    repoURL: https://github.com/your-org/linkerd-config
    path: overlays/production
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: production
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
    syncOptions:
      - ApplyOutOfSyncOnly=true
```

## Custom Health Check for ServiceProfiles

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.health.linkerd.io_ServiceProfile: |
    hs = {}
    if obj.spec ~= nil then
      local routes = obj.spec.routes or {}
      if #routes > 0 then
        hs.status = "Healthy"
        hs.message = tostring(#routes) ..
          " route(s) configured"
      else
        hs.status = "Progressing"
        hs.message = "No routes defined yet"
      end
    else
      hs.status = "Degraded"
      hs.message = "Missing spec"
    end
    return hs
```

## Pattern 1: Per-Route Retries

Only mark idempotent routes as retryable:

```yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: order-service.production.svc.cluster.local
  namespace: production
spec:
  routes:
    # GET is safe to retry
    - name: GET /api/orders/{id}
      condition:
        method: GET
        pathRegex: /api/orders/[^/]+
      isRetryable: true
      timeout: 5s

    # List is safe to retry
    - name: GET /api/orders
      condition:
        method: GET
        pathRegex: /api/orders
      isRetryable: true
      timeout: 10s

    # POST is NOT safe to retry (creates orders)
    - name: POST /api/orders
      condition:
        method: POST
        pathRegex: /api/orders
      isRetryable: false
      timeout: 15s

    # DELETE is idempotent, safe to retry
    - name: DELETE /api/orders/{id}
      condition:
        method: DELETE
        pathRegex: /api/orders/[^/]+
      isRetryable: true
      timeout: 10s
```

## Pattern 2: Response Classification

Define what counts as a success or failure for accurate metrics:

```yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: payment-service.production.svc.cluster.local
  namespace: production
spec:
  routes:
    - name: POST /api/payments
      condition:
        method: POST
        pathRegex: /api/payments
      responseClasses:
        # 5xx errors are failures
        - condition:
            status:
              min: 500
              max: 599
          isFailure: true
        # 429 (rate limited) is a failure
        - condition:
            status:
              min: 429
              max: 429
          isFailure: true
        # 4xx client errors are NOT failures
        # (bad input from the caller)
        - condition:
            status:
              min: 400
              max: 428
          isFailure: false
      timeout: 30s
```

## Pattern 3: Environment-Specific Timeouts

Use Kustomize to vary timeouts between staging and production:

```yaml
# base/service-profiles/production/user-service.yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: user-service.production.svc.cluster.local
  namespace: production
spec:
  routes:
    - name: GET /api/users/{id}
      condition:
        method: GET
        pathRegex: /api/users/[^/]+
      isRetryable: true
      timeout: 5s
    - name: POST /api/users
      condition:
        method: POST
        pathRegex: /api/users
      timeout: 10s
```

```yaml
# overlays/staging/patches/relaxed-timeouts.yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: user-service.staging.svc.cluster.local
  namespace: staging
spec:
  routes:
    - name: GET /api/users/{id}
      condition:
        method: GET
        pathRegex: /api/users/[^/]+
      isRetryable: true
      timeout: 30s  # Longer timeout for debugging
    - name: POST /api/users
      condition:
        method: POST
        pathRegex: /api/users
      timeout: 60s  # Longer timeout for debugging
```

## Monitoring ServiceProfile Effectiveness

Once ServiceProfiles are deployed, Linkerd provides per-route metrics:

```bash
# Check per-route metrics
linkerd stat sp/product-service.production.svc.cluster.local \
  -n production

# Output shows per-route success rate, RPS, and latency
# ROUTE                    SUCCESS   RPS   LATENCY_P50   LATENCY_P95
# GET /api/products        99.9%     150   5ms           25ms
# POST /api/products       98.5%     50    15ms          75ms
# GET /api/products/{id}   99.8%     300   3ms           15ms
```

Track these in Grafana with the Linkerd Prometheus metrics:

```promql
# Per-route success rate
sum(rate(
  response_total{
    classification="success",
    rt_route="GET /api/products"
  }[5m]
)) /
sum(rate(
  response_total{
    rt_route="GET /api/products"
  }[5m]
))

# Per-route P95 latency
histogram_quantile(0.95,
  sum(rate(
    response_latency_ms_bucket{
      rt_route="GET /api/products"
    }[5m]
  )) by (le)
)
```

## Summary

Linkerd ServiceProfiles are the key to unlocking per-route observability and traffic policies in the Linkerd mesh. Managing them with ArgoCD ensures consistent configuration across environments, with every change tracked in Git. Use OpenAPI specs or live traffic data to generate initial profiles, then customize retry policies, timeouts, and response classification per route. The result is a service mesh that is both well-understood and well-managed through GitOps principles.
