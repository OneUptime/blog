# Validation Summary: How to Use Rook-Ceph for Container Image Registry Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (CephObjectStore CRD, RADOS Gateway)
- Kubernetes (Deployments, Services, Secrets)
- Harbor container registry (Helm chart configuration)
- Docker Distribution registry (registry:2)
- AWS CLI (S3-compatible operations)
- radosgw-admin CLI

## Sources Consulted
- Rook-Ceph CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Rook-Ceph RGW service naming conventions (service name follows `rook-ceph-rgw-<store-name>` pattern)
- Harbor Helm chart values reference: https://github.com/goharbor/harbor-helm
- Docker Distribution registry S3 storage driver configuration: https://distribution.github.io/distribution/storage-drivers/s3/
- Kubernetes Deployment spec: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- radosgw-admin user management: https://docs.ceph.com/en/latest/radosgw/admin/
- AWS CLI S3 API reference for bucket versioning: https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-versioning.html

## Issues Found

1. **Inconsistent RGW service endpoint in bucket creation command**: The CephObjectStore is named `registry-store`, which means the RGW service would be `rook-ceph-rgw-registry-store`. However, the `aws s3 mb` command referenced `rook-ceph-rgw-my-store` (a different, non-existent store name). Fixed the endpoint to `rook-ceph-rgw-registry-store.rook-ceph.svc.cluster.local:80`.

2. **Missing pod template labels in Docker Distribution Deployment**: The Deployment's `spec.selector.matchLabels` required `app: registry`, but the pod template was missing the `metadata.labels` section entirely. Without matching labels, Kubernetes would reject the Deployment. Added `metadata.labels` with `app: registry` to the pod template.

## Review Notes
- The post correctly uses `ceph.rook.io/v1` API version for the CephObjectStore CRD.
- Harbor Helm values use correct field names (`imageChartStorage`, `regionendpoint`, `v4auth`, etc.) consistent with the Harbor Helm chart.
- Docker Distribution env vars (`REGISTRY_STORAGE`, `REGISTRY_STORAGE_S3_*`) correctly follow the registry's environment variable configuration pattern.
- The post wisely stores S3 credentials in a Kubernetes Secret for the Docker Distribution deployment, though the Harbor example uses inline values (acceptable for a Helm values file that would typically be managed securely).
- The `radosgw-admin user create` command syntax is correct, including `--uid`, `--display-name`, `--access-key`, and `--secret-key` flags.
- Bucket versioning via `aws s3api put-bucket-versioning` is correctly demonstrated for RGW's S3-compatible API.
