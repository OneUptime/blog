# How to Set Up a Home Lab with Portainer on Raspberry Pi

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Raspberry Pi, Home Lab, Docker, Self-Hosted, DIY

Description: Build a complete self-hosted home lab on a Raspberry Pi using Portainer to manage all your services including DNS, VPN, monitoring, and media.

## Introduction

A Raspberry Pi running Portainer can replace dozens of cloud subscriptions with self-hosted services. This guide walks through setting up a comprehensive home lab with common services organized into stacks, all managed from Portainer's web interface.

## Prerequisites

- Raspberry Pi 4 (8GB recommended) with Raspberry Pi OS 64-bit
- 64GB+ USB SSD (for reliability over MicroSD)
- Docker and Portainer installed
- Domain name (optional, for HTTPS with Let's Encrypt)

## Step 1: Plan Your Services

A typical home lab on a single Pi 4 (8GB) can run:

| Service | Purpose | RAM Usage |
|---------|---------|-----------|
| Pi-hole | DNS ad blocking | ~100MB |
| WireGuard | VPN | ~50MB |
| Nginx Proxy Manager | Reverse proxy | ~100MB |
| Nextcloud | File sync | ~300MB |
| Jellyfin | Media streaming | ~300MB |
| Portainer | Container management | ~100MB |
| Prometheus + Grafana | Monitoring | ~300MB |

Total: ~1.25GB, comfortable on 8GB Pi 4.

## Step 2: Set Up Network Infrastructure Stack

In Portainer, create a stack named `network`:

```yaml
services:
  # Pi-hole for DNS ad blocking
  pihole:
    image: pihole/pihole:latest
    ports:
      - "53:53/tcp"
      - "53:53/udp"
      - "8081:80"      # Pi-hole admin UI
    environment:
      TZ: America/New_York
      FTLCONF_webserver_api_password: your_pihole_password
      FTLCONF_dns_listeningMode: all
    volumes:
      - /home/pi/homelab/pihole/etc:/etc/pihole
      - /home/pi/homelab/pihole/dnsmasq:/etc/dnsmasq.d
    restart: unless-stopped

  # Nginx Proxy Manager for reverse proxy
  npm:
    image: jc21/nginx-proxy-manager:latest
    ports:
      - "8181:81"    # Admin UI
      - "443:443"    # HTTPS
      - "80:80"      # HTTP
    volumes:
      - /home/pi/homelab/npm/data:/data
      - /home/pi/homelab/npm/letsencrypt:/etc/letsencrypt
    restart: unless-stopped
```

## Step 3: Media Server Stack

Create a stack named `media`:

```yaml
services:
  jellyfin:
    image: jellyfin/jellyfin:latest
    network_mode: host   # Required for DLNA discovery
    volumes:
      - /home/pi/homelab/jellyfin:/config
      - /mnt/usb/media:/media:ro
    environment:
      - JELLYFIN_PublishedServerUrl=http://192.168.1.100
    restart: unless-stopped

  # Automatic media download management
  radarr:
    image: lscr.io/linuxserver/radarr:latest
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
    ports:
      - "7878:7878"
    volumes:
      - /home/pi/homelab/radarr:/config
      - /mnt/usb/media/movies:/movies
      - /mnt/usb/downloads:/downloads
    restart: unless-stopped
```

## Step 4: Cloud Storage Stack

Create a stack named `cloud`:

```yaml
services:
  nextcloud:
    image: nextcloud:latest
    ports:
      - "8080:80"
    environment:
      - MYSQL_HOST=nextcloud-db
      - MYSQL_DATABASE=nextcloud
      - MYSQL_USER=nextcloud
      - MYSQL_PASSWORD=nc_password
      - NEXTCLOUD_ADMIN_USER=admin
      - NEXTCLOUD_ADMIN_PASSWORD=admin_password
    volumes:
      - /home/pi/homelab/nextcloud:/var/www/html
      - /mnt/usb/nextcloud:/var/www/html/data
    depends_on:
      - nextcloud-db
    restart: unless-stopped

  nextcloud-db:
    image: mariadb:10.11
    environment:
      - MYSQL_ROOT_PASSWORD=root_password
      - MYSQL_DATABASE=nextcloud
      - MYSQL_USER=nextcloud
      - MYSQL_PASSWORD=nc_password
    volumes:
      - /home/pi/homelab/nextcloud-db:/var/lib/mysql
    restart: unless-stopped
```

## Step 5: Monitoring Stack

Create a stack named `monitoring`:

```yaml
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - /home/pi/homelab/prometheus:/etc/prometheus
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin_password
    volumes:
      - grafana_data:/var/lib/grafana
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:latest
    network_mode: host
    pid: host
    volumes:
      - /:/host:ro,rslave
    command:
      - '--path.rootfs=/host'
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
```

Create `/home/pi/homelab/prometheus/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s

storage:
  tsdb:
    retention:
      time: 7d

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['192.168.1.100:9100']
```

## Step 6: Configure External Storage

Mount USB SSD:

```bash
# Create mount point

sudo mkdir -p /mnt/usb

# Get UUID of USB drive
sudo blkid

# Add to /etc/fstab for auto-mount
echo 'UUID=<your-uuid> /mnt/usb ext4 defaults,noatime 0 2' | sudo tee -a /etc/fstab
sudo mount -a
```

## Step 7: Backup Strategy

```bash
# Create a backup script
cat > /home/pi/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/mnt/usb/backups/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

# Backup all homelab config directories
tar czf "$BACKUP_DIR/homelab-config.tar.gz" /home/pi/homelab/

# Remove backups older than 7 days
find /mnt/usb/backups -mindepth 1 -maxdepth 1 -type d -mtime +7 -exec rm -rf {} \;

echo "Backup completed: $BACKUP_DIR"
EOF

chmod +x /home/pi/backup.sh

# Schedule daily backup
echo '0 2 * * * pi /home/pi/backup.sh >> /var/log/homelab-backup.log 2>&1' | \
  sudo tee /etc/cron.d/homelab-backup
```

## Conclusion

A Raspberry Pi 4 with Portainer can run a comprehensive home lab that replaces cloud subscriptions for media streaming, file sync, DNS filtering, and monitoring. Organizing services into logical Portainer stacks makes management intuitive and updates straightforward. The USB SSD provides reliable storage, and the cron-based backup ensures you can restore if something goes wrong.
