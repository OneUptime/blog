# Validation Summary: How to Use the Podman REST API for Container Automation on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Podman REST API
- Podman systemd socket activation
- Podman rootful and rootless services
- containers.conf
- curl

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Using the container-tools API": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/using-the-container-tools-api
- Podman `podman system service` documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman v4.0 `podman system service` documentation for `service_timeout`: https://docs.podman.io/en/v4.0.0/markdown/podman-system-service.1.html
- containers.conf(5) manual page: https://man.archlinux.org/man/containers.conf.5.en

## Issues Found
- The rootless systemd example enabled the user socket but did not mention lingering for availability after reboot without a login session. Podman's official examples document `loginctl enable-linger <USER>` for this case, so I added a short note and command.

## Review Notes
The rootful and rootless socket paths, `systemctl` commands, `DOCKER_HOST` example, `service_timeout=0` configuration, Unix-socket security guidance, and `curl --unix-socket ... /v1.0.0/libpod/info` verification endpoint match the checked documentation. RHEL's guide uses `podman-remote info` for verification when the `podman-remote` package is installed, but the post's `curl` verification is also documented and valid.
