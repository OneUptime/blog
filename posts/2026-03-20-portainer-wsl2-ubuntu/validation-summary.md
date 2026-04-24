# Validation Summary: How to Install Portainer on WSL2 with Ubuntu - Part 3

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Windows Subsystem for Linux 2 (WSL2)
- Ubuntu
- Docker Engine
- Portainer CE
- Windows Terminal
- Windows Task Scheduler
- PowerShell
- Bash

## Sources Consulted
- Microsoft Learn, Install WSL: https://learn.microsoft.com/en-us/windows/wsl/install
- Microsoft Learn, Basic commands for WSL: https://learn.microsoft.com/en-us/windows/wsl/basic-commands
- Microsoft Learn, Advanced settings configuration in WSL: https://learn.microsoft.com/en-us/windows/wsl/wsl-config
- Microsoft Learn, Use systemd to manage Linux services with WSL: https://learn.microsoft.com/en-us/windows/wsl/systemd
- Docker Docs, Install Docker Engine on Ubuntu: https://docs.docker.com/engine/install/ubuntu/
- Docker Docs, Start the daemon: https://docs.docker.com/engine/daemon/start/
- Portainer Docs, Install Portainer CE with Docker on Linux: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Microsoft Learn, Windows Terminal dynamic profiles: https://learn.microsoft.com/en-us/windows/terminal/dynamic-profiles
- Microsoft Learn, Windows Terminal general profile settings: https://learn.microsoft.com/en-us/windows/terminal/customize-settings/profile-general
- Microsoft Learn, Windows Terminal appearance profile settings: https://learn.microsoft.com/en-us/windows/terminal/customize-settings/profile-appearance
- Microsoft Learn, Register-ScheduledTask: https://learn.microsoft.com/en-us/powershell/module/scheduledtasks/register-scheduledtask?view=windowsserver2022-ps

## Issues Found
- The WSL verification example implied `wsl -l -v` should show the distro in a `Running` state. Updated it to verify the distro is on WSL version `2`, which is the relevant check, and added the missing reboot note after `wsl --install` when prompted.
- The `.wslconfig` example mixed `localhostForwarding` with `networkingMode=mirrored`. Microsoft documents that mirrored networking is Windows 11 22H2+ only, and `localhostForwarding` is ignored when mirrored networking is enabled. Removed `networkingMode=mirrored` and corrected `autoMemoryReclaim=dropCache` to the documented value.
- The `iptables` section incorrectly said Docker works better with `iptables-legacy`. Docker documents support for both `iptables-nft` and `iptables-legacy`. Replaced the forced switch with a compatibility check.
- The Docker install command piped the convenience script straight to `sh` without `sudo`. Docker documents that the convenience script requires root or `sudo`. Updated the snippet to download the script and run it with `sudo sh`.
- The shell-startup approach in `.bashrc`/`.profile` would invoke `sudo` from shell startup and is not the supported WSL service-management path. Replaced it with systemd-based startup, plus a manual `service docker start` fallback for older WSL builds.
- The Portainer deployment used `portainer/portainer-ce:latest` and exposed port `9000` as the main access path. Current Portainer docs use HTTPS on port `9443` by default and document HTTP `9000` only as a legacy option. Updated the image tag to `portainer/portainer-ce:sts`, removed `9000`, and changed the access URL to `https://localhost:9443`.
- The Windows Terminal section implied that a manual WSL profile was needed and used a remote URL for `icon`. Microsoft documents that Windows Terminal auto-generates WSL profiles and documents file-based icon paths. Updated the text to reflect automatic WSL profile creation and simplified the optional custom profile.
- The Task Scheduler example attempted to run `sudo service docker start` from a non-interactive WSL invocation, which can fail on password prompts. Updated it to launch WSL at logon after systemd is enabled and to register the task explicitly for the current user.

## Review Notes
- Docker's convenience script is documented as appropriate for testing and development environments. For a more repeatable long-term setup, Docker's `apt` repository method is the preferred installation path.
- `autoMemoryReclaim` remains under WSL's `[experimental]` settings, so its behavior and availability can change between WSL releases.
- The `portainer/portainer-ce:sts` tag is a moving target. If this tutorial needs stricter reproducibility in the future, pinning a tested Portainer version or using the `:lts` channel would reduce drift.
- WSL instance lifecycle still differs from a traditional always-on Linux host. If the WSL distro stops, Docker and Portainer stop with it.
