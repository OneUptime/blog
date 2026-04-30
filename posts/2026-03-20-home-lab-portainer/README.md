# How to Set Up a Complete Home Lab with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Home Lab, Self-Hosted, Infrastructure

Description: Learn how to build a complete home lab environment from scratch using Portainer as your container management platform.

## Introduction

A home lab is a personal computing environment where you can experiment with software, self-host services, and learn new technologies without relying on cloud providers. Portainer provides a powerful web-based UI to manage all your Docker containers, making it the ideal control plane for your home lab.

## Prerequisites

- A machine running Linux (Ubuntu 22.04 recommended), a Raspberry Pi, or an old PC
- At least 4GB RAM and 50GB storage
- Basic knowledge of Docker and networking

## Step 1: Install Docker

```bash
# Update your system

sudo apt update && sudo apt upgrade -y

# Install Docker using the convenience script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to the docker group
sudo usermod -aG docker $USER

# Enable Docker on startup
sudo systemctl enable docker
sudo systemctl start docker

# Verify Docker is running
sudo docker run hello-world
```

Log out and back in before continuing so your updated `docker` group membership takes effect.

## Step 2: Install Portainer

```bash
# Create a Docker volume for Portainer data persistence
docker volume create portainer_data

# Run Portainer Community Edition
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Step 3: Initial Portainer Configuration

1. Navigate to `https://your-server-ip:9443` in your browser
2. Create your admin account with a strong password
3. Portainer will automatically detect and set up the local environment
4. Click **Get Started** to begin using Portainer, or **Add Environments** if you want to connect additional hosts

## Step 4: Set Up a Core Home Lab Stack

Create a foundational `docker-compose.yml` for essential services:

```yaml
# docker-compose.yml - Core Home Lab Stack

networks:
  # Shared network for all home lab services
  homelab:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  # Persistent data volumes
  traefik_data:
  portainer_data:

services:
  # Traefik reverse proxy for routing
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_data:/etc/traefik
    networks:
      - homelab
    command:
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"

  # Watchtower for automatic container updates
  watchtower:
    image: containrrr/watchtower
    container_name: watchtower
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      # Check for updates every 24 hours
      - WATCHTOWER_SCHEDULE=0 0 4 * * *
      - WATCHTOWER_CLEANUP=true
    networks:
      - homelab
```

## Step 5: Deploy the Stack in Portainer

1. In Portainer, navigate to **Stacks** in the left sidebar
2. Click **Add stack**
3. Give it a name like `homelab-core`
4. Paste the `docker-compose.yml` content
5. Click **Deploy the stack**

## Step 6: Organize with Portainer Teams and Environments

```bash
# If you have multiple machines, add them as environments
# On each remote machine, install Portainer Agent
docker run -d \
  -p 9001:9001 \
  --name portainer_agent \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:lts
```

Then in Portainer, go to **Environments** > **Add environment** > **Docker Standalone**, select **Agent** under **More options**, and enter `remote-machine-ip:9001` as the environment URL.

## Step 7: Set Up Backups

```bash
# Create a backup script for Portainer data
sudo tee /usr/local/bin/backup-portainer.sh > /dev/null << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/backups"

mkdir -p "$BACKUP_DIR"

# Stop Portainer temporarily
docker stop portainer

# Backup Portainer volume
docker run --rm \
  -v portainer_data:/data \
  -v "$BACKUP_DIR":/backup \
  alpine tar czf "/backup/portainer_backup_$DATE.tar.gz" /data

# Restart Portainer
docker start portainer

# Remove backups older than 30 days
find "$BACKUP_DIR" -name "portainer_backup_*.tar.gz" -mtime +30 -delete

echo "Backup completed: portainer_backup_$DATE.tar.gz"
EOF

sudo chmod +x /usr/local/bin/backup-portainer.sh

# Add to root's cron - runs at 2 AM daily
echo "0 2 * * * /usr/local/bin/backup-portainer.sh" | sudo crontab -
```

## Recommended Home Lab Services

Once your base is running, you can add:

| Service | Purpose | Stack |
|---------|---------|-------|
| Nextcloud | File sync | Cloud storage |
| Jellyfin | Media server | Entertainment |
| Pi-hole | DNS ad blocker | Network |
| Home Assistant | Automation | IoT |
| Gitea | Git hosting | Development |
| Grafana | Monitoring | Observability |

## Conclusion

You now have a solid foundation for your home lab powered by Portainer. The combination of Docker's containerization and Portainer's management interface gives you a flexible, maintainable infrastructure. Start with the core stack and gradually add services based on your needs. Portainer's visual interface makes it easy to monitor, update, and troubleshoot all your containers from a single dashboard.
