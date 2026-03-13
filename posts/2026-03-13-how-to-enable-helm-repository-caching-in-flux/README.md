# How to Enable Helm Repository Caching in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Performance, Caching, Helm, Source Controller

Description: Enable Helm repository index caching in Flux to avoid redundant downloads and speed up HelmChart reconciliations.

---

## The Problem with Uncached Helm Repositories

Every time the source-controller reconciles a HelmRepository of type `default` (HTTP/HTTPS), it downloads the full repository index file. For popular Helm repositories with hundreds of charts, these index files can be several megabytes. Downloading the same index repeatedly wastes bandwidth and adds latency to each reconciliation cycle.

## What Helm Repository Caching Does

When caching is enabled, the source-controller stores downloaded Helm repository index files in an in-memory cache. On subsequent reconciliations, the controller serves the index from cache if it has not expired, avoiding the network round-trip entirely. This is particularly effective when multiple HelmChart objects reference the same HelmRepository.

## Enabling the Cache

Helm repository caching is controlled by the `--helm-cache-max-size` flag on the source-controller. Setting this flag to a value greater than zero enables the cache.

### Create the Patch

```yaml
# clusters/my-cluster/flux-system/source-controller-cache-patch.yaml
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

The three cache-related flags are:

- `--helm-cache-max-size`: Maximum number of index entries to cache. Set to 0 to disable (default).
- `--helm-cache-ttl`: How long a cached index remains valid. Default is 15 minutes.
- `--helm-cache-purge-interval`: How often the cache is scanned for expired entries. Default is 1 minute.

### Reference the Patch

```yaml
# clusters/my-cluster/flux-system/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  - path: source-controller-cache-patch.yaml
    target:
      kind: Deployment
      name: source-controller
```

### Apply

```bash
git add clusters/my-cluster/flux-system/
git commit -m "Enable Helm repository caching in source-controller"
git push
```

## Choosing a Cache Size

The `--helm-cache-max-size` value represents the number of Helm repository indexes that can be cached simultaneously. A good rule of thumb is to set it to the number of distinct HelmRepository objects you have, plus a small buffer:

- 5 HelmRepositories: `--helm-cache-max-size=8`
- 10 HelmRepositories: `--helm-cache-max-size=16`
- 20+ HelmRepositories: `--helm-cache-max-size=32`

## Memory Impact

Each cached index file consumes memory proportional to its size. A large Helm repository index can be 5 to 10 MB. With a cache size of 16, you might need an additional 80 to 160 MB of memory for the source-controller. Adjust resource limits accordingly.

## Using OCI Repositories Instead

An alternative to caching HTTP Helm repository indexes is to switch to OCI-based Helm repositories. OCI repositories do not use index files. Instead, each chart version is fetched individually as an OCI artifact. This eliminates the large index download entirely and can be more efficient than caching for very large repositories.

```yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: my-charts
  namespace: flux-system
spec:
  type: oci
  url: oci://ghcr.io/my-org/charts
  interval: 10m
```

## Summary

Enabling Helm repository caching avoids redundant index downloads and speeds up HelmChart reconciliation. Set the `--helm-cache-max-size` flag on the source-controller, tune the TTL and purge interval for your needs, and consider switching to OCI-based repositories for an even more efficient approach.
