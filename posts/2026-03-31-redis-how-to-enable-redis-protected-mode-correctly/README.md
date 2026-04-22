# How to Enable Redis Protected Mode Correctly

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Security, Protected Mode, Configuration, Production Hardening

Description: Understand Redis protected mode, when it activates, how to configure it correctly for production, and how to avoid common mistakes that leave Redis exposed.

---

## What Is Redis Protected Mode?

Redis protected mode is a safety feature introduced in Redis 3.2 that prevents Redis from accepting connections from external hosts when it is not properly secured. When protected mode is active and no password is set, Redis only accepts connections from the loopback interfaces (127.0.0.1 and ::1).

Protected mode is designed to protect against accidentally exposing an unsecured Redis instance to the internet.

## When Does Protected Mode Activate?

Redis enters protected mode when ALL of the following are true:
1. `protected-mode yes` is set in redis.conf (the default)
2. No password is set for the default user (no `requirepass` and no ACL password)

In Redis versions before 7.0, there was an additional condition: no `bind` directive was explicitly configured. Starting with Redis 7.0, the bind directive no longer affects whether protected mode activates - only the two conditions above matter.

If any of those conditions is false, protected mode does not restrict connections.

## Checking Protected Mode Status

```bash
# Check current protected mode setting
redis-cli CONFIG GET protected-mode

# Check what addresses Redis is bound to
redis-cli CONFIG GET bind

# Check if a password is set
redis-cli CONFIG GET requirepass
```

## Correct Configuration for Production

### Option 1 - Bind to a specific interface (recommended)

```bash
# redis.conf
bind 127.0.0.1 10.0.0.5    # Loopback + private network interface only
protected-mode yes           # Keep enabled as belt-and-suspenders
requirepass yourStrongPassword123
```

This is the recommended approach. Redis only accepts connections from the loopback and private network interface, and requires a password.

### Option 2 - Password only (all interfaces)

```bash
# redis.conf
bind 0.0.0.0               # Accept from all interfaces
protected-mode yes
requirepass yourStrongPassword123
```

When a password is set, protected mode is satisfied and external connections are allowed - but all clients must authenticate.

### Option 3 - Disable for containerized environments

In Docker or Kubernetes, containers communicate on an isolated network. You may disable protected mode if the network layer provides isolation:

```bash
# redis.conf for containerized Redis
bind 0.0.0.0
protected-mode no
# Still set a password even in containers!
requirepass yourStrongPassword123
```

Or pass as a flag:

```bash
docker run -d redis:7 redis-server --protected-mode no --requirepass yourPassword
```

## Setting Protected Mode at Runtime

```bash
# Enable protected mode
redis-cli CONFIG SET protected-mode yes

# Disable protected mode (use with caution)
redis-cli CONFIG SET protected-mode no
```

Note: Changes made with CONFIG SET are not persistent. Update `redis.conf` and run `CONFIG REWRITE` to persist:

```bash
redis-cli CONFIG REWRITE
```

## Common Mistakes

### Mistake 1 - Disabling protected mode without a password

```bash
# WRONG - leaves Redis open to the internet
bind 0.0.0.0
protected-mode no
# requirepass not set
```

This is dangerous. Any host that can reach port 6379 can execute any command.

### Mistake 2 - Relying on protected mode alone

```bash
# INSUFFICIENT - protected mode is not a firewall
protected-mode yes
bind 0.0.0.0
# requirepass not set
```

Always add a firewall rule (security group, iptables) to restrict access to port 6379.

### Mistake 3 - Using a weak password

```bash
requirepass redis123    # too weak, easily brute-forced
```

Use a long random password:

```bash
openssl rand -base64 32
# Example output: K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols=
```

## Layered Security Best Practices

```text
Layer 1: Network  - Firewall/Security Groups restrict port 6379 to trusted CIDRs
Layer 2: Bind     - Bind Redis to private/loopback interfaces only
Layer 3: Auth     - requirepass with a strong password (or Redis ACLs)
Layer 4: TLS      - Enable TLS for Redis 6+ in transit encryption
Layer 5: Mode     - Keep protected-mode yes as a safety net
```

## Verifying Your Configuration

```bash
# Test from an untrusted host - should fail or require password
redis-cli -h your-redis-host ping

# Test with password
redis-cli -h your-redis-host -a yourPassword ping

# Check all security-related settings
redis-cli INFO server | grep -E "redis_version|tcp_port"
redis-cli CONFIG GET bind
redis-cli CONFIG GET protected-mode
redis-cli CONFIG GET requirepass
```

## Summary

Redis protected mode is a useful safety net but not a complete security solution. For production, always bind Redis to specific private interfaces, set a strong password with `requirepass`, and restrict port 6379 at the network level with firewall rules. Keep protected mode enabled as an additional layer, and use TLS on Redis 6+ to encrypt data in transit.
