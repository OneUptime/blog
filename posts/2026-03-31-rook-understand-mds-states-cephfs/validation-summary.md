# Validation Summary: How to Understand MDS States in CephFS

## Status
validated

## Post Type
Reference

## Technologies Covered
- Ceph (CephFS, MDS daemon)
- Rook-Ceph (Kubernetes operator for Ceph)
- Kubernetes (kubectl commands)

## Sources Consulted
- Ceph MDS state machine source code (MDSMap.h) — defines the canonical set of MDS states and transitions
- Ceph official documentation on MDS states: https://docs.ceph.com/en/latest/cephfs/mds-states/
- Ceph CLI reference for `ceph fs set` and `ceph mds fail` commands: https://docs.ceph.com/en/latest/man/8/ceph/

## Issues Found
1. **Missing filesystem name in `down:stopped` description**: The command examples `ceph fs set down true` and `ceph fs fail` were missing the required `<fs_name>` parameter. Fixed to `ceph fs set <fs_name> down true` and `ceph fs fail <fs_name>`.

2. **Incomplete state transition sequences**: Both the healthy startup and failover transition diagrams omitted the `up:rejoin` state between `up:reconnect` and `up:active`. The `up:rejoin` phase is a standard part of the MDS startup sequence where the MDS reintegrates with other active MDS daemons before becoming fully active. Added `up:rejoin` to both transition sequences.

## Review Notes
- All MDS states listed in the post are valid and accurately described against the Ceph MDS state machine.
- The kubectl commands and Rook-Ceph toolbox patterns are correct.
- The `ceph mds fail` command for forcing failover is correct syntax.
- The post could note that `up:resolve` only occurs in multi-active MDS configurations, but the current description is not incorrect.
