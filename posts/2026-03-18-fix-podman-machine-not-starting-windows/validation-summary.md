# Validation Summary: How to Fix Podman Machine Not Starting on Windows

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Podman
- Podman Machine
- Windows
- WSL 2
- Hyper-V
- Windows Defender
- PowerShell
- WinGet
- Chocolatey

## Sources Consulted
- Podman `podman machine init` documentation: https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- Podman `podman machine inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-machine-inspect.1.html
- Podman `podman machine rm` documentation: https://docs.podman.io/en/latest/markdown/podman-machine-rm.1.html
- Podman `podman machine reset` documentation: https://docs.podman.io/en/latest/markdown/podman-machine-reset.1.html
- Podman Desktop Windows installation documentation: https://podman-desktop.io/docs/installation/windows-install
- Podman Desktop Windows troubleshooting documentation: https://podman-desktop.io/docs/troubleshooting/troubleshooting-podman-on-windows
- Microsoft WSL basic commands documentation: https://learn.microsoft.com/en-us/windows/wsl/basic-commands
- Microsoft WSL advanced settings documentation: https://learn.microsoft.com/en-us/windows/wsl/wsl-config
- Microsoft Defender `Add-MpPreference` documentation: https://learn.microsoft.com/en-us/powershell/module/defender/add-mppreference
- Microsoft Hyper-V `Optimize-VHD` documentation: https://learn.microsoft.com/en-us/powershell/module/hyper-v/optimize-vhd
- Microsoft WinGet `upgrade` documentation: https://learn.microsoft.com/en-us/windows/package-manager/winget/upgrade

## Issues Found
- The post described every Windows Podman machine as Fedora CoreOS. Current Podman documentation says WSL uses a custom Fedora image, while other providers use a custom Fedora CoreOS-based image. Updated the wording to distinguish WSL from other machine providers.
- The Windows Defender exclusion commands used `Add-MpExclusion`, which is not the documented Defender PowerShell cmdlet. Replaced it with `Add-MpPreference -ExclusionPath`.
- The manual DNS test wrote directly to `/etc/resolv.conf` without elevated permissions inside the WSL distribution. Updated the command to use `sudo tee` and clarified it is a temporary test.
- The WSL VHDX compaction command omitted important `Optimize-VHD` requirements. Added a note that it is part of the Hyper-V PowerShell module and requires the VHDX to be detached or attached read-only.
- The version mismatch diagnostic used `podman machine inspect --format "{{.ImagePath}}"`, but current `podman machine inspect` documentation does not list `.ImagePath` as a supported placeholder. Replaced it with `podman info`, which Podman documentation identifies as the command that reveals host and machine versions.
- The "remove all Podman machines" command used `podman machine rm --all --force`, but current `podman machine rm` documentation does not include `--all`. Replaced it with `podman machine reset --force`, which is documented to remove all Podman machines and machine configuration.
- The VirtualBox conflict note referenced an old specific minimum version. Updated it to recommend a current version that supports Hyper-V coexistence.
- The tag metadata used `Window` instead of `Windows`. Corrected the tag.

## Review Notes
The guide is technically relevant and broadly accurate after the fixes. Some troubleshooting actions, such as deleting Podman data directories or unregistering the WSL distribution, are destructive; the post already presents them in recovery/fresh-start contexts, which is appropriate.
