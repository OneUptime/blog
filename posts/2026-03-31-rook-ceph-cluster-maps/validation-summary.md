# Validation Summary: How to Understand Ceph Cluster Maps (Monitor, OSD, PG, CRUSH, MDS)

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl CLI)
- CRUSH algorithm (Controlled Replication Under Scalable Hashing)
- CephFS / MDS (Metadata Server)

## Sources Consulted
- Ceph official documentation on cluster maps and architecture: https://docs.ceph.com/en/latest/architecture/
- Ceph official documentation on monitoring: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph official documentation on CRUSH maps: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph official documentation on PG states: https://docs.ceph.com/en/latest/rados/operations/pg-states/
- Rook documentation on the Ceph toolbox: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
No technical issues found.

## Review Notes
- The `ceph mds stat` command still works but newer Ceph releases also offer `ceph fs status` as a more user-friendly alternative. Both are valid.
- The kubectl exec commands use `rook-ceph-tools` as the pod name, which is the standard convention in Rook documentation. In practice, the actual pod name may include a random suffix (e.g., `rook-ceph-tools-abc123`), but this is a common and accepted simplification.
- All five cluster maps are correctly identified and described in accordance with Ceph's architecture documentation.
- The CRUSH map extraction command pipeline (`getcrushmap` + `crushtool -d`) is the standard approach documented by Ceph.
