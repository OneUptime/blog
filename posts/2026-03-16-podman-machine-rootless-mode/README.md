# How to Configure Podman Machine for Rootless Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Podman Machine, Virtual Machine, Container, DevOps, Rootless

Description: Learn how to configure and optimize Podman machines for rootless mode, providing enhanced security without sacrificing functionality.

---

> Rootless mode is Podman's default and most secure configuration, running containers without root privileges.

Rootless containers are one of Podman's defining features. By running the container engine without root privileges, you gain a significant security advantage - even if a container is compromised, the attacker does not gain root access to the host. This guide covers configuring and working effectively with rootless Podman machines.

---

## Default Rootless Configuration

Podman machines are rootless by default. When you initialize a machine without the `--rootful` flag, it runs in rootless mode.

```bash
# Create a rootless machine (default behavior)

podman machine init my-machine

# Start the machine
podman machine start my-machine

# Verify rootless mode
podman machine inspect my-machine | jq '.[0].Rootful'
# Returns: false
```

## Switching to Rootless Mode

If a machine is currently in rootful mode, switch it to rootless:

```bash
# Stop the machine
podman machine stop my-machine

# Disable rootful mode (enables rootless)
podman machine set --rootful=false my-machine

# Start the machine
podman machine start my-machine
```

## Understanding Rootless Constraints

Rootless mode has specific limitations you should understand:

```bash
# Port binding: Ports below 1024 are restricted
# This will fail in rootless mode:
podman run -d -p 80:80 nginx
# Error: binding to privileged port requires root

# Use a high port instead:
podman run -d -p 8080:80 nginx

# This works perfectly in rootless mode
curl http://localhost:8080
```

## Configuring Unprivileged Port Access

You can lower the unprivileged port range to allow binding to lower ports without root.

```bash
# SSH into the Podman machine
podman machine ssh my-machine

# Inside the machine, allow ports from 80 and above
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80

# Make it persistent
echo "net.ipv4.ip_unprivileged_port_start=80" | sudo tee -a /etc/sysctl.d/99-unprivileged-ports.conf

# Exit the machine SSH session
exit
```

Now you can bind to port 80 in rootless mode:

```bash
# This now works in rootless mode
podman run -d -p 80:80 nginx
```

## Working with User Namespaces

Rootless mode uses user namespaces to map container UIDs to unprivileged host UIDs.

```bash
# Check the UID mapping inside a container
podman run --rm alpine id

# View the user namespace mapping
podman run --rm alpine cat /proc/self/uid_map

# Container root (UID 0) maps to your host UID; other container UIDs map into your subordinate UID range
```

## Configuring Subordinate UID/GID Ranges

User namespaces require subordinate UID and GID ranges to be configured.

```bash
# SSH into the machine to check subordinate ranges
podman machine ssh my-machine

# View subordinate UID ranges
cat /etc/subuid

# View subordinate GID ranges
cat /etc/subgid

# Exit
exit
```

## Storage Configuration for Rootless

Rootless mode uses a different storage location than rootful mode.

```bash
# Check the storage configuration
podman info --format "{{.Store.GraphRoot}}"

# In rootless mode, storage is typically under:
# ~/.local/share/containers/storage/

# Check available storage space
podman system df
```

## Optimizing Rootless Performance

Rootless containers can have slightly different performance characteristics. Here are optimizations:

```bash
# Use the overlay storage driver for best performance
# Check current driver
podman info --format "{{.Store.GraphDriverName}}"

# Configure storage (edit inside the machine)
podman machine ssh my-machine

# Edit storage configuration
vi ~/.config/containers/storage.conf
# [storage]
# driver = "overlay"

exit
```

## Rootless Networking

Rootless mode uses different networking than rootful mode:

```bash
# Check the network backend
podman info --format "{{.Host.NetworkBackend}}"

# Create a custom network in rootless mode
podman network create my-network

# Run containers on the custom network
podman run -d --name web --network my-network nginx
podman run -d --name api --network my-network node:20

# Containers on the same network can resolve each other by name
podman exec api getent hosts web
```

## Running Containers Effectively in Rootless Mode

```bash
# Run a web server on a high port
podman run -d --name web -p 8080:80 nginx

# Run a database with a named volume
podman run -d --name db \
    -v pgdata:/var/lib/postgresql/data \
    -e POSTGRES_PASSWORD=secret \
    -p 5432:5432 \
    postgres:16

# Run with specific user mapping
podman run -d --name app \
    --userns=keep-id \
    -v ./src:/app/src \
    node:20

# The --userns=keep-id flag maps your host UID into the container
```

## Verifying Security Benefits

Confirm that rootless mode provides proper isolation:

```bash
# Check that the Podman process runs as your user, not root
podman machine ssh my-machine -- ps aux | grep podman

# Verify container processes are not running as host root
podman top my-container user,pid,comm
```

## Quick Reference

| Command | Purpose |
|---|---|
| `podman machine init <name>` | Create a rootless machine (default) |
| `podman machine set --rootful=false <name>` | Switch to rootless mode |
| `podman machine inspect <name> \| jq '.[0].Rootful'` | Verify rootless mode |
| `podman run --userns=keep-id ...` | Map host UID into container |

## Summary

Rootless mode is Podman's default and recommended configuration. It provides strong security isolation by running containers without root privileges. While it has some constraints around port binding and device access, most of these can be worked around with configuration changes. Use rootless mode for all development and production workloads where privileged access is not strictly required.
