# How to Install Podman on Debian

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Installation, Linux, Container, DevOps, Debian

Description: Learn how to install and configure Podman on Debian, including setting up rootless containers and verifying your installation.

---

> Podman brings daemonless containers to Debian and supports running containers without root access.

Podman is a powerful alternative to Docker that runs containers without a central daemon process. On Debian, Podman is available through the official repositories starting from Debian 11 (Bullseye). This guide covers installation, configuration, and basic usage on Debian systems.

---

## Prerequisites

- Debian 11 (Bullseye) or later
- A user account with sudo privileges
- An active internet connection

## Step 1: Update Your System

Start by refreshing your package lists and upgrading existing packages:

```bash
# Update package lists and upgrade installed packages

sudo apt update && sudo apt upgrade -y
```

## Step 2: Install Podman

On Debian 11 and later, Podman is available directly from the official repositories:

```bash
# Install Podman and its dependencies
sudo apt install -y podman
```

This installs Podman along with components such as `conmon`, an OCI runtime like `crun` or `runc`, and recommended rootless helpers such as `slirp4netns` and `uidmap` depending on your Debian release.

### For Debian 11 (Bullseye)

Debian 11 provides Podman 3.0.1 in the official repositories. The `bullseye-backports` repository does not currently provide a newer `podman` package, so use a newer Debian release if you need a newer major version of Podman.

```bash
# Check the Podman version available from your configured repositories
apt-cache policy podman
```

## Step 3: Verify the Installation

Check that Podman is installed and working:

```bash
# Check Podman version
podman --version

# View detailed Podman system information
podman info
```

## Step 4: Configure Container Registries

Debian's Podman installation may not include default registry configuration. Set up registries so you can pull images without specifying full paths:

```bash
# Create the containers registries configuration
sudo tee /etc/containers/registries.conf.d/unqualified-search-registries.conf <<EOF
unqualified-search-registries = ["docker.io", "quay.io", "ghcr.io"]
EOF
```

## Step 5: Set Up Rootless Containers

Configure your user for rootless container operation:

```bash
# Install slirp4netns for rootless networking (if not already installed)
sudo apt install -y slirp4netns uidmap

# Verify subuid and subgid entries exist for your user
grep "^$(id -un):" /etc/subuid
grep "^$(id -un):" /etc/subgid
```

If no entries exist, add them:

```bash
# Add subordinate UID and GID ranges for your user
sudo usermod --add-subuids 100000-165535 "$(id -un)"
sudo usermod --add-subgids 100000-165535 "$(id -un)"
```

## Step 6: Run Your First Container

Test everything with a simple container:

```bash
# Pull and run the hello-world container
podman run --rm docker.io/library/hello-world
```

## Step 7: Enable Docker Compatibility Socket

For tools that expect a Docker socket, enable the Podman socket:

```bash
# Enable the Podman socket for your user session
systemctl --user enable --now podman.socket

# Verify it is running
systemctl --user status podman.socket

# Export the Docker host variable
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock
```

Add the export line to your `~/.bashrc` to make it persistent:

```bash
# Make the Docker host variable persistent
echo 'export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock' >> ~/.bashrc
```

## Running a Practical Example

Run a PostgreSQL database container to test a real workload:

```bash
# Run PostgreSQL in the background
podman run -d \
  --name my-postgres \
  -e POSTGRES_PASSWORD=mysecretpassword \
  -p 5432:5432 \
  docker.io/library/postgres:16

# Check the container is running
podman ps

# View container logs
podman logs my-postgres

# Clean up
podman stop my-postgres
podman rm my-postgres
```

## Troubleshooting

If you get errors about missing `newuidmap` or `newgidmap`:

```bash
# Install uidmap package
sudo apt install -y uidmap
```

If containers cannot resolve DNS:

```bash
# Check and restart systemd-resolved
sudo systemctl restart systemd-resolved

# Or set a custom DNS in the Podman network configuration
podman network create --dns 8.8.8.8 my-network
```

## Summary

You now have Podman installed and configured on Debian. The setup supports rootless containers, Docker-compatible tooling through the Podman socket, and access to major container registries. Debian's stable packages ensure a reliable Podman experience for production workloads.
