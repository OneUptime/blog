# How to Enable Redis Remote Connections on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, IPv4, Remote Connections, Security, Authentication, Cache

Description: Enable Redis to accept remote IPv4 connections by configuring bind, requirepass, and firewall rules, while maintaining security through authentication and network-level access control.

## Introduction

Enabling Redis remote connections requires three steps: configure `bind` to include the server's IP, set `requirepass` for authentication, and open port 6379 in the firewall for trusted IPs only. Never expose Redis to the public internet; if you need remote access, combine authentication with firewall rules and prefer TLS, SSH tunnels, or a VPN over untrusted networks.

## Configuration Steps

```bash
# /etc/redis/redis.conf

# Step 1: Bind to server IP (add your IP after 127.0.0.1)

bind 127.0.0.1 10.0.0.5

# Step 2: Set a strong password
requirepass "YourStrongPasswordHere!"

# Step 3: Keep protected mode enabled
# With bind set explicitly and authentication configured, remote clients can connect
protected-mode yes

# Optional: Change default port for obscurity
# port 6380
```

```bash
# Apply changes
sudo systemctl restart redis-server
sudo systemctl status redis-server

# Verify listening
sudo ss -tlnp | grep redis
# Expected: 127.0.0.1:6379 and 10.0.0.5:6379
```

## Firewall Rules

```bash
# Allow Redis only from specific trusted IPs
sudo ufw allow proto tcp from 10.0.0.10 to any port 6379    # App server 1
sudo ufw allow proto tcp from 10.0.0.11 to any port 6379    # App server 2
sudo ufw deny proto tcp to any port 6379                    # Block all others

# iptables
sudo iptables -A INPUT -p tcp --dport 6379 -s 10.0.0.10/32 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 6379 -s 10.0.0.11/32 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 6379 -j DROP

# For a subnet:
sudo iptables -A INPUT -p tcp --dport 6379 -s 10.0.0.0/24 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 6379 -j DROP
```

## Testing Remote Connection

```bash
# From app server (10.0.0.10):
redis-cli -h 10.0.0.5 -p 6379 -a 'YourStrongPasswordHere!' ping
# Expected: PONG

# Test authentication
redis-cli -h 10.0.0.5 -p 6379 AUTH 'YourStrongPasswordHere!'
# Expected: OK

# Test without password (should fail)
redis-cli -h 10.0.0.5 ping
# Expected: NOAUTH Authentication required.

# Run a simple SET/GET
redis-cli -h 10.0.0.5 -p 6379 -a 'YourStrongPasswordHere!' SET testkey "hello"
redis-cli -h 10.0.0.5 -p 6379 -a 'YourStrongPasswordHere!' GET testkey
# Expected: "hello"
```

## Using Redis with Application Config

```python
# Python (redis-py)
import redis
r = redis.Redis(host='10.0.0.5', port=6379, password='YourStrongPasswordHere!', db=0)
r.ping()
```

```javascript
// Node.js (ioredis)
const Redis = require('ioredis');
const client = new Redis({ host: '10.0.0.5', port: 6379, password: 'YourStrongPasswordHere!' });
```

```text
# Redis URL format
redis://default:YourStrongPasswordHere!@10.0.0.5:6379/0
```

## Conclusion

Enable Redis remote connections by adding the server IPv4 to `bind`, setting `requirepass`, and keeping `protected-mode` enabled. Use iptables to restrict which client IPs can reach port 6379; Redis has no built-in source IP filtering. Never expose Redis on the public internet; prefer SSH tunnels, VPN, or TLS for accessing Redis over untrusted networks.
