# Validation Summary: How to Check etcd Cluster Health in Talos Linux

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- Talos Linux
- talosctl CLI
- etcd
- Kubernetes
- Bash scripting

## Sources Consulted
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux etcd subcommands reference (talosctl etcd members, alarm list/disarm, defrag, status, snapshot)
- Talos Linux talosctl health, services, logs, dmesg command references
- etcd official documentation on storage quota, alarms (NOSPACE/CORRUPT), and the compact vs. defragment distinction
- etcd hardware recommendations (fsync/backend commit latency targets)

## Issues Found
- **Defrag vs. compact terminology mix-up**: In the "Resolving the NOSPACE Alarm" section, the comment read "First, compact the etcd database to reclaim space" but the command shown is `talosctl etcd defrag`. In etcd these are two distinct operations: *compaction* removes old key revisions from history, while *defragmentation* reclaims free disk space in the bbolt backend file. The comment was updated to say "defragment" so it accurately matches the command. (The procedure itself is correct for Talos, where Kubernetes auto-compacts etcd, so the manual step needed for NOSPACE is defrag followed by alarm disarm.)

## Review Notes
- All `talosctl` commands referenced (`services`, `health`, `etcd members`, `etcd alarm list`, `etcd alarm disarm`, `etcd defrag`, `etcd status`, `etcd snapshot`, `dmesg`, `logs etcd`) are valid in current Talos Linux releases, and all flags shown (`--nodes`, `--follow`, `--wait-timeout`) are supported.
- The etcd quorum table values (1/3/5/7-node clusters tolerating 0/1/2/3 failures) are correct.
- The 2 GiB default storage quota figure is correct.
- The "disk latency under 10 ms" guidance aligns with etcd's recommended targets for fsync and backend commit latencies (99th percentile).
- The `talosctl etcd snapshot <path> --nodes <ip>` syntax is correct; note that for HA snapshots users typically want to take them off the leader, but the post's simpler guidance is reasonable for a beginner audience.
- No version-specific caveats; the commands shown have been stable across recent Talos Linux versions.
