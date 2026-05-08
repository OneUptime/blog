# Validation Summary: How to Configure Health Check Max Log Count in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container health checks
- Podman CLI
- Health check logging configuration

## Sources Consulted
- Podman stable `podman-run(1)` documentation: https://docs.podman.io/en/stable/markdown/podman-run.1.html
- Podman latest `podman-create(1)` documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman stable `podman-update(1)` documentation: https://docs.podman.io/en/stable/markdown/podman-update.1.html

## Issues Found
- The post described default health check log retention only as "a limited number." Updated this to the documented default of 5 health check log entries.
- The post implied long-running containers can accumulate thousands of health check log entries generally. Updated the wording because Podman's documented default limit is 5 entries, while larger or unlimited retention depends on configuration.
- The post described `--health-max-log-size` as limiting the "size" of each log entry. Updated this to specify that Podman documents the limit as the length of each stored HealthCheck log entry in characters.

## Review Notes
The documented `podman run` flags used in the examples are current in the stable Podman documentation. The `--health-cmd` command is interpreted through `/bin/sh -c` when not provided as a JSON array, so the shell-form examples are valid as long as the container image includes `curl` and a shell.
