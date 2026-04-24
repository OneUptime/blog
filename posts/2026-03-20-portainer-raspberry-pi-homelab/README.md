# How to Set Up a Home Lab with Portainer on Raspberry Pi - Homelab

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Raspberry Pi, Home Lab, Docker, Self-Hosted

Description: Learn how to build a complete self-hosted home lab using Portainer on a Raspberry Pi, running services like Pi-hole, Nginx Proxy Manager, and Home Assistant.

## Home Lab Architecture

```text
Raspberry Pi 4 (4GB+)
├── Portainer (management)
├── Pi-hole (DNS + ad blocking)
├── Nginx Proxy Manager (reverse proxy)
├── Home Assistant (home automation)
├── Nextcloud (file storage)
└── Grafana + Prometheus (monitoring)
```

## Hardware Requirements

- Raspberry Pi 4 (4GB or 8GB recommended) or Raspberry Pi 5
- 32GB+ microSD card (minimum) or USB3 SSD (recommended)
- Reliable power supply (official Pi power supply)
- Ethernet connection (recommended over Wi-Fi for server use)

## Step 1: Install Raspberry Pi OS

```bash
# Use Raspberry Pi Imager

# Select: Raspberry Pi OS Lite (64-bit) - no desktop needed

# Enable SSH in imager settings
# Set hostname, username, Wi-Fi (if needed)
```

## Step 2: Prepare the System

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y curl git vim

# Set static IP (optional but recommended)
# Raspberry Pi OS Bookworm and newer use NetworkManager by default
nmcli connection show
sudo nmcli connection modify "<your-ethernet-connection-name>" \
  ipv4.method manual \
  ipv4.addresses 192.168.1.100/24 \
  ipv4.gateway 192.168.1.1 \
  ipv4.dns "192.168.1.1"
sudo nmcli connection up "<your-ethernet-connection-name>"
```

## Step 3: Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Enable Docker on boot
sudo systemctl enable docker

# Log out and back in, then verify
docker run hello-world
```

## Step 4: Install Portainer

```bash
docker volume create portainer_data

docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

Access: `https://192.168.1.100:9443`

## Step 5: Deploy Home Lab Services

In Portainer: **Stacks → Add Stack → homelab**
Set `PIHOLE_PASSWORD` in the stack environment variables before deploying.

```yaml
services:
  pihole:
    image: pihole/pihole:latest
    restart: unless-stopped
    ports:
      - "53:53/tcp"
      - "53:53/udp"
      - "8053:80/tcp"
    environment:
      FTLCONF_webserver_api_password: ${PIHOLE_PASSWORD}
      FTLCONF_dns_listeningMode: 'ALL'
      TZ: America/New_York
    volumes:
      - pihole_data:/etc/pihole
    cap_add:
      - NET_ADMIN

  homeassistant:
    image: ghcr.io/home-assistant/home-assistant:stable
    restart: unless-stopped
    network_mode: host    # Required for discovery protocols
    privileged: true
    environment:
      TZ: America/New_York
    volumes:
      - ha_config:/config
      - /etc/localtime:/etc/localtime:ro
      - /run/dbus:/run/dbus:ro

volumes:
  pihole_data:
    name: pihole_data
  ha_config:
    name: ha_config
```

## Step 6: Set Up Automatic Backups

Deploy this as a separate `backup` stack:

```yaml
services:
  backup:
    image: offen/docker-volume-backup:latest
    restart: unless-stopped
    environment:
      BACKUP_CRON_EXPRESSION: "0 3 * * *"
      BACKUP_FILENAME: "homelab-backup-%Y%m%d.tar.gz"
      BACKUP_RETENTION_DAYS: "7"
    volumes:
      - portainer_data:/backup/portainer_data:ro
      - pihole_data:/backup/pihole_data:ro
      - ha_config:/backup/ha_config:ro
      - /mnt/usb/backups:/archive
      - /var/run/docker.sock:/var/run/docker.sock:ro

volumes:
  portainer_data:
    external: true
  pihole_data:
    external: true
  ha_config:
    external: true
```

## Useful Home Lab Services

| Service | Image | Purpose |
|---------|-------|---------|
| Nginx Proxy Manager | jc21/nginx-proxy-manager | Reverse proxy with SSL |
| Vaultwarden | vaultwarden/server | Password manager |
| Nextcloud | nextcloud:latest | File storage |
| Jellyfin | jellyfin/jellyfin | Media server |
| Uptime Kuma | louislam/uptime-kuma | Service monitoring |
| Portainer | portainer/portainer-ce | Container management |

## Conclusion

A Raspberry Pi running Portainer is one of the most accessible home lab setups available. Portainer's web interface means you can manage all your self-hosted services from any device on your network, making it easy to add, update, and troubleshoot services without repeated SSH sessions.
