# Validation Summary: How to Remove a Podman Machine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Machine
- Podman CLI
- Shell scripting

## Sources Consulted
- Podman official documentation: `podman machine rm` - https://docs.podman.io/en/stable/markdown/podman-machine-rm.1.html
- Podman official documentation: `podman machine ls` - https://docs.podman.io/en/stable/markdown/podman-machine-list.1.html
- Podman official documentation: `podman system prune` - https://docs.podman.io/en/stable/markdown/podman-system-prune.1.html
- Podman official documentation: global `--connection` option - https://docs.podman.io/en/latest/markdown/podman.1.html

## Issues Found
- The deletion prompt example used outdated or misleading machine file paths. Updated the example to show current documented configuration and VM image locations under `.config/containers/podman/machine/` and `.local/share/containers/podman/machine/`.
- The default machine section said to omit the name if it is the active default but still showed the machine name in the command. Updated it to show `podman machine rm --force`, matching the documented behavior that omitting the name removes `podman-machine-default`.
- The verification commands used substring or regular expression matching and could report a false positive for similarly named machines or names containing pattern characters. Updated them to use `grep -Fxq` for an exact full-line match.
- The residual file cleanup section labeled `.local/share` as the Linux configuration location and `.config` as the macOS configuration location. Updated it to distinguish machine configuration files from machine image files.
- The image cleanup section implied `podman system prune --all` removes all images. Updated the wording to clarify that it prunes unused images and other unused resources.

## Review Notes
The local review environment did not have the `podman` binary installed, so command behavior was verified against the official Podman manual pages instead of local `--help` output.
