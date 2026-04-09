# Validation Summary: How to Configure recovery_priority Per Pool

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (pool recovery priority configuration)
- Rook (CephBlockPool CRD)
- Kubernetes (kubectl exec into toolbox pod)

## Sources Consulted
- [Ceph Pools Documentation (latest)](https://docs.ceph.com/en/latest/rados/operations/pools/) — confirmed recovery_priority range of -10 to 10
- [Ceph Backfill Reservation Internals](https://docs.ceph.com/en/reef/dev/osd_internals/backfill_reservation/) — confirmed recovery_priority affects scheduling order, not bandwidth allocation
- [Ceph OSD Config Reference (reef)](https://docs.ceph.com/en/reef/rados/configuration/osd-config-ref/) — confirmed osd_recovery_max_active and osd_max_backfills options
- [Rook CephBlockPool CRD Documentation](https://rook.io/docs/rook/latest-release/CRDs/Block-Storage/ceph-block-pool-crd/) — confirmed parameters field accepts arbitrary pool properties
- [ceph(8) man page (reef)](https://docs.ceph.com/en/reef/man/8/ceph/) — confirmed ceph pg dump_pools_json is still a valid command

## Issues Found
1. **Step 4 — Incorrect claim about bandwidth allocation**: The original text stated "Higher priority pools get more of the available recovery I/O bandwidth." This is incorrect. `recovery_priority` affects the **scheduling order** of PG recovery (which PGs are dequeued first), not how much I/O bandwidth each pool receives. Fixed to: "PGs from higher priority pools are scheduled for recovery before those from lower priority pools."

2. **Step 5 — Same bandwidth misconception**: The original text stated "Even with throttling, high-priority pools will use more of the available recovery budget." Fixed to: "Even with throttling, PGs from high-priority pools will still be recovered before those from lower-priority pools."

## Review Notes
- The `ceph pg dump_pools_json` command in Step 6 is still valid but is an older form. The more modern approach is `ceph pg dump pools --format json`. The current command still works, so no change was made.
- The `injectargs` approach in Step 5 is a legacy method for runtime config changes. The modern approach is `ceph config set osd osd_recovery_max_active 2`. Both work, so no change was made.
- In modern Ceph (Octopus+), `osd_recovery_max_active` defaults to 0, which causes auto-selection based on device type (3 for HDD, 10 for SSD). Setting it to 2 as shown would override this auto-detection. This is not incorrect but worth noting for readers.
- If the mClock scheduler is active (default in Quincy+), `osd_max_backfills` cannot be changed unless `osd_mclock_override_recovery_settings` is set to true. The post does not mention this caveat.
