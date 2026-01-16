# How to Install Portainer for Docker Management on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Portainer, Docker, Container Management, Web UI, Tutorial

Description: Set up Portainer's web interface for easy Docker container, image, and network management on Ubuntu.

---

Portainer is a lightweight management UI for Docker that lets you manage containers, images, volumes, and networks through a web interface. It's perfect for those who prefer graphical tools over CLI.

## Prerequisites

- Ubuntu 20.04, 22.04, or 24.04
- Docker installed and running
- Root or sudo access

## Install Portainer CE

### Create Data Volume

```bash
# Create volume for Portainer data
docker volume create portainer_data
```

### Deploy Portainer Container

```bash
# Run Portainer CE
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

### Access Portainer

1. Open browser to `https://your_server_ip:9443`
2. Accept self-signed certificate warning
3. Create admin user and password
4. Select "Get Started" for local Docker environment

## Initial Configuration

### Connect to Local Docker

- Portainer automatically detects local Docker socket
- Click "Local" environment to manage

### Add Remote Docker Hosts

1. Go to Environments → Add Environment
2. Choose "Docker Standalone"
3. Select "Agent" or "API" connection method
4. Enter remote host details

## Using Portainer

### Dashboard Overview

- Container count and status
- Image count and size
- Volume count
- Network count

### Container Management

- View all containers
- Start/stop/restart containers
- View logs in real-time
- Execute console commands
- Inspect container details

### Image Management

- List all images
- Pull new images
- Build from Dockerfile
- Remove unused images

### Volume Management

- Create volumes
- View volume details
- Browse volume contents
- Remove volumes

### Network Management

- View networks
- Create custom networks
- Inspect network details

## Deploy Using Docker Compose

```yaml
version: '3.8'

services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    ports:
      - "8000:8000"
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    security_opt:
      - no-new-privileges:true

volumes:
  portainer_data:
```

```bash
# Deploy
docker compose up -d
```

## SSL with Custom Certificate

```bash
# Create certs directory
mkdir -p /opt/portainer/certs

# Copy certificates
cp fullchain.pem /opt/portainer/certs/
cp privkey.pem /opt/portainer/certs/

# Run with custom SSL
docker run -d \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /opt/portainer/certs:/certs \
  portainer/portainer-ce:latest \
  --sslcert /certs/fullchain.pem \
  --sslkey /certs/privkey.pem
```

## Portainer Agent (Remote Hosts)

### On Remote Host

```bash
# Deploy Portainer Agent
docker run -d \
  -p 9001:9001 \
  --name portainer_agent \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  portainer/agent:latest
```

### In Portainer UI

1. Environments → Add Environment
2. Select "Docker Standalone"
3. Choose "Agent"
4. Enter: `remote_host_ip:9001`
5. Name and add environment

## App Templates

Portainer includes pre-built templates:

1. Go to App Templates
2. Browse available templates
3. Click template to configure
4. Deploy with one click

### Custom Templates

1. Settings → App Templates
2. Add custom template URL
3. Or create templates in-app

## Stacks (Docker Compose in UI)

### Create Stack

1. Go to Stacks → Add Stack
2. Name the stack
3. Paste docker-compose.yml content
4. Configure environment variables
5. Deploy stack

### Manage Stack

- Update stack (redeploy)
- View stack services
- View logs
- Remove stack

## User Management

### Create Users

1. Settings → Users → Add User
2. Enter username and password
3. Assign to team (optional)

### Teams

1. Settings → Teams → Add Team
2. Name team
3. Add team leaders
4. Assign users

### Access Control

- Assign environments to teams
- Set resource permissions
- Enable/disable features per team

## Backup Portainer

```bash
# Backup data volume
docker run --rm \
  -v portainer_data:/data \
  -v $(pwd):/backup \
  alpine tar cvf /backup/portainer_backup.tar /data

# Restore
docker run --rm \
  -v portainer_data:/data \
  -v $(pwd):/backup \
  alpine tar xvf /backup/portainer_backup.tar -C /
```

## Update Portainer

```bash
# Stop and remove current container
docker stop portainer
docker rm portainer

# Pull latest image
docker pull portainer/portainer-ce:latest

# Start new container (data persists in volume)
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:latest
```

## Troubleshooting

### Cannot Connect to Docker

```bash
# Check Docker socket permissions
ls -la /var/run/docker.sock

# Verify Portainer can access socket
docker logs portainer
```

### Reset Admin Password

```bash
# Stop Portainer
docker stop portainer

# Reset password
docker run --rm \
  -v portainer_data:/data \
  portainer/helper-reset-password

# Start Portainer
docker start portainer
```

---

Portainer simplifies Docker management with its intuitive interface. It's ideal for developers and teams who want visual container management without memorizing CLI commands.
