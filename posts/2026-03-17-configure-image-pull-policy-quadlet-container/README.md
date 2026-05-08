# How to Configure Image Pull Policy in a Quadlet Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Systemd, Image Pull

Description: Learn how to configure image pull policies in Podman Quadlet container files to control when container images are fetched from registries.

---

> Control whether Podman pulls images every time, only when missing, or never by setting the pull policy in your Quadlet container file.

When running containers through Quadlet, you may want to control how Podman handles image pulling. By default, Podman pulls an image only if it is not already present locally. Quadlet exposes the `Pull` directive to let you change this behavior declaratively.

---

## Understanding Pull Policies

Podman supports several pull policies:

- **missing** - Pull only if the image is not in local storage (default).
- **always** - Always pull the image from the registry, even if a local copy exists.
- **never** - Never pull the image; fail if it is not available locally.
- **newer** - Pull if the registry image has a different digest than the local one.

## Setting Pull Policy in a Quadlet File

Create or edit a Quadlet container file:

```bash
mkdir -p ~/.config/containers/systemd/
```

```ini
# ~/.config/containers/systemd/webapp.container

[Unit]
Description=Web application container

[Container]
Image=docker.io/library/nginx:latest
# Always pull the latest image before starting
Pull=always
PublishPort=8080:80

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Using Pull=never for Air-Gapped Environments

In environments without registry access, use `Pull=never` to ensure Podman only uses local images:

```ini
# ~/.config/containers/systemd/offline-app.container
[Unit]
Description=Offline application container

[Container]
Image=localhost/myapp:v1.2.0
# Never attempt to pull from a registry
Pull=never

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Using Pull=newer for Efficient Updates

The `newer` policy avoids unnecessary pulls while still getting updates when the registry image digest changes:

```ini
# ~/.config/containers/systemd/api-server.container
[Unit]
Description=API server with smart pulling

[Container]
Image=docker.io/myorg/api-server:stable
# Only pull if the registry image digest differs from the local one
Pull=newer
PublishPort=3000:3000

[Service]
Restart=on-failure

[Install]
WantedBy=default.target
```

## Reload and Start the Service

After creating or modifying the Quadlet file, reload systemd and start the service:

```bash
# Reload the systemd daemon to pick up the new Quadlet file
systemctl --user daemon-reload

# Start the container service
systemctl --user start webapp.service

# Verify the service is running
systemctl --user status webapp.service
```

## Verify the Pull Behavior

You can check the generated systemd unit to confirm the pull flag is applied:

```bash
# View the generated unit file
cat /run/user/$(id -u)/systemd/generator/webapp.service

# The ExecStart line should include --pull=always (or your chosen policy)
```

## Summary

The `Pull` directive in Quadlet container files gives you declarative control over image pull behavior. Use `always` for environments where you want the latest image on every restart, `never` for air-gapped setups, `newer` for efficient updates, and `missing` (the default) for standard workflows.
