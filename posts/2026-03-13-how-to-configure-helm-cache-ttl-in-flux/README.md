# How to Configure Helm Cache TTL in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Performance, Caching, Helm, TTL

Description: Control how long Helm repository index entries remain valid in the Flux source-controller cache by configuring the cache TTL.

---

## What Helm Cache TTL Does

The `--helm-cache-ttl` flag on the Flux source-controller sets the time-to-live for entries in the Helm repository index cache. After a cached entry exceeds this duration, it is considered stale and will be re-downloaded on the next reconciliation. This balances freshness of the index data against the performance benefit of avoiding network requests.

## Default Value

The default TTL is 15 minutes. This means that once a Helm repository index is cached, it will be served from cache for the next 15 minutes regardless of how many HelmChart reconciliations request it.

## When to Adjust the TTL

### Increase the TTL for Stable Repositories

If you use Helm repositories that publish new chart versions infrequently (once a day or less), you can safely increase the TTL to reduce network traffic:

```yaml
--helm-cache-ttl=1h
```

This is suitable for internal chart repositories or third-party repositories that follow a predictable release cadence.

### Decrease the TTL for Frequently Updated Repositories

If your chart repository receives multiple updates per hour and you need Flux to pick up new versions quickly, reduce the TTL:

```yaml
--helm-cache-ttl=5m
```

Keep in mind that a shorter TTL means more frequent index downloads.

## Configuring the TTL

### Create the Patch

```yaml
# clusters/my-cluster/flux-system/source-controller-cache-ttl-patch.yaml
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
            - --helm-cache-ttl=30m
            - --helm-cache-purge-interval=5m
```

### Apply

```yaml
# clusters/my-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: source-controller-cache-ttl-patch.yaml
    target:
      kind: Deployment
      name: source-controller
```

```bash
git add clusters/my-cluster/flux-system/
git commit -m "Set Helm cache TTL to 30 minutes"
git push
```

## Relationship Between TTL and Reconciliation Interval

The TTL should generally be shorter than or equal to the HelmRepository reconciliation interval. If the interval is 10 minutes and the TTL is 30 minutes, the controller will serve cached data for three consecutive reconciliation cycles before refreshing.

Consider this when setting values:

| Reconciliation Interval | Recommended TTL |
|------------------------|----------------|
| 1 minute | 5 minutes |
| 5 minutes | 15 minutes |
| 10 minutes | 30 minutes |
| 30 minutes | 1 hour |

## Forced Refresh

If you need to force a refresh of a cached index immediately, you can annotate the HelmRepository object:

```bash
kubectl annotate helmrepository my-repo -n flux-system \
  reconcile.fluxcd.io/requestedAt="$(date +%s)" --overwrite
```

This triggers an immediate reconciliation that bypasses the normal interval, though the cache TTL still applies. To fully bypass the cache, you would need to restart the source-controller pod.

## Summary

The `--helm-cache-ttl` flag lets you control the trade-off between index freshness and network efficiency. Increase it for stable repositories to reduce bandwidth usage, or decrease it when you need faster detection of new chart versions. Always set it in combination with `--helm-cache-max-size` to enable caching.
