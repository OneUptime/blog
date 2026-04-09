# Validation Summary: How to Check Monitor Status and Quorum in Ceph

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Ceph Monitors (MON) and quorum mechanism
- kubectl (Kubernetes CLI)
- Python 3 (for JSON parsing in CLI pipeline)

## Sources Consulted
- Ceph official documentation on Monitor configuration and quorum (https://docs.ceph.com/en/latest/rados/operations/add-or-rm-mons/)
- Ceph official documentation on monitoring cluster health (https://docs.ceph.com/en/latest/rados/operations/monitoring/)
- Ceph CLI reference for `ceph mon stat`, `ceph quorum_status`, `ceph mon dump`, `ceph time-sync-status`
- Ceph configuration reference for `mon_clock_drift_allowed` (default 0.05s)
- Rook documentation on CephCluster CRD `spec.mon` fields (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook documentation on Ceph toolbox deployment (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)

## Issues Found
1. **Broken sentence in Summary section**: The final sentence read "Monitor `MON_CLOCK_SKEW` health warnings and ensure NTP synchronization across all monitor nodes." — the word "Monitor" was ambiguous and the sentence lacked a proper verb, making it read as a sentence fragment. Changed to "Watch for `MON_CLOCK_SKEW` health warnings..." for clarity.

## Review Notes
- The post states "Ceph requires an odd number of monitors." Technically, Ceph *strongly recommends* an odd number but does not enforce it as a hard requirement. Even numbers work but provide no additional fault tolerance over the next lower odd number. This is a common simplification in documentation and is practically correct advice, so it was left as-is.
- The mon pod READY column shows `2/2`, which is accurate for Rook deployments with log collector sidecars enabled. In minimal Rook configurations without sidecars, this would show `1/1`. This is version/configuration-dependent but not incorrect.
- The `--format json` flag on `ceph quorum_status` is redundant since the command outputs JSON by default, but it is not harmful and makes the intent explicit.
