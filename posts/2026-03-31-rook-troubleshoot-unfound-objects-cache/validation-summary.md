# Validation Summary: How to Troubleshoot Unfound Objects in Cache Tiers in Ceph

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage)
- Ceph cache tiering
- Ceph PG (Placement Group) management
- Ceph OSD management
- RADOS (Reliable Autonomic Distributed Object Store)

## Sources Consulted
- Ceph official documentation — Control Commands: https://docs.ceph.com/en/latest/rados/operations/control/
- Ceph official documentation — Troubleshooting PGs: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-pg/
- Ceph official documentation — Cache Tiering: https://docs.ceph.com/en/latest/rados/operations/cache-tiering/
- ceph(8) man page: https://manpages.debian.org/testing/ceph-common/ceph.8.en.html

## Issues Found

1. **Invalid `dump_stuck` type "unfound"**: The command `ceph pg dump_stuck unfound` used an invalid stuck type. The valid types for `dump_stuck` are: inactive, unclean, stale, undersized, degraded. Changed to `ceph pg dump_stuck unclean` since PGs with unfound objects will be in an unclean state.

2. **Deprecated `list_missing` subcommand**: The command `ceph pg 2.4 list_missing` was renamed to `ceph pg 2.4 list_unfound` in modern Ceph (Nautilus/Octopus era onward). Updated to use the current command name.

## Review Notes
- Cache tiering was officially deprecated in Ceph Reef (v18.x, August 2023). It remains functional but has no active maintainer and may be removed in a future release. The post's troubleshooting guidance is still valid for clusters running cache tiers, but users should be aware that cache tiering is a deprecated feature.
- The `list_missing` JSON output shown is a simplified illustration; actual Ceph output has a slightly different nested structure, but the example is acceptable for demonstrating the concept.
- All other commands (`ceph health detail`, `ceph osd out/in`, `systemctl start ceph-osd@N`, `mark_unfound_lost revert/delete`, `rados cache-flush-evict-all`, `ceph osd pool create/set`) are correct.
