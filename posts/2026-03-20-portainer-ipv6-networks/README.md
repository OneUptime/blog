# How to Set Up IPv6 Networks in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Networking, IPv6, DevOps

Description: Learn how to enable and configure IPv6 networking for Docker containers in Portainer, including dual-stack setups.

## Introduction

IPv6 support in Docker enables containers to communicate using IPv6 addresses, participate in IPv6-only networks, and operate in dual-stack environments where both IPv4 and IPv6 are available. This is increasingly important as IPv4 address space is exhausted and many networks and services prefer or require IPv6. Docker requires explicit IPv6 enablement - it is off by default.

## Prerequisites

- Portainer installed with a connected Docker environment
- Docker daemon on a Linux host
- Basic understanding of IPv6 addressing (ULA prefixes: `fd00::/8`)

## Step 1: Enable IPv6 for Docker's Default Bridge

If you want IPv6 on Docker's default `bridge` network, edit the Docker daemon configuration:

```bash
# Edit /etc/docker/daemon.json:

sudo tee /etc/docker/daemon.json << 'EOF'
{
  "ipv6": true,
  "fixed-cidr-v6": "fd00::/64"
}
EOF

# Restart Docker:
sudo systemctl restart docker

# Verify IPv6 is enabled on docker0:
ip -6 addr show docker0
# inet6 fd00::1/64 scope global
```

## Step 2: Create an IPv6-Enabled Network

```bash
# Create a dual-stack network (IPv4 + IPv6):
docker network create \
  --driver bridge \
  --ipv6 \
  --subnet 172.30.0.0/24 \
  --gateway 172.30.0.1 \
  --subnet fd00:cafe::/64 \
  --gateway fd00:cafe::1 \
  dual-stack-network

# Create an IPv6-only network:
docker network create \
  --driver bridge \
  --ipv6 \
  --ipv4=false \
  --subnet fd00:db8::/64 \
  --gateway fd00:db8::1 \
  ipv6-only-network

# Verify:
docker network inspect dual-stack-network | jq '.[].IPAM'
```

Via Portainer:
1. Navigate to **Networks** → **Add network**.
2. Set Driver to `bridge`.
3. Add IPv4 subnet configuration.
4. Add IPv6 network configuration.
5. Set the IPv6 subnet to `fd00:cafe::/64` and the gateway to `fd00:cafe::1`.
6. Click **Create the network**.

## Step 3: Run Containers on IPv6 Networks

```bash
# Container on dual-stack network:
docker run -d \
  --name web \
  --network dual-stack-network \
  nginx:alpine

# Check both IPv4 and IPv6 addresses:
docker inspect web --format '
  IPv4: {{(index .NetworkSettings.Networks "dual-stack-network").IPAddress}}
  IPv6: {{(index .NetworkSettings.Networks "dual-stack-network").GlobalIPv6Address}}'
# IPv4: 172.30.0.2
# IPv6: fd00:cafe::2

# Test IPv6 connectivity from another container:
docker run --rm --network dual-stack-network alpine ping -6 -c 3 web
```

## Step 4: IPv6 in Docker Compose

```yaml
# docker-compose.yml with dual-stack networking
services:
  web:
    image: nginx:alpine
    restart: unless-stopped
    ports:
      - "80:80"         # Publishes on IPv4 and IPv6 by default
    networks:
      dual-stack:
        ipv6_address: fd00:cafe::10   # Fixed IPv6 address

  api:
    image: myorg/api:latest
    restart: unless-stopped
    networks:
      dual-stack:
        ipv6_address: fd00:cafe::11

networks:
  dual-stack:
    driver: bridge
    enable_ipv6: true
    ipam:
      config:
        - subnet: 172.30.0.0/24     # IPv4 range
          gateway: 172.30.0.1
        - subnet: fd00:cafe::/64    # IPv6 range
          gateway: fd00:cafe::1
```

## Step 5: Expose IPv6 Services to the Host

To make a container reachable from outside the host over IPv6, publish a port on the Docker host:

```bash
# Publish on the host; Docker binds to IPv4 and IPv6 by default:
docker run -d \
  --name web-published \
  -p 8080:80 \
  --network dual-stack-network \
  nginx:alpine

# Or bind only on the host's IPv6 interfaces:
docker run -d \
  --name web-v6-only \
  -p "[::]:8081:80" \
  --network dual-stack-network \
  nginx:alpine

# Replace 2001:db8::10 with the Docker host's IPv6 address:
curl -6 http://[2001:db8::10]:8080/
curl -6 http://[2001:db8::10]:8081/
```

## Step 6: Configure Nginx for IPv6

Nginx needs explicit IPv6 listen directives:

```nginx
# nginx.conf - listen on both IPv4 and IPv6
server {
    listen 80;          # IPv4
    listen [::]:80;     # IPv6

    server_name example.com;

    location / {
        proxy_pass http://api:8080;
    }
}
```

## Step 7: Verify IPv6 Routing

```bash
# Check IPv6 routes on the host:
ip -6 route show

# Test IPv6 connectivity from inside a container:
docker exec web ping -6 -c 3 google.com

# Test IPv6 DNS resolution:
docker exec web nslookup -type=AAAA google.com

# Check the IPv6 address assigned to the container:
docker inspect web --format '{{(index .NetworkSettings.Networks "dual-stack-network").GlobalIPv6Address}}'
# fd00:cafe::2
```

## Troubleshooting IPv6

```bash
# Error: "IPv6 is disabled"
# → Ensure daemon.json has "ipv6": true and Docker was restarted

# Containers can't reach IPv6 internet:
# → Enable IPv6 forwarding:
sudo sysctl -w net.ipv6.conf.all.forwarding=1
# Persistent:
echo "net.ipv6.conf.all.forwarding = 1" | sudo tee -a /etc/sysctl.conf

# IPv6 address not assigned to container:
# → Verify network was created with --ipv6 flag
# → Check subnet doesn't conflict with another network
docker network inspect dual-stack-network | jq '.[].IPAM.Config'
```

## Conclusion

IPv6 networking in Docker user-defined networks requires creating networks with IPv6 enabled and explicit IPv6 subnet definitions. If you also want IPv6 on Docker's default `bridge` network, configure it in the daemon settings. Dual-stack networks support both IPv4 and IPv6 simultaneously, allowing containers to communicate over either protocol. Portainer's network creation form supports IPv6 subnet configuration directly. For services that need external IPv6 reachability, publish ports on the Docker host. By default, Docker publishes to both IPv4 and IPv6, or you can use an explicit IPv6 host binding such as `[::]:port:port` when you want to bind only on IPv6.
