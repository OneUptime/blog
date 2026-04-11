# Validation Summary: How to Implement Tenant Isolation in Redis

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis (core server, logical databases, ACLs, MEMORY USAGE command)
- Redis 6.0+ ACL system (key patterns, command categories)
- Redis 6.2+ Pub/Sub channel ACL restrictions
- Python redis-py client library
- Docker / Docker Compose for per-tenant Redis instances

## Sources Consulted
- Redis ACL documentation: https://redis.io/docs/latest/operate/oss_and_bss/management/security/acl/
- Redis SELECT command documentation: https://redis.io/docs/latest/commands/select/
- Redis MEMORY USAGE command documentation: https://redis.io/docs/latest/commands/memory-usage/
- Redis ACL SETUSER documentation: https://redis.io/docs/latest/commands/acl-setuser/
- Python hashlib documentation: https://docs.python.org/3/library/hashlib.html
- Python hash randomization (PYTHONHASHSEED): https://docs.python.org/3/using/cmdline.html#envvar-PYTHONHASHSEED
- redis-py documentation: https://redis-py.readthedocs.io/

## Issues Found
1. **Non-deterministic `hash()` in `get_tenant_db_index` (Strategy 2)**: The function used Python's built-in `hash()` to map tenant IDs to database indices. Since Python 3.3+, `hash()` is randomized across processes (via `PYTHONHASHSEED`), meaning the same tenant could be mapped to different databases in different process invocations. This would cause data loss or inconsistency. Fixed by replacing `hash()` with `hashlib.sha256()`, which is deterministic.

2. **Pub/Sub channel ACL version clarification (Strategy 3)**: The post stated "Redis 6+ ACL" but the `&tenant:a:*` Pub/Sub channel pattern syntax shown in the ACL SETUSER command requires Redis 6.2+. Someone running Redis 6.0 or 6.1 would get an error. Added clarification that channel restrictions require Redis 6.2+.

## Review Notes
- The `docker-compose.yml` uses `version: "3.8"` which is deprecated in Docker Compose V2 (the `version` field is now ignored). This is not technically wrong as it still works, but newer Docker Compose files typically omit it.
- The `enforce_tenant_quota` function using SCAN + MEMORY USAGE is correct but would be very slow for tenants with many keys. The post correctly frames this as a "soft limit" approach, which is appropriate.
- The default number of Redis logical databases (16) is configurable via the `databases` config directive, but the post correctly describes the default behavior.
- The dynamic provisioning example using `subprocess.run` to launch Docker containers is a reasonable illustration, though production systems would typically use container orchestration (Kubernetes, ECS, etc.).
