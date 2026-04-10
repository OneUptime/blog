# Validation Summary: How to Use Ceph RGW as Backup Target for Velero

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook-Ceph (RADOS Gateway / RGW)
- Velero (Kubernetes backup tool)
- AWS CLI (for S3-compatible bucket operations)
- Kubernetes (kubectl, Secrets, CRDs)
- radosgw-admin CLI
- Velero Schedule CRD (velero.io/v1)

## Sources Consulted
- Velero official documentation: https://velero.io/docs/
- Velero AWS plugin documentation: https://github.com/vmware-tanzu/velero-plugin-for-aws
- Ceph radosgw-admin documentation: https://docs.ceph.com/en/latest/radosgw/admin/
- Rook-Ceph Object Store documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Velero Schedule API reference: https://velero.io/docs/main/api-types/schedule/
- kubectl create secret documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
1. **Step 3 - Incorrect file path in kubectl command**: The credentials file is created at `/tmp/velero-credentials` (absolute path), but the `kubectl create secret` command referenced `./tmp/velero-credentials` (relative path with `./` prefix). This path mismatch would cause the command to fail with a "file not found" error. Fixed to use `/tmp/velero-credentials`.

## Review Notes
- **Redundant secret creation in Step 3**: The `kubectl create secret` command in Step 3 creates a secret named `velero-s3-credentials`, but the `velero install --secret-file` command in Step 4 automatically creates its own secret (`cloud-credentials`) from the same file. The manually created secret would go unused. This isn't technically wrong but could confuse readers. Additionally, if the `velero` namespace doesn't exist yet (it's typically created by `velero install`), the `kubectl create secret --namespace velero` command would fail. Users following this guide sequentially should either create the namespace first (`kubectl create namespace velero`) or skip the `kubectl create secret` command since `velero install` handles it.
- **Step 2 assumes AWS CLI credentials are configured**: The `aws s3 mb` command requires the access key and secret key from Step 1 to be configured (e.g., via `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` environment variables or `aws configure`). This isn't explicitly mentioned.
- **Plugin version**: `velero/velero-plugin-for-aws:v1.9.0` is a valid version. Users should check for the latest compatible version at the time of use.
- The `radosgw-admin user create --caps` command grants broad admin capabilities (`buckets=*;users=*`) that exceed what Velero needs for S3 operations. For production use, a more restrictive set of permissions would be advisable.
- The `s3ForcePathStyle=true` requirement is correctly noted — Ceph RGW requires path-style S3 access rather than virtual-hosted-style.
- The Velero Schedule YAML is correct: `includedNamespaces: ["*"]` is the proper wildcard for all namespaces, and `ttl: 720h` (30 days) is a valid Go duration format.
