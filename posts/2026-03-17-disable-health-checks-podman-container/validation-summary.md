# Validation Summary: How to Disable Health Checks for a Podman Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container health checks
- Containerfile/Dockerfile syntax
- Container image configuration

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman ps` documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-ps.1.html
- Podman `podman build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Dockerfile reference for `HEALTHCHECK NONE`: https://docs.docker.com/reference/builder/#healthcheck

## Issues Found
- The `podman ps` example output showed `Up 2 minutes (no health check)`. Podman documents health as a separate filter/status concept and normally shows health annotations such as healthy or unhealthy only when relevant, so I changed the example to `Up 2 minutes` to avoid implying Podman prints a literal `(no health check)` marker.

## Review Notes
- `--health-cmd none` is documented by Podman as disabling existing health checks.
- `--no-healthcheck` is documented by Podman as disabling any defined health checks for the container.
- `HEALTHCHECK NONE` is valid Dockerfile/Containerfile syntax for disabling an inherited health check. Podman documents that Containerfiles use Dockerfile syntax internally.
- I could not verify commands against local `podman --help` output because Podman is not installed in this environment.
