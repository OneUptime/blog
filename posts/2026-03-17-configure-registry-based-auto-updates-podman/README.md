# How to Configure Registry-Based Auto-Updates in Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Auto-Update, Registry, Image Management

Description: Learn how to configure registry-based auto-updates in Podman to automatically pull and deploy new container images when they change in the registry.

---

> Registry-based auto-update compares the local image digest with the remote registry and automatically updates containers when a newer image is available.

The `registry` auto-update policy is the most common approach. Podman checks the registry for a newer digest of the image tag and, if found, pulls the new image and restarts the container service.

---

## How Registry-Based Auto-Update Works

1. Podman checks the registry for the image digest of the tag (e.g., `latest`).
2. It compares the remote digest with the local image digest.
3. If they differ, Podman pulls the new image.
4. The systemd service is restarted with the new image.

## Configure a Container for Registry Auto-Update

```ini
# ~/.config/containers/systemd/api.container

[Unit]
Description=API server with registry auto-update

[Container]
ContainerName=api
Image=docker.io/myorg/api:latest
PublishPort=3000:3000
AutoUpdate=registry

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

```bash
# Reload systemd so Quadlet generates the service
systemctl --user daemon-reload

# Start the generated service
systemctl --user enable --now api.service
```

## Using Private Registries

For private registries, ensure Podman has credentials:

```bash
# Log in to the private registry
podman login registry.example.com

# Use the private registry image in Quadlet
```

```ini
[Container]
Image=registry.example.com/myorg/api:latest
AutoUpdate=registry
```

## Enable the Timer

```bash
# Enable periodic checks
systemctl --user enable --now podman-auto-update.timer

# Check the schedule
systemctl --user list-timers podman-auto-update.timer
```

## Check for Updates

```bash
# Dry run to see which containers would be updated
podman auto-update --dry-run

# Output shows the current status
# UNIT               CONTAINER       IMAGE                          POLICY      UPDATED
# api.service        abc123          docker.io/myorg/api:latest     registry    pending
```

## Apply Updates

```bash
# Run the update
podman auto-update

# Check the result
podman inspect api --format '{{.ImageDigest}}'
```

## Monitor Update History

```bash
# View auto-update logs
journalctl --user -u podman-auto-update.service

# Check which containers were updated
journalctl --user -u podman-auto-update.service | grep "true"
```

## Registry Authentication for Auto-Update

Auto-update uses the credentials stored by `podman login`:

```bash
# Check stored credentials
podman login --get-login registry.example.com

# Credentials are stored in
# ${XDG_RUNTIME_DIR}/containers/auth.json
```

## Tag Strategy for Auto-Update

Choose image tags carefully:

```ini
# Good: mutable tags that receive updates
Image=docker.io/myorg/api:latest
Image=docker.io/myorg/api:stable
Image=docker.io/myorg/api:v1

# Avoid: immutable version tags or digests
# Image=docker.io/myorg/api:v1.2.3
# Image=docker.io/myorg/api@sha256:abc123...
```

## Summary

Registry-based auto-update checks remote registries for newer image digests and automatically updates running containers. Configure with `AutoUpdate=registry` in Quadlet files, enable the `podman-auto-update.timer`, and use mutable image tags. For private registries, ensure credentials are stored with `podman login`.
