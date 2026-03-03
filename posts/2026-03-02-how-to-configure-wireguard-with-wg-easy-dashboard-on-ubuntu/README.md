# How to Configure WireGuard with wg-easy Dashboard on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, WireGuard, VPN, Networking, Security

Description: Learn how to deploy WireGuard VPN with the wg-easy web dashboard on Ubuntu for simplified peer management without command-line configuration.

---

WireGuard is one of the fastest and simplest VPN protocols available, but managing peers entirely through config files and `wg` commands gets tedious quickly. wg-easy wraps WireGuard in a clean web interface where you can create peers, download client configs, and monitor connected clients - all from a browser.

This guide deploys wg-easy on Ubuntu using Docker, then covers hardening and common troubleshooting steps.

## How wg-easy Works

wg-easy runs as a Docker container that:
- Manages `/etc/wireguard/wg0.conf` internally
- Provides a web UI on port 51821
- Exposes WireGuard on UDP port 51820
- Handles peer creation, deletion, and QR code generation

Because it manages the WireGuard config directly, you should not edit `wg0.conf` by hand while wg-easy is running.

## Prerequisites

- Ubuntu 20.04 or 22.04 with a public IP
- Docker Engine and Docker Compose v2
- Root or sudo access
- Kernel version 5.6+ (WireGuard is built into the kernel since 5.6; Ubuntu 20.04 LTS has it via a backport)

Check kernel version:

```bash
uname -r
# Should be 5.4+ on Ubuntu 20.04, or 5.15+ on 22.04
```

For Ubuntu 20.04, install the WireGuard kernel module if needed:

```bash
sudo apt update
sudo apt install wireguard -y
```

## Installing Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

## Deploying wg-easy

Create a directory for the configuration:

```bash
mkdir -p ~/wg-easy && cd ~/wg-easy
```

Create `docker-compose.yaml`:

```yaml
version: '3.8'

services:
  wg-easy:
    image: ghcr.io/wg-easy/wg-easy
    container_name: wg-easy
    environment:
      # Your server's public IP or hostname
      - WG_HOST=203.0.113.42

      # Password for the web UI (use a strong password)
      - PASSWORD=your_secure_password_here

      # WireGuard port (UDP)
      - WG_PORT=51820

      # Web UI port
      - PORT=51821

      # DNS servers pushed to clients
      - WG_DEFAULT_DNS=1.1.1.1,8.8.8.8

      # Default client keepalive interval
      - WG_PERSISTENT_KEEPALIVE=25

      # IP range for VPN clients
      - WG_DEFAULT_ADDRESS=10.8.0.x

    volumes:
      # Persist WireGuard config and peer data
      - ./wireguard-data:/etc/wireguard

    ports:
      - "51820:51820/udp"
      - "51821:51821/tcp"

    cap_add:
      # WireGuard requires network admin capabilities
      - NET_ADMIN
      - SYS_MODULE

    sysctls:
      # Enable IP forwarding for VPN routing
      - net.ipv4.conf.all.src_valid_mark=1
      - net.ipv4.ip_forward=1

    restart: unless-stopped
```

Start it:

```bash
docker compose up -d
docker logs wg-easy -f
```

Access the dashboard at `http://your-server-ip:51821`.

## Configuring Firewall Rules

```bash
# Allow WireGuard UDP port
sudo ufw allow 51820/udp

# Allow web UI (restrict this to your IP in production)
sudo ufw allow 51821/tcp

# Enable IP forwarding persistently
echo 'net.ipv4.ip_forward=1' | sudo tee -a /etc/sysctl.d/99-wireguard.conf
sudo sysctl -p /etc/sysctl.d/99-wireguard.conf
```

## Creating Client Peers

Open the web UI at `http://your-server-ip:51821`. Log in with the password you set.

Click "+ New Client" and give it a name (e.g., "alice-laptop"). The UI will:
1. Generate a private/public key pair for the client
2. Assign an IP from your VPN subnet
3. Display a QR code for mobile clients
4. Provide a `.conf` download link for desktop clients

On the client machine, install WireGuard and import the config:

```bash
# On a Linux client
sudo apt install wireguard -y

# Import the downloaded config
sudo cp alice-laptop.conf /etc/wireguard/wg0.conf

# Start the tunnel
sudo wg-quick up wg0

# Enable at boot
sudo systemctl enable wg-quick@wg0
```

## Restricting Web UI Access

Exposing the dashboard on a public port is a security risk. A few options:

**Option 1 - Restrict to specific IP:**
```bash
# Only allow access to the UI from your office IP
sudo ufw delete allow 51821/tcp
sudo ufw allow from 203.0.113.100 to any port 51821
```

**Option 2 - Reverse proxy with basic auth:**
Put Nginx in front of the UI and add HTTP basic auth or restrict to the VPN subnet:

```nginx
# /etc/nginx/sites-available/wg-easy
server {
    listen 443 ssl;
    server_name vpn-admin.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/vpn-admin.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/vpn-admin.yourdomain.com/privkey.pem;

    # Only allow from VPN subnet
    allow 10.8.0.0/24;
    deny all;

    location / {
        proxy_pass http://localhost:51821;
        proxy_set_header Host $host;
    }
}
```

## Using a Domain Name Instead of IP

If your server's IP changes, using a domain (dynamic DNS or static) is better. Update the `WG_HOST` environment variable:

```yaml
environment:
  - WG_HOST=vpn.yourdomain.com
```

Then restart:

```bash
docker compose down && docker compose up -d
```

Note: existing peer configs will have the old IP/hostname embedded. You will need to regenerate them or manually edit each peer's `Endpoint` field.

## Setting Up Split Tunneling

By default, wg-easy routes all client traffic through the VPN. For split tunneling (only route specific subnets through VPN):

In the wg-easy UI, edit a peer's "Allowed IPs" to only include the private subnets you want to route through VPN:

```text
10.8.0.0/24, 192.168.1.0/24
```

Instead of the default `0.0.0.0/0`.

## Monitoring Connected Peers

The wg-easy dashboard shows which peers are connected, their last handshake time, and data transferred. For more detail:

```bash
# Shell into the container
docker exec -it wg-easy bash

# Show WireGuard status
wg show

# Show detailed peer info
wg show wg0 peers
wg show wg0 latest-handshakes
wg show wg0 transfer
```

## Backing Up Peer Data

The `./wireguard-data` directory contains all peer keys and the WireGuard config:

```bash
# Backup
tar czf wg-easy-backup-$(date +%Y%m%d).tar.gz ./wireguard-data

# Restore on a new server (stop wg-easy first)
docker compose down
tar xzf wg-easy-backup-20260302.tar.gz
docker compose up -d
```

## Upgrading wg-easy

```bash
# Pull the latest image
docker compose pull

# Recreate the container with the new image
docker compose up -d
```

Peer configs are stored in the volume, so they persist across upgrades.

## Troubleshooting

**Clients cannot reach the internet through the VPN:**
```bash
# Verify IP forwarding is enabled inside the container
docker exec wg-easy sysctl net.ipv4.ip_forward

# Check iptables NAT rules are set up
docker exec wg-easy iptables -t nat -L POSTROUTING -n -v
```

**Handshake completes but no traffic flows:**
```bash
# Check routing on the server
docker exec wg-easy ip route

# Verify the client's DNS is reachable
# From the client, test DNS resolution
nslookup google.com 1.1.1.1
```

**Container starts but wg0 interface is missing:**
```bash
# Verify WireGuard kernel module is loaded
lsmod | grep wireguard

# Load it if missing
sudo modprobe wireguard
```

wg-easy removes the operational complexity of WireGuard peer management while keeping all the performance benefits of the protocol itself. The web dashboard is particularly useful for non-technical team members who need to manage their own VPN access.
