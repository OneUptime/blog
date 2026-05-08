# How to Configure Podman Machine for Rootful Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Podman Machine, Virtual Machine, Container, DevOps, Rootful

Description: Learn how to configure a Podman machine to run in rootful mode, enabling privileged container operations and binding to low-numbered ports.

---

> Rootful mode gives your containers root privileges inside the Podman machine, enabling operations that rootless mode restricts.

By default, Podman machines run in rootless mode, which provides better security by running containers without root privileges. However, some workloads require root access - binding to ports below 1024, accessing certain device files, or running software that expects to run as root. This guide shows you how to configure rootful mode.

---

## Understanding Rootful vs Rootless

In rootless mode, Podman runs containers as a regular user inside the VM. In rootful mode, it runs containers as root. This affects what containers can do:

- **Rootless** - Containers cannot bind to ports below 1024, limited device access, better security isolation.
- **Rootful** - Containers can bind to any port, broader device access, runs with root privileges.

## Creating a Machine in Rootful Mode

The simplest approach is to initialize a new machine with the `--rootful` flag.

```bash
# Create a new machine in rootful mode

podman machine init --rootful rootful-machine

# Start the machine
podman machine start rootful-machine
```

## Switching an Existing Machine to Rootful Mode

You can change an existing machine to rootful mode using `podman machine set`.

```bash
# Stop the machine first
podman machine stop my-machine

# Enable rootful mode
podman machine set --rootful my-machine

# Start the machine again
podman machine start my-machine
```

## Verifying Rootful Mode

Confirm that the machine is running in rootful mode:

```bash
# Check the rootful setting via inspect
podman machine inspect my-machine | jq '.[0].Rootful'

# This should return: true
```

You can also verify by checking the connection details:

```bash
# List connections - each machine exposes rootless and rootful connections
podman system connection ls
```

The rootful connection uses the root socket path, such as `/run/podman/podman.sock`, and is commonly named with a `-root` suffix.

## Testing Rootful Capabilities

Verify that rootful mode is working by testing privileged operations:

```bash
# Bind to port 80 (requires root)
podman run -d --name web -p 80:80 nginx

# Verify it is running on port 80
podman ps

# Clean up
podman rm -f web
```

In rootless mode, binding to port 80 would fail. In rootful mode, it succeeds.

## Running Privileged Containers

Rootful mode enables running fully privileged containers:

```bash
# Run a privileged container
podman run --privileged -it --rm alpine sh

# Inside the container, you have root access with fewer isolation restrictions
# mount and other privileged operations can work, depending on the VM configuration
```

## Switching Back to Rootless Mode

If you need to switch back to rootless mode:

```bash
# Stop the machine
podman machine stop my-machine

# Disable rootful mode
podman machine set --rootful=false my-machine

# Start the machine
podman machine start my-machine

# Verify
podman machine inspect my-machine | jq '.[0].Rootful'
# Returns: false
```

## Using Both Modes with Multiple Machines

A practical setup is to maintain separate machines for rootful and rootless workloads:

```bash
# Create a rootless machine for general development
podman machine init --cpus 2 --memory 4096 dev-rootless

# Create a rootful machine for operations requiring root
podman machine init --rootful --cpus 2 --memory 4096 dev-rootful

# Start both
podman machine start dev-rootless
podman machine start dev-rootful

# Use rootless for everyday work
podman --connection dev-rootless run -d --name app myapp

# Use rootful when you need privileged access
podman --connection dev-rootful-root run -d --name web -p 80:80 nginx
```

## Security Considerations

Running in rootful mode reduces container isolation. Follow these practices:

```bash
# Only use rootful mode when necessary
# Prefer rootless mode for development workloads

# When using rootful mode, limit capabilities where possible
podman run --cap-drop=ALL --cap-add=NET_BIND_SERVICE -d -p 443:443 nginx

# Use read-only root filesystems when possible
podman run --read-only -d nginx
```

## Quick Reference

| Command | Purpose |
|---|---|
| `podman machine init --rootful <name>` | Create a rootful machine |
| `podman machine set --rootful <name>` | Enable rootful on existing machine |
| `podman machine set --rootful=false <name>` | Disable rootful mode |
| `podman machine inspect <name> \| jq '.[0].Rootful'` | Check rootful status |

## Summary

Rootful mode is essential for workloads that require root privileges, such as binding to low ports or running privileged containers. Use `--rootful` during initialization or `podman machine set --rootful` for existing machines. For the best security posture, maintain separate machines for rootful and rootless workloads and only use rootful mode when strictly necessary.
