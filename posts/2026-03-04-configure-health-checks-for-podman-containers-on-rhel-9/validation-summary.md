# Validation Summary: How to Configure Health Checks for Podman Containers on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Podman
- Linux containers
- Container health checks

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Building, running, and managing containers": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/building_running_and_managing_containers/building_running_and_managing_containers
- Podman `podman-run` documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman `podman-healthcheck` documentation: https://docs.podman.io/en/stable/markdown/podman-healthcheck.1.html
- Podman `podman-healthcheck-run` documentation: https://docs.podman.io/en/latest/markdown/podman-healthcheck-run.1.html
- Podman `podman-events` documentation: https://docs.podman.io/en/latest/markdown/podman-events.1.html

## Issues Found
- The original post contained generic placeholder service commands such as `/etc/<service>/config.conf` and `systemctl restart <service-name>`, which do not configure Podman health checks. Replaced them with documented `podman run` health-check options including `--health-cmd`, `--health-interval`, `--health-timeout`, `--health-retries`, and `--health-start-period`.
- The introduction said Podman takes action when containers become unhealthy without explaining that recovery action must be configured. Updated it to state that `--health-on-failure` controls recovery behavior.
- The verification section only checked basic Podman functionality and ran an unrelated Alpine container. Updated it to verify the configured web container, check health status, run the health check manually, and view health-check events.
- The troubleshooting section referenced generic systemd service logs and placeholder packages. Updated it to use `podman logs`, `rpm -q container-tools`, `podman inspect`, and the documented behavior that health-check commands run inside the container.

## Review Notes
The post is now technically aligned with Podman health checks on RHEL 9. For production use, container lifecycle management with systemd or Quadlet may be useful, but that is outside the scope of this post.
