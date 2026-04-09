# Validation Summary: How to List Pools with ceph osd pool ls and ceph osd lspools in Ceph

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (storage cluster)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl exec for toolbox access)
- Python 3 (scripting examples)

## Sources Consulted
- Ceph official documentation — Monitoring OSDs and PGs: https://docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/
- Ceph official documentation — Pools: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph man page (ceph.8): https://manpages.debian.org/unstable/ceph-common/ceph.8.en.html
- Ceph bug #40287 / PR #28488 — pool_id field in `osd pool ls` JSON output: https://tracker.ceph.com/issues/40287
- Ceph PR #16955 — `osd pool application get` command implementation: https://github.com/ceph/ceph/pull/16955
- Ceph PR #21353 — pool type numeric mapping (1=replicated, 3=erasure): https://github.com/ceph/ceph/pull/21353

## Issues Found

### Issue 1: Incorrect claim that `ceph osd pool ls` and `ceph osd lspools` produce identical output
**What was wrong:** The post stated both commands are a "Legacy alias - identical output" and that "Both commands output the pool ID and pool name." In reality, `ceph osd pool ls` outputs only pool names (one per line, no IDs), while `ceph osd lspools` outputs pool IDs and names together in a comma-separated format.
**What was changed:** Corrected the descriptions and provided separate example output blocks for each command showing their actual output formats.
**Why:** Per the official Ceph docs at docs.ceph.com/en/reef/rados/operations/monitoring-osd-pg/, `ceph osd lspools` shows "pool numbers and their names," while `ceph osd pool ls` lists pool names only.

### Issue 2: Broken application filtering shell script
**What was wrong:** The script used `ceph osd pool application get $pool` and echoed the result with `echo "$app: $pool"`, then piped to `grep "^rbd"`. Since `ceph osd pool application get` returns JSON (e.g., `{"rbd": {}}`), the grep for `^rbd` would never match.
**What was changed:** Replaced the script with a working version that uses `grep -q '"rbd"'` to check the JSON output and prints the pool name only on match.
**Why:** Per Ceph PR #16955, `ceph osd pool application get <pool>` returns native JSON output like `{"rbd": {}}`, not plain text.

### Issue 3: Incorrect `application` field in `ceph osd pool get` output
**What was wrong:** The example output for `ceph osd pool get rbd-ec-data all` included `application: rbd`. The `ceph osd pool get` command shows pool configuration parameters only; application metadata is managed separately via `ceph osd pool application get`.
**What was changed:** Removed the `application: rbd` line from the example output.
**Why:** Application tags are a separate namespace accessed via `ceph osd pool application get/enable/disable`, not a standard pool configuration parameter returned by `ceph osd pool get`.

## Review Notes
- The JSON scripting example correctly uses type=1 for replicated and type=3 for erasure coded pools, which matches Ceph's internal representation.
- The `ceph osd pool ls detail --format json` command uses `pool_id` as the field name; this field was added in Ceph Nautilus 14.2.x (PR #28488). Older versions may not include it in JSON output.
- The `ceph df` output format shown is representative but will vary by Ceph version and cluster configuration.
- The Rook toolbox kubectl command is correct for current Rook versions.
