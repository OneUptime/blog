# How to Migrate Between Dapr Secret Store Backends

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret Management, Migration, Operation, Architecture

Description: Learn how to migrate Dapr secret store backends from one provider to another with zero downtime using dual-read patterns and staged cutover strategies.

---

Migrating between secret store backends - for example from Kubernetes secrets to HashiCorp Vault, or from AWS Secrets Manager to Azure Key Vault - is a common operational challenge. The good news is that Dapr's component abstraction makes this migration significantly easier than working directly with each vendor SDK.

## Why Migrations Happen

Common reasons to migrate secret store backends:
- Moving from cloud provider to another
- Switching from self-hosted Vault to a managed service
- Consolidating from multiple stores to a single platform
- Compliance requirements mandating a specific backend
- License changes (e.g., Vault BSL -> OpenBao)

## Step 1: Run Both Stores in Parallel

The safest migration strategy is to run old and new stores simultaneously. Deploy both components:

```yaml
# Old store (still active)
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: old-secrets
spec:
  type: secretstores.kubernetes
  version: v1
  metadata: []
```

```yaml
# New store (being rolled out)
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: new-secrets
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
    - name: vaultAddr
      value: "https://vault.internal:8200"
```

## Step 2: Sync Secrets to the New Backend

Write a migration script to copy secrets from the old store to the new one:

```python
import httpx
import asyncio

OLD_STORE = "old-secrets"
NEW_STORE = "new-secrets"
SECRETS_TO_MIGRATE = [
    "db-password",
    "api-key",
    "redis-password",
    "jwt-secret"
]

async def migrate_secrets():
    async with httpx.AsyncClient() as client:
        for secret_name in SECRETS_TO_MIGRATE:
            # Read from old store
            old_resp = await client.get(
                f"http://localhost:3500/v1.0/secrets/{OLD_STORE}/{secret_name}"
            )
            secret_data = old_resp.json()
            print(f"Read {secret_name} from old store")

            # Write to new store (using Vault CLI or API directly)
            # This part depends on the target backend's write API
            import subprocess
            for key, value in secret_data.items():
                subprocess.run([
                    "vault", "kv", "put",
                    f"secret/{secret_name}",
                    f"{key}={value}"
                ])
            print(f"Written {secret_name} to new store")

asyncio.run(migrate_secrets())
```

## Step 3: Implement Dual-Read in Application Code

During migration, read from both stores with fallback:

```go
func getSecret(name string) (string, error) {
    // Try new store first
    val, err := fetchFromDapr("new-secrets", name)
    if err == nil {
        return val, nil
    }

    // Fall back to old store
    log.Printf("Warning: falling back to old store for secret %s", name)
    return fetchFromDapr("old-secrets", name)
}

func fetchFromDapr(store, name string) (string, error) {
    resp, err := http.Get(
        fmt.Sprintf("http://localhost:3500/v1.0/secrets/%s/%s", store, name),
    )
    if err != nil {
        return "", fmt.Errorf("failed to get secret from %s", store)
    }
    defer resp.Body.Close()
    if resp.StatusCode != 200 {
        return "", fmt.Errorf("failed to get secret from %s", store)
    }
    var result map[string]string
    json.NewDecoder(resp.Body).Decode(&result)
    return result[name], nil
}
```

## Step 4: Gradually Shift Traffic

Update services one by one to use the new store. Monitor error rates after each service migration:

```bash
# Update the store name your application reads from via an environment variable
kubectl set env deployment/my-service SECRET_STORE=new-secrets

# Monitor for errors
kubectl logs -f deployment/my-service -c daprd | grep -E "error|secret"
```

## Step 5: Decommission the Old Store

Once all services are reading from the new store, remove the old component and clean up:

```bash
kubectl delete component old-secrets -n production
```

Revoke access credentials for the old backend in your IAM system.

## Summary

Migrating Dapr secret store backends safely requires running both stores in parallel during the transition, syncing secrets to the new backend, optionally using dual-read patterns for zero-downtime cutover, and gradually migrating services one by one before decommissioning the old backend. The Dapr component abstraction makes the migration significantly smoother since application code only needs to change the store name in API calls - no vendor SDK swaps or authentication rewiring is required.
