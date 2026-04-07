# Validation Summary: How to Troubleshoot MDS CPU Usage Spikes

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph MDS (Metadata Server)
- CephFS (Ceph File System)
- Kubernetes (kubectl, pod resource management)

## Sources Consulted
- Ceph official documentation on MDS administration: https://docs.ceph.com/en/latest/cephfs/administration/
- Ceph MDS configuration reference: https://docs.ceph.com/en/latest/cephfs/mds-config-ref/
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Filesystem/ceph-filesystem-crd/
- Ceph `ceph tell` vs `ceph daemon` usage: https://docs.ceph.com/en/latest/rados/operations/monitoring/

## Issues Found

1. **`ceph daemon` used from toolbox pod instead of `ceph tell`** (lines 41, 45, 54, 72): The post used `ceph daemon mds.myfs.a` commands executed from the `rook-ceph-tools` deployment. `ceph daemon` connects via the local admin socket and only works from within the daemon's own container. From the toolbox pod, the correct command is `ceph tell`, which sends the command over the Ceph monitor. Changed all four occurrences of `ceph daemon` to `ceph tell`.

2. **`ops` subcommand incorrect** (line 42): The subcommand `ops` is not the standard MDS admin command for dumping in-flight operations. The correct command is `dump_ops_in_flight`. Changed `ceph daemon mds.myfs.a ops` to `ceph tell mds.myfs.a dump_ops_in_flight`.

3. **`wc -l` for counting sessions** (line 46): Piping JSON output through `wc -l` gives the number of lines, not the number of sessions. Since `ceph tell mds.X session ls` returns a JSON array, `jq length` is the correct way to count sessions. Changed `wc -l` to `jq length`.

## Review Notes
- The `mds_recall_state_timeout` default is 60s in many Ceph versions, so setting it to 60 may be a no-op depending on the version. Users should check their current value with `ceph config get mds mds_recall_state_timeout` before changing it.
- The `num_leases` field used in the session analysis script may be less informative than `num_caps` for identifying heavy metadata clients, but both are valid fields in the session output.
- The `mds_reconnect_timeout` default is 45 seconds; setting it to 60 as shown would actually increase the window, which is correctly described as spreading reconnects over a longer period.
