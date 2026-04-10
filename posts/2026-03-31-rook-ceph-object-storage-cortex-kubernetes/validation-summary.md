# Validation Summary: How to Set Up Ceph Object Storage for Cortex on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RGW (RADOS Gateway / S3-compatible object storage)
- Cortex (multi-tenant Prometheus backend)
- Kubernetes (CephObjectStore CRD, ConfigMap, Helm)
- Prometheus (remote_write configuration)
- AWS CLI (S3-compatible bucket operations)

## Sources Consulted
- Cortex Configuration File Reference — https://cortexmetrics.io/docs/configuration/configuration-file/
- Cortex Blocks Storage documentation — https://cortexmetrics.io/docs/blocks-storage/
- Cortex Compactor documentation — https://cortexmetrics.io/docs/blocks-storage/compactor/
- Cortex HTTP API reference — https://cortexmetrics.io/docs/api/
- Cortex Auth Guide — https://cortexmetrics.io/docs/guides/auth/
- Cortex Helm Chart values.yaml — https://github.com/cortexproject/cortex-helm-chart/blob/master/values.yaml
- Rook CephObjectStore CRD examples — https://github.com/rook/rook/blob/master/deploy/examples/object.yaml
- Rook Object Storage documentation — https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Ceph radosgw-admin man page — https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Prometheus remote_write configuration — https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write

## Issues Found

1. **Missing `alertmanager_storage` configuration**: The post created three buckets (`cortex-blocks`, `cortex-ruler`, `cortex-alertmanager`) but only configured `blocks_storage` and `ruler_storage` in the Cortex config. The `alertmanager_storage` section was missing entirely. Added the `alertmanager_storage` block with the same S3 configuration pattern pointing to the `cortex-alertmanager` bucket.

2. **Invalid Helm `--set` flag**: The Helm install command used `--set config.storage.backend=s3`, but `config.storage.backend` is not a valid values path in the cortex-helm-chart. The chart's values structure mirrors Cortex's own config hierarchy (e.g., `config.blocks_storage.backend`). Since the post already provides a full Cortex configuration via a separate ConfigMap, the `--set` flag was both incorrect and redundant. Removed the flag.

## Review Notes
- The post creates a separate ConfigMap for Cortex config and also deploys via Helm. In practice, the Helm chart generates its own ConfigMap from values. Readers may need to configure the Helm chart to use the external ConfigMap (e.g., via `--set configFromSecret` or a custom values file) rather than relying on the chart's generated config. This is an architectural nuance rather than a technical error.
- The `aws s3 mb` and `aws s3 ls` commands require AWS CLI credentials to be configured (e.g., via `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables) pointing to the Ceph RGW user's keys. This is not shown in the post but is standard practice.
- The `compactor.sharding_enabled: true` field is valid in current Cortex but is required only when running multiple compactor instances. It defaults to `false`.
- The RGW service endpoint uses `rook-ceph-rgw-cortex-store.rook-ceph` (without `.svc`), which resolves correctly within Kubernetes but the fully canonical form is `rook-ceph-rgw-cortex-store.rook-ceph.svc`.
