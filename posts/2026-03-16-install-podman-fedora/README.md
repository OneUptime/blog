# How to Install Podman on Fedora

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Installation, Linux, Container, DevOps, Fedora

Description: A step-by-step guide to installing Podman on Fedora, including configuration and running your first container.

---

> Fedora ships with Podman in its default repositories, making it one of the easiest distributions to get started with rootless containers.

Podman is a daemonless container engine developed by Red Hat that is fully compatible with OCI containers. Since Fedora is a Red Hat community distribution, Podman enjoys first-class support and is often pre-installed. This guide walks you through installing, configuring, and verifying Podman on Fedora.

---

## Prerequisites

Before you begin, make sure you have:

- A currently supported Fedora system
- A user account with sudo privileges
- An active internet connection

## Step 1: Update Your System

Always start by updating your system packages to ensure you have the latest security patches and repository metadata.

```bash
# Update all installed packages

sudo dnf upgrade -y
```

## Step 2: Install Podman

Podman is available in the default Fedora repositories. Install it with a single command:

```bash
# Install Podman
sudo dnf install -y podman
```

This installs the Podman engine along with all required dependencies including `conmon`, `crun`, and `containers-common`.

## Step 3: Verify the Installation

Confirm that Podman was installed correctly by checking the version:

```bash
# Check the installed Podman version
podman --version
```

You should see output similar to:

```text
podman version 5.x.x
```

For more detailed information about your Podman environment:

```bash
# Display detailed system information
podman info
```

## Step 4: Run Your First Container

Test your installation by running a simple container:

```bash
# Run a test container
podman run --rm docker.io/library/hello-world
```

This pulls the `hello-world` image from Docker Hub and runs it. The `--rm` flag automatically removes the container after it exits.

## Step 5: Configure Rootless Containers

One of Podman's key features is running containers without root privileges. Fedora configures this automatically, but verify it works:

```bash
# Check your user's subuid and subgid mappings
cat /etc/subuid
cat /etc/subgid
```

You should see an entry for your username. If not, add the mappings manually:

```bash
# Add subuid and subgid mappings for your user (replace 'youruser')
sudo usermod --add-subuids 100000-165535 youruser
sudo usermod --add-subgids 100000-165535 youruser
```

## Step 6: Enable Podman Socket for Docker Compatibility

If you need Docker CLI compatibility, enable the Podman socket:

```bash
# Enable and start the Podman socket for your user
systemctl --user enable --now podman.socket

# Verify the socket is active
systemctl --user status podman.socket
```

You can now use Docker-compatible tools by pointing them to the Podman socket:

```bash
# Set the Docker host environment variable
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock
```

## Step 7: Install Podman Compose (Optional)

If you work with Docker Compose files, install `podman-compose`:

```bash
# Install podman-compose
sudo dnf install -y podman-compose
```

## Running a Practical Example

Let's run an Nginx web server to confirm everything works end to end:

```bash
# Run Nginx in the background on port 8080
podman run -d --name my-nginx -p 8080:80 docker.io/library/nginx:latest

# Verify the container is running
podman ps

# Test the web server
curl http://localhost:8080

# Clean up when done
podman stop my-nginx
podman rm my-nginx
```

## Troubleshooting

If you encounter permission errors with rootless containers, reset your Podman storage:

```bash
# Reset Podman storage (removes all local containers and images)
podman system reset
```

If DNS resolution fails inside containers because the host DNS configuration is not usable from containers, pass a reachable DNS server explicitly:

```bash
# Run a container with an explicit DNS server
podman run --rm --dns 1.1.1.1 docker.io/library/fedora getent hosts fedoraproject.org
```

## Summary

You have successfully installed Podman on Fedora. Podman provides a Docker-compatible container runtime that runs without a daemon and supports rootless containers out of the box. With Fedora's native support, you get the latest Podman releases quickly through standard package updates.
