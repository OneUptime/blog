# Validation Summary: How to View Container Logs in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Containers
- Container logging
- Unix shell commands

## Sources Consulted
- Podman `podman logs` official documentation: https://docs.podman.io/en/v5.3.2/markdown/podman-logs.1.html
- Podman `podman pod logs` official documentation: https://docs.podman.io/en/v5.0.0/markdown/podman-pod-logs.1.html
- Podman `podman inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html
- Podman `podman container inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Podman `podman pod inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-pod-inspect.1.html
- Podman `podman ps` official documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-ps.1.html
- Podman `podman create` logging options official documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html

## Issues Found
- The post used `{{.LogPath}}` to retrieve a container log path. Current Podman inspect output exposes the log path through `{{.HostConfig.LogConfig.Path}}`, so the examples were updated accordingly and guarded for log drivers such as `journald` that do not provide a file path.
- The post described the raw log file as JSON format. Podman's log file format depends on the configured log driver, and `json-file` is aliased to `k8s-file`; the wording was changed to "format depends on the log driver."
- The init-container pod examples tried to list container names via `podman pod inspect my-pod --format '{{range .Containers}}{{.Name}} {{end}}'`, but the official pod inspect examples expose container IDs and state, not names. The examples now use `podman ps -a --filter pod=my-pod --format '{{.Names}}'`, which is documented for filtering containers by pod and formatting container names.

## Review Notes
The local environment did not have the `podman` binary installed, so CLI behavior was validated against official Podman documentation rather than local `--help` output.
