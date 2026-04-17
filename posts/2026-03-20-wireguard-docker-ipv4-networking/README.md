# How to Use WireGuard with Docker Containers for IPv4 Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: WireGuard, Docker, IPv4, Networking, Container, VPN

Description: Route Docker container IPv4 traffic through a WireGuard VPN tunnel using network namespaces or a sidecar container approach.

Running WireGuard with Docker allows you to route container traffic through a VPN, useful for privacy-sensitive workloads or accessing private networks from containers.

## Option 1: WireGuard in a Privileged Docker Container (Sidecar)

The most popular approach is the `linuxserver/wireguard` image acting as a network gateway:

```yaml
# docker-compose.yml

version: "3.8"

services:
  wireguard:
    image: lscr.io/linuxserver/wireguard:latest
    container_name: wireguard
    # Required capabilities to manage network interfaces
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=UTC
      # Server mode settings (for running as server)
      - SERVERURL=vpn.example.com
      - SERVERPORT=51820
      - PEERS=3
      - PEERDNS=auto
      - INTERNAL_SUBNET=10.13.13.0
    volumes:
      - ./wireguard-config:/config
      - /lib/modules:/lib/modules:ro
    ports:
      - 51820:51820/udp
    sysctls:
      - net.ipv4.conf.all.src_valid_mark=1
      - net.ipv4.ip_forward=1
    restart: unless-stopped

  # This container routes its traffic through the wireguard container
  app:
    image: alpine:latest
    # Share the wireguard container's network namespace
    network_mode: "service:wireguard"
    # The app container has no direct network access - all traffic goes through WireGuard
    command: ["sleep", "infinity"]
    depends_on:
      - wireguard
```

## Option 2: Client Mode - Route Container Traffic Through VPN

For a container that connects to an external WireGuard server:

```yaml
# docker-compose.yml (client mode)

version: "3.8"

services:
  wireguard-client:
    image: lscr.io/linuxserver/wireguard:latest
    container_name: wg-client
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    volumes:
      # Mount your WireGuard client config
      - ./wg0.conf:/config/wg_confs/wg0.conf:ro
    sysctls:
      - net.ipv4.conf.all.src_valid_mark=1
    restart: unless-stopped

  # App shares the VPN container's network
  private-app:
    image: curlimages/curl:latest
    network_mode: "service:wireguard-client"
    command: ["sh", "-c", "while true; do curl https://ifconfig.me; sleep 30; done"]
```

## Option 3: Host Network with WireGuard and Docker

Run WireGuard on the host and give containers access to VPN routes:

```bash
# Bring up WireGuard on host

sudo wg-quick up wg0

# Create a Docker network that uses the VPN subnet
docker network create --subnet=10.0.0.0/24 vpn-net

# Run a container connected to both the VPN network and needing VPN routing
docker run --rm --network=host --cap-add=NET_ADMIN alpine \
  sh -c "ip route add 192.168.10.0/24 dev wg0 && ping 192.168.10.1"
```

## Verifying Container VPN Routing

```bash
# Exec into the app container and check the IP
docker exec -it wg-client /bin/sh

# Inside container: check public IP (should be VPN server's IP)
wget -qO- https://ifconfig.me

# Check routes inside container
ip route show
```

The `network_mode: "service:wireguard"` pattern is the cleanest approach - any container using it automatically has all its traffic routed through the WireGuard tunnel without needing elevated privileges itself.
