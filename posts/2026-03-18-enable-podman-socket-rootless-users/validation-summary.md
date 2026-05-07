# Validation Summary: How to Enable the Podman Socket for Rootless Users

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Rootless containers
- systemd user services and socket activation
- systemd-logind lingering
- Podman REST API and Docker-compatible API access
- CI/CD runner environment configuration
- SELinux socket context checks

## Sources Consulted
- Podman `podman-system-service(1)` documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman `podman(1)` rootless mode and service URL documentation: https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman `podman-info(1)` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman REST API reference / OpenAPI specification: https://docs.podman.io/en/latest/Reference.html and https://storage.googleapis.com/libpod-master-releases/swagger-v5.7.yaml
- Podman API v4.0 OpenAPI specification: https://storage.googleapis.com/libpod-master-releases/swagger-v4.0.0.yaml
- systemd `loginctl(1)` documentation: https://www.freedesktop.org/software/systemd/man/latest/loginctl.html
- systemd `pam_systemd(8)` documentation for `XDG_RUNTIME_DIR`: https://www.freedesktop.org/software/systemd/man/latest/pam_systemd.html
- Linux `subuid(5)` documentation: https://man7.org/linux/man-pages/man5/subuid.5.html

## Issues Found
- The `_ping` example used a versioned URL. Podman's API documentation says `_ping` endpoints are not versioned, so the example was changed to `http://localhost/libpod/_ping`.
- The CI/CD examples hard-coded UID `1000`, which is not reliable for self-hosted runners or GitLab Runner users. The GitHub Actions example now writes the current user's UID, and the GitLab Runner example uses a `<RUNNER_UID>` placeholder.
- The troubleshooting example suggested manually exporting `XDG_RUNTIME_DIR`. systemd documents this as a runtime directory set up by `pam_systemd`/logind, so the advice now points readers to verifying a proper logind-managed user session with `loginctl user-status`.

## Review Notes
- The rootless socket path, `systemctl --user` socket activation commands, `DOCKER_HOST` format, `loginctl enable-linger`, subordinate UID/GID mapping guidance, and Libpod API examples were consistent with current Podman and systemd documentation.
- Podman was not installed in the local review environment, so CLI behavior was verified against official Podman documentation and OpenAPI specifications rather than local `podman --help` output.
