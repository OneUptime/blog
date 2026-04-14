# How to Rotate Secrets Without Downtime Using Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret Rotation, Zero Downtime, Security, Operation

Description: Learn strategies for rotating database passwords, API keys, and certificates in Dapr-enabled services without causing service interruptions.

---

Secret rotation is a critical security practice, but doing it wrong causes outages. Dapr Secrets Management makes rotation safer by decoupling secret retrieval from application startup. When done correctly, you can rotate secrets while services keep running without a single dropped request.

## Why Dapr Makes Rotation Safer

With hardcoded secrets in environment variables, rotation requires a pod restart. With Dapr, your application calls the secrets API at runtime. This means:

- You can update the backend secret store independently of the application
- Services that cache secrets can reload on next retrieval
- No rolling restart is required for the rotation itself

## Step 1: Version Your Secrets

Use a versioned secret naming convention in your secret store. In HashiCorp Vault:

```bash
# Write version 1
vault kv put -mount=secret db-credentials \
  password="initial-password"

# Write version 2 (rotation)
vault kv put -mount=secret db-credentials \
  password="new-rotated-password"
```

Vault KV v2 automatically tracks versions. You can retrieve the current or a specific version:

```bash
# Get latest version
curl http://localhost:3500/v1.0/secrets/vault-store/db-credentials

# Get specific version via metadata
curl "http://localhost:3500/v1.0/secrets/vault-store/db-credentials?metadata.version_id=1"
```

## Step 2: Implement Graceful Secret Refresh in Your Application

Avoid caching secrets indefinitely. Use a short TTL and re-fetch on failure:

```python
import httpx
import asyncio
import time
from typing import Optional

class SecretCache:
    def __init__(self, store: str, secret_name: str, ttl_seconds: int = 300):
        self.store = store
        self.secret_name = secret_name
        self.ttl = ttl_seconds
        self._cache: Optional[dict] = None
        self._fetched_at: float = 0

    async def get(self) -> dict:
        now = time.time()
        if self._cache is None or (now - self._fetched_at) > self.ttl:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"http://localhost:3500/v1.0/secrets/{self.store}/{self.secret_name}"
                )
                self._cache = resp.json()
                self._fetched_at = now
        return self._cache

db_secret = SecretCache("vault-store", "db-credentials", ttl_seconds=300)
```

## Step 3: Use a Blue-Green Secret Strategy for Databases

For database passwords, follow this rotation procedure:

```bash
# 1. Change the password in the DB
psql -c "ALTER USER appuser PASSWORD 'new-password';"

# 2. Update the secret in your backend store
vault kv put -mount=secret db-credentials password="new-password"

# 3. Wait for TTL to expire (services pick up new password automatically)
# 4. Remove old password from any allow-lists or legacy configs
```

## Step 4: Verify Rotation Succeeded

Check that all pods are using the new credential:

```bash
# Test the secret endpoint on a running pod
kubectl exec -it deployment/my-service -- \
  curl -s http://localhost:3500/v1.0/secrets/vault-store/db-credentials | jq .
```

Monitor application error rates during rotation:

```bash
kubectl logs deployment/my-service --since=5m | grep -i "authentication failed"
```

## Summary

Dapr enables zero-downtime secret rotation by providing a runtime retrieval API that your application calls on demand rather than reading secrets once at startup. Combining a short cache TTL with versioned secrets in your backend store lets you rotate credentials safely without any pod restarts or deployment pipelines.
