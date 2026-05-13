# Validation Summary: Deploy Thanos Store Gateway with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Flux CD HelmRelease and Kustomization APIs
- Kubernetes Secrets and StatefulSets
- Bitnami Thanos Helm chart
- Thanos Store Gateway
- Thanos S3 object storage configuration
- Thanos index cache and Store Gateway sharding
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Bitnami Thanos chart package 13.4.1 values and templates: https://charts.bitnami.com/bitnami/thanos-13.4.1.tgz
- Bitnami Thanos chart current values and templates: https://github.com/bitnami/charts/tree/main/bitnami/thanos
- Thanos Store Gateway documentation and flags: https://thanos.io/tip/components/store.md/
- Thanos object storage configuration documentation: https://thanos.io/tip/thanos/storage.md/
- Thanos sharding documentation: https://thanos.io/tip/thanos/sharding.md/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/

## Issues Found
- The object store secret used `objstore.yaml`, but the Bitnami Thanos chart mounts object storage config as `/conf/objstore.yml` and documents custom secret item paths as `objstore.yml`. Changed the secret key and mounted path to `objstore.yml`.
- `existingObjstoreSecret` and `existingObjstoreSecretItems` were placed under `storegateway`, but the Bitnami chart defines them as top-level values. Moved them to the top level under `values`.
- The in-memory index cache was configured as a malformed `extraFlags` YAML list item. The Bitnami chart supports top-level `indexCacheConfig`, which it renders as `--index-cache.config-file`. Replaced the flag snippet with a valid top-level `indexCacheConfig` block.
- The comment for `--store.grpc.series-max-concurrency` described a time window, but Thanos documents it as the maximum number of concurrent Series calls. Updated the comment.
- `serviceMonitor.enabled` was placed under `storegateway`, but the Bitnami chart exposes ServiceMonitor creation under `metrics.enabled` and `metrics.serviceMonitor.enabled`. Moved the ServiceMonitor configuration under `metrics`.
- The sharding example used `--experimental.enable-vertical-compaction-for-deduplication`, which is not a Store Gateway sharding flag, and `--store.grpc.series-download-concurrency`, which is not documented as a current Store Gateway flag. Replaced the snippet with Bitnami chart sharding values using `storegateway.sharded.hashPartitioning.shards`.
- The Flux health check targeted the generated Store Gateway StatefulSet directly. That works only for the non-sharded chart path and becomes brittle when sharding is enabled. Changed it to health-check the `HelmRelease`, which Flux documents as a supported health check target.
- The best-practices section claimed `dependsOn` waits for compaction to finish. Flux `dependsOn` waits for the referenced Kustomization to be ready, not for individual Thanos compaction cycles. Updated the wording.

## Review Notes
- The review was documentation-based because `helm` and `kubectl` are not installed in this environment.
- The chart version range `>=13.0.0 <14.0.0` is still present in the Bitnami Helm repository index as of 2026-05-13, but it pins the tutorial to older Thanos chart versions. A future update could move the guide to the current Bitnami Thanos chart line.
