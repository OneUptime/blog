# How to Enable Helm Repository Caching in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Performance, Caching, Helm, Source Controller

Description: Enable Helm repository index caching in Flux to avoid redundant downloads and speed up HelmChart reconciliations.

---

## The Problem with Uncached Helm Repositories

Every time the source-controller reconciles a HelmRepository of type `default` (HTTP/HTTPS), it fetches the repository index file and stores it as an artifact. For popular Helm repositories with hundreds of charts, these index files can be several megabytes. HelmChart reconciliations that reference the same HelmRepository then need to load that index to resolve chart versions, which can add latency and memory pressure when repeated across many charts.

## What Helm Repository Caching Does

When caching is enabled, the source-controller stores Helm repository indexes in an in-memory cache. On subsequent HelmChart reconciliations, the controller uses the cached index if it is available and has not expired, avoiding another load of the repository index artifact. This is particularly effective when multiple HelmChart objects reference the same HelmRepository.

## Enabling the Cache

Helm repository caching is controlled by the `--helm-cache-max-size` flag on the source-controller. Setting this flag to a value greater than zero enables the cache.

### Create the Patch

```yaml
# clusters/my-cluster/flux-system/source-controller-cache-patch.yaml

- op: add
  path: /spec/template/spec/containers/0/args/-
  value: --helm-cache-max-size=16
- op: add
  path: /spec/template/spec/containers/0/args/-
  value: --helm-cache-ttl=15m
- op: add
  path: /spec/template/spec/containers/0/args/-
  value: --helm-cache-purge-interval=5m
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

Enabling Helm repository caching avoids repeatedly loading repository indexes and speeds up HelmChart reconciliation. Set the `--helm-cache-max-size` flag on the source-controller, tune the TTL and purge interval for your needs, and consider switching to OCI-based repositories for an even more efficient approach.
