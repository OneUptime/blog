# Validation Summary: How to Fix POOL_PG_NUM_NOT_POWER_OF_TWO Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- CRUSH algorithm (Ceph's data placement algorithm)
- PG Autoscaler (Ceph manager module)

## Sources Consulted
- Ceph Health Checks documentation: https://docs.ceph.com/en/reef/rados/operations/health-checks/
- Ceph Architecture documentation: https://docs.ceph.com/en/reef/architecture/
- Ceph PR #30525 (health alert for non-power-of-two pg_num): https://github.com/ceph/ceph/pull/30525
- Ceph PR #30689 (Nautilus backport): https://github.com/ceph/ceph/pull/30689
- Ceph PR #29364 (pg_num should always be a power of two): https://github.com/ceph/ceph/pull/29364
- Ceph Blog - New in Nautilus: PG Merging and Autotuning: https://ceph.io/en/news/blog/2019/new-in-nautilus-pg-merging-and-autotuning/
- Ceph Placement Groups documentation: https://docs.ceph.com/en/reef/rados/operations/placement-groups/

## Issues Found

### 1. Incorrect explanation of why power-of-two matters (Medium)
**What was wrong:** The post stated "Ceph uses a modulo operation to map PG IDs to CRUSH buckets." This is inaccurate on two counts: (a) the operation maps objects to PGs, not PG IDs to CRUSH buckets, and (b) Ceph uses bit-masking, not modulo.
**What was changed:** Corrected to "Ceph uses a bit-masking operation to map objects to placement groups" with an accurate explanation of how non-power-of-two values require remapping.

### 2. Step 3 (manual pgp_num update) is unnecessary on Nautilus+ (High)
**What was wrong:** The post instructed readers to manually set `pgp_num` to match `pg_num`. Since Ceph Nautilus, `pgp_num` automatically tracks `pg_num` changes. Since the warning itself was introduced in Nautilus, every reader encountering this issue is on Nautilus+, making this step always unnecessary for the target audience.
**What was changed:** Added "(Pre-Nautilus Only)" to the step title and a note explaining that `pgp_num` auto-tracks on Nautilus+. Updated the summary paragraph accordingly.

### 3. Misleading pg_num_target get/set commands (Medium)
**What was wrong:** The post used `ceph osd pool get my-pool pg_num_target` and `ceph osd pool set my-pool pg_num_target 128` as if `pg_num_target` is a user-facing pool property. In practice, `pg_num_target` is an internal value managed by the autoscaler. The correct way to check autoscaler targets is `ceph osd pool autoscale-status`.
**What was changed:** Replaced with `ceph osd pool autoscale-status` for checking targets, and `ceph osd pool set my-pool pg_num 128` for overriding.

## Review Notes
- The `ceph osd dump | grep "^pool" | awk '{print $3, $14}'` command uses hardcoded field positions that may vary across Ceph versions or pool types (replicated vs erasure coded). This is a minor fragility but acceptable for a quick diagnostic command.
- The post correctly identifies that the warning was introduced in Ceph Nautilus. More precisely, it was introduced in v14.2.5 via backport PR #30689.
- All other commands (`ceph health detail`, `ceph osd pool set`, `ceph mgr module enable pg_autoscaler`, etc.) are valid and documented.
