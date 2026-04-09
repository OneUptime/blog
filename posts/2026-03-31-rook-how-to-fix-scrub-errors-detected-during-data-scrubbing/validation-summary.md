# Validation Summary: How to Fix 'scrub errors' Detected During Data Scrubbing

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Ceph scrubbing and deep scrubbing
- RADOS (Reliable Autonomic Distributed Object Store)
- kubectl (Kubernetes CLI)
- smartctl (SMART disk health monitoring)

## Sources Consulted
- Ceph official documentation on scrubbing: https://docs.ceph.com/en/latest/rados/operations/health-checks/#scrub-errors
- Ceph official documentation on PG repair: https://docs.ceph.com/en/latest/rados/operations/pg-repair/
- Ceph official documentation on pool flags (`set`/`unset`): https://docs.ceph.com/en/latest/rados/operations/pools/#set-pool-values
- Ceph official documentation on `rados list-inconsistent-obj`: https://docs.ceph.com/en/latest/man/8/rados/
- Ceph official documentation on scrub scheduling options: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/

## Issues Found
1. **Incorrect `nodeep-scrub` pool flag syntax (Step 7):**
   - **What was wrong:** The command `ceph osd pool set <pool-name> nodeep-scrub false` used incorrect syntax. The `nodeep-scrub` is a pool flag managed via `set` (to enable the flag, disabling deep scrub) and `unset` (to remove the flag, enabling deep scrub). Passing `false` as a value is not valid for pool flag operations.
   - **What was changed:** Replaced `ceph osd pool set <pool-name> nodeep-scrub false` with `ceph osd pool unset <pool-name> nodeep-scrub`.
   - **Why:** The `unset` subcommand is the correct way to remove a pool flag in Ceph. Using `set ... false` would either error or not behave as intended.

## Review Notes
- The `ceph tell osd.* injectargs` approach for setting scrub scheduling parameters works but is a runtime-only change that does not persist across OSD restarts. For persistent configuration, `ceph config set osd osd_scrub_begin_hour 2` (available in Ceph Nautilus and later) is the preferred modern approach. The post's approach is not wrong, but readers should be aware of the persistence limitation.
- The post correctly warns about data loss when manually deleting corrupted objects in Step 5. This is an important caveat.
- All kubectl commands correctly target the `rook-ceph` namespace and the `rook-ceph-tools` deployment, which is the standard Rook toolbox pattern.
- The SMART health indicators listed (reallocated sectors, pending sectors, uncorrectable sectors) are the correct key indicators for disk health assessment.
