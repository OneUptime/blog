# How to Use HashiCorp Vault Dynamic Secrets for Databases

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vault, Dynamic Secrets, Database, HashiCorp, Security

Description: Learn how to use Vault dynamic secrets to generate short-lived database credentials for improved security.

---

Static database credentials are a security risk. They rarely get rotated, often get shared, and remain valid long after they should expire. Vault dynamic secrets solve this by generating unique, short-lived credentials on demand. This guide shows you how to set up dynamic database secrets with Vault.

## What Are Dynamic Secrets?

Dynamic secrets are generated on demand and automatically revoked after a configurable TTL. Each request produces a unique set of credentials, so there is no credential sharing and no stale passwords.

```mermaid
flowchart LR
    A[Application] -->|Request Credentials| B[Vault]
    B -->|Generate Unique Creds| C[PostgreSQL]
    C -->|CREATE ROLE...| C
    B -->|Return Creds + TTL| A
    A -->|Use Creds| C

    style B fill:#7B68EE,color:#fff
```

## Static vs Dynamic Secrets

```mermaid
flowchart TD
    subgraph Static Secrets
        S1[One password for all apps]
        S2[Manual rotation needed]
        S3[Shared across environments]
        S4[No expiration by default]
    end

    subgraph Dynamic Secrets
        D1[Unique creds per request]
        D2[Automatic rotation via TTL]
        D3[Isolated per consumer]
        D4[Auto-revoked on expiry]
    end
```

## Architecture

When an application requests database credentials, Vault connects to the database, creates a new role with a random password, returns the credentials to the app, and revokes them when the lease expires.

```mermaid
sequenceDiagram
    participant App as Application
    participant V as Vault
    participant DB as PostgreSQL

    App->>V: GET /v1/database/creds/app-role
    V->>DB: CREATE ROLE "v-app-xyz" WITH PASSWORD '...'
    V->>DB: GRANT SELECT, INSERT ON tables TO "v-app-xyz"
    V-->>App: {username: "v-app-xyz", password: "...", lease: "1h"}

    Note over App: Use credentials for 1 hour

    V->>DB: DROP ROLE "v-app-xyz"
    Note over V: Lease expired - credentials revoked
```

## Setting Up the Database Secrets Engine

### Step 1: Enable the Engine

```bash
# Enable the database secrets engine at the default path.
# This engine manages dynamic credential generation.
vault secrets enable database
```

### Step 2: Configure the Database Connection

```bash
# Configure a connection to your PostgreSQL instance.
# Vault uses this connection to create and revoke roles.
vault write database/config/production-db \
  plugin_name=postgresql-database-plugin \
  allowed_roles="app-role,analytics-role" \
  connection_url="postgresql://{{username}}:{{password}}@postgres.production.svc:5432/appdb?sslmode=require" \
  username="vault_admin" \
  password="vault-admin-password"

# Rotate the root credentials so the original password
# is no longer valid. Only Vault knows the new password.
vault write -force database/rotate-root/production-db
```

### Step 3: Create a Role

```bash
# Define a role that generates credentials with specific permissions.
# The creation_statements SQL runs each time new credentials are requested.
vault write database/roles/app-role \
  db_name=production-db \
  creation_statements="
    CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';
    GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";
    GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO \"{{name}}\";
  " \
  revocation_statements="
    DROP ROLE IF EXISTS \"{{name}}\";
  " \
  default_ttl="1h" \
  max_ttl="24h"
```

### Step 4: Generate Credentials

```bash
# Request a new set of credentials from Vault.
# Each call creates a unique database user with a random password.
vault read database/creds/app-role

# Example output:
# Key                Value
# ---                -----
# lease_id           database/creds/app-role/abc123
# lease_duration     1h
# username           v-app-role-xkY2mn
# password           A1b2C3d4E5f6G7h8
```

## Using Dynamic Secrets in an Application

```python
# db_connect.py
# Demonstrates fetching dynamic database credentials from Vault
# and using them to connect to PostgreSQL.

import hvac
import psycopg2
import time


def get_vault_client() -> hvac.Client:
    """
    Create and return an authenticated Vault client.
    Uses the Kubernetes auth method when running in a pod.
    """
    client = hvac.Client(url="http://vault.vault.svc:8200")

    # Read the ServiceAccount token mounted by Kubernetes
    with open("/var/run/secrets/kubernetes.io/serviceaccount/token", "r") as f:
        jwt = f.read()

    # Authenticate using the Kubernetes auth method
    client.auth.kubernetes.login(
        role="app-role",
        jwt=jwt,
        mount_point="kubernetes"
    )

    return client


def get_database_credentials(client: hvac.Client) -> dict:
    """
    Request dynamic database credentials from Vault.
    Returns a dict with username, password, and lease duration.
    """
    # Read dynamic credentials from the database secrets engine
    response = client.secrets.database.generate_credentials(
        name="app-role",
        mount_point="database"
    )

    return {
        "username": response["data"]["username"],
        "password": response["data"]["password"],
        "lease_id": response["lease_id"],
        "lease_duration": response["lease_duration"],
    }


def connect_to_database(creds: dict):
    """
    Connect to PostgreSQL using the dynamic credentials.
    These credentials will be automatically revoked by Vault
    after the lease duration expires.
    """
    conn = psycopg2.connect(
        host="postgres.production.svc",
        port=5432,
        dbname="appdb",
        user=creds["username"],
        password=creds["password"],
        sslmode="require"
    )

    return conn


def main():
    # Initialize the Vault client
    vault_client = get_vault_client()

    # Get fresh dynamic credentials
    creds = get_database_credentials(vault_client)
    print(f"Got dynamic credentials: user={creds['username']}")
    print(f"Lease duration: {creds['lease_duration']} seconds")

    # Connect using the dynamic credentials
    conn = connect_to_database(creds)
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    print(f"Connected: {cursor.fetchone()[0]}")

    # Clean up
    cursor.close()
    conn.close()


if __name__ == "__main__":
    main()
```

## Lease Renewal

Applications can renew leases to extend credential lifetimes without generating new credentials.

```mermaid
flowchart TD
    A[Credentials Issued - TTL 1h] --> B{TTL > 50% Elapsed?}
    B -->|No| C[Continue Using Creds]
    C --> B
    B -->|Yes| D[Renew Lease]
    D --> E{Renewal Successful?}
    E -->|Yes| F[TTL Reset]
    F --> B
    E -->|No - Max TTL Hit| G[Request New Credentials]
    G --> A
```

```python
# renew_lease.py
# Renew a Vault lease to extend the credential lifetime.

def renew_lease(client: hvac.Client, lease_id: str, increment: int = 3600):
    """
    Renew a Vault lease to extend the credential lifetime.
    The increment is in seconds (default 1 hour).
    """
    try:
        response = client.sys.renew_lease(
            lease_id=lease_id,
            increment=increment
        )
        new_ttl = response["lease_duration"]
        print(f"Lease renewed. New TTL: {new_ttl} seconds")
        return True
    except hvac.exceptions.InvalidRequest:
        # Lease cannot be renewed (max TTL reached)
        print("Lease renewal failed. Requesting new credentials.")
        return False
```

## Revoking Credentials Early

If an application shuts down, it should revoke its credentials immediately rather than waiting for the TTL.

```python
# revoke_creds.py
# Revoke credentials when the application shuts down.

import signal
import sys


def revoke_on_shutdown(client: hvac.Client, lease_id: str):
    """
    Register a signal handler that revokes the lease
    when the application receives a termination signal.
    """
    def handler(signum, frame):
        print(f"Revoking lease {lease_id} on shutdown...")
        client.sys.revoke_lease(lease_id=lease_id)
        print("Lease revoked. Exiting.")
        sys.exit(0)

    # Handle SIGTERM (Kubernetes sends this on pod shutdown)
    signal.signal(signal.SIGTERM, handler)
    # Handle SIGINT (Ctrl+C)
    signal.signal(signal.SIGINT, handler)
```

## Monitoring Dynamic Secrets

Track lease counts, credential generation rates, and revocation failures. Anomalies in credential generation patterns can indicate unauthorized access.

OneUptime (https://oneuptime.com) integrates with Vault's metrics and audit logs. Set up monitors for Vault availability, track lease expiration trends, and get alerted when credential generation fails or lease revocations do not complete. This ensures your dynamic secrets infrastructure remains healthy and your database access stays secure.
