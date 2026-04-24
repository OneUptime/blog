# Installing Portainer CE on Ubuntu with Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Ubuntu, Docker, Self-Hosted, Container Management

Description: A step-by-step guide to installing Portainer CE on Ubuntu Linux with Docker to manage containers through a web-based UI.

## Prerequisites

- Ubuntu 20.04 LTS, 22.04 LTS, or 24.04 LTS
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

Verify Docker is running:

```bash
docker --version
docker run hello-world
```

## Step 3: Create a Persistent Volume for Portainer

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

## Step 5: Configure UFW Firewall (If Enabled)

```bash
sudo ufw allow 9443/tcp comment 'Portainer HTTPS'
# Only needed if you plan to use Edge Agents
sudo ufw allow 8000/tcp comment 'Portainer Edge Agent'
sudo ufw reload
sudo ufw status
```

## Step 6: Access Portainer

Open your browser and go to:

```text
https://<server-ip>:9443
```

Accept the self-signed TLS certificate warning and set up your admin account. The admin session creation window is 5 minutes - if it times out, restart the container.

## Verify Portainer is Running

```bash
docker ps | grep portainer
curl -sk https://localhost:9443/api/system/status
```

## Troubleshooting

**Cannot connect to Docker socket:**
```bash
ls -la /var/run/docker.sock
sudo usermod -aG docker $USER
newgrp docker
```

**Container not reachable from browser:** Check the firewall and port binding:
```bash
sudo ss -tlnp | grep 9443
```

**Admin account creation timeout:** Restart Portainer:
```bash
docker restart portainer
```

## Updating Portainer

```bash
docker stop portainer
docker rm portainer
docker pull portainer/portainer-ce:lts
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

The `portainer_data` volume preserves your settings across updates.

## Conclusion

Ubuntu with Docker and Portainer CE is one of the most popular self-hosted container management setups. Portainer's intuitive web UI makes it easy to deploy stacks, manage volumes and networks, and monitor containers - all without needing to memorize Docker CLI commands.
