# How to Use Portainer with Podman as a Docker Alternative

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Podman, Docker, Container, Linux

Description: Learn how to set up Portainer to manage containers running on Podman as a daemonless, rootless Docker alternative.

## Introduction

Podman is a daemonless container engine developed by Red Hat that offers a Docker-compatible CLI. Portainer can connect to Podman through its Docker-compatible socket, giving you a full GUI for managing Podman containers. Per current Portainer documentation, the supported configuration is Podman 5 running in rootful mode.

## Prerequisites

- A Linux host (Portainer currently validates Podman support on CentOS Stream 9; other Linux distributions may work but are not officially supported)
- Podman installed (version 5.x)
- Portainer CE or Business Edition
- sudo or root access

## Installing Podman

```bash
# Install Podman on CentOS Stream/Fedora

sudo dnf install -y podman

# Install Podman on Ubuntu/Debian
sudo apt-get update && sudo apt-get install -y podman

# Verify installation
podman --version
```

## Enabling the Podman Socket

Podman includes systemd sockets that expose a Docker-compatible REST API. Portainer's documented setup uses the system-level rootful socket, but the rootless user socket is shown below for reference.

```bash
# Enable and start the Podman socket for the current user (rootless)
systemctl --user enable --now podman.socket

# Verify the socket is active
systemctl --user status podman.socket

# Check the socket path
echo $XDG_RUNTIME_DIR/podman/podman.sock
# Typically: /run/user/1000/podman/podman.sock
```

Note: Portainer with rootless Podman may work, but it is not currently officially supported.

For the supported rootful socket:

```bash
# Enable the system-level Podman socket
sudo systemctl enable --now podman.socket

# Verify
sudo systemctl status podman.socket
# Socket path: /run/podman/podman.sock
```

## Deploying Portainer via Podman

```bash
# Create a volume for Portainer data
sudo podman volume create portainer_data

# Run Portainer container using the Podman socket
sudo podman run -d \
  --name portainer \
  --restart=always \
  --privileged \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /run/podman/podman.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts

# Check that Portainer is running
sudo podman ps
```

Note: This matches Portainer's current Podman installation guidance, which uses the rootful Podman socket and the `--privileged` flag.

## Configuring Portainer to Use the Podman Socket

Once Portainer is running, navigate to `https://localhost:9443` and complete setup. Portainer automatically detects the local environment during initial setup.

If you add another Podman environment later, select **Podman**, choose **Socket**, and if you override the default path, use the appropriate Podman socket path:

```bash
# Supported rootful Podman socket
unix:///run/podman/podman.sock

# Rootless Podman socket (may work, but is not officially supported by Portainer)
unix:///run/user/1000/podman/podman.sock
```

## Creating a Podman Systemd Service for Portainer

For production deployments, create a systemd service:

```bash
# Create a Quadlet definition for Portainer
sudo mkdir -p /etc/containers/systemd
sudo tee /etc/containers/systemd/portainer.container >/dev/null <<'EOF'
[Unit]
Description=Portainer Server

[Container]
ContainerName=portainer
Image=portainer/portainer-ce:lts
PodmanArgs=--privileged
PublishPort=8000:8000
PublishPort=9443:9443
Volume=/run/podman/podman.sock:/var/run/docker.sock
Volume=portainer_data:/data

[Service]
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and enable the service
sudo systemctl daemon-reload
sudo systemctl enable --now portainer.service

# Check the service status
sudo systemctl status portainer.service
```

## Handling SELinux with Podman

On SELinux-enabled hosts such as RHEL and Fedora, use the `:Z` or `:z` volume labels for bind mounts:

```bash
# :Z creates a private label (only this container)
# :z creates a shared label (multiple containers can access)
podman run -d \
  --name my-app \
  -v /host/data:/container/data:Z \
  nginx:latest
```

## Verifying the Integration

After setup, you can manage Podman containers through Portainer just like Docker:

```bash
# List containers via Podman CLI
podman ps -a

# The same containers appear in Portainer's UI
# Navigate to: Environments > Local > Containers
```

## Differences to Be Aware Of

| Feature | Docker | Podman |
|---------|--------|--------|
| Daemon | Required | Daemonless |
| Root | Optional | Can run rootful or rootless |
| Compose | docker compose | podman compose |
| Pods | No | Yes (like Kubernetes pods) |
| Socket | /var/run/docker.sock | /run/podman/podman.sock (rootful) or /run/user/UID/podman/podman.sock (rootless) |

## Conclusion

Portainer provides a convenient web interface for managing Podman containers. By exposing the Podman socket, you can manage Podman containers from Portainer without requiring the Docker daemon. For the most predictable results, follow Portainer's current guidance and use Podman 5 in rootful mode.
