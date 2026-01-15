# How to Enable IPv6 in Docker Networks

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: IPv6, Docker, Containers, Networking, DevOps, Infrastructure

Description: A comprehensive guide to enabling and configuring IPv6 in Docker networks, covering daemon configuration, custom networks, Docker Compose, and production best practices.

---

IPv4 address exhaustion is no longer a future problem - it is today's reality. As organizations scale their containerized workloads, IPv6 support becomes critical for reaching modern services, complying with government mandates, and future-proofing infrastructure. Yet Docker ships with IPv6 disabled by default, leaving many teams scrambling when they first encounter IPv6-only endpoints or dual-stack requirements.

This guide walks through every step of enabling IPv6 in Docker, from daemon configuration to production-hardened Compose files. Whether you are running a local development environment or orchestrating thousands of containers, these patterns will help you deploy IPv6-capable workloads confidently.

## Why IPv6 Matters for Container Workloads

Before diving into configuration, let us understand why IPv6 support is increasingly non-negotiable:

1. **IPv4 exhaustion:** ARIN, RIPE, and other regional registries have depleted their free IPv4 pools. New allocations are expensive or unavailable.
2. **Cloud provider incentives:** AWS, GCP, and Azure now charge premiums for public IPv4 addresses while offering IPv6 at no additional cost.
3. **Government and enterprise mandates:** US federal agencies require IPv6 capability. Many enterprises follow similar policies.
4. **Performance benefits:** IPv6 eliminates NAT traversal overhead in many scenarios, reducing latency for east-west traffic.
5. **Modern service compatibility:** Some CDNs, APIs, and services are moving to IPv6-only or IPv6-preferred configurations.

## Prerequisites

Before enabling IPv6 in Docker, ensure your environment meets these requirements:

```bash
# Check if your host supports IPv6
cat /proc/sys/net/ipv6/conf/all/disable_ipv6
# Output: 0 means IPv6 is enabled, 1 means disabled

# Verify IPv6 kernel module is loaded
lsmod | grep ipv6

# Check your host's IPv6 addresses
ip -6 addr show

# Verify IPv6 connectivity (optional but recommended)
ping6 -c 4 ipv6.google.com
```

If IPv6 is disabled at the kernel level, enable it first:

```bash
# Temporarily enable IPv6
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=0
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=0

# Permanently enable IPv6 by adding to /etc/sysctl.conf
echo "net.ipv6.conf.all.disable_ipv6 = 0" | sudo tee -a /etc/sysctl.conf
echo "net.ipv6.conf.default.disable_ipv6 = 0" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Understanding Docker's IPv6 Architecture

Docker's networking model supports three primary approaches to IPv6:

| Approach | Description | Use Case |
|----------|-------------|----------|
| NAT66 | IPv6 addresses are translated through the host | Simple setups, private networks |
| Routed IPv6 | Containers get routable IPv6 addresses directly | Production deployments, public-facing services |
| Dual-stack | Containers have both IPv4 and IPv6 addresses | Gradual migration, maximum compatibility |

Docker creates a virtual bridge (typically `docker0`) for container networking. With IPv6 enabled, this bridge receives an IPv6 subnet, and containers attached to it obtain addresses from that range.

## Method 1: Enable IPv6 Globally via Docker Daemon

The most straightforward approach is enabling IPv6 at the daemon level. This affects all default bridge networks.

### Step 1: Configure the Docker Daemon

Create or edit the Docker daemon configuration file:

```bash
# Create the directory if it does not exist
sudo mkdir -p /etc/docker

# Edit the daemon configuration
sudo nano /etc/docker/daemon.json
```

Add the following configuration:

```json
{
  "ipv6": true,
  "fixed-cidr-v6": "2001:db8:1::/64"
}
```

**Important:** The `2001:db8::/32` prefix is reserved for documentation. In production, use your actual allocated IPv6 prefix. If you do not have one, use a Unique Local Address (ULA) range like `fd00::/8`.

### Step 2: Production-Ready Daemon Configuration

For production environments, consider this more comprehensive configuration:

```json
{
  "ipv6": true,
  "fixed-cidr-v6": "2001:db8:1::/64",
  "ip6tables": true,
  "experimental": false,
  "default-address-pools": [
    {
      "base": "172.17.0.0/16",
      "size": 24
    },
    {
      "base": "2001:db8::/104",
      "size": 112
    }
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

Configuration breakdown:

- `ipv6`: Enables IPv6 support in Docker
- `fixed-cidr-v6`: Assigns an IPv6 subnet to the default bridge network
- `ip6tables`: Enables ip6tables rules for container traffic (critical for security)
- `default-address-pools`: Defines address pools for user-defined networks

### Step 3: Restart Docker and Verify

```bash
# Validate the JSON configuration
cat /etc/docker/daemon.json | python3 -m json.tool

# Restart the Docker daemon
sudo systemctl restart docker

# Verify Docker is running
sudo systemctl status docker

# Check the default bridge network for IPv6
docker network inspect bridge | grep -A 10 "IPAM"
```

Expected output should show both IPv4 and IPv6 subnets:

```json
"IPAM": {
    "Driver": "default",
    "Options": null,
    "Config": [
        {
            "Subnet": "172.17.0.0/16",
            "Gateway": "172.17.0.1"
        },
        {
            "Subnet": "2001:db8:1::/64",
            "Gateway": "2001:db8:1::1"
        }
    ]
}
```

### Step 4: Test IPv6 Connectivity

Launch a test container and verify IPv6 works:

```bash
# Run an Alpine container with an interactive shell
docker run -it --rm alpine sh

# Inside the container, check IPv6 address
ip -6 addr show eth0

# Test IPv6 connectivity
ping6 -c 4 ipv6.google.com

# Test DNS resolution for IPv6
nslookup -type=AAAA google.com
```

## Method 2: Create Custom IPv6-Enabled Networks

For more control, create dedicated networks with IPv6 support. This approach is preferred for production workloads.

### Basic Custom Network

```bash
# Create a dual-stack network
docker network create \
  --ipv6 \
  --subnet=172.28.0.0/16 \
  --subnet=2001:db8:2::/64 \
  --gateway=172.28.0.1 \
  --gateway=2001:db8:2::1 \
  my-ipv6-network

# Verify the network configuration
docker network inspect my-ipv6-network
```

### Network with Custom Options

```bash
# Create a network with additional options
docker network create \
  --driver bridge \
  --ipv6 \
  --subnet=172.29.0.0/16 \
  --ip-range=172.29.5.0/24 \
  --gateway=172.29.0.1 \
  --subnet=2001:db8:3::/64 \
  --gateway=2001:db8:3::1 \
  --opt com.docker.network.bridge.name=br-ipv6-custom \
  --opt com.docker.network.bridge.enable_ip_masquerade=true \
  --opt com.docker.network.bridge.enable_icc=true \
  production-network
```

### Assign Specific IPv6 Addresses to Containers

```bash
# Run a container with a specific IPv6 address
docker run -d \
  --name web-server \
  --network my-ipv6-network \
  --ip6 2001:db8:2::100 \
  nginx:latest

# Verify the assigned address
docker inspect web-server | grep -A 5 "GlobalIPv6Address"
```

## Method 3: IPv6 in Docker Compose

Docker Compose provides declarative IPv6 configuration, making it ideal for reproducible deployments.

### Basic Compose with IPv6

```yaml
# docker-compose.yml
version: "3.9"

services:
  web:
    image: nginx:latest
    container_name: web-ipv6
    networks:
      ipv6net:
        ipv4_address: 172.30.0.10
        ipv6_address: 2001:db8:4::10
    ports:
      - "80:80"
      - "[::]:8080:80"  # Bind to IPv6 on host

  api:
    image: node:20-alpine
    container_name: api-ipv6
    networks:
      ipv6net:
        ipv4_address: 172.30.0.20
        ipv6_address: 2001:db8:4::20
    depends_on:
      - web

networks:
  ipv6net:
    driver: bridge
    enable_ipv6: true
    ipam:
      driver: default
      config:
        - subnet: 172.30.0.0/16
          gateway: 172.30.0.1
        - subnet: 2001:db8:4::/64
          gateway: 2001:db8:4::1
```

### Production Compose with IPv6 and Health Checks

```yaml
# docker-compose.prod.yml
version: "3.9"

services:
  load-balancer:
    image: nginx:latest
    container_name: lb
    restart: unless-stopped
    networks:
      frontend:
        ipv4_address: 172.31.0.2
        ipv6_address: 2001:db8:5::2
    ports:
      - "80:80"
      - "443:443"
      - "[::]:80:80"
      - "[::]:443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 256M

  app:
    build:
      context: ./app
      dockerfile: Dockerfile
    container_name: app
    restart: unless-stopped
    networks:
      frontend:
        ipv4_address: 172.31.0.10
        ipv6_address: 2001:db8:5::10
      backend:
        ipv4_address: 172.32.0.10
        ipv6_address: 2001:db8:6::10
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://db:5432/app
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  db:
    image: postgres:16
    container_name: db
    restart: unless-stopped
    networks:
      backend:
        ipv4_address: 172.32.0.20
        ipv6_address: 2001:db8:6::20
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=app
      - POSTGRES_USER=app
      - POSTGRES_PASSWORD_FILE=/run/secrets/db_password
    secrets:
      - db_password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app -d app"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: redis
    restart: unless-stopped
    networks:
      backend:
        ipv4_address: 172.32.0.30
        ipv6_address: 2001:db8:6::30
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

networks:
  frontend:
    driver: bridge
    enable_ipv6: true
    ipam:
      config:
        - subnet: 172.31.0.0/16
          gateway: 172.31.0.1
        - subnet: 2001:db8:5::/64
          gateway: 2001:db8:5::1

  backend:
    driver: bridge
    enable_ipv6: true
    internal: true  # No external access
    ipam:
      config:
        - subnet: 172.32.0.0/16
          gateway: 172.32.0.1
        - subnet: 2001:db8:6::/64
          gateway: 2001:db8:6::1

volumes:
  postgres_data:
  redis_data:

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### Compose with External IPv6 Network

Sometimes you need containers to join a pre-existing IPv6 network:

```yaml
# docker-compose.external.yml
version: "3.9"

services:
  service-a:
    image: myapp:latest
    networks:
      - existing-ipv6-net

networks:
  existing-ipv6-net:
    external: true
    name: my-ipv6-network
```

## Configuring IPv6 with Different Docker Network Drivers

### Bridge Network (Default)

The bridge driver is the most common choice for single-host deployments:

```bash
# Create a bridge network with IPv6
docker network create \
  --driver bridge \
  --ipv6 \
  --subnet 2001:db8:7::/64 \
  --gateway 2001:db8:7::1 \
  --subnet 172.33.0.0/16 \
  --gateway 172.33.0.1 \
  bridge-ipv6
```

### Macvlan Network

Macvlan gives containers direct Layer 2 access, useful for legacy applications or when containers need to appear as physical hosts:

```bash
# Create a macvlan network with IPv6
docker network create \
  --driver macvlan \
  --ipv6 \
  --subnet 192.168.1.0/24 \
  --gateway 192.168.1.1 \
  --subnet 2001:db8:8::/64 \
  --gateway 2001:db8:8::1 \
  --ip-range 192.168.1.128/25 \
  -o parent=eth0 \
  macvlan-ipv6

# Run container with macvlan
docker run -d \
  --network macvlan-ipv6 \
  --ip 192.168.1.200 \
  --ip6 2001:db8:8::200 \
  nginx:latest
```

### IPvlan Network

IPvlan is similar to macvlan but operates at Layer 3:

```bash
# Create an ipvlan L3 network with IPv6
docker network create \
  --driver ipvlan \
  --ipv6 \
  --subnet 10.0.0.0/24 \
  --subnet 2001:db8:9::/64 \
  -o parent=eth0 \
  -o ipvlan_mode=l3 \
  ipvlan-ipv6
```

### Overlay Network (Docker Swarm)

For multi-host deployments with Docker Swarm:

```bash
# Initialize Swarm (if not already done)
docker swarm init --advertise-addr <HOST_IP>

# Create overlay network with IPv6
docker network create \
  --driver overlay \
  --ipv6 \
  --subnet 10.10.0.0/16 \
  --subnet 2001:db8:10::/64 \
  --attachable \
  overlay-ipv6

# Deploy a service to the overlay network
docker service create \
  --name web \
  --network overlay-ipv6 \
  --replicas 3 \
  nginx:latest
```

## IPv6 Address Planning for Docker

Proper address planning prevents conflicts and simplifies management.

### Using Unique Local Addresses (ULA)

For private networks without global IPv6 allocation:

```bash
# ULA range: fd00::/8
# Generate a random ULA prefix (recommended for uniqueness)
# Format: fdXX:XXXX:XXXX::/48

# Example ULA allocation for Docker:
# fd12:3456:789a::/48 - Your organization's ULA prefix
#   fd12:3456:789a:1::/64 - Production network
#   fd12:3456:789a:2::/64 - Staging network
#   fd12:3456:789a:3::/64 - Development network
#   fd12:3456:789a:4::/64 - CI/CD runners
```

### Creating a Subnet Allocation Scheme

```bash
# Document your IPv6 allocation
cat << 'EOF' > /etc/docker/ipv6-allocation.md
# Docker IPv6 Subnet Allocation

## Global Prefix: 2001:db8:abcd::/48 (replace with your allocation)

| Network Name     | IPv6 Subnet              | IPv4 Subnet    | Purpose           |
|------------------|--------------------------|----------------|-------------------|
| bridge (default) | 2001:db8:abcd:0::/64     | 172.17.0.0/16  | Default bridge    |
| frontend         | 2001:db8:abcd:1::/64     | 172.18.0.0/16  | Public services   |
| backend          | 2001:db8:abcd:2::/64     | 172.19.0.0/16  | Internal services |
| database         | 2001:db8:abcd:3::/64     | 172.20.0.0/16  | Database tier     |
| monitoring       | 2001:db8:abcd:4::/64     | 172.21.0.0/16  | Observability     |
| ci-runners       | 2001:db8:abcd:5::/64     | 172.22.0.0/16  | CI/CD agents      |
EOF
```

## Firewall Configuration for Docker IPv6

### ip6tables Rules

Docker can manage ip6tables rules automatically when `ip6tables: true` is set in daemon.json. However, you may need additional rules:

```bash
# Allow established connections
sudo ip6tables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow ICMPv6 (required for IPv6 to function properly)
sudo ip6tables -A INPUT -p ipv6-icmp -j ACCEPT

# Allow Docker bridge traffic
sudo ip6tables -A FORWARD -i docker0 -j ACCEPT
sudo ip6tables -A FORWARD -o docker0 -j ACCEPT

# Allow traffic on custom Docker networks
sudo ip6tables -A FORWARD -i br-* -j ACCEPT
sudo ip6tables -A FORWARD -o br-* -j ACCEPT

# Save the rules
sudo ip6tables-save > /etc/ip6tables.rules
```

### UFW with Docker IPv6

If you use UFW, configure it to work with Docker IPv6:

```bash
# Edit UFW before rules
sudo nano /etc/ufw/before6.rules

# Add before the COMMIT line:
# Allow forwarding for Docker
-A ufw6-before-forward -i docker0 -j ACCEPT
-A ufw6-before-forward -o docker0 -j ACCEPT

# Reload UFW
sudo ufw reload
```

### Firewalld Configuration

For systems using firewalld:

```bash
# Create a zone for Docker
sudo firewall-cmd --permanent --new-zone=docker

# Add Docker interfaces to the zone
sudo firewall-cmd --permanent --zone=docker --add-interface=docker0

# Allow necessary traffic
sudo firewall-cmd --permanent --zone=docker --add-rich-rule='rule family="ipv6" source address="2001:db8::/32" accept'

# Enable masquerading for IPv6
sudo firewall-cmd --permanent --zone=docker --add-masquerade

# Reload firewalld
sudo firewall-cmd --reload
```

## Troubleshooting IPv6 in Docker

### Common Issues and Solutions

#### Issue 1: Containers Cannot Reach IPv6 Internet

```bash
# Check if IPv6 forwarding is enabled on the host
cat /proc/sys/net/ipv6/conf/all/forwarding
# Should be 1

# Enable IPv6 forwarding if disabled
sudo sysctl -w net.ipv6.conf.all.forwarding=1
echo "net.ipv6.conf.all.forwarding = 1" | sudo tee -a /etc/sysctl.conf
```

#### Issue 2: IPv6 Addresses Not Assigned to Containers

```bash
# Verify the network has IPv6 enabled
docker network inspect <network-name> | grep -i ipv6

# Check daemon configuration
cat /etc/docker/daemon.json | grep ipv6

# Restart Docker after configuration changes
sudo systemctl restart docker
```

#### Issue 3: DNS Resolution Fails for IPv6

```bash
# Check container DNS configuration
docker run --rm alpine cat /etc/resolv.conf

# Use a custom DNS server with IPv6 support
docker run --rm --dns 2001:4860:4860::8888 alpine nslookup google.com
```

#### Issue 4: ip6tables Rules Not Applied

```bash
# Verify ip6tables is enabled in daemon.json
cat /etc/docker/daemon.json | grep ip6tables

# Check current ip6tables rules
sudo ip6tables -L -n -v

# Verify Docker chains exist
sudo ip6tables -L DOCKER -n
sudo ip6tables -L DOCKER-USER -n
```

### Diagnostic Commands

```bash
# Complete network diagnostic script
#!/bin/bash

echo "=== Host IPv6 Configuration ==="
ip -6 addr show

echo -e "\n=== IPv6 Routing Table ==="
ip -6 route show

echo -e "\n=== Docker Networks ==="
docker network ls

echo -e "\n=== Docker Network Details ==="
for net in $(docker network ls -q); do
  echo "--- Network: $(docker network inspect $net --format '{{.Name}}') ---"
  docker network inspect $net --format '{{json .IPAM}}' | python3 -m json.tool
done

echo -e "\n=== Container IPv6 Addresses ==="
for container in $(docker ps -q); do
  name=$(docker inspect $container --format '{{.Name}}')
  ipv6=$(docker inspect $container --format '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}')
  echo "$name: $ipv6"
done

echo -e "\n=== ip6tables Docker Rules ==="
sudo ip6tables -L DOCKER -n -v 2>/dev/null || echo "No DOCKER chain found"

echo -e "\n=== IPv6 Connectivity Test ==="
docker run --rm alpine ping6 -c 2 ipv6.google.com 2>/dev/null || echo "IPv6 connectivity test failed"
```

### Testing IPv6 Connectivity Between Containers

```bash
# Create a test network
docker network create --ipv6 --subnet 2001:db8:test::/64 test-ipv6

# Start two containers
docker run -d --name server --network test-ipv6 nginx:latest
docker run -d --name client --network test-ipv6 alpine sleep 3600

# Get server's IPv6 address
SERVER_IPV6=$(docker inspect server --format '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}')
echo "Server IPv6: $SERVER_IPV6"

# Test connectivity from client
docker exec client ping6 -c 4 $SERVER_IPV6

# Test HTTP over IPv6
docker exec client wget -qO- "http://[$SERVER_IPV6]/"

# Cleanup
docker rm -f server client
docker network rm test-ipv6
```

## Best Practices for Production IPv6 Docker Deployments

### 1. Always Enable ip6tables

```json
{
  "ipv6": true,
  "ip6tables": true
}
```

Without `ip6tables`, Docker will not manage IPv6 firewall rules, leaving containers exposed.

### 2. Use Dual-Stack Networks

```yaml
networks:
  production:
    enable_ipv6: true
    ipam:
      config:
        - subnet: 172.20.0.0/16
        - subnet: 2001:db8:prod::/64
```

Dual-stack ensures compatibility with IPv4-only and IPv6-only services.

### 3. Document Your Address Plan

Maintain a living document of all IPv6 allocations. Overlapping subnets cause silent failures.

### 4. Monitor IPv6 Traffic

```bash
# Use tcpdump to monitor IPv6 traffic on Docker bridge
sudo tcpdump -i docker0 ip6 -n

# Monitor specific container's IPv6 traffic
CONTAINER_PID=$(docker inspect -f '{{.State.Pid}}' <container-name>)
sudo nsenter -t $CONTAINER_PID -n tcpdump ip6
```

### 5. Test IPv6 in CI/CD Pipelines

```yaml
# .github/workflows/test-ipv6.yml
name: Test IPv6 Connectivity

on: [push, pull_request]

jobs:
  test-ipv6:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Enable IPv6 in Docker
        run: |
          sudo cat /etc/docker/daemon.json || echo "{}" | sudo tee /etc/docker/daemon.json
          sudo jq '. + {"ipv6": true, "fixed-cidr-v6": "2001:db8:ci::/64", "ip6tables": true}' /etc/docker/daemon.json | sudo tee /etc/docker/daemon.json.new
          sudo mv /etc/docker/daemon.json.new /etc/docker/daemon.json
          sudo systemctl restart docker

      - name: Run IPv6 tests
        run: |
          docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

### 6. Implement Health Checks with IPv6

```dockerfile
# Dockerfile
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://[::1]:8080/health || exit 1
```

### 7. Log IPv6 Addresses in Application Logs

Ensure your applications log both IPv4 and IPv6 client addresses for debugging and auditing.

## IPv6 with Docker in Cloud Environments

### AWS ECS with IPv6

```json
{
  "networkConfiguration": {
    "awsvpcConfiguration": {
      "subnets": ["subnet-xxx"],
      "securityGroups": ["sg-xxx"],
      "assignPublicIp": "ENABLED"
    }
  },
  "networkMode": "awsvpc"
}
```

ECS tasks in `awsvpc` mode can receive IPv6 addresses when the VPC and subnet are configured for dual-stack.

### GKE with IPv6

```bash
# Create a dual-stack GKE cluster
gcloud container clusters create my-cluster \
  --enable-ip-alias \
  --enable-ipv6 \
  --ipv6-access-type=INTERNAL \
  --stack-type=IPV4_IPV6
```

### Azure AKS with IPv6

```bash
# Create a dual-stack AKS cluster
az aks create \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --network-plugin azure \
  --ip-families IPv4,IPv6
```

## Summary: IPv6 Configuration Quick Reference

| Task | Command / Configuration |
|------|------------------------|
| Enable IPv6 globally | `{"ipv6": true, "fixed-cidr-v6": "2001:db8::/64"}` in daemon.json |
| Enable ip6tables | `{"ip6tables": true}` in daemon.json |
| Create IPv6 network | `docker network create --ipv6 --subnet 2001:db8::/64 mynet` |
| Assign static IPv6 | `docker run --ip6 2001:db8::100 --network mynet image` |
| Compose IPv6 network | `enable_ipv6: true` under network definition |
| Check container IPv6 | `docker inspect -f '{{range .NetworkSettings.Networks}}{{.GlobalIPv6Address}}{{end}}' container` |
| Test IPv6 connectivity | `docker run --rm alpine ping6 ipv6.google.com` |
| Enable IPv6 forwarding | `sysctl -w net.ipv6.conf.all.forwarding=1` |
| View ip6tables rules | `sudo ip6tables -L -n -v` |
| Debug network | `docker run --rm nicolaka/netshoot ping6 <address>` |

## Conclusion

Enabling IPv6 in Docker is no longer optional for forward-thinking infrastructure. With IPv4 exhaustion driving up costs and more services moving to IPv6-preferred configurations, teams that delay IPv6 adoption accumulate technical debt.

The good news is that Docker's IPv6 support is mature and well-documented. Start with the daemon configuration for development environments, graduate to custom networks with proper address planning for production, and always enable ip6tables for security.

Key takeaways:

1. **Enable IPv6 at the daemon level** for simplicity, but use custom networks for production control.
2. **Always set `ip6tables: true`** to ensure Docker manages IPv6 firewall rules.
3. **Plan your address space** before deploying - overlapping subnets cause hard-to-debug failures.
4. **Test IPv6 connectivity** in CI/CD pipelines to catch regressions early.
5. **Monitor both stacks** - dual-stack deployments need visibility into IPv4 and IPv6 traffic.

With these patterns in place, your containerized workloads will be ready for the IPv6-native future.
