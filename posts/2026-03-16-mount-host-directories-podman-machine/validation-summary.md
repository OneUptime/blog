# Validation Summary: How to Mount Host Directories into a Podman Machine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Machine
- macOS and Windows container virtualization
- Bind mounts and named volumes
- SELinux volume labels
- VirtioFS and 9p VM file sharing

## Sources Consulted
- Podman official documentation: `podman-machine-init`, including `--volume`, default machine mounts, and Windows WSL behavior: https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- Podman official documentation: `podman-machine-set`, confirming it has no volume mount option: https://docs.podman.io/en/stable/markdown/podman-machine-set.1.html
- Podman official documentation: `podman-machine-list`, including the documented `.VMType` output field: https://docs.podman.io/en/stable/markdown/podman-machine-list.1.html
- Podman official documentation: `podman-machine-inspect`, including current supported inspect template fields: https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html
- Podman official documentation: `podman-run`, including remote-client volume behavior, `-v` syntax, read-only/read-write options, named volumes, and SELinux `:z`/`:Z` labels: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman official installation documentation, confirming Podman on macOS and Windows uses a Linux VM: https://podman.io/docs/installation

## Issues Found
- The default mounts section listed macOS paths such as `/Users`, `/private`, and `/var/folders` as common defaults. Current Podman documentation says default machine volume mounts are defined in `containers.conf` and, unless changed, default to `$HOME:$HOME`. Updated the comments to reflect the documented default.
- Container bind-mount examples used host paths such as `/Users/dev/projects/myapp` after showing a machine mount from `/Users/dev/projects` to `/projects`. With the Podman remote client on macOS and Windows, container volume sources are resolved on the remote VM side, so examples must use the path visible inside the Podman machine. Updated examples to use `/projects`, `/configs`, and `/data`.
- The mounted-filesystem verification command only searched for `virtiofs`. Podman machine mounts may use different backing filesystems depending on provider and version, including 9p. Updated the check to search for `virtiofs` or `9p`.
- The performance section used `podman machine inspect --format '{{.VMType}}'`, but current `podman-machine-inspect` documentation does not list `.VMType` as an inspect field. The documented `.VMType` field is available from `podman machine ls`. Updated the command to `podman machine ls --format 'table {{.Name}}\t{{.VMType}}'`.
- The quick reference used `/host:/container` for `podman run -v`, which can be misleading in the Podman machine remote-client context. Updated it to `/machine-path:/container`.

## Review Notes
Podman was not installed in the local review environment, so command verification was performed against current official Podman documentation rather than local `--help` output.
