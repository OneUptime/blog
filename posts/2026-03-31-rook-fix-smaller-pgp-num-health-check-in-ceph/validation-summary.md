# Validation Summary: How to Fix SMALLER_PGP_NUM Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph orchestrator for Kubernetes)
- Ceph Placement Groups (pg_num, pgp_num)
- Ceph health checks (SMALLER_PGP_NUM)
- Bash scripting (batch fix)

## Sources Consulted
- Ceph official documentation — Placement Groups: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Red Hat Ceph Storage — PG Command Line Reference: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/1.2.3/html/storage_strategies/pg-command-line-reference
- Ceph source code — `ceph osd dump` output format for pool lines
- Ceph Bug Tracker #20559 — crush_ruleset renamed to crush_rule in Luminous: https://tracker.ceph.com/issues/20559

## Issues Found
1. **Incorrect `awk` field positions in "Check all pools" command (line 35):** The original command `awk '{print $3, $7, $9}'` used wrong field numbers. In `ceph osd dump` output, `$7` is the literal string `min_size` and `$9` is `crush_rule`, not the pg_num and pgp_num values. Fixed to `awk '{print $3, $14, $16}'` which correctly extracts the pg_num value ($14) and pgp_num value ($16).

2. **Incorrect `awk` field positions in batch fix script (lines 92-94):** Same issue as above — the batch script used `$7` and `$9` to extract pg_num and pgp_num values. Fixed to `$14` and `$16` respectively.

3. **Missing quote stripping for pool names in batch fix script (line 92):** Pool names in `ceph osd dump` output are enclosed in single quotes (e.g., `'rbd'`). When passed directly to `ceph osd pool set`, the literal quotes would cause the command to fail. Added `| tr -d "'"` to strip quotes from the pool name before use.

## Review Notes
- The fixed field positions ($14 for pg_num, $16 for pgp_num) are correct for the standard `ceph osd dump` output format across modern Ceph versions (Luminous through Reef). The field ordering (pool, id, name, type, size, size_value, min_size, min_size_value, crush_rule, crush_rule_value, object_hash, hash_value, pg_num, pg_num_value, pgp_num, pgp_num_value) has been consistent across these versions.
- In Ceph Nautilus (14.x) and later, the `pg_autoscaler` module is available and often enabled by default. When `pg_autoscale_mode` is set to `on`, Ceph automatically manages both `pg_num` and `pgp_num`, making this SMALLER_PGP_NUM warning rare. The post's manual fix approach remains valid for clusters with autoscaling disabled or in `warn` mode.
- In Ceph Pacific (16.x) and later, setting `pg_num` can automatically trigger `pgp_num` adjustment, further reducing the likelihood of this mismatch. The manual procedure described is still correct for older clusters or edge cases.
- All other technical claims, commands, and explanations in the post are accurate.
