# How to Set Up and Manage Containers for the RHCSA Exam on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, RHCSA, Podman, Containers, Certification

Description: Practice the container management tasks tested on the RHCSA exam using Podman, including running containers, creating systemd services, and using rootless containers.

---

The RHCSA exam tests basic container management with Podman. You need to run containers, configure persistent storage, and make containers start at boot using systemd.

## Search and Pull Images

```bash
# Search for an image
podman search ubi9

# Pull an image from the Red Hat registry
podman pull registry.access.redhat.com/ubi9/ubi:latest

# List local images
podman images
```

## Run Containers

```bash
# Run a container interactively
podman run -it --name test-ubi registry.access.redhat.com/ubi9/ubi /bin/bash

# Run a container in the background
podman run -d --name web -p 8080:8080 \
  registry.access.redhat.com/ubi9/httpd-24:latest

# List running containers
podman ps

# List all containers including stopped ones
podman ps -a
```

## Persistent Storage with Volumes

```bash
# Create a directory for persistent data
mkdir -p ~/web-data
echo "RHCSA Practice" > ~/web-data/index.html

# Run a container with a bind mount
podman run -d --name web-persistent \
  -p 8080:8080 \
  -v ~/web-data:/var/www/html:Z \
  registry.access.redhat.com/ubi9/httpd-24:latest
```

The `:Z` option adjusts the SELinux label so the container can read the files.

## Configure a Container as a systemd Service

This is a key exam skill. Create a rootless container that starts at boot:

```bash
# Create the systemd user directory
mkdir -p ~/.config/systemd/user

# Generate a systemd unit file
podman generate systemd --new --name web-persistent \
  --files --restart-policy=always

# Move it to the user systemd directory
mv container-web-persistent.service ~/.config/systemd/user/

# Reload and enable
systemctl --user daemon-reload
systemctl --user enable --now container-web-persistent.service

# Enable lingering so the user service starts at boot (no login required)
sudo loginctl enable-linger $(whoami)
```

## Verify

```bash
# Check the service status
systemctl --user status container-web-persistent.service

# Verify the container is running
podman ps

# Test the web server
curl http://localhost:8080
```

## Container Inspection and Logs

```bash
# View container logs
podman logs web-persistent

# Inspect a container
podman inspect web-persistent | grep -i ipaddress

# Execute a command inside a running container
podman exec -it web-persistent /bin/bash
```

Practice these tasks in a RHEL 9 VM. Pay attention to SELinux labels on bind mounts and make sure you know how to enable lingering for rootless systemd services.
