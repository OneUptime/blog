# How to Disable Health Checks for Specific Resources in Flux Kustomization

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, GitOps, Kubernetes, Health Checks, Kustomization, Configuration

Description: Learn how to selectively disable health checks for specific resources in Flux Kustomization when certain workloads should not block reconciliation.

---

## Introduction

Flux Kustomization health checks are valuable for ensuring deployments are successful, but not every resource needs to be health-checked. Some resources, like CronJobs, optional sidecars, or development tools, should not block the reconciliation of your entire application. This guide explains how to selectively disable or exclude resources from health checking in Flux Kustomization while still monitoring the critical components.

## Prerequisites

- A Kubernetes cluster running version 1.25 or later
- Flux v2.3 or later installed on the cluster
- kubectl configured to access the cluster
- A Git repository connected to Flux via a GitRepository source
- Understanding of Flux Kustomization health checking

## The Problem with Global Health Checks

When you use `wait: true` on a Kustomization, Flux health-checks every resource it applies. This can be problematic when your Kustomization includes resources that:

- Do not have meaningful health status (ConfigMaps, Secrets)
- Take an unpredictable amount of time to become ready
- Are optional and should not block other resources
- Have known issues that you are working around

## Strategy 1: Use healthChecks Instead of wait

The most direct way to control which resources are health-checked is to use the `healthChecks` field instead of `wait: true`. With `healthChecks`, you explicitly list only the resources you want to monitor:

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

This Kustomization may apply ConfigMaps, Secrets, Services, CronJobs, and other resources alongside the two Deployments, but only the Deployments are health-checked. Everything else is applied without waiting for health status.

## Strategy 2: Split Into Separate Kustomizations

Separate critical resources from non-critical ones into different Kustomizations:

```yaml
# Critical resources with health checks
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app-core
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app/core
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
---
# Non-critical resources without health checks
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: my-app-extras
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/my-app/extras
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  # No wait or healthChecks - resources are applied without health checking
```

The `my-app-extras` directory can contain CronJobs, monitoring configurations, debug tools, and other resources that should not block the core application deployment.

## Strategy 3: Selective Health Checks with Mixed Resources

When you cannot easily split resources into separate directories, use `healthChecks` to cherry-pick which resources to monitor:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: platform
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/platform
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 10m
  healthChecks:
    # Only check the critical Deployments
    - apiVersion: apps/v1
      kind: Deployment
      name: ingress-controller
      namespace: ingress-nginx
    - apiVersion: apps/v1
      kind: Deployment
      name: cert-manager
      namespace: cert-manager
    # Skip health checks for:
    # - CronJob: log-rotation (runs periodically, not continuously)
    # - DaemonSet: debug-agent (optional, development only)
    # - Job: metrics-init (one-time setup, may already be complete)
```

## Strategy 4: Dependencies for Optional Resources

Make non-critical resources depend on the critical ones but do not health-check them:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-core
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/core
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: app-monitoring
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/monitoring
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: app-core
  # No health checks - ServiceMonitors and PrometheusRules
  # do not have meaningful health status
```

The monitoring Kustomization deploys after the core application but does not block anything with health checks.

## Common Resources to Exclude from Health Checks

Here are resources you might want to exclude from health checking:

**CronJobs**: They create Jobs on a schedule. The CronJob resource itself is just a template and does not have a persistent running state worth health-checking in most cases.

**ServiceMonitors and PrometheusRules**: These Prometheus Operator resources do not have standard status conditions. Including them in health checks can cause false failures.

**ConfigMaps and Secrets**: These are always healthy once created. Including them in explicit health checks adds no value.

**Optional DaemonSets**: Debug agents or development tools that should not block production deployments.

**Completed Jobs**: One-time initialization Jobs that may have already run on a previous reconciliation.

## Example: Production Application with Selective Health Checks

A real-world application deployment that selectively health-checks only the critical path:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: ecommerce-app
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/ecommerce
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  timeout: 10m
  healthChecks:
    # Critical path - must be healthy
    - apiVersion: apps/v1
      kind: Deployment
      name: web-frontend
      namespace: ecommerce
    - apiVersion: apps/v1
      kind: Deployment
      name: api-server
      namespace: ecommerce
    - apiVersion: apps/v1
      kind: Deployment
      name: payment-service
      namespace: ecommerce
    - apiVersion: apps/v1
      kind: StatefulSet
      name: redis
      namespace: ecommerce
    # Not checked (but still applied):
    # - CronJob: order-cleanup
    # - CronJob: report-generator
    # - Deployment: admin-dashboard (internal tool)
    # - ServiceMonitor: ecommerce-metrics
    # - ConfigMap: feature-flags
```

## Disabling All Health Checks

To apply resources without any health checking, omit both `wait` and `healthChecks`:

```yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: config-only
  namespace: flux-system
spec:
  interval: 10m
  path: ./config
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

This Kustomization applies all resources in the path and immediately reports success without waiting for any health status.

## Verifying Your Configuration

Check which resources are being health-checked:

```bash
# See the full Kustomization spec
kubectl get kustomization my-app -n flux-system -o yaml

# Check reconciliation status
flux get kustomization my-app

# See which resources were applied
kubectl get kustomization my-app -n flux-system -o jsonpath='{.status.inventory.entries}' | jq .
```

## Conclusion

Selectively disabling health checks for specific resources in Flux Kustomization gives you control over what blocks your deployment pipeline. By using explicit `healthChecks` lists instead of blanket `wait: true`, splitting resources into separate Kustomizations, or structuring dependencies between critical and non-critical components, you can ensure that important resources are verified while optional ones do not cause false failures. The key is to health-check the resources that form your application's critical path and let everything else deploy without blocking.
