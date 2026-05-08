# Validation Summary: How to Configure Startup Health Check Interval in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container health checks
- Startup health checks
- Shell commands

## Sources Consulted
- Podman official `podman run` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman official `podman update` documentation: https://docs.podman.io/en/stable/markdown/podman-update.1.html

## Issues Found
- The post described `interval * retries` as the total maximum startup window. Podman's official documentation defines `--health-startup-retries` as the number of attempts allowed before the startup healthcheck restarts the container. I changed this wording to describe an approximate startup failure window before restart on repeated failures.

## Review Notes
- The `--health-startup-cmd`, `--health-startup-interval`, `--health-startup-retries`, `--health-cmd`, `--health-interval`, and `--health-retries` flags are valid Podman `run` options.
- Startup healthchecks require a regular healthcheck from the image or `--health-cmd`; the examples correctly include `--health-cmd`.
- `podman` was not installed in the local environment, so validation was performed against official Podman documentation rather than local `podman --help` output.
