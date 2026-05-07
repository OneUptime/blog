# Validation Summary: How to Migrate Running Containers with Podman CRIU

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- CRIU
- Linux containers
- Container checkpoint and restore
- Container live migration
- Bash scripting
- SSH, SCP, and rsync

## Sources Consulted
- Podman checkpoint documentation: https://podman.io/docs/checkpoint
- Podman `podman-container-checkpoint` official man page: https://docs.podman.io/en/latest/markdown/podman-container-checkpoint.1.html
- Podman `podman-container-restore` official man page: https://docs.podman.io/en/latest/markdown/podman-container-restore.1.html
- CRIU live migration documentation: https://criu.org/Live_migration
- CRIU Podman integration documentation: https://www.criu.org/Podman

## Issues Found
- The post described Podman/CRIU migration as "zero-downtime." Podman checkpointing stops the container while writing state unless using leave-running/pre-checkpoint modes, and real migrations still have a pause window. Changed these claims to "low-downtime" or "minimal downtime."
- The checkpoint description said it captures "network" and "filesystem" as a broad full-state snapshot. Updated it to clarify that exported checkpoints capture process state, memory, namespaces, established TCP connections when requested, and root filesystem changes unless `--ignore-rootfs` is used.
- The basic examples used `.tar.gz` filenames while current Podman defaults exported checkpoint compression to zstd. Changed examples to `.tar.zst`.
- The downtime reduction section incorrectly used `--leave-running` as a pre-copy/delta migration mechanism. Replaced it with Podman's documented `--pre-checkpoint`, `--with-previous`, and `--import-previous` workflow, including the soft-dirty/runtime caveat.
- The automated script used `set -e` with a separate `$?` check after `ssh`, which would exit before the custom error message on failure. Rewrote that check as `if ! ssh ...; then`.
- The automated script's destination name-conflict check could exit under `set -e` when `grep` found no match. Added `|| true` and used exact-name matching with `grep -Fx`.
- The volume section incorrectly said checkpoint only captures container state and not volume data. Podman exported checkpoints include associated volume contents by default unless `--ignore-volumes` is used. Updated the text and example to explicitly use `--ignore-volumes` when syncing volume data separately.
- The network limitation understated TCP restore requirements. Updated it to mention that original addresses must be available on the destination for restored TCP sockets.

## Review Notes
Podman/CRIU checkpoint and restore support remains sensitive to kernel, runtime, cgroup, networking, and workload details. The examples are technically aligned with current official documentation, but production use should still include environment-specific migration tests.
