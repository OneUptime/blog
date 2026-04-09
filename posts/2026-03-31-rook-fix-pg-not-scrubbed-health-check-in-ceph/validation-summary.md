# Validation Summary: How to Fix PG_NOT_SCRUBBED Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- Placement Groups (PGs)
- OSD scrubbing and deep scrubbing

## Sources Consulted
- Ceph Health Checks documentation: https://docs.ceph.com/en/reef/rados/operations/health-checks/
- Ceph OSD Config Reference: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Ceph Architecture documentation (scrubbing section): https://docs.ceph.com/en/latest/architecture/
- Ceph man page (ceph(8)): https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph source code (osd.yaml.in) for config defaults: https://github.com/ceph/ceph/blob/main/src/common/options/osd.yaml.in
- Ceph test suite (cephtool/test.sh) for command validation: https://github.com/ceph/ceph/blob/main/qa/workunits/cephtool/test.sh

## Issues Found

### 1. Incorrect `ceph pg dump` parsing with awk (two occurrences)
- **What was wrong:** The commands `ceph pg dump | awk '$22 < (systime() - 604800) {print $1, $22}'` and `ceph pg dump | grep -v "^pg" | awk '{print $1, $22}' | sort -k2 -n | head -20` had multiple problems: (a) column `$22` is not the correct column for `last_scrub_stamp` — the actual position varies by Ceph version and is around column 19; (b) `ceph pg dump` outputs timestamps in ISO 8601 format, not Unix epoch seconds, so comparing with awk's `systime()` is invalid; (c) columns containing arrays (like UP and ACTING) can break awk field splitting; (d) `grep -v "^pg"` won't match the header which starts with uppercase `PG_STAT`.
- **What was changed:** Replaced both commands with `ceph pg dump -f json | jq` equivalents that reliably parse JSON output using the `.last_scrub_stamp` field.
- **Why:** JSON output is stable across Ceph versions and avoids column-position and timestamp-format issues.

### 2. Incorrect command to scrub all PGs on a specific OSD
- **What was wrong:** `ceph tell osd.2 scrub` is not a documented or valid command for triggering scrubs on all PGs of an OSD.
- **What was changed:** Replaced with `ceph osd scrub 2`, which is the documented command to initiate scrubs on all PGs belonging to a specific OSD.
- **Why:** `ceph osd scrub <id>` is the correct CLI command per the Ceph man page. `ceph tell osd.N` is used for admin-socket commands, not for initiating scrubs.

## Review Notes
- The `osd_scrub_chunk_max` value is set to `25` in the tuning section. The Ceph default is `15`. This is a valid tuning choice for increasing scrub aggressiveness, but readers should be aware it exceeds the default.
- The `osd_scrub_min_interval` and `osd_scrub_max_interval` values shown (86400 and 604800) match the Ceph defaults, so those lines are effectively no-ops unless the values were previously changed. They serve as documentation of recommended values.
- The description of scrub as comparing "object metadata across replicas" is slightly simplified. The official docs describe it as checking "object size and attributes." This is close enough for a blog post and was not changed.
