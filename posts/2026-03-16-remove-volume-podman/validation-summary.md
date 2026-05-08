# Validation Summary: How to Remove a Volume with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman volumes
- Container lifecycle commands
- Bash scripting

## Sources Consulted
- Podman official documentation: podman-volume-rm - https://docs.podman.io/en/latest/markdown/podman-volume-rm.1.html
- Podman official documentation: podman-ps - https://docs.podman.io/en/latest/markdown/podman-ps.1.html
- Podman official documentation: podman-rm - https://docs.podman.io/en/latest/markdown/podman-rm.1.html
- Podman official documentation: podman-volume-ls - https://docs.podman.io/en/latest/markdown/podman-volume-ls.1.html
- Podman official documentation: podman-volume-exists - https://docs.podman.io/en/latest/markdown/podman-volume-exists.1.html
- Podman official documentation: podman-volume-inspect - https://docs.podman.io/en/latest/markdown/podman-volume-inspect.1.html

## Issues Found
- Replaced `podman volume list` with the documented `podman volume ls` command in the basic verification example and label-filtered examples. The official volume listing command is documented as `podman volume ls`.
- Clarified the `--force` behavior. Official documentation states that containers using the volume are removed first; the post now says running containers are stopped as needed before removal.
- Corrected the summary to say Podman prevents removal of volumes used by containers, not only running containers. The official `podman volume rm` documentation applies to volumes used by containers generally.

## Review Notes
Podman was not installed in the local environment, so CLI behavior was verified against the current official Podman documentation rather than local `--help` output.
