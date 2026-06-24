# How to Deploy WireGuard VPN via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, WireGuard, VPN, Docker, Networking, Self-Hosting, Security

Description: Learn how to deploy a WireGuard VPN server via Portainer using the linuxserver image, which auto-generates peer configurations and QR codes for easy client setup.

---

WireGuard is a modern, high-performance VPN protocol built into the Linux kernel. The `lscr.io/linuxserver/wireguard` image wraps it with automatic peer configuration generation, making it straightforward to deploy without manual key management.

## Prerequisites

- Portainer running on a Linux host (WireGuard requires Linux kernel modules)
- Port `51820/udp` accessible from the internet
- Public IP or DDNS hostname

## Compose Stack

The container needs elevated privileges to manage network interfaces. Set `NET_ADMIN` capability and use `sysctls` to enable IP forwarding:

```yaml
services:
  wireguard:
    image: lscr.io/linuxserver/wireguard:latest
    container_name: wireguard
    restart: unless-stopped
    cap_add:
      - NET_ADMIN          # Required to manage network interfaces
      - SYS_MODULE         # Required to load kernel modules
    sysctls:
      net.ipv4.conf.all.src_valid_mark: "1"
      net.ipv4.ip_forward: "1"            # Enable IP forwarding for VPN routing
    ports:
      - "51820:51820/udp"  # WireGuard listens on UDP
    environment:
      PUID: 1000
      PGID: 1000
      TZ: UTC
      SERVERURL: vpn.example.com          # Your public IP or DDNS hostname
      SERVERPORT: 51820
      PEERS: 5                            # Number of peer configs to generate
      PEERDNS: auto
      INTERNAL_SUBNET: 10.13.13.0
      LOG_CONFS: "true"                   # Write generated peer QR codes to logs
    volumes:
      - wireguard_config:/config
      - /lib/modules:/lib/modules:ro      # Host kernel modules

volumes:
  wireguard_config:
```

## Deploying

1. In Portainer go to **Stacks > Add Stack**.
2. Name it `wireguard`.
3. Set `SERVERURL` to your public hostname or IP.
4. Adjust `PEERS` to the number of client devices you need.
5. Click **Deploy the stack**.

## Retrieving Peer Configs

After startup, the container generates configs for each peer. View the QR code for peer 1 in the container logs:

```bash
# In Portainer, go to Containers > wireguard > Logs

# Or exec into the container:
docker exec -it wireguard /app/show-peer 1
```

Scan the QR code with the WireGuard mobile app to connect instantly.

## Monitoring

Use OneUptime to create a port monitor on `<host>:51820/udp`. Additionally, use a custom probe inside the VPN or private network to monitor an internal endpoint accessible only via the tunnel and verify routing is working correctly. Alert if the VPN endpoint becomes unreachable.
