# How to Connect Portainer to a Podman Socket

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Podman, Docker Socket, Linux, Container Management, Rootless

Description: Learn how to connect Portainer to a Podman socket to manage Podman containers through the Portainer UI, using Podman's Docker-compatible API.

---

Podman provides a Docker-compatible REST API that Portainer can use. In officially supported setups, Portainer connects to a local rootful Podman socket to manage Podman containers.

## Prerequisites

- CentOS 9 with Podman 5.x installed on the host
- Podman socket service enabled
- Portainer running locally with access to the Podman socket
- Rootful Podman for the supported configuration (rootless may work, but is not officially supported)

## Step 1: Enable the Podman Socket

```bash
# For rootful Podman (supported by Portainer)

sudo systemctl enable --now podman.socket
sudo systemctl status podman.socket

# Verify the socket exists
ls -la /run/podman/podman.sock

# For rootless Podman (may work, but is not officially supported by Portainer)
systemctl --user enable --now podman.socket
loginctl enable-linger $(whoami)
ls -la /run/user/$(id -u)/podman/podman.sock
```

## Step 2: Test the Podman API

```bash
# Test that the Podman socket responds to Docker-compatible API calls
curl --unix-socket /run/podman/podman.sock http://d/version

# For rootless Podman
curl --unix-socket /run/user/$(id -u)/podman/podman.sock http://d/version

# Should return JSON with Podman version info
# Podman exposes a Docker v1.40 compatibility API
```

## Step 3: Configure Portainer to Use the Podman Socket

**Option A: Mount the Podman socket in the Portainer container**

```bash
podman run -d \
  --name portainer \
  --restart=always \
  --privileged \
  -p 9443:9443 \
  -v /run/podman/podman.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

**Option B: Add Podman as a separate environment via the socket**

1. In Portainer go to **Environments > Add Environment**.
2. Choose **Podman**.
3. Under **More options**, choose **Socket**.
4. If needed, enable **Override default socket path** and set it to `/run/podman/podman.sock` (or `/run/user/<uid>/podman/podman.sock` for rootless, which may work but is not officially supported).

## Step 4: Fix Podman Socket Permissions

Portainer must be able to access the socket path you mounted. Avoid making the socket world-writable; Podman recommends relying on normal Unix socket permissions.

```bash
# Check socket permissions for rootful Podman
ls -la /run/podman/podman.sock

# Or check the rootless socket path
ls -la /run/user/$(id -u)/podman/podman.sock
```

## Limitations

Portainer with Podman has some differences from Docker:

- Official support is currently limited to CentOS Stream 9, Podman 5, and rootful mode
- Podman environments are not supported by Portainer's auto-onboarding script
- Connecting directly to the Podman socket is a legacy option
- A Podman environment cannot be added via socket when Portainer Server is running on Docker, and vice versa
