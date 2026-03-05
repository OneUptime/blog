# How to Configure Tenant Resource Quotas with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Multi-Tenancy, Resource Quotas, Capacity Planning

Description: Learn how to configure and enforce resource quotas for tenants in Flux CD to prevent any single tenant from consuming excessive cluster resources.

---

Resource quotas are essential in multi-tenant Kubernetes clusters to ensure fair resource distribution. Without quotas, a single tenant could consume all available CPU, memory, or storage, starving other tenants. This guide shows how to configure and manage resource quotas for tenants using Flux CD.

## Why Resource Quotas Matter

In a shared cluster, tenants compete for the same pool of compute resources. Resource quotas set hard limits on what each tenant can consume, including CPU, memory, storage, and object counts. Flux CD manages these quotas declaratively through GitOps, ensuring they are consistent and auditable.

## Step 1: Create a Basic Resource Quota

Define a ResourceQuota that limits compute and object count resources for a tenant.

```yaml
# tenants/team-alpha/resource-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-alpha-compute
  namespace: team-alpha
spec:
  hard:
    # CPU limits
    requests.cpu: "4"
    limits.cpu: "8"
    # Memory limits
    requests.memory: 8Gi
    limits.memory: 16Gi
    # Object count limits
    pods: "50"
    services: "15"
    configmaps: "30"
    secrets: "30"
    persistentvolumeclaims: "10"
    replicationcontrollers: "20"
```

## Step 2: Add a Limit Range

A LimitRange ensures that every container in the tenant namespace has resource requests and limits set, even if the tenant does not specify them in their manifests.

```yaml
# tenants/team-alpha/limit-range.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: team-alpha-limits
  namespace: team-alpha
spec:
  limits:
    - type: Container
      default:
        cpu: 250m
        memory: 256Mi
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      max:
        cpu: "2"
        memory: 4Gi
      min:
        cpu: 50m
        memory: 64Mi
    - type: Pod
      max:
        cpu: "4"
        memory: 8Gi
```

## Step 3: Create Storage Quotas

Limit the amount of persistent storage a tenant can claim.

```yaml
# tenants/team-alpha/storage-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-alpha-storage
  namespace: team-alpha
spec:
  hard:
    # Total storage across all PVCs
    requests.storage: 100Gi
    # Limit to specific storage classes
    standard.storageclass.storage.k8s.io/requests.storage: 50Gi
    ssd.storageclass.storage.k8s.io/requests.storage: 50Gi
    # Limit PVC count per storage class
    standard.storageclass.storage.k8s.io/persistentvolumeclaims: "5"
    ssd.storageclass.storage.k8s.io/persistentvolumeclaims: "5"
```

## Step 4: Define Tiered Quota Templates

Create quota templates for different tenant tiers so you can assign quotas based on the tenant's service level.

```yaml
# tenants/base/quotas/small.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-quota
spec:
  hard:
    requests.cpu: "2"
    limits.cpu: "4"
    requests.memory: 4Gi
    limits.memory: 8Gi
    pods: "20"
    services: "5"
---
# tenants/base/quotas/medium.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-quota
spec:
  hard:
    requests.cpu: "8"
    limits.cpu: "16"
    requests.memory: 16Gi
    limits.memory: 32Gi
    pods: "50"
    services: "15"
---
# tenants/base/quotas/large.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: tenant-quota
spec:
  hard:
    requests.cpu: "16"
    limits.cpu: "32"
    requests.memory: 32Gi
    limits.memory: 64Gi
    pods: "100"
    services: "30"
```

Use Kustomize overlays to assign a tier to each tenant.

```yaml
# tenants/production/team-alpha/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: team-alpha
resources:
  - ../../base/tenant-template
  # Use the medium quota tier
  - ../../base/quotas/medium.yaml
```

## Step 5: Add Quota Scopes

Use quota scopes to apply different limits based on pod priority or termination behavior.

```yaml
# tenants/team-alpha/scoped-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-alpha-besteffort
  namespace: team-alpha
spec:
  hard:
    pods: "5"
  # Only apply to BestEffort pods (no resource requests/limits)
  scopes:
    - BestEffort
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-alpha-not-besteffort
  namespace: team-alpha
spec:
  hard:
    pods: "45"
    requests.cpu: "4"
    limits.cpu: "8"
    requests.memory: 8Gi
    limits.memory: 16Gi
  scopes:
    - NotBestEffort
```

## Step 6: Include Quotas in the Tenant Kustomization

Assemble all quota resources into the tenant's kustomization file.

```yaml
# tenants/team-alpha/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - service-account.yaml
  - rbac.yaml
  - resource-quota.yaml
  - limit-range.yaml
  - storage-quota.yaml
  - git-repo.yaml
  - sync.yaml
```

## Step 7: Monitor Quota Usage

After deploying quotas, monitor how much each tenant is consuming.

```bash
# Check quota usage for a specific tenant
kubectl describe resourcequota -n team-alpha

# Get quota usage in a parseable format
kubectl get resourcequota -n team-alpha -o yaml

# Check across all tenant namespaces
kubectl get resourcequota --all-namespaces \
  -l toolkit.fluxcd.io/tenant
```

Example output showing current usage versus limits:

```bash
# Sample output from kubectl describe resourcequota
# Name:            team-alpha-compute
# Namespace:       team-alpha
# Resource         Used   Hard
# --------         ----   ----
# limits.cpu       2      8
# limits.memory    4Gi    16Gi
# pods             12     50
# requests.cpu     1      4
# requests.memory  2Gi    8Gi
```

## Step 8: Handle Quota Violations

When a tenant exceeds their quota, new pods will fail to schedule. Flux will report reconciliation errors for resources that cannot be created due to quota limits.

```bash
# Check for quota-related events in the tenant namespace
kubectl get events -n team-alpha --field-selector reason=FailedCreate

# Check Flux Kustomization status for errors
flux get kustomizations -n team-alpha
```

Set up alerts so the platform admin is notified when tenants approach their quota limits.

```yaml
# tenants/team-alpha/quota-alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1beta3
kind: Alert
metadata:
  name: team-alpha-quota-alert
  namespace: team-alpha
spec:
  providerRef:
    name: platform-slack
  eventSeverity: error
  eventSources:
    - kind: Kustomization
      name: team-alpha-apps
```

## Summary

Resource quotas in Flux CD are managed declaratively alongside other tenant resources. By defining ResourceQuotas and LimitRanges in the tenant configuration, platform administrators can ensure fair resource distribution across tenants. Tiered quota templates simplify management when you have many tenants with different needs. Always pair quotas with LimitRanges to ensure containers have default resource requests, and monitor quota usage to proactively address capacity issues.
