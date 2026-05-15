# Validation Summary: How to Configure Podman Desktop with Remote Podman Machines on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Podman
- Podman Desktop
- systemd user and system services
- SSH remote connections
- firewalld

## Sources Consulted
- Podman Desktop remote access documentation: https://podman-desktop.io/docs/podman/podman-remote
- Podman `system connection add` documentation: https://docs.podman.io/en/v5.4.2/markdown/podman-system-connection-add.1.html
- Podman `system service` documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman global options documentation: https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman remote-client tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/remote_client.md
- Red Hat Enterprise Linux container-tools API documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/using-the-container-tools-api

## Issues Found
- Added `sudo loginctl enable-linger "$USER"` to the rootless remote setup. The Podman remote-client tutorial states that lingering is needed for the rootless user socket to work when the user is not logged in, which is important for Podman Desktop remote access.
- Updated the Podman Desktop connection instructions. Current Podman Desktop documentation says remote connections are managed through the `podman system connection list` connection store and detected by Podman Desktop after enabling remote connections, rather than requiring manual entry of SSH details in a "Create new" form.

## Review Notes
The Podman socket paths, `podman system connection add` syntax, `--identity` option, `--connection` usage, rootful socket path, and SSH-based remote access model match current official Podman and Podman Desktop documentation. The local environment used for review did not have the `podman` CLI installed, so command behavior was validated against official documentation rather than local execution.
