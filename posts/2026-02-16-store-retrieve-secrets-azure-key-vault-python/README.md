# How to Store and Retrieve Secrets from Azure Key Vault Using azure-keyvault-secrets in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Key Vault, Python, Secrets Management, Security, azure-keyvault-secrets, Cloud Security

Description: A hands-on guide to storing and retrieving application secrets from Azure Key Vault using the azure-keyvault-secrets Python SDK.

---

Hardcoding secrets in your application code or config files is a recipe for trouble. Sooner or later, someone commits a database password to Git, and suddenly your Friday evening plans involve rotating credentials. Azure Key Vault solves this by giving you a centralized, secure place to store secrets, keys, and certificates. The azure-keyvault-secrets Python SDK makes it easy to work with secrets programmatically.

In this post, I will walk through setting up Key Vault, storing secrets, retrieving them, and handling common scenarios like versioning and soft delete.

## Prerequisites

You need an Azure subscription and the Azure CLI installed. Let me also mention upfront that you need the right RBAC permissions on the Key Vault to read and write secrets.

```bash
# Install the Python packages
pip install azure-identity azure-keyvault-secrets
```

## Creating a Key Vault

If you do not already have a Key Vault, create one.

```bash
# Create a resource group
az group create --name my-rg --location eastus

# Create a Key Vault with RBAC authorization
az keyvault create \
    --name my-app-vault \
    --resource-group my-rg \
    --location eastus \
    --enable-rbac-authorization true
```

The `--enable-rbac-authorization true` flag is important. It means permissions are managed through Azure RBAC instead of the older vault access policies. RBAC is the recommended approach now.

## Assigning Permissions

Your identity needs the right role to interact with secrets.

```bash
# Get your user object ID
USER_ID=$(az ad signed-in-user show --query id -o tsv)

# Get the Key Vault resource ID
VAULT_ID=$(az keyvault show --name my-app-vault --query id -o tsv)

# Assign the Key Vault Secrets Officer role (read + write)
az role assignment create \
    --role "Key Vault Secrets Officer" \
    --assignee $USER_ID \
    --scope $VAULT_ID
```

For applications that only need to read secrets, use "Key Vault Secrets User" instead. Least privilege matters.

## Connecting to Key Vault

With authentication handled by DefaultAzureCredential, connecting is minimal.

```python
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

# Create the client - credential handles auth automatically
credential = DefaultAzureCredential()
vault_url = "https://my-app-vault.vault.azure.net/"
client = SecretClient(vault_url=vault_url, credential=credential)
```

## Storing Secrets

Setting a secret is a single method call.

```python
# Store a database connection string as a secret
client.set_secret("database-password", "S3cur3P@ssw0rd!")

# Store with additional properties
from datetime import datetime, timezone, timedelta

client.set_secret(
    "api-key",
    "ak_live_abc123xyz789",
    content_type="application/text",  # Describe what kind of value this is
    tags={
        "environment": "production",
        "service": "payment-gateway"
    },
    expires_on=datetime.now(timezone.utc) + timedelta(days=90)  # Auto-expire in 90 days
)

print("Secrets stored successfully")
```

The tags and expiration are optional but very useful. Tags help you organize and search secrets. Expiration dates force you to rotate credentials, which is a good security practice.

## Retrieving Secrets

Getting a secret back is equally simple.

```python
# Retrieve a single secret
secret = client.get_secret("database-password")

print(f"Secret name: {secret.name}")
print(f"Secret value: {secret.value}")
print(f"Created on: {secret.properties.created_on}")
print(f"Updated on: {secret.properties.updated_on}")
print(f"Enabled: {secret.properties.enabled}")
```

In your application code, you would typically fetch secrets at startup and cache them rather than calling Key Vault on every request.

```python
import os

class AppConfig:
    """Load configuration from Key Vault at startup."""

    def __init__(self, vault_url: str):
        credential = DefaultAzureCredential()
        self.client = SecretClient(vault_url=vault_url, credential=credential)
        self._cache = {}

    def get(self, secret_name: str) -> str:
        """Get a secret value, caching it for the lifetime of the app."""
        if secret_name not in self._cache:
            secret = self.client.get_secret(secret_name)
            self._cache[secret_name] = secret.value
        return self._cache[secret_name]

# Usage
config = AppConfig("https://my-app-vault.vault.azure.net/")
db_password = config.get("database-password")
api_key = config.get("api-key")
```

## Listing Secrets

You can list all secrets in a vault. Note that listing returns properties only, not the actual values. This is a security feature - you need to explicitly fetch each value.

```python
# List all secrets (properties only, no values)
secret_properties = client.list_properties_of_secrets()

for prop in secret_properties:
    print(f"Secret: {prop.name}")
    print(f"  Enabled: {prop.enabled}")
    print(f"  Created: {prop.created_on}")
    print(f"  Tags: {prop.tags}")
    print()
```

## Secret Versioning

Every time you update a secret, Key Vault creates a new version. The old versions stick around, which is great for auditing and rollback.

```python
# Update a secret (creates a new version automatically)
client.set_secret("database-password", "N3wS3cur3P@ss!")

# List all versions of a secret
versions = client.list_properties_of_secret_versions("database-password")
for version in versions:
    print(f"Version: {version.version}")
    print(f"  Created: {version.created_on}")
    print(f"  Enabled: {version.enabled}")

# Get a specific version
specific_version = client.get_secret(
    "database-password",
    version="abc123def456"  # Replace with actual version ID
)
```

## Disabling and Enabling Secrets

Sometimes you want to temporarily disable a secret without deleting it.

```python
# Disable a secret
properties = client.get_secret("old-api-key").properties
client.update_secret_properties(
    "old-api-key",
    version=properties.version,
    enabled=False
)

# Trying to get a disabled secret raises an error
try:
    client.get_secret("old-api-key")
except Exception as e:
    print(f"Cannot retrieve disabled secret: {e}")
```

## Deleting and Recovering Secrets

Key Vault supports soft delete by default. When you delete a secret, it goes into a "deleted" state and stays recoverable for a retention period (default 90 days).

```python
# Delete a secret (soft delete)
poller = client.begin_delete_secret("old-api-key")
deleted_secret = poller.result()
print(f"Deleted: {deleted_secret.name}")
print(f"Scheduled purge date: {deleted_secret.scheduled_purge_date}")

# List deleted secrets
for deleted in client.list_deleted_secrets():
    print(f"Deleted secret: {deleted.name}, recovery ID: {deleted.recovery_id}")

# Recover a deleted secret
recovery_poller = client.begin_recover_deleted_secret("old-api-key")
recovered = recovery_poller.result()
print(f"Recovered: {recovered.name}")
```

If you truly want to permanently remove a secret before the retention period ends, you can purge it. But you need the "Key Vault Secrets Purge" permission for that.

```python
# Permanently purge a deleted secret (irreversible)
client.purge_deleted_secret("old-api-key")
```

## Async Client

For async applications, use the async version of the client.

```python
import asyncio
from azure.identity.aio import DefaultAzureCredential
from azure.keyvault.secrets.aio import SecretClient

async def main():
    credential = DefaultAzureCredential()
    client = SecretClient(
        vault_url="https://my-app-vault.vault.azure.net/",
        credential=credential
    )

    # Store a secret
    await client.set_secret("async-secret", "async-value-123")

    # Retrieve it
    secret = await client.get_secret("async-secret")
    print(f"Value: {secret.value}")

    # Clean up
    await client.close()
    await credential.close()

asyncio.run(main())
```

## Error Handling

Proper error handling is important since network calls can fail and permissions might be misconfigured.

```python
from azure.core.exceptions import (
    ResourceNotFoundError,
    HttpResponseError,
    ClientAuthenticationError
)

try:
    secret = client.get_secret("nonexistent-secret")
except ResourceNotFoundError:
    print("Secret does not exist")
except ClientAuthenticationError:
    print("Authentication failed - check your credentials and RBAC roles")
except HttpResponseError as e:
    print(f"Azure returned an error: {e.status_code} - {e.message}")
```

## Integration with Flask

Here is a practical example of loading Key Vault secrets into a Flask application.

```python
from flask import Flask
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

def create_app():
    app = Flask(__name__)

    # Load secrets from Key Vault during app initialization
    credential = DefaultAzureCredential()
    vault_client = SecretClient(
        vault_url="https://my-app-vault.vault.azure.net/",
        credential=credential
    )

    # Populate Flask config from Key Vault
    app.config["DATABASE_URL"] = vault_client.get_secret("database-url").value
    app.config["REDIS_URL"] = vault_client.get_secret("redis-url").value
    app.config["SECRET_KEY"] = vault_client.get_secret("flask-secret-key").value

    @app.route("/health")
    def health():
        return {"status": "ok"}

    return app
```

## Best Practices

From running Key Vault in production, here is what I have found works well:

1. **Use RBAC over access policies.** RBAC is more flexible and aligns with how you manage permissions everywhere else in Azure.
2. **Cache secrets.** Do not call Key Vault on every request. Fetch at startup or use a cache with a TTL.
3. **Set expiration dates.** They force you to rotate secrets regularly.
4. **Use tags.** Tagging by environment, service, and team makes management much easier.
5. **Enable purge protection.** It prevents even admins from permanently deleting secrets during the retention period.
6. **Monitor access.** Enable diagnostic logging to track who accessed which secrets and when.

## Wrapping Up

Azure Key Vault paired with the azure-keyvault-secrets SDK gives you a solid foundation for secrets management. The integration with DefaultAzureCredential means your code stays clean and portable. Versioning, soft delete, and expiration dates add layers of safety that you do not get from environment variables or config files. Start using it early in your project - retrofitting secrets management later is always harder than building it in from the start.
