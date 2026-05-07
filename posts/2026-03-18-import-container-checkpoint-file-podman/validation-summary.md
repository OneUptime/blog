# Validation Summary: How to Import a Container Checkpoint from a File with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- CRIU
- Linux containers
- Container checkpoint and restore
- Shell scripting

## Sources Consulted
- Podman checkpoint guide: https://podman.io/docs/checkpoint
- Podman `container restore` official man page: https://docs.podman.io/en/latest/markdown/podman-container-restore.1.html
- Podman `container checkpoint` official man page: https://docs.podman.io/en/stable/markdown/podman-container-checkpoint.1.html
- Podman source tree v5.8.2 for checkpoint metadata field names: https://github.com/containers/podman

## Issues Found
- The prerequisites listed CRIU 3.15+ as required. The current Podman checkpoint guide states CRIU 3.11 or later is required for checkpointing/restoring, so the prerequisite was changed to CRIU 3.11+.
- The prerequisites described checkpoint files only as `.tar.gz`. Current Podman checkpoint exports use zstd compression by default and examples use `.tar.zst`, while gzip archives are still possible when exported with gzip compression. The wording now covers both `.tar.zst` and `.tar.gz`.
- The `--publish` section said the flag only works with `--import`. Current Podman documentation says it is available for checkpoint image restores as well as restores using `--import`, so the sentence was corrected.
- The verification section claimed `podman logs` includes logs from before the checkpoint. The official checkpoint and restore docs do not document exported checkpoint archives as preserving prior container logs, so the comment was changed to checking logs generated after restore.
- The troubleshooting snippet used `rootfs_image_name`, but Podman's `config.dump` JSON field is `rootfsImageName`. The snippet was updated to use the correct key.

## Review Notes
The main restore commands and options in the post are current: `podman container restore --import`, `--name`, `--publish`/`-p`, `--ignore-static-ip`, and `--ignore-static-mac` are documented by Podman. Podman was not installed in the review environment, so CLI behavior was verified against official documentation and the Podman source tree rather than local `--help` output.
