# How to Run a Web Server with Quadlet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Quadlet, Nginx, Web Server

Description: Learn how to deploy and manage an Nginx web server as a systemd service using Podman Quadlet.

---

> Deploy an Nginx web server managed by systemd using Quadlet, with persistent content, health checks, and automatic restarts.

Running a web server with Quadlet gives you systemd's reliability features including automatic startup at boot when user lingering is enabled, restart on failure, and structured logging through the journal. This guide sets up a complete Nginx deployment.

---

## Create the Website Content Directory

```bash
# Create a directory for the website content

mkdir -p ~/website

# Create a simple index page
cat > ~/website/index.html << 'HTMLEOF'
<!DOCTYPE html>
<html>
<head><title>Quadlet Web Server</title></head>
<body>
<h1>Running with Podman Quadlet</h1>
<p>This Nginx server is managed by systemd through Quadlet.</p>
</body>
</html>
HTMLEOF
```

## Create the Quadlet Container File

```ini
# ~/.config/containers/systemd/webserver.container
[Unit]
Description=Nginx web server managed by Quadlet

[Container]
Image=docker.io/library/nginx:latest
ContainerName=webserver
PublishPort=8080:80

# Mount the website content
Volume=%h/website:/usr/share/nginx/html:ro,Z

# Health check
HealthCmd=curl -f http://localhost:80/ || exit 1
HealthInterval=30s
HealthTimeout=5s
HealthRetries=3
HealthStartPeriod=10s
HealthOnFailure=kill

# Mark the container for Podman auto-update
AutoUpdate=registry

[Service]
Restart=on-failure
RestartSec=5
TimeoutStartSec=60

[Install]
WantedBy=default.target
```

## Deploy and Start

```bash
# Create the Quadlet directory if needed
mkdir -p ~/.config/containers/systemd/

# Reload systemd to detect the new Quadlet file
systemctl --user daemon-reload

# Start the web server
systemctl --user start webserver.service

# Enable user services to start at boot without an active login
sudo loginctl enable-linger "$USER"

# Enable the Podman auto-update timer
systemctl --user enable --now podman-auto-update.timer

# Check the status
systemctl --user status webserver.service
```

## Test the Web Server

```bash
# Verify the server is responding
curl http://localhost:8080

# Check health status
podman healthcheck run webserver

# View logs
journalctl --user -u webserver.service -f
```

## Custom Nginx Configuration

To use a custom Nginx config, add another volume mount:

```ini
[Container]
Image=docker.io/library/nginx:latest
Volume=%h/website:/usr/share/nginx/html:ro,Z
# Mount custom Nginx configuration
Volume=%h/.config/nginx/nginx.conf:/etc/nginx/nginx.conf:ro,Z
```

## Summary

Quadlet makes running an Nginx web server reliable and maintainable. With user lingering enabled, the container starts at boot, restarts on failure, logs to the journal, and can be updated by Podman's auto-update timer when a new image is published. Mount your content and configuration as volumes for easy management.
