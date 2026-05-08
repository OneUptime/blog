# Validation Summary: How to Set Up Podman on a Minimal Server

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Podman
- Rootless Linux containers
- systemd user services and timers
- Podman Quadlet
- containers/storage configuration
- containers registries configuration
- Fedora, Debian, Ubuntu, and CentOS Stream package management
- firewalld and ufw
- SSH hardening

## Sources Consulted
- Podman installation documentation: https://podman.io/docs/installation
- Podman `podman generate systemd` documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-generate-systemd.1.html
- Podman Quadlet / `podman-systemd.unit` documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman system service / socket documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman `podman run` documentation: https://docs.podman.io/en/v4.4/markdown/podman-run.1.html
- Podman `podman system prune` documentation: https://docs.podman.io/en/latest/markdown/podman-system-prune.1.html
- systemd `loginctl enable-linger` documentation: https://www.freedesktop.org/software/systemd/man/loginctl.html
- containers registries configuration documentation: https://www.mankier.com/5/containers-registries.conf
- containers storage configuration documentation: https://www.mankier.com/5/containers-storage.conf
- Debian security update guidance for `unattended-upgrades`: https://www.debian.org/security/
- Red Hat dnf automatic update documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/installing_managing_and_removing_user-space_components/automating-software-updates_using-appstream

## Issues Found
- Fedora and CentOS Stream install commands did not install `fuse-overlayfs`, but the storage configuration explicitly set `mount_program = "/usr/bin/fuse-overlayfs"`. Added `fuse-overlayfs` to the Fedora/CentOS package commands and updated rootless networking support to use `passt`, matching current Podman guidance.
- Rootless `systemctl --user` commands can fail in a `sudo -u podman-user -i` shell when the runtime directory is not exported. Added `export XDG_RUNTIME_DIR=/run/user/$(id -u)` after switching to the container user.
- The deployment example used `--restart=always` for a manually run container, then later moved the container under systemd. Removed the container-level restart policy so systemd owns restart behavior.
- `podman generate systemd` is deprecated in current Podman documentation. Replaced the generated unit workflow with a Quadlet `.container` file under `~/.config/containers/systemd`, then enabled the generated `web-app.service`.
- The SSH restart command used `sshd` for all distributions. Split it into Fedora/CentOS (`sshd`) and Debian/Ubuntu (`ssh`) variants.
- The automatic security update section only covered Fedora/CentOS even though the guide also covers Debian/Ubuntu. Added the Debian/Ubuntu `unattended-upgrades` package command.

## Review Notes
- Podman was not installed in the local review environment, so CLI validation used official Podman documentation rather than local `podman --help` output.
- The firewall examples assume `firewalld` on Fedora/CentOS and `ufw` on Debian/Ubuntu. Minimal installations may require installing or enabling the chosen firewall package first.
