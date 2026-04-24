# How to Set Resource Quotas on Namespaces in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Kubernetes, Namespace, Resource Quota, DevOps

Description: Learn how to set and manage resource quotas on Kubernetes namespaces in Portainer to control cluster resource consumption.

## Introduction

ResourceQuotas constrain the total resource consumption within a namespace. Without quotas, a single namespace can consume all cluster resources, starving other namespaces. Portainer allows setting CPU and memory quotas through its namespace management interface, with separate controls for load balancers and storage quotas. This guide covers configuring namespace-level resource quotas.

## Prerequisites

- Portainer BE with Kubernetes environment
- Admin access to the cluster

## What Resource Quotas Control

Resource quotas can limit:

- **Compute resources**: CPU and memory requests/limits
- **Object counts**: Pods, services, PVCs, secrets, etc.
- **Storage**: Total storage requests across PVCs

## Step 1: Set Resource Quota in Portainer

1. Select your Kubernetes environment in Portainer
2. Navigate to **Namespaces**
3. Click on a namespace
4. Find the **Resource quota** section
5. Configure limits:

```text
Resource quotas for namespace: production
──────────────────────────────────────────
CPU requests:       4 (cores)      - Total CPU requests across all pods
CPU limits:         8 (cores)      - Total CPU limits
Memory requests:    8Gi            - Total memory requests
Memory limits:      16Gi           - Total memory limits
```

Load balancer and storage quotas are managed in separate sections on the namespace page when those options are available.

## Step 2: Apply ResourceQuota via YAML

In Portainer's YAML editor:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: production
spec:
  hard:
    # Compute resources
    requests.cpu: "8"              # 8 CPU cores total requests
    requests.memory: 16Gi          # 16 GiB total memory requests
    limits.cpu: "16"               # 16 CPU cores total limits
    limits.memory: 32Gi            # 32 GiB total memory limits

    # Pod counts
    pods: "100"                    # Max 100 pods
    replicationcontrollers: "20"

    # Service counts
    services: "30"
    services.loadbalancers: "5"    # Limit expensive LB services
    services.nodeports: "10"

    # Storage
    persistentvolumeclaims: "30"
    requests.storage: "500Gi"      # Total storage across all PVCs
    standard.storageclass.storage.k8s.io/requests.storage: "200Gi"  # Per storage class

    # Other objects
    secrets: "100"
    configmaps: "100"
    resourcequotas: "5"

    # Additional object count quotas
    count/deployments.apps: "30"
    count/statefulsets.apps: "10"
    count/jobs.batch: "20"
    count/cronjobs.batch: "10"
```

## Step 3: Create Environment-Specific Quotas

Different environments get different quota sizes:

```yaml
# Production: large quotas

---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: quota
  namespace: production
spec:
  hard:
    requests.cpu: "20"
    requests.memory: 40Gi
    limits.cpu: "40"
    limits.memory: 80Gi
    pods: "200"

# Staging: medium quotas
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: quota
  namespace: staging
spec:
  hard:
    requests.cpu: "8"
    requests.memory: 16Gi
    limits.cpu: "16"
    limits.memory: 32Gi
    pods: "50"

# Development: small quotas
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: quota
  namespace: development
spec:
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "8"
    limits.memory: 16Gi
    pods: "20"
```

## Step 4: View Quota Usage

```bash
# Check quota usage in a namespace
kubectl describe resourcequota production-quota -n production

# Output:
# Name:            production-quota
# Namespace:       production
# Resource         Used     Hard
# ────────         ─────    ────
# limits.cpu       3200m    16
# limits.memory    6Gi      32Gi
# pods             12       100
# requests.cpu     1600m    8
# requests.memory  3Gi      16Gi

# Check all quotas across all namespaces
kubectl get resourcequota --all-namespaces
```

In Portainer: the namespace detail view shows quota usage.

## Step 5: Handle Quota Exceeded Errors

When pod creation fails during a rollout due to quota:

```text
Error from server (Forbidden): pods "my-app-xxx" is forbidden:
exceeded quota: production-quota, requested: requests.memory=512Mi,
used: requests.memory=15.5Gi, limited: requests.memory=16Gi
```

**Resolution options:**

1. **Increase quota** - Edit the ResourceQuota
2. **Reduce pod resources** - Lower requests on existing deployments
3. **Remove unused resources** - Delete old/unnecessary deployments

```bash
# Find top memory consumers
kubectl top pods -n production --sort-by=memory

# Reduce request for a deployment
kubectl set resources deployment/my-app \
  --requests=memory=256Mi \
  -n production
```

## Step 6: Quota Scopes

Apply quotas only to pods matching specific criteria:

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: best-effort-quota
  namespace: development
spec:
  hard:
    pods: "10"    # Limit BestEffort pods (no resources set)
  scopes:
    - BestEffort  # Only applies to BestEffort pods

---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: non-terminating-quota
  namespace: production
spec:
  hard:
    requests.cpu: "10"
    requests.memory: 20Gi
  scopes:
    - NotTerminating    # Only applies to pods without activeDeadlineSeconds set
```

## Step 7: Automate Quota Alerts

Set up alerts when quotas are near exhaustion:

```yaml
# PrometheusRule for quota alerts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: quota-alerts
  namespace: monitoring
spec:
  groups:
    - name: quota
      rules:
        - alert: NamespaceQuotaAlmostFull
          expr: |
            kube_resourcequota{type="used"} / ignoring(type) kube_resourcequota{type="hard"} > 0.85
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Namespace quota above 85%"
            description: "{{ $labels.namespace }}/{{ $labels.resource }} is at {{ $value | humanizePercentage }}"
```

## Conclusion

Resource quotas are essential for multi-team Kubernetes clusters. They prevent any single team or namespace from consuming disproportionate cluster resources. Configure quotas through Portainer's namespace management interface or directly via YAML manifests. Monitor quota usage regularly and receive alerts before quotas are exhausted to ensure smooth operations across all namespaces.
