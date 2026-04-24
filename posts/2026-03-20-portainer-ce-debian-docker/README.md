# Installing Portainer CE on Debian with Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Debian, Docker, Self-Hosted, Container Management

Description: A step-by-step guide to installing Portainer CE on Debian Linux with Docker to manage containers through a web-based UI.

## Prerequisites

- Debian 11 (Bullseye) or Debian 12 (Bookworm)
- Root or sudo access
- Internet connectivity

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
sudo systemctl enable --now docker
```

Verify:

```bash
docker run hello-world
```

## Step 3: Create a Portainer Data Volume

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
  portainer/portainer-ce:sts
```

## Step 5: Review Firewall Rules

Portainer uses `9443` for the web UI. Port `8000` is only required if you plan to use Edge agents. If you use UFW on Debian, note that published Docker ports bypass UFW rules, so restrict access with Docker's `DOCKER-USER` chain or upstream network controls if needed.

## Step 6: Access Portainer

Open a browser and go to `https://<server-ip>:9443`. Create your admin account on first login.

## Troubleshooting

**Socket permission denied:**
```bash
sudo usermod -aG docker $USER
newgrp docker
```

**View container logs:**
```bash
docker logs portainer
```

**Container not starting:**
```bash
docker ps -a
docker inspect portainer
```

## Updating Portainer

```bash
docker stop portainer && docker rm portainer
docker pull portainer/portainer-ce:sts
# Re-run the deploy command from Step 4

```

## Conclusion

Portainer CE on Debian is a straightforward and reliable setup for self-hosted Docker container management. With the persistent data volume, your Portainer configuration and settings are preserved across updates.
