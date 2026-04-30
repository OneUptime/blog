# How to Install Portainer on Orange Pi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Orange Pi, Docker, ARM, Self-Hosted

Description: A step-by-step guide to installing Portainer CE on an Orange Pi single-board computer to manage Docker containers through a browser-based UI.

## Why Portainer on Orange Pi?

Orange Pi boards (Orange Pi 5, Orange Pi 3B, Orange Pi Zero 2) are affordable ARM-based SBCs that run Linux distributions like Ubuntu or Debian. Portainer adds a web-based container management interface on top of Docker, making it easy to manage containerized applications without the command line.

## Prerequisites

- Orange Pi running Ubuntu or Debian (ARM64 or ARMv7)
- SSH or terminal access
- At least 1 GB RAM (2 GB recommended)
- Internet connection

## Step 1: Update the System

```bash
sudo apt update && sudo apt upgrade -y
```

## Step 2: Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

sudo usermod -aG docker $USER
newgrp docker
```

Verify:

```bash
docker run hello-world
```

## Step 3: Create a Volume for Portainer Data

```bash
docker volume create portainer_data
```

## Step 4: Run Portainer CE

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

## Step 5: Open the Portainer Web UI

Navigate to:

```text
https://<orange-pi-ip>:9443
```

Accept the self-signed certificate and set up your admin credentials.

## Enable Docker on Boot

Docker starts on boot automatically on Debian and Ubuntu, but you can enable it explicitly if needed:

```bash
sudo systemctl enable docker
```

The `--restart=always` flag on the Portainer container ensures it starts automatically with Docker.

## Troubleshooting

**Socket permission error:** Re-apply your Docker group membership, then open a new shell or log back in:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

**Wrong architecture image:** Orange Pi 5 uses ARM64 (aarch64). Confirm with:
```bash
uname -m
```

Portainer CE supports ARM64 and ARMv7, and Docker will pull the correct `lts` image automatically.

**Port already in use:**
```bash
sudo ss -tlnp | grep 9443
```

Change the port mapping if needed (e.g., `-p 19443:9443`).

## Updating Portainer

```bash
docker stop portainer && docker rm portainer
docker pull portainer/portainer-ce:lts
# Re-run the docker run command

```

## Conclusion

Orange Pi with Portainer makes for an excellent low-cost container management node for homelabs or edge deployments. The setup takes under 10 minutes and gives you a full-featured UI to deploy stacks, manage volumes, and monitor containers.
