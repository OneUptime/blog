# How to Configure Local-Based Auto-Updates in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Auto-Update, Local Images

Description: Learn how to configure local-based auto-updates in Podman to automatically restart containers when their local image is updated.

---

> Local-based auto-update monitors your local image storage and restarts containers when their image has been updated through a build or manual pull.

The `local` auto-update policy is useful when you build images locally or pull them through a separate CI/CD process. Instead of checking a remote registry, Podman compares the image used by the running container with the image resolved from the same raw name in local storage.

---

## How Local Auto-Update Works

1. An external process updates the local image (via `podman build` or `podman pull`).
2. The auto-update timer runs `podman auto-update`.
3. Podman compares the image used by the running container with the image in local storage for that raw image name.
4. If they differ, the systemd unit running the container is restarted with the new image.

## Configure a Container for Local Auto-Update

```ini
# ~/.config/containers/systemd/myapp.container

[Unit]
Description=Application with local auto-update

[Container]
Image=localhost/myapp:latest
ContainerName=myapp
PublishPort=3000:3000
# Use local policy instead of registry
AutoUpdate=local

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Build and Deploy Workflow

```bash
# Build a new version of the image
podman build -t localhost/myapp:latest .

# The auto-update timer will detect the new image and restart the container
# Or trigger an immediate update
podman auto-update
```

## Enable the Service and Timer

```bash
# Generate the systemd unit from the Quadlet file
systemctl --user daemon-reload

# Start the container under systemd
systemctl --user enable --now myapp.service

# Enable periodic checks
systemctl --user enable --now podman-auto-update.timer
```

## Manual Update Workflow

```bash
# Step 1: Build the new image
podman build -t localhost/myapp:latest -f Containerfile .

# Step 2: Check what would be updated
podman auto-update --dry-run

# Step 3: Apply the update
podman auto-update

# Step 4: Verify the container is running the new image
podman inspect myapp --format '{{.Image}}'
```

## CI/CD Integration

Use local auto-update in a CI/CD pipeline:

```bash
#!/bin/bash
# deploy.sh - Build and deploy using local auto-update

# Build the new image
podman build -t localhost/myapp:latest .

# Trigger the update
podman auto-update

# Verify the deployment
systemctl --user status myapp.service
```

## Comparing Local and Registry Policies

| Feature | local | registry |
|---------|-------|----------|
| Image source | Local storage | Remote registry |
| Trigger | Build or pull | Registry push |
| Network required | No | Yes |
| Use case | CI/CD builds | Published images |

## Verify the Update

```bash
# Check the current image
podman inspect myapp --format '{{.Image}}'

# View auto-update logs
journalctl --user -u podman-auto-update.service --since "30 minutes ago"
```

## Summary

Local-based auto-update is ideal for containers running locally-built images. Set `AutoUpdate=local` in your Quadlet file, build new images with `podman build`, and let the auto-update mechanism detect the change and restart the container. This works well for CI/CD pipelines that build images on the same host.
