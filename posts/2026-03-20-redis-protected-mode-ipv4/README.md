# How to Configure Redis protected-mode for IPv4 Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, IPv4, Protected-mode, Security, Configuration, Cache

Description: Understand Redis protected-mode behavior, when to enable or disable it, and how to safely configure Redis for remote IPv4 access while maintaining security.

## Introduction

Redis `protected-mode` (introduced in 3.2) is a safety net that, in current Redis Open Source releases, blocks non-loopback connections when the default user has no password configured. When enabled under those conditions, Redis replies to remote connections with an error message rather than allowing unauthenticated access. Understanding when to enable or disable it is essential for secure deployments.

## How protected-mode Works

```bash
# protected-mode = yes (default):

# If Redis:
#   - Has protected-mode enabled
#   AND
#   - The default user has no password
# Then: Non-loopback connections get: "DENIED Redis is running in protected mode"

# If the default user has a password (for example via requirepass or ACLs):
# Remote clients can connect, but must authenticate first

# protected-mode = no:
# If Redis is listening on a non-loopback interface,
# Redis accepts remote connections regardless of password setting
# (Dangerous without authentication and firewall!)
```

## When to Disable protected-mode

```bash
# SAFE to disable when:
# 1. The default user has a password (for example via requirepass) AND
# 2. Firewall limits which IPs can reach port 6379

# /etc/redis/redis.conf

# Bind to specific IP
bind 127.0.0.1 10.0.0.5

# Set a strong password for the default user
requirepass "StrongPassword123!"

# Now safe to disable protected mode
protected-mode no
```

## When to Keep protected-mode Enabled

```bash
# KEEP enabled when:
# - Redis has no password
# - Used as a development environment
# - Deployment might accidentally expose Redis publicly

# /etc/redis/redis.conf
protected-mode yes     # Default - keep this for safety

# If you want remote access WITH protected-mode enabled,
# you must set a password for the default user.
# `requirepass` is one way to do that:
requirepass "password"
# Redis will then allow remote connections, but clients must authenticate
```

## Protected Mode Behavior Matrix

| bind | default user password | protected-mode | Remote access |
|---|---|---|---|
| 127.0.0.1 only | any | any | Local only |
| 0.0.0.0 | not set | yes | BLOCKED |
| 0.0.0.0 | set | yes | Allowed (auth required) |
| 0.0.0.0 | not set | no | OPEN (dangerous!) |
| 10.0.0.5 | set | no | Allowed (auth required) |

## Checking Current protected-mode Status

```bash
# Check configured value
redis-cli config get protected-mode

# If you use ACLs, inspect the default user as well
redis-cli acl getuser default

# Check if Redis is currently in protected mode
redis-cli -h 10.0.0.5 ping
# If in protected mode: DENIED Redis is running in protected mode...
# If auth required: NOAUTH Authentication required.
# If OK: PONG

# Change at runtime (doesn't persist to redis.conf)
redis-cli config set protected-mode no

# Check current settings
redis-cli config get bind
redis-cli config get requirepass
```

## Recommended Production Configuration

```bash
# /etc/redis/redis.conf - production settings

# Bind to specific IPv4 only
bind 127.0.0.1 10.0.0.5

# Strong password for the default user
requirepass "Use-A-Long-Random-Password-Here!"

# Can disable protected-mode since both above are set
protected-mode no

# Additional security
# Prefer ACL rules to restrict administrative commands;
# `rename-command` is deprecated in current Redis releases

# TCP listen backlog
tcp-backlog 511
```

```bash
# Restrict at firewall level (defense in depth)
sudo iptables -A INPUT -p tcp --dport 6379 -s 10.0.0.0/24 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 6379 -j DROP
```

## Conclusion

Redis `protected-mode` is a safety guard that prevents non-loopback access when the default user has no password. Disable it only when the default user is protected with a password (for example via `requirepass`) AND firewall rules restrict port 6379 to trusted networks. Leave it enabled in development environments or when you're unsure about network exposure. The protected-mode error message is a warning that Redis is reachable from a non-local address without a password on the default user.
