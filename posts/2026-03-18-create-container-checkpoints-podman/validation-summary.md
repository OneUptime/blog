# Validation Summary: How to Create Container Checkpoints with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- CRIU
- Container checkpoint and restore
- Linux containers
- Flask
- Bash

## Sources Consulted
- Podman checkpoint guide: https://podman.io/docs/checkpoint
- Podman `podman-container-checkpoint` man page: https://docs.podman.io/en/stable/markdown/podman-container-checkpoint.1.html
- Podman `podman-container-restore` man page: https://docs.podman.io/en/latest/markdown/podman-container-restore.1.html
- Podman `podman-export` man page: https://docs.podman.io/en/v5.2.3/markdown/podman-export.1.html
- CRIU advanced usage notes: https://criu.org/Advanced_usage
- CRIU file locks documentation: https://criu.org/File_locks
- CRIU TCP connection documentation: https://criu.org/TCP_connection

## Issues Found
- The prerequisites described rootless checkpointing as having limited support. Podman's current checkpoint guide says checkpoints currently work with root containers only, so the post now says to run the container and checkpoint commands with `sudo`.
- The prerequisites did not mention the CRIU 3.11 minimum from Podman's checkpoint guide. Added the minimum version.
- The support check used `grep -i checkpoint`, which is not the relevant feature indicator in `podman info`. Updated it to check for CRIU support.
- Several examples exported files named `.tar.gz` without `--compress=gzip`. Current Podman documents `--compress` as controlling exported archive compression and shows gzip explicitly for `.tar.gz`, so the affected commands now include `--compress=gzip`.
- The `--leave-running` section presented live snapshots as generally safe. CRIU warns that leaving tasks running can make restores inconsistent when files or TCP state change, so the post now includes that caveat.
- The troubleshooting section suggested `journalctl -u criu`, but CRIU is not generally used as a systemd service for these Podman operations. Updated it to use Podman's `--keep` option and inspect generated CRIU logs.
- The conclusion claimed zero-downtime migration. Checkpoint/restore generally involves stopping or carefully managed snapshots, so this was changed to container migration.

## Review Notes
The commands were reviewed against official documentation. Podman and CRIU were not installed in this workspace, so commands could not be executed locally.
