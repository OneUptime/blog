# Validation Summary: How to Configure CephX for OSD Authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system)
- CephX (Ceph authentication protocol)
- Ceph OSDs (Object Storage Daemons)
- RBD (RADOS Block Device)
- kubectl / Kubernetes

## Sources Consulted
- Ceph User Management Documentation: https://docs.ceph.com/en/latest/rados/operations/user-management/
- Ceph Auth Config Reference: https://docs.ceph.com/en/latest/rados/configuration/auth-config-ref/
- Rook CephCluster CRD Documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook Advanced Ceph Configuration: https://rook.github.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/
- Ceph ceph-authtool man page: https://docs.ceph.com/en/reef/man/8/ceph-authtool/

## Issues Found

1. **OSD capability syntax: `object_prefix` used equals sign instead of space (line 18)**
   - **Was:** `allow [rwx] [pool=<pool>] [object_prefix=<prefix>] [namespace=<ns>]`
   - **Changed to:** `allow [rwx] [pool=<pool>] [object_prefix <prefix>] [namespace=<ns>]`
   - **Why:** Per Ceph documentation, `object_prefix` uses a space separator, not an equals sign. The post's own example table correctly used `object_prefix rbd_` (with space), contradicting the syntax template.

2. **RBD section incorrectly referenced "class-read" capability (line 73)**
   - **Was:** "For RBD block storage clients, use the class-read capability:"
   - **Changed to:** "For RBD block storage clients, use the `profile rbd` capability:"
   - **Why:** `class-read` is a narrow OSD capability for invoking class read methods. `profile rbd` is a predefined convenience profile that bundles multiple permissions for RBD operations. The code example uses `profile rbd`, not `class-read`, so the text was misleading.

3. **CephCluster config section was `osd` instead of `global`, and values were unquoted (lines 55-59)**
   - **Was:** `osd:` section with unquoted values `cephx`
   - **Changed to:** `global:` section with quoted values `"cephx"`
   - **Why:** `auth_cluster_required` and `auth_service_required` are global-level Ceph configuration options, not OSD-specific. They must be placed under the `global` section. Additionally, Rook documentation specifies that all `cephConfig` values must be quoted strings.

## Review Notes
- The "OSD Key Rotation" section title is somewhat misleading -- it only shows how to view an OSD key (`ceph auth get osd.0`), not how to rotate one. The command itself is correct.
- The verification command `osd dump | grep "^pool"` doesn't specifically confirm that pool access is restricted for the client. `osd dump` shows the full OSD map to any client with mon read access. A more direct verification would be attempting to read/write to an unauthorized pool and confirming access is denied.
- CephX is enabled by default in Ceph/Rook, so explicitly setting `auth_cluster_required` and `auth_service_required` to `cephx` reinforces the defaults rather than changing behavior. This is not incorrect but worth noting for readers.
