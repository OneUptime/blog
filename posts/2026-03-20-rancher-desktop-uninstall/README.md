# How to Uninstall Rancher Desktop Completely

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher Desktop, Uninstall, Cleanup, macOS, Window

Description: Completely remove Rancher Desktop and all associated data, configurations, and virtual machines from your system.

## Introduction

Rancher Desktop is an open-source desktop application that provides Kubernetes and container management tools for local development. To uninstall it completely, you should remove the application itself, reset the Rancher Desktop cluster and settings, and clean up any remaining host-side data and deployment profiles.

## Prerequisites

- A computer running macOS, Windows, or Linux
- Permissions to shut down and uninstall Rancher Desktop
- A backup of any images, containers, Kubernetes workloads, or settings you want to keep

## Overview

A complete Rancher Desktop uninstall usually includes:

- Shutting down Rancher Desktop
- Running a Factory Reset to remove the cluster and Rancher Desktop settings
- Uninstalling the application or package
- Deleting any remaining host-side data directories
- Removing deployment profiles, which are not removed by a factory reset or uninstall

## Step 1: Shut Down Rancher Desktop

```bash
# Verify rdctl is installed
rdctl version

# Shut down Rancher Desktop cleanly
rdctl shutdown
```

If `rdctl shutdown` fails because Rancher Desktop is not running, quit the app from its window or tray/menu bar icon before continuing.

## Step 2: Factory Reset Rancher Desktop

Open Rancher Desktop and go to **Troubleshooting**. Click **Factory Reset** and confirm the reset.

According to the official documentation, a Factory Reset removes the cluster and all other Rancher Desktop settings, then closes Rancher Desktop. If you want a clean uninstall, do the reset before removing the application itself.

## Step 3: Uninstall Rancher Desktop

### On macOS

1. Open Finder > Applications.
2. Find Rancher Desktop.
3. Select it and choose File > Move to Trash.
4. Empty Trash.

### On Windows

1. Open Settings > Apps > Apps & features.
2. Find and select Rancher Desktop.
3. Click Uninstall and confirm.
4. Follow the uninstaller prompts and click Finish.

### On Linux

Use the uninstall steps that match how Rancher Desktop was installed.

```bash
# Debian / Ubuntu (.deb)
sudo apt remove --autoremove rancher-desktop
sudo rm /etc/apt/sources.list.d/isv-rancher-stable.list
sudo rm /usr/share/keyrings/isv-rancher-stable-archive-keyring.gpg
sudo apt update

# openSUSE (.rpm)
sudo zypper remove --clean-deps rancher-desktop
sudo zypper removerepo isv_Rancher_stable

# Fedora (.rpm)
sudo dnf remove rancher-desktop
sudo rm '/etc/yum.repos.d/isv:Rancher:stable.repo'
```

If you installed Rancher Desktop as an AppImage, delete the AppImage file.

## Step 4: Remove Remaining Data and Configuration

After the application is removed, delete any remaining Rancher Desktop data directories if they still exist.

```bash
# macOS
rm -rf "$HOME/Library/Application Support/rancher-desktop"

# Linux
rm -rf "$HOME/.local/share/rancher-desktop"

# macOS / Linux bundled CLI utilities
rm -rf "$HOME/.rd/bin"
```

On Windows, delete `%LOCALAPPDATA%\rancher-desktop` if it still exists.

If you configured deployment profiles, remove those as well. Rancher Desktop's official docs note that deployment profiles are not modified or removed by a factory reset or uninstall.

```powershell
# Windows user profile
reg delete "HKCU\Software\Policies\Rancher Desktop" /f

# Windows machine-wide profile
reg delete "HKLM\Software\Policies\Rancher Desktop" /f
```

```bash
# macOS user profiles
rm -f "$HOME/Library/Preferences/io.rancherdesktop.profile.defaults.plist"
rm -f "$HOME/Library/Preferences/io.rancherdesktop.profile.locked.plist"

# macOS system profiles
sudo rm -f "/Library/Managed Preferences/io.rancherdesktop.profile.defaults.plist"
sudo rm -f "/Library/Managed Preferences/io.rancherdesktop.profile.locked.plist"
sudo rm -f "/Library/Preferences/io.rancherdesktop.profile.defaults.plist"
sudo rm -f "/Library/Preferences/io.rancherdesktop.profile.locked.plist"

# Linux user profiles
rm -f "$HOME/.config/rancher-desktop.defaults.json"
rm -f "$HOME/.config/rancher-desktop.locked.json"

# Linux system profiles
sudo rm -f /etc/rancher-desktop/defaults.json
sudo rm -f /etc/rancher-desktop/locked.json
sudo rm -f /usr/etc/rancher-desktop/defaults.json
sudo rm -f /usr/etc/rancher-desktop/locked.json
```

## Step 5: Verify Removal

```bash
# macOS / Linux: rdctl should no longer be available
command -v rdctl || echo "rdctl removed"

# Linux data directory
test ! -d "$HOME/.local/share/rancher-desktop" && echo "Linux data removed"

# macOS data directory
test ! -d "$HOME/Library/Application Support/rancher-desktop" && echo "macOS data removed"

# macOS / Linux utility directory
test ! -d "$HOME/.rd/bin" && echo "~/.rd/bin removed"
```

On Windows, confirm Rancher Desktop no longer appears in Apps & features and that `%LOCALAPPDATA%\rancher-desktop` and any Rancher Desktop policy keys have been removed.

## Common Cleanup Tasks

```bash
# Show Rancher Desktop settings before you reset or uninstall
rdctl list-settings

# Check for Rancher Desktop utility links on macOS / Linux
ls "$HOME/.rd/bin"

# Search common shell startup files for Rancher Desktop PATH entries
grep -n '\.rd/bin' "$HOME/.bashrc" "$HOME/.zshrc" "$HOME/.profile" 2>/dev/null
```

## Troubleshooting

If a reinstall still picks up old locked settings, deployment profiles were not removed. Rancher Desktop's deployment profile documentation explicitly states that those profiles are not affected by a factory reset or uninstall.

If commands such as `docker`, `kubectl`, `nerdctl`, or `helm` still resolve to Rancher Desktop after uninstalling on macOS or Linux, remove any remaining `~/.rd/bin` entry from your shell startup files.

## Conclusion

To uninstall Rancher Desktop completely, shut it down, factory-reset it, uninstall the application, and remove any remaining host-side data and deployment profiles. This leaves you with a clean slate for reinstalling Rancher Desktop or switching to another local Kubernetes and container setup.
