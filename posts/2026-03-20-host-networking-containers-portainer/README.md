# How to Configure Host Networking Mode for Containers in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Host Network, Networking, Performance

Description: Use host network mode for containers in Portainer to maximize network performance for latency-sensitive workloads.

## Introduction

Use host network mode for containers in Portainer when you need direct access to the host's network stack for latency-sensitive workloads. In host mode, the container shares the host's network namespace, does not get its own IP address, and does not use Docker port publishing.

## Prerequisites

- Portainer CE or BE installed
- A Docker Standalone environment connected to Portainer
- A Linux host, or Docker Desktop 4.34+ with host networking enabled
- Basic understanding of networking concepts (ports, DNS, firewalls)

## Docker Network Types Overview

| Network Driver | Use Case | Multi-Host |
|----------------|----------|------------|
| bridge | Single-host container communication | No |
| overlay | Multi-host Swarm communication | Yes |
| host | Lowest overhead, shares host network stack | No |
| macvlan | Direct L2 network access | No |
| none | No networking | No |

## Step 1: Plan Your Network Architecture

Design your network topology before implementation:

```text
Client
   |
[Host IP:80]
   |
[Container running with network_mode: host]
```

Make sure the required host ports are free before deployment, because the container binds directly on the host.

## Step 2: Create Networks via Portainer

Host mode uses Docker's predefined `host` network, so you do not create a custom network for it under **Networks** > **Add Network**. Instead, configure the container or stack to use host networking:

```yaml
services:
  app:
    image: nginx:alpine
    network_mode: host
```

## Step 3: Connect Services to Networks

Configure services that require host networking:

```yaml
services:
  nginx:
    image: nginx:alpine
    network_mode: host
    restart: unless-stopped
    # Do not use ports: with host networking
    # Do not combine network_mode with networks:
```

## Step 4: Configure Network Security

Host mode removes Docker's network isolation for that container. There is no Docker network-level encryption setting to enable here, so secure access with the host firewall and only use host mode for services that actually need it.

Firewall rules via Portainer host access:

```bash
# Allow only the ports the application actually needs
ufw allow 80/tcp
ufw allow 443/tcp

# Keep database ports closed unless they must be reachable
ufw deny 5432/tcp
```

## Step 5: Troubleshoot Network Issues

Debug host-mode networking from Portainer's console:

```bash
# Confirm the container is using host networking
docker inspect host-mode-app --format '{{.HostConfig.NetworkMode}}'

# Inspect the predefined host network
docker network inspect host

# Verify which process is bound to the host port
sudo netstat -tulpn | grep :80

# Test connectivity through the host address
curl -I http://127.0.0.1:80
```

## Step 6: Monitor Network Traffic

Set up network monitoring:

```yaml
services:
  # Network traffic monitoring
  ntopng:
    image: ntop/ntopng:latest
    volumes:
      - ntopng-data:/var/lib/ntopng
    cap_add:
      - NET_ADMIN
      - NET_RAW
    network_mode: host  # Common when monitoring host interfaces

volumes:
  ntopng-data:
```

## Common Network Patterns

### Pattern 1: Edge Service on Host Network
```yaml
services:
  ingress:
    image: nginx:alpine
    network_mode: host
```

### Pattern 2: Traffic Monitoring
```yaml
services:
  sensor:
    image: ntop/ntopng:latest
    cap_add:
      - NET_ADMIN
      - NET_RAW
    network_mode: host
```

## Conclusion

Proper use of host network mode in Portainer is less about creating multiple Docker networks and more about using host mode selectively. Because the container shares the host network namespace, you get direct port binding and lower overhead, but you also give up Docker's per-container network isolation and port publishing. Use host mode only for services that actually need it, confirm the required host ports are free, and secure access with the host firewall.
