# Validation Summary: How to Export and Import Podman Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container filesystem export and import
- Podman image save and load
- Podman volumes
- Shell scripting and SSH streaming

## Sources Consulted
- Official Podman documentation: `podman export` - https://docs.podman.io/en/latest/markdown/podman-export.1.html
- Official Podman documentation: `podman import` - https://docs.podman.io/en/latest/markdown/podman-import.1.html
- Official Podman documentation: `podman save` - https://docs.podman.io/en/latest/markdown/podman-save.1.html
- Official Podman documentation: `podman load` - https://docs.podman.io/en/latest/markdown/podman-load.1.html
- Official Podman documentation: `podman volume export` - https://docs.podman.io/en/latest/markdown/podman-volume-export.1.html
- Official Podman documentation: `podman volume import` - https://docs.podman.io/en/latest/markdown/podman-volume-import.1.html
- Official Podman documentation: `podman pause` - https://docs.podman.io/en/stable/markdown/podman-pause.1.html
- Official Podman documentation: `podman run --restart` - https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Official Podman documentation: `podman inspect` - https://docs.podman.io/en/latest/markdown/podman-inspect.1.html

## Issues Found
- The post described capturing the exact state of a production container. `podman export` captures the container filesystem, not process state, runtime state, or mounted volume data. Changed this to "exact filesystem state" for accuracy.
- The automation script converted `.Config.Cmd` to a space-joined string and used it as `--change 'CMD ...'`, which can change command argument boundaries and break commands with quoted or multi-word arguments. Updated the script to preserve `.Config.Cmd` as a JSON array and pass it safely through SSH using base64 before applying `podman import --change`.

## Review Notes
The primary Podman command usage is consistent with the official documentation: `podman export` exports a container filesystem tar archive, `podman import` creates a filesystem image from an exported archive or URL, `--change` supports the listed image instructions, `podman save` preserves image layers for `podman load`, and volume data is not included in container filesystem exports. The local environment did not have Podman installed, so CLI behavior was checked against the current official Podman documentation instead of local `--help` output.
