# Validation Summary: How to Configure Ceph Storage for Government and Public Sector

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph) v1.16.0
- Ceph v19.2.0 (Squid)
- Ceph CSI v3.13.0
- HashiCorp Vault (KMS integration)
- Ceph RGW (RADOS Gateway / S3-compatible object storage)
- Kubernetes (Helm, CRDs, ConfigMaps)
- Docker (image mirroring for air-gapped deployments)
- AWS CLI (S3 API for bucket logging)

## Sources Consulted
- Rook Helm chart values.yaml for v1.16.0: https://github.com/rook/rook/blob/v1.16.0/deploy/charts/rook-ceph/values.yaml
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook Key Management System documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/key-management-system/
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Rook CRD Go type definitions: https://github.com/rook/rook/blob/master/pkg/apis/ceph.rook.io/v1/types.go
- Rook objectstore.go reconciliation logic: https://github.com/rook/rook/blob/master/pkg/operator/ceph/object/objectstore.go
- Ceph radosgw-admin man page: https://github.com/ceph/ceph/blob/main/doc/man/8/radosgw-admin.rst
- Ceph Bucket Logging documentation: https://docs.ceph.com/en/latest/radosgw/bucket_logging/
- Ceph blog on S3 Bucket Logging API: https://ceph.io/en/news/blog/2025/enhancing-object-storage-logging/
- Ceph RGW Admin Guide (quotas): https://docs.ceph.com/en/latest/radosgw/admin/

## Issues Found

### 1. Invalid Helm chart value for CSI image (air-gapped section)
**What was wrong:** `--set csi.rbdPluginImage=${INTERNAL_REGISTRY}/cephcsi/cephcsi:v3.12.0` — the key `csi.rbdPluginImage` does not exist in the Rook Helm chart. The CSI image is also v3.12.0, but Rook v1.16.0 bundles v3.13.0.
**What was changed:** Replaced with `--set csi.cephcsi.repository=${INTERNAL_REGISTRY}/cephcsi/cephcsi` and `--set csi.cephcsi.tag=v3.13.0`, which are the correct Helm value keys.
**Why:** The original key would be silently ignored by Helm, meaning the CSI image would not actually be overridden — a critical issue for air-gapped deployments.

### 2. Vault KMS encryption configured in wrong resource with incorrect keys
**What was wrong:** The blog configured Vault KMS settings as flat key-value pairs in the `rook-ceph-operator-config` ConfigMap. This is not how Rook reads Vault configuration. Additionally, several key names were wrong: `VAULT_AUTH_MOUNT_PATH` (does not exist), `VAULT_ROLE` (should be `VAULT_AUTH_KUBERNETES_ROLE`), `VAULT_TLS_CA_CERT` (should be `VAULT_CACERT`), and `VAULT_SECRET_ENGINE` was missing entirely.
**What was changed:** Replaced the ConfigMap with a CephCluster CRD snippet using `spec.security.kms.connectionDetails` with correct key names (`VAULT_AUTH_KUBERNETES_ROLE`, `VAULT_CACERT`, `VAULT_SECRET_ENGINE`).
**Why:** The original configuration would not work — Rook does not read Vault connection details from the operator ConfigMap. The CephCluster CRD `security.kms` section is the correct location for OSD-level encryption configuration.

### 3. CephObjectStore missing required pool configuration
**What was wrong:** The CephObjectStore YAML only specified `gateway` fields but omitted `metadataPool` and `dataPool`. Without these, the Rook operator fails reconciliation with "CR store pools are missing" on fresh deployments.
**What was changed:** Added `metadataPool` and `dataPool` with `replicated.size: 3` (appropriate for government data durability requirements).
**Why:** The object store would never become ready without pool definitions.

### 4. Invalid radosgw-admin bucket logging commands
**What was wrong:** `radosgw-admin bucket logging enable` and `radosgw-admin bucket logging get` are not valid subcommands. Bucket logging is configured via the S3 PutBucketLogging API, not the radosgw-admin CLI.
**What was changed:** Replaced with `aws s3api put-bucket-logging` and `aws s3api get-bucket-logging` commands using the S3 API, which is the officially documented method.
**Why:** The original commands would fail with an unrecognized subcommand error.

### 5. Missing quota enable step
**What was wrong:** After `radosgw-admin quota set`, the quota must be explicitly enabled with `radosgw-admin quota enable`. Without this, the quota has no effect.
**What was changed:** Added the `radosgw-admin quota enable --quota-scope user --uid agency-dod-user` command.
**Why:** Setting a quota without enabling it is a no-op; the user would have no storage limits enforced.

## Review Notes
- Rook v1.16.0 and Ceph v19.2.0 (Squid) are valid releases but are now several versions behind current (Rook v1.19.x, Ceph v20.x/v21.x). The post may benefit from a version update in the future.
- The S3 bucket policy using `aws:SecureTransport` is standard S3 policy syntax and is correctly supported by Ceph RGW.
- The Msgr2 network encryption configuration is correct and uses the proper CephCluster CRD field paths.
- The `radosgw-admin user create` and `radosgw-admin quota set` commands are syntactically correct with valid flags.
- Bucket logging was introduced as a Technology Preview in Ceph Squid 19.2.2 and became fully supported in Tentacle 20.2.0. Since the post references Ceph v19.2.0, bucket logging may not be available at that exact version.
- For FIPS 140-2 compliance, users would also need to ensure their Ceph and Vault binaries are compiled with FIPS-validated cryptographic modules, which is beyond Rook configuration alone.
