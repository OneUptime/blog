# How to Implement Multi-Tenancy with Separate Redis Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Multi-Tenancy, Architecture, SaaS, Kubernetes

Description: Learn how to run separate Redis instances per tenant to achieve full memory isolation, independent scaling, and zero risk of cross-tenant interference.

---

Running one Redis instance per tenant is the gold standard for isolation in multi-tenant systems. Each tenant gets dedicated memory, CPU, and connection limits, and a failure in one tenant's Redis has no impact on others.

## When to Choose Separate Instances

Separate Redis instances make sense when:

- Tenants have widely different data sizes or traffic patterns
- Your SLA requires strict resource isolation
- A tenant's Redis failure must not affect other tenants
- You need per-tenant backup schedules or retention policies
- Tenants are on different compliance or data residency requirements

## Architecture: Tenant Redis Router

Your application looks up the Redis endpoint for the current tenant:

```python
import redis
from functools import lru_cache

TENANT_REDIS_MAP = {
    "tenant_alpha": {"host": "redis-alpha.internal", "port": 6379},
    "tenant_beta":  {"host": "redis-beta.internal",  "port": 6379},
    "tenant_gamma": {"host": "redis-gamma.internal", "port": 6379},
}

@lru_cache(maxsize=100)
def get_redis_for_tenant(tenant_id: str) -> redis.Redis:
    config = TENANT_REDIS_MAP.get(tenant_id)
    if not config:
        raise ValueError(f"No Redis instance configured for tenant: {tenant_id}")
    return redis.Redis(**config, decode_responses=True)
```

## Provisioning Tenant Redis Instances on Kubernetes

Use a Helm chart or Kubernetes manifest to deploy per-tenant Redis:

```bash
# Deploy a Redis instance for a new tenant
helm install redis-tenant-alpha bitnami/redis \
  --namespace tenant-alpha \
  --set auth.password="$(openssl rand -hex 16)" \
  --set master.resources.limits.memory=512Mi \
  --set master.resources.limits.cpu=500m \
  --set master.persistence.enabled=true \
  --set master.persistence.size=5Gi
```

## Automating Tenant Provisioning

Script to provision and register a new tenant's Redis:

```bash
#!/bin/bash
# provision-tenant-redis.sh
TENANT_ID="$1"
NAMESPACE="tenant-${TENANT_ID}"
REDIS_PASSWORD=$(openssl rand -hex 16)
MEMORY_LIMIT="${2:-512Mi}"

# Create namespace
kubectl create namespace "$NAMESPACE" --dry-run=client -o yaml | kubectl apply -f -

# Deploy Redis
helm upgrade --install "redis-${TENANT_ID}" bitnami/redis \
  --namespace "$NAMESPACE" \
  --set auth.password="$REDIS_PASSWORD" \
  --set master.resources.limits.memory="$MEMORY_LIMIT" \
  --wait

# Get the service hostname
REDIS_HOST=$(kubectl get svc "redis-${TENANT_ID}-master" \
  -n "$NAMESPACE" \
  -o jsonpath='{.metadata.name}.{.metadata.namespace}.svc.cluster.local')

echo "Tenant: $TENANT_ID"
echo "Host:   $REDIS_HOST"
echo "Pass:   $REDIS_PASSWORD"

# Store in your tenant registry (e.g., Postgres, Vault, etc.)
psql "$DB_URL" -c "
  INSERT INTO tenant_redis_config (tenant_id, host, port, password)
  VALUES ('$TENANT_ID', '$REDIS_HOST', 6379, '$REDIS_PASSWORD')
  ON CONFLICT (tenant_id) DO UPDATE SET host=EXCLUDED.host, password=EXCLUDED.password;
"
```

## Dynamic Redis Connection from Registry

Look up the Redis endpoint from your database at runtime:

```python
import redis
import psycopg2
from functools import lru_cache

def get_tenant_redis_config(tenant_id: str) -> dict:
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute(
        "SELECT host, port, password FROM tenant_redis_config WHERE tenant_id = %s",
        (tenant_id,)
    )
    row = cur.fetchone()
    if not row:
        raise ValueError(f"No Redis configured for tenant {tenant_id}")
    return {"host": row[0], "port": row[1], "password": row[2]}

@lru_cache(maxsize=200)
def get_redis(tenant_id: str) -> redis.Redis:
    config = get_tenant_redis_config(tenant_id)
    return redis.Redis(**config, decode_responses=True)
```

## Trade-offs

| Factor | Separate Instances | Shared Instance |
|--------|-------------------|----------------|
| Memory isolation | Full | None |
| Failure isolation | Full | None |
| Cost | High (N instances) | Low (1 instance) |
| Operational complexity | High | Low |
| Scaling flexibility | Per-tenant | Shared pool |

## Summary

Separate Redis instances per tenant provide complete isolation at the cost of higher operational overhead and resource consumption. Use Kubernetes and Helm to automate provisioning, and store tenant-to-Redis mappings in a central registry. This approach is best for enterprise SaaS or regulated workloads where strict isolation is a business requirement.
