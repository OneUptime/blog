# Validation Summary: How to Use Podman on WSL2 Without Podman Machine

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Podman
- Podman Machine
- WSL2
- Windows
- Linux
- systemd
- Quadlet
- Podman Compose
- Visual Studio Code Remote - WSL

## Sources Consulted
- Microsoft Learn, "Install WSL": https://learn.microsoft.com/en-us/windows/wsl/install
- Microsoft Learn, "Use systemd to manage Linux services with WSL": https://learn.microsoft.com/en-us/windows/wsl/systemd
- Microsoft Learn, "Accessing network applications with WSL": https://learn.microsoft.com/en-us/windows/wsl/networking
- Podman docs, `podman-machine(1)`: https://docs.podman.io/en/latest/markdown/podman-machine.1.html
- Podman docs, `podman-machine-init(1)`: https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- Podman docs, `podman-system-migrate(1)`: https://docs.podman.io/en/latest/markdown/podman-system-migrate.1.html
- Podman docs, `podman-system-service(1)`: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman docs, `podman-systemd.unit(5)`: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman docs, `podman-compose(1)`: https://docs.podman.io/en/latest/markdown/podman-compose.1.html
- Podman docs, `podman-info(1)`: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman docs, `podman-network(1)`: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman docs, `podman(1)` rootless guidance: https://docs.podman.io/en/v4.3/markdown/podman.1.html

## Issues Found
- The post described Podman Machine on Windows as a separate QEMU or Hyper-V VM and implied WSL2 plus Podman Machine always meant two VMs. Current Podman documentation shows Windows uses the WSL provider by default, with Hyper-V also supported. I updated the wording to describe a separate Podman-managed Linux environment instead of a guaranteed second VM.
- The WSL distro install command used a release-specific identifier. I changed it to `wsl --install -d Ubuntu`, which matches the stable distro naming used in Microsoft documentation and avoids a brittle version-specific name.
- The WSL verification text said the distro should be "running" after `wsl --list --verbose`. That command is primarily used to confirm the distro is using `VERSION 2`, so I corrected the wording.
- The package installation steps did not include `fuse-overlayfs`, even though the later storage configuration explicitly referenced it. I added `fuse-overlayfs` to the Ubuntu and Fedora install commands.
- The rootless setup missed the documented `podman system migrate` step related to subordinate UID/GID mapping changes. I added it before the `usermod` command.
- The systemd and cgroup verification commands were weaker than the documented checks. I replaced them with `systemctl status`, `systemctl list-unit-files --type=service`, and `podman info --format '{{.Host.CgroupsVersion}}'`.
- The VS Code socket guidance only printed the socket path. I updated it to start `podman.socket` first and print the socket URI in the form expected by socket-based clients.
- The Quadlet section used `systemctl --user enable --now devstack.service`. Podman’s Quadlet documentation explains that generated units are handled differently and should be started after `daemon-reload`, not enabled like regular persistent unit files. I changed the commands accordingly.
- The Compose examples used the standalone `podman-compose` command. Current Podman documentation presents `podman compose` as the supported wrapper, so I updated the examples to use `podman compose`.
- The Docker compatibility section implied aliases would help scripts and tools. Shell aliases only help interactive shells. I corrected the wording and updated the compose alias to point to `podman compose`.
- The storage-driver check used `cat ~/.config/containers/storage.conf`, which can fail on a valid setup when that file does not exist. I replaced it with `podman info --format '{{.Store.GraphDriverName}}'` and limited the config snippet to the case where `storage.conf` already exists.

## Review Notes
None.
