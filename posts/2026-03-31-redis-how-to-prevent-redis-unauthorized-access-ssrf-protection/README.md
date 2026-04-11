# How to Prevent Redis Unauthorized Access (SSRF Protection)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, SSRF, Unauthorized Access, Network Security

Description: Learn how to protect Redis from unauthorized access including SSRF attacks, with network isolation, authentication, command restrictions, and firewall rules.

---

## Understanding the Threat

Redis unauthorized access typically occurs through:

1. **SSRF (Server-Side Request Forgery)** - An attacker tricks a server into making requests to the internal Redis endpoint
2. **Exposed Redis** - Redis bound to `0.0.0.0` without a firewall, accessible from the internet
3. **Misconfigured cloud security groups** - Redis ports open to the public internet in cloud environments
4. **Application-level SSRF** - Web apps with URL-fetching features that can be weaponized to reach internal services

In all cases, an unauthenticated Redis server can be used to read/write data or execute dangerous commands.

## Attack Vector: SSRF to Redis

A vulnerable web application that fetches user-provided URLs can be exploited to reach Redis:

```text
Attacker --> Web App (SSRF) --> http://127.0.0.1:6379/
                                (Redis on localhost)
```

Redis interprets HTTP headers as commands. Specially crafted HTTP requests can execute Redis commands through SSRF.

## Protection 1 - Require Authentication

Always set a strong password:

```text
requirepass "VeryLongRandomPassword32CharsMin"
```

Even if an attacker reaches the Redis port via SSRF, they cannot execute commands without the password.

Generate a strong password:

```bash
openssl rand -base64 32
```

With authentication, SSRF to Redis results in:

```text
-NOAUTH Authentication required.
```

## Protection 2 - Bind to Localhost or Private Interface Only

Never bind Redis to `0.0.0.0` in production:

```text
# Bind to localhost only
bind 127.0.0.1

# Or bind to a specific private IP
bind 127.0.0.1 192.168.1.10
```

This prevents any external connections, including SSRF from external networks.

## Protection 3 - Enable Protected Mode

Protected mode blocks all external connections when no password and no explicit bind are set:

```text
protected-mode yes
```

This is a last-resort safeguard. Do not rely on it - set explicit bind and password.

## Protection 4 - Firewall Rules

Add firewall rules to restrict Redis access to trusted application servers only:

```bash
# Allow only the app server to reach Redis
iptables -A INPUT -p tcp --dport 6379 -s 192.168.1.100 -j ACCEPT
iptables -A INPUT -p tcp --dport 6379 -j DROP

# Or use ufw
ufw allow from 192.168.1.100 to any port 6379
ufw deny 6379
```

Cloud environments:

```bash
# AWS Security Group - allow only application servers
aws ec2 authorize-security-group-ingress \
  --group-id sg-redis \
  --protocol tcp \
  --port 6379 \
  --source-group sg-app-servers
```

## Protection 5 - Disable Dangerous Commands

Rename or disable commands that can be abused via SSRF:

```text
rename-command CONFIG ""
rename-command DEBUG ""
rename-command SLAVEOF ""
rename-command REPLICAOF ""
rename-command FLUSHALL ""
rename-command MODULE ""
rename-command SAVE ""
```

These commands can be used to write files to disk, change replication targets, or load malicious modules.

## Protection 6 - Enable TLS

TLS prevents SSRF attacks that work by injecting HTTP requests into plain-text Redis streams:

```text
port 0
tls-port 6380
tls-cert-file /etc/ssl/redis/redis.crt
tls-key-file /etc/ssl/redis/redis.key
tls-ca-cert-file /etc/ssl/redis/ca.crt
tls-auth-clients yes
```

An SSRF HTTP request to a TLS-only Redis endpoint will fail the TLS handshake.

## Protection 7 - Sanitize Application-Level SSRF

In your web application, validate and restrict URLs that can be fetched:

```python
from urllib.parse import urlparse

ALLOWED_SCHEMES = {"http", "https"}
BLOCKED_HOSTS = {"localhost", "127.0.0.1", "::1", "0.0.0.0"}

def is_safe_url(url):
    parsed = urlparse(url)
    if parsed.scheme not in ALLOWED_SCHEMES:
        return False
    if parsed.hostname in BLOCKED_HOSTS:
        return False
    # Also check for private IP ranges
    return True
```

## Protection 8 - Run Redis in a Separate Network Namespace or Container

Isolate Redis so only the application container can reach it:

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7
    command: redis-server --requirepass "${REDIS_PASSWORD}"
    networks:
      - internal

  app:
    image: myapp
    networks:
      - internal
      - public

networks:
  internal:
    internal: true  # no external internet access
  public:
```

## Verifying Your Configuration

Test from an untrusted source:

```bash
# Try connecting from an untrusted IP
redis-cli -h redis-host -p 6379 PING
```

Expected with proper configuration:

```text
(error) NOAUTH Authentication required. # (if auth is configured)
Could not connect to Redis at redis-host:6379: Connection refused # (if firewall blocks)
```

If you see `PONG` without providing credentials, your Redis server is not properly secured.

## Summary

Preventing unauthorized Redis access requires layered defenses: bind to trusted interfaces only, require strong authentication, apply firewall rules restricting access to application servers, disable dangerous commands, enable TLS, and sanitize SSRF vectors at the application layer. Never run Redis exposed to the public internet without all of these protections in place. SSRF attacks on Redis are a well-documented attack vector - treat Redis access as seriously as database access.
