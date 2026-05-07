# Validation Summary: How to Restore Container Checkpoints with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- CRIU
- Linux container checkpoint and restore
- Shell scripting
- Python JSON parsing

## Sources Consulted
- Podman `container restore` official documentation: https://docs.podman.io/en/latest/markdown/podman-container-restore.1.html
- Podman `container checkpoint` official documentation: https://docs.podman.io/en/stable/markdown/podman-container-checkpoint.1.html
- Podman checkpoint tutorial: https://podman.io/docs/checkpoint
- Podman `top` official documentation: https://docs.podman.io/en/latest/markdown/podman-top.1.html
- Podman global `--log-level` documentation: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- Podman source for checkpoint import and volume behavior: https://github.com/containers/podman
- CRIU Podman integration notes: https://www.criu.org/Podman

## Issues Found
- The "Restore Without Activating Network" section incorrectly described `--ignore-static-ip` and `--ignore-static-mac` as disabling networking. Updated it to explain that these flags only prevent reuse of static IP and MAC addresses from the original container.
- The `--name` restore option was shown without mentioning its incompatibility with `--tcp-established`. Added notes in both name-restore sections because Podman documents that `--name` cannot be combined with `--tcp-established`.
- Checkpoint examples created `.tar.gz` archives without specifying gzip compression. Current Podman defaults exported checkpoint archive compression to zstd, so `--compress=gzip` was added where the post creates `.tar.gz` files.
- The volume conflict guidance said to create missing volumes first. Podman restores named volume contents by default and fails if a same-named volume already exists, so the section now explains named-volume conflicts, `--ignore-volumes`, and bind-mount path requirements.
- The checkpoint metadata parsing snippet used the wrong JSON fields. Replaced it with a snippet that reads `namedVolumes` from `config.dump` and bind mounts from `spec.dump`.
- The validation script used `podman top "$CONTAINER" -o pid`; Podman documents format descriptors after the container name, so this was corrected to `podman top "$CONTAINER" pid`.
- The troubleshooting commands implied a fixed `/tmp/criu-restore.log` file and a `criu` systemd unit. Replaced them with a documented Podman debug restore using `--keep` to preserve CRIU artifacts.
- The rollback script described a running-state check as a health check. Updated the text and comment to say it checks whether the new container is running.
- The introduction and conclusion overpromised exact network preservation and zero-downtime migration. Adjusted the wording to "supported network state" and "low-downtime migrations" to match checkpoint/restore caveats.

## Review Notes
Podman checkpoint and restore support remains environment-sensitive. Rootful containers, compatible kernels, compatible CRIU versions, matching architectures, compatible runtimes, and suitable network configuration are still important operational caveats. The post now reflects the documented CLI behavior, but real restore success still depends on the container workload and host configuration.
