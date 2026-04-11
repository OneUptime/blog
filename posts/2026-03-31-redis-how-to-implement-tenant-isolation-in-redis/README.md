# How to Implement Tenant Isolation in Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Multi-Tenancy, Tenant Isolation, ACL, Security, Architecture

Description: Compare Redis tenant isolation strategies including key prefixes, logical databases, ACL users, and separate instances to choose the right level of isolation for your SaaS application.

---

## Tenant Isolation Strategies

Redis offers four levels of tenant isolation, each with different trade-offs between isolation strength, cost, and operational complexity:

| Strategy | Isolation Level | Cost | Complexity |
|----------|----------------|------|------------|
| Key prefixes | Logical (app-level) | Low | Low |
| Logical databases (DB 0-15) | Moderate | Low | Low |
| ACL key patterns | Moderate + auth | Low | Medium |
| Separate Redis instances | Full | High | High |

## Strategy 1 - Key Prefixes (Logical Isolation)

See the dedicated "Multi-Tenancy with Key Prefixes" guide. In summary: each tenant's keys are namespaced with a prefix (`tenant:{id}:key`). The application enforces prefix usage - Redis has no awareness of tenants.

**Best for**: Trusted multi-tenant applications, internal SaaS tools, small tenant counts.

## Strategy 2 - Logical Databases (DB 0-15)

Redis supports 16 logical databases (0-15) on a single instance. Each `SELECT n` switches to database `n`, which has a separate keyspace.

```bash
# Use database 1 for tenant A
redis-cli -n 1 SET user:100 "alice"

# Use database 2 for tenant B
redis-cli -n 2 SET user:100 "bob"

# Keys don't cross databases
redis-cli -n 1 GET user:100  # "alice"
redis-cli -n 2 GET user:100  # "bob"
```

### In Application Code

```python
import redis

def get_tenant_db_index(tenant_id: str) -> int:
    """Map tenant ID to database index 1-15 (0 reserved for default)"""
    import hashlib
    digest = int(hashlib.sha256(tenant_id.encode()).hexdigest(), 16)
    return (digest % 15) + 1

def get_tenant_connection(tenant_id: str) -> redis.Redis:
    db_index = get_tenant_db_index(tenant_id)
    return redis.Redis(host='localhost', port=6379, db=db_index)

tenant_a_r = get_tenant_connection('company-a')
tenant_b_r = get_tenant_connection('company-b')

tenant_a_r.set('user:100', 'alice')
tenant_b_r.set('user:100', 'bob')
```

**Limitations**:
- Only 16 databases - cannot scale beyond 15 tenants with 1-to-1 mapping
- FLUSHDB on one database does not affect others, but FLUSHALL clears everything
- Keys in different databases can share memory - no per-database memory limits
- Not supported in Redis Cluster

**Best for**: Small number of tenants (under 15), development environments.

## Strategy 3 - ACL Key Patterns (Enforced Isolation)

Redis 6+ ACL allows creating users with access restricted to specific key patterns. Redis 6.2+ extends this to Pub/Sub channel restrictions. This provides server-enforced isolation on a shared instance:

```bash
# Create dedicated users per tenant with restricted key access
redis-cli ACL SETUSER tenant-company-a on >secretPassA ~tenant:a:* &tenant:a:* +@all -@dangerous

redis-cli ACL SETUSER tenant-company-b on >secretPassB ~tenant:b:* &tenant:b:* +@all -@dangerous

# Verify
redis-cli ACL LIST
redis-cli ACL WHOAMI
```

The `~tenant:a:*` pattern restricts key access to keys starting with `tenant:a:`.
The `&tenant:a:*` pattern restricts Pub/Sub channel access.

### Connecting with ACL Users

```python
import redis

def get_acl_tenant_client(tenant_id: str, password: str) -> redis.Redis:
    return redis.Redis(
        host='localhost',
        port=6379,
        username=f'tenant-{tenant_id}',
        password=password,
        decode_responses=True
    )

tenant_a = get_acl_tenant_client('company-a', 'secretPassA')

# This works - matches ~tenant:a:*
tenant_a.set('tenant:a:user:100', 'alice')

# This raises an error - key does not match the pattern
tenant_a.set('tenant:b:user:100', 'bob')
# ResponseError: NOPERM No permissions to access a key
```

### ACL Audit Log

```bash
# Monitor ACL violations
redis-cli ACL LOG
```

**Best for**: Security-conscious multi-tenant applications where tenants could potentially be adversarial or where compliance requires strong isolation.

## Strategy 4 - Separate Redis Instances

The strongest isolation is running a dedicated Redis instance (or container) per tenant:

```yaml
# docker-compose.yml - one container per tenant
version: "3.8"
services:
  redis-tenant-a:
    image: redis:7
    command: redis-server --requirepass TenantAPassword --maxmemory 512mb --maxmemory-policy allkeys-lru
    ports:
      - "6380:6379"
    volumes:
      - redis-a-data:/data

  redis-tenant-b:
    image: redis:7
    command: redis-server --requirepass TenantBPassword --maxmemory 512mb --maxmemory-policy allkeys-lru
    ports:
      - "6381:6379"
    volumes:
      - redis-b-data:/data

volumes:
  redis-a-data:
  redis-b-data:
```

### Dynamic Instance Provisioning

For SaaS platforms that provision Redis per tenant on demand:

```python
import subprocess
import redis

class RedisTenantManager:
    def __init__(self, base_port=7000):
        self.base_port = base_port
        self.tenants = {}

    def provision_tenant(self, tenant_id: str, max_memory: str = '256mb') -> dict:
        port = self.base_port + len(self.tenants)
        password = self._generate_password()

        # Start Redis container for tenant
        subprocess.run([
            'docker', 'run', '-d',
            '--name', f'redis-{tenant_id}',
            '-p', f'{port}:6379',
            'redis:7',
            'redis-server',
            '--requirepass', password,
            '--maxmemory', max_memory,
            '--maxmemory-policy', 'allkeys-lru'
        ], check=True)

        self.tenants[tenant_id] = {'port': port, 'password': password}
        return self.tenants[tenant_id]

    def get_client(self, tenant_id: str) -> redis.Redis:
        if tenant_id not in self.tenants:
            raise KeyError(f"Tenant {tenant_id} not provisioned")
        config = self.tenants[tenant_id]
        return redis.Redis(
            host='localhost',
            port=config['port'],
            password=config['password']
        )

    def _generate_password(self) -> str:
        import secrets
        return secrets.token_urlsafe(32)
```

**Best for**: Enterprise or premium tenants requiring guaranteed isolation, compliance-driven environments, large tenants with high throughput.

## Memory Limits Per Tenant (on Shared Instance)

On a shared instance, Redis has no built-in per-tenant memory limits. Implement soft limits at the application level:

```python
TENANT_MEMORY_LIMITS = {
    'company-a': 100 * 1024 * 1024,  # 100 MB
    'company-b': 50 * 1024 * 1024,   # 50 MB
}

def enforce_tenant_quota(tenant_id: str, r: redis.Redis) -> bool:
    limit = TENANT_MEMORY_LIMITS.get(tenant_id, 50 * 1024 * 1024)
    prefix = f"tenant:{tenant_id}:"
    used = 0
    cursor = 0
    while True:
        cursor, keys = r.scan(cursor, match=f"{prefix}*", count=100)
        for key in keys:
            used += r.memory_usage(key) or 0
        if cursor == 0:
            break
    return used < limit
```

## Choosing the Right Strategy

| Scenario | Recommended Strategy |
|----------|---------------------|
| Internal SaaS, trusted teams | Key prefixes |
| Small number of tenants (< 15) | Logical databases |
| Compliance/security requirements | ACL key patterns |
| Enterprise tenants, high isolation | Separate instances |
| Mixed (free vs paid tiers) | Shared (ACL) + dedicated instances |

## Summary

Redis tenant isolation ranges from lightweight key prefixes (app-enforced, no overhead) to separate instances (full isolation, higher cost). For most multi-tenant SaaS applications, ACL key patterns (Redis 6+) provide a strong middle ground - server-enforced key isolation with a single shared Redis instance. For premium or compliance-sensitive tenants, provision dedicated Redis containers with memory limits set via `maxmemory`. Combine strategies by using shared Redis for free-tier tenants and dedicated instances for paid enterprise tenants.
