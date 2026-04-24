# How to Set Up Portainer Stacks for Home Server Applications on NAS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, NAS, Docker, Stack, Docker Compose, Home Server, Self-Hosted

Description: Use Portainer's stack feature to deploy and manage complex multi-container home server applications on your NAS with Docker Compose files.

## Introduction

Portainer's Stacks feature lets you deploy multi-container applications on NAS devices using a single Compose YAML file. Instead of deploying containers one by one, you define your entire application stack in a single YAML file and deploy it with one click. This guide shows how to use Portainer Stacks effectively for common home server applications.

## What Are Portainer Stacks?

A Portainer Stack is essentially a Docker Compose file managed through Portainer's UI. Stacks allow you to:

- Deploy multiple containers as a single unit
- Define networks, volumes, and environment variables together
- Update all containers in a stack simultaneously
- Store configuration as code (optionally in a Git repository)

## Creating Your First Stack

### Step 1: Navigate to Stacks

In Portainer, click **Stacks** in the left sidebar, then **Add stack**.

### Step 2: Choose a Deployment Method

- **Web editor**: Paste or type compose YAML directly
- **Upload**: Upload a Compose YAML file
- **Git repository**: Pull from a Git repository (recommended for versioning)
- **Custom template**: Deploy from a custom stack template you've created in Portainer

## Example Stacks for Home Servers

### Media Server Stack

```yaml
# Media server stack: Jellyfin + Radarr + Sonarr + Prowlarr

services:
  jellyfin:
    image: jellyfin/jellyfin:latest
    container_name: jellyfin
    ports:
      - "8096:8096"
    volumes:
      - /volume1/Docker/jellyfin/config:/config
      - /volume1/media/movies:/movies:ro
      - /volume1/media/tvshows:/tvshows:ro
    restart: unless-stopped

  radarr:
    image: lscr.io/linuxserver/radarr:latest
    container_name: radarr
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
    ports:
      - "7878:7878"
    volumes:
      - /volume1/Docker/radarr:/config
      - /volume1/media/movies:/movies
      - /volume1/downloads:/downloads
    restart: unless-stopped

  sonarr:
    image: lscr.io/linuxserver/sonarr:latest
    container_name: sonarr
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
    ports:
      - "8989:8989"
    volumes:
      - /volume1/Docker/sonarr:/config
      - /volume1/media/tvshows:/tvshows
      - /volume1/downloads:/downloads
    restart: unless-stopped

  prowlarr:
    image: lscr.io/linuxserver/prowlarr:latest
    container_name: prowlarr
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
    ports:
      - "9696:9696"
    volumes:
      - /volume1/Docker/prowlarr:/config
    restart: unless-stopped
```

### Home Automation Stack

```yaml
services:
  # Home Assistant - home automation hub
  homeassistant:
    image: ghcr.io/home-assistant/home-assistant:stable
    container_name: homeassistant
    network_mode: host
    volumes:
      - /volume1/Docker/homeassistant:/config
      - /etc/localtime:/etc/localtime:ro
    restart: unless-stopped
    privileged: true

  # Mosquitto - MQTT broker for IoT devices
  mosquitto:
    image: eclipse-mosquitto:latest
    container_name: mosquitto
    # Ensure mosquitto.conf exists in /volume1/Docker/mosquitto/config before first start
    ports:
      - "1883:1883"
    volumes:
      - /volume1/Docker/mosquitto/config:/mosquitto/config
      - /volume1/Docker/mosquitto/data:/mosquitto/data
      - /volume1/Docker/mosquitto/log:/mosquitto/log
    restart: unless-stopped
```

### Productivity Stack

```yaml
services:
  # Nextcloud - self-hosted Google Drive alternative
  nextcloud:
    image: nextcloud:latest
    container_name: nextcloud
    ports:
      - "8080:80"
    environment:
      - MYSQL_HOST=nextcloud-db
      - MYSQL_DATABASE=nextcloud
      - MYSQL_USER=nextcloud
      - MYSQL_PASSWORD=nextcloud_password
      - REDIS_HOST=nextcloud-redis
    volumes:
      - /volume1/Docker/nextcloud:/var/www/html
      - /volume1/Nextcloud:/var/www/html/data
    depends_on:
      - nextcloud-db
      - nextcloud-redis
    restart: unless-stopped

  nextcloud-db:
    image: mariadb:10.11
    container_name: nextcloud-db
    environment:
      - MARIADB_ROOT_PASSWORD=root_password
      - MARIADB_DATABASE=nextcloud
      - MARIADB_USER=nextcloud
      - MARIADB_PASSWORD=nextcloud_password
    volumes:
      - /volume1/Docker/nextcloud-db:/var/lib/mysql
    restart: unless-stopped

  # Redis - caching for Nextcloud
  nextcloud-redis:
    image: redis:alpine
    container_name: nextcloud-redis
    restart: unless-stopped
```

## Using Environment Variables in Stacks

For sensitive values, use Portainer's **Environment variables** section at the bottom of the stack editor:

```yaml
services:
  myapp:
    image: myapp:latest
    environment:
      # Reference Portainer stack environment variables
      - DB_PASSWORD=${DB_PASSWORD}
      - API_KEY=${API_KEY}
      - SMTP_PASSWORD=${SMTP_PASSWORD}
```

Then in Portainer, add the variables:
- `DB_PASSWORD` = `your_secure_password`
- `API_KEY` = `your_api_key`

This keeps secrets out of your compose files.

## Deploying from Git (GitOps)

For versioned configuration management:

1. In the stack editor, select **Git repository**
2. Enter your Git repository URL
3. Set the **Compose path** (e.g., `stacks/media/docker-compose.yml`)
4. Enable **GitOps updates** to poll for repository changes or trigger updates via webhook

## Updating a Stack

To update container images in a stack:

1. Navigate to **Stacks** and click your stack
2. If the stack was deployed from Git, click **Pull and redeploy** and enable image re-pull if you want newer image tags fetched
3. If the stack was created in the web editor or uploaded, edit the compose file and click **Update the stack**

## NAS Volume Path Conventions

On Synology NAS devices, a common convention is:

```text
/volume1/Docker/          - Container configs (small, fast)
/volume1/media/           - Media library (large)
/volume1/downloads/       - Download directory
/volume1/backups/         - Application backups
```

Adjust the base path for your NAS platform if it does not use `/volume1`.

## Conclusion

Portainer Stacks transform NAS Docker management from single-container deployments into full application orchestration. By defining your entire application - including databases, caches, and supporting services - in a single compose file, you get reproducible deployments that are easy to update, version-control, and share. Combined with Portainer's environment variables, you can keep sensitive credentials out of your compose files while maintaining flexibility.
