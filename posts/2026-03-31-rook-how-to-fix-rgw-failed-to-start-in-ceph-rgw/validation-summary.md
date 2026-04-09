# Validation Summary: How to Fix 'rgw failed to start' in Ceph RGW

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph RADOS Gateway (RGW)
- Rook-Ceph Operator
- Kubernetes (kubectl)
- CephObjectStore Custom Resource
- Ceph authentication (cephx keyrings)
- S3-compatible object storage

## Sources Consulted
- Rook official documentation: CephObjectStore CRD spec (https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/)
- Ceph official documentation: RGW configuration and administration (https://docs.ceph.com/en/latest/radosgw/)
- Ceph official documentation: cephx authentication and capabilities (https://docs.ceph.com/en/latest/rados/operations/user-management/)
- Ceph official documentation: Pool management (https://docs.ceph.com/en/latest/rados/operations/pools/)

## Issues Found
1. **Missing `mgr` capability in keyring creation command (Step 3)**: The `ceph auth get-or-create` command was missing the `mgr 'allow rw'` capability. Starting with Ceph Quincy (v17), the mgr daemon enforces authorization more strictly, and RGW requires `mgr 'allow rw'` caps to function correctly. Without it, certain RGW operations may fail. Added `mgr 'allow rw'` to the command.

2. **Misleading `-o` flag in keyring creation command (Step 3)**: The original command included `-o /etc/ceph/ceph.client.rgw.my-store.keyring`, which writes the keyring file to the **tools pod's** filesystem. In Rook-Ceph, the RGW pod receives its keyring via a Kubernetes Secret mounted by the Rook operator, not from a file in the tools pod. The `-o` flag was removed because it is ineffective in this context and could mislead users into thinking the keyring file output is what the RGW pod uses.

## Review Notes
- The `ceph osd lspools` command used in Step 2 and the Summary is a valid alias but is considered legacy. The modern equivalent is `ceph osd pool ls`. Both work, so this is not a technical error.
- Step 4 describes RGW binding to "a port on the node," which is slightly misleading in a Kubernetes pod networking context. RGW binds within the pod; node-level port conflicts are only relevant when using `hostNetwork: true`. This is an acceptable simplification for a troubleshooting guide.
- The manual pool creation in Step 2 creates only 4 of the 6 listed pools. This is correct because `default.rgw.buckets.index` and `default.rgw.buckets.data` are created on-demand when the first bucket is created, and are not required for RGW startup.
- The expected `curl` response showing `ListAllMyBucketsResult` for an unauthenticated request is the default behavior for most Ceph RGW configurations, though some hardened setups may return `AccessDenied`.
- The recommendation to delete and recreate the CephObjectStore is the preferred Rook-native approach and is correctly positioned as an alternative to manual pool creation.
