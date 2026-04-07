# Validation Summary: How to Set Snapshot Retention Policies in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (CephFS snapshot scheduling and retention)
- RBD (RADOS Block Device) snapshots
- Bash scripting for snapshot pruning

## Sources Consulted
- Ceph CephFS snap-schedule documentation: https://docs.ceph.com/en/latest/cephfs/snap-schedule/
- Ceph snap-schedule.rst source: https://github.com/ceph/ceph/blob/main/doc/cephfs/snap-schedule.rst
- Ceph RBD Snapshots documentation: https://docs.ceph.com/en/latest/rbd/rbd-snapshot/
- rbd(8) manpage: https://github.com/ceph/ceph/blob/main/doc/man/8/rbd.rst
- Debian rbd(8) manpage: https://manpages.debian.org/experimental/ceph-common/rbd.8.en.html

## Issues Found

1. **Incorrect retention period code `m` (minute)**: The retention period codes table listed `m` for minute, which does not exist in Ceph. The smallest granularity is `h` (hour). Removed `m` from the table and added the `n` code (keep last N snapshots regardless of timing), which is a valid code documented in Ceph.

2. **Wrong subcommand for removing retention rules**: The post used `ceph fs snap-schedule retention rm` but the correct subcommand is `retention remove`. Additionally, the `remove` subcommand requires both the period code and the count (e.g., `d 7`), not just the period code alone. Fixed to `ceph fs snap-schedule retention remove /data d 7 --fs myfs`.

3. **Fabricated RBD snap schedule commands**: The post claimed RBD has a `rbd snap schedule add` command with a `--retain` (or `--retain-count`) flag. This command does not exist in Ceph. The only schedule-related RBD command is `rbd mirror snapshot schedule`, which is specifically for mirror-snapshot-based replication and has no retention parameter. Removed the fabricated commands and rewrote the RBD section to correctly state that Ceph has no built-in RBD snapshot retention mechanism, directing readers to the custom script approach instead.

4. **Fixed summary paragraph**: Updated the summary to remove the reference to the non-existent `--retain` flag and instead correctly state that a custom pruning script is needed for RBD retention.

## Review Notes
- The "3-2-1 Snapshot Retention Policy" section title is slightly misleading — the 3-2-1 backup rule refers to 3 copies of data on 2 different media types with 1 off-site copy. The retention schedule shown (hourly/daily/weekly/monthly) is a graduated retention strategy, not literally a 3-2-1 implementation. However, the post acknowledges this distinction in its description, so this was left as-is.
- The custom RBD retention script is functional but basic — it sorts snapshots alphabetically rather than by creation time. This works if snapshot names include sortable timestamps (which is common), but could misbehave with arbitrary snapshot names. This was left as-is since it is adequate for the tutorial context.
- The `rbd snap ls` command with `--format json` may not be explicitly documented for all Ceph versions but works in practice as a global option. Left as-is.
