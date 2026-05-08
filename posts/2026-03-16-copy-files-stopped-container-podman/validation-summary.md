# Validation Summary: How to Copy Files from a Stopped Container in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux shell commands
- Container filesystem recovery
- Tar archives

## Sources Consulted
- Podman `cp` documentation: https://docs.podman.io/en/v2.2.0/markdown/podman-cp.1.html
- Podman `export` documentation: https://docs.podman.io/en/v4.3/markdown/podman-export.1.html
- Podman `mount` documentation: https://docs.podman.io/en/v4.3/markdown/podman-mount.1.html
- Podman `unmount` documentation: https://docs.podman.io/en/latest/markdown/podman-unmount.1.html
- Podman `ps` documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Podman `commit` documentation: https://docs.podman.io/en/v3.0/markdown/podman-commit.1.html
- Podman `rm` documentation: https://docs.podman.io/en/latest/markdown/podman-rm.1.html
- Podman `logs` documentation: https://docs.podman.io/en/v5.3.2/markdown/podman-logs.1.html

## Issues Found
- The `tar xf ... -C /tmp/extracted/ ...` example used `/tmp/extracted/` before creating it. Added `mkdir -p /tmp/extracted` so the extraction command works.
- The nginx crash example used `/bin/bash`, which is less portable across container images than the POSIX shell. Changed it to `/bin/sh` while preserving the same behavior.
- The temporary recovery section said to create a new container "with the same volumes" next to a `podman commit` workflow. Podman `commit` creates an image from the changed container filesystem, and volume data is not included by default. Reworded the comment to match the actual command.

## Review Notes
Podman was not installed in the local environment, so commands were reviewed against official Podman documentation rather than executed locally.
