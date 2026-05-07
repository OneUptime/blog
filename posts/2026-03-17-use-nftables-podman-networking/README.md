# How to Use nftables with Podman Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Networking, nftables, Security

Description: Learn how to use nftables to manage firewall rules for Podman container networking on modern Linux systems.

---

> nftables is the successor to iptables and provides a cleaner syntax for managing packet filtering rules on Podman hosts.

Modern Linux distributions are migrating from iptables to nftables as the default packet filtering framework. Podman 4.x and later use Netavark as the default network backend on new systems, and Netavark supports nftables as a firewall driver. This guide assumes rootful Podman bridge networking with Netavark configured to use nftables, and covers how to write nftables rules that control traffic to and from Podman containers.

---

## Checking nftables Status

```bash
# Verify nftables is available

nft --version

# List existing rulesets
sudo nft list ruleset
```

## Viewing Podman-Generated Rules

```bash
# Run a container with a published port
podman run -d --name webapp -p 8080:80 docker.io/library/nginx:alpine

# List the nftables ruleset to see Netavark-created rules
sudo nft list ruleset | grep -A 5 "netavark"
```

## Creating a Table for Container Rules

```bash
# Create a dedicated table for container firewall rules
sudo nft add table inet podman-filter

# Add a forward chain for traffic to containers
sudo nft 'add chain inet podman-filter forward { type filter hook forward priority 0; policy accept; }'
```

## Restricting Access to a Published Port

```bash
# Get the container IP
CONTAINER_IP=$(podman inspect webapp --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')

# Allow only a specific source to reach the container
sudo nft add rule inet podman-filter forward \
  ip daddr "$CONTAINER_IP" tcp dport 80 \
  ip saddr 192.168.1.0/24 accept

# Drop all other traffic to the container
sudo nft add rule inet podman-filter forward \
  ip daddr "$CONTAINER_IP" tcp dport 80 drop
```

## Logging Container Traffic

```bash
# Add a logging rule at the beginning of the chain
sudo nft insert rule inet podman-filter forward \
  ip daddr "$CONTAINER_IP" tcp dport 80 \
  log prefix "podman-webapp: " level info

# View logs in the system journal
sudo journalctl -k --grep "podman-webapp" --no-pager -n 10
```

## Rate Limiting Connections

```bash
# Drop new connections above 20 per minute
sudo nft insert rule inet podman-filter forward \
  ip daddr "$CONTAINER_IP" tcp dport 80 \
  ct state new \
  limit rate over 20/minute drop
```

## Blocking Outbound Traffic from Containers

```bash
# Block all outbound traffic from the container subnet except local
sudo nft add rule inet podman-filter forward \
  ip saddr 10.88.0.0/16 ip daddr != 10.88.0.0/16 drop
```

## Persisting Rules Across Reboots

```bash
# Save the current ruleset to a file
sudo nft list ruleset > /etc/nftables-podman.conf

# Load rules on boot by adding to the nftables service config
# Add this line to /etc/sysconfig/nftables.conf:
# include "/etc/nftables-podman.conf"

# Restart nftables to apply
sudo systemctl restart nftables
```

## Summary

nftables provides a modern, unified interface for managing Podman container firewall rules. Create dedicated tables and chains for container traffic, use nft rules to restrict access, log packets, and rate limit connections. Persist your rules to ensure they survive reboots.
