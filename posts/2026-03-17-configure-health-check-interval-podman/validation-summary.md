# Validation Summary: How to Configure Health Check Interval in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container health checks
- Containerfile HEALTHCHECK instruction
- Bash shell commands

## Sources Consulted
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman create documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman build documentation: https://docs.podman.io/en/v5.1.0/markdown/podman-build.1.html
- Red Hat Enterprise Linux 9, Building, running, and managing containers: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/

## Issues Found
- The `nginx:latest` examples used `curl` for health checks. Podman executes health check commands inside the target container, so the command must be available in the image. The stock Nginx image should not be assumed to include `curl`, so these examples were changed to `nginx -t || exit 1`.
- The Containerfile section did not mention Podman's image-format caveat for `HEALTHCHECK`. Red Hat documentation notes that `HEALTHCHECK` is supported for Docker image format and ignored for OCI image format, while Podman build documentation identifies OCI as the default image format. The text now tells readers to build in Docker image format when they want the Containerfile `HEALTHCHECK` preserved.

## Review Notes
The CLI flags `--health-cmd`, `--health-interval`, `--health-retries`, and the default `--health-interval` value of `30s` match current Podman documentation. The documented duration examples such as `15s`, `2m`, and `1m30s` are valid Podman time formats.
