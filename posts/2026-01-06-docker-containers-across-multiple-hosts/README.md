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

First, initialize Docker Swarm on your primary node. This creates a manager that other nodes can join to form a cluster.

```bash
# On the first node (becomes manager) - advertise-addr is this node's IP
docker swarm init --advertise-addr <node1-ip>

# Copy the join command from output, run on other nodes
# The token authenticates workers joining the swarm
docker swarm join --token SWMTKN-xxx <node1-ip>:2377
```

### Create Overlay Network

Overlay networks span all Swarm nodes. The --attachable flag allows standalone containers (not just services) to connect.

```bash
# Create an encrypted overlay network spanning all swarm nodes
docker network create \
  --driver overlay \          # Overlay driver for multi-host networking
  --attachable \              # Allow standalone containers to attach
  --opt encrypted \           # Enable IPsec encryption for traffic
  app-network
```

### Deploy Services

Services deployed to the overlay network can reach each other by name, regardless of which physical host they run on.

```bash
# Service on any node can reach others on the overlay by service name
docker service create \
  --name api \
  --network app-network \     # Attach to our overlay network
  --replicas 3 \              # Run 3 instances across the swarm
  myapp:latest

docker service create \
  --name redis \
  --network app-network \     # Same network = automatic discovery
  redis:7
```

Containers reach each other by service name: `redis://redis:6379`

### Compose with Swarm

Docker Compose stacks deploy services to Swarm with built-in networking. This example shows a complete multi-service deployment with encrypted overlay networking.

```yaml
# docker-compose.yml (deploy as stack)
version: "3.8"

services:
  api:
    image: myapp:latest
    deploy:
      replicas: 3               # Distribute across swarm nodes
    networks:
      - app-net
    environment:
      REDIS_URL: redis://cache:6379  # Service discovery by name

  cache:
    image: redis:7
    networks:
      - app-net                 # Same network enables name resolution

networks:
  app-net:
    driver: overlay             # Overlay for multi-host
    driver_opts:
      encrypted: "true"         # IPsec encryption between nodes
```

```bash
# Deploy the stack to swarm - all networking is automatic
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

Install WireGuard and generate key pairs on each host. Each host needs a unique key pair for secure authentication.

```bash
# Ubuntu/Debian - install WireGuard
sudo apt install wireguard

# Generate keys on each host - keep private key secret!
# Public key is shared with peers
wg genkey | tee privatekey | wg pubkey > publickey
```

### Configure Host 1

This WireGuard configuration sets up Host 1 as a VPN peer. The AllowedIPs includes both the peer's WireGuard IP and its Docker network subnet for container routing.

```ini
# /etc/wireguard/wg0.conf on Host 1
[Interface]
Address = 10.0.0.1/24              # WireGuard IP for this host
PrivateKey = <host1-private-key>   # Generated private key (keep secret)
ListenPort = 51820                 # UDP port for WireGuard

[Peer]
PublicKey = <host2-public-key>     # Host 2's public key
AllowedIPs = 10.0.0.2/32, 172.18.0.0/16  # Peer IP + its Docker subnet
Endpoint = <host2-public-ip>:51820       # How to reach Host 2
```

### Configure Host 2

Host 2's configuration mirrors Host 1. Note the different WireGuard IP and the routing to Host 1's Docker subnet.

```ini
# /etc/wireguard/wg0.conf on Host 2
[Interface]
Address = 10.0.0.2/24              # WireGuard IP for this host
PrivateKey = <host2-private-key>   # Generated private key (keep secret)
ListenPort = 51820

[Peer]
PublicKey = <host1-public-key>     # Host 1's public key
AllowedIPs = 10.0.0.1/32, 172.17.0.0/16  # Peer IP + its Docker subnet
Endpoint = <host1-public-ip>:51820       # How to reach Host 1
```

### Start WireGuard

Bring up the WireGuard interface and enable it to start automatically on boot.

```bash
# Start the WireGuard tunnel immediately
sudo wg-quick up wg0

# Enable automatic start on boot
sudo systemctl enable wg-quick@wg0
```

### Configure Docker to Use WireGuard IPs

Create Docker networks with non-overlapping subnets on each host. This prevents IP conflicts when routing between hosts.

```bash
# Create Docker networks with non-overlapping ranges
# IMPORTANT: Each host must use a different subnet

# Host 1 - uses 172.17.x.x range
docker network create --subnet=172.17.0.0/16 app-net

# Host 2 - uses 172.18.x.x range (no overlap)
docker network create --subnet=172.18.0.0/16 app-net
```

### Add Routes for Container Networks

These routes tell each host how to reach containers on the other host through the WireGuard tunnel.

```bash
# On Host 1: route to Host 2's containers through WireGuard tunnel
# Traffic to 172.18.x.x goes via Host 2's WireGuard IP
sudo ip route add 172.18.0.0/16 via 10.0.0.2

# On Host 2: route to Host 1's containers through WireGuard tunnel
# Traffic to 172.17.x.x goes via Host 1's WireGuard IP
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

The Tailscale sidecar pattern runs Tailscale in a container that shares its network namespace with your application container. This gives the app a Tailscale identity without modification.

```yaml
# docker-compose.yml with Tailscale sidecar
services:
  tailscale:
    image: tailscale/tailscale:latest
    hostname: myapp-node1              # Becomes the Tailscale machine name
    environment:
      - TS_AUTHKEY=${TS_AUTHKEY}       # Pre-auth key from Tailscale admin
      - TS_STATE_DIR=/var/lib/tailscale
      - TS_USERSPACE=false             # Use kernel networking for performance
    volumes:
      - tailscale-state:/var/lib/tailscale  # Persist auth state
      - /dev/net/tun:/dev/net/tun      # TUN device for networking
    cap_add:
      - NET_ADMIN                      # Required for network configuration
      - SYS_MODULE                     # Required for kernel module
    network_mode: host                 # Shares network with host

  api:
    image: myapp:latest
    network_mode: service:tailscale    # Shares Tailscale network namespace
    depends_on:
      - tailscale
    environment:
      REDIS_URL: redis://redis-node2:6379  # Use Tailscale hostname

volumes:
  tailscale-state:                     # Persist across restarts
```

### Alternative: Tailscale as Subnet Router

Instead of per-container Tailscale, make the host a subnet router:

Running Tailscale on the host as a subnet router exposes your Docker network to the entire Tailnet. Simpler setup, but less granular access control.

```bash
# Install Tailscale on host (not in container)
curl -fsSL https://tailscale.com/install.sh | sh

# Advertise Docker network to the Tailnet
# --accept-routes allows receiving routes from other subnet routers
tailscale up --advertise-routes=172.17.0.0/16 --accept-routes
```

On other hosts, containers can reach 172.17.0.0/16 through Tailscale.

### Tailscale with MagicDNS

Tailscale provides automatic DNS:

MagicDNS gives every Tailscale node a stable DNS name. Containers can reference services by their Tailscale hostname, no manual DNS configuration needed.

```yaml
# On host 1 - reference services on other hosts by Tailscale name
services:
  api:
    image: myapp:latest
    environment:
      # Use Tailscale MagicDNS name - auto-resolved within the Tailnet
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

This pattern shows how to connect an application on one host to a database on another using WireGuard. The database binds to its WireGuard IP for security.

```yaml
# Host 1: Application connects to database via WireGuard IP
services:
  api:
    image: myapp:latest
    environment:
      DATABASE_URL: postgres://10.0.0.2:5432/app  # Host 2's WireGuard IP
```

```yaml
# Host 2: Database binds only to WireGuard interface (not public)
services:
  postgres:
    image: postgres:16
    ports:
      - "10.0.0.2:5432:5432"  # Bind to WireGuard interface only, not 0.0.0.0
```

### Pattern: Redis Cluster Across Hosts

Redis cluster nodes need to announce their actual IPs to clients. This configuration uses Tailscale IPs for cluster communication across hosts.

```yaml
# docker-compose.redis.yml (deploy on each host)
services:
  redis:
    image: redis:7
    command: >
      redis-server
      --cluster-enabled yes                       # Enable cluster mode
      --cluster-config-file nodes.conf
      --cluster-announce-ip ${HOST_TAILSCALE_IP}  # Announce Tailscale IP
      --cluster-announce-port 6379
    ports:
      - "6379:6379"      # Redis client port
      - "16379:16379"    # Redis cluster bus port
```

### Pattern: Service Discovery with Consul

When you need more than basic DNS:

For complex service discovery needs, deploy Consul alongside your containers. Registrator automatically registers containers with Consul as they start and stop.

```yaml
# On each host - Consul provides service discovery and health checking
services:
  consul:
    image: hashicorp/consul:latest
    command: agent -server -bootstrap-expect=3 -retry-join=consul-node1
    networks:
      - overlay-net

  registrator:
    image: gliderlabs/registrator:latest
    command: -internal consul://consul:8500       # Register services automatically
    volumes:
      - /var/run/docker.sock:/tmp/docker.sock     # Watch for container events
```

---

## Security Considerations

### Always Encrypt

All three options support encryption. Enable it to protect container traffic crossing networks.

```bash
# Swarm - enable IPsec encryption on overlay network
docker network create --opt encrypted overlay-net

# WireGuard encrypts by default (ChaCha20-Poly1305)

# Tailscale encrypts by default (WireGuard under the hood)
```

### Firewall Rules

Lock down network access to only what's necessary. Block direct access to Docker and Swarm management ports from the internet.

```bash
# Allow only WireGuard port for VPN traffic
sudo ufw allow 51820/udp

# Block direct container access from internet - containers should only be
# accessed through your application's designated ports
sudo ufw deny 2375  # Docker API - NEVER expose this
sudo ufw deny 2377  # Swarm management - internal only
```

### mTLS for Application Layer

Encrypt traffic between services even on encrypted networks:

Defense in depth: encrypt at the application layer too. mTLS ensures only authorized services can communicate, even if network encryption is compromised.

```yaml
services:
  api:
    environment:
      - SSL_CERT_FILE=/certs/service.crt   # Service certificate
      - SSL_KEY_FILE=/certs/service.key    # Service private key
    volumes:
      - ./certs:/certs:ro                  # Mount certs read-only
```

---

## Quick Reference

These commands summarize the key operations for each networking approach. Keep this as a quick reference.

```bash
# Swarm: Initialize and create overlay
docker swarm init
docker network create --driver overlay --attachable mynet

# WireGuard: Generate keys and start tunnel
wg genkey | tee privatekey | wg pubkey > publickey
wg-quick up wg0

# Tailscale: Start with auth key for unattended join
tailscale up --authkey=tskey-xxx

# Test connectivity across hosts
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
