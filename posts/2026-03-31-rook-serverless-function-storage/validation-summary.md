# Validation Summary: How to Configure Rook-Ceph for Serverless Function Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (RGW object storage, CephFS)
- Kubernetes (PVCs, Secrets, Deployments)
- Knative Serving
- OpenFaaS
- Fission
- AWS CLI (S3-compatible operations)
- radosgw-admin

## Sources Consulted
- Rook Ceph documentation: https://rook.io/docs/rook/latest/
- Ceph RGW configuration reference: https://docs.ceph.com/en/latest/radosgw/config-ref/
- Knative Serving API spec: https://knative.dev/docs/reference/api/serving-api/
- OpenFaaS Function CRD documentation: https://docs.openfaas.com/reference/crd/
- Fission CLI reference: https://fission.io/docs/reference/fission-cli/

## Issues Found

1. **Fission CLI flags fabricated**: The `fission fn create` command used `--archive-url` and `--archive-url-params` flags which do not exist in the Fission CLI. Fission uses `--deploy` for pre-built deployment archives and manages its own internal storage. Replaced with the correct `--deploy` flag and added a note about configuring Fission's storage service to use Ceph as a backend.

2. **Misleading tuning comment**: The comment "Enable object prefetch" was placed above a command that disables `rgw_enable_ops_log`. Disabling the ops log reduces I/O overhead on the RGW but has nothing to do with object prefetch. Corrected the comment to accurately describe what the command does.

3. **OpenFaaS Function CRD structure incorrect**: The Function CRD had `volumes` and `volumeMounts` as top-level fields under `spec`, mimicking a Kubernetes Pod spec. The OpenFaaS Function CRD does not support these fields directly. Updated to show the correct CRD structure and added guidance on how to mount volumes via OpenFaaS profiles or custom templates.

## Review Notes
- The `radosgw-admin user create` command hardcodes access and secret keys in plaintext. In production, omitting `--access-key` and `--secret-key` lets RGW auto-generate them, which is more secure.
- The Knative Service YAML is structurally correct for the `serving.knative.dev/v1` API.
- The CephFS PVC with `ReadWriteMany` and `rook-cephfs` StorageClass is correct for shared filesystem access.
- The `rgw_max_chunk_size` tuning to 1MB is a valid configuration for smaller object workloads.
