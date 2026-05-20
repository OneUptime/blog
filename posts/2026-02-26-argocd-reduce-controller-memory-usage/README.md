# How to Reduce ArgoCD Controller Memory Usage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Performance, Memory Optimization

Description: Learn practical techniques to reduce ArgoCD application controller memory consumption including sharding, resource exclusions, cache tuning, and garbage collection optimization.

---

The ArgoCD application controller is the most memory-hungry component in the ArgoCD stack. It keeps the state of all applications, their resources, and their manifests in memory. As your application count grows, so does memory consumption - often reaching several gigabytes. When the controller exceeds its memory limit, it gets OOMKilled, causing all applications to temporarily lose reconciliation. This guide covers practical techniques to reduce controller memory usage and prevent OOM situations.

## Understanding Controller Memory Usage

The controller's memory is consumed by several data structures:

```mermaid
pie title Controller Memory Breakdown (Typical)
    "Live Resource Cache" : 40
    "Desired Manifest Cache" : 25
    "Application State" : 15
    "Diff Cache" : 10
    "Go Runtime/GC" : 10
```

Key factors that increase memory:

- **Number of applications** - Each application adds state overhead
- **Resources per application** - Applications with hundreds of resources consume more
- **Resource size** - Large ConfigMaps, Secrets, and CRDs take more memory
- **Cluster count** - Each cluster adds its own resource cache

## Technique 1: Enable Controller Sharding

Sharding splits managed clusters across multiple controller replicas, distributing memory load when one ArgoCD instance manages multiple clusters:

```yaml
# Patch the existing StatefulSet for StatefulSet-based sharding

apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: argocd-application-controller
  namespace: argocd
spec:
  replicas: 3  # Three shards
  template:
    spec:
      containers:
        - name: argocd-application-controller
          env:
            - name: ARGOCD_CONTROLLER_REPLICAS
              value: "3"
          resources:
            requests:
              memory: "2Gi"
            limits:
              memory: "4Gi"
```

With 3 shards, each controller manages roughly one-third of the clusters. This can substantially reduce per-instance memory when applications are spread across many managed clusters, but it will not split applications within a single cluster across controller replicas.

For dynamic cluster distribution sharding:

```yaml
# argocd-cmd-params-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  controller.sharding.algorithm: "round-robin"
```

The `round-robin` and `consistent-hashing` sharding algorithms, and dynamic cluster distribution, are alpha features in current ArgoCD releases.

## Technique 2: Exclude Unnecessary Resources

ArgoCD tracks all resources in namespaces where it manages applications. Many of these resources are not relevant to your applications:

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.exclusions: |
    # Events are high-volume and not useful for GitOps tracking
    - apiGroups:
        - ""
      kinds:
        - Event
      clusters:
        - "*"
    - apiGroups:
        - "events.k8s.io"
      kinds:
        - Event
      clusters:
        - "*"
    # Endpoints are managed by Kubernetes, not GitOps
    - apiGroups:
        - ""
      kinds:
        - Endpoints
      clusters:
        - "*"
    # EndpointSlices (Kubernetes 1.21+)
    - apiGroups:
        - "discovery.k8s.io"
      kinds:
        - EndpointSlice
      clusters:
        - "*"
    # Pod metrics are transient
    - apiGroups:
        - "metrics.k8s.io"
      kinds:
        - "*"
      clusters:
        - "*"
    # Lease objects for leader election
    - apiGroups:
        - "coordination.k8s.io"
      kinds:
        - Lease
      clusters:
        - "*"
```

Each excluded resource type reduces the number of objects the controller tracks. In large clusters, excluding Events alone can save hundreds of megabytes.

## Technique 3: Tune Go Garbage Collection

The ArgoCD controller is a Go application. The Go garbage collector can be tuned:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-application-controller
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-application-controller
          env:
            # GOGC controls GC frequency
            # Default is 100 (GC when heap doubles)
            # Lower values = more frequent GC = less peak memory
            - name: GOGC
              value: "50"

            # GOMEMLIMIT sets a soft memory limit for the Go runtime
            # Set to ~80% of your container memory limit
            - name: GOMEMLIMIT
              value: "3200MiB"  # If limit is 4Gi
```

`GOGC=50` means garbage collection triggers when the heap grows by 50% instead of 100%. This trades CPU for lower peak memory usage.

`GOMEMLIMIT` tells the Go runtime to aggressively collect garbage when approaching the limit, preventing OOM kills.

## Technique 4: Reduce Application Resource Count

Applications with hundreds of resources consume significantly more memory. Consider splitting them:

```bash
# Find applications with the most resources
argocd app list -o json | jq 'sort_by(.status.resources | length) | reverse | .[:10] | .[] | {name: .metadata.name, resources: (.status.resources | length)}'
```

If an application has 200+ resources, split it into logical components:

```yaml
# Before: One large application
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: big-platform
spec:
  source:
    path: platform/  # Contains everything

# After: Split into focused applications
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: platform-networking
spec:
  source:
    path: platform/networking/
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: platform-monitoring
spec:
  source:
    path: platform/monitoring/
---
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: platform-rbac
spec:
  source:
    path: platform/rbac/
```

## Technique 5: Limit Cluster Resource Tracking

By default, ArgoCD includes all resource group/kinds except the built-in exclusions. Limit the watched resource kinds to only what you need:

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.inclusions: |
    - apiGroups:
        - ""
      kinds:
        - Namespace
        - Service
        - ConfigMap
        - Secret
      clusters:
        - "*"
    - apiGroups:
        - "apps"
      kinds:
        - Deployment
        - StatefulSet
        - DaemonSet
        - ReplicaSet
      clusters:
        - "*"
    - apiGroups:
        - "rbac.authorization.k8s.io"
      kinds:
        - Role
        - RoleBinding
        - ClusterRole
        - ClusterRoleBinding
      clusters:
        - "*"
```

Only use `resource.inclusions` when you have audited the resource kinds your applications need. AppProject `clusterResourceWhitelist` and `clusterResourceBlacklist` are still useful for controlling what applications are allowed to deploy, but they do not by themselves reduce the controller's cluster cache.

## Technique 6: Optimize Redis Configuration

ArgoCD uses Redis as a disposable cache for application state and related data. A well-configured Redis helps avoid cache evictions and Redis OOMs, but it does not replace the controller's in-memory Kubernetes cluster cache:

```yaml
# External Redis with sufficient memory
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  redis.server: "redis.argocd.svc.cluster.local:6379"
```

```yaml
# Redis with tuned settings
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-redis
spec:
  template:
    spec:
      containers:
        - name: redis
          args:
            - redis-server
            - --maxmemory
            - "1gb"
            - --maxmemory-policy
            - allkeys-lru
          resources:
            requests:
              memory: "1Gi"
            limits:
              memory: "1.5Gi"
```

## Technique 7: Increase Reconciliation Interval

Fewer Git polling reconciliations mean less controller work and memory churn:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  timeout.reconciliation: "10m"  # 10 minutes instead of 3m
```

Combined with webhooks, this significantly reduces controller work and memory churn.

## Monitoring Memory Usage

Set up alerts before OOM kills happen:

```yaml
groups:
  - name: argocd-controller-memory
    rules:
      - alert: ArgocdControllerHighMemory
        expr: |
          container_memory_working_set_bytes{
            namespace="argocd",
            container="argocd-application-controller"
          }
          /
          container_spec_memory_limit_bytes{
            namespace="argocd",
            container="argocd-application-controller"
          }
          > 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "ArgoCD controller using >80% of memory limit"

      - alert: ArgocdControllerOOMKill
        expr: |
          increase(kube_pod_container_status_restarts_total{
            namespace="argocd",
            container="argocd-application-controller"
          }[15m]) > 0
          and on(namespace, pod, container)
          min_over_time(kube_pod_container_status_last_terminated_reason{
            namespace="argocd",
            container="argocd-application-controller",
            reason="OOMKilled"
          }[15m]) == 1
        labels:
          severity: critical
        annotations:
          summary: "ArgoCD controller restarted - possible OOM kill"
```

```bash
# Quick memory check
kubectl top pod -n argocd -l app.kubernetes.io/name=argocd-application-controller

# Enable controller.profile.enabled: "true" in argocd-cmd-params-cm first
kubectl port-forward -n argocd svc/argocd-metrics 8082:8082
go tool pprof http://localhost:8082/debug/pprof/heap
```

## Memory Optimization Checklist

| Optimization | Memory Savings | Effort |
|-------------|---------------|--------|
| Exclude Events/Endpoints | 10-30% | Low |
| Controller sharding across clusters | 50-70% per instance | Medium |
| GOGC tuning | 10-20% peak | Low |
| GOMEMLIMIT | Prevents OOM | Low |
| Split large applications | 20-40% | Medium |
| Limit cluster resources | 10-20% | Low |
| Increase reconciliation interval | 5-15% | Low |

For continuous monitoring of ArgoCD controller memory patterns and proactive alerting before OOM kills occur, [OneUptime](https://oneuptime.com) provides infrastructure monitoring that integrates with your Kubernetes metrics.

## Key Takeaways

- Exclude Events, Endpoints, and other non-GitOps resources to reduce tracking overhead
- Enable controller sharding to distribute managed clusters across multiple instances
- Set `GOGC=50` and `GOMEMLIMIT` to optimize Go garbage collection
- Split applications with 200+ resources into smaller, focused applications
- Limit watched resource kinds with `resource.inclusions` only after auditing required resource types
- Monitor memory usage and set alerts at 80% of limits
- Increase reconciliation interval and rely on webhooks for change detection
