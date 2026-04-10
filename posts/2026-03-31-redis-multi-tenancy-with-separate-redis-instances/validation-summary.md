# Validation Summary: How to Implement Multi-Tenancy with Separate Redis Instances

## Status
validated

## Post Type
Tutorial / Architecture Guide

## Technologies Covered
- Redis (redis-py Python client)
- Python (functools.lru_cache, psycopg2)
- Kubernetes (kubectl, namespaces, services, DNS)
- Helm (bitnami/redis chart)
- PostgreSQL (tenant registry)
- Bash scripting

## Sources Consulted
- redis-py official documentation: https://redis-py.readthedocs.io/en/stable/
- Bitnami Redis Helm chart parameters: https://github.com/bitnami/charts/tree/main/bitnami/redis
- Kubernetes DNS for Services documentation: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- kubectl jsonpath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- psycopg2 documentation: https://www.psycopg.org/docs/
- PostgreSQL ON CONFLICT documentation: https://www.postgresql.org/docs/current/sql-insert.html

## Issues Found
1. **SQL ON CONFLICT clause missing password update** (provisioning script): The `ON CONFLICT (tenant_id) DO UPDATE SET host=EXCLUDED.host` only updated the `host` column. When the script is re-run for an existing tenant, a new `REDIS_PASSWORD` is generated and deployed via Helm, but the database would retain the old password, breaking authentication. Fixed by changing to `DO UPDATE SET host=EXCLUDED.host, password=EXCLUDED.password`.

## Review Notes
- The `get_tenant_redis_config` function creates a new `psycopg2` connection on each call without closing it (resource leak). Since it's called from an `lru_cache`-decorated function, the leak is bounded by the number of tenants, but production code should use a context manager or connection pool. Acceptable for example code.
- The provisioning script interpolates shell variables directly into SQL (`$TENANT_ID`, `$REDIS_HOST`, `$REDIS_PASSWORD`), which is technically vulnerable to SQL injection. Since `$REDIS_PASSWORD` is hex-only (from `openssl rand -hex`) and the script is operator-run (not user-facing), this is acceptable for a demo but would not be appropriate in production.
- The `lru_cache` on Redis connection functions means configuration changes (e.g., a tenant's Redis host changes) won't be picked up until the process restarts. This is a reasonable trade-off for a tutorial but worth noting for production use.
- The trade-offs table describes shared instances as having "None" for memory and failure isolation. This is accurate for full isolation (a shared instance shares memory and a crash affects all tenants), though logical isolation via key prefixing or Redis databases (SELECT 0-15) can provide partial separation.
