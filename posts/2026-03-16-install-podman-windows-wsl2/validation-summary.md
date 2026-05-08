# Validation Summary: How to Install Podman on Windows with WSL2

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Podman
- Podman for Windows
- WSL2
- Windows Package Manager (winget)
- Ubuntu / APT
- Rootless containers
- VS Code Dev Containers

## Sources Consulted
- Podman Installation Instructions: https://podman.io/docs/installation
- Podman for Windows guide: https://github.com/containers/podman/blob/main/docs/tutorials/podman-for-windows.md
- Podman machine list documentation: https://docs.podman.io/en/stable/markdown/podman-machine-list.1.html
- Podman command/rootless mode documentation: https://docs.podman.io/en/latest/markdown/podman.1.html
- Microsoft WSL installation documentation: https://learn.microsoft.com/en-us/windows/wsl/install
- Microsoft WSL advanced settings documentation: https://learn.microsoft.com/en-us/windows/wsl/wsl-config
- Microsoft WSL systemd documentation: https://learn.microsoft.com/en-us/windows/wsl/systemd
- VS Code Dev Containers alternate Docker options: https://code.visualstudio.com/remote/advancedcontainers/docker-options
- Windows Package Manager manifests repository: https://github.com/microsoft/winget-pkgs

## Issues Found
- The post said Linux containers run "natively" on Windows with the Podman Windows installer. Podman for Windows runs containers in a guest Linux system, so the wording was changed to "on Windows" to avoid implying Windows-native Linux container execution.
- The post described Podman for Windows as only using a managed WSL2 machine. Current Podman for Windows documentation supports WSL2 or Hyper-V providers, so the description was updated.
- The prerequisites listed Windows 10 version 2004+ or Windows 11 for the whole guide. Current Podman for Windows documentation requires Windows 11 or later for the native installer workflow, while Windows 10 version 2004+ remains valid for WSL2 itself. The prerequisite was narrowed accordingly.
- The `podman machine init` comment said it always creates a WSL2-based VM. Podman can use WSL or Hyper-V depending on provider configuration, so the comment now specifies WSL only when WSL is selected.
- The port-forwarding troubleshooting section suggested enabling systemd in `/etc/wsl.conf`. Microsoft documents WSL localhost forwarding as a `.wslconfig` setting, and systemd is unrelated to host localhost forwarding. The troubleshooting snippet now points to `%USERPROFILE%\.wslconfig` and `localhostForwarding=true`.

## Review Notes
The remaining commands and snippets are technically valid against current documentation. The direct Ubuntu `apt install podman` path is valid for Ubuntu 20.10 and newer, but users on older Ubuntu releases would need a different installation path.
