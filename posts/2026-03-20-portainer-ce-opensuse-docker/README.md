# Installing Portainer CE on openSUSE with Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, openSUSE, Docker, Self-Hosted, Container Management

Description: A step-by-step guide to installing Portainer CE on openSUSE Linux with Docker to manage containers through a web-based UI.

## Prerequisites

- openSUSE Leap 15.6 or newer, or openSUSE Tumbleweed
- Root or sudo access
- Internet connectivity

## Step 1: Update the System

For Leap:

```bash
sudo zypper refresh && sudo zypper update -y
```

For Tumbleweed:

```bash
sudo zypper refresh && sudo zypper dup -y
```

## Step 2: Install Docker

```bash
sudo zypper install -y docker
sudo systemctl enable --now docker
sudo usermod -aG docker $USER
newgrp docker
```

Verify:

```bash
docker --version
docker info
```

## Step 3: Create a Portainer Volume

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

## Step 5: Configure the Firewall

If you want to allow access through the host firewall, openSUSE uses firewalld by default:

```bash
sudo firewall-cmd --permanent --add-port=9443/tcp
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload
```

Or using YaST:
- Open YaST → Firewall
- Add custom ports 9443/tcp and 8000/tcp to the public zone

## Step 6: Access Portainer

Open a browser and navigate to `https://<server-ip>:9443`. Accept the self-signed certificate and create your admin account.

## Troubleshooting

**Docker socket permission:**
```bash
sudo usermod -aG docker $USER
newgrp docker
```

**AppArmor issues (Tumbleweed):**
```bash
sudo aa-status
sudo dmesg | grep apparmor
```

**View logs:**
```bash
docker logs portainer
docker ps -a
```

## Updating Portainer

```bash
docker stop portainer && docker rm portainer
docker pull portainer/portainer-ce:sts
# Re-run the deploy command from Step 4

```

## Conclusion

Portainer CE on openSUSE is straightforward once Docker is installed via zypper. The web UI provides a complete interface for managing containers, volumes, networks, and stacks on your openSUSE server.
