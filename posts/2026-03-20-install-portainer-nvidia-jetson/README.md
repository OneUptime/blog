# How to Install Portainer on NVIDIA Jetson

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, NVIDIA Jetson, Docker, ARM64, Edge Computing

Description: A step-by-step guide to installing Portainer CE on an NVIDIA Jetson device to manage Docker containers with a web-based UI on edge AI hardware.

## Why Portainer on NVIDIA Jetson?

NVIDIA Jetson devices (Jetson Xavier NX, Jetson Orin Nano, Jetson AGX Orin) are powerful ARM64-based edge computing platforms optimized for AI inference workloads. Portainer provides a browser-based container management interface, making it easy to deploy and manage containerized AI applications on Jetson hardware.

## Prerequisites

- NVIDIA Jetson running JetPack 5.x or later (JetPack 5.x uses Ubuntu 20.04; JetPack 6.x uses Ubuntu 22.04)
- SSH or direct terminal access
- Docker installed and running
- At least 4 GB RAM recommended

## Step 1: Verify Docker Installation

Verify Docker is installed and running:

```bash
docker --version
sudo systemctl status docker
```

If not installed:

```bash
sudo apt update
sudo apt install -y docker.io
sudo systemctl enable --now docker
```

## Step 2: Add User to Docker Group

```bash
sudo usermod -aG docker $USER
newgrp docker
```

## Step 3: Create Portainer Data Volume

```bash
docker volume create portainer_data
```

## Step 4: Deploy Portainer CE

```bash
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

The `portainer/portainer-ce:lts` image supports linux/arm64, which matches the Jetson architecture.

## Step 5: Access Portainer

In your browser, navigate to:

```text
https://<jetson-ip>:9443
```

Create an admin account on the first login screen.

## Using GPU Containers with Portainer

Once Portainer is running, you can deploy NVIDIA GPU-enabled containers. Ensure the NVIDIA Container Runtime is configured:

```bash
sudo apt install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

Then in Portainer, when creating a container, add the runtime option `nvidia` to enable GPU access.

## Troubleshooting

**Cannot connect to Docker daemon:**
```bash
sudo systemctl start docker
sudo usermod -aG docker $USER
newgrp docker
```

**Image pull fails for ARM64:**

Verify your Jetson architecture:
```bash
uname -m
# Should show: aarch64

```

**Check container logs:**
```bash
docker logs portainer
```

## Updating Portainer

```bash
docker stop portainer && docker rm portainer
docker pull portainer/portainer-ce:lts
# Re-run the deploy command from Step 4
```

## Conclusion

Portainer on NVIDIA Jetson gives you a powerful, browser-based interface to manage your edge AI containers. Combined with the NVIDIA Container Runtime, you can easily deploy and monitor GPU-accelerated workloads from a user-friendly UI.
