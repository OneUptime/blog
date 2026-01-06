# How to Connect Docker Containers Across Multiple Hosts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, DevOps, Distributed Systems, Security

Description: Implement overlay networks, WireGuard tunnels, and Tailscale sidecars for secure multi-host container communication without Kubernetes.

Single-host Docker is straightforward. Multi-host Docker networking is where things get interesting. When your containers span multiple servers, you need a way for them to find each other, communicate securely, and handle failures gracefully.

---

## The Multi-Host Challenge

On a single host, Docker's bridge network handles everything. Containers get IPs, DNS resolution works, and life is simple. Across hosts, you face:

- **No shared network namespace** - Containers on different hosts can't see each other by default
- **NAT traversal** - Most servers are behind firewalls
- **Service discovery** - How does container A on host 1 find container B on host 2?
- **Security** - Traffic crosses untrusted networks

There are several solutions, each with different complexity and capabilities.

---

## Option 1: Docker Swarm Overlay Networks

Swarm creates encrypted overlay networks that span hosts automatically. It's the simplest option if you don't need Kubernetes.

### Initialize Swarm

```bash
# On the first node (becomes manager)
docker swarm init --advertise-addr <node1-ip>

# Copy the join command from output, run on other nodes
docker swarm join --token SWMTKN-xxx <node1-ip>:2377
```

### Create Overlay Network

```bash
# Create an encrypted overlay network
docker network create \
  --driver overlay \
  --attachable \
  --opt encrypted \
  app-network
```

### Deploy Services

```bash
# Service on any node can reach others on the overlay
docker service create \
  --name api \
  --network app-network \
  --replicas 3 \
  myapp:latest

docker service create \
  --name redis \
  --network app-network \
  redis:7
```

Containers reach each other by service name: `redis://redis:6379`

### Compose with Swarm

```yaml
# docker-compose.yml (deploy as stack)
version: "3.8"

services:
  api:
    image: myapp:latest
    deploy:
      replicas: 3
    networks:
      - app-net
    environment:
      REDIS_URL: redis://cache:6379

  cache:
    image: redis:7
    networks:
      - app-net

networks:
  app-net:
    driver: overlay
    driver_opts:
      encrypted: "true"
```

```bash
docker stack deploy -c docker-compose.yml myapp
```

### Swarm Pros and Cons

**Pros:**
- Built into Docker, no extra tools
- Automatic service discovery
- Encrypted by default with `--opt encrypted`
- Rolling updates and health checks

**Cons:**
- Requires Swarm mode (not just standalone Docker)
- Overlay has performance overhead (~10-20%)
- Less flexible than Kubernetes for complex topologies

---

## Option 2: WireGuard Tunnel

WireGuard creates a fast, encrypted VPN between hosts. Containers communicate over this tunnel using host networking or direct routes.

### Install WireGuard on All Hosts

```bash
# Ubuntu/Debian
sudo apt install wireguard

# Generate keys on each host
wg genkey | tee privatekey | wg pubkey > publickey
```

### Configure Host 1

```ini
# /etc/wireguard/wg0.conf
[Interface]
Address = 10.0.0.1/24
PrivateKey = <host1-private-key>
ListenPort = 51820

[Peer]
PublicKey = <host2-public-key>
AllowedIPs = 10.0.0.2/32, 172.18.0.0/16
Endpoint = <host2-public-ip>:51820
```

### Configure Host 2

```ini
# /etc/wireguard/wg0.conf
[Interface]
Address = 10.0.0.2/24
PrivateKey = <host2-private-key>
ListenPort = 51820

[Peer]
PublicKey = <host1-public-key>
AllowedIPs = 10.0.0.1/32, 172.17.0.0/16
Endpoint = <host1-public-ip>:51820
```

### Start WireGuard

```bash
sudo wg-quick up wg0
sudo systemctl enable wg-quick@wg0
```

### Configure Docker to Use WireGuard IPs

```bash
# Create Docker networks with non-overlapping ranges
# Host 1
docker network create --subnet=172.17.0.0/16 app-net

# Host 2
docker network create --subnet=172.18.0.0/16 app-net
```

### Add Routes for Container Networks

```bash
# On Host 1: route to Host 2's containers through WireGuard
sudo ip route add 172.18.0.0/16 via 10.0.0.2

# On Host 2: route to Host 1's containers through WireGuard
sudo ip route add 172.17.0.0/16 via 10.0.0.1
```

Now containers can communicate using container IPs across hosts.

### WireGuard Pros and Cons

**Pros:**
- Extremely fast (kernel-level encryption)
- Works with standalone Docker (no Swarm)
- Full control over network topology
- Can connect non-Docker workloads too

**Cons:**
- Manual configuration and route management
- No automatic service discovery
- Requires careful subnet planning
- More ops overhead

---

## Option 3: Tailscale Sidecar

Tailscale wraps WireGuard with zero-config networking. Each container gets a stable Tailscale IP, and they find each other automatically.

### Tailscale Container Setup

```yaml
# docker-compose.yml
services:
  tailscale:
    image: tailscale/tailscale:latest
    hostname: myapp-node1
    environment:
      - TS_AUTHKEY=${TS_AUTHKEY}
      - TS_STATE_DIR=/var/lib/tailscale
      - TS_USERSPACE=false
    volumes:
      - tailscale-state:/var/lib/tailscale
      - /dev/net/tun:/dev/net/tun
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    network_mode: host  # Shares network with host

  api:
    image: myapp:latest
    network_mode: service:tailscale  # Shares Tailscale network
    depends_on:
      - tailscale
    environment:
      REDIS_URL: redis://redis-node2:6379

volumes:
  tailscale-state:
```

### Alternative: Tailscale as Subnet Router

Instead of per-container Tailscale, make the host a subnet router:

```bash
# Install Tailscale on host
curl -fsSL https://tailscale.com/install.sh | sh

# Advertise Docker network
tailscale up --advertise-routes=172.17.0.0/16 --accept-routes
```

On other hosts, containers can reach 172.17.0.0/16 through Tailscale.

### Tailscale with MagicDNS

Tailscale provides automatic DNS:

```yaml
# On host 1
services:
  api:
    image: myapp:latest
    environment:
      # Use Tailscale MagicDNS name
      DATABASE_URL: postgres://db-host2.tailnet-name.ts.net/app
```

### Tailscale Pros and Cons

**Pros:**
- Zero firewall configuration (works through NAT)
- Automatic service discovery via MagicDNS
- SSO integration and access controls
- Works from anywhere (dev laptops, cloud, on-prem)

**Cons:**
- Dependency on Tailscale coordination servers
- Free tier limits (but generous)
- Adds a network hop for container traffic
- Requires auth key management

---

## Comparison Matrix

| Feature | Swarm Overlay | WireGuard | Tailscale |
|---------|---------------|-----------|-----------|
| Setup complexity | Low | High | Low |
| Service discovery | Built-in | Manual | MagicDNS |
| Performance | Good | Excellent | Good |
| NAT traversal | Requires ports | Requires ports | Automatic |
| Encryption | Optional | Always | Always |
| Standalone Docker | No (Swarm only) | Yes | Yes |
| Access control | Basic | Manual | Fine-grained |

---

## Practical Patterns

### Pattern: Database on Dedicated Host

```yaml
# Host 1: Application
services:
  api:
    image: myapp:latest
    environment:
      DATABASE_URL: postgres://10.0.0.2:5432/app  # WireGuard IP
```

```yaml
# Host 2: Database
services:
  postgres:
    image: postgres:16
    ports:
      - "10.0.0.2:5432:5432"  # Bind to WireGuard interface
```

### Pattern: Redis Cluster Across Hosts

```yaml
# docker-compose.redis.yml (deploy on each host)
services:
  redis:
    image: redis:7
    command: >
      redis-server
      --cluster-enabled yes
      --cluster-config-file nodes.conf
      --cluster-announce-ip ${HOST_TAILSCALE_IP}
      --cluster-announce-port 6379
    ports:
      - "6379:6379"
      - "16379:16379"
```

### Pattern: Service Discovery with Consul

When you need more than basic DNS:

```yaml
# On each host
services:
  consul:
    image: hashicorp/consul:latest
    command: agent -server -bootstrap-expect=3 -retry-join=consul-node1
    networks:
      - overlay-net

  registrator:
    image: gliderlabs/registrator:latest
    command: -internal consul://consul:8500
    volumes:
      - /var/run/docker.sock:/tmp/docker.sock
```

---

## Security Considerations

### Always Encrypt

```bash
# Swarm
docker network create --opt encrypted overlay-net

# WireGuard encrypts by default

# Tailscale encrypts by default
```

### Firewall Rules

```bash
# Allow only WireGuard port
sudo ufw allow 51820/udp

# Block direct container access from internet
sudo ufw deny 2375  # Docker API
sudo ufw deny 2377  # Swarm management
```

### mTLS for Application Layer

Encrypt traffic between services even on encrypted networks:

```yaml
services:
  api:
    environment:
      - SSL_CERT_FILE=/certs/service.crt
      - SSL_KEY_FILE=/certs/service.key
    volumes:
      - ./certs:/certs:ro
```

---

## Quick Reference

```bash
# Swarm: Initialize and create overlay
docker swarm init
docker network create --driver overlay --attachable mynet

# WireGuard: Generate keys
wg genkey | tee privatekey | wg pubkey > publickey
wg-quick up wg0

# Tailscale: Start with auth key
tailscale up --authkey=tskey-xxx

# Test connectivity
docker run --rm --network mynet alpine ping other-service
```

---

## Summary

- **Docker Swarm overlay** is the easiest if you're already using Swarm
- **WireGuard** offers the best performance and full control but requires manual setup
- **Tailscale** provides zero-config networking with great developer experience
- All options can be combined (e.g., WireGuard between hosts + Swarm overlay for services)
- Always encrypt traffic between hosts, even on private networks
- Consider service discovery needs early - it's harder to retrofit

Pick the option that matches your ops maturity and security requirements.
