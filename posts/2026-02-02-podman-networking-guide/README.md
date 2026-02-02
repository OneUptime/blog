# How to Configure Podman Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Networking, Containers, DevOps, Linux, Docker Alternative, CNI

Description: A practical guide to configuring Podman networking for containers and pods. Learn bridge networks, host networking, macvlan, container communication, DNS resolution, and advanced networking patterns for production deployments.

---

> Moving from Docker to Podman? The daemonless architecture changes how networking works. Podman's rootless containers, pod-based networking, and CNI integration require different approaches than Docker's daemon-managed networks. Here's how to configure Podman networking for real-world use cases.

Podman provides flexible networking options that work in both rootful and rootless modes. Understanding these options helps you build secure, performant container deployments.

---

## Podman Networking Architecture

Podman uses Container Network Interface (CNI) plugins for networking, similar to Kubernetes. The key difference from Docker is that Podman can run without a daemon, which affects how networks are created and managed.

```mermaid
graph TB
    subgraph Host["Host System"]
        subgraph Podman["Podman Runtime"]
            C1["Container 1"]
            C2["Container 2"]
            C3["Container 3"]
        end

        subgraph Networks["Network Backends"]
            Bridge["Bridge Network<br/>podman0"]
            Host["Host Network"]
            Macvlan["Macvlan"]
            Slirp["slirp4netns<br/>(Rootless)"]
        end

        NIC["Physical NIC<br/>eth0"]
    end

    C1 --> Bridge
    C2 --> Bridge
    C3 --> Host
    Bridge --> NIC
    Host --> NIC
    Macvlan --> NIC
    Slirp --> NIC
```

### Network Types

| Network Type | Use Case | Rootless Support |
|-------------|----------|------------------|
| Bridge | Container isolation with port mapping | Yes |
| Host | Maximum performance, no isolation | Yes |
| Macvlan | Direct LAN access with unique MAC | No |
| None | Complete network isolation | Yes |
| Slirp4netns | Default rootless networking | Yes |

---

## Setting Up Bridge Networks

Bridge networking creates an isolated network where containers can communicate with each other and reach external networks through NAT.

### Creating a Custom Bridge Network

The following command creates a bridge network with a specific subnet and gateway. Custom networks provide DNS-based container discovery and better isolation than the default network.

```bash
# Create a bridge network with custom subnet
# --subnet: IP range for containers
# --gateway: Router address for the network
podman network create \
  --driver bridge \
  --subnet 10.89.0.0/24 \
  --gateway 10.89.0.1 \
  mynetwork

# Verify network creation
podman network ls

# Inspect network details including CNI configuration
podman network inspect mynetwork
```

### Running Containers on Custom Networks

Containers on the same custom network can communicate using container names as DNS hostnames. Port publishing exposes container services to the host.

```bash
# Run a database container on the custom network
# --network: Attach to specific network
# --name: Container name (used for DNS resolution)
podman run -d \
  --name postgres-db \
  --network mynetwork \
  -e POSTGRES_PASSWORD=secretpass \
  postgres:15

# Run an application container that connects to the database
# Uses DNS name 'postgres-db' to reach the database container
podman run -d \
  --name myapp \
  --network mynetwork \
  -p 8080:8080 \
  -e DATABASE_URL="postgresql://postgres:secretpass@postgres-db:5432/mydb" \
  myapp:latest

# Test connectivity between containers
podman exec myapp ping -c 3 postgres-db
```

---

## Rootless Networking with slirp4netns

Rootless Podman uses slirp4netns for networking, which creates a user-mode network stack. Some features work differently in rootless mode.

```mermaid
graph LR
    subgraph Rootless["Rootless Container"]
        App["Application<br/>:8080"]
    end

    subgraph Slirp["slirp4netns"]
        TAP["TAP Device"]
        NAT["User-space NAT"]
    end

    subgraph Host["Host"]
        Port["Published Port<br/>:8080"]
    end

    App --> TAP
    TAP --> NAT
    NAT --> Port
```

### Rootless Port Publishing

Port publishing in rootless mode requires ports above 1024 unless you configure additional capabilities. Here's how to work with rootless networking effectively.

```bash
# Rootless containers cannot bind to privileged ports (< 1024) by default
# Use high ports or remap with --publish
podman run -d \
  --name web \
  -p 8080:80 \
  nginx:alpine

# To use port 80 without root, add the net_bind_service capability
# Requires /etc/sysctl.conf: net.ipv4.ip_unprivileged_port_start=0
podman run -d \
  --name web-privileged \
  -p 80:80 \
  --cap-add=NET_BIND_SERVICE \
  nginx:alpine

# Check which ports are mapped
podman port web
```

### Improving Rootless Network Performance

The default slirp4netns can be slower than bridge networking. Use pasta (Podman's newer networking option) for better performance in rootless mode.

```bash
# Use pasta for better rootless performance (Podman 4.0+)
# pasta provides kernel-level networking in rootless mode
podman run -d \
  --name fast-container \
  --network pasta \
  -p 8080:80 \
  nginx:alpine

# Configure slirp4netns options for specific use cases
# --network slirp4netns:port_handler=slirp4netns increases compatibility
podman run -d \
  --name compatible-container \
  --network slirp4netns:port_handler=slirp4netns,enable_ipv6=true \
  myapp:latest
```

---

## Pod Networking

Pods group containers that share network namespace, similar to Kubernetes pods. Containers within a pod communicate over localhost and share a single IP address.

```mermaid
graph TB
    subgraph Pod["Pod: myapp-pod"]
        subgraph SharedNetwork["Shared Network Namespace<br/>10.89.0.5"]
            Infra["Infra Container<br/>(pause)"]
            App["App Container<br/>localhost:8080"]
            Sidecar["Sidecar Container<br/>localhost:9090"]
        end
    end

    External["External Traffic"] -->|":8080"| Infra
    Infra -.->|"localhost"| App
    Infra -.->|"localhost"| Sidecar
    App <-->|"localhost:9090"| Sidecar
```

### Creating and Managing Pods

Pods enable tight container coupling for patterns like sidecar proxies, log collectors, and service meshes.

```bash
# Create a pod with port mappings
# Ports are defined at pod level, not container level
podman pod create \
  --name myapp-pod \
  --publish 8080:8080 \
  --publish 9090:9090 \
  --network mynetwork

# Add containers to the pod
# --pod flag attaches container to existing pod
podman run -d \
  --pod myapp-pod \
  --name app \
  myapp:latest

# Add a sidecar container (shares localhost with app)
podman run -d \
  --pod myapp-pod \
  --name metrics-sidecar \
  prom/prometheus:latest

# Containers in the pod communicate via localhost
# The app can reach prometheus at localhost:9090
podman exec app curl http://localhost:9090/metrics
```

### Pod Networking Configuration

Configure pod-level networking options for the entire group of containers.

```bash
# Create a pod with custom DNS and hostname
podman pod create \
  --name production-pod \
  --hostname app.example.com \
  --dns 8.8.8.8 \
  --dns-search example.com \
  --network mynetwork \
  --publish 80:80

# Create a pod with specific IP address
podman pod create \
  --name static-ip-pod \
  --network mynetwork \
  --ip 10.89.0.100 \
  --publish 8080:8080

# List pods and their containers
podman pod ps
podman pod inspect myapp-pod
```

---

## Container-to-Container Communication

Containers need to communicate in multi-container applications. Podman provides several patterns for inter-container networking.

### DNS Resolution on Custom Networks

Custom networks automatically provide DNS resolution using container names.

```bash
# Create application network
podman network create appnet

# Run backend services
podman run -d --name redis --network appnet redis:7
podman run -d --name postgres --network appnet postgres:15

# Run frontend that connects to backends using DNS names
podman run -d \
  --name api \
  --network appnet \
  -e REDIS_HOST=redis \
  -e POSTGRES_HOST=postgres \
  myapi:latest

# Verify DNS resolution
podman exec api nslookup redis
podman exec api nslookup postgres
```

### Connecting Containers to Multiple Networks

Containers can join multiple networks for complex topologies like DMZ patterns or service isolation.

```bash
# Create separate networks for different tiers
podman network create frontend-net
podman network create backend-net

# Database only on backend network (not exposed to frontend)
podman run -d \
  --name database \
  --network backend-net \
  postgres:15

# API server on both networks (bridges frontend and backend)
podman run -d \
  --name api \
  --network frontend-net \
  --network backend-net \
  myapi:latest

# Web server only on frontend network
podman run -d \
  --name web \
  --network frontend-net \
  -p 80:80 \
  nginx:alpine
```

```mermaid
graph TB
    subgraph Frontend["frontend-net"]
        Web["Web Server"]
        API1["API Server"]
    end

    subgraph Backend["backend-net"]
        API2["API Server"]
        DB["Database"]
    end

    Internet["Internet"] --> Web
    Web --> API1
    API1 -.-> API2
    API2 --> DB

    style API1 fill:#f9f,stroke:#333
    style API2 fill:#f9f,stroke:#333
```

---

## Host Networking Mode

Host networking removes network isolation, giving containers direct access to host network interfaces. Useful for performance-critical applications or when containers need to bind to specific host interfaces.

```bash
# Run container with host networking
# No port mapping needed - container binds directly to host ports
podman run -d \
  --name high-perf-app \
  --network host \
  myapp:latest

# Host networking use cases:
# - Network monitoring tools that need raw socket access
# - High-performance applications avoiding NAT overhead
# - Applications that need to discover host network configuration
podman run -d \
  --name network-monitor \
  --network host \
  --cap-add=NET_RAW \
  tcpdump:latest
```

**Security Warning:** Host networking exposes all host ports to the container. Only use when necessary and with trusted container images.

---

## Macvlan Networks

Macvlan assigns real MAC addresses to containers, making them appear as physical devices on the LAN. Ideal for legacy applications that expect direct network access.

```bash
# Create macvlan network attached to host interface
# Replace eth0 with your actual interface name
podman network create \
  --driver macvlan \
  --subnet 192.168.1.0/24 \
  --gateway 192.168.1.1 \
  --opt parent=eth0 \
  lannet

# Run container with LAN IP address
podman run -d \
  --name lan-device \
  --network lannet \
  --ip 192.168.1.50 \
  myapp:latest

# Container is now directly reachable from LAN at 192.168.1.50
# No port mapping needed - all ports accessible
```

```mermaid
graph LR
    subgraph LAN["Local Network 192.168.1.0/24"]
        Router["Router<br/>192.168.1.1"]
        Host["Host<br/>192.168.1.10"]
        Container["Container<br/>192.168.1.50"]
        Other["Other Devices"]
    end

    Router --- Host
    Router --- Container
    Router --- Other
```

**Note:** Macvlan requires root privileges and is not available in rootless mode.

---

## Network Troubleshooting

When container networking doesn't work as expected, use these diagnostic techniques.

### Inspecting Network Configuration

```bash
# List all networks
podman network ls

# Detailed network inspection with connected containers
podman network inspect mynetwork

# Check container network settings
podman inspect --format '{{json .NetworkSettings}}' mycontainer | jq

# View container IP addresses
podman inspect --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' mycontainer
```

### Testing Network Connectivity

```bash
# Run a debug container with network tools
podman run -it --rm \
  --network mynetwork \
  nicolaka/netshoot \
  bash

# Inside the debug container, test connectivity:
# ping postgres-db
# nslookup redis
# curl -v http://api:8080/health
# traceroute google.com
# ss -tulpn

# Test port connectivity from host
podman exec mycontainer nc -zv postgres-db 5432
```

### Common Network Issues and Solutions

```bash
# Issue: Container cannot resolve DNS names
# Solution: Check if using default network (no DNS) vs custom network
podman network disconnect podman mycontainer
podman network connect mynetwork mycontainer

# Issue: Rootless container cannot bind to port 80
# Solution: Use high port or configure unprivileged port range
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80

# Issue: Containers on same network cannot communicate
# Solution: Verify both containers are on the same network
podman inspect mycontainer --format '{{json .NetworkSettings.Networks}}' | jq 'keys'

# Issue: Slow network performance in rootless mode
# Solution: Use pasta instead of slirp4netns
podman run --network pasta myapp:latest
```

---

## Network Security Configuration

Secure your container networks with proper isolation and firewall rules.

### Network Isolation Patterns

```bash
# Create isolated network with no external access
podman network create \
  --internal \
  --subnet 10.100.0.0/24 \
  isolated-net

# Containers on isolated-net can only talk to each other
# No internet access or host network access
podman run -d \
  --name private-db \
  --network isolated-net \
  postgres:15
```

### Firewall Integration

Podman works with firewalld and iptables. Configure rules to control traffic flow.

```bash
# Check current firewall rules for Podman networks
sudo iptables -L -n | grep -A5 CNI

# Allow specific port through firewalld for container access
sudo firewall-cmd --add-port=8080/tcp --permanent
sudo firewall-cmd --reload

# Create firewall zone for container network
sudo firewall-cmd --new-zone=containers --permanent
sudo firewall-cmd --zone=containers --add-source=10.89.0.0/24 --permanent
sudo firewall-cmd --zone=containers --add-service=http --permanent
sudo firewall-cmd --reload
```

---

## Podman Compose Networking

When using Podman Compose (or podman-compose), networks work similarly to Docker Compose.

Create a compose file that defines networks and services with proper connectivity.

```yaml
# docker-compose.yml
# Podman Compose compatible network configuration
version: "3.8"

services:
  # Web frontend - exposed to public, connects to API
  web:
    image: nginx:alpine
    ports:
      - "80:80"
    networks:
      - frontend
    depends_on:
      - api

  # API service - bridges frontend and backend networks
  api:
    image: myapi:latest
    environment:
      - DATABASE_URL=postgresql://postgres:secret@db:5432/app
      - REDIS_URL=redis://cache:6379
    networks:
      - frontend
      - backend

  # Database - only accessible from backend network
  db:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=secret
    volumes:
      - pgdata:/var/lib/postgresql/data
    networks:
      - backend

  # Cache - only accessible from backend network
  cache:
    image: redis:7
    networks:
      - backend

networks:
  # Frontend network for public-facing services
  frontend:
    driver: bridge

  # Backend network for internal services (more restrictive)
  backend:
    driver: bridge
    internal: false

volumes:
  pgdata:
```

```bash
# Run with podman-compose
podman-compose up -d

# Or use podman's built-in compose support (Podman 3.0+)
podman compose up -d

# Verify network creation
podman network ls
```

---

## Advanced Network Configuration

### Custom CNI Configuration

For advanced scenarios, create custom CNI configuration files.

```bash
# CNI configuration location
# Rootful: /etc/cni/net.d/
# Rootless: ~/.config/cni/net.d/

# View existing CNI configurations
ls ~/.config/cni/net.d/
```

A custom CNI configuration provides fine-grained control over network behavior, including MTU settings, IP masquerading, and routing rules.

```json
{
  "cniVersion": "0.4.0",
  "name": "custom-network",
  "plugins": [
    {
      "type": "bridge",
      "bridge": "cni-custom",
      "isGateway": true,
      "ipMasq": true,
      "hairpinMode": true,
      "mtu": 1500,
      "ipam": {
        "type": "host-local",
        "ranges": [
          [
            {
              "subnet": "10.99.0.0/24",
              "gateway": "10.99.0.1"
            }
          ]
        ],
        "routes": [
          {
            "dst": "0.0.0.0/0"
          }
        ]
      }
    },
    {
      "type": "portmap",
      "capabilities": {
        "portMappings": true
      }
    },
    {
      "type": "firewall"
    },
    {
      "type": "tuning"
    }
  ]
}
```

### IPv6 Networking

Enable IPv6 for containers that need dual-stack networking.

```bash
# Create dual-stack network with IPv4 and IPv6
podman network create \
  --subnet 10.89.1.0/24 \
  --subnet fd00:dead:beef::/64 \
  --ipv6 \
  dual-stack-net

# Run container with IPv6
podman run -d \
  --name ipv6-app \
  --network dual-stack-net \
  myapp:latest

# Verify IPv6 address
podman exec ipv6-app ip addr show
```

---

## Network Performance Tuning

Optimize network performance for high-throughput workloads.

```bash
# Increase container network buffer sizes
podman run -d \
  --name tuned-app \
  --sysctl net.core.rmem_max=16777216 \
  --sysctl net.core.wmem_max=16777216 \
  --sysctl net.ipv4.tcp_rmem='4096 87380 16777216' \
  --sysctl net.ipv4.tcp_wmem='4096 87380 16777216' \
  myapp:latest

# For maximum performance, use host networking
# Eliminates NAT overhead entirely
podman run -d \
  --name max-perf \
  --network host \
  myapp:latest

# Check network statistics
podman exec myapp cat /proc/net/dev
```

---

## Summary

Podman networking provides flexible options for container communication:

- **Bridge networks** offer isolation with DNS-based discovery
- **Rootless networking** uses slirp4netns or pasta for user-mode operation
- **Pods** group containers sharing network namespace
- **Macvlan** provides direct LAN access for legacy applications
- **Host networking** maximizes performance when isolation isn't required

Choose the right network type based on your security requirements, performance needs, and whether you're running rootful or rootless.

---

*Need to monitor your containerized applications? [OneUptime](https://oneuptime.com) provides observability for Podman containers including metrics, logs, and alerts for your containerized infrastructure.*

**Related Reading:**
- [How to Monitor Docker Containers with Prometheus](https://oneuptime.com/blog/post/2025-01-06-docker-prometheus-monitoring/view)
