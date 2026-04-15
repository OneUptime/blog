# How to Use Dynamic Secrets with Dapr and HashiCorp Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret, HashiCorp Vault, Dynamic Secret, Security

Description: Learn how to use HashiCorp Vault dynamic secrets with Dapr to generate short-lived, on-demand credentials for databases and cloud services.

---

## What Are Dynamic Secrets?

Dynamic secrets are generated on-demand by Vault, are unique per request, and have a short TTL. Unlike static secrets that are shared and long-lived, dynamic secrets reduce the risk of credential compromise - each service instance gets its own credentials that expire automatically.

Vault can generate dynamic secrets for databases, AWS, Azure, Kubernetes, and many other backends.

## Setting Up Vault Dynamic Database Secrets

Configure Vault to generate PostgreSQL credentials dynamically:

```bash
# Enable the database secrets engine
vault secrets enable database

# Configure the PostgreSQL connection
vault write database/config/postgres \
  plugin_name=postgresql-database-plugin \
  allowed_roles="app-role,readonly-role" \
  connection_url="postgresql://{{username}}:{{password}}@postgres:5432/appdb?sslmode=disable" \
  username="vault-superuser" \
  password="superuser-password"

# Create a role with a 1-hour TTL
vault write database/roles/app-role \
  db_name=postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="4h"
```

## Dapr Component for Vault Dynamic Secrets

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: vault-dynamic
  namespace: default
spec:
  type: secretstores.hashicorp.vault
  version: v1
  metadata:
  - name: vaultAddr
    value: "https://vault.example.com:8200"
  - name: vaultTokenMountPath
    value: "/var/run/secrets/vault/token"
  - name: enginePath
    value: "database"
  - name: vaultKVPrefix
    value: "creds"
```

## Reading Dynamic Credentials via Dapr

```python
from dapr.clients import DaprClient
import psycopg2

class DynamicDBConnection:
    """Connection manager that fetches fresh credentials from Vault."""

    def __init__(self, store_name: str, role_name: str):
        self.store_name = store_name
        self.role_name = role_name
        self._conn = None
        self._lease_id = None

    def get_connection(self):
        if self._conn is None or self._conn.closed:
            self._conn = self._create_connection()
        return self._conn

    def _create_connection(self):
        with DaprClient() as client:
            # Dapr fetches dynamic creds from Vault's database/creds/{role}
            secret = client.get_secret(
                store_name=self.store_name,
                key=self.role_name,
            )
            username = secret.secret["username"]
            password = secret.secret["password"]

        print(f"Connecting with dynamic user: {username}")
        return psycopg2.connect(
            host="postgres",
            database="appdb",
            user=username,
            password=password,
        )

    def close(self):
        if self._conn and not self._conn.closed:
            self._conn.close()
```

## AWS Dynamic Secrets via Vault

Configure Vault to generate AWS IAM credentials dynamically:

```bash
# Enable the AWS secrets engine
vault secrets enable aws

# Configure AWS credentials for Vault to use
vault write aws/config/root \
  access_key=AKIAIOSFODNN7EXAMPLE \
  secret_key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  region=us-east-1

# Create a role that maps to an IAM policy
vault write aws/roles/s3-read \
  credential_type=iam_user \
  policy_document='{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:ListBucket"],
      "Resource": ["arn:aws:s3:::mybucket", "arn:aws:s3:::mybucket/*"]
    }]
  }' \
  default_ttl="1h" \
  max_ttl="4h"
```

```python
def get_s3_client():
    with DaprClient() as client:
        # Vault generates ephemeral IAM credentials
        secret = client.get_secret(
            store_name="vault-aws",
            key="s3-read",
        )
    import boto3
    return boto3.client(
        's3',
        aws_access_key_id=secret.secret["access_key"],
        aws_secret_access_key=secret.secret["secret_key"],
        region_name="us-east-1",
    )
```

## Lease Renewal

Dynamic secrets have a lease that must be renewed before expiry for long-running processes:

```bash
# Renew a lease via Vault API
curl -X POST \
  -H "X-Vault-Token: $VAULT_TOKEN" \
  -d '{"lease_id": "database/creds/app-role/abc123", "increment": 3600}' \
  https://vault.example.com:8200/v1/sys/leases/renew
```

## Summary

Dynamic secrets in Vault, accessed through Dapr's secret store, provide on-demand credentials with short TTLs that reduce the risk of long-term secret exposure. Configure Vault database roles with appropriate TTLs, read credentials via Dapr's secret API, and implement connection managers that reconnect when credentials expire. For AWS resources, Vault's AWS secrets engine generates ephemeral IAM users with fine-grained policies.
