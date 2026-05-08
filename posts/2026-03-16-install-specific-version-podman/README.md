# How to Install a Specific Version of Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Installation, Linux, Container, DevOps

Description: Learn how to install a specific version of Podman on various Linux distributions, useful for compatibility requirements and reproducible environments.

---

> Pinning Podman to a specific version ensures consistent behavior across your development, staging, and production environments.

There are times when you need a particular version of Podman rather than the latest release. You might need to match a production environment, stay on a version your CI pipeline has been tested against, or avoid a known regression. This guide covers installing specific Podman versions across major distributions.

---

## Prerequisites

- A Linux system (Fedora, Debian/Ubuntu, CentOS/RHEL, or Arch)
- A user account with sudo privileges
- An active internet connection

## Check Available Versions

Before installing, determine which versions are available on your system.

### Fedora / CentOS Stream / RHEL

```bash
# List all available Podman versions

sudo dnf list podman --showduplicates | sort -r

# Example output:
# podman.x86_64    5.3.1-1.fc40    updates
# podman.x86_64    5.2.0-1.fc40    fedora
# podman.x86_64    5.1.2-1.fc40    fedora
```

### Debian / Ubuntu

```bash
# List available Podman versions
apt list -a podman 2>/dev/null

# Check which enabled repositories, including backports, provide Podman
apt-cache policy podman
```

### Arch Linux

```bash
# Arch only keeps the latest version in its repos
# Check the current version
pacman -Si podman

# For older versions, use the Arch Linux Archive
# https://archive.archlinux.org/packages/p/podman/
```

## Install a Specific Version

### On Fedora

```bash
# Install a specific version using the full version string
sudo dnf install -y podman-5.2.0-1.fc40

# Verify the installed version
podman --version
```

To prevent automatic updates from overriding your pinned version:

```bash
# Exclude Podman from automatic updates
sudo dnf versionlock add podman

# To remove the lock later
sudo dnf versionlock delete podman
```

If `versionlock` is not installed:

```bash
# Install the versionlock plugin
sudo dnf install -y python3-dnf-plugin-versionlock
```

### On Debian / Ubuntu

```bash
# Install a specific version
sudo apt install -y podman=4.3.1+ds1-8+b1

# Verify
podman --version
```

Prevent automatic upgrades:

```bash
# Hold the package at the current version
sudo apt-mark hold podman

# To unhold later
sudo apt-mark unhold podman

# Check held packages
apt-mark showhold
```

### On CentOS Stream / RHEL

```bash
# Install a specific version using a version string from dnf list
sudo dnf install -y podman-5.6.0-2.el9

# Lock the version
sudo dnf versionlock add podman
```

### On Arch Linux

Arch Linux does not keep old versions in its repositories, but you can use the Arch Linux Archive:

```bash
# Download a specific version from the archive
wget https://archive.archlinux.org/packages/p/podman/podman-5.2.0-1-x86_64.pkg.tar.zst

# Install the downloaded package
sudo pacman -U podman-5.2.0-1-x86_64.pkg.tar.zst
```

Prevent Podman from being upgraded:

```bash
# Add Podman to the IgnorePkg list in pacman.conf
sudo sed -i '/^#IgnorePkg/a IgnorePkg = podman' /etc/pacman.conf
```

## Install from COPR (Fedora) for Testing Versions

For unreleased testing builds:

```bash
# Enable a COPR repository with specific Podman versions
sudo dnf copr enable rhcontainerbot/podman-next

# List available versions
sudo dnf list podman --showduplicates --repo copr:copr.fedorainfracloud.org:rhcontainerbot:podman-next

# Install from the COPR repo
sudo dnf install -y podman --repo copr:copr.fedorainfracloud.org:rhcontainerbot:podman-next
```

## Install a Specific Version from Source

For precise version control, build from source:

```bash
# Install build dependencies (Fedora example)
sudo dnf install -y git

# Clone the Podman repository
git clone https://github.com/containers/podman.git /tmp/podman
cd /tmp/podman

# Install build dependencies
sudo dnf -y builddep rpm/podman.spec

# Install runtime dependencies
sudo dnf -y install catatonit conmon containers-common-extra

# List available tags (versions)
git tag | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -20

# Checkout the specific version
git checkout v5.2.0

# Build and install
make BUILDTAGS="selinux seccomp" PREFIX=/usr
sudo env PATH=$PATH make install PREFIX=/usr

# Verify
podman --version
```

## Running a Practical Example

After installing your specific version, verify it works:

```bash
# Run a test container
podman run --rm docker.io/library/hello-world

# Check system compatibility
podman system info

# Run a more thorough test
podman run -d --name version-test -p 8080:80 docker.io/library/nginx:latest
curl http://localhost:8080
podman stop version-test
podman rm version-test
```

## Verifying the Exact Version

```bash
# Show the complete version information
podman version

# This shows both client and server versions, API version, and build details
# Useful for confirming the exact build in your environment
```

## Troubleshooting

If a version conflict arises during installation:

```bash
# Remove the existing version first
sudo dnf remove -y podman  # Fedora/CentOS
# or
sudo apt remove -y podman  # Debian/Ubuntu

# Then install the desired version
sudo dnf install -y podman-5.2.0-1.fc40
```

If version-locked packages block system updates:

```bash
# List all version locks
sudo dnf versionlock list  # Fedora/CentOS
# or
apt-mark showhold  # Debian/Ubuntu

# Remove specific locks when ready to upgrade
sudo dnf versionlock delete podman
```

## Summary

Installing a specific version of Podman ensures environment consistency and avoids unexpected breaking changes. Use your distribution's package manager to query available versions, install the exact one you need, and lock it to prevent unintended upgrades. For versions not available in your repositories, building from source with a specific git tag gives you complete control.
