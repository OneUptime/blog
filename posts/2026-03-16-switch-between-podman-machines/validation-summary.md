# Validation Summary: How to Switch Between Podman Machines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman Machine
- Podman system connections
- Shell aliases and functions
- `CONTAINER_HOST` environment variable

## Sources Consulted
- Podman `podman-system-connection` documentation: https://docs.podman.io/en/latest/markdown/podman-system-connection.1.html
- Podman `podman-system-connection-default` documentation: https://docs.podman.io/en/latest/markdown/podman-system-connection-default.1.html
- Podman `podman-system-connection-list` documentation: https://docs.podman.io/en/latest/markdown/podman-system-connection-list.1.html
- Podman `podman-machine-list` documentation: https://docs.podman.io/en/latest/markdown/podman-machine-list.1.html
- Podman `podman-machine-inspect` documentation: https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html
- Podman global options and environment variable documentation: https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman `podman-machine-info` documentation: https://docs.podman.io/en/latest/markdown/podman-machine-info.1.html

## Issues Found
- The post described the "default machine" as the command target and said it was marked with an asterisk in `podman machine ls`. Podman distinguishes the fixed default machine name from the default system connection, and `podman machine ls` exposes a `.Default` field for the machine associated with the active default connection. Updated the section wording and example command/output to use the `Default` field.
- The `podman machine inspect` example used `.ConnectionInfo.PodmanSocket.Path`, but the command returns an array. Updated the `jq` expression to `.[0].ConnectionInfo.PodmanSocket.Path` and used it directly in a `CONTAINER_HOST` export.
- The quick reference said `podman system connection default <name>` sets the default machine. Updated it to say it sets the default connection.

## Review Notes
Podman is not installed in this local environment, so command behavior was checked against official Podman documentation rather than local `--help` output.
