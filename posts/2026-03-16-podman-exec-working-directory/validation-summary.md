# Validation Summary: How to Use podman exec with Working Directory

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Containers
- `podman exec`
- Container working directories
- Shell command execution

## Sources Consulted
- Official Podman `podman-exec` documentation: https://docs.podman.io/en/latest/markdown/podman-exec.1.html
- Official Podman `podman-container-inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html

## Issues Found
- Wildcard examples such as `wc -l *.log` and `ls node*` would not reliably work as written because `podman exec` runs the specified command directly; shell glob expansion must happen inside the container. Updated those examples to use `/bin/sh -c`.
- Several examples used `/bin/bash` inside the container even though the examples only require a POSIX shell. Updated them to `/bin/sh` to avoid depending on Bash being present in the image.
- The interactive shell example showed a Bash-style prompt after switching to `/bin/sh`. Replaced it with a neutral comment that the shell opens in `/etc/nginx`.
- The application-code example said "Run npm commands" but used `ls` examples. Updated the comment to say "Run commands from specific application directories."
- The post claimed `-w` works with "all other exec options." Updated wording to "common exec options" because the examples only validate the common flags shown and the official documentation lists those options individually.

## Review Notes
Podman was not installed in the local environment, so live command execution was not possible. The review was performed against the official Podman documentation.
