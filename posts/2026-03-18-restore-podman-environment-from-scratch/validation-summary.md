# Validation Summary: How to Restore a Podman Environment from Scratch

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Podman
- Podman rootless containers
- Podman images, volumes, networks, and containers
- Bash
- Python JSON parsing

## Sources Consulted
- Podman `podman load` documentation: https://docs.podman.io/en/latest/markdown/podman-load.1.html
- Podman `podman import` documentation: https://docs.podman.io/en/stable/markdown/podman-import.1.html
- Podman `podman volume import` documentation: https://docs.podman.io/en/stable/markdown/podman-volume-import.1.html
- Podman `podman volume create` documentation: https://docs.podman.io/en/stable/markdown/podman-volume-create.1.html
- Podman `podman network create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman network inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-network-inspect.1.html
- Podman `podman container inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Podman `podman run` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman system migrate` documentation: https://docs.podman.io/en/stable/markdown/podman-system-migrate.1.html

## Issues Found
- The network recreation script only parsed older CNI-style `plugins[].ipam.ranges` data and did not handle current `podman network inspect` output, which uses `subnets` with `subnet` and `gateway` fields. Updated the script to read current Podman network inspect JSON and retained CNI fallback parsing.
- The volume metadata section said labels could be restored, but the original command only printed labels after creating the volume. Updated the volume creation script to apply labels with `podman volume create --label` when `*-inspect.json` metadata is present, and clarified the later snippet as label inspection.
- The container recreation script tried to open a literal `METADATA_FILE` path inside Python before the shell replacement ran, so it would fail. Updated the script to pass the metadata path as a Python argument.
- The generated container run command did not shell-quote arguments safely and dropped published port protocol information. Updated the generator to use `shlex.quote()` and preserve `containerPort[/protocol]` plus host IP where present.

## Review Notes
Podman is not installed in this workspace, so CLI checks were performed against official Podman documentation rather than local `podman --help` output. Extracted Bash snippets from the post were checked with `bash -n`.
