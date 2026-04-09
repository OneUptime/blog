# Validation Summary: How to Troubleshoot Ceph Monitors

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Ceph Monitors (mon daemons, Paxos consensus)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl, pod logs)
- NTP/Chrony (time synchronization)
- monmaptool (Ceph monitor map utility)

## Sources Consulted
- Ceph official documentation: Troubleshooting Monitors — https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-mon/
- Ceph official documentation: Monitor Config Reference — https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/
- Ceph official documentation: monmaptool man page — https://docs.ceph.com/en/latest/man/8/monmaptool/
- Ceph official documentation: ceph-mon man page — https://docs.ceph.com/en/latest/man/8/ceph-mon/
- Rook documentation: Ceph Toolbox — https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found

### 1. Incorrect monmap viewing command
- **What was wrong:** The command `ceph mon getmap | monmaptool - --print` attempted to pipe the monmap binary output to `monmaptool` using `-` for stdin. `monmaptool` does not accept `-` as a stdin alias; it requires a file path argument.
- **What was changed:** Replaced with the correct two-step approach: `ceph mon getmap -o /tmp/monmap` followed by `monmaptool /tmp/monmap --print`.
- **Why:** The original command would fail at runtime because `monmaptool` would interpret `-` as a literal filename.

### 2. Fabricated flags and commands in quorum loss recovery section
- **What was wrong:** The recovery procedure used `--single-mon` (not a valid `ceph-mon` flag) and `ceph mon force-quorum` (not a real Ceph command). These would fail if a user attempted to follow the instructions during a real outage.
- **What was changed:** Replaced the entire recovery procedure with the correct documented approach: extract the monmap with `ceph-mon -i <id> --extract-monmap`, remove other monitors from the monmap with `monmaptool --rm`, inject the modified monmap with `ceph-mon -i <id> --inject-monmap`, start the single monitor, then re-add the others.
- **Why:** The `--extract-monmap` / `--inject-monmap` workflow is the official Ceph procedure for recovering from total quorum loss, documented in the Ceph troubleshooting guide.

### 3. Summary referenced non-existent `--single-mon` mode
- **What was wrong:** The summary paragraph referenced "using `--single-mon` mode" which was part of the fabricated recovery procedure.
- **What was changed:** Updated to describe the actual recovery approach: extracting the monmap, reducing it to a single monitor, and injecting it back.
- **Why:** Consistency with the corrected recovery section.

## Review Notes
- The quorum table is correct and clearly presented. The formula used is floor(N/2) + 1 for quorum majority.
- The clock skew threshold of 0.05 seconds (50ms) matches the default `mon_clock_drift_allowed` configuration value.
- Monitor ports 3300 (msgr2 protocol) and 6789 (msgr1 protocol) are correctly identified.
- The compaction configuration options `mon_compact_on_start` and `mon_compact_on_trim` are valid Ceph config keys.
- The Rook/Kubernetes section correctly uses `app=rook-ceph-mon` as the label selector and `deploy/rook-ceph-tools` for the toolbox.
- The `ceph mon add <name> <ip>:6789` syntax uses the v1 (msgr1) port. For clusters using only msgr2, the address format would differ (e.g., `v2:<ip>:3300`), but the post's usage is acceptable for general guidance.
