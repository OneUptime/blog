# Validation Summary: How to Understand Deprecated Features in Ceph Reef

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph Reef (18.x)
- Rook Ceph Operator
- Kubernetes
- CephFS MDS
- RBD Mirroring
- BlueStore / FileStore OSD backends

## Sources Consulted
- Ceph Reef (18.2.x) release notes: https://docs.ceph.com/en/reef/releases/reef/
- Ceph documentation on MDS standby configuration: https://docs.ceph.com/en/reef/cephfs/standby/
- Ceph documentation on BlueStore migration: https://docs.ceph.com/en/reef/rados/operations/bluestore-migration/
- Ceph ceph-disk removal history (removed in Nautilus 14.x): https://docs.ceph.com/en/nautilus/releases/nautilus/
- Rook documentation on CephCluster CRD: https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/

## Issues Found

1. **ceph-disk incorrectly listed as a Reef deprecation**: The post stated that `ceph-disk`-based OSD creation is deprecated in Reef. In reality, `ceph-disk` was deprecated in Luminous (12.x) and fully removed in Nautilus (14.x) — it has been absent for several major releases by the time Reef shipped. Replaced this section with the FileStore OSD backend deprecation, which is the actual relevant Reef-era deprecation for OSD storage.

2. **Incorrect command for checking OSD deployment method**: The original command `ceph osd metadata | grep osd_objectstore` was framed as checking the "OSD deployment method" (ceph-disk vs ceph-volume), but `osd_objectstore` reports the backend type (bluestore vs filestore), not the provisioning tool. Updated the command and context to correctly frame this as checking the OSD backend type, and added `jq` processing for cleaner output.

3. **Summary updated**: Changed "ceph-disk OSD creation" to "FileStore OSD backend" in the summary paragraph to match the corrected section.

## Review Notes
- The `mds_standby_for_name` deprecation is accurate for Reef, though these options were originally deprecated earlier (Luminous era) and Reef continues to warn about them. The post's framing is acceptable.
- The RBD mirroring bootstrap token format deprecation claim is loosely documented; the command shown is correct but the specific "old format deprecated in Reef" claim is not strongly sourced. It is not technically wrong, just imprecise.
- The `ceph config dump` audit approach and `ceph health detail` grep are both valid and useful techniques.
- The Rook CRD check command is correct but the suggestion to "compare against Rook v1.14+" could benefit from a specific documentation link in a future update.
