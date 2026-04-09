# Validation Summary: How to Configure RBD Snapshot-Based Mirroring in Rook

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RBD (RADOS Block Device)
- RBD Mirroring (snapshot-based mode)
- Kubernetes (kubectl, CRDs)
- CephBlockPool CRD

## Sources Consulted
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook pool-mirrored example: https://github.com/rook/rook/blob/master/deploy/examples/pool-mirrored.yaml
- Ceph RBD Mirroring documentation (Reef): https://docs.ceph.com/en/reef/rbd/rbd-mirroring/
- Ceph RBD Mirroring documentation (latest): https://docs.ceph.com/en/latest/rbd/rbd-mirroring/
- Ceph source (rbd-mirroring.rst): https://github.com/ceph/ceph/blob/main/doc/rbd/rbd-mirroring.rst

## Issues Found
No technical issues found.

## Review Notes
- The per-image snapshot schedule command uses a time-only start-time format (`00:00:00-05:00`), while official Ceph CLI documentation shows a full ISO 8601 datetime (e.g., `2020-01-14T11:30+05:30`). In practice, time-only format is commonly used and the Rook CRD itself uses this format in its examples, so this is unlikely to cause issues.
- The status output example uses illustrative field names (`local snapshot timestamp`, `remote snapshot timestamp`) that may not match the exact field names produced by `rbd mirror image status`. The states shown (`up+stopped` for primary, `up+replaying` for secondary) are correct for snapshot-based mirroring.
- The parenthetical in the status example says "on primary, when no active journal" — in snapshot mode there is never a journal, so `up+stopped` is always the normal primary state. A phrasing like "normal for snapshot mode primary" would be slightly more precise, though this does not constitute a technical error.
- The bootstrap import command uses `-it` with stdin redirection (`< bootstrap-token.txt`). The `-t` flag (allocate TTY) can occasionally interfere with piped stdin in some environments. Using `-i` without `-t` would be more robust for commands that read from redirected stdin, though `-it` works in most cases.
