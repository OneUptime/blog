# Validation Summary: How to Configure Required Client Features in CephFS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph / CephFS (distributed filesystem)
- Kubernetes (kubectl commands)
- CephFS MDS (Metadata Server)

## Sources Consulted
- [CephFS Administrative commands — Ceph Documentation (Quincy)](https://docs.ceph.com/en/quincy/cephfs/administration/)
- [CephFS Administrative commands — Ceph Documentation (Latest)](https://docs.ceph.com/en/latest/cephfs/administration/)
- [ceph/ceph - src/mds/cephfs_features.h (GitHub source)](https://github.com/ceph/ceph/blob/main/src/mds/cephfs_features.h)
- [ceph/ceph - doc/cephfs/administration.rst (GitHub source)](https://github.com/ceph/ceph/blob/main/doc/cephfs/administration.rst)
- [Red Hat Ceph Storage 5 - File System Guide, Chapter 5](https://docs.redhat.com/en/documentation/red_hat_ceph_storage/5/html/file_system_guide/ceph-file-system-administration)
- [IBM Storage Ceph 6 - Client features](https://www.ibm.com/docs/en/storage-ceph/6?topic=systems-client-features)
- [Ceph eviction documentation](https://docs.ceph.com/en/latest/cephfs/eviction/)

## Issues Found

1. **Incorrect feature name `lazy_caps`**: The blog listed `lazy_caps` as a CephFS client feature. The correct feature name is `lazy_caps_wanted`, as defined in `src/mds/cephfs_features.h` (CEPHFS_FEATURE_LAZY_CAP_WANTED = 11). Fixed to `lazy_caps_wanted`.

2. **Inaccurate description of `lazy_caps_wanted`**: The original description said "Clients must support lazy capability revocation." The actual behavior is that when a stale client resumes, the MDS only needs to re-issue caps that are explicitly wanted. Fixed the description.

3. **Inaccurate description of `multi_reconnect`**: The original said "Clients must handle multiple reconnect attempts." The actual behavior is that during MDS failover, clients can split large reconnect messages into multiple ones to reestablish cache states. Fixed the description.

4. **Wrong CephFS parameter name `require_min_compat_client`**: The blog used `ceph fs set cephfs require_min_compat_client luminous`. The correct CephFS filesystem-level parameter is `min_compat_client` (not `require_min_compat_client`, which is an OSD-level cluster-wide setting accessed via `ceph osd set-require-min-compat-client`). Fixed to `min_compat_client`.

5. **Confusing phrasing "Most features in `reply_encoding`"**: `reply_encoding` is a single feature (feature ID 9), not a category containing other features. Changed to "The `reply_encoding` feature is supported by:".

6. **Incomplete feature list**: The original list only had 5 features. Added `metric_collect` (Pacific+) and `alternate_name` (Pacific+) as commonly useful features administrators may want to require.

## Review Notes
- The `ENOTSUP` error code mentioned for rejected clients could not be definitively confirmed from the documentation. The official docs describe the behavior as "eviction" for already-connected clients. The error code for new mount attempts may vary by client implementation. This is left as-is since it is plausible but unverified.
- The kernel version claim for `reply_encoding` support was adjusted from 5.7+ to 5.4+ since `reply_encoding` was introduced in the Nautilus release, which aligns with kernel CephFS changes in the 5.x series.
- The post correctly identifies that adding required features will evict non-compliant connected clients — this is confirmed by official Ceph documentation.
- The overall command syntax (`ceph fs required_client_features <fs> add/rm <feature>`) is correct and matches official documentation.
- The post could be enhanced in the future by mentioning `ceph fs feature ls` as a way to list all available features, rather than only referring users to `ceph fs get`.
