# Validation Summary: How to Use the ceph osd crush Command Suite

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (CRUSH algorithm, OSD management, balancer module)
- Rook (Kubernetes operator for Ceph)
- crushtool (CRUSH map compilation/decompilation/testing utility)
- kubectl (Kubernetes CLI for accessing Rook toolbox)

## Sources Consulted
- Ceph official documentation: CRUSH map management (https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- Ceph man page for `ceph` CLI commands (https://docs.ceph.com/en/latest/man/8/ceph/)
- Ceph man page for `crushtool` (https://docs.ceph.com/en/latest/man/8/crushtool/)
- Ceph balancer module documentation (https://docs.ceph.com/en/latest/rados/operations/balancer/)
- Ceph pool operations documentation (https://docs.ceph.com/en/latest/rados/operations/pools/)

## Issues Found
1. **Incorrect `crushtool` validation command (line 115):** The original command was `crushtool -t crushmap.bin --test --show-choose-tries`. This had two problems: (a) `-t` is the short form of `--test`, making it redundant with the later `--test` flag, and (b) the input CRUSH map file must be specified with the `-i` flag, not as a positional argument after `-t`. Fixed to `crushtool -i crushmap.bin --test --show-choose-tries`.

## Review Notes
- The CRUSH acronym expansion ("Controlled Replication Under Scalable Hashing") is correct.
- All 18 `ceph` CLI commands were verified as syntactically correct with proper flags and argument ordering.
- The balancer module is enabled by default in newer Ceph releases (Reef+), so the `ceph mgr module enable balancer` command may be unnecessary on recent clusters, but it is still valid and harmless to run.
- The `upmap` balancer mode is the default in modern Ceph; additional modes (`crush-compat`, `read`, `upmap-read`) are available in Reef and later.
- The order of operations for node removal (drain OSDs first, then remove host bucket) is correct and follows best practices.
