# How to Configure Flux CD Resource Cache Settings

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Caching, Performance, Resource Management, Kubernetes, Optimization

Description: A practical guide to configuring and tuning Flux CD's resource cache settings to optimize memory usage, reduce API server load, and improve reconciliation performance.

---

## Introduction

Flux CD controllers cache Kubernetes resources in memory to reduce API server calls and speed up reconciliation. Properly configuring these cache settings is critical for balancing performance with memory consumption. This guide covers how to tune cache settings across all Flux CD controllers for optimal operation.

## Understanding Flux CD Caching

Flux CD controllers are built on the controller-runtime library, which uses client-go's informer framework for caching. There are several caching layers:

- **Informer cache** - Watches and caches Kubernetes resources the controller manages
- **Artifact cache** - Stores fetched Git repositories, Helm charts, and OCI artifacts
- **Source artifact storage** - Local filesystem storage for downloaded artifacts

## Configuring the Kubernetes Client Cache

### Watch Namespaces to Limit Cache Scope

```yaml
# limit-watch-namespaces.yaml
# By default, Flux controllers watch all namespaces
# Limiting this reduces memory usage significantly
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Configure source-controller to watch specific namespaces
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/args
        value:
          - --events-addr=http://notification-controller.flux-system.svc.cluster.local./
          - --storage-path=/data
          - --storage-adv-addr=source-controller.$(RUNTIME_NAMESPACE).svc.cluster.local.
          # Only watch these namespaces instead of all
          - --watch-all-namespaces=false
  # Configure kustomize-controller similarly
  - target:
      kind: Deployment
      name: kustomize-controller
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/args
        value:
          - --events-addr=http://notification-controller.flux-system.svc.cluster.local./
          - --watch-all-namespaces=false
```

### Configure Cache Sync Period

```yaml
# cache-sync-period.yaml
# The cache sync period determines how often the full cache is resynced
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - target:
      kind: Deployment
      name: kustomize-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        # Resync cache every 10 minutes (default varies by controller)
        # Lower values increase API server load but improve consistency
        # Higher values reduce load but may miss changes
        value: --watch-label-selector=!sharding.fluxcd.io/key
```

## Configuring Artifact Storage and Caching

### Source Controller Storage Settings

```yaml
# source-controller-storage.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/volumeMounts
        value:
          - name: data
            mountPath: /data
          - name: tmp
            mountPath: /tmp
      - op: replace
        path: /spec/template/spec/volumes
        value:
          # Use emptyDir with size limit to prevent disk exhaustion
          - name: data
            emptyDir:
              # Set size limit based on total artifact size
              # Sum of all Git repos, Helm charts, and OCI artifacts
              sizeLimit: 2Gi
          - name: tmp
            emptyDir:
              sizeLimit: 1Gi
```

### Use Persistent Volume for Artifact Cache

```yaml
# source-controller-pvc.yaml
# Use a PVC for artifact storage to survive pod restarts
# This prevents re-downloading all artifacts on restart
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: source-controller-data
  namespace: flux-system
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      # Size based on total expected artifact storage
      storage: 5Gi
  storageClassName: fast-ssd
---
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      - op: replace
        path: /spec/template/spec/volumes/0
        value:
          name: data
          persistentVolumeClaim:
            claimName: source-controller-data
```

## Configuring Helm Controller Cache

### Helm Storage and Cache Settings

```yaml
# helm-controller-cache.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - target:
      kind: Deployment
      name: helm-controller
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/volumeMounts
        value:
          - name: tmp
            mountPath: /tmp
      - op: replace
        path: /spec/template/spec/volumes
        value:
          - name: tmp
            emptyDir:
              # Helm charts can be large; allocate enough space
              # This stores rendered templates during reconciliation
              sizeLimit: 2Gi
      - op: replace
        path: /spec/template/spec/containers/0/resources
        value:
          requests:
            cpu: 200m
            # Helm controller caches release state in memory
            # Increase for clusters with many HelmReleases
            memory: 512Mi
          limits:
            cpu: "1"
            memory: 2Gi
```

### Limit Helm Release History

```yaml
# helmrelease-history-limit.yaml
# Reducing Helm release history reduces memory and storage usage
apiVersion: helm.toolkit.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: my-app
  namespace: default
spec:
  interval: 5m
  chart:
    spec:
      chart: my-app
      version: "1.x"
      sourceRef:
        kind: HelmRepository
        name: my-charts
        namespace: flux-system
  # Limit the number of Helm release history entries
  # Default is 10, which stores 10 releases in Kubernetes secrets
  maxHistory: 3
  install:
    # Clean up on failed install
    remediation:
      retries: 3
  upgrade:
    # Clean up on failed upgrade
    cleanupOnFail: true
    remediation:
      retries: 3
```

## Sharding Controllers for Large Clusters

### Configure Controller Sharding

```yaml
# controller-sharding.yaml
# For very large clusters, shard controllers to distribute cache load
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Primary source-controller handles shard-a resources
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/args/-
        value: --watch-label-selector=sharding.fluxcd.io/key=shard-a
---
# Deploy a second source-controller for shard-b
apiVersion: apps/v1
kind: Deployment
metadata:
  name: source-controller-shard-b
  namespace: flux-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: source-controller-shard-b
  template:
    metadata:
      labels:
        app: source-controller-shard-b
    spec:
      containers:
        - name: manager
          image: ghcr.io/fluxcd/source-controller:v1.4.0
          args:
            - --storage-path=/data
            - --storage-adv-addr=source-controller-shard-b.flux-system.svc.cluster.local.
            # This shard only watches resources labeled with shard-b
            - --watch-label-selector=sharding.fluxcd.io/key=shard-b
          resources:
            requests:
              cpu: 250m
              memory: 256Mi
            limits:
              cpu: "1"
              memory: 1Gi
          volumeMounts:
            - name: data
              mountPath: /data
      volumes:
        - name: data
          emptyDir:
            sizeLimit: 2Gi
```

### Label Resources for Sharding

```yaml
# shard-a-resources.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-a-config
  namespace: flux-system
  labels:
    # Assign to shard-a controller
    sharding.fluxcd.io/key: shard-a
spec:
  interval: 5m
  url: https://github.com/org/team-a-config
  ref:
    branch: main
---
# shard-b-resources.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: team-b-config
  namespace: flux-system
  labels:
    # Assign to shard-b controller
    sharding.fluxcd.io/key: shard-b
spec:
  interval: 5m
  url: https://github.com/org/team-b-config
  ref:
    branch: main
```

## Monitoring Cache Performance

### Prometheus Metrics for Cache Monitoring

```yaml
# cache-monitoring-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-cache-monitoring
  namespace: flux-system
spec:
  groups:
    - name: flux-cache
      rules:
        # Monitor controller memory usage as proxy for cache size
        - alert: FluxControllerMemoryHigh
          expr: |
            container_memory_working_set_bytes{
              namespace="flux-system",
              container=~"manager"
            } > 1.5e9
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Flux controller memory usage high"
            description: >
              {{ $labels.pod }} is using {{ $value | humanize1024 }} of memory.
              Consider increasing limits or enabling sharding.

        # Monitor artifact storage usage
        - alert: FluxArtifactStorageHigh
          expr: |
            kubelet_volume_stats_used_bytes{
              namespace="flux-system",
              persistentvolumeclaim="source-controller-data"
            }
            /
            kubelet_volume_stats_capacity_bytes{
              namespace="flux-system",
              persistentvolumeclaim="source-controller-data"
            } > 0.8
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Flux artifact storage is over 80% full"
            description: "Source controller PVC usage is at {{ $value | humanizePercentage }}."

        # Track Go runtime memory metrics
        - alert: FluxControllerGoHeapHigh
          expr: |
            go_memstats_heap_alloc_bytes{namespace="flux-system"} > 1e9
          for: 10m
          labels:
            severity: info
          annotations:
            summary: "Flux controller Go heap allocation high"
            description: "{{ $labels.pod }} heap is {{ $value | humanize1024 }}."
```

### Useful PromQL Queries

```promql
# Go heap memory by controller
go_memstats_heap_alloc_bytes{namespace="flux-system"}

# Go garbage collection pause duration
rate(go_gc_duration_seconds_sum{namespace="flux-system"}[5m])

# Number of goroutines (indicates cache watch activity)
go_goroutines{namespace="flux-system"}

# Kubernetes API server request rate from Flux controllers
rate(rest_client_requests_total{namespace="flux-system"}[5m])

# API server request latency from Flux controllers
histogram_quantile(0.99,
  rate(rest_client_request_duration_seconds_bucket{namespace="flux-system"}[5m])
)
```

## Garbage Collection Tuning

### Go Runtime GC Settings

```yaml
# gc-tuning.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - target:
      kind: Deployment
      name: source-controller
    patch: |
      - op: add
        path: /spec/template/spec/containers/0/env/-
        value:
          # GOGC controls garbage collection frequency
          # Default is 100 (GC when heap doubles)
          # Lower values = more frequent GC = less memory but more CPU
          # Higher values = less GC = more memory but less CPU
          name: GOGC
          value: "50"
      - op: add
        path: /spec/template/spec/containers/0/env/-
        value:
          # GOMEMLIMIT sets a soft memory limit for Go runtime
          # Helps prevent OOM by triggering GC more aggressively near limit
          name: GOMEMLIMIT
          value: "900MiB"
```

## Best Practices Summary

1. **Limit watch scope** - Only watch namespaces that contain Flux resources
2. **Size artifact storage** - Calculate total artifact size and add 50% headroom
3. **Use PVCs for stability** - Persistent storage prevents re-downloading on restarts
4. **Limit Helm history** - Reduce maxHistory to 3-5 to save etcd storage
5. **Shard at scale** - Use label selectors to distribute load across controller instances
6. **Tune GC settings** - Adjust GOGC and GOMEMLIMIT based on memory profiles
7. **Monitor cache metrics** - Track memory, goroutines, and API request rates
8. **Clean up unused sources** - Remove GitRepository and HelmRepository objects that are no longer needed

## Conclusion

Properly configuring Flux CD's resource cache settings is essential for running GitOps at scale. By tuning watch scopes, artifact storage, memory limits, and garbage collection, you can optimize the balance between performance and resource consumption. For large clusters, sharding controllers across multiple instances distributes the cache load and prevents any single controller from becoming a bottleneck. Monitor cache-related metrics continuously to detect and address issues before they impact your deployment pipeline.
