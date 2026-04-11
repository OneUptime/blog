# How to Secure Redis in Production (Complete Checklist)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, Production, Checklist, Best Practice

Description: A complete security checklist for Redis in production, covering network isolation, authentication, TLS, ACLs, command restrictions, and monitoring.

---

## Why Redis Security Matters

Redis was designed for trusted, internal networks. By default, it listens on all interfaces with no authentication. Exposing Redis to untrusted networks can lead to:

- Unauthorized data access or deletion
- Remote code execution via CONFIG SET and SLAVEOF/REPLICAOF
- Server compromise through crafted commands
- Data exfiltration

This checklist covers all critical areas to secure a production Redis deployment.

---

## 1. Network Isolation

### Bind to specific interfaces only

```text
# redis.conf
bind 127.0.0.1 192.168.1.10
```

Never bind to `0.0.0.0` unless behind a firewall that restricts access.

### Use firewall rules

Allow only trusted hosts to connect:

```bash
# iptables example
iptables -A INPUT -p tcp --dport 6379 -s 192.168.1.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 6379 -j DROP
```

### Enable protected-mode

When no password or bind address is set, protected-mode blocks external connections:

```text
protected-mode yes
```

---

## 2. Authentication

### Set a strong requirepass

```text
requirepass "use-a-long-random-password-minimum-32-chars"
```

Generate a strong password:

```bash
openssl rand -base64 32
```

### Use ACLs for multi-user access

Define separate users with minimal permissions:

```text
# redis.conf
user appuser on >appPassword ~app:* &* +@read +@write
user readuser on >readPassword ~* &* +@read
user default off
```

---

## 3. TLS Encryption

### Enable TLS for client connections

```text
port 0
tls-port 6380
tls-cert-file /etc/ssl/redis/redis.crt
tls-key-file /etc/ssl/redis/redis.key
tls-ca-cert-file /etc/ssl/redis/ca.crt
tls-auth-clients yes
```

Setting `port 0` disables the non-TLS listener. Without it, Redis will still accept unencrypted connections on port 6379.

### Enable TLS for replication

```text
tls-replication yes
```

### Test TLS connection

```bash
redis-cli --tls \
  --cert /etc/ssl/redis/client.crt \
  --key /etc/ssl/redis/client.key \
  --cacert /etc/ssl/redis/ca.crt \
  -p 6380 PING
```

---

## 4. Disable or Rename Dangerous Commands

Rename or disable commands that can be used for remote code execution or data destruction:

```text
rename-command CONFIG ""
rename-command DEBUG ""
rename-command SLAVEOF ""
rename-command REPLICAOF ""
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command KEYS ""
```

Or use ACLs to restrict commands:

```text
user appuser on >password ~* &* -@all +@read +@write +DEL +EXPIRE
```

---

## 5. Disable Unused Features

If you do not use Lua scripting, disable it:

```text
# Disable eval in newer versions via ACL
user default off
user appuser on >pass ~* &* +@all -EVAL -EVALSHA
```

Disable keyspace notifications if not needed:

```text
notify-keyspace-events ""
```

---

## 6. Run as a Non-Root User

Redis should never run as root:

```bash
# Create a dedicated user
useradd -r -s /bin/false redis

# Set ownership
chown -R redis:redis /var/lib/redis /etc/redis

# Run Redis as the redis user
su -s /bin/bash redis -c "redis-server /etc/redis/redis.conf"
```

Or with systemd:

```text
[Service]
User=redis
Group=redis
```

---

## 7. Secure the Configuration File

Protect `redis.conf` from other users:

```bash
chmod 640 /etc/redis/redis.conf
chown root:redis /etc/redis/redis.conf
```

---

## 8. Persistence Security

Ensure the RDB and AOF files are readable only by the redis user:

```bash
chmod 700 /var/lib/redis
chown -R redis:redis /var/lib/redis
```

---

## 9. Audit Logging

Enable keyspace notifications or use the `monitor` command for auditing (carefully - MONITOR has performance overhead):

```bash
redis-cli MONITOR
```

For production auditing, use an ACL log:

```bash
redis-cli ACL LOG
```

---

## 10. Keep Redis Updated

Redis regularly releases security patches. Subscribe to the Redis mailing list and update promptly:

```bash
# Check current version
redis-cli INFO server | grep redis_version

# Update via package manager
apt-get update && apt-get upgrade redis-server
```

---

## Quick Checklist

```text
[x] Bind to specific interfaces
[x] Enable firewall rules restricting port 6379
[x] Set requirepass with a strong password
[x] Use ACLs for multi-user environments
[x] Enable TLS for client and replication traffic
[x] Rename or disable dangerous commands
[x] Run Redis as a non-root user
[x] Protect redis.conf file permissions
[x] Secure data directory permissions
[x] Enable audit logging
[x] Keep Redis version up to date
```

## Summary

Securing Redis in production requires a layered approach: network isolation, strong authentication, TLS encryption, ACL-based command restrictions, and running as a non-root user. Regularly audit your configuration against this checklist and keep Redis up to date with security patches. A compromised Redis instance can lead to full server takeover, so treat it with the same security rigor as your database servers.
