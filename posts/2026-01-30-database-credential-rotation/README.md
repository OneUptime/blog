# How to Build Database Credential Rotation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Security, Database, Credentials, Vault

Description: Learn to build database credential rotation using Vault for dynamic secrets.

---

Static database credentials are a security liability. They get shared in Slack channels, committed to repositories, and live forever in configuration files. When a credential is compromised, you face the painful task of rotating it across every service that uses it. Dynamic credential rotation solves this by generating short-lived credentials on demand and automatically revoking them when they expire.

## Why Rotate Database Credentials

The traditional approach of creating one database user per service and storing the password in environment variables has several problems:

- Credentials live indefinitely, giving attackers unlimited time to exploit leaked secrets
- Auditing becomes impossible when multiple services share the same user
- Rotation requires coordinated deployments across all dependent services
- Revocation after a breach means downtime while you update every config file

Dynamic credentials flip this model. Each application instance gets its own unique credentials that expire automatically. If a credential leaks, it becomes useless within minutes or hours.

```mermaid
flowchart LR
    subgraph Traditional["Static Credentials"]
        A1[Service A] --> C1[db_user / static_password]
        B1[Service B] --> C1
        C1 --> D1[(Database)]
    end

    subgraph Dynamic["Dynamic Credentials"]
        A2[Service A] --> V[Vault]
        B2[Service B] --> V
        V --> |"user_abc123 / temp_pass_1"| D2[(Database)]
        V --> |"user_xyz789 / temp_pass_2"| D2
    end
```

## Architecture Overview

HashiCorp Vault acts as the credential broker between your applications and databases. Applications authenticate to Vault, request database credentials, and receive unique username/password pairs with configurable time-to-live (TTL) values.

```mermaid
sequenceDiagram
    participant App as Application
    participant Vault as Vault Server
    participant DB as PostgreSQL

    App->>Vault: Authenticate (JWT/AppRole)
    Vault-->>App: Vault Token
    App->>Vault: Request DB credentials
    Vault->>DB: CREATE ROLE with privileges
    Vault-->>App: Username + Password (TTL: 1h)
    App->>DB: Connect with temp credentials
    Note over Vault,DB: After TTL expires
    Vault->>DB: DROP ROLE
```

## Setting Up Vault Database Secrets Engine

First, enable the database secrets engine and configure your PostgreSQL connection. The connection URL uses a privileged account that Vault will use to create and revoke dynamic users.

```bash
# Enable the database secrets engine at the default path
vault secrets enable database

# Configure PostgreSQL connection
# Vault uses this privileged account to create/revoke dynamic users
vault write database/config/myapp-postgres \
    plugin_name=postgresql-database-plugin \
    allowed_roles="myapp-readonly","myapp-readwrite" \
    connection_url="postgresql://{{username}}:{{password}}@postgres.example.com:5432/myapp?sslmode=require" \
    username="vault_admin" \
    password="vault_admin_password"
```

## Creating Role Definitions

Roles define what privileges dynamic users receive and how long their credentials last. Create separate roles for different access levels so applications only get the permissions they need.

This role creates read-only users with a 1-hour default TTL and a 4-hour maximum.

```bash
# Create a read-only role
# Dynamic users get SELECT on all tables in the public schema
vault write database/roles/myapp-readonly \
    db_name=myapp-postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    revocation_statements="DROP ROLE IF EXISTS \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="4h"
```

For services that need write access, create a separate role with broader permissions.

```bash
# Create a read-write role for services that modify data
vault write database/roles/myapp-readwrite \
    db_name=myapp-postgres \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    revocation_statements="DROP ROLE IF EXISTS \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="4h"
```

## Requesting Credentials from Applications

Applications authenticate to Vault and request credentials from the appropriate role. Here's a Python example using the hvac library that handles authentication, credential retrieval, and automatic renewal.

```python
import hvac
import psycopg2
import os
import threading
import time


class VaultDatabaseClient:
    """Manages dynamic database credentials from Vault."""

    def __init__(self, vault_addr, vault_role, db_role):
        self.client = hvac.Client(url=vault_addr)
        self.db_role = db_role
        self._credentials = None
        self._lease_id = None
        self._lock = threading.Lock()

        # Authenticate using Kubernetes service account JWT
        # In production, use the JWT from the mounted service account
        jwt_path = "/var/run/secrets/kubernetes.io/serviceaccount/token"
        with open(jwt_path, "r") as f:
            jwt = f.read()

        # Login to Vault with Kubernetes auth method
        self.client.auth.kubernetes.login(
            role=vault_role,
            jwt=jwt,
            mount_point="kubernetes"
        )

    def get_credentials(self):
        """Fetch new database credentials from Vault."""
        with self._lock:
            # Read dynamic credentials from the database secrets engine
            response = self.client.secrets.database.generate_credentials(
                name=self.db_role,
                mount_point="database"
            )

            self._credentials = {
                "username": response["data"]["username"],
                "password": response["data"]["password"]
            }
            self._lease_id = response["lease_id"]
            self._lease_duration = response["lease_duration"]

            return self._credentials

    def get_connection(self, host, port, database):
        """Get a database connection with current credentials."""
        creds = self.get_credentials()

        return psycopg2.connect(
            host=host,
            port=port,
            database=database,
            user=creds["username"],
            password=creds["password"],
            sslmode="require"
        )

    def start_renewal_thread(self):
        """Background thread that renews the lease before expiry."""
        def renew_loop():
            while True:
                # Renew at 50% of lease duration
                sleep_time = self._lease_duration * 0.5
                time.sleep(sleep_time)

                try:
                    # Attempt to renew the existing lease
                    self.client.sys.renew_lease(
                        lease_id=self._lease_id,
                        increment=self._lease_duration
                    )
                except Exception as e:
                    # If renewal fails, fetch new credentials
                    print(f"Lease renewal failed: {e}, fetching new credentials")
                    self.get_credentials()

        thread = threading.Thread(target=renew_loop, daemon=True)
        thread.start()
```

## Configuring Vault Authentication

Applications need a way to authenticate to Vault. In Kubernetes environments, the Kubernetes auth method lets pods authenticate using their service account tokens.

```bash
# Enable Kubernetes auth method
vault auth enable kubernetes

# Configure it to verify JWTs against your cluster
vault write auth/kubernetes/config \
    kubernetes_host="https://kubernetes.default.svc" \
    kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt

# Create a role that maps service accounts to Vault policies
vault write auth/kubernetes/role/myapp \
    bound_service_account_names=myapp \
    bound_service_account_namespaces=production \
    policies=myapp-db-readonly \
    ttl=1h
```

Create a Vault policy that grants access to the database credentials.

```hcl
# myapp-db-readonly.hcl
# Policy allowing read-only database credential generation

# Allow generating credentials from the readonly role
path "database/creds/myapp-readonly" {
  capabilities = ["read"]
}

# Allow renewing leases (credentials)
path "sys/leases/renew" {
  capabilities = ["update"]
}
```

Apply the policy to Vault.

```bash
vault policy write myapp-db-readonly myapp-db-readonly.hcl
```

## Handling Connection Pooling

Connection pools complicate credential rotation because they hold long-lived connections. Configure your pool to periodically refresh connections and handle authentication failures gracefully.

```python
from sqlalchemy import create_engine, event
from sqlalchemy.pool import QueuePool


def create_rotating_engine(vault_client, db_host, db_name):
    """Create a SQLAlchemy engine that handles credential rotation."""

    def get_connection_url():
        creds = vault_client.get_credentials()
        return f"postgresql://{creds['username']}:{creds['password']}@{db_host}/{db_name}"

    engine = create_engine(
        get_connection_url(),
        poolclass=QueuePool,
        pool_size=5,
        max_overflow=10,
        # Recycle connections every 30 minutes
        # Ensures stale credentials don't accumulate
        pool_recycle=1800,
        # Test connections before use
        pool_pre_ping=True
    )

    # Handle connection failures by refreshing credentials
    @event.listens_for(engine, "connect")
    def on_connect(dbapi_conn, connection_record):
        connection_record.info["credentials_time"] = time.time()

    @event.listens_for(engine, "checkout")
    def on_checkout(dbapi_conn, connection_record, connection_proxy):
        # If credentials are older than 45 minutes, invalidate
        age = time.time() - connection_record.info.get("credentials_time", 0)
        if age > 2700:  # 45 minutes
            raise Exception("Connection too old, forcing refresh")

    return engine
```

## Monitoring and Alerting

Track credential generation and failures to catch issues before they cause outages.

```yaml
# Prometheus alerting rules for Vault database secrets
groups:
  - name: vault-database
    rules:
      # Alert if credential generation is failing
      - alert: VaultDatabaseCredentialFailures
        expr: |
          increase(vault_secret_kv_count{
            mount_point="database",
            operation="read",
            status="failure"
          }[5m]) > 5
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Vault database credential generation failing"

      # Alert if too many leases exist (credential leak indicator)
      - alert: VaultExcessiveLeases
        expr: vault_expire_num_leases > 10000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Excessive Vault leases may indicate credential leak"
```

## Handling Rotation Failures

When Vault cannot reach the database or create new users, applications need fallback behavior. Implement circuit breakers and credential caching to survive temporary Vault outages.

```mermaid
flowchart TD
    A[Request Credentials] --> B{Vault Available?}
    B -->|Yes| C[Generate New Credentials]
    B -->|No| D{Cached Credentials Valid?}
    D -->|Yes| E[Use Cached Credentials]
    D -->|No| F[Fail with Error]
    C --> G[Cache Credentials Locally]
    G --> H[Return Credentials]
    E --> H
```

---

Dynamic credential rotation eliminates the risk of long-lived database passwords sitting in configuration files. With Vault handling the complexity, your applications get unique, auditable, short-lived credentials without manual intervention. Start with a single service, validate the renewal logic works correctly, then roll it out across your infrastructure. The upfront investment pays off the first time you need to revoke access and can do it instantly without a deployment.
