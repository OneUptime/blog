# How to Configure Redis Protected Mode

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, Protected Mode, Configuration, Network

Description: Learn how Redis protected mode works, when to enable or disable it, and how it prevents accidental exposure of an unauthenticated Redis instance.

---

## What Is Redis Protected Mode?

Redis protected mode is a security feature enabled by default that prevents Redis from accepting connections from external network interfaces when no authentication is configured. It acts as a safety net for common misconfiguration scenarios.

When protected mode is on and Redis detects it may be exposed to the internet (bound to something other than loopback and no password is set), it rejects all external connections.

## How Protected Mode Works

Protected mode activates when ALL of the following are true:
1. `protected-mode yes` is set (the default)
2. No explicit `bind` directive is configured (Redis defaults to listening on all interfaces)
3. No password has been set via `requirepass` or ACL

When triggered, Redis responds to external connections with:

```text
DENIED Redis is running in protected mode because no password is configured.
In this mode connections are only accepted from the loopback interface.
If you want to connect from external computers to Redis you may adopt one of the following solutions:
1) Just disable protected mode sending the command 'CONFIG SET protected-mode no' from the loopback interface by connecting to Redis from the same host the server is running, however MAKE SURE Redis is not publicly accessible from internet if you do so.
2) Alternatively you can just disable the protected mode by editing the Redis configuration file, and setting the protected-mode option to 'no', and then restarting the server.
3) If you started the server manually just for testing, restart it with the '--protected-mode no' option.
4) Setup a bind address or an authentication password.
```

## Configuration

```text
# redis.conf

# Default - protected mode enabled
protected-mode yes

# Disable for internal network use (must set password or bind restriction)
protected-mode no
```

## When to Disable Protected Mode

Disable protected mode only when you have an alternative security measure in place:

**Option 1: Set a password**

```text
# redis.conf
protected-mode yes
requirepass your_strong_password_here
bind 0.0.0.0
```

**Option 2: Restrict bind address**

```text
# redis.conf
protected-mode yes
bind 127.0.0.1 10.0.1.5  # Only internal interfaces
```

**Option 3: Disable with external firewall control**

```text
# redis.conf
protected-mode no
bind 127.0.0.1  # Still bind to loopback
# External firewall blocks port 6379 at network level
```

## Checking Protected Mode Status

```bash
# Check current setting
redis-cli CONFIG GET protected-mode
# 1) "protected-mode"
# 2) "yes"

# Disable at runtime (not persisted across restart)
redis-cli CONFIG SET protected-mode no

# Check from redis-cli INFO
redis-cli INFO server | grep protected
# (no direct field, but CONFIG GET shows it)
```

## Protected Mode in Docker and Development

For local development with Docker:

```bash
# Development - disable protected mode with explicit flag
docker run -d \
  --name redis-dev \
  -p 127.0.0.1:6379:6379 \
  redis:7-alpine \
  redis-server --protected-mode no
```

```yaml
# docker-compose.yml for development
services:
  redis:
    image: redis:7-alpine
    command: redis-server --protected-mode no
    ports:
      - "127.0.0.1:6379:6379"  # Bind only to loopback on host
```

For production in Docker:

```yaml
# docker-compose.yml for production
services:
  redis:
    image: redis:7-alpine
    command: >
      redis-server
      --protected-mode yes
      --requirepass "${REDIS_PASSWORD}"
      --bind 0.0.0.0
    networks:
      - backend
    # No ports exposed to host
```

## Python Example: Detecting Protected Mode Issues

```python
import redis

def test_redis_connection(host: str, port: int, password: str = None) -> dict:
    """Test Redis connection and detect common configuration issues."""
    try:
        r = redis.Redis(host=host, port=port, password=password, socket_timeout=3)
        r.ping()
        return {"status": "ok", "message": "Connected successfully"}
    except redis.ResponseError as e:
        error_str = str(e)
        if "DENIED" in error_str and "protected mode" in error_str:
            return {
                "status": "error",
                "type": "protected_mode",
                "message": "Redis protected mode is blocking connection - set a password or restrict bind",
                "detail": error_str
            }
        return {"status": "error", "type": "auth_error", "message": error_str}
    except redis.ConnectionError as e:
        return {"status": "error", "type": "connection", "message": str(e)}

result = test_redis_connection("192.168.1.100", 6379)
print(result)
```

## Protected Mode vs requirepass

These are complementary, not alternatives:

| Feature | Purpose |
|---------|---------|
| protected-mode | Prevents remote connections when no auth is set |
| requirepass | Requires a password for all connections |

A production Redis should have BOTH:

```text
# redis.conf - production security baseline
protected-mode yes
requirepass your_strong_password
bind 127.0.0.1 10.0.1.5
```

## Common Mistake: Disabling Without Replacement

```bash
# WRONG: disabling protected mode without adding authentication
redis-cli CONFIG SET protected-mode no
# Now Redis accepts connections from anywhere with no authentication
```

```bash
# RIGHT: disable protected mode only after adding authentication
redis-cli CONFIG SET requirepass "strong_password_here"
redis-cli -a "strong_password_here" CONFIG SET protected-mode no
```

## Summary

Redis protected mode is an automatic safety net that blocks external connections when no authentication is configured. Keep it enabled (`protected-mode yes`) in production and pair it with `requirepass` or ACL-based authentication plus bind address restrictions. Disable it only in development environments or when you have explicit external firewall rules controlling Redis access. Never disable protected mode without adding an alternative security layer.
