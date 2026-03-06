# How to Scale Flux CD for Large Clusters with Many Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Scaling, Large Clusters, Multi-Tenancy, Performance

Description: A practical guide to scaling Flux CD for clusters managing hundreds or thousands of resources through sharding, multi-tenancy, repository structuring, and resource optimization.

---

Flux CD works well out of the box for small to medium clusters. However, clusters with hundreds of namespaces, thousands of resources, or complex multi-tenant setups require careful scaling strategies. This guide covers proven approaches to scaling Flux CD for large production environments.

## Identifying Scaling Bottlenecks

Before scaling, identify where Flux CD is struggling. Common symptoms include:

- Reconciliation queue depth grows continuously
- Reconciliation latency exceeds acceptable thresholds
- Controllers are OOMKilled or CPU-throttled
- API server throttling from Flux controllers
- Source fetches timing out

Check these metrics first:

```promql
# Queue depth per controller - should stay near 0
workqueue_depth{namespace="flux-system"}

# Reconciliation duration - 95th percentile
histogram_quantile(0.95,
  rate(gotk_reconcile_duration_seconds_bucket{namespace="flux-system"}[10m])
)

# API server request rate from Flux controllers
rate(rest_client_requests_total{namespace="flux-system"}[5m])
```

## Repository Structure for Scale

How you structure your Git repositories significantly impacts scaling. Use a multi-repo approach to distribute load.

```yaml
# Platform team repository - infrastructure components
# Repo: github.com/org/platform-infra
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: platform-infra
  namespace: flux-system
spec:
  interval: 30m
  url: https://github.com/org/platform-infra
  ref:
    branch: main
  ignore: |
    # Only include the cluster-specific directory
    /*
    !/clusters/production/
---
# Team A application repository
# Repo: github.com/org/team-a-apps
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-a-apps
  namespace: team-a
spec:
  interval: 10m
  url: https://github.com/org/team-a-apps
  ref:
    branch: main
---
# Team B application repository
# Repo: github.com/org/team-b-apps
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-b-apps
  namespace: team-b
spec:
  interval: 10m
  url: https://github.com/org/team-b-apps
  ref:
    branch: main
```

## Splitting Kustomizations for Parallel Processing

One large Kustomization that manages everything is a scaling bottleneck. Split into many smaller Kustomizations that can reconcile in parallel.

```yaml
# Root Kustomization that delegates to per-namespace Kustomizations
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: tenants
  namespace: flux-system
spec:
  interval: 30m
  path: ./tenants
  prune: true
  sourceRef:
    kind: GitRepository
    name: platform-infra
---
# Per-tenant Kustomization - reconciles independently
# tenants/team-a.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-a
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/team-a
  prune: true
  sourceRef:
    kind: GitRepository
    name: team-a-apps
  # Limit this Kustomization to only manage resources in team-a namespace
  targetNamespace: team-a
  # Service account with permissions scoped to team-a namespace only
  serviceAccountName: team-a-reconciler
---
# tenants/team-b.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-b
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/team-b
  prune: true
  sourceRef:
    kind: GitRepository
    name: team-b-apps
  targetNamespace: team-b
  serviceAccountName: team-b-reconciler
```

## Scaling Controller Resources

For large clusters, increase controller resource allocations and concurrency.

```yaml
# large-cluster-patches.yaml
# Resource allocation for clusters with 500+ Flux-managed resources
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          args:
            - --storage-path=/data
            - --storage-adv-addr=source-controller.$(RUNTIME_NAMESPACE).svc.cluster.local.
            # High concurrency for many sources
            - --concurrent=10
            - --kube-api-qps=100
            - --kube-api-burst=200
            # Limit artifact retention to save disk and memory
            - --artifact-retention-ttl=30m
            - --artifact-retention-records=2
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2000m"
              memory: "2Gi"
          env:
            # Tune Go GC for lower memory overhead
            - name: GOGC
              value: "50"
            - name: GOMEMLIMIT
              value: "1600MiB"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          args:
            # High concurrency for parallel manifest processing
            - --concurrent=16
            - --kube-api-qps=200
            - --kube-api-burst=400
            - --requeue-dependency=5s
          resources:
            requests:
              cpu: "1000m"
              memory: "2Gi"
            limits:
              cpu: "4000m"
              memory: "4Gi"
          env:
            - name: GOGC
              value: "50"
            - name: GOMEMLIMIT
              value: "3200MiB"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: helm-controller
  namespace: flux-system
spec:
  template:
    spec:
      containers:
        - name: manager
          args:
            - --concurrent=10
            - --kube-api-qps=100
            - --kube-api-burst=200
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2000m"
              memory: "2Gi"
          env:
            - name: GOGC
              value: "50"
            - name: GOMEMLIMIT
              value: "1600MiB"
```

## Using Controller Sharding

For very large clusters, run multiple instances of a controller, each responsible for a subset of resources. Sharding is done via label selectors.

```yaml
# Shard 1: Handles resources labeled with shard=shard1
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller-shard1
  namespace: flux-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kustomize-controller-shard1
  template:
    metadata:
      labels:
        app: kustomize-controller-shard1
    spec:
      containers:
        - name: manager
          image: ghcr.io/fluxcd/kustomize-controller:v1.4.0
          args:
            - --concurrent=8
            - --watch-label-selector=sharding.fluxcd.io/key=shard1
            - --kube-api-qps=100
            - --kube-api-burst=200
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2000m"
              memory: "2Gi"
---
# Shard 2: Handles resources labeled with shard=shard2
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller-shard2
  namespace: flux-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: kustomize-controller-shard2
  template:
    metadata:
      labels:
        app: kustomize-controller-shard2
    spec:
      containers:
        - name: manager
          image: ghcr.io/fluxcd/kustomize-controller:v1.4.0
          args:
            - --concurrent=8
            - --watch-label-selector=sharding.fluxcd.io/key=shard2
            - --kube-api-qps=100
            - --kube-api-burst=200
          resources:
            requests:
              cpu: "500m"
              memory: "1Gi"
            limits:
              cpu: "2000m"
              memory: "2Gi"
```

Label your Kustomizations to route them to the correct shard:

```yaml
# Kustomization assigned to shard1
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-a-apps
  namespace: flux-system
  labels:
    # This label routes the resource to shard1 controller
    sharding.fluxcd.io/key: shard1
spec:
  interval: 10m
  path: ./apps/team-a
  prune: true
  sourceRef:
    kind: GitRepository
    name: team-a-apps
---
# Kustomization assigned to shard2
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: team-b-apps
  namespace: flux-system
  labels:
    sharding.fluxcd.io/key: shard2
spec:
  interval: 10m
  path: ./apps/team-b
  prune: true
  sourceRef:
    kind: GitRepository
    name: team-b-apps
```

## Tiered Reconciliation Intervals

Not all resources need the same reconciliation frequency. Use tiered intervals to reduce load.

```yaml
# Tier 1: Critical applications - fast reconciliation
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: critical-apps
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/critical
  prune: true
  sourceRef:
    kind: GitRepository
    name: platform-infra
---
# Tier 2: Standard applications - moderate reconciliation
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: standard-apps
  namespace: flux-system
spec:
  interval: 30m
  path: ./apps/standard
  prune: true
  sourceRef:
    kind: GitRepository
    name: platform-infra
---
# Tier 3: Infrastructure - infrequent reconciliation
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: infrastructure
  namespace: flux-system
spec:
  # Infrastructure rarely changes; hourly checks are sufficient
  interval: 1h
  path: ./infrastructure
  prune: true
  sourceRef:
    kind: GitRepository
    name: platform-infra
```

## Dedicated Nodes for Flux Controllers

On large clusters, isolate Flux controllers on dedicated nodes to prevent interference with application workloads.

```yaml
# Node affinity and tolerations for dedicated Flux nodes
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kustomize-controller
  namespace: flux-system
spec:
  template:
    spec:
      # Schedule Flux controllers on dedicated management nodes
      nodeSelector:
        node-role.kubernetes.io/flux: "true"
      tolerations:
        - key: "node-role.kubernetes.io/flux"
          operator: "Exists"
          effect: "NoSchedule"
      # Use topology spread to distribute controller pods
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: kubernetes.io/hostname
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              app: kustomize-controller
```

## Summary

Key strategies for scaling Flux CD to large clusters:

1. Split into multiple smaller GitRepositories and Kustomizations for parallel processing
2. Increase controller resources and concurrency proportionally to resource count
3. Use controller sharding to distribute load across multiple controller instances
4. Implement tiered reconciliation intervals based on resource criticality
5. Structure repositories to minimize artifact size per source
6. Isolate Flux controllers on dedicated nodes for resource predictability
7. Monitor queue depth, reconciliation duration, and API server load continuously

Start with repository restructuring and Kustomization splitting, as these changes provide the highest scaling benefit without additional infrastructure cost.
