# Validation Summary: How to Upgrade from Ceph Reef to Squid

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Ceph (Reef 18.x, Squid 19.x)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl)
- Helm

## Sources Consulted
- Rook official documentation on Ceph upgrades: https://rook.io/docs/rook/latest/Upgrade/ceph-upgrade/
- Ceph release naming and versioning: https://docs.ceph.com/en/latest/releases/
- Rook CephCluster CRD specification: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph Squid (19.x) release notes: https://docs.ceph.com/en/latest/releases/squid/

## Issues Found
- **Incorrect daemon upgrade order**: The post stated the Rook operator upgrades daemons in the order "MGR, MON, OSD, MDS, RGW". The correct order is "MON, MGR, OSD, MDS, RGW" — Monitors (MON) are upgraded first, followed by Managers (MGR), then OSDs, MDS, and RGW. Fixed on line 87.

## Review Notes
- The Rook version (v1.16.0) and Ceph image tag (v19.2.0) are reasonable but readers should always check the latest Rook-Ceph compatibility matrix before upgrading, as newer patch releases may be available.
- The post mentions "rollback options" in its description but does not actually cover rollback procedures. This is not a technical error but could be improved in a future revision.
- The post does not mention running `ceph osd require-osd-release squid` after the upgrade completes, which is a recommended post-upgrade step to prevent accidental downgrades. This could be added in a future update.
