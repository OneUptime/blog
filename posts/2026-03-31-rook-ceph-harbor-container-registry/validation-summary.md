# Validation Summary: How to Set Up Ceph for Harbor Container Registry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Harbor (cloud-native container registry)
- Rook-Ceph (Ceph orchestrator for Kubernetes)
- Ceph RGW (RADOS Gateway / S3-compatible object storage)
- Ceph RBD (block storage for PVCs)
- Kubernetes
- Helm
- Docker
- AWS CLI (for S3-compatible operations)

## Sources Consulted
- Harbor Helm chart values.yaml: https://github.com/goharbor/harbor-helm/blob/main/values.yaml
- Harbor installation documentation: https://goharbor.io/docs/
- Rook-Ceph RGW documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- radosgw-admin CLI reference: https://docs.ceph.com/en/latest/radosgw/admin/

## Issues Found

1. **`regionEndpoint` field name was incorrect (camelCase vs lowercase)**
   - **What was wrong:** The Harbor Helm values used `regionEndpoint` (camelCase) for the S3 region endpoint field.
   - **What was changed:** Changed to `regionendpoint` (all lowercase).
   - **Why:** The Harbor Helm chart uses all-lowercase field names for S3 storage driver configuration, matching the Docker Distribution storage driver convention. Using camelCase would cause the value to be silently ignored, resulting in Harbor failing to connect to the Ceph RGW endpoint.

2. **Database, Redis, and Trivy storageClass paths were incorrectly structured**
   - **What was wrong:** StorageClass was configured under `database.internal.storageClass`, `redis.internal.storageClass`, and `trivy.storageClass`.
   - **What was changed:** Moved storageClass settings under `persistence.persistentVolumeClaim.database.storageClass`, `persistence.persistentVolumeClaim.redis.storageClass`, and `persistence.persistentVolumeClaim.trivy.storageClass`. Kept `database.type: internal` and `redis.type: internal` as separate top-level entries for clarity.
   - **Why:** The Harbor Helm chart centralizes all PVC storage class configuration under the `persistence.persistentVolumeClaim` section. The paths `database.internal.storageClass` and `redis.internal.storageClass` do not exist in the chart and would be silently ignored, causing PVCs to use the cluster's default storage class instead of Ceph RBD.

3. **Unnecessary `harbor-chartmuseum` bucket creation**
   - **What was wrong:** The bucket creation loop created both `harbor-registry` and `harbor-chartmuseum` buckets.
   - **What was changed:** Removed the `harbor-chartmuseum` bucket creation, keeping only `harbor-registry`.
   - **Why:** ChartMuseum was deprecated and removed from Harbor (starting with v2.8). Modern Harbor stores Helm charts as OCI artifacts through the registry. The values.yaml in the post did not configure a separate ChartMuseum bucket, so creating one was misleading.

4. **Missing AWS CLI credential configuration for S3 commands**
   - **What was wrong:** The `aws s3 mb` commands were used without setting AWS credentials, which are required to authenticate against the Ceph RGW endpoint.
   - **What was changed:** Added `export AWS_ACCESS_KEY_ID=harborakey` and `export AWS_SECRET_ACCESS_KEY=harborskey` before the `aws s3 mb` command.
   - **Why:** Without these environment variables (or an AWS CLI profile), the `aws s3` commands would fail with authentication errors when connecting to the Ceph RGW endpoint.

## Review Notes
- The `aws s3` commands use the Kubernetes internal service DNS name (`rook-ceph-rgw-my-store.rook-ceph:80`), which is only resolvable from within the cluster. Users running these commands from outside the cluster would need to set up `kubectl port-forward` first or use an externally accessible endpoint.
- The post uses `Harbor12345` as the default admin password in examples. This is Harbor's default, but a production deployment should change this immediately.
- The replication API example assumes a destination registry with `id: 1` is already configured. Users would need to first register the destination registry via the Harbor API or UI.
- The verification `aws s3 ls` command in the "Verify Harbor is Using Ceph Storage" section also requires the same AWS credential exports shown in the setup section.
