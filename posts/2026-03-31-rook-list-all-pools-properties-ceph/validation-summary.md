# Validation Summary: How to List All Pools and Their Properties in Ceph

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (storage cluster CLI)
- Rook (Ceph operator for Kubernetes, referenced in tags)
- CRUSH (Ceph's data placement algorithm)
- Erasure coding profiles
- PG autoscaling

## Sources Consulted
- Ceph official documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph CLI reference for `ceph osd pool` subcommands: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph erasure code profile documentation: https://docs.ceph.com/en/latest/rados/operations/erasure-code-profile/
- Ceph PG autoscaler documentation: https://docs.ceph.com/en/latest/rados/operations/placement-groups/#autoscaling-placement-groups

## Issues Found
No technical issues found.

## Review Notes
- The `ceph osd lspools` output format varies across Ceph versions. In older versions (pre-Pacific), output was comma-delimited on a single line, which would break the application-tags shell script. The script works correctly with modern Ceph (Pacific, Quincy, Reef) where output is one pool per line.
- The `ceph df | grep -A 100 "POOLS"` command uses an arbitrary line count of 100. This works in practice but could miss pools on very large clusters or print extra lines. An alternative like `ceph df detail` or `ceph osd pool ls detail` could be more precise, but the command as written is functional.
- The sample output code block is labeled as `yaml`, which is close but not strictly accurate — the actual output is a custom key-value format. This is a cosmetic choice and does not affect correctness.
- All commands are current and non-deprecated as of Ceph Reef (18.x).
