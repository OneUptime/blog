# How to Configure Helm Cache Max Size in Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux, Kubernetes, GitOps, Performance, Caching, Helm, Source Controller

Description: Learn how to set the Helm repository cache maximum size in Flux to control how many repository indexes are kept in memory.

---

## What Helm Cache Max Size Controls

The `--helm-cache-max-size` flag on the Flux source-controller determines the maximum number of Helm repository indexes that can be stored in the in-memory cache. When this value is zero (the default), caching is disabled and HelmChart reconciliations load the repository index from the stored HelmRepository artifact when needed.

## Why It Matters

Helm repository index files can be large. The Bitnami Helm repository index, for example, is several megabytes. Every time the source-controller reconciles a HelmRepository, it downloads this index to refresh the stored artifact.

The HelmRepository reconciliation still fetches the remote index on its interval, but HelmChart reconciliations also need to load and parse that repository index to resolve chart versions. If you have multiple HelmChart objects pointing to the same HelmRepository, the index may be loaded multiple times within a single reconciliation cycle.

Setting an appropriate cache max size prevents these redundant loads and can cut reconciliation time significantly.

## Configuring the Value

### Patch the Source Controller

```yaml
# clusters/my-cluster/flux-system/source-controller-patch.yaml

- op: add
  path: /spec/template/spec/containers/0/args/-
  value: --helm-cache-max-size=32
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
  - path: source-controller-patch.yaml
    target:
      kind: Deployment
      name: source-controller
```

```bash
git add clusters/my-cluster/flux-system/
git commit -m "Set helm-cache-max-size to 32"
git push
```

## How to Choose the Right Size

The cache max size should be at least equal to the number of HTTP/S HelmRepository objects in your cluster whose indexes are used by HelmCharts. Each HelmRepository has its index cached independently.

To find out how many HelmRepository objects you have:

```bash
kubectl get helmrepositories --all-namespaces --no-headers | wc -l
```

Set the cache size to this number plus a 20-30% buffer to account for new repositories being added.

## Memory Considerations

Each cached index occupies memory proportional to the size of the repository's index file. Small repositories may only use a few kilobytes, while large public repositories can use 5 to 10 MB or more.

Estimate the additional memory requirement:

```text
Additional memory = number_of_cached_repos x average_index_size
```

For example, caching 20 repositories with an average index size of 2 MB requires approximately 40 MB of additional memory. Increase the source-controller memory limit accordingly:

```yaml
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
          resources:
            limits:
              memory: 512Mi
```

## What Happens When the Cache is Full

When the cache reaches its maximum size, no more items can be added. The source-controller logs the failed cache operation, and subsequent reconciliations that require a cache miss read the index from the stored artifact file without caching it. To avoid this, set the cache size to at least the number of HTTP/S HelmRepository objects whose indexes are used by HelmCharts.

## Verifying the Configuration

```bash
kubectl get deployment source-controller -n flux-system \
  -o jsonpath='{.spec.template.spec.containers[0].args}' | tr ',' '\n' | grep helm-cache
```

## Summary

Setting `--helm-cache-max-size` enables the Helm repository index cache and controls its capacity. Size it to match the number of HTTP/S HelmRepository indexes used by HelmCharts, account for the additional memory usage, and monitor cache hits, misses, and failed cache operations through the source-controller metrics and logs.
