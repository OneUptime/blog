# How to Install Podman Desktop on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Podman Desktop, Containers, GUI, Development

Description: Install Podman Desktop on RHEL to manage containers, images, and pods through a graphical interface alongside the Podman CLI.

---

Podman Desktop is a graphical application for managing containers, images, pods, and volumes on your local machine. It works with Podman (rootless and rootful) and provides a visual alternative to the command line for container management on RHEL.

## Prerequisites

Ensure Podman is installed on your system:

```bash
# Install Podman if not already present
sudo dnf install -y podman

# Verify Podman is working
podman --version
podman info
```

## Install Podman Desktop via Flatpak

The recommended installation method on RHEL is through Flatpak:

```bash
# Install Flatpak if not already present
sudo dnf install -y flatpak

# Add the Flathub repository
flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo

# Install Podman Desktop
flatpak install -y flathub io.podman_desktop.PodmanDesktop

# Launch Podman Desktop
flatpak run io.podman_desktop.PodmanDesktop
```

## Install via RPM (Alternative)

You can also download the RPM directly:

```bash
# Download the latest RPM from GitHub releases
curl -L -o podman-desktop.rpm \
    https://github.com/podman-desktop/podman-desktop/releases/latest/download/podman-desktop.x86_64.rpm

# Install the RPM
sudo dnf install -y ./podman-desktop.rpm

# Launch from the applications menu or command line
podman-desktop
```

## Initial Configuration

When you first launch Podman Desktop:

1. It detects the local Podman installation automatically
2. Select "Podman" as your container engine
3. The dashboard shows an overview of running containers, images, and pods

## Configure Rootless Podman

Podman Desktop works with rootless containers by default:

```bash
# Verify rootless Podman is configured
podman info --format '{{.Host.Security.Rootless}}'
# Should output: true

# Ensure user namespaces are configured
cat /etc/subuid | grep $USER
cat /etc/subgid | grep $USER

# If not present, add them
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $USER
```

## Verify the Connection

Inside Podman Desktop, check the connection status:

```bash
# From the terminal, verify Podman socket is active
systemctl --user status podman.socket

# If not running, enable it
systemctl --user enable --now podman.socket

# Verify the socket path
ls -la /run/user/$(id -u)/podman/podman.sock
```

## Create a Desktop Shortcut

If installed via RPM and no shortcut appears:

```bash
# Create a desktop entry
cat > ~/.local/share/applications/podman-desktop.desktop << 'EOF'
[Desktop Entry]
Name=Podman Desktop
Comment=Manage containers with Podman
Exec=podman-desktop
Icon=podman-desktop
Type=Application
Categories=Development;System;
EOF
```

## Update Podman Desktop

```bash
# Update via Flatpak
flatpak update io.podman_desktop.PodmanDesktop

# Or via RPM
sudo dnf update podman-desktop
```

Podman Desktop on RHEL provides a convenient graphical interface for developers and administrators who prefer visual container management alongside the powerful Podman CLI.
