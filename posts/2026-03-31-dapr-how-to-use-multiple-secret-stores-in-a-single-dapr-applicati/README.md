# How to Use Multiple Secret Stores in a Single Dapr Application

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret Store, Security, Configuration, Microservice, Kubernetes

Description: Learn how to configure and use multiple secret store components in a single Dapr application to fetch secrets from different providers simultaneously.

---

Modern applications often need secrets from multiple sources: database credentials might live in AWS Secrets Manager, API keys in Azure Key Vault, and internal service tokens in Kubernetes secrets. Dapr supports registering multiple secret store components simultaneously, allowing a single application to fetch secrets from any of them by name. This guide shows how to configure and use multiple secret stores effectively.

## Why Multiple Secret Stores

Different teams or environments may use different secret providers. With Dapr, you can:
- Pull database credentials from one vault and API keys from another
- Migrate from one provider to another gradually without changing application code
- Use environment-specific stores (local file for dev, cloud vault for prod)
- Implement fallback logic across stores for resilience

## Configuring Multiple Secret Store Components

Define separate Dapr component files for each secret store.

```yaml
# dapr/components/secret-store-aws.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: aws-secrets
  namespace: production
spec:
  type: secretstores.aws.secretmanager
  version: v1
  metadata:
  - name: region
    value: "us-east-1"
  - name: accessKey
    secretKeyRef:
      name: aws-credentials
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-credentials
      key: secretKey
```

```yaml
# dapr/components/secret-store-azure.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: azure-keyvault
  namespace: production
spec:
  type: secretstores.azure.keyvault
  version: v1
  metadata:
  - name: vaultName
    value: "my-app-keyvault"
  - name: azureTenantId
    value: "your-tenant-id"
  - name: azureClientId
    value: "your-client-id"
  - name: azureClientSecret
    secretKeyRef:
      name: azure-credentials
      key: clientSecret
```

```yaml
# dapr/components/secret-store-local.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: local-secrets
spec:
  type: secretstores.local.file
  version: v1
  metadata:
  - name: secretsFile
    value: "./secrets/local-secrets.json"
  - name: nestedSeparator
    value: "."
```

The local secrets file for development:

```json
{
  "database": {
    "host": "localhost",
    "port": "5432",
    "username": "devuser",
    "password": "devpassword"
  },
  "redis": {
    "password": "redis-dev-pass"
  },
  "stripe": {
    "apiKey": "sk_test_abc123",
    "webhookSecret": "whsec_test_xyz"
  }
}
```

## Fetching Secrets from Different Stores

Use the Dapr HTTP API to fetch secrets from any registered store by referencing its component name.

```python
import requests
import os

DAPR_HTTP_PORT = int(os.getenv("DAPR_HTTP_PORT", "3500"))

def get_secret(store_name: str, secret_name: str, key: str = None):
    """Fetch a secret from a specific Dapr secret store."""
    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/secrets/{store_name}/{secret_name}"
    response = requests.get(url)

    if response.status_code == 403:
        raise PermissionError(f"Access denied to secret '{secret_name}' in store '{store_name}'")
    if response.status_code == 404:
        raise KeyError(f"Secret '{secret_name}' not found in store '{store_name}'")

    response.raise_for_status()
    secret_data = response.json()

    if key:
        return secret_data.get(key, "")
    return secret_data

class SecretManager:
    """Abstraction layer for fetching secrets from multiple Dapr stores."""

    STORE_DB = "aws-secrets"
    STORE_PAYMENTS = "azure-keyvault"
    STORE_LOCAL = "local-secrets"

    def get_database_password(self) -> str:
        """Fetch DB password from AWS Secrets Manager."""
        return get_secret(self.STORE_DB, "prod/database/credentials", "password")

    def get_stripe_api_key(self) -> str:
        """Fetch Stripe key from Azure Key Vault."""
        return get_secret(self.STORE_PAYMENTS, "stripe-api-key", "stripe-api-key")

    def get_redis_password(self) -> str:
        """Fetch Redis password from local secrets (dev) or AWS (prod)."""
        if os.getenv("ENV") == "development":
            return get_secret(self.STORE_LOCAL, "redis.password", "redis.password")
        return get_secret(self.STORE_DB, "prod/redis/credentials", "password")

    def get_all_database_config(self) -> dict:
        """Bulk fetch all secrets for database configuration."""
        secrets = get_secret(self.STORE_DB, "prod/database/credentials")
        return {
            "host": secrets.get("host"),
            "port": secrets.get("port"),
            "username": secrets.get("username"),
            "password": secrets.get("password"),
            "database": secrets.get("database")
        }

# Usage
manager = SecretManager()
db_config = manager.get_all_database_config()
print(f"Connected to DB at {db_config['host']}:{db_config['port']}")
```

## Referencing Secrets in Component Definitions

Dapr components can reference secrets from any registered store, enabling a bootstrap pattern.

```yaml
# dapr/components/pubsub-with-secrets.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka:9092"
  - name: saslUsername
    secretKeyRef:
      name: kafka-credentials
      key: username
  - name: saslPassword
    secretKeyRef:
      name: kafka-credentials
      key: password
auth:
  secretStore: aws-secrets
```

This tells Dapr to fetch `kafka-credentials` from the `aws-secrets` store to configure the pub/sub component itself.

## Building a Secret Resolver with Fallback Logic

Implement fallback logic to try multiple stores when a secret is not found in the primary store.

```python
from typing import Optional

class FallbackSecretResolver:
    """
    Resolves secrets by trying multiple stores in order.
    Returns the first successful result.
    """

    def __init__(self, stores: list):
        self.stores = stores

    def resolve(self, secret_name: str, key: str = None) -> Optional[str]:
        last_error = None
        for store in self.stores:
            try:
                value = get_secret(store, secret_name, key)
                print(f"Resolved '{secret_name}' from store '{store}'")
                return value
            except KeyError:
                print(f"Secret '{secret_name}' not found in store '{store}', trying next...")
                last_error = KeyError(f"Secret not found in any store: {secret_name}")
            except PermissionError as e:
                print(f"Permission denied for '{secret_name}' in store '{store}', trying next...")
                last_error = e

        raise last_error or KeyError(f"Secret '{secret_name}' not found in any store")

# Resolve secrets with fallback: try AWS first, then Azure, then local
resolver = FallbackSecretResolver([
    "aws-secrets",
    "azure-keyvault",
    "local-secrets"
])

try:
    api_key = resolver.resolve("third-party/api-key", "value")
    print(f"API key resolved: {api_key[:4]}...")
except KeyError as e:
    print(f"Failed to resolve secret: {e}")
```

## Scoping Secret Store Access with Dapr Configuration

Restrict which applications can access which secret stores using Dapr's configuration API.

```yaml
# dapr/config.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: order-service-config
spec:
  secrets:
    scopes:
    - storeName: aws-secrets
      defaultAccess: deny
      allowedSecrets:
      - "prod/database/credentials"
      - "prod/redis/credentials"
    - storeName: azure-keyvault
      defaultAccess: deny
      allowedSecrets:
      - "stripe-api-key"
      - "sendgrid-api-key"
    - storeName: local-secrets
      defaultAccess: allow
```

Apply the configuration when running your service:

```bash
dapr run \
  --app-id order-service \
  --app-port 5000 \
  --config dapr/config.yaml \
  --components-path dapr/components \
  -- python app.py
```

## Summary

Using multiple secret stores in a single Dapr application gives you the flexibility to pull secrets from the right provider for each use case without coupling your application code to a specific vault implementation. You learned how to define multiple secret store components for AWS, Azure, and local file, fetch secrets from any store using the Dapr HTTP API, use `secretKeyRef` in component definitions to bootstrap other components securely, build fallback resolvers that try multiple stores in order, and restrict secret access using Dapr configuration scopes. This approach keeps your secret management strategy flexible and your application portable across environments.
