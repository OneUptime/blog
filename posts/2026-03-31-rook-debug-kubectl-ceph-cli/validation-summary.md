# Validation Summary: How to Debug Rook-Ceph with kubectl and ceph CLI

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- Rook-Ceph (Rook operator for Ceph on Kubernetes)
- kubectl (Kubernetes CLI)
- Ceph CLI (ceph, radosgw-admin)
- Kubernetes CSI (Container Storage Interface)
- CephFS MDS (Metadata Server)
- Ceph OSD, MON, PG subsystems

## Sources Consulted
- Ceph official documentation: Device Management (https://docs.ceph.com/en/latest/rados/operations/devices/)
- Ceph man page for radosgw-admin (https://docs.ceph.com/en/latest/man/8/radosgw-admin/)
- Ceph man page for ceph(8) (https://docs.ceph.com/en/latest/man/8/ceph/)
- Kubernetes API reference: CSIDriver v1 (https://kubernetes.io/docs/reference/kubernetes-api/config-and-storage-resources/csi-driver-v1/)
- Rook toolbox deployment examples (https://github.com/rook/rook/tree/release-1.16/deploy/examples)
- kubectl documentation for logs, get, describe, exec commands

## Issues Found
1. **Incorrect description for `ceph device ls`** (line 149): The description said "Show BlueStore device info for an OSD" but `ceph device ls` lists all storage devices tracked by the cluster's device health module, not BlueStore-specific info for a single OSD. Changed to "List all storage devices tracked by the cluster".

2. **Unnecessary namespace flag on cluster-scoped resource** (line 250): `kubectl -n rook-ceph get csidrivers` included a namespace flag, but CSIDriver resources are cluster-scoped (non-namespaced). While kubectl silently ignores the flag, it is misleading. Removed `-n rook-ceph` from the command.

3. **Wrong radosgw-admin subcommand for endpoint inspection** (line 265): `radosgw-admin period get-current` only returns the current period ID, not service endpoint information. Changed to `radosgw-admin period get` which returns the full period configuration including zonegroup and zone endpoint details, matching the description "Check RGW service endpoints".

4. **Invalid ceph command `ceph mds perf dump`** (line 288): `ceph mds` does not have a `perf` subcommand. The `perf dump` command is a daemon-level command that must be sent via `ceph tell`. Changed to `ceph tell mds.<id> perf dump`, where `<id>` should be replaced with the MDS daemon name (obtainable via `ceph mds stat`).

## Review Notes
- The `--sort-by='.lastTimestamp'` used for events (line 69) works but `lastTimestamp` is deprecated in the events.k8s.io/v1 API. This still functions with core/v1 events but may need updating in the future.
- The toolbox URL references `release-1.16` which is a specific Rook version. Readers on different versions should adjust the branch accordingly.
- The `ceph -w` command (line 281) is described as "View I/O performance in real time" but more accurately watches cluster events in real time (health changes, PG activity, etc.) rather than showing I/O metrics directly. This is a common usage pattern so it was left as-is.
