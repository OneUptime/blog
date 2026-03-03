# How to Deploy ResourceQuotas with ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, ResourceQuota, Multi-Tenancy

Description: Learn how to deploy and manage Kubernetes ResourceQuotas with ArgoCD for namespace-level resource limits, multi-tenant isolation, and capacity management.

---

ResourceQuotas set hard limits on the total amount of compute resources, storage, and object counts that can be consumed within a Kubernetes namespace. They are essential for multi-tenant clusters where teams share infrastructure, and for preventing any single application from consuming all available resources. Managing ResourceQuotas through ArgoCD ensures consistent enforcement across environments.

## Why ResourceQuotas Matter

Without ResourceQuotas, any workload can consume unlimited resources in a namespace. This leads to:

- One team's runaway pod starving other teams of CPU and memory
- Uncontrolled PVC creation filling up cluster storage
- Too many pods overwhelming the API server
- No visibility into resource consumption limits

ResourceQuotas solve this by setting namespace-level ceilings.

## Basic ResourceQuota

Here is a ResourceQuota that limits compute, storage, and object counts:

```yaml
# platform/quotas/production-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    # Compute limits
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.cpu: "40"
    limits.memory: 80Gi

    # Storage limits
    requests.storage: 500Gi
    persistentvolumeclaims: "20"

    # Object count limits
    pods: "100"
    services: "20"
    secrets: "50"
    configmaps: "50"
    replicationcontrollers: "20"
    services.loadbalancers: "5"
    services.nodeports: "10"
```

## ArgoCD Application for ResourceQuotas

Manage quotas as a platform-level concern, separate from application deployments:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: resource-quotas
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/gitops
    targetRevision: main
    path: platform/quotas
  destination:
    server: https://kubernetes.default.svc
  syncPolicy:
    automated:
      prune: true
      selfHeal: true  # Prevent manual quota changes
```

The `selfHeal: true` setting is critical. If someone manually increases a quota to work around limits, ArgoCD reverts it immediately. This enforces that all quota changes go through the Git review process.

## Multi-Tenant Quota Configuration

For multi-tenant clusters, define quotas per team namespace:

```yaml
# platform/quotas/team-frontend.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: team-frontend
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    pods: "50"
    services: "10"
    persistentvolumeclaims: "10"
    requests.storage: 100Gi
---
# platform/quotas/team-backend.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: team-backend
spec:
  hard:
    requests.cpu: "30"
    requests.memory: 60Gi
    limits.cpu: "60"
    limits.memory: 120Gi
    pods: "100"
    services: "20"
    persistentvolumeclaims: "30"
    requests.storage: 500Gi
---
# platform/quotas/team-data.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-quota
  namespace: team-data
spec:
  hard:
    requests.cpu: "50"
    requests.memory: 200Gi
    limits.cpu: "100"
    limits.memory: 400Gi
    pods: "200"
    persistentvolumeclaims: "50"
    requests.storage: 2Ti
```

## Storage Class-Specific Quotas

Limit consumption of specific storage classes:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: storage-quota
  namespace: production
spec:
  hard:
    # General storage
    requests.storage: 500Gi

    # Limit expensive SSD storage
    fast-ssd.storageclass.storage.k8s.io/requests.storage: 100Gi
    fast-ssd.storageclass.storage.k8s.io/persistentvolumeclaims: "5"

    # More generous standard storage
    standard.storageclass.storage.k8s.io/requests.storage: 400Gi
    standard.storageclass.storage.k8s.io/persistentvolumeclaims: "20"
```

## Priority-Based Quotas with Scopes

Kubernetes supports scoped quotas that apply to specific pod priority classes:

```yaml
# Quota for best-effort pods (no resource requests/limits)
apiVersion: v1
kind: ResourceQuota
metadata:
  name: best-effort-quota
  namespace: production
spec:
  hard:
    pods: "10"
  scopeSelector:
    matchExpressions:
      - operator: In
        scopeName: PriorityClass
        values:
          - low-priority
---
# Quota for critical pods
apiVersion: v1
kind: ResourceQuota
metadata:
  name: critical-quota
  namespace: production
spec:
  hard:
    pods: "50"
    requests.cpu: "30"
    requests.memory: 60Gi
  scopeSelector:
    matchExpressions:
      - operator: In
        scopeName: PriorityClass
        values:
          - high-priority
          - system-critical
```

## Sync Waves for Quotas

ResourceQuotas should be created before any workloads in the namespace. Use sync waves:

```yaml
# Wave -5: Namespace
apiVersion: v1
kind: Namespace
metadata:
  name: production
  annotations:
    argocd.argoproj.io/sync-wave: "-5"
---
# Wave -4: ResourceQuota
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "-4"
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
---
# Wave -3: LimitRange (pair with quota)
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "-3"
spec:
  limits:
    - default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      type: Container
---
# Wave 0: Application workloads
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  namespace: production
  annotations:
    argocd.argoproj.io/sync-wave: "0"
```

## Handling Quota Exceeded Errors

When a sync attempts to create resources that would exceed the quota, ArgoCD reports a sync failure. The error looks like:

```text
Error creating: pods "myapp-abc123" is forbidden: exceeded quota: production-quota,
requested: requests.cpu=2, used: requests.cpu=19, limited: requests.cpu=20
```

To handle this:

1. **Increase the quota in Git** (go through review)
2. **Reduce resource requests** in the workload manifests
3. **Scale down other workloads** to free up quota

## Monitoring Quota Usage

Check quota usage to understand how close namespaces are to their limits:

```bash
# View quota status
kubectl get resourcequota -n production

# Detailed view
kubectl describe resourcequota production-quota -n production
```

Output shows:

```text
Name:                   production-quota
Namespace:              production
Resource                Used   Hard
--------                ----   ----
limits.cpu              15     40
limits.memory           32Gi   80Gi
pods                    25     100
requests.cpu            8      20
requests.memory         16Gi   40Gi
requests.storage        200Gi  500Gi
```

You can also expose quota metrics to Prometheus with kube-state-metrics:

```yaml
# kube-state-metrics is typically part of your monitoring stack
# It automatically exports quota metrics:
# - kube_resourcequota{resource,namespace,type="hard"}
# - kube_resourcequota{resource,namespace,type="used"}
```

Create alerts for quotas nearing their limits:

```yaml
# prometheus-alert.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: quota-alerts
spec:
  groups:
    - name: quota.rules
      rules:
        - alert: NamespaceQuotaNearlyFull
          expr: |
            kube_resourcequota{type="used"}
            / kube_resourcequota{type="hard"}
            > 0.85
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Namespace {{ $labels.namespace }} quota for {{ $labels.resource }} is above 85%"
```

## Using Kustomize for Environment Quotas

```yaml
# base/quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: namespace-quota
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    pods: "20"

# overlays/production/quota-patch.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: namespace-quota
spec:
  hard:
    requests.cpu: "40"
    requests.memory: 80Gi
    pods: "200"
```

## ResourceQuota and LimitRange Together

ResourceQuotas require that all pods in the namespace have resource requests and limits defined. If a pod does not specify them, it cannot be created. Pair your quota with a LimitRange to set default requests and limits:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: production
spec:
  limits:
    - default:
        cpu: 500m
        memory: 512Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      max:
        cpu: "4"
        memory: 8Gi
      min:
        cpu: 50m
        memory: 64Mi
      type: Container
```

This ensures every container gets default resource requests, even if the developer forgets to specify them.

## Summary

ResourceQuotas managed through ArgoCD give you GitOps-driven capacity management for multi-tenant Kubernetes clusters. Every quota change goes through code review, ArgoCD's self-heal prevents manual overrides, and sync waves ensure quotas are in place before workloads arrive. Pair ResourceQuotas with LimitRanges to set default resource requests, and use monitoring to alert when quotas are close to being exceeded. For related patterns, see our guide on [deploying LimitRanges with ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-deploy-limitranges/view).
