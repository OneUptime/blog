# How to Upgrade Podman to the Latest Version

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Installation, Linux, Container, DevOps

Description: A complete guide to upgrading Podman to the latest version on any Linux distribution, macOS, and Windows, including pre-upgrade checks and post-upgrade verification.

---

> Keeping Podman up to date ensures you benefit from the latest security patches, performance improvements, and new container features.

Podman receives frequent updates with bug fixes, security patches, and new features. Upgrading regularly keeps your container environment secure and compatible with the latest tools. This guide covers upgrading Podman across all major platforms.

---

## Prerequisites

- An existing Podman installation
- A user account with sudo privileges
- An active internet connection

## Pre-Upgrade Checklist

Before upgrading, prepare your environment:

```bash
# Check your current Podman version

podman --version

# List running containers that will need to be restarted
podman ps

# List all containers including stopped ones
podman ps -a

# Back up any important container configurations
podman inspect <container-name> > container-backup.json

# Stop all running containers
podman stop --all
```

## Upgrade on Fedora

```bash
# Update the package cache and upgrade Podman
sudo dnf update -y podman

# If you want to upgrade all packages including Podman
sudo dnf upgrade -y

# Verify the new version
podman --version
```

For the absolute latest version via COPR:

```bash
# Enable the Podman Next COPR repository
sudo dnf copr enable -y rhcontainerbot/podman-next

# Upgrade to the latest build
sudo dnf install -y podman

# Verify
podman --version
```

## Upgrade on Debian / Ubuntu

```bash
# Update package lists and upgrade Podman
sudo apt update
sudo apt install --only-upgrade -y podman

# Verify the new version
podman --version
```

For a newer version than what the default repository offers:

```bash
# On Debian 12, enable backports first
sudo tee /etc/apt/sources.list.d/debian-backports.sources >/dev/null <<'EOF'
Types: deb
URIs: http://deb.debian.org/debian
Suites: bookworm-backports
Components: main
Signed-By: /usr/share/keyrings/debian-archive-keyring.gpg
EOF

# Install the backported package
sudo apt update
sudo apt install -y -t bookworm-backports podman

# On Ubuntu, use the official Ubuntu repositories or upgrade to a newer Ubuntu release
sudo apt update
sudo apt install --only-upgrade -y podman
```

## Upgrade on CentOS Stream / RHEL

```bash
# Upgrade Podman
sudo dnf update -y podman

# Verify
podman --version
```

If version lock is in place, remove it first:

```bash
# Check for version locks
sudo dnf versionlock list

# Remove the lock on Podman
sudo dnf versionlock delete podman

# Now upgrade
sudo dnf update -y podman
```

## Upgrade on Arch Linux

```bash
# Arch's rolling release keeps packages current
sudo pacman -Syu podman

# Remove any IgnorePkg entries for Podman in pacman.conf if set
sudo sed -i '/^IgnorePkg.*podman/d' /etc/pacman.conf

# Verify
podman --version
```

## Upgrade on openSUSE

```bash
# Upgrade Podman
sudo zypper update -y podman

# Verify
podman --version
```

## Upgrade on macOS (Homebrew)

```bash
# Update Homebrew and upgrade Podman
brew update
brew upgrade podman

# After upgrading, recreate the Podman machine
podman machine stop
podman machine rm -f

# Initialize with a fresh VM image
podman machine init
podman machine start

# Verify
podman --version
```

## Upgrade on Windows

```bash
# Using winget
winget upgrade RedHat.Podman

# After upgrading, recreate the machine
podman machine stop
podman machine rm -f
podman machine init
podman machine start

# Verify
podman --version
```

## Post-Upgrade Verification

After upgrading, verify everything works correctly:

```bash
# Check the version
podman --version

# Display full version information
podman version

# View system info to confirm the upgrade
podman info | head -20

# Run a test container
podman run --rm docker.io/library/hello-world

# Restart any containers you stopped
podman start --all

# Verify all containers are running properly
podman ps
```

## Handling Storage Migration

Major version upgrades sometimes require a storage migration:

```bash
# If you see storage-related errors after upgrading
podman system migrate

# If migration fails, you may need to reset storage
# WARNING: This removes all pods, containers, images, networks, volumes, and machines
podman system reset
```

## Running a Post-Upgrade Test

Run a comprehensive test after upgrading:

```bash
# Pull a fresh image
podman pull docker.io/library/alpine:latest

# Run an interactive container
podman run --rm -it docker.io/library/alpine:latest sh -c "echo 'Upgrade successful'"

# Test volume mounts
mkdir -p /tmp/podman-test
echo "test" > /tmp/podman-test/data.txt
podman run --rm -v /tmp/podman-test:/data:Z docker.io/library/alpine:latest cat /data/data.txt

# Test port forwarding
podman run -d --name upgrade-test -p 9090:80 docker.io/library/nginx:latest
curl -s http://localhost:9090 | head -5
podman stop upgrade-test
podman rm upgrade-test

# Clean up
rm -rf /tmp/podman-test
```

## Troubleshooting

If containers fail to start after an upgrade:

```bash
# Run storage migration
podman system migrate

# Check for any remaining issues
podman system info
```

If you encounter CNI networking errors after a major upgrade:

```bash
# Podman 4.x and newer use Netavark by default instead of CNI
# Check the current network backend
podman info --format '{{.Host.NetworkBackend}}'

# If you change the network backend in containers.conf, reset Podman storage afterward
podman system reset
```

If rootless mode breaks after upgrading:

```bash
# Check your subuid/subgid mappings
cat /etc/subuid
cat /etc/subgid

# Reset the rootless storage
podman system reset
```

## Summary

Upgrading Podman is straightforward on all major platforms using their native package managers. Always stop running containers before upgrading, run `podman system migrate` after major version upgrades, and verify the installation with a test container. On macOS and Windows, recreate the Podman machine after upgrading to get the latest VM image.
