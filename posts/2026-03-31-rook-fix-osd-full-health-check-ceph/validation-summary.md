# Validation Summary: How to Fix OSD_FULL Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Emergency Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- OSD (Object Storage Daemon) management
- RADOS (Reliable Autonomic Distributed Object Store)
- Ceph RGW (RADOS Gateway)
- Kubernetes (for Rook CRD configuration)
- Erasure coding in Ceph

## Sources Consulted
- Ceph official documentation on OSD full ratio and health checks (https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/)
- Ceph OSD management commands (https://docs.ceph.com/en/latest/rados/operations/control/)
- Rook CephCluster CRD reference (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Ceph RADOS command reference (https://docs.ceph.com/en/latest/man/8/rados/)
- Ceph pool management documentation (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Ceph compression documentation (https://docs.ceph.com/en/latest/rados/configuration/bluestore-config-ref/#inline-compression)
- Kubernetes resource quantity format (https://kubernetes.io/docs/reference/kubernetes-api/common-definitions/quantity/)

## Issues Found
No technical issues found.

## Review Notes
- The `ceph osd df | awk '$8 > 90 {print}'` command assumes `%USE` is the 8th column in `ceph osd df` output. This is version-dependent: in Ceph versions with the CLASS column but without detailed DATA/OMAP/META breakdown columns, `$8` correctly targets `%USE`. In newer releases (Quincy/Reef) that include additional columns, the `%USE` column shifts to a higher position. Since the post does not target a specific Ceph version, this is acceptable but readers on newer Ceph versions may need to adjust the column number.
- The erasure coded pool creation uses explicit PG counts (`32 32`). Modern Ceph versions support PG autoscaling, so explicit PG counts are still valid but the autoscaler may adjust them after creation.
- The post correctly warns not to raise `full_ratio` above 0.99, which is sound operational advice.
