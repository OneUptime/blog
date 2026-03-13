# How to Configure Helm Cache Purge Interval in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Performance, Caching, Helm, Source Controller

Description: Configure how frequently the Flux source-controller scans for and removes expired Helm repository cache entries.

---

## What the Purge Interval Controls

The `--helm-cache-purge-interval` flag determines how often the source-controller's Helm cache housekeeping routine runs. During each purge cycle, the controller scans all cached Helm repository index entries and removes any that have exceeded their TTL. This frees memory and ensures that stale data does not persist indefinitely.

## Default Behavior

The default purge interval is 1 minute. This means the cache is scanned every 60 seconds for expired entries. For most installations, this default is appropriate.

## When to Change the Purge Interval

### Increase the Interval to Reduce Overhead

If you have a large cache with many entries and the purge operation adds measurable CPU overhead, you can increase the interval:

```yaml
--helm-cache-purge-interval=10m
```

This is appropriate when the TTL is long (30 minutes or more) and there is no urgency in reclaiming memory from expired entries.

### Decrease the Interval for Tighter Memory Control

If memory is constrained and you want expired entries removed as quickly as possible:

```yaml
--helm-cache-purge-interval=30s
```

This ensures that memory from expired entries is reclaimed promptly.

## Configuring the Purge Interval

### Create the Patch

```yaml
# clusters/my-cluster/flux-system/source-controller-purge-patch.yaml
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
            - --events-addr=http://notification-controller.flux-system.svc.cluster.local./
            - --watch-all-namespaces=true
            - --log-level=info
            - --log-encoding=json
            - --enable-leader-election
            - --storage-addr=:9090
            - --storage-adv-addr=source-controller.flux-system.svc.cluster.local.
            - --helm-cache-max-size=16
            - --helm-cache-ttl=15m
            - --helm-cache-purge-interval=5m
```

### Apply via Kustomization

```yaml
# clusters/my-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: source-controller-purge-patch.yaml
    target:
      kind: Deployment
      name: source-controller
```

```bash
git add clusters/my-cluster/flux-system/
git commit -m "Set Helm cache purge interval to 5 minutes"
git push
```

## How Purge Interval, TTL, and Max Size Work Together

These three settings form the complete cache configuration:

1. **Max size** (`--helm-cache-max-size`): Limits how many entries can exist in the cache at once. When full, the least recently used entry is evicted.
2. **TTL** (`--helm-cache-ttl`): Marks entries as expired after this duration. Expired entries are not served to callers.
3. **Purge interval** (`--helm-cache-purge-interval`): Controls how often expired entries are actually deleted from memory.

An entry can be in one of three states:
- Fresh: within TTL, served from cache
- Expired but not purged: past TTL, not served, still occupying memory
- Purged: removed from memory

The purge interval determines how long an entry stays in the second state. A short purge interval means faster memory reclamation but slightly more CPU work. A long purge interval means entries linger in memory longer after expiration.

## Recommended Configurations

| Use Case | Max Size | TTL | Purge Interval |
|----------|---------|-----|----------------|
| Small cluster, few repos | 8 | 15m | 1m (default) |
| Medium cluster | 16 | 15m | 5m |
| Large cluster, many repos | 32 | 30m | 10m |
| Memory-constrained | 8 | 5m | 30s |

## Summary

The `--helm-cache-purge-interval` flag controls memory reclamation for expired Helm cache entries. In most cases the default of 1 minute works well. Adjust it in conjunction with the cache TTL and max size to optimize for your cluster's memory and performance requirements.
