# How to Use Podman with systemd for Production Container Workloads on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Podman, Systemd, Container, Production

Description: Run production containers on RHEL using Podman and systemd for automatic restarts, logging, and boot-time startup without requiring a daemon.

---

Podman integrates directly with systemd, making it the preferred way to run production containers on RHEL without a container daemon. You can generate systemd unit files from existing containers or pods, although Quadlet is the preferred approach on RHEL versions that support it.

## Running a Container and Generating a Unit File

```bash
# Run a container with a known name

sudo podman run -d \
  --name web-app \
  -p 8080:8080 \
  -v /srv/web-data:/opt/app-root/src:Z \
  --restart=no \
  registry.access.redhat.com/ubi9/nginx-124:latest \
  nginx -g "daemon off;"
```

Now generate a systemd unit file from the running container:

```bash
# Generate a systemd service file
sudo podman generate systemd --new --name web-app \
  --files --restart-policy=always

# Move the generated file to the systemd directory
sudo mv -Z container-web-app.service /etc/systemd/system/

# Reload systemd and enable the service
sudo systemctl daemon-reload
sudo systemctl enable --now container-web-app.service
```

The `--new` flag means systemd will create a fresh container each time (rather than restarting the old one), which is cleaner for production.

## Quadlet - The Modern Approach (RHEL 9.3+)

RHEL 9.3 and later include Podman 4.6 or newer with Quadlet support, which lets you write container definitions as systemd-native unit files:

```ini
# /etc/containers/systemd/webapp.container
[Unit]
Description=Production Web Application

[Container]
Image=registry.access.redhat.com/ubi9/nginx-124:latest
Exec=nginx -g "daemon off;"
PublishPort=8080:8080
Volume=/srv/web-data:/opt/app-root/src:Z

[Service]
Restart=always
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
```

```bash
# Reload to pick up the Quadlet file
sudo systemctl daemon-reload

# Start the container service
sudo systemctl start webapp.service
sudo systemctl enable webapp.service

# Check the status
sudo systemctl status webapp.service
```

## Viewing Logs

Since the container runs under systemd, logs go to the journal:

```bash
# View container logs via journalctl
sudo journalctl -u container-web-app.service -f

# Or for Quadlet
sudo journalctl -u webapp.service --since "10 minutes ago"
```

## Health Checks

```bash
# Add a health check to your Quadlet file
# [Container]
# HealthCmd=/usr/bin/curl -f http://localhost:8080/ || exit 1
# HealthInterval=30s
# HealthRetries=3
# HealthOnFailure=kill
```

This approach gives you the reliability of systemd (automatic restarts, dependency management, journal logging) with the simplicity of Podman containers.
