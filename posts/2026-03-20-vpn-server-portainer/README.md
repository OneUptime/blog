# How to Self-Host a VPN Server with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Self-Hosted, VPN, WireGuard, Security, Networking

Description: Deploy a self-hosted WireGuard VPN server using Portainer to secure remote access to your home network and services.

## Introduction

A self-hosted VPN lets you securely access your home network and self-hosted services from anywhere. WireGuard is the modern, high-performance VPN protocol of choice - it's faster, simpler, and more secure than OpenVPN or IPSec. This guide covers deploying WireGuard with a management UI using Portainer.

## Prerequisites

- Portainer installed and running
- A public IP address or dynamic DNS
- UDP port 51820 forwarded through your router
- Linux host with kernel 5.6+ (for WireGuard support)

## Step 1: Enable WireGuard Kernel Module

```bash
# Check if WireGuard is available

modprobe wireguard && echo "WireGuard available"

# Install WireGuard tools (Ubuntu/Debian)
sudo apt install -y wireguard

# Enable IP forwarding (required for VPN)
echo "net.ipv4.ip_forward=1" | sudo tee -a /etc/sysctl.conf
echo "net.ipv6.conf.all.forwarding=1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Step 2: Deploy WireGuard with wg-easy (Web UI)

wg-easy provides a beautiful web interface for managing WireGuard clients.

```yaml
# docker-compose.yml - WireGuard with wg-easy
version: "3.8"

networks:
  vpn_network:
    driver: bridge

volumes:
  wireguard_data:

services:
  wg-easy:
    image: ghcr.io/wg-easy/wg-easy:14
    container_name: wg-easy
    restart: unless-stopped
    cap_add:
      # Required for WireGuard
      - NET_ADMIN
      - SYS_MODULE
    sysctls:
      # Required for routing
      - net.ipv4.ip_forward=1
      - net.ipv4.conf.all.src_valid_mark=1
    ports:
      - "51820:51820/udp"   # WireGuard port
      - "51821:51821/tcp"   # Web UI port
    environment:
      # Your server's public IP or domain
      - WG_HOST=vpn.yourdomain.com

      # Admin password for web UI
      - PASSWORD_HASH=$$2a$$12$$yourbcrypthashedpasswordhere

      # VPN subnet for clients
      - WG_DEFAULT_ADDRESS=10.8.0.x

      # DNS servers for VPN clients
      - WG_DEFAULT_DNS=1.1.1.1,1.0.0.1

      # WireGuard port
      - WG_PORT=51820

      # Web UI port
      - PORT=51821

      # Pre/Post up hooks for routing
      - WG_PRE_UP=iptables -t nat -A POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE
      - WG_POST_DOWN=iptables -t nat -D POSTROUTING -s 10.8.0.0/24 -o eth0 -j MASQUERADE
    volumes:
      - wireguard_data:/etc/wireguard
    networks:
      - vpn_network
```

### Generate Password Hash

```bash
# Generate bcrypt hash for the admin password
docker run --rm -it ghcr.io/wg-easy/wg-easy:14 wgpw 'your_secure_password'
# Copy the output and use in PASSWORD_HASH (remember to double each $ in docker-compose)
```

## Step 3: Deploy WireGuard (Manual Configuration)

For more control, deploy plain WireGuard without the UI:

```yaml
# docker-compose.yml - Plain WireGuard
version: "3.8"

services:
  wireguard:
    image: lscr.io/linuxserver/wireguard:latest
    container_name: wireguard
    restart: unless-stopped
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
      # Your server's public IP or hostname
      - SERVERURL=vpn.yourdomain.com
      - SERVERPORT=51820
      # Comma-separated list of peer names
      - PEERS=laptop,phone,tablet,desktop
      # Subnet for peers
      - PEERDNS=auto
      - INTERNAL_SUBNET=10.13.13.0
      # Keep alive for clients behind NAT
      - PERSISTENTKEEPALIVE_PEERS=all
    volumes:
      - /opt/wireguard/config:/config
      - /lib/modules:/lib/modules
    ports:
      - "51820:51820/udp"
    sysctls:
      - net.ipv4.conf.all.src_valid_mark=1
```

## Step 4: Configure Client Devices

### Linux/macOS Client

```bash
# Install WireGuard
sudo apt install wireguard  # Ubuntu
brew install wireguard-tools  # macOS

# Copy client config from server
cat /opt/wireguard/config/peer_laptop/peer_laptop.conf
```

```ini
# /etc/wireguard/wg0.conf - Client configuration
[Interface]
PrivateKey = <client_private_key>
Address = 10.13.13.2/32
DNS = 10.13.13.1

[Peer]
PublicKey = <server_public_key>
PresharedKey = <preshared_key>
AllowedIPs = 0.0.0.0/0, ::/0  # Route all traffic through VPN
# OR for split tunnel (only access home network):
# AllowedIPs = 10.13.13.0/24, 192.168.1.0/24
Endpoint = vpn.yourdomain.com:51820
PersistentKeepalive = 25
```

```bash
# Start WireGuard on Linux
sudo wg-quick up wg0

# Enable on startup
sudo systemctl enable wg-quick@wg0
```

### Windows/iOS/Android
1. Install the WireGuard app
2. Import the `.conf` file or scan the QR code
3. Toggle the connection on

## Step 5: Access QR Codes

```bash
# Display the QR code as ASCII in your terminal (recommended)
docker exec -it wireguard /app/show-peer phone

# Or open the generated PNG in an image viewer
xdg-open /opt/wireguard/config/peer_phone/peer_phone.png

# Or render a QR code from the config using a local qrencode install
docker exec wireguard cat /config/peer_phone/peer_phone.conf | qrencode -t ansiutf8
```

## Step 6: Set Up Split Tunneling

Route only specific traffic through the VPN:

```ini
# Client config - only route home network through VPN
[Peer]
AllowedIPs = 192.168.1.0/24, 10.13.13.0/24
# This means only local network traffic goes through VPN
# Regular internet traffic uses local connection
```

## Monitoring VPN Connections

```bash
# View connected peers and their data usage
docker exec wireguard wg show

# View real-time statistics
docker exec wireguard watch -n 1 wg show

# Check firewall rules
docker exec wireguard iptables -t nat -L POSTROUTING -v
```

## Firewall Configuration

```bash
# On your host machine or router, open WireGuard port
sudo ufw allow 51820/udp
sudo ufw allow 51821/tcp  # wg-easy web UI (only expose locally!)

# Router port forwarding
# Forward UDP 51820 from WAN to your Docker host IP
```

## Conclusion

You now have a secure WireGuard VPN server running through Portainer that you can use to access your home network from anywhere. WireGuard's modern cryptography provides excellent security, while its simplicity ensures reliable connections. The wg-easy web interface makes adding new clients straightforward without needing to SSH into your server. Use Portainer to monitor logs, update the image, and restart the service if needed.
