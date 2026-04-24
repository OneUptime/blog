# How to Fix GPU Enabling Errors in Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, GPU, NVIDIA, Troubleshooting, Machine Learning

Description: Resolve GPU passthrough errors in Portainer when enabling NVIDIA GPU access for containers, including driver installation, runtime configuration, and Docker resource limits.

## Introduction

Enabling GPU access for Docker containers via Portainer requires NVIDIA drivers, the NVIDIA Container Toolkit, and proper Docker daemon configuration. When any of these components is missing or misconfigured, Portainer will fail to start containers with GPU resources enabled. This guide covers the complete setup and troubleshooting.

## Prerequisites

- An NVIDIA GPU in your system
- Ubuntu 20.04/22.04 or compatible Linux distribution
- Portainer CE or BE installed

## Step 1: Verify NVIDIA Drivers Are Installed

```bash
# Check if NVIDIA drivers are installed

nvidia-smi

# Expected output shows GPU info and driver version
# If command not found:
sudo ubuntu-drivers install
sudo reboot
```

## Step 2: Install NVIDIA Container Toolkit

```bash
# Install prerequisites for the NVIDIA repository setup
sudo apt-get update
sudo apt-get install -y --no-install-recommends ca-certificates curl gnupg2

# Add NVIDIA Container Toolkit repository
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | \
  sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg

curl -s -L https://nvidia.github.io/libnvidia-container/stable/deb/nvidia-container-toolkit.list | \
  sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
  sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list

sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit

# Configure Docker to use NVIDIA runtime
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

## Step 3: Configure Docker Daemon for GPU Access

```bash
# Verify NVIDIA runtime is configured
sudo cat /etc/docker/daemon.json
# Should contain:
# {
#   "runtimes": {
#     "nvidia": {
#       "args": [],
#       "path": "nvidia-container-runtime"
#     }
#   }
# }

# Set NVIDIA as default runtime (optional but simplifies setup)
sudo nvidia-ctk runtime configure --runtime=docker --set-as-default
sudo systemctl restart docker
```

## Step 4: Test GPU Access from CLI

```bash
# Test GPU access in a container
docker run --rm --gpus all ubuntu nvidia-smi

# Expected: shows GPU information inside the container
# If this fails, the toolkit is not configured correctly
```

## Step 5: Enable GPU in Portainer Container Settings

In Portainer:
1. Go to **Containers** → **Add Container**
2. Under **Runtime & Resources** → **GPU** section
3. Toggle **Enable GPU** to on
4. Select specific GPUs or choose **Use All GPUs**
5. Click **Deploy the container**

## Step 6: Fix "GPU Devices Not Found" Error

```bash
# Check if Docker can see the GPU device
docker run --rm --gpus all \
  ubuntu nvidia-smi 2>&1

# If error: "Error response from daemon: could not select device driver "" with capabilities: [[gpu]]"
# The NVIDIA runtime is not configured

# Verify nvidia-container-runtime is in PATH
which nvidia-container-runtime
# Should return: /usr/bin/nvidia-container-runtime

# Check runtime configuration
sudo nvidia-ctk runtime configure --runtime=docker --dry-run
```

## Step 7: Fix "OCI runtime create failed" Error

```bash
# This error usually means the NVIDIA runtime hook failed during container startup
# Verify the NVIDIA driver works on the host first
nvidia-smi

# Check the toolkit installation
nvidia-ctk --version

# Re-apply Docker runtime configuration
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker

# If the error persists and mentions nvidia-container-cli,
# uncomment the debug=... line in /etc/nvidia-container-runtime/config.toml
# and retry the container start to collect NVIDIA runtime logs
```

## Step 8: Configure GPU Access in Docker Compose Stacks

```yaml
services:
  ml-app:
    image: nvidia/cuda:12.9.0-base-ubuntu22.04
    restart: unless-stopped
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1          # Number of GPUs (or "all")
              capabilities: [gpu]
    command: nvidia-smi
```

> **Note**: With current Docker Compose, the `version` key is not required. The `capabilities` field is required, and `count` and `device_ids` are mutually exclusive. The NVIDIA Container Toolkit must also be installed on the host.

## Step 9: Fix GPU Resource Limits in Portainer UI

When using Portainer's resource limit settings:

```bash
# After enabling GPU in Portainer UI:
# Check the GPU is being passed through
docker inspect <container-name> | grep -A 10 '"DeviceRequests"'

# Expected:
# "DeviceRequests": [
#   {
#     "Driver": "nvidia",
#     "Count": -1,
#     "DeviceIDs": null,
#     "Capabilities": [["gpu"]],
#     ...
#   }
# ]
```

## Step 10: Fix Specific GPU Assignment

To assign a specific GPU (multi-GPU setups):

```yaml
# Use device IDs
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          device_ids: ['0', '1']  # GPU 0 and 1
          capabilities: [gpu]
```

Or by UUID:

```bash
# Get GPU UUIDs
nvidia-smi -L
# GPU 0: NVIDIA GeForce RTX 4090 (UUID: GPU-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

# Use UUID in compose:
# device_ids: ['GPU-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx']
```

## Step 11: Fix Missing GPU Controls in Portainer

If the GPU section does not appear in Portainer on a Docker Standalone environment:

1. Go to **Host** → **Setup**
2. Under **Other**, enable **Show GPU in the UI**
3. Click **Add GPU** and register the GPU by name plus index or UUID
4. Return to the container form and enable GPU access there

## Conclusion

GPU enabling errors in Portainer are usually caused by missing or misconfigured NVIDIA Container Toolkit rather than Portainer itself. The fix is systematic: verify `nvidia-smi` works, install the Container Toolkit, configure the Docker NVIDIA runtime, verify with a direct `docker run --gpus all` command, and then use Portainer to manage GPU containers. Once the toolkit is correctly installed and GPU visibility is enabled for the environment in Portainer, the GPU controls will work without any extra Docker-side changes.
