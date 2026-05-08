# Validation Summary: How to Check Volume Disk Usage with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman volumes
- Podman system storage reporting
- Linux disk usage commands (`du`, `df`, `sort`, `head`)
- Bash scripting

## Sources Consulted
- Podman `podman system df` documentation: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html
- Podman `podman volume inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-volume-inspect.1.html
- Podman `podman volume ls` documentation: https://docs.podman.io/en/v5.1.1/markdown/podman-volume-ls.1.html
- Podman `podman volume prune` documentation: https://docs.podman.io/en/stable/markdown/podman-volume-prune.1.html
- Podman `podman system prune` documentation: https://docs.podman.io/en/stable/markdown/podman-system-prune.1.html
- Podman `podman volume rm` documentation: https://docs.podman.io/en/v4.3/markdown/podman-volume-rm.1.html
- Podman volume mount option documentation: https://docs.podman.io/en/v4.4/markdown/options/volume.html

## Issues Found
- The sample verbose `podman system df -v` output used `Volumes space usage:`, but the current official documentation shows `Local Volumes space usage:`. Updated the sample output heading to match Podman's documented output.
- The comment above `podman system prune --volumes` said "Clean up everything including unused volumes", which overstated the command. Official documentation states that `podman system prune` removes unused containers, pods, networks, dangling images, and optionally volumes; it does not remove every possible unused image unless additional flags such as `--all` are used. Updated the comment to "Clean up unused resources including unused volumes".

## Review Notes
Podman was not installed in the local review environment, so command verification was performed against current official Podman documentation rather than local `--help` output. The remaining examples are technically correct for Linux environments with Podman and standard GNU userland tools available.
