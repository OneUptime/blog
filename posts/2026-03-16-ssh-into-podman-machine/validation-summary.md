# Validation Summary: How to SSH into a Podman Machine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Machine
- SSH
- Linux virtual machines
- systemd journal
- Linux networking and storage troubleshooting

## Sources Consulted
- Podman `podman machine ssh` official documentation: https://docs.podman.io/en/latest/markdown/podman-machine-ssh.1.html
- Podman `podman machine init` official documentation: https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- Podman `podman machine start` official documentation: https://docs.podman.io/en/latest/markdown/podman-machine-start.1.html
- Podman `podman system connection list` official documentation: https://docs.podman.io/en/latest/markdown/podman-system-connection-list.1.html
- Podman `podman system connection default` official documentation: https://docs.podman.io/en/latest/markdown/podman-system-connection-default.1.html
- Podman main command and rootless storage documentation: https://docs.podman.io/en/latest/markdown/podman.1.html
- Podman `podman logs` official documentation: https://docs.podman.io/en/latest/markdown/podman-logs.1.html
- Podman `podman system df` official documentation: https://docs.podman.io/en/latest/markdown/podman-system-df.1.html

## Issues Found
- The storage inspection section hard-coded `/var/lib/containers/storage/`, which is the rootful storage location and is not generally where the default rootless Podman machine user stores images, containers, and volumes. Changed the commands to read `{{.Store.GraphRoot}}` from `podman info` and inspect paths relative to that storage root.
- The runtime log section implied that `journalctl -u podman` is the right way to view container-related logs. Podman is daemonless, and container logs should normally be read with `podman logs`; journald queries are only appropriate when the container uses the journald log driver. Updated the examples accordingly.

## Review Notes
- The local review environment did not have the `podman` CLI installed, so command verification was performed against the current official Podman documentation rather than local `--help` output.
- Several troubleshooting commands depend on tools being present inside the machine image, such as `curl`, `nslookup`, `iptables`, or `nft`. The examples are reasonable diagnostics, but availability can vary by machine image and installed packages.
