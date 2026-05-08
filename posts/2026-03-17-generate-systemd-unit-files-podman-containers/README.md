# How to Generate systemd Unit Files from Podman Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Systemd, Unit Files, Service Management

Description: Learn how to use podman generate systemd to create systemd unit files from existing Podman containers for service management.

---

> Generate systemd unit files from running or created Podman containers using podman generate systemd to quickly convert ad-hoc containers into managed services.

The `podman generate systemd` command creates systemd unit files from existing containers. While Quadlet is the recommended approach for new deployments, `podman generate systemd` is useful for quickly converting existing containers into systemd services.

---

## Generate a Unit File from a Running Container

First, create and start a container:

```bash
# Run a container

podman run -d --name mywebserver -p 8080:80 docker.io/library/nginx:latest
```

Generate the systemd unit file:

```bash
# Generate a systemd unit file
podman generate systemd --name mywebserver
```

This prints the unit file to stdout.

## Save the Unit File

```bash
# Save to the user systemd directory
mkdir -p ~/.config/systemd/user/
podman generate systemd --name mywebserver > ~/.config/systemd/user/container-mywebserver.service

# Reload systemd
systemctl --user daemon-reload
```

## Generate with New Container on Start

By default, the unit restarts the same container. Use `--new` to create a fresh container on each start:

```bash
# Generate with --new flag (recommended)
podman generate systemd --new --name mywebserver > ~/.config/systemd/user/container-mywebserver.service
```

With `--new`, systemd creates a new container each time the service starts and removes it when it stops.

## Customize Restart Policy

```bash
# Set restart policy and timeout
podman generate systemd --name mywebserver \
  --restart-policy=on-failure \
  --restart-sec=10 \
  --stop-timeout=30
```

## Generate a Unit File to a File

```bash
# Generate a unit file for the named container and save it to a file
podman generate systemd --new --name mywebserver --files

# This creates a file named container-mywebserver.service in the current directory
```

## Generate Unit File for a Pod

```bash
# Create a pod with containers
podman pod create --name mypod -p 8080:80
podman run -d --pod mypod --name web docker.io/library/nginx:latest

# Generate unit files for the entire pod
podman generate systemd --new --name mypod --files
```

This generates one service file for the pod and one for each container.

## Enable and Start the Service

```bash
# Move files to the systemd directory
mv container-mywebserver.service ~/.config/systemd/user/

# Reload, enable, and start
systemctl --user daemon-reload

# Stop and remove the original container before starting a --new unit
podman stop mywebserver
podman rm mywebserver

# Enable and start through systemd
systemctl --user enable --now container-mywebserver.service
```

## Note on Deprecation

The `podman generate systemd` command is deprecated in favor of Quadlet. For new deployments, use Quadlet `.container` files instead. However, `generate systemd` remains useful for quick conversions of existing containers.

## Summary

The `podman generate systemd` command creates systemd unit files from existing containers. Use `--new` to create fresh containers on each start, `--files` to save directly to files, and move the generated files to your systemd user directory. For new deployments, prefer Quadlet container files which are cleaner and more maintainable.
