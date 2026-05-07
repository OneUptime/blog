# Validation Summary: How to Migrate a Container Between Hosts with Podman Checkpoint

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- CRIU
- Linux containers
- Container checkpoint and restore
- Container volume migration
- Container networking and port publishing

## Sources Consulted
- Podman Checkpoint documentation: https://podman.io/docs/checkpoint
- Podman `podman-container-checkpoint` manual: https://docs.podman.io/en/stable/markdown/podman-container-checkpoint.1.html
- Podman `podman-container-restore` manual: https://docs.podman.io/en/latest/markdown/podman-container-restore.1.html
- Podman `podman-volume-export` manual: https://docs.podman.io/en/stable/markdown/podman-volume-export.1.html
- Podman `podman-volume-import` manual: https://docs.podman.io/en/latest/markdown/podman-volume-import.1.html
- CRIU live migration documentation: https://www.criu.org/Live_migration
- CRIU TCP connection documentation: https://criu.org/TCP_connection

## Issues Found
- The introduction claimed migration preserves open connections in general. Podman/CRIU can handle established TCP connections only with explicit `--tcp-established` handling and suitable network conditions, so the broad claim was removed.
- The checkpoint example used a `.tar.gz` filename and `tar tzf`, but current Podman defaults checkpoint archive compression to zstd unless `--compress=gzip` is specified. Added `--compress=gzip` to gzip-named checkpoint commands.
- The network section showed a "specific network" restore example without using a supported network selection flag. Replaced it with supported restore options for replacing published ports and ignoring static source IP configuration.
- The volume section said checkpoint archives do not include volume data. Podman includes associated volume contents by default unless `--ignore-volumes` is used, so the section now explains when to exclude volume content and uses `podman volume export` and `podman volume import`.
- The requirements and conclusion omitted container runtime compatibility. Podman restore selects the runtime used during checkpoint and aborts on runtime mismatch, so the requirement was added.

## Review Notes
Podman was not installed in the local review environment, so CLI syntax was verified against official Podman documentation rather than local `--help` output.
