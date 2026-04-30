# How to Install Portainer on Banana Pi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Banana Pi, Docker, ARM, Self-Hosted

Description: A step-by-step guide to installing Portainer CE on a Banana Pi single-board computer to manage Docker containers through a web UI.

## Why Portainer on Banana Pi?

Banana Pi boards (such as the BPI-M5 or BPI-M2 Ultra) are affordable ARM-based single-board computers running Linux. Combined with Portainer, they make excellent self-hosted container management nodes for homelab or edge computing use cases.

## Prerequisites

- Banana Pi running Armbian, Ubuntu, or Debian for ARM
- SSH or direct terminal access
- At least 2 GB RAM recommended
- Internet connectivity

## Step 1: Update the System

```bash
sudo apt update && sudo apt upgrade -y
```

## Step 2: Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to the docker group

sudo usermod -aG docker $USER
newgrp docker
```

Enable Docker and verify the installation:

```bash
sudo systemctl enable --now docker
docker run hello-world
```

## Step 3: Create the Portainer Volume

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

## Step 5: Access the Portainer UI

Open a browser and navigate to:

```text
https://<banana-pi-ip>:9443
```

Accept the self-signed certificate warning and create your admin account on first login.

## Step 6: Enable Auto-Start

The `--restart=always` flag ensures Portainer restarts on reboot. Verify it with:

```bash
docker inspect --format='{{.HostConfig.RestartPolicy.Name}}' portainer
```

## Troubleshooting

**Docker socket permission denied:**
```bash
sudo usermod -aG docker $USER
newgrp docker
```

**Container not starting on ARM:**

Ensure you are using the `portainer/portainer-ce:lts` image. Portainer supports ARM64, with ARMv7 also available.

**Check logs:**
```bash
docker logs portainer
```

## Updating Portainer

```bash
docker stop portainer
docker rm portainer
docker pull portainer/portainer-ce:lts
# Re-run the docker run command from Step 4
```

## Conclusion

Installing Portainer on a Banana Pi is straightforward with Docker. Once running, you have a full-featured container management UI accessible from your local network, making it easy to deploy, monitor, and manage containers on your ARM board.
