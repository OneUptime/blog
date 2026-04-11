# How to Set Up Redis Behind a Firewall

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, Firewall, Network, Linux

Description: Learn how to protect Redis with firewall rules using iptables and UFW, allowing only authorized hosts to connect while blocking all other access.

---

Redis has no built-in network-level protection beyond its bind directive and password. Combining Redis's own settings with OS-level firewall rules provides defense in depth.

## Bind Redis to a Specific Interface

First, restrict which network interface Redis listens on. Edit `/etc/redis/redis.conf`:

```text
# Only listen on localhost and a specific private IP
bind 127.0.0.1 10.0.1.5

# Keep protected mode enabled for an extra safeguard
protected-mode yes
```

Restart Redis:

```bash
sudo systemctl restart redis
```

## Set Up UFW Rules (Ubuntu/Debian)

Allow Redis port only from specific application servers:

```bash
# Allow only specific application server IPs
sudo ufw allow from 10.0.1.10 to any port 6379
sudo ufw allow from 10.0.1.11 to any port 6379
sudo ufw allow from 10.0.1.12 to any port 6379

# Deny Redis port from all other sources
sudo ufw deny 6379

sudo ufw reload
```

Allow TLS port if using encrypted connections:

```bash
sudo ufw allow from 10.0.1.0/24 to any port 6380
```

## Set Up iptables Rules

For systems using iptables directly:

```bash
# Drop all connections to Redis port by default
sudo iptables -A INPUT -p tcp --dport 6379 -j DROP

# Allow connections from app server subnet
sudo iptables -I INPUT -p tcp -s 10.0.1.0/24 --dport 6379 -j ACCEPT

# Allow localhost
sudo iptables -I INPUT -p tcp -s 127.0.0.1 --dport 6379 -j ACCEPT

# Save rules
sudo sh -c 'iptables-save > /etc/iptables/rules.v4'
```

## Block Redis from the Public Interface

If your server has a public IP (e.g., `203.0.113.5`), explicitly block Redis on that interface:

```bash
sudo iptables -A INPUT -i eth0 -p tcp --dport 6379 -j DROP
```

## Verify the Firewall Rules

Check that Redis is not accessible from outside:

```bash
# From an unauthorized host
redis-cli -h your-server-public-ip -p 6379 PING
# Should timeout or get connection refused

# From authorized app server
redis-cli -h 10.0.1.5 -p 6379 PING
# PONG
```

## Use Security Groups on Cloud Platforms

For AWS, Azure, or GCP:

```text
Inbound rule: Allow TCP 6379 from 10.0.1.0/24 (app subnet)
Inbound rule: Deny TCP 6379 from 0.0.0.0/0
```

This ensures Redis is never exposed to the public internet.

## Summary

Protect Redis at the network level by binding it to private interfaces in `redis.conf` and adding firewall rules that allow only trusted application server IPs to reach the Redis port. Always block the Redis port on public-facing interfaces, and use cloud security groups as an additional layer.
