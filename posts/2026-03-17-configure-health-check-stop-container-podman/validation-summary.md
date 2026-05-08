# Validation Summary: How to Configure Health Check to Stop a Container in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container health checks
- Container lifecycle actions
- Linux signals

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman `podman ps` documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Podman `podman events` documentation: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Podman `podman kill` documentation: https://docs.podman.io/en/stable/markdown/podman-kill.1.html
- Podman `podman stop` documentation: https://docs.podman.io/en/v1.6.4/markdown/podman-stop.1.html

## Issues Found
- The post stated that `--health-on-failure stop` always sends SIGTERM. Podman's stop behavior uses the container's configured stop signal, which defaults to SIGTERM but can be overridden by the image or by `--stop-signal`. Updated the introduction and summary to describe the configured stop signal accurately.
- The `nginx:latest` comparison examples used `curl` inside the health check. Podman runs health check commands inside the container, and the nginx image should not be assumed to include `curl`. Replaced those health checks with a POSIX `test` command against the default nginx index file path.

## Review Notes
The remaining health check examples use placeholder application images and assume the container image includes the tools referenced by the health command, such as `curl`. That is acceptable for application-specific examples, but real images should include the command used by `--health-cmd`.
