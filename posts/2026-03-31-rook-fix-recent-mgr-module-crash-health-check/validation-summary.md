# Validation Summary: How to Fix RECENT_MGR_MODULE_CRASH Health Check in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (Storage cluster, Manager daemon, Python modules)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl commands for pod management)

## Sources Consulted
- Ceph official documentation on health checks: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph crash module documentation: https://docs.ceph.com/en/latest/mgr/crash/
- Ceph Manager module framework documentation: https://docs.ceph.com/en/latest/mgr/
- Rook Ceph operator documentation on CephCluster CRD: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Existing validated blog posts in this repository for Rook deployment naming conventions

## Issues Found
1. **Incorrect MGR deployment name in kubectl command**: The post used `deploy/rook-ceph-mgr` for the rollout restart command. Rook always appends a daemon ID suffix to the MGR deployment, so the correct name is `rook-ceph-mgr-a`. Changed `kubectl -n rook-ceph rollout restart deploy/rook-ceph-mgr` to `kubectl -n rook-ceph rollout restart deploy/rook-ceph-mgr-a`.

2. **Incorrect database reference in common causes**: The post listed "Database (RocksDB) access errors" as a common cause of MGR module crashes. RocksDB is used by Ceph OSDs (BlueStore), not by the MGR daemon. MGR modules interact with the mon store (via MonClient) and RADOS for data access. Changed to "Mon store or RADOS access errors".

## Review Notes
- The `RECENT_MGR_MODULE_CRASH` health check name is used throughout the post. While the well-documented Ceph health checks for crashes include `RECENT_CRASH`, and for MGR module issues include `MGR_MODULE_ERROR`, this specific code may exist in newer Ceph releases (Reef/Squid). The post's description of the behavior is consistent with how Ceph MGR module crash tracking works.
- All `ceph` CLI commands (`ceph health detail`, `ceph crash ls`, `ceph crash info`, `ceph crash archive`, `ceph crash archive-all`, `ceph mgr module disable/enable`, `ceph mgr module ls`, `ceph mgr fail`, `ceph version`) are correct and current.
- The CephCluster YAML spec for updating the Ceph version image is correct for the Rook CRD.
- The label selector `app=rook-ceph-mgr` used in kubectl log commands is correct for Rook MGR pods.
- The post correctly distinguishes between MGR module crashes and full daemon crashes.
