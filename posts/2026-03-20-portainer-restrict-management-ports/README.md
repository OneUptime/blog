# How to Restrict Management Ports in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Security, Networking, Hardening, Firewall

Description: Learn how to restrict access to Portainer's management ports and Docker API ports to prevent unauthorized access to your container management interface.

## Introduction

Portainer and Docker can expose several management ports that, if left unrestricted, create significant security risks. This guide covers which ports to protect, how to restrict them using firewall rules, and how to configure Portainer to bind only to specific network interfaces.

## Management Ports Overview

| Port | Service | Risk Level |
|------|---------|------------|
| `9443` | Portainer HTTPS | High - full container management |
| `9000` | Portainer HTTP (legacy) | Critical - unencrypted management if enabled |
| `8000` | Portainer Edge Agent tunnel | Medium - for edge environments |
| `2375` | Docker API (no TLS) | Critical - root-equivalent access |
| `2376` | Docker API (TLS) | High - root-equivalent with auth |
| `2377` | Docker Swarm manager | High - Swarm cluster management |

## Step 1: Close Unneeded Ports

First, identify which ports are currently open:

```bash
# Check listening ports

ss -tlnp | grep -E "(9443|9000|8000|2375|2376|2377)"

# Check from external perspective
nmap -p 9000,9443,2375,2376 your-server-ip
```

## Step 2: Firewall Rules with UFW

On Docker hosts, UFW is useful for host-level services like SSH, but Docker-published container ports can bypass plain UFW rules. Use the specific IP binding in Step 4 or the Docker-aware iptables rules in Step 3 as well.

```bash
# Default: deny all incoming
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH from your IP only
sudo ufw allow proto tcp from YOUR_ADMIN_IP to any port 22

# Allow Portainer HTTPS ONLY from VPN/office IP range
sudo ufw allow proto tcp from 10.0.0.0/8 to any port 9443 comment "Portainer HTTPS - internal only"

# NEVER allow these without IP restriction:
# sudo ufw allow proto tcp from any to any port 9000   # Plain HTTP - dangerous!
# sudo ufw allow proto tcp from any to any port 2375   # Docker API without TLS - extremely dangerous!

# Allow Docker TLS only if needed from specific IPs
sudo ufw allow proto tcp from 10.0.1.0/24 to any port 2376 comment "Docker TLS - CI/CD subnet only"

# Allow Portainer Edge Agent if using edge environments
sudo ufw allow proto tcp from 0.0.0.0/0 to any port 8000 comment "Edge Agent tunnel"

# Deny all other management ports explicitly
sudo ufw deny proto tcp to any port 9000 comment "Block plain HTTP Portainer"
sudo ufw deny proto tcp to any port 2375 comment "Block Docker API without TLS"

# Enable firewall
sudo ufw enable
sudo ufw reload

# Verify
sudo ufw status verbose
```

## Step 3: iptables Rules (Alternative)

```bash
# Docker-published ports are filtered in DOCKER-USER, not INPUT
EXT_IF="eth0"  # Replace with your external interface

# Create a new chain for Portainer rules
sudo iptables -N PORTAINER_ACCESS
sudo iptables -I DOCKER-USER 1 -i ${EXT_IF} -j PORTAINER_ACCESS

# Allow established connections
sudo iptables -A PORTAINER_ACCESS -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT

# Allow Portainer HTTPS only from internal network
sudo iptables -A PORTAINER_ACCESS -p tcp -m conntrack --ctorigdstport 9443 -s 10.0.0.0/8 -j ACCEPT
sudo iptables -A PORTAINER_ACCESS -p tcp -m conntrack --ctorigdstport 9443 -j DROP

# Allow Docker TLS only if needed from specific IPs
sudo iptables -A PORTAINER_ACCESS -p tcp -m conntrack --ctorigdstport 2376 -s 10.0.1.0/24 -j ACCEPT
sudo iptables -A PORTAINER_ACCESS -p tcp -m conntrack --ctorigdstport 2376 -j DROP

# Block plain HTTP Portainer and unauthenticated Docker API completely
sudo iptables -A PORTAINER_ACCESS -p tcp -m conntrack --ctorigdstport 9000 -j DROP
sudo iptables -A PORTAINER_ACCESS -p tcp -m conntrack --ctorigdstport 2375 -j DROP

# Persist rules using your distro's standard method.
# Example on Debian/Ubuntu with iptables-persistent installed:
sudo iptables-save > /etc/iptables/rules.v4
```

## Step 4: Bind Portainer to Specific Interface

Prevent Portainer from listening on all interfaces:

```bash
# Bind to internal/VPN IP only
INTERNAL_IP="10.0.0.100"

# Add -p ${INTERNAL_IP}:8000:8000 as well if you use Edge Agent
docker run -d \
  --name portainer \
  --restart=unless-stopped \
  -p ${INTERNAL_IP}:9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:sts

# This means Portainer is only published on ${INTERNAL_IP}, not on the host's other IP addresses
```

For Docker Compose:

```yaml
# docker-compose.yml
services:
  portainer:
    image: portainer/portainer-ce:sts
    restart: unless-stopped
    ports:
      - "10.0.0.100:9443:9443"  # Bind to specific IP
      # NOT: - "9443:9443"        This binds to all interfaces
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data

volumes:
  portainer_data:
```

## Step 5: Disable Docker TCP Port Completely

If you're not using the Docker TCP API (using socket instead), disable it:

```bash
# Check if Docker is listening on TCP
ss -tlnp | grep docker

# Check both daemon.json and any systemd overrides for tcp:// listeners
sudo test -f /etc/docker/daemon.json && sudo cat /etc/docker/daemon.json
sudo systemctl cat docker.service

# If present, remove the tcp:// listener from whichever config source defines it.
# Do not define "hosts" in both daemon.json and systemd unit overrides.
sudo nano /etc/docker/daemon.json
# If Docker was configured through systemd instead, edit the override:
# sudo systemctl edit docker.service

# For daemon.json-based setups, it should look like:
# {
#   "hosts": ["unix:///var/run/docker.sock"],
#   "log-driver": "json-file",
#   "log-opts": {"max-size": "10m", "max-file": "3"}
# }

sudo systemctl restart docker
```

## Step 6: Use Docker Socket Proxy

If multiple services need Docker access, use a socket proxy instead of exposing the raw socket:

```yaml
# docker-compose.yml with socket proxy
services:
  docker-proxy:
    image: ghcr.io/tecnativa/docker-socket-proxy:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      CONTAINERS: 1
      IMAGES: 1
      NETWORKS: 1
      VOLUMES: 1
      INFO: 1
      SYSTEM: 1
      POST: 1      # Required for Portainer management actions
    networks:
      - proxy-net
    restart: unless-stopped

  portainer:
    image: portainer/portainer-ce:sts
    command:
      - -H
      - tcp://docker-proxy:2375
    depends_on:
      - docker-proxy
    networks:
      - proxy-net
    ports:
      - "10.0.0.100:9443:9443"
    volumes:
      - portainer_data:/data
    restart: unless-stopped

volumes:
  portainer_data:

networks:
  proxy-net:
    internal: true  # No external access
```

If you only want read-only Docker access, set `POST: 0`; Portainer management actions require `POST: 1` and the relevant API sections enabled.

## Step 7: Port Scan Verification

After applying restrictions, verify from an external machine:

```bash
# From outside your network (or use nmap online scanner)
nmap -p 9000,9443,2375,2376,2377 your-public-ip

# Expected results from the public Internet:
# - 9000/tcp should be closed or filtered
# - 9443/tcp should be closed or filtered unless you intentionally expose it publicly
# - 2375/tcp should be closed or filtered
# - 2376/tcp should be closed or filtered unless you explicitly allow it

# From inside your VPN/internal network:
nmap -p 9443 10.0.0.100

# Expected:
# 9443/tcp open   # Good: accessible from internal network
```

## Conclusion

Restricting Portainer management ports is a critical security measure. Bind Portainer to internal or VPN-only interfaces, use firewall rules to restrict access by source IP, disable the plain HTTP port entirely, and never expose the Docker API TCP port without TLS. Combine port restrictions with VPN-only access for maximum protection - ports that are not reachable from the internet cannot be exploited.
