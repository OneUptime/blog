# Resource Quota Enforcement with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux-cd, kubernetes, resource-quota, gitops, governance, namespaces

Description: Learn how to manage and enforce Kubernetes ResourceQuotas and LimitRanges across namespaces using Flux CD, ensuring teams stay within resource budgets and preventing runaway workloads from impacting shared clusters. This guide covers GitOps-managed quota configurations and monitoring strategies.

---

## Introduction

In multi-tenant Kubernetes clusters, resource quotas are the primary mechanism for ensuring fair resource distribution across teams and applications. Without enforced quotas, a single misbehaving workload can exhaust cluster CPU or memory, impacting unrelated namespaces. LimitRanges complement quotas by setting default resource requests and limits on containers that don't specify them.

Managing quotas and limits through Flux CD ensures that resource policies are version-controlled, reviewed, and applied consistently across all environments. Teams can see their quota allocations in Git, request increases through pull requests, and have changes reviewed by platform engineers before being applied.

This guide covers creating ResourceQuotas and LimitRanges managed by Flux, organizing them for multi-team clusters, and monitoring utilization against quotas.

## Prerequisites

- Flux CD v2.x bootstrapped
- A multi-tenant cluster with team namespaces
- `kubectl` and `flux` CLIs installed
- Prometheus + Grafana for quota monitoring (optional but recommended)

## Step 1: Define Namespace ResourceQuotas

Create ResourceQuota definitions for each team namespace.
```yaml
# teams/team-alpha/quota.yaml
# ResourceQuota setting hard limits on compute and object counts for team-alpha
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-alpha-quota
  namespace: team-alpha
spec:
  hard:
    # Compute resource limits
    requests.cpu: "10"
    requests.memory: 20Gi
    limits.cpu: "20"
    limits.memory: 40Gi
    # Object count limits to prevent namespace flooding
    pods: "50"
    services: "20"
    persistentvolumeclaims: "20"
    secrets: "50"
    configmaps: "50"
```

## Step 2: Define LimitRanges for Default Container Limits

Apply LimitRanges to set defaults for containers that don't specify resource constraints.
```yaml
# teams/team-alpha/limitrange.yaml
# LimitRange providing default requests and limits for containers in team-alpha
apiVersion: v1
kind: LimitRange
metadata:
  name: team-alpha-limits
  namespace: team-alpha
spec:
  limits:
    - type: Container
      # Default request if not specified by the container
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      # Default limit if not specified by the container
      default:
        cpu: 500m
        memory: 512Mi
      # Hard minimum and maximum for any container
      min:
        cpu: 50m
        memory: 64Mi
      max:
        cpu: "4"
        memory: 8Gi
    - type: PersistentVolumeClaim
      max:
        storage: 50Gi
```

## Step 3: Manage Quotas via Flux Kustomization

Create a Flux Kustomization that applies quota and limitrange resources.
```yaml
# clusters/production/quotas/kustomization.yaml
# Flux Kustomization managing all team resource quotas
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: resource-quotas
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./teams
  prune: true
  # Apply quotas after namespaces are created
  dependsOn:
    - name: namespaces
```

## Step 4: Monitor Quota Utilization

Set up monitoring to track resource consumption against quotas.
```bash
# Check current quota usage for all namespaces
kubectl get resourcequota --all-namespaces

# Describe a specific namespace's quota usage
kubectl describe resourcequota team-alpha-quota -n team-alpha

# View LimitRange defaults in effect
kubectl describe limitrange team-alpha-limits -n team-alpha
```

Set up a Flux notification alert when quota-related events occur:
```yaml
# monitoring/quota-alert.yaml
# Flux alert notifying when quota enforcement causes pod failures
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: quota-violation-alert
  namespace: flux-system
spec:
  providerRef:
    name: slack-platform
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: resource-quotas
```

## Best Practices

- Review quota utilization monthly and adjust allocations through Git PRs
- Set CPU and memory quotas at a 2:1 limit-to-request ratio to allow bursting
- Use `LimitRange` to ensure all pods have resource requests set, which is required for scheduler decisions
- Apply quotas to all namespaces, including `kube-system`, using careful minimum values
- Notify team owners via Slack or email when their namespace approaches 80% quota utilization
- Store quota definitions alongside namespace definitions so they are provisioned together

## Conclusion

Flux CD-managed ResourceQuotas and LimitRanges create a self-service governance model for multi-tenant clusters. Teams can see their resource budgets in Git, request changes through pull requests, and trust that policy is consistently applied across all environments. Combined with Prometheus monitoring, this approach gives platform engineers real-time visibility into quota utilization and early warning before teams hit hard limits.
