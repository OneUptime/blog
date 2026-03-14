# How to Manage Linkerd Service Profiles with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Linkerd, Service Profiles, Traffic Management, Retries

Description: Manage Linkerd ServiceProfile resources using Flux CD GitOps to configure per-route retries, timeouts, and traffic metrics for Linkerd-meshed services.

---

## Introduction

Linkerd's ServiceProfile is a custom resource that defines how Linkerd should treat traffic to a specific service. It enables per-route observability (success rate, latency per endpoint), retries, timeouts, and marks which routes are safe to retry (idempotent). Without a ServiceProfile, Linkerd tracks metrics at the service level; with it, you get per-route golden metrics.

Managing ServiceProfiles through Flux CD ensures your traffic management configuration is version-controlled alongside your application code. Adding retry policies or adjusting timeouts is a pull request that can be reviewed before affecting production.

This guide covers creating and managing Linkerd ServiceProfiles using Flux CD.

## Prerequisites

- Kubernetes cluster with Linkerd installed
- Flux CD v2 bootstrapped to your Git repository
- Services meshed with the Linkerd proxy

## Step 1: Understand ServiceProfile Structure

A ServiceProfile defines routes matching HTTP methods and paths:

```yaml
# Route naming: <method> <path>
# Retryable: GET requests (idempotent)
# Not retryable: POST requests (not idempotent by default)
```

## Step 2: Create a ServiceProfile for an API Service

```yaml
# clusters/my-cluster/linkerd-profiles/api-service-profile.yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: api-service.production.svc.cluster.local
  namespace: production
spec:
  # Route definitions
  routes:
    # GET /api/users - Read operation, safe to retry
    - name: "GET /api/users"
      condition:
        method: GET
        pathRegex: /api/users(/.*)?
      isRetryable: true
      timeout: 5s

    # GET /api/products - Also retryable
    - name: "GET /api/products"
      condition:
        method: GET
        pathRegex: /api/products(/.*)?
      isRetryable: true
      timeout: 3s

    # POST /api/orders - NOT retryable (creates resources)
    - name: "POST /api/orders"
      condition:
        method: POST
        pathRegex: /api/orders
      isRetryable: false
      timeout: 10s

    # DELETE endpoints - context-dependent retry
    - name: "DELETE /api/orders"
      condition:
        method: DELETE
        pathRegex: /api/orders(/.*)?
      isRetryable: false
      timeout: 5s

  # Overall service-level retry budget
  # Maximum 20% additional requests due to retries, with 10 retries/second floor
  retryBudget:
    retryRatio: 0.2
    minRetriesPerSecond: 10
    ttl: 10s
```

## Step 3: Create a Profile for a gRPC Service

```yaml
# clusters/my-cluster/linkerd-profiles/grpc-service-profile.yaml
apiVersion: linkerd.io/v1alpha2
kind: ServiceProfile
metadata:
  name: user-service.production.svc.cluster.local
  namespace: production
spec:
  routes:
    # gRPC routes use /package.Service/Method format
    - name: "GetUser"
      condition:
        method: POST
        pathRegex: /users.UserService/GetUser
      isRetryable: true
      timeout: 3s

    - name: "ListUsers"
      condition:
        method: POST
        pathRegex: /users.UserService/ListUsers
      isRetryable: true
      timeout: 10s

    - name: "CreateUser"
      condition:
        method: POST
        pathRegex: /users.UserService/CreateUser
      isRetryable: false
      timeout: 5s

  retryBudget:
    retryRatio: 0.2
    minRetriesPerSecond: 5
    ttl: 10s
```

## Step 4: Generate ServiceProfile from OpenAPI Spec

```bash
# Auto-generate ServiceProfile from an OpenAPI/Swagger spec
linkerd profile --open-api openapi.yaml api-service \
  > clusters/my-cluster/linkerd-profiles/api-service-generated.yaml

# Generate from a running service (reads existing routes via reflection)
linkerd profile --tap deployment/api-service \
  -n production \
  --tap-duration 30s \
  > clusters/my-cluster/linkerd-profiles/api-service-tapped.yaml
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/linkerd-profiles/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - api-service-profile.yaml
  - grpc-service-profile.yaml
---
# clusters/my-cluster/flux-kustomization-linkerd-profiles.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: linkerd-service-profiles
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: linkerd
  path: ./clusters/my-cluster/linkerd-profiles
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 6: Validate Per-Route Metrics

```bash
# Apply Flux reconciliation
flux reconcile kustomization linkerd-service-profiles

# List ServiceProfiles
kubectl get serviceprofile -n production

# View per-route success rate in Linkerd viz
linkerd viz routes deployment/api-service -n production

# Check effective retry rates
linkerd viz routes deployment/api-service -n production --to svc/upstream-service

# Monitor route success rates
linkerd viz stat serviceprofile/api-service.production.svc.cluster.local -n production
```

## Best Practices

- Generate initial ServiceProfiles with `linkerd profile --tap` to capture real traffic patterns before manually defining routes, then refine in Git.
- Mark GET, HEAD, and OPTIONS routes as `isRetryable: true` - these are idempotent by HTTP convention. Always mark POST, PUT, PATCH, and DELETE as `isRetryable: false` unless you know your specific endpoints are idempotent.
- Set `retryBudget.retryRatio` to 0.2 (20% additional requests) as a starting point - monitor actual retry rates and lower the budget if your upstream service is sensitive to amplified load.
- Name ServiceProfile resources using the fully qualified service DNS name format: `<service>.<namespace>.svc.cluster.local` - Linkerd uses this for matching.
- Update ServiceProfiles when new API routes are added to your service - unmatched routes are tracked as a single `[UNKNOWN]` bucket in Linkerd metrics, hiding per-route visibility.

## Conclusion

Managing Linkerd ServiceProfiles through Flux CD gives your team version-controlled, per-route traffic management configuration. Retry policies, timeouts, and route definitions are all in Git, making it easy to tune traffic behavior through pull requests and enabling the full power of Linkerd's per-route observability metrics across your service mesh.
