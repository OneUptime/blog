# Validation Summary: How to Configure Health Check Max Log Size in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container health checks
- Health check logging
- Shell commands

## Sources Consulted
- Podman `podman-run` official documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman-update` official documentation: https://docs.podman.io/en/stable/markdown/podman-update.1.html
- Podman systemd unit official documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html

## Issues Found
- The post described `--health-max-log-size` values as bytes. Podman's official documentation describes this setting as the maximum length in characters of the stored HealthCheck log. Updated the description, examples, storage estimate, and summary to use character-based wording instead of byte-based wording.
- One example comment implied that health check logs are unlimited without explicitly setting `--health-max-log-size`. Podman's current default is 500 characters, with `0` meaning unlimited. Updated the comment to refer to an unlimited size setting instead.

## Review Notes
The `--health-max-log-size` and `--health-max-log-count` flags are present in current Podman documentation for `podman run` and `podman update`. Podman is not installed in this workspace, so local CLI verification was not possible; the review used official Podman documentation.
