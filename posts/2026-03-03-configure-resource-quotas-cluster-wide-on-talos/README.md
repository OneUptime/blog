# How to Configure Resource Quotas Cluster-Wide on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Resource Quotas, Kubernetes, Cluster Management, Capacity Planning

Description: A practical guide to implementing and managing Kubernetes resource quotas across all namespaces on a Talos Linux cluster.

---

Resource quotas are a fundamental Kubernetes feature that limits the amount of compute resources and the number of objects that can exist in a namespace. Without quotas, a single team or application can consume all available cluster resources, starving other workloads. On Talos Linux clusters, where the operating system is minimal and every resource counts, proper quota management is essential for maintaining stability and fair allocation.

This guide covers how to set up resource quotas across your entire Talos Linux cluster, automate quota assignment for new namespaces, and monitor usage over time.

## Understanding Resource Quotas

Kubernetes resource quotas work at the namespace level. They can limit:

- **Compute resources**: CPU and memory requests and limits
- **Storage resources**: PersistentVolumeClaim size and count
- **Object counts**: Number of pods, services, configmaps, secrets, etc.

When a quota is in place, any request that would exceed the quota is rejected by the API server.

## Creating Basic Resource Quotas

Start with a simple quota for a team namespace.

```yaml
# team-alpha-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: compute-quota
  namespace: team-alpha
spec:
  hard:
    # Compute resource limits
    requests.cpu: "4"
    requests.memory: "8Gi"
    limits.cpu: "8"
    limits.memory: "16Gi"

    # Object count limits
    pods: "20"
    services: "10"
    secrets: "30"
    configmaps: "20"
    persistentvolumeclaims: "10"
    replicationcontrollers: "5"

    # Storage limits
    requests.storage: "50Gi"
```

```bash
# Create the namespace and apply the quota
kubectl create namespace team-alpha
kubectl apply -f team-alpha-quota.yaml

# Check the quota status
kubectl get resourcequota -n team-alpha
kubectl describe resourcequota compute-quota -n team-alpha
```

## Requiring Resource Requests with LimitRanges

Resource quotas only work when pods specify resource requests and limits. Use LimitRange to set defaults and enforce minimums and maximums per container.

```yaml
# limit-range.yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: team-alpha
spec:
  limits:
    - type: Container
      # Default values applied when not specified
      default:
        cpu: "200m"
        memory: "256Mi"
      # Default requests applied when not specified
      defaultRequest:
        cpu: "100m"
        memory: "128Mi"
      # Maximum allowed per container
      max:
        cpu: "2"
        memory: "4Gi"
      # Minimum allowed per container
      min:
        cpu: "50m"
        memory: "64Mi"
    - type: Pod
      # Maximum total resources per pod
      max:
        cpu: "4"
        memory: "8Gi"
    - type: PersistentVolumeClaim
      max:
        storage: "20Gi"
      min:
        storage: "1Gi"
```

```bash
kubectl apply -f limit-range.yaml

# Test - create a pod without resource specs
kubectl run test-defaults --image=nginx -n team-alpha

# The LimitRange will inject default resource requests and limits
kubectl get pod test-defaults -n team-alpha -o yaml | grep -A 10 resources
```

## Defining Quota Tiers

Most organizations have different teams with different resource needs. Define standard quota tiers that can be applied consistently.

```yaml
# small-tier-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: small-tier
spec:
  hard:
    requests.cpu: "2"
    requests.memory: "4Gi"
    limits.cpu: "4"
    limits.memory: "8Gi"
    pods: "10"
    services: "5"
    persistentvolumeclaims: "5"
    requests.storage: "20Gi"
---
# medium-tier-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: medium-tier
spec:
  hard:
    requests.cpu: "8"
    requests.memory: "16Gi"
    limits.cpu: "16"
    limits.memory: "32Gi"
    pods: "50"
    services: "20"
    persistentvolumeclaims: "20"
    requests.storage: "100Gi"
---
# large-tier-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: large-tier
spec:
  hard:
    requests.cpu: "32"
    requests.memory: "64Gi"
    limits.cpu: "64"
    limits.memory: "128Gi"
    pods: "200"
    services: "50"
    persistentvolumeclaims: "50"
    requests.storage: "500Gi"
```

Apply a tier to a namespace.

```bash
# Apply the medium tier to team-alpha
kubectl apply -f medium-tier-quota.yaml -n team-alpha
```

## Automating Quota Assignment

Use Kyverno to automatically apply quotas to new namespaces based on labels.

```yaml
# auto-quota-policy.yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: auto-assign-quota
spec:
  background: false
  rules:
    - name: assign-small-quota
      match:
        any:
          - resources:
              kinds:
                - Namespace
              selector:
                matchLabels:
                  quota-tier: "small"
      generate:
        apiVersion: v1
        kind: ResourceQuota
        name: auto-quota
        namespace: "{{request.object.metadata.name}}"
        data:
          spec:
            hard:
              requests.cpu: "2"
              requests.memory: "4Gi"
              limits.cpu: "4"
              limits.memory: "8Gi"
              pods: "10"
    - name: assign-medium-quota
      match:
        any:
          - resources:
              kinds:
                - Namespace
              selector:
                matchLabels:
                  quota-tier: "medium"
      generate:
        apiVersion: v1
        kind: ResourceQuota
        name: auto-quota
        namespace: "{{request.object.metadata.name}}"
        data:
          spec:
            hard:
              requests.cpu: "8"
              requests.memory: "16Gi"
              limits.cpu: "16"
              limits.memory: "32Gi"
              pods: "50"
    - name: assign-limit-range
      match:
        any:
          - resources:
              kinds:
                - Namespace
      exclude:
        any:
          - resources:
              names:
                - kube-system
                - kube-public
                - default
      generate:
        apiVersion: v1
        kind: LimitRange
        name: default-limits
        namespace: "{{request.object.metadata.name}}"
        data:
          spec:
            limits:
              - type: Container
                default:
                  cpu: "200m"
                  memory: "256Mi"
                defaultRequest:
                  cpu: "100m"
                  memory: "128Mi"
```

```bash
kubectl apply -f auto-quota-policy.yaml

# Test by creating a labeled namespace
kubectl create namespace new-team --dry-run=client -o yaml | \
  kubectl label --local -f - quota-tier=medium --dry-run=client -o yaml | \
  kubectl apply -f -

# Verify the quota was auto-created
kubectl get resourcequota -n new-team
kubectl get limitrange -n new-team
```

## Scoped Quotas with Priority Classes

You can create quotas that only apply to pods with specific priority classes. This is useful for separating production and development workloads.

```yaml
# priority-classes.yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: production
value: 1000
globalDefault: false
description: "Production workloads"
---
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: development
value: 100
globalDefault: false
description: "Development workloads"
```

```yaml
# scoped-quota.yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: production-quota
  namespace: shared-namespace
spec:
  hard:
    requests.cpu: "16"
    requests.memory: "32Gi"
    pods: "50"
  scopeSelector:
    matchExpressions:
      - scopeName: PriorityClass
        operator: In
        values:
          - production
---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: development-quota
  namespace: shared-namespace
spec:
  hard:
    requests.cpu: "4"
    requests.memory: "8Gi"
    pods: "20"
  scopeSelector:
    matchExpressions:
      - scopeName: PriorityClass
        operator: In
        values:
          - development
```

## Monitoring Quota Usage

Set up a monitoring script that tracks quota utilization across all namespaces.

```bash
# Check quota usage across all namespaces
kubectl get resourcequota --all-namespaces -o custom-columns=\
NAMESPACE:.metadata.namespace,\
NAME:.metadata.name,\
CPU_REQ_USED:.status.used.requests\\.cpu,\
CPU_REQ_HARD:.status.hard.requests\\.cpu,\
MEM_REQ_USED:.status.used.requests\\.memory,\
MEM_REQ_HARD:.status.hard.requests\\.memory,\
PODS_USED:.status.used.pods,\
PODS_HARD:.status.hard.pods
```

Create a Prometheus-based alert for high quota usage.

```yaml
# quota-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: quota-alerts
  namespace: monitoring
spec:
  groups:
    - name: resource-quotas
      rules:
        - alert: HighQuotaUsage
          expr: |
            kube_resourcequota{type="used"} / kube_resourcequota{type="hard"} > 0.9
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Resource quota usage above 90%"
            description: "Namespace {{ $labels.namespace }} quota {{ $labels.resourcequota }} for {{ $labels.resource }} is at {{ $value | humanizePercentage }}"
        - alert: QuotaExhausted
          expr: |
            kube_resourcequota{type="used"} / kube_resourcequota{type="hard"} >= 1.0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Resource quota exhausted"
            description: "Namespace {{ $labels.namespace }} has exhausted quota for {{ $labels.resource }}"
```

## Talos Linux Resource Planning

When planning quotas for a Talos Linux cluster, account for the OS overhead. Talos is lightweight compared to traditional distributions, but it still uses some resources.

```bash
# Check actual allocatable resources on Talos nodes
kubectl get nodes -o custom-columns=\
NAME:.metadata.name,\
CPU_ALLOC:.status.allocatable.cpu,\
MEM_ALLOC:.status.allocatable.memory,\
PODS:.status.allocatable.pods

# Total cluster resources
kubectl top nodes
```

A good rule of thumb is to quota 80% of the total allocatable resources, leaving 20% as headroom for system components and burst capacity.

## Wrapping Up

Resource quotas on Talos Linux provide essential guardrails that prevent resource starvation and enforce fair usage across teams and applications. Combined with LimitRanges for default values and Kyverno for automated assignment, you can build a self-service platform where teams get predictable resources without manual intervention. Monitor quota utilization through Prometheus alerts to catch exhaustion before it impacts workloads, and review quotas regularly as your cluster and teams grow. The minimal overhead of Talos Linux means more resources are available for your workloads, making proper quota planning even more impactful.
