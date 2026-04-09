# Validation Summary: How to Fix PG_NOT_DEEP_SCRUBBED Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- Placement Groups (PGs) and deep scrubbing
- Ceph CLI (`ceph health`, `ceph pg`, `ceph osd`, `ceph config`)

## Sources Consulted
- Ceph Reef documentation — Health Checks: https://docs.ceph.com/en/reef/rados/operations/health-checks/
- Ceph Reef documentation — Architecture (scrub vs deep scrub): https://docs.ceph.com/en/reef/architecture/
- Ceph source code — OSD config options (`src/common/options/osd.yaml.in`): https://github.com/ceph/ceph/blob/main/src/common/options/osd.yaml.in
- Ceph source code — PGMap column layout (`src/mon/PGMap.cc`): https://github.com/ceph/ceph/blob/reef/src/mon/PGMap.cc
- Ceph man page (Debian): https://manpages.debian.org/unstable/ceph-common/ceph.8.en.html
- Ceph bug tracker #36720 — `deep_scrub` vs `deep-scrub` syntax: https://tracker.ceph.com/issues/36720
- Ceph PR #6550 — `osd_deep_scrub_randomize_ratio` semantics: https://github.com/ceph/ceph/pull/6550

## Issues Found

### 1. Broken awk commands for parsing `ceph pg dump` output (two occurrences)
- **What was wrong:** The commands used `awk '$23 ...'` to extract `last_deep_scrub_stamp` from `ceph pg dump` plain text output. Column $23 only corresponds to `DEEP_SCRUB_STAMP` on Octopus/Pacific/Nautilus/Luminous; on Quincy/Reef it shifted to $24 due to the added `LOG_DUPS` column. More critically, the timestamps are ISO 8601 strings (e.g., `2024-09-09T19:00:57.739975+0000`), not Unix epoch numbers, so the `systime()` comparison and numeric sort were completely broken.
- **What was changed:** Replaced both awk commands with `ceph pg dump --format=json | jq` pipelines that reliably extract `pgid` and `last_deep_scrub_stamp` fields regardless of Ceph version.
- **Why:** JSON output with jq is version-independent and handles the timestamp format correctly. Lexicographic sort on ISO 8601 strings produces correct chronological ordering.

### 2. Non-existent command `ceph osd pool deep-scrub <pool-name>`
- **What was wrong:** `ceph osd pool deep-scrub` is not a valid Ceph command. The `ceph osd pool` subcommands do not include `deep-scrub`.
- **What was changed:** Replaced with a loop that uses `ceph pg ls-by-pool` to list PGs in the pool and deep-scrubs each one individually via `ceph pg deep-scrub`.
- **Why:** This is the correct way to deep scrub all PGs in a specific pool.

### 3. Invalid command `ceph tell osd.2 deep_scrub`
- **What was wrong:** Two issues: (a) `deep_scrub` uses an underscore instead of a hyphen, and (b) `ceph tell osd.N deep-scrub` is not the standard command for this purpose.
- **What was changed:** Replaced with `ceph osd deep-scrub osd.2`, which is the correct Ceph command to schedule deep scrub for all PGs with their primary on that OSD.
- **Why:** Confirmed via Ceph man page and bug tracker #36720 that the standard command is `ceph osd deep-scrub <osd-id>`.

### 4. Incorrect claim that `osd_deep_scrub_randomize_ratio 0.5` reduces I/O impact
- **What was wrong:** The blog stated setting `osd_deep_scrub_randomize_ratio` to 0.5 "reduces I/O impact of deep scrubs." In reality, this setting controls the probability that a regular scrub is promoted to a deep scrub (default: 0.15 = 15%). Setting it to 0.5 would cause 50% of scrubs to become deep scrubs — significantly *increasing* I/O load, not reducing it.
- **What was changed:** Removed the `osd_deep_scrub_randomize_ratio` line entirely from the "Reduce I/O impact" section. Kept `osd_scrub_sleep 0.1` which does genuinely reduce scrub I/O by adding sleep between operations.
- **Why:** The recommendation was actively harmful — it would increase I/O while telling readers it decreases it. Additionally, this option is deprecated on the Ceph development `main` branch.

## Review Notes
- `osd_scrub_sleep` is ignored when the mClock scheduler is used, which is the default in Ceph Reef (v18.x) and later. The blog does not mention this caveat. Future revisions may want to add a note about this.
- `osd_scrub_load_threshold` (set in Step 4) only affects regular scrubs, not deep scrubs directly. Its placement under "Schedule Deep Scrubs During Off-Peak Hours" is slightly misleading, though regular scrubs can be promoted to deep scrubs, so there is an indirect relationship.
- The description of regular scrub as checking "only metadata" is a common simplification. Regular scrubs actually check object size and metadata across replicas. Deep scrubs additionally read all object data bit-for-bit and verify checksums. The simplification is acceptable for a blog post.
- `osd_deep_scrub_randomize_ratio` is deprecated in the Ceph development branch (future Tentacle release), replaced by `osd_deep_scrub_interval_cv`. This may warrant a version note in future revisions.
