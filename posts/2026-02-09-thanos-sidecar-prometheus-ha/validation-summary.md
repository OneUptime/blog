# Validation Summary: How to Configure Thanos Sidecar for Prometheus High Availability in Kubernetes

## Status
validated

## Post Type
Tutorial / Kubernetes deployment guide

## Technologies Covered
- Thanos Sidecar, Querier, Store Gateway, and Compactor
- Prometheus
- Kubernetes StatefulSets, Deployments, Services, ConfigMaps, Secrets, and PersistentVolumeClaims
- AWS S3, Google Cloud Storage, and Azure Blob Storage object storage configuration
- Grafana Prometheus datasource configuration
- PromQL alerts and monitoring queries

## Sources Consulted
- Thanos v0.32 Sidecar documentation: https://thanos.io/v0.32/components/sidecar.md/
- Thanos v0.32 Querier documentation: https://thanos.io/v0.32/components/query.md/
- Thanos v0.32 Store Gateway documentation: https://thanos.io/v0.32/components/store.md/
- Thanos object storage configuration documentation: https://thanos.io/tip/thanos/storage.md/
- Thanos Compactor documentation: https://thanos.io/v0.14/components/compact.md/
- Prometheus feature flags documentation: https://prometheus.io/docs/prometheus/2.55/feature_flags/
- Prometheus configuration documentation for external labels: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Kubernetes DNS for Services and Pods documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/

## Issues Found
- The Prometheus/sidecar manifest wrote an env-substituted config to `/etc/prometheus-shared/prometheus.yml`, but Prometheus still read `/etc/prometheus/prometheus.yml` and no shared writable volume was mounted. I changed the example to use Prometheus's `expand-external-labels` feature flag, set `POD_NAME` on the Prometheus container, and changed the external label to `$POD_NAME`.
- The text claimed the Thanos sidecar reloader substituted `$(POD_NAME)`. I updated it to state that Prometheus expands `$POD_NAME`, matching the corrected manifest and Prometheus documentation.
- The Thanos Querier manifest used the deprecated `--store` flag. I replaced it with `--endpoint`, which is the non-deprecated flag documented for Thanos v0.32.

## Review Notes
The pinned images (`prom/prometheus:v2.45.0` and `quay.io/thanos/thanos:v0.32.0`) are older than current upstream releases, but the corrected examples are valid for those versions. Future updates could refresh the image versions and re-check flags against the then-current Thanos and Prometheus release documentation.
