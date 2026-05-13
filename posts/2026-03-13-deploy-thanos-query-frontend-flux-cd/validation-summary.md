# Validation Summary: Deploy Thanos Query Frontend with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease
- Bitnami Thanos Helm chart
- Bitnami Memcached Helm chart
- Thanos Query Frontend
- Grafana datasource provisioning
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Thanos Query Frontend documentation: https://thanos.io/tip/components/query-frontend.md/
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Grafana datasource provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Bitnami Thanos chart README and values: https://github.com/bitnami/charts/tree/main/bitnami/thanos
- Bitnami Memcached chart values and templates: https://github.com/bitnami/charts/tree/main/bitnami/memcached

## Issues Found
1. The Memcached HelmRelease used an old chart major range and set only Kubernetes memory resources. Updated the chart range to `>=8.0.0 <9.0.0` and added Memcached `args` so the cache actually gets a larger memory limit and item size.
2. The Thanos HelmRelease used an old chart major range. Updated it to `>=17.0.0 <18.0.0`, matching the current Bitnami Thanos chart major checked during review.
3. The post deployed Memcached but configured Query Frontend with `IN-MEMORY`, which would not share cache entries across frontend replicas. Changed the cache configuration to Thanos `MEMCACHED` with the Bitnami Memcached service address.
4. The example appended `--query-frontend.downstream-url` through `extraFlags` while the Bitnami chart also supplies that flag by default, and it disabled the chart's Querier. Replaced `extraFlags` with explicit `queryFrontend.args` so the frontend can point at an existing Querier without duplicate/default downstream configuration.
5. `queryFrontend.serviceMonitor.enabled` is not a Bitnami Thanos chart value. Moved ServiceMonitor enablement to the chart's top-level `metrics.enabled` and `metrics.serviceMonitor.enabled` values.
6. The best-practice note referred to the in-memory cache `validity` setting after the example was corrected to Memcached. Updated it to refer to Memcached `expiration`.

## Review Notes
The Grafana datasource provisioning shape and `customQueryParameters` setting are valid. The Flux `HelmRelease` and `Kustomization` API versions are current. The Kustomization `dependsOn` example assumes a separate Flux Kustomization named `thanos-querier` exists in the same namespace.
