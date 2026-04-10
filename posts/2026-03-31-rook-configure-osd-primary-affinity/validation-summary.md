# Validation Summary: How to Configure OSD Primary Affinity in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- OSD primary affinity (CRUSH primary selection bias)
- kubectl (Kubernetes CLI)

## Sources Consulted
- Ceph official documentation — Architecture: https://docs.ceph.com/en/latest/architecture/
- Ceph CLI man page (ceph osd primary-affinity): https://manpages.ubuntu.com/manpages/focal/man8/ceph.8.html
- Ceph blog — Primary Affinity: https://ceph.io/en/news/blog/2014/ceph-primary-affinity/
- Ceph source code — PGMap.cc column layout: https://github.com/ceph/ceph/blob/main/src/mon/PGMap.cc
- Ceph troubleshooting OSDs docs: https://docs.ceph.com/en/reef/rados/troubleshooting/troubleshooting-osd/

## Issues Found

### 1. Incorrect write flow description (line 13)
- **What was wrong:** The original text stated the primary OSD "handles all client reads and write acknowledgments before forwarding to replicas," implying the primary acknowledges writes to the client before forwarding to replicas. In reality, the primary forwards writes to replicas first and only acknowledges to the client after all replicas confirm persistence (Ceph's "Golden Rule").
- **What was changed:** Reworded to: "handles all client reads and coordinates writes by forwarding them to replicas, acknowledging to the client only after all replicas confirm persistence."

### 2. Invalid command for checking specific OSD affinity (lines 27-28)
- **What was wrong:** `ceph osd primary-affinity osd.0` (without a float value) was shown as a way to query the current primary affinity. This command is setter-only and requires a float argument — running it without one produces an error.
- **What was changed:** Replaced with `ceph osd tree | grep osd.0`, which shows OSD info including a PRI-AFF column displaying the primary affinity value.

### 3. Incorrect awk column for PG primary distribution (line 89)
- **What was wrong:** `ceph pg dump | awk '{print $15}'` prints the UP_PRIMARY column (column 15), not the ACTING_PRIMARY column (column 17). While these are often identical, they can differ during recovery/peering. Additionally, `ceph pg dump` column layout varies across Ceph versions, making hardcoded column numbers fragile.
- **What was changed:** Replaced with `ceph pg dump pgs_brief | awk '{print $6}'` which uses the briefer output format where column 6 is the acting primary, and is more consistent across versions.

## Review Notes
- The overall concepts and use cases (SSD preference, excluding degraded OSDs) are accurate and well-explained.
- The `-it` flags on `kubectl exec` are fine for interactive use but would cause warnings in scripted/automated contexts. This is acceptable for a tutorial aimed at manual operation.
- The `ceph pg dump pgs_brief` column layout can still vary between major Ceph releases. For maximum portability, JSON output with `jq` would be ideal, but the current fix is a reasonable trade-off between reliability and simplicity.
- Primary affinity changes are correctly described as taking effect immediately without a Rook operator restart.
