# Validation Summary: How to Configure Helm Cache Purge Interval in Flux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux source-controller
- Kubernetes
- Kustomize
- Helm repository index caching
- GitOps workflow

## Sources Consulted
- Flux source-controller options: https://fluxcd.io/flux/components/source/options/
- Flux HelmChart documentation, "Improving resource consumption by enabling the cache": https://fluxcd.io/flux/components/source/helmcharts/#improving-resource-consumption-by-enabling-the-cache
- Flux source-controller source code, `main.go`: https://github.com/fluxcd/source-controller/blob/main/main.go
- Flux source-controller cache implementation: https://github.com/fluxcd/source-controller/blob/main/internal/cache/cache.go

## Issues Found
- The post implied the Helm cache purge routine always runs. Flux only initializes the Helm index cache when `--helm-cache-max-size` is greater than `0`; otherwise caching is disabled. Updated the purge interval and default behavior descriptions to state that they apply when Helm index caching is enabled.
- The post stated that when the cache is full, the least recently used entry is evicted. Flux documentation and source code show that no more items can be added when the cache is full, and the source-controller reports a warning event. Updated the max size explanation accordingly.

## Review Notes
The flag name, default purge interval, TTL behavior, Kustomize patch approach, and example time values are consistent with current Flux documentation. The example correctly sets `--helm-cache-max-size` above `0`, so the purge interval has an effect.
