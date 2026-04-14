# How to Implement Secret Rotation with Dapr and HashiCorp Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret, HashiCorp Vault, Security, Rotation

Description: Learn how to implement automatic secret rotation using Dapr's secret store integration with HashiCorp Vault, including dynamic secrets and versioned secret access.

---

## Why Rotate Secrets?

Secret rotation reduces the blast radius of a compromised credential. By regularly rotating database passwords, API keys, and certificates, you limit how long a leaked secret remains exploitable. HashiCorp Vault's dynamic secrets and Dapr's secret store abstraction make rotation practical without changing application code.

## Dapr Secret Store Component for Vault

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault-secrets
  namespace: default
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault.example.com:8200"
  - name: vaultToken
    value: ""
  - name: vaultTokenMountPath
    value: "/var/run/secrets/vault/token"
  - name: vaultKVPrefix
    value: "secret"
  - name: vaultKVUsePrefix
    value: "true"
  - name: enginePath
    value: "secret"
```

## Reading the Current Secret Version

```python
from dapr.clients import DaprClient

def get_database_credentials() -> dict:
    with DaprClient() as client:
        # Fetch latest version of the secret
        secret = client.get_secret(
            store_name="vault-secrets",
            key="database/app-credentials",
        )
        return {
            "username": secret.secret["username"],
            "password": secret.secret["password"],
        }
```

## Triggering Rotation via Vault API

Set up a rotation script that creates a new secret version in Vault:

```bash
#!/bin/bash
# rotate-db-secret.sh

export VAULT_ADDR="https://vault.example.com:8200"
NEW_PASSWORD=$(openssl rand -base64 32)

# Fetch the current password from Vault
CURRENT_PASSWORD=$(vault kv get -field=password secret/database/app-credentials)

# Update the password in the actual database first
mysql -u admin -p"${CURRENT_PASSWORD}" -e \
  "ALTER USER 'appuser'@'%' IDENTIFIED BY '${NEW_PASSWORD}';"

# Write new version to Vault
vault kv put secret/database/app-credentials \
  username="appuser" \
  password="${NEW_PASSWORD}"

echo "Secret rotated successfully"
```

## Watching for Secret Changes in Application Code

Poll for secret updates and reload connections when the secret version changes:

```python
import asyncio
import hashlib
from dapr.clients import DaprClient

class SecretWatcher:
    def __init__(self, store_name: str, secret_key: str, callback):
        self.store_name = store_name
        self.secret_key = secret_key
        self.callback = callback
        self._last_hash = None

    async def watch(self, interval_seconds: int = 60):
        """Poll for secret changes every interval_seconds."""
        while True:
            try:
                with DaprClient() as client:
                    secret = client.get_secret(
                        store_name=self.store_name,
                        key=self.secret_key,
                    )
                    secret_hash = hashlib.sha256(
                        str(secret.secret).encode()
                    ).hexdigest()

                    if secret_hash != self._last_hash:
                        print(f"Secret changed for {self.secret_key}, reloading...")
                        await self.callback(secret.secret)
                        self._last_hash = secret_hash

            except Exception as e:
                print(f"Error watching secret: {e}")

            await asyncio.sleep(interval_seconds)

# Usage
async def on_credential_change(new_creds: dict):
    print("Rotating database connection pool...")
    await db_pool.reconnect(
        username=new_creds["username"],
        password=new_creds["password"],
    )

watcher = SecretWatcher("vault-secrets", "database/app-credentials", on_credential_change)
asyncio.create_task(watcher.watch(interval_seconds=300))
```

## Configuring Vault Dynamic Secrets for Automatic Rotation

Vault can generate short-lived database credentials automatically:

```bash
# Enable the database secrets engine
vault secrets enable database

# Configure the database connection
vault write database/config/mydb \
  plugin_name=mysql-database-plugin \
  connection_url="{{username}}:{{password}}@tcp(mysql:3306)/appdb" \
  allowed_roles="app-role" \
  username="vault-admin" \
  password="admin-password"

# Create a role with TTL
vault write database/roles/app-role \
  db_name=mydb \
  creation_statements="CREATE USER '{{name}}'@'%' IDENTIFIED BY '{{password}}'; \
    GRANT SELECT, INSERT, UPDATE ON appdb.* TO '{{name}}'@'%';" \
  default_ttl="1h" \
  max_ttl="24h"
```

Configure Dapr to use dynamic secrets:

```yaml
spec:
  type: secretstores.hashicorp.vault
  metadata:
  - name: enginePath
    value: "database"
  - name: vaultKVPrefix
    value: "creds"
```

## Summary

Dapr with HashiCorp Vault supports secret rotation through versioned KV secrets and dynamic database credentials. Applications read secrets via Dapr's `get_secret` API without knowing the underlying store. Implement a secret watcher that polls for changes and refreshes connection pools when credentials rotate. Vault dynamic secrets with short TTLs provide the strongest rotation guarantees by generating fresh credentials on every lease.
