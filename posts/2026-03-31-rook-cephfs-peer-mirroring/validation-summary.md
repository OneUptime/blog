# Validation Summary: How to Configure CephFS Peer Cluster for Mirroring in Rook

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph / CephFS
- CephFS Snapshot Mirroring
- Kubernetes (Secrets, CRDs)
- CephFilesystem CRD
- CephFilesystemMirror CRD

## Sources Consulted
- Rook CephFS Mirroring documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Shared-Filesystem-CephFS/filesystem-mirroring/
- Rook CephFilesystem CRD specification: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook CephFilesystemMirror CRD specification: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-fs-mirror-crd/
- Ceph CephFS Snapshot Mirroring documentation: https://docs.ceph.com/en/latest/cephfs/cephfs-mirroring/
- Ceph Snapshot Scheduling Module documentation: https://docs.ceph.com/en/latest/cephfs/snap-schedule/
- Ceph FS Volumes and Subvolumes documentation: https://docs.ceph.com/en/latest/cephfs/fs-volumes/

## Issues Found

1. **`peer_bootstrap create` missing required `site-name` parameter**: The command `ceph fs snapshot mirror peer_bootstrap create myfs-replica client.mirror-primary` was missing the required `site-name` positional argument. Added `primary-site` as the site name parameter.

2. **Bootstrap token example used wrong field names**: The example token JSON used `client_auth_key` which is not a real field in the bootstrap token. The correct field name is `key`. The token was also missing the `user` and `site_name` fields that are present in real bootstrap tokens. Fixed all three occurrences (command output example, base64 encoding example, and declarative Secret).

3. **`snapshotRetention` used non-existent `prefix` field**: The Rook CephFilesystem CRD `snapshotRetention` entries support `path` and `duration` fields only. The `prefix` field does not exist in the CRD. Changed `prefix: "hourly"` / `prefix: "daily"` to `path: "/"` / `path: "/critical-data"` with their respective durations.

4. **`CephFilesystemMirror` used invalid `spec.count` field**: The CephFilesystemMirror CRD does not have a `count` field in its spec. Valid spec fields are `placement`, `annotations`, `labels`, `resources`, and `priorityClassName`. Changed to `spec: {}` (empty spec uses defaults).

5. **`ceph fs snapshot mirror status` incorrect command**: The correct command for checking mirror daemon status is `ceph fs snapshot mirror daemon status myfs`, not `ceph fs snapshot mirror status myfs`. Fixed in the verification section.

6. **`peer list` and `peer remove` used spaces instead of underscores**: The Ceph CLI canonical form uses underscores: `peer_list` and `peer_remove`. While Ceph's CLI parser may accept both forms, the documented form uses underscores. Fixed `peer list` → `peer_list` and `peer remove` → `peer_remove` in both the verification and removal sections.

7. **`ceph fs snapshot schedule` is not a valid command**: The correct Ceph module command is `ceph fs snap-schedule`, not `ceph fs snapshot schedule`. Fixed both `snap-schedule list` and `snap-schedule status` commands.

## Review Notes
- The overall architecture and workflow described (generate bootstrap token on secondary, create Secret on primary, reference in CephFilesystem CR) is correct and follows Rook best practices.
- The Mermaid sequence diagram accurately represents the peering flow.
- The CephFilesystem CRD YAML for both primary and secondary clusters is correct (apiVersion, kind, pool specs, metadataServer config).
- The `ceph fs subvolume snapshot ls` verification command syntax is correct.
- The `mirroring.peers.secretNames` and `mirroring.snapshotSchedules` fields in the CephFilesystem CR are correct per the Rook CRD.
- The post covers the end-to-end flow well, including setup, verification, and teardown (peer removal).
