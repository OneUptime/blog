# How to Deploy WireGuard VPN via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, WireGuard, VPN, Privacy, Self-Hosted, Network

Description: Deploy WireGuard VPN via Portainer using the linuxserver.io image for easy peer management and secure remote access to your home network or private services.

## Introduction

WireGuard is a modern, fast, and secure VPN protocol that's significantly simpler than OpenVPN. Deploying via Portainer with the linuxserver.io image provides automatic peer configuration generation and easy management. Use it for secure remote access to your home lab, private server access, or a personal VPN.

## Prerequisites

- A public IP address or dynamic DNS hostname
- UDP port 51820 forwarded to your server
- A Linux host with WireGuard kernel support enabled (WireGuard is built into Linux 5.6+)

## Deploy as a Stack

```yaml
services:
  wireguard:
    image: lscr.io/linuxserver/wireguard:latest
    container_name: wireguard
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=America/New_York
      # Your public IP or domain
      - SERVERURL=vpn.example.com
      # Port WireGuard listens on
      - SERVERPORT=51820
      # Number of client configs to generate
      - PEERS=5
      # DNS for VPN clients
      - PEERDNS=1.1.1.1,8.8.8.8
      # Internal VPN subnet
      - INTERNAL_SUBNET=10.13.13.0
      # Allowed IPs (what traffic goes through VPN)
      # Use 0.0.0.0/0 for an IPv4 full tunnel
      # Add ::/0 as well for a dual-stack full tunnel
      # Use specific subnets for split tunnel
      - ALLOWEDIPS=0.0.0.0/0
    volumes:
      - wireguard_config:/config
      - /lib/modules:/lib/modules:ro
    ports:
      - "51820:51820/udp"
    sysctls:
      - net.ipv4.conf.all.src_valid_mark=1
    restart: unless-stopped

volumes:
  wireguard_config:
```

## Accessing Peer Configurations

After deployment, peer configurations are stored in the volume. View them:

```bash
# List all peer configuration directories

docker exec wireguard sh -c 'ls -d /config/peer*'

# Show generated files for peer 1
docker exec wireguard ls /config/peer1
# Or view QR code in terminal:
docker exec -it wireguard /app/show-peer 1
```

Portainer Console: Navigate to the container > **Console** > run `/app/show-peer 1`

## Connecting Clients

### Desktop Client (Linux/Mac/Windows)

1. Install WireGuard from wireguard.com
2. Copy the `.conf` file from the container:
   ```bash
   docker cp wireguard:/config/peer1/peer1.conf ~/wireguard-client.conf
   ```
3. Import the config file into WireGuard client

### Mobile Client (iOS/Android)

1. Install WireGuard from App Store or Play Store
2. Scan the QR code displayed by `/app/show-peer 1`

## Custom Peer Configuration

The generated peer configs look like this:

```ini
[Interface]
Address = 10.13.13.2/32
PrivateKey = <generated-private-key>
DNS = 1.1.1.1, 8.8.8.8

[Peer]
PublicKey = <server-public-key>
PresharedKey = <preshared-key>
Endpoint = vpn.example.com:51820
AllowedIPs = 0.0.0.0/0  # All IPv4 traffic through VPN
```

## Adding More Peers

To add peers after initial deployment, update the `PEERS` environment variable:

1. In Portainer, navigate to your stack
2. Click **Editor**
3. Update `PEERS=10` (for 10 peers)
4. Click **Update the stack**

The new peer configs will be generated while existing ones are preserved.

## Split Tunnel Configuration

For accessing only specific networks via VPN (home network access):

```yaml
environment:
  # Route only the WireGuard server IP and local subnets through VPN
  - ALLOWEDIPS=10.13.13.1/32,192.168.1.0/24,10.0.0.0/8
```

## Security Considerations

```bash
# Verify WireGuard is running
docker exec wireguard wg show

# Check active peers
docker exec wireguard wg show all
```

## Conclusion

WireGuard deployed via Portainer provides a fast, modern VPN solution with minimal configuration overhead. The linuxserver.io image handles peer configuration generation automatically, making it easy to onboard new users. The persistent volume preserves all peer configurations across container updates, so your VPN clients don't need reconfiguration after updates.
