# Validation Summary: How to Install Podman Desktop on Windows

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Podman Desktop
- Podman
- Windows
- WSL2
- Hyper-V
- WinGet
- Chocolatey
- Docker compatibility

## Sources Consulted
- Podman Desktop official Windows installation documentation: https://podman-desktop.io/docs/installation/windows-install
- Podman official installation documentation: https://podman.io/docs/installation
- Podman official `podman machine init` documentation: https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- Podman official `podman machine set` documentation: https://docs.podman.io/en/stable/markdown/podman-machine-set.1.html
- Podman Desktop official Docker compatibility documentation: https://podman-desktop.io/docs/migrating-from-docker/managing-docker-compatibility
- Microsoft official WSL installation documentation: https://learn.microsoft.com/en-us/windows/wsl/install
- Microsoft official WSL advanced configuration documentation: https://learn.microsoft.com/en-us/windows/wsl/wsl-config

## Issues Found
- Updated the Windows requirement from Windows 10 version 2004 to Windows 10 Build 19043 or later, matching the current Podman Desktop Windows prerequisites.
- Updated the memory requirement from at least 4 GB to at least 6 GB for the Podman machine, matching the current Podman Desktop Windows prerequisites.
- Changed the WSL2 setup language from "required" to "recommended" because Podman Desktop can use WSL2 or Hyper-V as the machine provider.
- Replaced `wsl --install` with `wsl --update` and `wsl --install --no-distribution`, which matches Podman Desktop's current WSL setup guidance for creating the default WSL Podman machine without installing Ubuntu unnecessarily.
- Replaced `wsl --version` / `wsl --list --verbose` verification after setup with `wsl --status`, matching the Podman Desktop Windows installation documentation.
- Corrected the WinGet package ID from `RedHat.PodmanDesktop` to `RedHat.Podman-Desktop`.
- Corrected the WinGet upgrade command to use the same current exact package ID.
- Removed `podman-desktop --version` verification commands because the official Windows installation documentation does not document a `podman-desktop` CLI command on PATH.
- Changed the launch instructions to use the Start menu instead of the undocumented `podman-desktop` command.
- Removed `--rm` from the `podman run docker.io/library/hello-world` verification command so the subsequent `podman ps -a` and Podman Desktop GUI checks can actually show the exited test container.
- Replaced the Docker compatibility commands that removed and recreated the machine in rootful mode with the documented Podman Desktop Docker Compatibility settings workflow. Rootful mode is not the general Windows Docker compatibility setup path and switching rootful/rootless changes the visible container/image/volume storage.
- Updated the summary to say Windows uses a Linux VM through WSL2 or Hyper-V, rather than requiring WSL2 only.

## Review Notes
The `.wslconfig` example uses valid WSL2 keys (`memory`, `processors`, and `swap`). The `podman machine init --cpus`, `--memory`, `--disk-size`, and `--rootful` options are current, but the rootful workflow is better handled through documented Docker compatibility settings for this tutorial's stated goal.
