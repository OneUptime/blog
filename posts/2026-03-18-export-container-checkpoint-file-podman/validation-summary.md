# Validation Summary: How to Export a Container Checkpoint to a File with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- CRIU
- Linux containers
- Container checkpoint and restore
- Shell commands

## Sources Consulted
- Podman `podman-container-checkpoint` official documentation: https://docs.podman.io/en/stable/markdown/podman-container-checkpoint.1.html
- Podman `podman-container-restore` official documentation: https://docs.podman.io/en/latest/markdown/podman-container-restore.1.html
- Podman checkpointing guide: https://podman.io/docs/checkpoint

## Issues Found
- The post used `.tar.gz` filenames and `tar tzf` verification commands but did not specify `--compress=gzip`. Current Podman documentation says checkpoint exports use zstd compression by default and gzip must be requested with `--compress=gzip`. I added `--compress=gzip` to the `.tar.gz` export examples and clarified the compression text.
- The conclusion said volumes are not included in checkpoint exports. Current Podman documentation says associated volume contents are included by default and can be excluded with `--ignore-volumes`. I corrected the conclusion to reflect that behavior.

## Review Notes
Podman checkpointing currently requires root containers according to the Podman checkpointing guide; the examples consistently use `sudo`, so this is aligned. The local environment did not have `podman` installed, so command verification was performed against official documentation rather than local `--help` output.
