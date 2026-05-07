# How to Install Podman Desktop on Windows

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, Window, Installation

Description: Learn how to install and configure Podman Desktop on Windows for graphical container management.

---

> Podman Desktop on Windows provides a native graphical interface for managing containers, making it an excellent Docker Desktop alternative without licensing concerns.

Podman Desktop runs natively on Windows and provides a full graphical interface for building, running, and managing containers. It uses WSL2 (Windows Subsystem for Linux 2) or Hyper-V to run a Linux VM where containers execute. This post covers installation methods, WSL2 setup, and initial configuration for Windows.

---

## System Requirements

Verify your system meets these requirements:

- Windows 10 Build 19043 or later, or Windows 11
- WSL2 enabled (recommended) or Hyper-V
- At least 6 GB of RAM for the Podman machine (8 GB recommended)
- At least 2 GB of free disk space
- Hardware virtualization enabled in BIOS

```powershell
# Check your Windows version

winver

# Check if WSL2 is installed
wsl --version

# Check if virtualization is enabled
systeminfo | findstr /i "Virtualization"
```

## Step 1: Enable WSL2

WSL2 is recommended for Podman Desktop on Windows. Enable it if not already active.

```powershell
# Enable WSL feature without installing a default Linux distribution (run PowerShell as Administrator)
wsl --update
wsl --install --no-distribution

# Restart your computer when prompted

# After restart, verify WSL2 is active
wsl --status
```

If WSL was already installed but using version 1, upgrade it.

```powershell
# Set WSL2 as the default version
wsl --set-default-version 2

# Update WSL to the latest version
wsl --update
```

## Step 2: Install Podman Desktop

There are several ways to install Podman Desktop on Windows.

### Method A: Download the Installer

```powershell
# Open the download page in your browser
start https://podman-desktop.io/downloads

# Download the Windows .exe installer
# Run the installer and follow the setup wizard
```

### Method B: Install with Winget

```powershell
# Install using the Windows Package Manager
winget install -e --id RedHat.Podman-Desktop
```

### Method C: Install with Chocolatey

```powershell
# Install using Chocolatey
choco install podman-desktop
```

## Step 3: Install the Podman Engine

Podman Desktop will prompt you to install the Podman engine on first launch. You can also install it manually.

```powershell
# Install Podman CLI with Winget
winget install RedHat.Podman

# Or download from the official releases page
start https://github.com/containers/podman/releases
```

## Step 4: Initialize the Podman Machine

Podman on Windows runs containers inside a WSL2-based Linux VM.

```powershell
# Initialize the Podman machine with default settings
podman machine init

# Or initialize with custom resources
podman machine init --cpus 4 --memory 4096 --disk-size 60

# Start the machine
podman machine start

# Verify the machine is running
podman machine list
```

## Step 5: Launch and Configure Podman Desktop

Launch Podman Desktop from the Start menu.

```powershell
# Search for "Podman Desktop" in the Start menu
```

The first-launch wizard will:

1. Detect the Podman installation
2. Check the Podman machine status
3. Start the machine if needed
4. Connect to the Podman engine

## Verifying the Installation

Run a quick test to confirm everything works.

```powershell
# Test from the command line
podman run docker.io/library/hello-world

# Check Podman system info
podman info

# List containers (should show the test run)
podman ps -a
```

You should also see the container in the Podman Desktop GUI under the Containers tab.

## Configuring Docker Compatibility

Enable Docker socket compatibility for tools expecting Docker.

```powershell
# In Podman Desktop, enable:
# Settings > Preferences > Docker Compatibility
#
# Then open Settings > Docker Compatibility to view the socket mapping
# and select a Docker-compatible CLI context.
```

## Configuring WSL2 Resources

Limit the resources WSL2 can use by creating a `.wslconfig` file.

```powershell
# Create or edit the WSL2 configuration
notepad "$env:USERPROFILE\.wslconfig"
```

Add the following content:

```ini
[wsl2]
memory=4GB
processors=4
swap=2GB
```

```powershell
# Restart WSL2 to apply changes
wsl --shutdown
podman machine start
```

## Updating Podman Desktop

Keep your installation current.

```powershell
# Update with Winget
winget upgrade -e --id RedHat.Podman-Desktop

# Or check for updates in the app
# Help > Check for Updates
```

## Summary

Installing Podman Desktop on Windows requires a Linux VM through WSL2 or Hyper-V and the Podman engine. Install WSL2 first, then install Podman Desktop using the official installer, Winget, or Chocolatey. Initialize a Podman machine to create the Linux VM where containers run, then launch Podman Desktop for the graphical interface. You can configure machine resources, enable Docker compatibility, and tune WSL2 settings for your workload. Podman Desktop provides a complete container management solution on Windows without Docker Desktop licensing requirements.
