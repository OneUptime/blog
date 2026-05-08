# Validation Summary: How to Start a Stopped Container in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container lifecycle management
- Container checkpoint and restore
- Shell scripting with Bash

## Sources Consulted
- Podman official documentation for `podman start`: https://docs.podman.io/en/latest/markdown/podman-start.1.html
- Podman official documentation for `podman ps`: https://docs.podman.io/en/latest/markdown/podman-ps.1.html
- Podman official documentation for `podman logs`: https://docs.podman.io/en/latest/markdown/podman-logs.1.html
- Podman official documentation for `podman events`: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman official documentation for `podman container checkpoint`: https://docs.podman.io/en/stable/markdown/podman-container-checkpoint.1.html
- Podman official documentation for `podman container restore`: https://docs.podman.io/en/latest/markdown/podman-container-restore.1.html

## Issues Found
1. **Overstated coverage of `podman start` usage**: The introduction said the guide covers "all the ways" to start containers in Podman, but the official `podman start` documentation includes additional options such as `--all`, `--filter`, `--latest`, and signal proxying. Changed this to "common ways" to avoid an inaccurate completeness claim.
2. **Misleading setup comment**: The basic example comment said "Create and stop a container first," but `podman create` creates a container without starting it. Changed the comment to "Create a container first."
3. **Checkpoint restore wording**: The checkpoint section said to restore a container "during start," but checkpoint restoration is handled by `podman container restore`, not `podman start`. Updated the sentence to name the correct command.

## Review Notes
- Podman was not installed in the local workspace, so commands could not be executed locally. The review was performed against current official Podman documentation.
- The `podman events --filter container=my-container --since 1h` command is valid, but `podman events` streams by default after showing prior events. A future improvement could mention `--stream=false` when users only want historical events.
- The checkpoint and restore example is technically correct, but checkpoint/restore depends on CRIU and platform/runtime support. A future improvement could mention that environment-specific caveat.
