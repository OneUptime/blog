# Validation Summary: How to Troubleshoot WSL2 Docker Socket Issues with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition
- Docker Engine
- Docker Desktop
- Windows Subsystem for Linux 2 (WSL2)
- systemd
- Windows networking / `netsh portproxy`

## Sources Consulted
- Portainer: Install Portainer CE with Docker on WSL / Docker Desktop: https://docs.portainer.io/start/install-ce/server/docker/wsl
- Portainer: Requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Docker: WSL 2 integration for Docker Desktop: https://docs.docker.com/desktop/features/wsl/
- Docker: Linux post-installation steps (`docker` group, non-root access): https://docs.docker.com/engine/install/linux-postinstall/
- Docker CLI reference: `docker context use`: https://docs.docker.com/reference/cli/docker/context/use/
- Docker Engine installation on Ubuntu, including update guidance and convenience-script caveats: https://docs.docker.com/engine/install/ubuntu/
- Microsoft Learn: Use systemd to manage Linux services with WSL: https://learn.microsoft.com/en-us/windows/wsl/systemd
- Microsoft Learn: Accessing network applications with WSL: https://learn.microsoft.com/en-us/windows/wsl/networking
- Microsoft WSL issue tracker: clock skew megathread: https://github.com/microsoft/WSL/issues/10006
- systemd documentation: `timedatectl`: https://www.freedesktop.org/software/systemd/man/timedatectl.html

## Issues Found
- The tags metadata used `Window` instead of `Windows`. I corrected the tag to match the platform discussed.
- The daemon-startup section treated all WSL2 setups as if Docker were managed inside the Linux distro. Docker Desktop's WSL documentation says Docker Desktop should manage the daemon when Desktop integration is in use, and warns that separate Docker Engine installs inside the distro can conflict. I added that distinction and limited the `service` / `systemctl` commands to in-distro Docker Engine installs.
- The `.bashrc` snippet that ran `sudo service docker start` automatically was not a reliable generic fix and could prompt for a password on shell startup. I removed it and kept the manual start guidance for non-systemd setups.
- The heading `Fix With Systemd (Ubuntu 22.04+ in WSL2)` was too narrow. Microsoft documents systemd as a WSL capability enabled through `/etc/wsl.conf`, not as an Ubuntu-22.04-only feature, so I changed the wording accordingly.
- The diagnostic command `docker exec portainer curl --unix-socket ...` was not reliable because the Portainer container image is not documented as including `curl`. I replaced it with a `docker inspect` mount check that directly verifies whether `/var/run/docker.sock` is bound into the container.
- The Portainer recreation command used `portainer/portainer-ce:latest`, `--restart=unless-stopped`, and exposed `9000` as if it were the default UI port. Portainer's current WSL / Docker Desktop install documentation uses `portainer/portainer-ce:lts`, `--restart=always`, and publishes `9443` for the UI with `8000` for the tunnel server. I updated the command to match the documented defaults and added explicit volume creation.
- The network troubleshooting section only checked port `9000`, which is now the legacy HTTP port in Portainer's documentation. I updated the checks to focus on `9443` while still allowing for legacy `9000`.
- The clock-skew section used an unsupported startup-script example based on `hwclock -s`. Microsoft currently documents clock skew as a WSL issue with workarounds such as restarting WSL and optional resync commands; I changed the section to use that documented framing and kept `hwclock` / `timedatectl` only as conditional follow-up commands.
- The Docker/Portainer compatibility section claimed `Portainer CE requires Docker Engine 19.03+`, which is outdated. Portainer now publishes release-specific Docker support in its requirements page, so I replaced the hard-coded minimum-version claim with guidance to check the current matrix for the Portainer release in use.
- The conclusion implied that enabling systemd in WSL2 is the general best practice for all users. I narrowed that to the in-distro Docker Engine case so it no longer conflicts with Docker Desktop's documented WSL model.

## Review Notes
- The post is technically relevant and suitable for publication after correction.
- Portainer's current WSL / Docker Desktop docs default to `https://localhost:9443`; port `9000` is only needed for legacy HTTP access.
- Docker Desktop's WSL docs explicitly advise uninstalling Docker Engine or the Docker CLI installed directly inside a WSL distro before using Docker Desktop integration, so future edits should keep the Docker Desktop path and the in-distro Docker Engine path clearly separated.
- I validated the commands and claims against current documentation, but I did not run a live WSL2/Portainer environment from this repository during review.
