# Validation Summary: How to Use tmpfs Volumes with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux tmpfs
- Container volumes and mounts
- Container runtime CLI commands

## Sources Consulted
- Podman `podman-run` official documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman-volume-create` official documentation: https://docs.podman.io/en/v5.0.0/markdown/podman-volume-create.1.html

## Issues Found
- The first two `podman run` examples used the same container name, `app`. Running both commands as written would cause the second command to fail because container names must be unique. Changed the second example to use `--name app-tmpfs`.
- The detached `node:20` tmpfs examples did not specify a long-running command. The Node image's default command can exit in a non-interactive detached run, which would make the container unavailable for follow-up inspection. Added `tail -f /dev/null` to those examples so the containers stay running for demonstration purposes.

## Review Notes
Podman's documented `--tmpfs` syntax, `--mount type=tmpfs` options such as `tmpfs-size` and `tmpfs-mode`, and named tmpfs volume creation using `--opt device=tmpfs --opt type=tmpfs --opt o=...` match the examples after the fixes. Podman was not installed in the local environment, so verification was performed against official documentation rather than local `--help` output.
