# Validation Summary: How to Inspect a Volume with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman volumes
- Go template formatting
- Bash shell commands
- jq

## Sources Consulted
- Podman volume inspect documentation: https://docs.podman.io/en/latest/markdown/podman-volume-inspect.1.html
- Podman volume create documentation: https://docs.podman.io/en/latest/markdown/podman-volume-create.1.html
- Podman volume ls documentation: https://docs.podman.io/en/latest/markdown/podman-volume-ls.1.html
- Podman inspect documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman container inspect documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html

## Issues Found
- The tmpfs volume creation example omitted `--opt device=tmpfs`. Podman's official tmpfs volume examples include `device=tmpfs` with `type=tmpfs`, so the command was updated to include it.
- The audit script used `podman volume list`, while the official documented subcommand is `podman volume ls`. The script was updated to use `podman volume ls --format '{{.Name}}'`.

## Review Notes
Podman was not installed in the local environment, so CLI behavior was verified against the official Podman documentation rather than local `--help` output.
