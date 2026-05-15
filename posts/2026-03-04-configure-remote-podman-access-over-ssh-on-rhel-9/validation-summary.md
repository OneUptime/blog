# Validation Summary: How to Configure Remote Podman Access over SSH on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Podman
- Podman remote client
- SSH
- systemd user and system services
- SELinux troubleshooting commands

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Using the container-tools API: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/building_running_and_managing_containers/using-the-container-tools-api
- Podman documentation: podman-system-service: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman documentation: podman-system-connection-add: https://docs.podman.io/en/latest/markdown/podman-system-connection-add.1.html
- Podman documentation: podman-system-connection: https://docs.podman.io/en/latest/markdown/podman-system-connection.1.html
- Podman documentation: podman-remote: https://docs.podman.io/en/stable/markdown/podman-remote.1.html
- Podman documentation: podman-system-connection-list: https://docs.podman.io/en/stable/markdown/podman-system-connection-list.1.html

## Issues Found
- The original service configuration section used placeholders such as `/etc/<service>/config.conf` and `<service-name>`, which are not valid Podman remote access configuration steps. Replaced them with the documented `podman.socket` setup for rootless and rootful Podman API access.
- The original guide did not add a Podman SSH remote connection. Added `podman system connection add` examples using `--identity` and `--socket-path`, matching the documented Podman command syntax.
- The original verification commands ran only against the local Podman installation. Updated them to use `podman --connection rhel9` so they verify the remote connection.
- The troubleshooting section referenced placeholder unit and package names. Replaced them with `podman.socket`, `podman`, `podman-remote`, and an SSH verification command.

## Review Notes
The local review environment did not have Podman installed, so command behavior was validated against official Red Hat and Podman documentation rather than local `podman --help` output. The examples use `/run/user/1000/podman/podman.sock` for rootless access, which must be changed if the remote user's UID is not 1000.
