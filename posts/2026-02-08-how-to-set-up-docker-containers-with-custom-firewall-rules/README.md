# How to Set Up Docker Containers with Custom Firewall Rules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, firewall, iptables, security, networking, nftables, container security

Description: Practical guide to configuring custom firewall rules for Docker containers using iptables and Docker network policies.

---

Docker and firewalls have a complicated relationship. When Docker publishes a port, it inserts iptables rules that bypass your carefully crafted firewall configuration. Many administrators discover this the hard way when they find their database container exposed to the internet despite having `ufw` or `firewalld` rules that should block external access.

This guide explains how Docker interacts with iptables, how to control that behavior, and how to set up proper firewall rules that work alongside Docker rather than against it.

## How Docker Manipulates iptables

When you run a container with `-p 5432:5432`, Docker does not simply open port 5432 on the host. It creates rules in the `DOCKER` chain within the `nat` and `filter` tables. These rules use DNAT (Destination Network Address Translation) to forward traffic from the host port to the container's IP and port.

The problem is that Docker's rules get inserted before your `INPUT` chain rules. This means traffic flows through Docker's chain and reaches the container without ever hitting your firewall's INPUT rules.

View Docker's current iptables rules:

```bash
# List all rules in the DOCKER chain to see what Docker has opened
sudo iptables -L DOCKER -n -v
```

See the NAT rules Docker has created:

```bash
# Show the DOCKER chain in the nat table for port forwarding rules
sudo iptables -t nat -L DOCKER -n -v
```

## Preventing Docker from Modifying iptables

The nuclear option is to tell Docker not to touch iptables at all. This gives you full control but means you must manually configure all container networking rules.

Edit the Docker daemon configuration:

```json
// /etc/docker/daemon.json - Disable Docker's iptables management
{
  "iptables": false
}
```

Restart Docker for the change to take effect:

```bash
# Restart the Docker daemon to apply the new configuration
sudo systemctl restart docker
```

After disabling iptables management, you must set up forwarding rules yourself for container networking to work. This includes rules for container-to-container communication, container-to-internet access, and published port forwarding.

This is the base set of rules you need:

```bash
# Allow traffic between containers on the docker0 bridge
sudo iptables -A FORWARD -i docker0 -o docker0 -j ACCEPT

# Allow containers to reach the internet through NAT
sudo iptables -A FORWARD -i docker0 ! -o docker0 -j ACCEPT
sudo iptables -A FORWARD -o docker0 -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT

# Set up masquerading so containers can reach external networks
sudo iptables -t nat -A POSTROUTING -s 172.17.0.0/16 ! -o docker0 -j MASQUERADE
```

## The DOCKER-USER Chain (Recommended Approach)

Instead of disabling Docker's iptables integration entirely, use the `DOCKER-USER` chain. Docker processes this chain before its own rules, giving you a place to insert custom filtering without breaking Docker's networking.

Block all external access to a specific published port:

```bash
# Block external access to port 5432 (PostgreSQL) while allowing internal traffic
sudo iptables -I DOCKER-USER -i eth0 -p tcp --dport 5432 -j DROP
```

Allow access only from a specific IP range:

```bash
# Allow only the office network (10.0.1.0/24) to reach port 5432
sudo iptables -I DOCKER-USER -i eth0 -p tcp --dport 5432 -s 10.0.1.0/24 -j RETURN
sudo iptables -I DOCKER-USER -i eth0 -p tcp --dport 5432 -j DROP
```

The order matters here. The `RETURN` rule for the allowed subnet must come before the `DROP` rule. The `RETURN` target tells iptables to continue processing the packet through Docker's normal chains.

Allow access from a specific IP only:

```bash
# Allow only the monitoring server to reach port 9090 (Prometheus)
sudo iptables -I DOCKER-USER -i eth0 -p tcp --dport 9090 -s 10.0.1.50 -j RETURN
sudo iptables -A DOCKER-USER -i eth0 -p tcp --dport 9090 -j DROP
```

## Binding to Localhost Instead of All Interfaces

The simplest way to prevent external access is to bind published ports to localhost only:

```bash
# Bind to localhost so only the host machine can reach the container
docker run -d --name postgres -p 127.0.0.1:5432:5432 postgres:16
```

In Docker Compose:

```yaml
# docker-compose.yml - Bind sensitive services to localhost only
services:
  postgres:
    image: postgres:16-alpine
    ports:
      # Only accessible from the host machine, not from the network
      - "127.0.0.1:5432:5432"
    environment:
      POSTGRES_PASSWORD: secret

  redis:
    image: redis:7-alpine
    ports:
      # Same for Redis, restrict to localhost
      - "127.0.0.1:6379:6379"

  # The web application is the only service exposed externally
  web:
    build: .
    ports:
      - "0.0.0.0:80:80"
      - "0.0.0.0:443:443"
```

## Using Docker Network Isolation

Docker's internal network features provide another layer of control. By default, all containers on a network can talk to each other. You can restrict this with the `internal` network option.

Create an internal network that has no outbound internet access:

```yaml
# docker-compose.yml - Internal network with no internet access
version: "3.8"

services:
  app:
    build: .
    networks:
      - frontend
      - backend

  database:
    image: postgres:16-alpine
    networks:
      # The database only connects to the internal backend network
      - backend

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    networks:
      - frontend

networks:
  frontend:
    driver: bridge
  backend:
    # Internal networks cannot reach the internet
    driver: bridge
    internal: true
```

In this setup, the database can only communicate with the app service through the backend network. It cannot reach the internet and is not accessible from outside the Docker host.

## Per-Container Firewall Rules with nftables

For more granular control, use nftables rules targeting specific container IP addresses.

First, find the container's IP:

```bash
# Get the IP address of a specific container
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' my-container
```

Apply rules for that container:

```bash
# Block a specific container from reaching external DNS servers
sudo nft add rule ip filter DOCKER-USER ip saddr 172.17.0.5 tcp dport 53 drop
sudo nft add rule ip filter DOCKER-USER ip saddr 172.17.0.5 udp dport 53 drop
```

Since container IPs can change, a better approach is to use the container's network subnet:

```bash
# Allow only HTTP/HTTPS outbound from the application network
sudo iptables -I DOCKER-USER -s 172.20.0.0/16 -p tcp --dport 80 -j RETURN
sudo iptables -I DOCKER-USER -s 172.20.0.0/16 -p tcp --dport 443 -j RETURN
sudo iptables -I DOCKER-USER -s 172.20.0.0/16 -p tcp -j DROP
```

## Making Firewall Rules Persistent

iptables rules do not survive reboots by default. You need to persist them.

On Debian/Ubuntu:

```bash
# Save current iptables rules to a file that loads on boot
sudo apt install iptables-persistent
sudo netfilter-persistent save
```

On RHEL/CentOS:

```bash
# Save iptables rules for automatic restoration on boot
sudo iptables-save > /etc/sysconfig/iptables
sudo systemctl enable iptables
```

Alternatively, create a systemd service that loads your custom rules after Docker starts:

```ini
# /etc/systemd/system/docker-firewall.service
[Unit]
Description=Custom Docker Firewall Rules
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
ExecStart=/usr/local/bin/docker-firewall.sh
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

The firewall script:

```bash
#!/bin/bash
# /usr/local/bin/docker-firewall.sh - Apply custom firewall rules for Docker

# Flush existing custom rules in DOCKER-USER
iptables -F DOCKER-USER

# Allow established connections
iptables -A DOCKER-USER -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN

# Allow access to port 80 and 443 from anywhere
iptables -A DOCKER-USER -p tcp --dport 80 -j RETURN
iptables -A DOCKER-USER -p tcp --dport 443 -j RETURN

# Allow access to all ports from the office network
iptables -A DOCKER-USER -s 10.0.1.0/24 -j RETURN

# Allow access from VPN network
iptables -A DOCKER-USER -s 10.8.0.0/24 -j RETURN

# Drop everything else coming from external interfaces
iptables -A DOCKER-USER -i eth0 -j DROP

# Final return for traffic from other interfaces (internal)
iptables -A DOCKER-USER -j RETURN
```

Enable and start the service:

```bash
# Make the script executable and enable the systemd service
sudo chmod +x /usr/local/bin/docker-firewall.sh
sudo systemctl enable docker-firewall
sudo systemctl start docker-firewall
```

## Verifying Your Firewall Rules

After setting up rules, verify they work as expected.

Test from an external machine:

```bash
# Test if a port is reachable from outside (run from a different machine)
nmap -p 5432,6379,80,443 your-docker-host-ip
```

Check from inside a container:

```bash
# Verify that an internal container cannot reach the internet
docker exec database ping -c 2 8.8.8.8
```

View the complete rule set:

```bash
# Display all iptables rules across all tables, including Docker's chains
sudo iptables -L -n -v --line-numbers
sudo iptables -t nat -L -n -v --line-numbers
```

## Logging Dropped Traffic

Add logging rules before your DROP rules to troubleshoot blocked connections:

```bash
# Log dropped packets before they are dropped (limited to 5 per minute)
sudo iptables -I DOCKER-USER -i eth0 -p tcp --dport 5432 -j LOG \
  --log-prefix "DOCKER-BLOCKED: " --log-level 4 -m limit --limit 5/min
sudo iptables -A DOCKER-USER -i eth0 -p tcp --dport 5432 -j DROP
```

View the logs:

```bash
# Check kernel logs for blocked Docker traffic
sudo journalctl -k | grep "DOCKER-BLOCKED"
```

## Summary

Docker's iptables integration is designed for convenience, not security. By default, published ports bypass your host firewall entirely. Use the `DOCKER-USER` chain to insert rules that Docker respects. Bind sensitive services to `127.0.0.1` instead of all interfaces. Use Docker's `internal` network option to isolate backend services from the internet. Persist your firewall rules with a systemd service that runs after Docker starts. Always verify your rules with port scans from an external machine to confirm that only the intended services are reachable.
