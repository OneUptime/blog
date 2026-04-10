# How to Implement Multi-Tenancy with Redis Databases

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Multi-Tenancy, Architecture, SaaS, Database

Description: Learn how to use Redis logical databases (DB 0-15) to isolate tenant data, manage per-database TTLs and limits, and understand the trade-offs of this approach.

---

Redis defaults to 16 logical databases (numbered 0-15) within a single Redis instance. You can increase this limit by setting the `databases` directive in `redis.conf`. Each database has its own keyspace, making it a simple way to separate tenant data on a shared server without running multiple processes.

## How Redis Databases Work

By default, clients connect to database 0. You can switch databases with the `SELECT` command or specify it in the connection string:

```bash
# Connect to database 3
redis-cli -n 3

# Or use SELECT
redis-cli
> SELECT 3
> SET tenant:data "hello"
```

In Python:

```python
import redis

# Connect to database index 3 for tenant 3
r_tenant3 = redis.Redis(host="localhost", port=6379, db=3)
r_tenant3.set("session:abc", "user_data")
```

## Use Case: Small SaaS with Up to 16 Tenants

If you have fewer than 16 tenants, you can assign one database per tenant:

```python
TENANT_DB_MAP = {
    "tenant_alpha": 0,
    "tenant_beta": 1,
    "tenant_gamma": 2,
}

def get_redis_for_tenant(tenant_id: str) -> redis.Redis:
    db_index = TENANT_DB_MAP.get(tenant_id)
    if db_index is None:
        raise ValueError(f"Unknown tenant: {tenant_id}")
    return redis.Redis(host="localhost", port=6379, db=db_index)
```

## Flushing a Single Tenant's Data

A major advantage of database-per-tenant is that you can flush one tenant without affecting others:

```bash
# Flush only tenant_beta's database (index 1)
redis-cli -n 1 FLUSHDB
```

This is much safer than using key prefixes, where a mistake could accidentally delete keys from other tenants.

## Inspecting Per-Database Key Counts

```bash
redis-cli INFO keyspace
```

Output:

```text
# Keyspace
db0:keys=1203,expires=804,avg_ttl=3600000
db1:keys=456,expires=200,avg_ttl=7200000
db2:keys=78,expires=78,avg_ttl=1800000
```

This gives per-tenant key counts at a glance.

## Limitations to Know Before Choosing This Approach

```text
1. Defaults to 16 databases per instance (configurable via `databases` in redis.conf) - practical limit for most deployments
2. Redis Cluster does NOT support multiple databases (only db 0 is allowed)
3. No per-database memory limits - one tenant can exhaust all memory
4. No per-database rate limiting or connection quotas
5. KEYS and SCAN commands still scan only one database at a time
```

## When to Use This Approach

Database-per-tenant works well when:

- You have a fixed small number of tenants (< 16)
- You are running a standalone Redis (not Cluster)
- You need simple, complete tenant data isolation (easy FLUSHDB for offboarding)
- You want quick per-tenant inspection without key namespace parsing

For more than 16 tenants or Redis Cluster deployments, use key prefix isolation or separate Redis instances instead.

## Monitoring Per-Database Usage

Script to monitor all databases:

```bash
#!/bin/bash
for db in $(seq 0 15); do
  KEYCOUNT=$(redis-cli --raw -n "$db" DBSIZE)
  if [ "$KEYCOUNT" -gt 0 ]; then
    echo "DB $db: $KEYCOUNT keys"
  fi
done
```

## Summary

Redis logical databases provide simple tenant isolation for small deployments with up to 16 tenants. Each database has an independent keyspace, allowing you to flush one tenant's data without affecting others. This approach does not work with Redis Cluster and provides no per-tenant memory limits, making it unsuitable for larger multi-tenant architectures where ACLs or separate instances are a better fit.
