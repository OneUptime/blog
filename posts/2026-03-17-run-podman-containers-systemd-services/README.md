# How to Run Podman Containers as systemd Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Systemd, Service, Linux

Description: Learn how to run Podman containers as systemd services using both Quadlet and generated unit files for reliable container management.

---

> Turn your Podman containers into reliable system services managed by systemd for automatic startup, restart, and centralized logging.

Running containers as systemd services gives you production-grade reliability: automatic startup, restart on failure, dependency management, and integration with the system journal. Podman supports two approaches: Quadlet (recommended) and legacy generated unit files.

---

## Method 1: Quadlet (Recommended)

Create a `.container` file in the Quadlet directory:

```bash
mkdir -p ~/.config/containers/systemd/
```

```ini
# ~/.config/containers/systemd/myapp.container

[Unit]
Description=My Application Service

[Container]
Image=docker.io/myorg/myapp:latest
ContainerName=myapp
PublishPort=3000:3000
Environment=NODE_ENV=production

[Service]
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
```

Activate the service:

```bash
systemctl --user daemon-reload
systemctl --user start myapp.service
```

For a rootless user service to start at boot without an active login session, enable lingering for that user:

```bash
sudo loginctl enable-linger "$USER"
```

## Method 2: Generated Unit Files

For existing containers, generate a unit file. This command is deprecated in current Podman releases, so use Quadlet for new deployments:

```bash
# Start a container
podman run -d --name myapp -p 3000:3000 docker.io/myorg/myapp:latest

# Generate and save the unit file
mkdir -p ~/.config/systemd/user/
podman generate systemd --new --name myapp > ~/.config/systemd/user/container-myapp.service

# Stop and remove the original container
podman stop myapp && podman rm myapp

# Enable the systemd service
systemctl --user daemon-reload
systemctl --user enable --now container-myapp.service
```

## Managing the Service

```bash
# Start the service
systemctl --user start myapp.service

# Stop the service
systemctl --user stop myapp.service

# Restart the service
systemctl --user restart myapp.service

# Check the status
systemctl --user status myapp.service

# View logs
journalctl --user -u myapp.service -f
```

## Rootful Services

For system-wide services that run as root:

```bash
# Place Quadlet file in system directory
sudo cp myapp.container /etc/containers/systemd/

# Reload and start with system-level systemctl
sudo systemctl daemon-reload
sudo systemctl start myapp.service
```

## Verify the Container Is Running

```bash
# Check with systemctl
systemctl --user is-active myapp.service

# Check with podman
podman ps --filter name=myapp

# Check logs through both interfaces
journalctl --user -u myapp.service --since "5 minutes ago"
podman logs myapp
```

## Summary

Running Podman containers as systemd services provides automatic startup, restart policies, dependency management, and journal logging. Use Quadlet for new deployments and `podman generate systemd` only for legacy quick conversions of existing containers. Both approaches give you full systemctl management capabilities.
