# Installing Portainer CE on CentOS with Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, CentOS, Docker, Self-Hosted, Container Management

Description: A step-by-step guide to installing Portainer CE on CentOS Linux with Docker to manage containers through a web-based UI.

## Prerequisites

- CentOS Stream 9 or 10
- Root or sudo access
- Internet connectivity

## Step 1: Update the System

```bash
sudo dnf update -y
```

## Step 2: Install Docker

```bash
sudo dnf -y install dnf-plugins-core
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
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
# On CentOS hosts with SELinux enabled, Portainer requires --privileged.
docker run -d \
  --privileged \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

## Step 5: Open Firewall Ports

```bash
sudo firewall-cmd --permanent --add-port=9443/tcp
# Optional: only needed if you plan to use Edge Agents.
sudo firewall-cmd --permanent --add-port=8000/tcp
sudo firewall-cmd --reload
```

## Step 6: Access Portainer

Navigate to `https://<server-ip>:9443` in your browser. Accept the self-signed certificate and create your admin account.

## Troubleshooting

**Permission denied running Docker commands:**
```bash
sudo usermod -aG docker $USER
newgrp docker
```

**Check logs:**
```bash
docker logs portainer
```

**SELinux issues:** On SELinux-enabled CentOS hosts, make sure the Portainer container was started with the `--privileged` flag.

## Updating Portainer

```bash
docker stop portainer && docker rm portainer
docker pull portainer/portainer-ce:latest
# Re-run the deploy command

```

## Conclusion

Portainer CE on CentOS provides a powerful web-based interface for Docker container management. The installation process takes only a few minutes, and Portainer's persistent data volume ensures your configuration survives container restarts and updates.
