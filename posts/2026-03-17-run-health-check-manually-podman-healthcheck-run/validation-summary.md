# Validation Summary: How to Run a Health Check Manually with podman healthcheck run

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container health checks
- Shell scripting
- CI/CD deployment checks

## Sources Consulted
- Official Podman documentation: `podman-healthcheck-run(1)` - https://docs.podman.io/en/latest/markdown/podman-healthcheck-run.1.html
- Official Podman documentation: `podman-healthcheck(1)` - https://docs.podman.io/en/latest/markdown/podman-healthcheck.1.html
- Official Podman documentation: `podman-run(1)` health check options - https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html

## Issues Found
- The post described only exit codes `0` and `1` for `podman healthcheck run`. Official Podman documentation also defines exit code `125` for Podman errors, such as a missing container, a container without a defined health check, or a container that is not running. Updated the example comments and summary to include exit code `125`.
- The first command comment referred to running the health check for a "specific container". Official documentation states that `podman healthcheck run` runs the health check defined in a running container and errors if the container is not running. Updated the comment to say "specific running container".

## Review Notes
Podman was not installed in the local workspace, so validation was performed against the current official Podman documentation rather than local `--help` output. The command syntax, health check flags, and inspect examples are otherwise consistent with the documented Podman behavior.
