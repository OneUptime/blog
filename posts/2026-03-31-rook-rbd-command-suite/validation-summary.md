# Validation Summary: How to Use the rbd Command Suite

## Status
validated

## Post Type
Reference / Command guide

## Technologies Covered
- Ceph RADOS Block Device (RBD) CLI
- Rook-Ceph (Kubernetes operator for Ceph)
- Kubernetes CSI (Container Storage Interface) for RBD
- kubectl

## Sources Consulted
- Ceph official documentation: RBD command reference (https://docs.ceph.com/en/latest/rbd/rados-rbd-cmds/)
- Ceph man page: rbd(8) — covers all subcommands, flags, and syntax
- Ceph source code: `src/tools/rbd/action/Perf.cc` — confirmed `rbd perf image iostat` subcommand exists (not in man page but functional)
- Rook documentation: Rook toolbox usage (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)

## Issues Found
- **Incorrect `export-diff` command**: The comment said "Export only changes since a snapshot (differential)" but the command `rbd export-diff replicapool/myvolume@snap1 /tmp/diff.img` exports all data regions up to that snapshot in diff format — it does not export only the changes *since* a snapshot. To export incremental changes since a snapshot, the `--from-snap` flag is required. Fixed the command to `rbd export-diff --from-snap snap1 replicapool/myvolume /tmp/diff.img` and updated the comment to say "incremental diff" for clarity.

## Review Notes
- The `--size` flag for `rbd create` and `rbd resize` uses MiB by default (not MB). The values 10240, 20480, and 5120 correctly correspond to ~10GiB, ~20GiB, and ~5GiB respectively. The blog says "10GB/20GB/5GB" which follows the same loose convention used in the official Ceph docs.
- The `--image-feature` flag is correctly singular. Multiple features require repeating the flag (e.g., `--image-feature layering --image-feature exclusive-lock`).
- `rbd perf image iostat` is a valid command confirmed in Ceph source code, though it is not documented in the rbd(8) man page. It works and accepts `--pool`.
- `rbd snap protect` / `rbd snap unprotect` are not deprecated and remain required before cloning snapshots as of current Ceph versions.
- The Kubernetes PVC volume handle format description ("cluster-id:pool-id:image-id") is a simplified conceptual description. The actual CSI volume handle uses hyphens as separators, but this is acceptable for a guide-level explanation.
