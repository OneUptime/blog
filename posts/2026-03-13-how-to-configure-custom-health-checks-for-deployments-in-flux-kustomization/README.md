# How to Configure Custom Health Checks for Deployments in Flux Kustomization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, GitOps, Kubernetes, Health Checks, Deployments, Kustomization

Description: Learn how to configure custom health checks for Deployment resources in Flux Kustomization to ensure reliable rollouts and automated rollback.

---

## Introduction

Flux Kustomization performs health checks on applied resources to determine whether a reconciliation was successful. By default, Flux knows how to assess the health of standard Kubernetes resources like Deployments. However, the default checks may not be sufficient for your specific requirements. Custom health checks let you define exactly what conditions must be met for Flux to consider a Deployment healthy, giving you finer control over your GitOps pipeline.

## Prerequisites

- A Kubernetes cluster running version 1.25 or later
- Flux v2.3 or later installed on the cluster
- kubectl configured to access the cluster
- A Git repository connected to Flux via a GitRepository source
- One or more Deployments managed by Flux

## How Flux Health Checks Work

When a Flux Kustomization has health checking enabled, Flux waits after applying resources and monitors them until they reach a healthy state or the timeout expires. For Deployments, the default health check verifies that the Deployment has the expected number of ready replicas and that the rollout is complete.

Health checking is enabled by setting `spec.wait` to `true` or by defining explicit health checks in the `spec.healthChecks` field.

## Enabling Default Health Checks

The simplest way to enable health checking is with the `wait` field:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
```

With `wait: true`, Flux monitors all resources applied by this Kustomization and waits for them to become ready. The `timeout` field defines how long Flux waits before marking the reconciliation as failed.

## Defining Custom Health Checks

For more control, use the `healthChecks` field to specify exactly which resources to monitor and what conditions to check:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 5m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: api-server
      namespace: production
    - apiVersion: apps/v1
      kind: Deployment
      name: worker
      namespace: production
```

This configuration tells Flux to specifically check the `api-server` and `worker` Deployments in the `production` namespace. Other resources applied by this Kustomization are not health-checked.

## Checking Multiple Deployments

When your application consists of multiple Deployments that must all be healthy for the system to function, list them all:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: microservices
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/microservices
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 10m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: frontend
      namespace: production
    - apiVersion: apps/v1
      kind: Deployment
      name: api-gateway
      namespace: production
    - apiVersion: apps/v1
      kind: Deployment
      name: auth-service
      namespace: production
    - apiVersion: apps/v1
      kind: Deployment
      name: order-service
      namespace: production
    - apiVersion: apps/v1
      kind: Deployment
      name: notification-service
      namespace: production
```

Flux waits for all listed Deployments to become ready. If any single Deployment fails to become healthy within the timeout, the entire Kustomization reconciliation is marked as failed.

## Combining wait with healthChecks

When you use both `wait` and `healthChecks`, Flux performs health checks on all applied resources (due to `wait: true`) and additionally checks the resources listed in `healthChecks`. This is useful when you want general health checking plus specific attention to critical Deployments:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: critical-api
      namespace: production
```

## Setting Appropriate Timeouts

The timeout value should account for your Deployment's startup time, including image pull time, init containers, and readiness probe delays:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: large-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/large-app
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 15m
```

If your Deployment pulls large images or runs lengthy init containers, increase the timeout accordingly. A timeout that is too short will cause false failures during normal rollouts.

## Monitoring Health Check Status

Check the Kustomization status to see health check results:

```bash
flux get kustomization my-app
```

For more detail:

```bash
kubectl get kustomization my-app -n flux-system -o yaml
```

The status section shows the health of each checked resource:

```bash
flux get kustomization my-app -o json | jq '.status.conditions'
```

## Handling Health Check Failures

When a health check fails, Flux marks the Kustomization as not ready and reports the failure. To diagnose the issue:

```bash
# Check Kustomization status
flux get kustomization my-app

# Check the Deployment status
kubectl rollout status deployment/api-server -n production

# Check pod events
kubectl describe deployment api-server -n production

# Check pod logs
kubectl logs -l app=api-server -n production --tail=50
```

Common reasons for Deployment health check failures include:

- Image pull errors
- Insufficient resources on the cluster
- Failing readiness probes
- CrashLoopBackOff due to application errors
- Missing ConfigMaps or Secrets referenced by the Deployment

## Using Health Checks with Dependencies

Health checks are especially valuable when combined with Kustomization dependencies. A dependent Kustomization will not start until the health checks of its dependency pass:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: database
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/database
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 10m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: postgres
      namespace: database
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: api-server
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/api-server
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: database
  wait: true
  timeout: 5m
```

The `api-server` Kustomization waits for the `database` Kustomization to become healthy before applying its resources, ensuring the database is available before the API server starts.

## Conclusion

Custom health checks for Deployments in Flux Kustomization give you precise control over what constitutes a successful reconciliation. By listing specific Deployments in the `healthChecks` field and setting appropriate timeouts, you ensure that Flux only considers a reconciliation complete when your application is truly ready. Combined with dependencies between Kustomizations, health checks create a reliable deployment pipeline that respects the startup order of your services.
