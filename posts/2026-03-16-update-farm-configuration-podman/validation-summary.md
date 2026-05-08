# Validation Summary: How to Update a Farm Configuration with podman farm update

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman farm
- Podman system connections
- Shell scripting
- Multi-architecture container builds

## Sources Consulted
- Podman official documentation: podman-farm-update, https://docs.podman.io/en/latest/markdown/podman-farm-update.1.html
- Podman official documentation: podman-farm-list, https://docs.podman.io/en/stable/markdown/podman-farm-list.1.html
- Podman official documentation: podman-farm-build, https://docs.podman.io/en/latest/markdown/podman-farm-build.1.html
- Podman official documentation: podman-system-connection-list, https://docs.podman.io/en/v4.4/markdown/podman-system-connection-list.1.html
- Podman source: cmd/podman/farm/update.go, https://raw.githubusercontent.com/containers/podman/main/cmd/podman/farm/update.go
- Podman source: cmd/podman/farm/build.go, https://raw.githubusercontent.com/containers/podman/main/cmd/podman/farm/build.go
- Podman source: pkg/farm/farm.go, https://raw.githubusercontent.com/containers/podman/main/pkg/farm/farm.go

## Issues Found
- The `podman farm build -t myapp:latest .` example used a short image name. Current Podman farm build requires a full image reference because farm builds push images to a registry before assembling the manifest list. Changed it to `registry.example.com/team/myapp:latest`.
- The scripts parsed `.Connections` from `podman farm list` as if it were comma-separated output. Official examples show Go template `.Connections` renders as a bracketed list such as `[f38 f37]`, so `tr ',' ' '` would not produce usable connection names. Changed the templates to range over `.Connections` and emit one connection per line.
- The error examples did not match current Podman behavior. Current Podman returns explicit errors for adding a missing system connection, updating a missing farm, and removing a connection that is not in the farm. Updated the comments accordingly.

## Review Notes
- Podman was not installed in the local workspace, so validation used official Podman documentation and current upstream source instead of local `--help` output.
- The `podman farm update --add`, `--remove`, and `--default` flags are current and documented. Multiple connections with comma-separated `--add` and `--remove` values are supported by the current Cobra string slice flag implementation.
