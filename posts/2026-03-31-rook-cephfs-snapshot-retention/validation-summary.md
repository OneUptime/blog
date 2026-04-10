# Validation Summary: How to Set Snapshot Retention Policies for CephFS in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph / CephFS
- Ceph `snap_schedule` manager module
- Kubernetes (kubectl)

## Sources Consulted
- [Snapshot Scheduling Module -- Ceph Documentation (latest)](https://docs.ceph.com/en/latest/cephfs/snap-schedule/)
- [Snapshot Scheduling Module -- Ceph Documentation (reef)](https://docs.ceph.com/en/reef/cephfs/snap-schedule/)
- [Ceph snap_schedule source code (schedule.py)](https://github.com/ceph/ceph/blob/main/src/pybind/mgr/snap_schedule/fs/schedule.py)
- [Ceph snap-schedule documentation source (snap-schedule.rst)](https://github.com/ceph/ceph/blob/main/doc/cephfs/snap-schedule.rst)
- [Monitoring a Cluster -- Ceph Documentation](https://docs.ceph.com/en/reef/rados/operations/monitoring/)

## Issues Found

1. **Incorrect interval code `m` for minutes (line 35)**: The post listed `m` (minutes) as a supported retention interval code. According to official Ceph documentation and source code, `m` is an undocumented developer-testing feature, not a user-facing interval. Replaced with the officially documented `n` code (keep last N snapshots regardless of timing), which was missing from the list.

2. **Wrong command for viewing retention details (line 57)**: The sample JSON output containing `created_count` and `pruned_count` fields was attributed to the `ceph fs snap-schedule list` command. These fields are returned by the `ceph fs snap-schedule status` command, not `list`. Changed the command to `status`.

3. **Misleading `ceph df detail` explanation (lines 112-113)**: The post claimed the difference between USED and STORED columns in `ceph df detail` reflects snapshot overhead. According to Ceph monitoring documentation, the POOLS section numbers are notional and explicitly do not account for snapshots. The USED vs STORED difference primarily reflects replication overhead. Corrected the explanation to note this limitation.

4. **Summary section referenced wrong command**: The closing summary referenced `ceph fs snap-schedule list` for monitoring pruning; updated to `ceph fs snap-schedule status` for consistency with the fix above.

## Review Notes
- The `retention add` and `retention remove` command syntax is correct, including the use of `--fs` as a keyword argument.
- The `.snap` directory explanation is accurate -- CephFS scheduled snapshots appear as directories named `scheduled-YYYY-MM-DD-HH_MM_SS`.
- The module enable/verify commands using `kubectl exec` into `rook-ceph-tools` are the standard Rook pattern and are correct.
- The `ceph fs snap-schedule list` command does exist and is valid for listing schedule configurations, but it returns a different data structure than what was shown in the sample output. Users should use `status` for the detailed view with counts.
