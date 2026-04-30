# How to Set Up IPv6 for Containers in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, IPv6, Networking, Container Configuration

Description: Enable IPv6 networking for Docker containers, configure dual-stack networks, and test IPv6 connectivity in containers managed through Portainer.

## Introduction

IPv6 is not enabled on Docker's default bridge network by default. With IPv6 adoption increasing and ISPs providing native IPv6 connectivity, containers may need IPv6 for direct internet access, compliance requirements, or internal IPv6 infrastructure. Docker's native IPv6 container networking is supported on Linux hosts. This guide covers enabling IPv6 in Docker, creating dual-stack networks, and deploying containers with IPv6 addresses via Portainer.

## Step 1: Optional - Enable IPv6 on Docker's Default Bridge

```json
{
  "ipv6": true,
  "fixed-cidr-v6": "fd00:1::/64",
  "ip6tables": true
}
```

```bash
# If you also want IPv6 on Docker's default bridge network, apply the daemon changes

sudo systemctl restart docker

# Verify IPv6 is enabled
docker network inspect bridge | grep -A 5 "EnableIPv6"
# Should show: "EnableIPv6": true
```

## Step 2: Create a Dual-Stack Network

```bash
# Create network with both IPv4 and IPv6 subnets
docker network create \
  --driver bridge \
  --ipv6 \
  --subnet=172.30.0.0/24 \
  --subnet=fd00:2::/64 \
  dual_stack_net

# Verify both address families are configured
docker network inspect dual_stack_net
```

## Step 3: Deploy Containers with IPv6 via Portainer

If you use this stack file, Portainer will create the same `dual_stack_net` network for you, so you can skip Step 2.

```yaml
# docker-compose.yml - Dual-stack deployment
networks:
  dual_stack:
    name: dual_stack_net
    driver: bridge
    enable_ipv6: true
    ipam:
      driver: default
      config:
        # IPv4 range
        - subnet: 172.30.0.0/24
          gateway: 172.30.0.1
        # IPv6 range (ULA prefix - private)
        - subnet: fd00:2::/64
          gateway: fd00:2::1

services:
  nginx:
    image: nginx:alpine
    container_name: nginx_v6
    restart: unless-stopped
    networks:
      dual_stack:
        ipv4_address: 172.30.0.10
        ipv6_address: fd00:2::10   # Static IPv6 address
    ports:
      - "80:80"
      - "443:443"

  api:
    image: myapp/api:latest
    container_name: api_v6
    restart: unless-stopped
    networks:
      dual_stack:
        ipv4_address: 172.30.0.20
        ipv6_address: fd00:2::20   # Static IPv6 address
    environment:
      # Docker DNS resolves the service name on the dual-stack network
      - DB_HOST=database

  database:
    image: postgres:15-alpine
    container_name: db_v6
    restart: unless-stopped
    networks:
      dual_stack:
        ipv4_address: 172.30.0.30
        ipv6_address: fd00:2::30   # Database accessible via IPv6
    environment:
      - POSTGRES_DB=appdb
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD=secure_pass
```

## Step 4: Test IPv6 Connectivity

```bash
# Check a container's IPv6 address from the host
docker inspect --format='{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}/{{.GlobalIPv6PrefixLen}}{{end}}' nginx_v6
# Should show: fd00:2::10/64

# Test IPv6 between containers and verify DNS resolution
docker run --rm --network dual_stack_net alpine sh -c \
  "apk add --no-cache iputils bind-tools >/dev/null && \
   ping -6 -c 3 database && \
   nslookup -query=AAAA database && \
   nslookup -query=A database"

# Test IPv6 internet connectivity (requires host to have IPv6)
docker run --rm --network dual_stack_net alpine sh -c \
  "apk add --no-cache iputils >/dev/null && ping -6 -c 3 ipv6.google.com"
```

## Step 5: Expose Containers via IPv6

```yaml
# When no host IP is specified, Docker publishes the port on the host's IPv4 and IPv6 addresses
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
```

```bash
# Test from host
curl http://127.0.0.1:80
curl http://[::1]:80  # Loopback IPv6
```

## Step 6: IPv6 with NDP Proxy (Public IPv6)

For containers to use public IPv6 addresses from your ISP block, create the bridge network in routed IPv6 mode and make sure your upstream network routes that prefix to the Docker host:

```bash
# Example: your ISP routes 2001:db8:0:1::/64 to this Docker host

docker network create \
  --driver bridge \
  --ipv6 \
  --subnet=2001:db8:0:1::/64 \
  -o com.docker.network.bridge.gateway_mode_ipv6=routed \
  public_ipv6_net

# Start a container with a static IPv6 address on that network
docker run -d --name web_v6 \
  --network public_ipv6_net \
  --ip6 2001:db8:0:1::10 \
  -p '[::]::80' \
  nginx:alpine

# Ensure the application inside the container is listening on IPv6

# Remote hosts still need a route to 2001:db8:0:1::/64 via this Docker host.
# On a directly connected L2 network, one option is NDP proxy:
sysctl -w net.ipv6.conf.eth0.proxy_ndp=1

# Add a proxy entry for the container's IPv6 address
ip -6 neigh add proxy 2001:db8:0:1::10 dev eth0

# The container can then be reached directly at 2001:db8:0:1::10
```

## Conclusion

IPv6 in Docker can provide containers with globally routable addresses when you use a routed public prefix, eliminates NAT for internal services, and prepares your infrastructure for the IPv6-only future. Use ULA prefixes (fd00::/8) for private networks and public prefixes from your ISP for internet-facing services. Portainer's container inspection views show both IPv4 and IPv6 addresses, making it straightforward to verify dual-stack connectivity across your environment.
