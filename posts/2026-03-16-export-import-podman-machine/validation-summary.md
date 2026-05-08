# Validation Summary: How to Export and Import a Podman Machine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Machine
- Podman CLI
- Container images
- Container volumes
- Podman networks
- Bash
- jq

## Sources Consulted
- Podman machine inspect documentation: https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html
- Podman machine init documentation: https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- Podman save documentation: https://docs.podman.io/en/latest/markdown/podman-save.1.html
- Podman load documentation: https://docs.podman.io/en/latest/markdown/podman-load.1.html
- Podman export documentation: https://docs.podman.io/en/latest/markdown/podman-export.1.html
- Podman images documentation: https://docs.podman.io/en/stable/markdown/podman-images.1.html
- Podman volume create documentation: https://docs.podman.io/en/latest/markdown/podman-volume-create.1.html
- Podman volume ls documentation: https://docs.podman.io/en/v5.1.1/markdown/podman-volume-ls.1.html
- Podman network ls documentation: https://docs.podman.io/en/stable/markdown/podman-network-ls.1.html
- Podman network create documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman global options documentation: https://docs.podman.io/en/latest/markdown/podman.1.html

## Issues Found
- The `jq` examples for `podman machine inspect` treated the output as a single object. Current Podman documentation shows `podman machine inspect` returns a JSON array, so the examples now use `.[0]` before reading fields such as `.ConfigDir.Path`, `.Resources.CPUs`, and `.Name`.
- The restore script read machine configuration fields from the top-level JSON object. It now reads the same values from `.[0]` to match the saved `podman machine inspect` output.
- The single-archive image export command passed multiple images to `podman save` without `--multi-image-archive`. The command now includes `--multi-image-archive`, which Podman documents as the option for creating archives with more than one image.

## Review Notes
- Podman was not installed in the local environment, so CLI checks were performed against official Podman documentation rather than local `--help` output.
- The backup and restore scripts intentionally preserve images, volumes, and network names, but they do not recreate containers or preserve all network options. The post already notes that containers may need to be recreated manually.
