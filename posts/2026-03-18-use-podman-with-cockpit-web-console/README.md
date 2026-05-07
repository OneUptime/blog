# How to Use Podman with Cockpit Web Console

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Cockpit, Web Console, Container Management, Linux Administration

Description: Learn how to use Cockpit's web console to manage Podman containers through a browser-based interface, providing visual container management for Linux servers.

---

> Cockpit's Podman integration provides a web-based interface for managing containers, images, and volumes, making container administration accessible without memorizing command-line syntax.

Cockpit is a web-based administration interface for Linux servers that comes preinstalled on many Red Hat and Fedora systems. Its Podman plugin provides a graphical interface for managing containers, making it easy to start and stop containers, view logs, manage images, and monitor resource usage through your browser. This is particularly valuable for system administrators who manage multiple servers and prefer a visual interface for routine container operations.

---

## Installing Cockpit and the Podman Plugin

On Fedora or RHEL:

```bash
sudo dnf install cockpit cockpit-podman
sudo systemctl enable --now cockpit.socket
```

On Ubuntu or Debian:

```bash
sudo apt-get install cockpit cockpit-podman
sudo systemctl enable --now cockpit.socket
```

Open your browser and navigate to `https://your-server:9090`. Log in with your system credentials.

Verify that Podman is installed:

```bash
podman --version
```

## Navigating the Cockpit Podman Interface

After logging into Cockpit, click on "Podman containers" in the left navigation menu. The interface is organized into several sections.

The Containers tab shows all running and stopped containers with their status, image, ports, and resource usage. You can start, stop, restart, and remove containers directly from this view.

The Images tab displays all locally available container images with their size and creation date. You can pull new images and delete unused ones.

## Creating Containers Through Cockpit

Click the "Create container" button to launch a new container. The form lets you configure:

- Image name and tag
- Container name
- Port mappings
- Volume mounts
- Environment variables
- Resource limits (memory, CPU)
- Restart policy

While the GUI is convenient for simple containers, complex configurations are better handled through the command line or scripts. Here is how to create the same container via CLI for comparison:

```bash
podman run -d \
  --name web-server \
  -p 8080:80 \
  -v /var/www/html:/usr/share/nginx/html:ro,Z \
  --memory 512m \
  --restart always \
  nginx:latest
```

After creating the container via CLI, it appears in Cockpit's interface where you can manage it visually.

## Managing Container Lifecycle

Cockpit provides buttons for common lifecycle operations. The equivalent CLI commands are:

```bash
# Start a stopped container

podman start web-server

# Stop a running container
podman stop web-server

# Restart a container
podman restart web-server

# Remove a container
podman rm web-server

# Force remove a running container
podman rm -f web-server
```

Each of these operations is available as a single click in the Cockpit interface.

## Viewing Container Logs

Cockpit displays container logs in real time. Click on a container name and select the "Logs" tab. This is equivalent to:

```bash
# View logs
podman logs web-server

# Follow logs in real time
podman logs -f web-server

# View last 100 lines
podman logs --tail 100 web-server
```

## Managing Images Through Cockpit

The Images section lets you pull, tag, and delete images. The CLI equivalents:

```bash
# Pull an image
podman pull nginx:latest

# List images
podman images

# Remove an image
podman rmi nginx:latest

# Remove unused images
podman image prune -f
```

## Container Details and Inspection

Clicking on a container in Cockpit shows detailed information including environment variables, mount points, network configuration, and resource usage. The CLI equivalent:

```bash
# Inspect container details
podman inspect web-server

# View resource usage
podman stats web-server

# View port mappings
podman port web-server

# View mounted volumes
podman inspect --format='{{range .Mounts}}{{.Source}} -> {{.Destination}}{{"\n"}}{{end}}' web-server
```

## Setting Up Cockpit for Remote Management

> **Note:** Cockpit's multi-machine host switcher is deprecated as of Cockpit 322, but existing `machines.d` configurations still work.

Configure Cockpit to manage containers on remote servers:

```bash
# On the machine you open in your browser, ensure cockpit is running
sudo systemctl enable --now cockpit.socket

# Additional hosts added through Cockpit's host switcher are reached over SSH
# from that machine; they do not need cockpit.socket enabled just to be added
# Navigate to https://management-server:9090
# Click "Add new host" and enter the remote server's address
```

You can also preconfigure machines for Cockpit's host switcher:

```ini
# /etc/cockpit/machines.d/remote-servers.json
{
    "web-server-1": {
        "address": "192.168.1.10",
        "color": "green",
        "visible": true
    },
    "web-server-2": {
        "address": "192.168.1.11",
        "color": "blue",
        "visible": true
    }
}
```

## Monitoring Container Resources

Cockpit shows CPU and memory usage graphs for each container. For command-line monitoring:

```bash
# Real-time stats for all containers
podman stats

# Stats for specific containers
podman stats web-server db-server

# One-time snapshot (no streaming)
podman stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"
```

## User vs System Containers

Cockpit supports both rootless (user) and rootful (system) containers. When logged into Cockpit, you can toggle between viewing your user's containers and the system containers (if you have sudo access).

```bash
# User (rootless) containers - no sudo needed
podman ps

# System (rootful) containers
sudo podman ps
```

The Cockpit interface shows a dropdown to switch between "User containers" and "System containers."

## Integrating with Systemd Services

> **Note:** The `podman generate systemd` command is deprecated. For new deployments, use Quadlet files placed in `~/.config/containers/systemd/` (rootless) or `/etc/containers/systemd/` (rootful) instead. The example below still works, but the command is in maintenance mode and only receives urgent bug fixes.

Cockpit's system services view can show Podman containers managed by systemd:

```bash
# Generate a systemd service for a container
podman generate systemd --new --name web-server \
  > ~/.config/systemd/user/container-web-server.service

# Enable it
systemctl --user daemon-reload
systemctl --user enable container-web-server.service
```

The service then appears in Cockpit's Services section where you can start, stop, and monitor it alongside other system services.

## Configuring Cockpit Access

Secure your Cockpit installation:

```bash
# Configure allowed origins
sudo tee /etc/cockpit/cockpit.conf << 'EOF'
[WebService]
Origins = https://admin.example.com

[Session]
IdleTimeout = 30
EOF

# Disallow specific users
sudo tee /etc/cockpit/disallowed-users << 'EOF'
guest
testuser
EOF
```

Set up TLS with a proper certificate:

```bash
# Place your certificate in /etc/cockpit/ws-certs.d/
sudo cp fullchain.pem /etc/cockpit/ws-certs.d/cert.cert
sudo cp privkey.pem /etc/cockpit/ws-certs.d/cert.key
sudo systemctl restart cockpit
```

## Automating Setup with a Script

Deploy Cockpit with Podman support across multiple servers:

```bash
#!/bin/bash
# setup-cockpit-podman.sh

set -euo pipefail

echo "Installing Cockpit and Podman plugin..."
if command -v dnf > /dev/null; then
    sudo dnf install -y cockpit cockpit-podman podman
elif command -v apt-get > /dev/null; then
    sudo apt-get update
    sudo apt-get install -y cockpit cockpit-podman podman
fi

echo "Enabling services..."
sudo systemctl enable --now cockpit.socket
sudo systemctl enable --now podman.socket

echo "Configuring firewall..."
if command -v firewall-cmd > /dev/null; then
    sudo firewall-cmd --permanent --add-service=cockpit
    sudo firewall-cmd --reload
fi

echo "Cockpit is available at https://$(hostname):9090"
```

## Conclusion

Cockpit provides an intuitive web-based interface for managing Podman containers that complements command-line workflows. System administrators can use it for routine container operations without needing to remember CLI syntax, while still having the full power of the command line available for complex tasks. The ability to manage both user and system containers, view real-time logs and resource metrics, and administer remote servers through a single interface makes Cockpit a valuable tool for teams running Podman containers in production. It bridges the gap between the power of Podman and the accessibility of a graphical interface.
