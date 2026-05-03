# How to Self-Host a Dashboard (Heimdall/Homer/Homarr) with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Self-Hosted, Home Lab, Dashboard, Homarr, Homer, Heimdall

Description: Deploy a beautiful self-hosted home lab dashboard using Homarr, Homer, or Heimdall with Portainer to organize all your services.

## Introduction

A home lab dashboard gives you a single, organized view of all your self-hosted services. Instead of bookmarking dozens of IP addresses and ports, you get a polished start page with icons, links, and live status widgets. This guide covers three popular options: Homarr (modern, feature-rich), Homer (YAML-configured, lightweight), and Heimdall (simple and elegant).

## Prerequisites

- Portainer installed and running
- At least one other self-hosted service to link to
- A reverse proxy (optional, for custom domains)

## Option 1: Deploy Homarr (Recommended)

Homarr features Docker integration (shows container status), widgets, and a drag-and-drop interface.

```yaml
# docker-compose.yml - Homarr Dashboard

version: "3.8"

networks:
  dashboard_network:
    driver: bridge

volumes:
  homarr_appdata:

services:
  homarr:
    image: ghcr.io/homarr-labs/homarr:latest
    container_name: homarr
    restart: unless-stopped
    ports:
      - "7575:7575"
    volumes:
      # Docker socket for container status integration
      - /var/run/docker.sock:/var/run/docker.sock:ro
      # Persistent storage (database, configs, icons)
      - homarr_appdata:/appdata
    environment:
      - TZ=America/New_York
      # Required: generate with `openssl rand -hex 32`
      - SECRET_ENCRYPTION_KEY=replace_with_a_64_character_hex_string
    networks:
      - dashboard_network
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.homarr.rule=Host(`home.yourdomain.com`)"
      - "traefik.http.routers.homarr.entrypoints=websecure"
      - "traefik.http.routers.homarr.tls.certresolver=letsencrypt"
      - "traefik.http.services.homarr.loadbalancer.server.port=7575"
```

### Configure Homarr

1. Access `http://server-ip:7575`
2. Click **Add a tile** to add your services
3. Connect to Docker to see real-time container status:
   - Settings > Integrations > Docker
4. Add widgets: Calendar, Clock, Weather, RSS feeds, Media server stats

## Option 2: Deploy Homer

Homer is a static, YAML-configured dashboard - simple and extremely fast.

```yaml
# docker-compose.yml - Homer Dashboard
version: "3.8"

networks:
  dashboard_network:
    driver: bridge

volumes:
  homer_assets:

services:
  homer:
    image: b4bz/homer:latest
    container_name: homer
    restart: unless-stopped
    ports:
      - "8082:8080"
    volumes:
      # Configuration file and assets
      - homer_assets:/www/assets
    environment:
      - UID=1000
      - GID=1000
    networks:
      - dashboard_network
```

### Homer Configuration File

```yaml
# /www/assets/config.yml - Homer dashboard configuration
title: "Home Lab"
subtitle: "Personal Dashboard"
logo: "logo.png"
header: true
footer: false

# Color theme
theme: default
colors:
  light:
    highlight-primary: "#3367d6"
    highlight-secondary: "#4285f4"
    highlight-hover: "#5a95f5"
    background: "#f2f6fe"
    card-background: "#ffffff"

# Services organized by category
services:
  - name: "Infrastructure"
    icon: "fas fa-server"
    items:
      - name: "Portainer"
        logo: "https://raw.githubusercontent.com/selfhosters/unRAID-CA-templates/master/templates/img/portainer.png"
        subtitle: "Container Management"
        tag: "infra"
        url: "https://portainer.yourdomain.com"
        target: "_blank"

      - name: "Traefik"
        logo: "https://raw.githubusercontent.com/selfhosters/unRAID-CA-templates/master/templates/img/traefik.png"
        subtitle: "Reverse Proxy"
        tag: "infra"
        url: "https://traefik.yourdomain.com"
        target: "_blank"

  - name: "Media"
    icon: "fas fa-film"
    items:
      - name: "Jellyfin"
        logo: "https://raw.githubusercontent.com/jellyfin/jellyfin/master/Emby.Server.Implementations/Images/Logo.png"
        subtitle: "Media Server"
        tag: "media"
        url: "https://jellyfin.yourdomain.com"
        target: "_blank"
        # Show Jellyfin status
        type: "Emby"
        apikey: "your-jellyfin-api-key"

      - name: "Sonarr"
        logo: "https://raw.githubusercontent.com/NX211/homer-icons/master/icons/sonarr.png"
        subtitle: "TV Shows"
        tag: "media"
        url: "https://sonarr.yourdomain.com"
        target: "_blank"

  - name: "Development"
    icon: "fas fa-code"
    items:
      - name: "Gitea"
        logo: "https://raw.githubusercontent.com/NX211/homer-icons/master/icons/gitea.png"
        subtitle: "Git Server"
        tag: "dev"
        url: "https://git.yourdomain.com"
        target: "_blank"

  - name: "Monitoring"
    icon: "fas fa-chart-line"
    items:
      - name: "Grafana"
        logo: "https://raw.githubusercontent.com/NX211/homer-icons/master/icons/grafana.png"
        subtitle: "Metrics Dashboard"
        tag: "monitoring"
        url: "https://grafana.yourdomain.com"
        target: "_blank"

      - name: "Uptime Kuma"
        logo: "https://raw.githubusercontent.com/NX211/homer-icons/master/icons/uptime-kuma.png"
        subtitle: "Uptime Monitor"
        tag: "monitoring"
        url: "https://uptime.yourdomain.com"
        target: "_blank"
```

## Option 3: Deploy Heimdall

Heimdall is an extremely simple bookmark-style dashboard with a clean interface.

```yaml
# docker-compose.yml - Heimdall
version: "3.8"

volumes:
  heimdall_config:

services:
  heimdall:
    image: lscr.io/linuxserver/heimdall:latest
    container_name: heimdall
    restart: unless-stopped
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
    volumes:
      - heimdall_config:/config
    ports:
      - "80:80"
      - "443:443"
```

## Step 4: Add Service Health Monitoring

Combine your dashboard with Uptime Kuma for service status:

```yaml
# Add to your dashboard stack
  uptime-kuma:
    image: louislam/uptime-kuma:latest
    container_name: uptime-kuma
    restart: unless-stopped
    ports:
      - "3001:3001"
    volumes:
      - /opt/uptime-kuma:/app/data
    networks:
      - dashboard_network
```

## Step 5: Custom Icons

```bash
# Download service icons
mkdir -p /opt/dashboard/icons

# Download popular service icons
wget -O /opt/dashboard/icons/portainer.png \
  "https://raw.githubusercontent.com/NX211/homer-icons/master/icons/portainer.png"

wget -O /opt/dashboard/icons/nextcloud.png \
  "https://raw.githubusercontent.com/NX211/homer-icons/master/icons/nextcloud.png"

# Mount the icons directory
# Add to volumes: /opt/dashboard/icons:/www/assets/icons
```

## Conclusion

Your home lab now has a professional dashboard to organize all services. Homarr is the best choice for most users with its Docker integration and widgets, Homer is ideal for those who prefer YAML configuration and maximum simplicity, and Heimdall works perfectly as a dead-simple bookmark page. All three integrate beautifully with Portainer and can be updated with a single click when new versions are released.
