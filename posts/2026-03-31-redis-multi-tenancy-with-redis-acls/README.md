# How to Implement Multi-Tenancy with Redis ACLs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, ACL, Multi-Tenancy, Security, SaaS

Description: Learn how to use Redis ACLs to create per-tenant users with key pattern restrictions so tenants can only access their own data within a shared Redis instance.

---

Redis ACLs (Access Control Lists), available since Redis 6.0, allow you to create multiple users with different permissions. Each user can be restricted to specific key patterns, commands, and channels, making ACLs a scalable multi-tenancy mechanism.

## How ACL-Based Multi-Tenancy Works

Each tenant gets a unique Redis user with a password and a key pattern restriction:

```text
Tenant Alpha: user tenant_alpha, can only access keys matching "alpha:*"
Tenant Beta:  user tenant_beta, can only access keys matching "beta:*"
```

When tenant Alpha's application tries to access `beta:session:123`, Redis returns an error - not a miss.

## Creating Per-Tenant ACL Users

```bash
# Create a user for tenant alpha
redis-cli ACL SETUSER tenant_alpha \
  on \
  >SecurePasswordAlpha! \
  ~alpha:* \
  &alpha:* \
  +@all

# Create a user for tenant beta
redis-cli ACL SETUSER tenant_beta \
  on \
  >SecurePasswordBeta! \
  ~beta:* \
  &beta:* \
  +@all
```

Explanation:
- `on` - enable the user
- `>password` - set the password
- `~alpha:*` - allow access only to keys matching `alpha:*`
- `&alpha:*` - allow pub/sub channels matching `alpha:*` (requires Redis 6.2+)
- `+@all` - allow all commands (can be restricted further)

## Connecting as a Tenant User

```python
import redis

# Application connecting as tenant_alpha
r_alpha = redis.Redis(
    host="localhost",
    port=6379,
    username="tenant_alpha",
    password="SecurePasswordAlpha!"
)

# This works
r_alpha.set("alpha:session:abc", "user_data")

# This raises redis.exceptions.NoPermissionError
r_alpha.get("beta:session:abc")
```

## Restricting Commands Per Tenant

You can give read-only tenants fewer permissions:

```bash
# Read-only tenant user
redis-cli ACL SETUSER tenant_readonly \
  on \
  >ReadOnlyPass123! \
  ~readonly:* \
  +get \
  +hget \
  +hgetall \
  +lrange \
  +smembers \
  +zrange
```

## Saving ACL Configuration

ACL rules set via `ACL SETUSER` are in-memory by default. Persist them:

```bash
# Write to the ACL file
redis-cli ACL SAVE
```

Or configure Redis to load from an ACL file:

```text
# redis.conf
aclfile /etc/redis/users.acl
```

## Managing Tenant Lifecycle

```bash
# Disable a tenant's access without deleting their data
redis-cli ACL SETUSER tenant_alpha off

# Delete a tenant user entirely
redis-cli ACL DELUSER tenant_alpha

# List all users and their configurations
redis-cli ACL LIST

# Check what a specific user can do
redis-cli ACL GETUSER tenant_alpha
```

## Auditing Cross-Tenant Access Attempts

Redis logs ACL violations to the ACL log:

```bash
redis-cli ACL LOG
```

Output:

```text
1) 1) "count"
   2) (integer) 3
   3) "reason"
   4) "key"
   5) "context"
   6) "toplevel"
   7) "object"
   8) "beta:session:xyz"
   9) "username"
   10) "tenant_alpha"
   11) "age-seconds"
   12) "5.0800000000000001"
   13) "client-info"
   14) "id=4 addr=127.0.0.1:59348 ..."
```

This reveals which users are attempting to access keys outside their allowed pattern.

## Trade-offs vs Other Multi-Tenancy Approaches

| Approach | Max Tenants | Memory Isolation | Cluster Support |
|----------|-------------|-----------------|----------------|
| Separate databases | 16 | Logical only | No |
| Key prefixes | Unlimited | None | Yes |
| ACLs per tenant | Unlimited | None | Yes |
| Separate instances | Unlimited | Full | Yes |

ACLs scale to any number of tenants and work with Redis Cluster, but provide no memory quotas - a runaway tenant can still exhaust shared memory.

## Summary

Redis ACLs enable multi-tenant architectures by restricting each tenant to their own key namespace via key pattern rules. Tenants receive dedicated credentials with key pattern restrictions enforced server-side, preventing cross-tenant data access. ACLs scale to any number of tenants and work with Redis Cluster, making them a strong choice for SaaS applications with many small tenants on a shared Redis deployment.
