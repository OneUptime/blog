# How to Downgrade Podman to a Previous Version

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Installation, Linux, Container, DevOps

Description: Learn how to safely downgrade Podman to a previous version when you encounter regressions or compatibility issues after an upgrade.

---

> Sometimes rolling back Podman to a previous version is the fastest way to resolve regressions and restore a working container environment.

Upgrading Podman usually goes smoothly, but occasionally a new version introduces regressions or incompatibilities with your workflow. This guide covers how to safely downgrade Podman on major distributions, handle storage compatibility, and lock the version to prevent re-upgrading.

---

## Prerequisites

- An existing Podman installation
- A user account with sudo privileges
- Knowledge of the target version you want to downgrade to

## Pre-Downgrade Steps

Before downgrading, protect your existing data:

```bash
# Check the current version

podman --version

# Stop all running containers
podman stop --all

# Export important containers if needed
podman export my-container > my-container-backup.tar

# List your images for reference
podman images > ~/podman-images-list.txt
```

## Downgrade on Fedora

```bash
# List available older versions
sudo dnf list podman --showduplicates | sort -r

# Downgrade to a specific version
sudo dnf downgrade -y podman-5.2.0-1.fc40

# Verify the downgraded version
podman --version
```

Lock the version to prevent automatic re-upgrading:

```bash
# Install versionlock if needed
sudo dnf install -y python3-dnf-plugin-versionlock

# Lock Podman at the current (downgraded) version
sudo dnf versionlock add podman

# Verify the lock
sudo dnf versionlock list
```

## Downgrade on Debian / Ubuntu

```bash
# List available versions
apt list -a podman 2>/dev/null

# Install the specific older version
sudo apt install -y podman=4.3.1+ds1-8+b1

# If the above fails due to dependencies, use apt with --allow-downgrades
sudo apt install -y --allow-downgrades podman=4.3.1+ds1-8+b1

# Verify
podman --version
```

Hold the package to prevent re-upgrading:

```bash
# Hold the package at the current version
sudo apt-mark hold podman

# Verify the hold
apt-mark showhold
```

## Downgrade on CentOS Stream / RHEL

```bash
# List available versions
sudo dnf list podman --showduplicates | sort -r

# Downgrade to a specific version
sudo dnf downgrade -y podman-5.1.0-1.el9

# Lock the version
sudo dnf versionlock add podman

# Verify
podman --version
```

## Downgrade on Arch Linux

Arch does not keep old packages in its repositories, but you can use the Arch Linux Archive:

```bash
# Download the desired version from the archive
wget https://archive.archlinux.org/packages/p/podman/podman-5.1.0-1-x86_64.pkg.tar.zst

# Downgrade by installing the downloaded package
sudo pacman -U podman-5.1.0-1-x86_64.pkg.tar.zst

# Prevent Podman from being upgraded
# Add podman to IgnorePkg in the [options] section of /etc/pacman.conf:
# IgnorePkg = podman
sudoedit /etc/pacman.conf
```

Alternatively, use the `downgrade` AUR helper:

```bash
# Install the downgrade tool from AUR
yay -S downgrade

# Downgrade Podman interactively
sudo downgrade podman
```

## Downgrade on openSUSE

```bash
# List available versions
zypper se -s podman

# Install a specific older version
sudo zypper install -y --oldpackage podman-5.1.0-1.x86_64

# Lock the package
sudo zypper addlock podman

# Verify
podman --version
```

## Downgrade on macOS (Homebrew)

Homebrew does not natively support downgrading, but you can extract a previous formula version into your own tap:

```bash
# Stop and remove the current machine
podman machine stop
podman machine rm --force

# Uninstall current version
brew uninstall podman

# Create a tap for extracted versions if you do not already have one
brew tap-new "$USER/versions"

# Extract and install the version you want
brew extract --version=5.1.0 podman "$USER/versions"
brew install "$USER/versions/podman@5.1.0"

# Pin the formula to prevent upgrades
brew pin "$USER/versions/podman@5.1.0"

# Reinitialize the machine
podman machine init
podman machine start

# Verify
podman --version
```

## Handle Storage Compatibility

Downgrading can cause storage format incompatibilities. `podman system migrate` is intended to migrate existing containers to the current Podman version, so it is useful after upgrades but may not reverse storage changes made by a newer release:

```bash
# Check whether Podman can read the current storage
podman info

# If storage is incompatible, you may need to reset storage
# WARNING: This removes all pods, containers, images, networks, volumes, and machines
podman system reset

# Confirm the reset worked
podman info
```

If you exported containers before downgrading, re-import them:

```bash
# Import a previously exported container
podman import my-container-backup.tar my-restored-image

# Run the restored image
podman run -d --name restored my-restored-image
```

## Running a Verification Test

After downgrading, confirm everything works:

```bash
# Check the version
podman --version

# Run a test container
podman run --rm docker.io/library/hello-world

# Test container networking
podman run --rm docker.io/library/alpine:latest wget -qO- https://httpbin.org/ip

# Test volume mounts
podman run --rm -v /tmp:/data:Z docker.io/library/alpine:latest ls /data

# Run a practical container
podman run -d --name test-web -p 8080:80 docker.io/library/nginx:latest
curl http://localhost:8080
podman stop test-web
podman rm test-web
```

## Removing Version Locks

When you are ready to upgrade again, remove the version lock:

```bash
# Fedora / CentOS / RHEL
sudo dnf versionlock delete podman

# Debian / Ubuntu
sudo apt-mark unhold podman

# Arch Linux
# Remove podman from the IgnorePkg line in /etc/pacman.conf
sudoedit /etc/pacman.conf

# openSUSE
sudo zypper removelock podman

# macOS
brew unpin "$USER/versions/podman@5.1.0"
```

## Troubleshooting

If downgrading fails with dependency errors:

```bash
# On Fedora/CentOS, downgrade related packages together
sudo dnf downgrade -y podman containers-common crun

# On Debian/Ubuntu
sudo apt install -y --allow-downgrades podman=4.3.1+ds1-8+b1 containers-common=<version> crun=<version>
```

If storage errors persist after downgrading:

```bash
# Completely reset Podman storage
podman system reset --force

# Re-pull your images
podman pull docker.io/library/nginx:latest
```

## Summary

Downgrading Podman requires installing the specific older version through your package manager and handling potential storage format changes. Always stop containers before downgrading, verify storage with `podman info` afterward, and lock the package version to prevent automatic re-upgrading. Remember to export important containers before the process as a safety measure.
