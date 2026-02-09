# How to Use LimitRange to Enforce Default Resource Requests Per Namespace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, LimitRange, Resource Management

Description: Configure LimitRange to automatically set default resource requests and limits, enforce minimum and maximum values, and prevent resource exhaustion in Kubernetes namespaces.

---

Developers forget to set resource requests. Pods with no requests can starve other workloads and cause scheduling chaos. LimitRange solves this by automatically injecting defaults and enforcing boundaries. This guide shows you how to use LimitRange effectively.

## What Is LimitRange?

LimitRange is a namespace-scoped policy that controls resource allocation for pods and containers. It can:

- Set default requests and limits
- Enforce minimum and maximum values
- Set default request-to-limit ratios
- Apply to pods, containers, and PVCs

LimitRange acts as an admission controller, modifying and rejecting resources at creation time.

## Creating a Basic LimitRange

Create a LimitRange that sets defaults for containers:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: default-limits
  namespace: development
spec:
  limits:
  - default:
      cpu: "500m"
      memory: "512Mi"
    defaultRequest:
      cpu: "100m"
      memory: "128Mi"
    type: Container
```

Apply it:

```bash
kubectl apply -f limitrange.yaml
```

Now any container created without requests/limits gets these defaults.

## Testing Default Injection

Create a pod without resource specifications:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: no-resources
  namespace: development
spec:
  containers:
  - name: app
    image: nginx
```

Check the pod's effective resources:

```bash
kubectl get pod no-resources -n development -o yaml | grep -A 10 resources
```

You'll see the defaults injected:

```yaml
resources:
  limits:
    cpu: 500m
    memory: 512Mi
  requests:
    cpu: 100m
    memory: 128Mi
```

## Enforcing Minimum and Maximum Values

Set boundaries to prevent tiny or huge containers:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: resource-constraints
  namespace: production
spec:
  limits:
  - max:
      cpu: "4"
      memory: "8Gi"
    min:
      cpu: "50m"
      memory: "64Mi"
    type: Container
```

Containers requesting less than 50m CPU or more than 4 CPU are rejected:

```bash
kubectl apply -f pod-with-10-cpu.yaml
# Error: containers "app" is invalid: spec.containers[0].resources.requests: Invalid value: "10": must be less than or equal to cpu limit
```

## Combining Defaults with Min/Max

Use all constraints together:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: complete-limits
  namespace: staging
spec:
  limits:
  - default:
      cpu: "1"
      memory: "1Gi"
    defaultRequest:
      cpu: "200m"
      memory: "256Mi"
    max:
      cpu: "4"
      memory: "8Gi"
    min:
      cpu: "50m"
      memory: "64Mi"
    type: Container
```

This sets defaults for containers without resources and enforces boundaries for all containers.

## LimitRange for Pods

Apply limits to entire pods:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: pod-limits
  namespace: team-a
spec:
  limits:
  - max:
      cpu: "8"
      memory: "16Gi"
    type: Pod
```

This prevents pods with total requests exceeding 8 CPU or 16Gi memory. Useful for preventing resource hogs.

## Request-to-Limit Ratio

Enforce a maximum ratio between requests and limits:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: ratio-limits
  namespace: development
spec:
  limits:
  - maxLimitRequestRatio:
      cpu: "4"
      memory: "2"
    type: Container
```

This means:

- CPU limit can be at most 4x the request
- Memory limit can be at most 2x the request

A container requesting 500m CPU can have at most 2 CPU limit (4x ratio). Prevents extreme overcommitment.

## LimitRange for PersistentVolumeClaims

Limit PVC sizes:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: pvc-limits
  namespace: storage-test
spec:
  limits:
  - max:
      storage: "100Gi"
    min:
      storage: "1Gi"
    type: PersistentVolumeClaim
```

PVCs requesting less than 1Gi or more than 100Gi are rejected.

## Multiple LimitRanges

You can have multiple LimitRange objects in a namespace. They all apply:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: cpu-limits
  namespace: production
spec:
  limits:
  - max:
      cpu: "4"
    min:
      cpu: "100m"
    type: Container
---
apiVersion: v1
kind: LimitRange
metadata:
  name: memory-limits
  namespace: production
spec:
  limits:
  - max:
      memory: "8Gi"
    min:
      memory: "128Mi"
    type: Container
```

Both constraints apply. Useful for separating concerns.

## Viewing LimitRange

List LimitRanges:

```bash
kubectl get limitrange -n production
```

Describe for details:

```bash
kubectl describe limitrange complete-limits -n staging
```

Output shows all constraints and defaults.

## LimitRange vs ResourceQuota

LimitRange and ResourceQuota serve different purposes:

- **LimitRange**: Per-container/pod limits, sets defaults
- **ResourceQuota**: Namespace-wide totals

Use both together:

```yaml
# LimitRange: Ensure containers have resources set
apiVersion: v1
kind: LimitRange
metadata:
  name: defaults
  namespace: team-a
spec:
  limits:
  - defaultRequest:
      cpu: "100m"
      memory: "128Mi"
    type: Container
---
# ResourceQuota: Cap total namespace usage
apiVersion: v1
kind: ResourceQuota
metadata:
  name: total-quota
  namespace: team-a
spec:
  hard:
    requests.cpu: "20"
    requests.memory: "40Gi"
```

LimitRange prevents unbounded containers, ResourceQuota prevents unbounded namespace growth.

## Best Practices Per Environment

### Development Environment

Relaxed limits, generous defaults:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: dev-limits
  namespace: dev
spec:
  limits:
  - default:
      cpu: "1"
      memory: "1Gi"
    defaultRequest:
      cpu: "100m"
      memory: "128Mi"
    max:
      cpu: "8"
      memory: "16Gi"
    type: Container
```

### Production Environment

Strict limits, conservative defaults:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
  name: prod-limits
  namespace: prod
spec:
  limits:
  - default:
      cpu: "500m"
      memory: "512Mi"
    defaultRequest:
      cpu: "200m"
      memory: "256Mi"
    max:
      cpu: "4"
      memory: "8Gi"
    min:
      cpu: "50m"
      memory: "64Mi"
    maxLimitRequestRatio:
      cpu: "2"
      memory: "2"
    type: Container
```

Production enforces minimums and ratio constraints.

## Common Pitfalls

**Defaults Too Large**: Setting large defaults wastes resources. Most containers need less than 1 CPU and 1Gi.

**Minimums Too High**: Setting min CPU at 500m prevents lightweight sidecars from running.

**Max Values Too Low**: Users can't run resource-intensive workloads. Set reasonable maximums based on node capacity.

**No Pod-Level Limits**: Users can work around container limits by creating multi-container pods. Set pod limits too.

## Monitoring LimitRange Impact

Check if defaults are being applied:

```bash
# Find pods with no explicit resource requests
kubectl get pods -n production -o json | \
  jq '.items[] | select(.spec.containers[0].resources.requests == null) | .metadata.name'
```

If this returns nothing, all pods have requests (either explicit or from LimitRange).

Track rejected admissions in events:

```bash
kubectl get events -n production | grep LimitRange
```

## Real-World Example: Multi-Tenant Cluster

In a cluster shared by multiple teams, use LimitRange per namespace:

```yaml
# Team A: Web applications
apiVersion: v1
kind: LimitRange
metadata:
  name: web-limits
  namespace: team-a
spec:
  limits:
  - default:
      cpu: "500m"
      memory: "512Mi"
    defaultRequest:
      cpu: "100m"
      memory: "128Mi"
    max:
      cpu: "2"
      memory: "4Gi"
    type: Container
---
# Team B: Data processing
apiVersion: v1
kind: LimitRange
metadata:
  name: batch-limits
  namespace: team-b
spec:
  limits:
  - default:
      cpu: "2"
      memory: "4Gi"
    defaultRequest:
      cpu: "1"
      memory: "2Gi"
    max:
      cpu: "16"
      memory: "64Gi"
    type: Container
```

Team A gets smaller defaults for web apps, Team B gets larger defaults for batch jobs.

## Automating LimitRange Deployment

Use a GitOps tool to deploy LimitRange to all namespaces:

```yaml
# Kustomization for all team namespaces
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- limitrange-defaults.yaml
namespace: team-a
---
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
- limitrange-defaults.yaml
namespace: team-b
```

## Modifying Existing LimitRange

Update LimitRange by editing and reapplying:

```bash
kubectl edit limitrange complete-limits -n staging
```

Changes apply to new pods immediately. Existing pods are unaffected until recreated.

## Removing LimitRange

Delete a LimitRange:

```bash
kubectl delete limitrange complete-limits -n staging
```

Existing pods keep their resources. New pods without explicit resources will have no limits.

## Conclusion

LimitRange is essential for multi-tenant clusters and preventing resource exhaustion. Set sensible defaults so developers don't need to think about resources for simple workloads. Enforce minimums and maximums to prevent tiny and huge containers. Combine with ResourceQuota for comprehensive resource governance. Start with relaxed limits and tighten based on actual usage patterns. LimitRange makes resource management automatic and consistent across your cluster.
