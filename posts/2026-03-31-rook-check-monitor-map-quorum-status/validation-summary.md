# Validation Summary: How to Check Monitor Map and Quorum Status in Ceph

## Status
validated

## Post Type
Tutorial / Diagnostic Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system) - Reef release (v18)
- Ceph Monitor (mon) subsystem
- Paxos consensus protocol (Ceph's monitor election mechanism)
- kubectl (Kubernetes CLI)
- monmaptool (Ceph monitor map utility)

## Sources Consulted
- Ceph official documentation: Monitor commands (`ceph mon dump`, `ceph mon stat`, `ceph quorum_status`) - https://docs.ceph.com/en/reef/rados/operations/monitoring/
- Ceph official documentation: Monitor bootstrap and monmap - https://docs.ceph.com/en/reef/rados/operations/add-or-rm-mons/
- Ceph official documentation: `ceph-mon` daemon options including `--extract-monmap` - https://docs.ceph.com/en/reef/man/8/ceph-mon/
- Ceph official documentation: `monmaptool` utility - https://docs.ceph.com/en/reef/man/8/monmaptool/
- Rook documentation: Ceph toolbox - https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Ceph official documentation: `ceph tell` command - https://docs.ceph.com/en/reef/rados/operations/monitoring/#using-the-command-line

## Issues Found
1. **Monmap extraction script - command scope error**: In the "Comparing Monmap Epoch Across Monitors" section, the shell `&&` operator after the `kubectl exec` command caused the `monmaptool --print /tmp/monmap` to execute on the local machine rather than inside the pod. Since the `/tmp/monmap` file is created inside the pod by `ceph-mon --extract-monmap`, the `monmaptool` command would fail locally (file not found) or read the wrong file. Fixed by wrapping the entire command chain in `bash -c "..."` so both `ceph-mon --extract-monmap` and `monmaptool --print` execute inside the pod.

## Review Notes
- The `ceph-mon --extract-monmap` approach requires exec-ing into individual monitor pods (not the toolbox), which is correctly shown but requires the user to know the pod suffix. The `<suffix>` placeholder makes this clear.
- The `election_strategy: classic` in the sample `ceph mon dump` output is used as an illustrative label. In actual Ceph Reef output, this field may display as a numeric value (1 for classic, 2 for disallow, 3 for connectivity). This is acceptable since the output is explicitly labeled as "sample output."
- The "Viewing per-Monitor Health" section uses `ceph health detail`, which shows cluster-wide health details (including monitor-related warnings) rather than strictly per-monitor metrics. The section title is slightly misleading but the command itself is correct and useful for the stated diagnostic purpose.
- All commands correctly use the `deploy/rook-ceph-tools` deployment target for the Rook toolbox, which is the standard approach in Rook v1.x+.
