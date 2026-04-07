# Validation Summary: How to Configure Storage Selection (useAllNodes, useAllDevices) in Rook

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes (CRD configuration)
- OSD (Object Storage Daemon) provisioning

## Sources Consulted
- Rook official documentation: CephCluster CRD storage configuration (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook GitHub repository: CephCluster storage spec definitions
- Rook documentation on OSD placement and device discovery

## Issues Found
1. **Fabricated taint name `ceph-osd-preexist`**: The post listed "Does not have a `ceph-osd-preexist` taint" as a condition for node eligibility when `useAllNodes: true`. This taint does not exist in Rook. Node eligibility is controlled via the `placement` field in the CephCluster CRD, which uses standard Kubernetes scheduling primitives (nodeAffinity, tolerations, podAffinity). Fixed by replacing the fabricated taint reference with accurate information about `placement` constraints.

## Review Notes
- The YAML configuration snippets are all structurally correct and use valid CephCluster CRD field names.
- The `deviceFilter` regex patterns are accurate and represent common real-world patterns.
- The `osdsPerDevice` explanation is correct — it partitions the device to create multiple OSDs.
- The discovery pod label `app=rook-discover` is correct for current Rook versions, though users should verify against their specific Rook version as the discover DaemonSet behavior has evolved across releases.
- The device eligibility criteria (no filesystem, no partition table, not mounted) are accurate for Rook's automatic device detection logic.
