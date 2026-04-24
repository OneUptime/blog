# How to Connect Portainer to a Podman Socket - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Podman, Docker, Self-Hosted, Container Management

Description: Connect Portainer to a Podman socket to manage Podman containers from the Portainer UI, using Podman's Docker-compatible REST API.

## Introduction

Podman provides an API service with a Docker-compatible REST API layer that allows Portainer to manage Podman containers from the Portainer UI. This guide covers how to enable the Podman socket and connect it to Portainer for a familiar management experience without Docker.

## Prerequisites

- Podman 5.x installed
- Portainer CE or BE installed
- Linux system. Portainer currently documents support for rootful Podman 5 on CentOS Stream 9; rootless Podman may work but is not officially supported.

## Step 1: Enable the Podman Socket (Rootful)

```bash
# Enable and start the Podman socket service

sudo systemctl enable --now podman.socket

# Verify the socket is active
sudo systemctl status podman.socket

# Check the socket path
ls -la /run/podman/podman.sock
# Should show a socket file at /run/podman/podman.sock
```

## Step 2: Enable the Podman Socket (Rootless)

```bash
# For rootless Podman (user-level socket)
# Portainer documents rootful Podman as the supported setup.
# Rootless Podman may work, but it is not officially supported.
systemctl --user enable --now podman.socket

# Verify
systemctl --user status podman.socket

# Check the socket path
ls -la /run/user/$(id -u)/podman/podman.sock

# Enable lingering so the socket starts without login
sudo loginctl enable-linger $(whoami)
```

## Step 3: Test the Podman Socket

```bash
# Test with rootful socket
# For rootless, replace the socket path with /run/user/$(id -u)/podman/podman.sock
curl --unix-socket /run/podman/podman.sock http://d/v1.40/version | jq '.Version // .Server.Version'

# List containers via Docker-compatible API
curl --unix-socket /run/podman/podman.sock \
  http://d/v1.40/containers/json | jq '.[].Names'
```

## Step 4: Connect Portainer to Podman Socket (Direct)

If Portainer Server is running on Podman on the SAME host:

```bash
# Create a persistent volume for Portainer data
podman volume create portainer_data

# Run Portainer Server on Podman and mount the Podman socket
podman run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  --privileged \
  -v /run/podman/podman.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts

# If you still need the legacy HTTP port, add:
# -p 9000:9000
```

## Step 5: Connect Portainer to Remote Podman

For managing Podman on a remote host:

Portainer's detailed Podman documentation focuses on the Portainer Agent, Edge Agent, or a local socket connection. Direct socket access is local-only, and Podman's own documentation strongly recommends against exposing the API on a network TCP socket without mutual TLS.

## Step 6: Use SSH Tunneling for Secure Remote Podman

Podman recommends SSH forwarding if remote socket access is required, but for Portainer the documented remote-host options are the Agent or Edge Agent rather than relying on an ad hoc tunneled socket.

## Step 7: Configure Portainer Agent for Podman

You can run Portainer Agent against Podman:

```bash
# On the Podman host, run the agent against the Podman socket
podman run -d \
  --name portainer_agent \
  --restart=always \
  --privileged \
  -p 9001:9001 \
  -v /run/podman/podman.sock:/var/run/docker.sock \
  -v /var/lib/containers/storage/volumes:/var/lib/docker/volumes \
  portainer/agent:lts

# If Portainer Server uses AGENT_SECRET, add:
# -e AGENT_SECRET=yoursecret

# In Portainer Server, add a Podman Agent environment:
# Address: podman-host:9001
```

## Step 8: Handle Podman-Specific API Differences

Podman's Docker-compatible API targets Docker API v1.40, and some behavior differs from a Docker engine:

```bash
# Check the Podman engine version through the Docker-compatible API
curl --unix-socket /run/podman/podman.sock \
  http://d/v1.40/version | jq '.Version // .Server.Version'

# Check common container and image endpoints
curl --unix-socket /run/podman/podman.sock \
  http://d/v1.40/containers/json  # Should work
curl --unix-socket /run/podman/podman.sock \
  http://d/v1.40/images/json      # Should work
```

## Step 9: Verify Portainer Shows Podman Containers

After connecting, verify Portainer correctly shows Podman containers:

```bash
# Create a Podman container to test
podman run -d --name test-nginx -p 8080:80 nginx:alpine

# In Portainer UI:
# Go to Containers - should show "test-nginx"
# Go to Images - should show nginx:alpine

# Test from Portainer UI:
# - View container logs
# - Open container console (may have limitations)
# - View stats (requires cgroup configuration)
```

## Conclusion

Connecting Portainer to Podman can be done through the local Podman socket or through the Portainer Agent. When Portainer Server itself runs on Podman, mount the Podman socket to `/var/run/docker.sock` as Portainer expects. For remote hosts, use the Agent or Edge Agent rather than exposing the Podman API over TCP, and keep Portainer's current support matrix in mind: rootful Podman 5 on CentOS Stream 9 is the documented supported configuration.
