# Validation Summary: How to Configure Helm Cache TTL in Flux

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux source-controller
- Kubernetes
- Kustomize
- Helm repositories and HelmChart reconciliation
- kubectl

## Sources Consulted
- Flux source-controller options documentation: https://fluxcd.io/flux/components/source/options/
- Flux HelmChart documentation, including Helm index cache behavior: https://fluxcd.io/flux/components/source/helmcharts/
- Flux HelmRepository documentation, including reconciliation interval and manual reconcile annotation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux source-controller main.go flag definitions and duration parsing: https://github.com/fluxcd/source-controller/blob/main/main.go
- Flux source-controller HelmChart reconciler cache usage: https://github.com/fluxcd/source-controller/blob/main/internal/controller/helmchart_controller.go
- Flux source-controller HelmRepository reconciler cache usage: https://github.com/fluxcd/source-controller/blob/main/internal/controller/helmrepository_controller.go
- Flux source-controller internal cache implementation: https://github.com/fluxcd/source-controller/blob/main/internal/cache/cache.go

## Issues Found
- The post described cache expiry as causing the Helm repository index to be re-downloaded on the next reconciliation. Flux uses this cache for in-memory parsed Helm repository indexes; on cache miss, the index is loaded again from the stored HelmRepository artifact when needed. Updated the wording to avoid implying that the TTL directly controls remote network downloads.
- The post said increasing TTL reduces network traffic. Updated this to say it reduces repeated index loading and parsing.
- The post said decreasing TTL helps Flux pick up new chart versions quickly. Updated this to explain that faster detection is controlled by HelmRepository and HelmChart reconciliation intervals, not by the cache TTL.
- The relationship section said TTL should generally be shorter than or equal to the HelmRepository reconciliation interval, while its examples used longer TTLs. Updated the section to describe the separate roles of reconciliation interval and cache TTL, and changed the table label from "Recommended TTL" to "Example TTL".
- The forced refresh section implied a source-controller restart was needed to fully bypass the cache. Updated it to match Flux behavior: annotating the HelmRepository queues immediate reconciliation, and a changed remote index results in a new artifact used by subsequent HelmChart reconciliations.
- The summary described the TTL as a trade-off between index freshness and network efficiency. Updated it to memory usage and index loading efficiency.

## Review Notes
- The current Flux options page lists `ms`, `s`, and `m` as valid units for `--helm-cache-ttl`, but the source-controller flag help and implementation use Go duration parsing, which also accepts `h`; the post's `1h` example is valid.
- The Kustomize patch replaces the container `args` list, so users should keep any deployment arguments required by their installed Flux version when adapting the example.
