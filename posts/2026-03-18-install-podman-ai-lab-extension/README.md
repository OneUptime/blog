# How to Install the Podman AI Lab Extension

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, AI, Machine Learning, Podman Desktop, AI Lab

Description: Learn how to install and set up the Podman AI Lab extension in Podman Desktop for running local AI models and experiments.

---

> Podman AI Lab brings local AI development to your desktop without sending data to the cloud.

Running AI models locally gives you full control over your data and eliminates cloud dependency. The Podman AI Lab extension for Podman Desktop provides a graphical interface to download, run, and experiment with large language models and other AI tools directly on your machine. This guide walks you through the complete installation process.

---

## Prerequisites

Before installing the AI Lab extension, you need Podman and Podman Desktop installed on your system.

### Install Podman

```bash
# On Fedora/RHEL

sudo dnf install podman -y

# On Ubuntu/Debian
sudo apt update
sudo apt install podman -y

# On macOS with Homebrew
brew install podman

# Initialize and start the Podman machine (macOS/Windows)
podman machine init
podman machine start

# Verify Podman is running
podman info --format '{{.Host.RemoteSocket.Path}}'
```

### Install Podman Desktop

```bash
# On Fedora using Flathub
flatpak install -y flathub io.podman_desktop.PodmanDesktop

# On macOS with Homebrew
brew install --cask podman-desktop

# On Ubuntu/Debian, download the .deb from the official site
# Visit https://podman-desktop.io/downloads and grab the latest .deb
sudo dpkg -i podman-desktop-*.deb
```

## Installing the AI Lab Extension

### Method 1: Install from the Podman Desktop UI

```bash
# Launch Podman Desktop
# On Linux
flatpak run io.podman_desktop.PodmanDesktop

# On macOS
open -a "Podman Desktop"
```

Once Podman Desktop is open:

1. Navigate to the **Extensions** tab in the left sidebar.
2. Search for **Podman AI Lab** in the catalog.
3. Click **Install** next to the Podman AI Lab extension.
4. Wait for the download and installation to complete.
5. The AI Lab icon will appear in the left sidebar.

### Method 2: Install a Custom Extension Image

1. Navigate to the **Extensions** tab in the left sidebar.
2. Click **Install custom...**.
3. Enter the extension image name: `ghcr.io/containers/podman-desktop-extension-ai-lab`.
4. Click **Install**.
5. Verify the extension by checking the **Installed** tab on the Extensions page.

## Verifying the Installation

```bash
# Check that the Podman machine has sufficient resources for AI workloads
podman machine inspect --format '{{.Resources.CPUs}} CPUs, {{.Resources.Memory}} bytes RAM'

# For AI Lab, a Podman machine with at least 12GB of RAM and 4 CPUs is recommended.
# On QEMU-backed machines, if your machine has less, increase it.
podman machine stop
podman machine set --memory 12288 --cpus 6
podman machine start
```

### Confirm Extension Is Active

Check the left navigation pane for the Podman AI Lab icon and verify that Podman AI Lab appears in the **Installed** tab on the Extensions page.

## Configuring the Extension

### Check Model Storage Space

```bash
# By default, models are stored in the Podman machine
# Check available disk space on the Podman machine
podman machine ssh df -h /

# If you need more space, increase the disk size
podman machine stop
# Disk size can only be increased, and this setting applies to QEMU-backed machines.
podman machine set --disk-size 100
podman machine start
```

### Adjust Resource Limits

```bash
# Check current resource allocation
podman machine inspect --format 'CPUs: {{.Resources.CPUs}}, Memory: {{.Resources.Memory}} bytes, Disk: {{.Resources.DiskSize}} bytes'

# Recommended minimums for AI workloads:
# - CPUs: 4+
# - Memory: 12288MB+ (12GB)
# - Disk: 50GB+ (models can be large)

# Apply recommended settings on QEMU-backed machines
podman machine stop
podman machine set --cpus 8 --memory 16384 --disk-size 100
podman machine start
```

## Troubleshooting Common Issues

### Extension Fails to Install

```bash
# Clean up unused Podman resources and retry the installation from Podman Desktop
podman system prune --volumes -f

# Pull the extension image manually
podman pull ghcr.io/containers/podman-desktop-extension-ai-lab
```

### Podman Machine Not Responding

```bash
# Reset the Podman machine if it becomes unresponsive
podman machine stop
podman machine rm -f
podman machine init --cpus 8 --memory 16384 --disk-size 100
podman machine start

# Reinstall the extension from Extensions > Catalog > Install Podman AI Lab
```

### Check Logs for Errors

1. Click the **Troubleshooting** icon in the Podman Desktop status bar.
2. Select the **Logs** tab to view the logs.
3. Optionally, select **Gather Logs** to save all logs into a `.zip` file.

## Summary

Installing the Podman AI Lab extension is straightforward with either the graphical Podman Desktop catalog or the custom extension image flow. The key steps are ensuring Podman and Podman Desktop are installed, allocating sufficient resources to the Podman machine for AI workloads, and installing the extension from the catalog. With the AI Lab extension active, you can begin downloading and running AI models locally without any cloud services.
