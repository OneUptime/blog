# Validation Summary: How to Configure Helm Cache Max Size in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux source-controller
- Kubernetes
- Kustomize
- Helm repositories
- kubectl

## Sources Consulted
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux vertical scaling configuration: https://fluxcd.io/flux/installation/configuration/vertical-scaling/
- Flux source-controller HelmChart reconciler source: https://github.com/fluxcd/source-controller/blob/main/internal/controller/helmchart_controller.go
- Flux source-controller HelmRepository reconciler source: https://github.com/fluxcd/source-controller/blob/main/internal/controller/helmrepository_controller.go
- Flux source-controller cache implementation: https://github.com/fluxcd/source-controller/blob/main/internal/cache/cache.go
- Flux source-controller flag definitions: https://github.com/fluxcd/source-controller/blob/main/main.go

## Issues Found
- The post described cache-disabled behavior as every HelmRepository reconciliation downloading the index because of the cache setting. Flux always fetches remote Helm repository indexes during HelmRepository reconciliation; the cache primarily avoids repeated in-memory loading/parsing of stored repository indexes during HelmChart reconciliation. Updated the explanation to distinguish HelmRepository artifact refreshes from HelmChart index loading.
- The Deployment patch example replaced the full container `args` list, which can accidentally drop existing source-controller arguments from `gotk-components.yaml`. Replaced it with a JSON patch operation that appends only `--helm-cache-max-size=32`.
- The cache-full behavior said the controller reports a warning event and downloads the index directly from the remote server on cache misses. Current Flux documentation and implementation indicate the controller logs the failed cache operation and reads the index from the stored artifact file instead. Updated that section.
- The summary referred to cache evictions, but Flux's Helm index cache is bounded by max item count and item TTL rather than LRU eviction. Updated the monitoring guidance to reference cache hits, misses, and failed cache operations.

## Review Notes
The cache also supports `--helm-cache-ttl` and `--helm-cache-purge-interval`, which may be useful tuning parameters for a future expansion of the post.
