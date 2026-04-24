# How to Troubleshoot Podman Socket Connection Issues in Portainer - Socket

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Podman, Troubleshooting, Socket, Connectivity, API

Description: Learn how to diagnose and fix Podman socket connection issues when Portainer cannot communicate with the Podman API, including socket permissions and service configuration.

---

Connecting Portainer to a Podman socket involves more configuration than with Docker. This guide covers the common failure modes and their fixes.

## Step 1: Verify the Podman Socket is Active

```bash
# For system-level (rootful) Podman

sudo systemctl status podman.socket
# Should show: Active: active (listening)

# For user-level (rootless) Podman
systemctl --user status podman.socket
# Should show: Active: active (listening)

# List the socket file
ls -la /run/podman/podman.sock          # rootful
ls -la /run/user/$(id -u)/podman/podman.sock  # rootless
```

## Step 2: Test the API Directly

```bash
# Test rootful Podman socket
curl --unix-socket /run/podman/podman.sock \
  http://localhost/v1.40/info

# Expected: JSON response with Podman system info
# If error: socket doesn't exist or service not running
```

## Step 3: Fix "Permission Denied" on the Socket

Portainer may not have access to the Podman socket because of file permissions or container security settings:

```bash
# Check socket permissions
ls -la /run/podman/podman.sock
# Typical default mode: srw-rw----

# Option 1: Make socket world-readable (temporary testing only)
sudo chmod 666 /run/podman/podman.sock

# Option 2: If Portainer Server is running on Podman,
# use the supported Podman deployment pattern
podman run -d \
  --name portainer \
  --privileged \
  -v /run/podman/podman.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Step 4: Fix "No Such File or Directory" - Enable the Socket Service

```bash
# Rootful: enable and start the socket
sudo systemctl enable podman.socket
sudo systemctl start podman.socket

# Rootless: enable in user session
systemctl --user enable podman.socket
systemctl --user start podman.socket

# For rootless socket to persist after logout
sudo loginctl enable-linger $(whoami)
```

## Step 5: Check API Version Compatibility

Podman's Docker-compatible API may not implement every endpoint:

```bash
# Check Podman's supported API version
curl --unix-socket /run/podman/podman.sock http://localhost/version | jq -r '.ApiVersion // .APIVersion'

# Check what Portainer is requesting
podman logs portainer 2>&1 | grep -i "api version\|podman\|v1\." | tail -20
```

Podman documents Docker API compatibility as v1.40, and the server does not reject unsupported version numbers. If Portainer logs show missing or unsupported endpoints, verify that you are using a supported Portainer/Podman combination before troubleshooting further.

## Step 6: Rootless Podman Is Not Officially Supported

Portainer documents rootless Podman as not officially supported. Portainer also documents that Podman environments cannot be added via socket when the Portainer Server is running on Docker. For socket-based connections, use a local rootful Podman socket.
