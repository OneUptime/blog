# How to Install Podman Desktop on macOS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Podman Desktop, macOS, Installation

Description: Learn how to install and set up Podman Desktop on macOS for a graphical container management experience.

---

> Podman Desktop brings a full graphical interface for container management to macOS, making it easy to build, run, and manage containers without memorizing CLI commands.

Podman Desktop is the official graphical interface for Podman. It provides a user-friendly way to manage containers, images, pods, and volumes on macOS. If you are coming from Docker Desktop or prefer a visual workflow, Podman Desktop is an excellent alternative. This post covers the common installation methods and initial setup steps for macOS.

---

## System Requirements

Before installing, verify your system meets the minimum requirements:

- macOS 12 (Monterey) or later
- Apple Silicon (M1/M2/M3) or Intel processor
- At least 4 GB of RAM (8 GB recommended)
- At least 2 GB of free disk space

```bash
# Check your macOS version

sw_vers

# Check your processor architecture
uname -m
# arm64 = Apple Silicon, x86_64 = Intel
```

## Method 1: Download from the Official Website

The recommended way to install Podman Desktop on macOS is to use the `.dmg` installer from the Podman Desktop website.

```bash
# Open the Podman Desktop download page in your browser
open https://podman-desktop.io/downloads

# After downloading the .dmg file, mount and install it
# Double-click the downloaded .dmg file
# Drag Podman Desktop to the Applications folder
```

After installation, Podman Desktop appears in your Applications folder.

## Method 2: Install with Homebrew

You can also install Podman Desktop on macOS through Homebrew. The official Podman Desktop documentation lists Homebrew as an alternative method and recommends using either Homebrew or the `.dmg` installer consistently to avoid path conflicts.

```bash
# Update Homebrew
brew update

# Install Podman Desktop (cask)
brew install --cask podman-desktop

# This also installs the Podman engine if not already present
```

## Method 3: Install with the Podman CLI First

If you want the CLI before the desktop app, install Podman first.

```bash
# Install Podman CLI
brew install podman

# Initialize the Podman machine (creates a Linux VM)
podman machine init

# Start the Podman machine
podman machine start

# Verify Podman is working
podman info

# Then install Podman Desktop
brew install --cask podman-desktop
```

## Initial Setup and Configuration

When you launch Podman Desktop for the first time, it guides you through setup.

```bash
# Launch Podman Desktop from the terminal
open -a "Podman Desktop"

# Or find it in Applications and double-click
```

The setup wizard will:

1. Check if Podman is installed
2. Offer to install Podman if missing
3. Initialize and start a Podman machine
4. Configure the connection to the Podman engine

## Configuring the Podman Machine

Podman on macOS runs containers in a lightweight Linux VM called a Podman machine. You can configure its resources.

```bash
# Stop the current machine to change settings
podman machine stop

# Remove the default machine to recreate with custom resources
podman machine rm

# Create a new machine with more resources
podman machine init --cpus 4 --memory 4096 --disk-size 60

# Start the configured machine
podman machine start

# Verify the new settings
podman machine inspect
```

You can also adjust machine settings from within Podman Desktop under Settings > Resources.

## Verifying the Installation

Confirm everything is working correctly.

```bash
# Check Podman version
podman --version

# Run a test container
podman run --rm docker.io/library/hello-world

# List running containers from the CLI
podman ps

# Check Podman machine status
podman machine list
```

You should also see the test container appear in the Podman Desktop interface under the Containers tab.

## Enabling Docker Compatibility

If you have tools or scripts that use the Docker CLI, Podman Desktop can provide compatibility.

```bash
# Enable Docker compatibility in Podman Desktop:
# Settings > Preferences > Docker Compatibility
# Turn on Docker Compatibility, then enable Third-Party Docker Tool Compatibility

# Verify Docker socket is available
ls -la /var/run/docker.sock

# Verify the socket reports the Podman engine version
curl -s --unix-socket /var/run/docker.sock "http://v1.41/info"

# Test Docker CLI compatibility if the Docker CLI is installed
docker run --rm docker.io/library/alpine echo "Docker compatibility works"
```

## Updating Podman Desktop

Keep Podman Desktop up to date for the latest features and fixes.

```bash
# Update with Homebrew
brew update
brew upgrade --cask podman-desktop

# Or check for updates within the app
# Podman Desktop > Check for Updates
```

## Uninstalling Podman Desktop

If you need to remove Podman Desktop.

```bash
# Remove Podman Desktop
brew uninstall --cask podman-desktop

# Optionally remove the Podman machine and CLI
podman machine stop
podman machine rm
brew uninstall podman
```

## Summary

Installing Podman Desktop on macOS is straightforward by downloading the recommended installer from the official website or using Homebrew (`brew install --cask podman-desktop`). The setup wizard handles Podman engine installation and machine configuration automatically. You can customize the Podman machine resources for your workload, enable Docker compatibility for existing tools, and manage everything through the graphical interface. Podman Desktop provides a complete container management experience on macOS without requiring a Docker Desktop license.
