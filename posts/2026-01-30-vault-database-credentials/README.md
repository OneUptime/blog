# How to Create Vault Database Credentials

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Vault, Database, Security, Credentials

Description: Generate dynamic database credentials with HashiCorp Vault for PostgreSQL, MySQL, and other databases with automatic rotation and TTL management.

---

HashiCorp Vault's database secrets engine generates short-lived credentials on demand. Instead of sharing static passwords across teams and applications, each service gets unique credentials that expire automatically. This eliminates password sprawl and provides audit trails for every credential issued.

## Why Dynamic Database Credentials Matter

Static database passwords create several problems:

- **No accountability**: When multiple services share one password, you cannot trace which application executed a query.
- **Rotation pain**: Changing a shared password requires coordinating updates across all consumers simultaneously.
- **Revocation gaps**: If a service is compromised, you must rotate credentials for every other service using that password.
- **Compliance burden**: Auditors want to see credential rotation, and static passwords make this difficult to prove.

Dynamic credentials solve these issues. Vault creates a unique username and password for each request, tracks who requested it, and automatically revokes it after the TTL expires.

## Prerequisites

Before starting, ensure you have:

- Vault server running (version 1.12 or later recommended)
- Administrative access to your database (PostgreSQL, MySQL, or another supported engine)
- Vault CLI installed and configured
- A Vault policy that grants access to the database secrets engine path

This guide uses PostgreSQL for examples, but the concepts apply to all supported databases.

## Supported Databases

Vault's database secrets engine supports many database systems out of the box.

| Database | Plugin Name | Connection URL Format |
|----------|-------------|----------------------|
| PostgreSQL | postgresql-database-plugin | postgresql://{{username}}:{{password}}@host:5432/dbname |
| MySQL | mysql-database-plugin | {{username}}:{{password}}@tcp(host:3306)/dbname |
| MariaDB | mysql-database-plugin | {{username}}:{{password}}@tcp(host:3306)/dbname |
| MongoDB | mongodb-database-plugin | mongodb://{{username}}:{{password}}@host:27017/admin |
| Microsoft SQL Server | mssql-database-plugin | sqlserver://{{username}}:{{password}}@host:1433 |
| Oracle | oracle-database-plugin | {{username}}/{{password}}@host:1521/ORCL |
| Cassandra | cassandra-database-plugin | N/A (uses separate fields) |
| Elasticsearch | elasticsearch-database-plugin | N/A (uses separate fields) |
| Redis | redis-database-plugin | redis://{{username}}:{{password}}@host:6379 |
| Snowflake | snowflake-database-plugin | N/A (uses separate fields) |

## Step 1: Enable the Database Secrets Engine

The database secrets engine must be enabled at a path before you can configure connections. Most teams use `database/` as the mount path, but you can choose any path that fits your organization.

```bash
# Enable the database secrets engine at the default path
# You can specify a different path with -path=custom/path
vault secrets enable database
```

Verify the engine is enabled by listing all secret engines:

```bash
# List all enabled secrets engines
# You should see database/ in the output
vault secrets list
```

Expected output:

```
Path          Type         Description
----          ----         -----------
cubbyhole/    cubbyhole    per-token private secret storage
database/     database     n/a
identity/     identity     identity store
secret/       kv           key/value secret storage
sys/          system       system endpoints
```

## Step 2: Configure the Database Connection

Vault needs connection details and credentials to manage your database. The credentials you provide here should belong to a database user with permission to create and revoke other users.

Create a dedicated Vault admin user in PostgreSQL first.

```sql
-- Connect to PostgreSQL as a superuser and create the Vault admin user
-- This user needs permission to create roles and grant privileges
CREATE ROLE vault_admin WITH LOGIN PASSWORD 'initial-password' CREATEROLE;

-- Grant the ability to manage other users
GRANT CREATE ON DATABASE myapp TO vault_admin;

-- Grant permission to assign privileges on the public schema
GRANT ALL PRIVILEGES ON SCHEMA public TO vault_admin;

-- Allow Vault admin to grant select/insert/update/delete on existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO vault_admin;

-- Ensure future tables can also be granted
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT ALL PRIVILEGES ON TABLES TO vault_admin;
```

Now configure the connection in Vault.

```bash
# Configure the PostgreSQL connection in Vault
# plugin_name specifies which database plugin to use
# connection_url uses template variables for credentials
# allowed_roles restricts which roles can use this connection
vault write database/config/myapp-postgres \
    plugin_name="postgresql-database-plugin" \
    connection_url="postgresql://{{username}}:{{password}}@db.example.com:5432/myapp?sslmode=require" \
    allowed_roles="myapp-readonly,myapp-readwrite,myapp-admin" \
    username="vault_admin" \
    password="initial-password"
```

The `{{username}}` and `{{password}}` placeholders in the connection URL are replaced by Vault when connecting to the database.

### Rotate the Root Credentials

After configuring the connection, rotate the root credentials so that only Vault knows the password. This prevents anyone from using the original credentials to bypass Vault.

```bash
# Rotate the root credentials
# Vault generates a new password and updates the database
# The original password will no longer work
vault write -force database/rotate-root/myapp-postgres
```

After rotation, Vault is the only system that knows the vault_admin password. Store the original password securely in case you need to recover the connection, but do not use it for regular access.

## Step 3: Create Database Roles

Roles define what credentials Vault generates. Each role specifies:

- The SQL statements to create and revoke users
- The default and maximum TTL for credentials
- Which database connection to use

### Dynamic Role: Read-Only Access

This role creates users with SELECT permission only. Good for reporting services, analytics dashboards, and read replicas.

```bash
# Create a read-only role
# creation_statements runs when credentials are requested
# revocation_statements runs when credentials expire or are revoked
vault write database/roles/myapp-readonly \
    db_name="myapp-postgres" \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    revocation_statements="REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM \"{{name}}\"; \
        DROP ROLE IF EXISTS \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"
```

Template variables in the SQL statements:

| Variable | Description |
|----------|-------------|
| `{{name}}` | Generated username (e.g., v-token-myapp-read-abc123) |
| `{{password}}` | Generated password (random, high-entropy) |
| `{{expiration}}` | Timestamp when credentials expire |

### Dynamic Role: Read-Write Access

Application services typically need both read and write access. This role grants full DML permissions.

```bash
# Create a read-write role for application services
vault write database/roles/myapp-readwrite \
    db_name="myapp-postgres" \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\"; \
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO \"{{name}}\";" \
    revocation_statements="REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM \"{{name}}\"; \
        REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM \"{{name}}\"; \
        DROP ROLE IF EXISTS \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="8h"
```

### Dynamic Role: Admin Access

For migration scripts, schema changes, and administrative tasks. Use sparingly and with short TTLs.

```bash
# Create an admin role with DDL permissions
# Keep TTL short since admin access is powerful
vault write database/roles/myapp-admin \
    db_name="myapp-postgres" \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT ALL PRIVILEGES ON DATABASE myapp TO \"{{name}}\"; \
        GRANT ALL PRIVILEGES ON SCHEMA public TO \"{{name}}\"; \
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"{{name}}\"; \
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO \"{{name}}\";" \
    revocation_statements="REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM \"{{name}}\"; \
        REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM \"{{name}}\"; \
        REVOKE ALL PRIVILEGES ON SCHEMA public FROM \"{{name}}\"; \
        REVOKE ALL PRIVILEGES ON DATABASE myapp FROM \"{{name}}\"; \
        DROP ROLE IF EXISTS \"{{name}}\";" \
    default_ttl="15m" \
    max_ttl="1h"
```

## Step 4: Generate Credentials

With roles configured, applications can request credentials. Each request creates a new database user with the permissions defined in the role.

```bash
# Request read-only credentials
vault read database/creds/myapp-readonly
```

Output:

```
Key                Value
---                -----
lease_id           database/creds/myapp-readonly/abc123def456
lease_duration     1h
lease_renewable    true
password           A1b2C3d4E5f6G7h8
username           v-token-myapp-read-abc123def456
```

The `lease_id` is important. You need it to renew or revoke credentials before they expire.

### Generate Credentials with Custom TTL

Override the default TTL when requesting credentials.

```bash
# Request credentials with a 30-minute TTL instead of the default 1 hour
vault read -ttl=30m database/creds/myapp-readonly
```

### Renew Credentials Before Expiration

If your application needs credentials longer than the default TTL, renew the lease before it expires.

```bash
# Renew the lease for another period (up to max_ttl)
vault lease renew database/creds/myapp-readonly/abc123def456

# Renew with a specific duration
vault lease renew -increment=30m database/creds/myapp-readonly/abc123def456
```

### Revoke Credentials Immediately

When a service is decommissioned or compromised, revoke its credentials without waiting for TTL expiration.

```bash
# Revoke specific credentials using the lease ID
vault lease revoke database/creds/myapp-readonly/abc123def456

# Revoke all credentials for a specific role (emergency use)
vault lease revoke -prefix database/creds/myapp-readonly/
```

## Step 5: Configure Static Roles

Dynamic credentials work well for most applications, but some legacy systems or third-party tools require fixed usernames. Static roles solve this by rotating the password of an existing database user on a schedule.

### Comparison: Dynamic vs Static Roles

| Aspect | Dynamic Roles | Static Roles |
|--------|---------------|--------------|
| Username | Generated per request | Fixed, pre-existing user |
| Password | Generated per request | Rotated on schedule |
| Use case | Modern applications | Legacy apps, third-party tools |
| Audit trail | Each credential is unique | Same username, password changes |
| Revocation | Lease-based, automatic | Manual password rotation |
| Credential sprawl | None (credentials expire) | Potential if rotation fails |

### Create a Static Role

First, create the database user that Vault will manage.

```sql
-- Create the user that Vault will manage
-- Vault will rotate this user's password automatically
CREATE ROLE myapp_service WITH LOGIN PASSWORD 'temporary-password';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO myapp_service;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO myapp_service;
```

Configure the static role in Vault.

```bash
# Create a static role that rotates password every 24 hours
# rotation_period defines how often Vault changes the password
vault write database/static-roles/myapp-service \
    db_name="myapp-postgres" \
    username="myapp_service" \
    rotation_period="24h"
```

### Retrieve Static Credentials

Static credentials use a different path than dynamic credentials.

```bash
# Get the current credentials for the static role
vault read database/static-creds/myapp-service
```

Output:

```
Key                    Value
---                    -----
last_vault_rotation    2026-01-30T10:00:00.000000Z
password               X9y8Z7w6V5u4T3s2
rotation_period        24h
ttl                    23h45m30s
username               myapp_service
```

The `ttl` shows time remaining until the next rotation. Applications should re-fetch credentials before this expires.

### Force Password Rotation

Trigger an immediate password rotation if you suspect credentials are compromised.

```bash
# Immediately rotate the static role password
vault write -force database/rotate-role/myapp-service
```

## Step 6: Application Integration

Applications need to fetch credentials from Vault and handle renewal or re-fetching before expiration.

### Python Example with hvac

This example uses the hvac library to fetch PostgreSQL credentials and connect to the database.

```python
#!/usr/bin/env python3
"""
Vault database credential fetcher for Python applications.
Demonstrates fetching dynamic credentials and connecting to PostgreSQL.
"""

import hvac
import psycopg2
from contextlib import contextmanager
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class VaultDatabaseClient:
    """
    Manages database connections using Vault-generated credentials.
    Handles credential fetching, renewal, and reconnection.
    """

    def __init__(self, vault_addr: str, vault_token: str, role: str, db_host: str, db_name: str):
        # Initialize Vault client
        self.client = hvac.Client(url=vault_addr, token=vault_token)
        self.role = role
        self.db_host = db_host
        self.db_name = db_name
        self.lease_id = None
        self.credentials = None
        self.lease_duration = 0
        self.lease_obtained_at = 0

    def fetch_credentials(self) -> dict:
        """
        Fetch new database credentials from Vault.
        Returns dict with username and password.
        """
        # Read credentials from the database secrets engine
        response = self.client.secrets.database.generate_credentials(
            name=self.role,
            mount_point="database"
        )

        # Store lease information for renewal
        self.lease_id = response["lease_id"]
        self.lease_duration = response["lease_duration"]
        self.lease_obtained_at = time.time()

        self.credentials = {
            "username": response["data"]["username"],
            "password": response["data"]["password"]
        }

        logger.info(
            f"Fetched credentials for role {self.role}, "
            f"lease duration: {self.lease_duration}s"
        )

        return self.credentials

    def should_renew(self, threshold_seconds: int = 300) -> bool:
        """
        Check if credentials should be renewed.
        Returns True if less than threshold_seconds remain on the lease.
        """
        if not self.lease_obtained_at:
            return True

        elapsed = time.time() - self.lease_obtained_at
        remaining = self.lease_duration - elapsed

        return remaining < threshold_seconds

    def renew_credentials(self) -> bool:
        """
        Renew the current lease.
        Returns True if renewal succeeded, False otherwise.
        """
        if not self.lease_id:
            logger.warning("No lease to renew, fetching new credentials")
            self.fetch_credentials()
            return True

        try:
            response = self.client.sys.renew_lease(
                lease_id=self.lease_id
            )
            self.lease_duration = response["lease_duration"]
            self.lease_obtained_at = time.time()
            logger.info(f"Renewed lease, new duration: {self.lease_duration}s")
            return True
        except hvac.exceptions.InvalidRequest:
            # Lease expired or invalid, fetch new credentials
            logger.warning("Lease renewal failed, fetching new credentials")
            self.fetch_credentials()
            return True

    def revoke_credentials(self):
        """
        Revoke current credentials when shutting down.
        Good practice to clean up credentials you no longer need.
        """
        if self.lease_id:
            try:
                self.client.sys.revoke_lease(lease_id=self.lease_id)
                logger.info(f"Revoked lease {self.lease_id}")
            except Exception as e:
                logger.error(f"Failed to revoke lease: {e}")

    @contextmanager
    def get_connection(self):
        """
        Context manager that provides a database connection.
        Handles credential refresh if needed.
        """
        # Renew or fetch credentials if needed
        if self.should_renew():
            if self.lease_id:
                self.renew_credentials()
            else:
                self.fetch_credentials()

        # Create connection with current credentials
        conn = psycopg2.connect(
            host=self.db_host,
            database=self.db_name,
            user=self.credentials["username"],
            password=self.credentials["password"],
            sslmode="require"
        )

        try:
            yield conn
        finally:
            conn.close()


# Usage example
def main():
    # Initialize the Vault database client
    db_client = VaultDatabaseClient(
        vault_addr="https://vault.example.com:8200",
        vault_token="s.xxxxxxxxxxxxxxxxxxxxxxxx",
        role="myapp-readonly",
        db_host="db.example.com",
        db_name="myapp"
    )

    try:
        # Use the connection context manager
        with db_client.get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT version();")
                version = cur.fetchone()
                print(f"Connected to: {version[0]}")

                cur.execute("SELECT COUNT(*) FROM users;")
                count = cur.fetchone()
                print(f"User count: {count[0]}")
    finally:
        # Clean up credentials on shutdown
        db_client.revoke_credentials()


if __name__ == "__main__":
    main()
```

### Go Example with Vault SDK

This Go example demonstrates the same pattern using the official Vault SDK.

```go
package main

import (
    "context"
    "database/sql"
    "fmt"
    "log"
    "sync"
    "time"

    vault "github.com/hashicorp/vault/api"
    _ "github.com/lib/pq"
)

// VaultDBClient manages database connections with Vault credentials
type VaultDBClient struct {
    vaultClient   *vault.Client
    role          string
    dbHost        string
    dbName        string

    mu            sync.RWMutex
    username      string
    password      string
    leaseID       string
    leaseDuration int
    leaseObtained time.Time
}

// NewVaultDBClient creates a new client for Vault-managed database credentials
func NewVaultDBClient(vaultAddr, vaultToken, role, dbHost, dbName string) (*VaultDBClient, error) {
    // Configure and create Vault client
    config := vault.DefaultConfig()
    config.Address = vaultAddr

    client, err := vault.NewClient(config)
    if err != nil {
        return nil, fmt.Errorf("failed to create vault client: %w", err)
    }

    client.SetToken(vaultToken)

    return &VaultDBClient{
        vaultClient: client,
        role:        role,
        dbHost:      dbHost,
        dbName:      dbName,
    }, nil
}

// FetchCredentials retrieves new database credentials from Vault
func (c *VaultDBClient) FetchCredentials(ctx context.Context) error {
    c.mu.Lock()
    defer c.mu.Unlock()

    // Read credentials from database secrets engine
    path := fmt.Sprintf("database/creds/%s", c.role)
    secret, err := c.vaultClient.Logical().ReadWithContext(ctx, path)
    if err != nil {
        return fmt.Errorf("failed to read credentials: %w", err)
    }

    if secret == nil {
        return fmt.Errorf("no credentials returned for role %s", c.role)
    }

    // Extract credential data
    c.username = secret.Data["username"].(string)
    c.password = secret.Data["password"].(string)
    c.leaseID = secret.LeaseID
    c.leaseDuration = secret.LeaseDuration
    c.leaseObtained = time.Now()

    log.Printf("Fetched credentials for role %s, lease: %s, duration: %ds",
        c.role, c.leaseID, c.leaseDuration)

    return nil
}

// ShouldRenew checks if credentials need renewal
func (c *VaultDBClient) ShouldRenew(threshold time.Duration) bool {
    c.mu.RLock()
    defer c.mu.RUnlock()

    if c.leaseObtained.IsZero() {
        return true
    }

    elapsed := time.Since(c.leaseObtained)
    remaining := time.Duration(c.leaseDuration)*time.Second - elapsed

    return remaining < threshold
}

// RenewCredentials extends the lease or fetches new credentials
func (c *VaultDBClient) RenewCredentials(ctx context.Context) error {
    c.mu.Lock()
    defer c.mu.Unlock()

    if c.leaseID == "" {
        c.mu.Unlock()
        return c.FetchCredentials(ctx)
    }

    // Attempt to renew the lease
    secret, err := c.vaultClient.Sys().RenewWithContext(ctx, c.leaseID, 0)
    if err != nil {
        log.Printf("Lease renewal failed: %v, fetching new credentials", err)
        c.mu.Unlock()
        return c.FetchCredentials(ctx)
    }

    c.leaseDuration = secret.LeaseDuration
    c.leaseObtained = time.Now()

    log.Printf("Renewed lease %s, new duration: %ds", c.leaseID, c.leaseDuration)

    return nil
}

// RevokeCredentials cleans up the current lease
func (c *VaultDBClient) RevokeCredentials(ctx context.Context) error {
    c.mu.Lock()
    defer c.mu.Unlock()

    if c.leaseID == "" {
        return nil
    }

    err := c.vaultClient.Sys().RevokeWithContext(ctx, c.leaseID)
    if err != nil {
        return fmt.Errorf("failed to revoke lease: %w", err)
    }

    log.Printf("Revoked lease %s", c.leaseID)
    c.leaseID = ""

    return nil
}

// GetDB returns a database connection using current credentials
func (c *VaultDBClient) GetDB(ctx context.Context) (*sql.DB, error) {
    // Refresh credentials if needed
    if c.ShouldRenew(5 * time.Minute) {
        if c.leaseID != "" {
            if err := c.RenewCredentials(ctx); err != nil {
                return nil, err
            }
        } else {
            if err := c.FetchCredentials(ctx); err != nil {
                return nil, err
            }
        }
    }

    c.mu.RLock()
    username := c.username
    password := c.password
    c.mu.RUnlock()

    // Build connection string
    connStr := fmt.Sprintf(
        "host=%s user=%s password=%s dbname=%s sslmode=require",
        c.dbHost, username, password, c.dbName,
    )

    return sql.Open("postgres", connStr)
}

func main() {
    ctx := context.Background()

    // Initialize the Vault database client
    client, err := NewVaultDBClient(
        "https://vault.example.com:8200",
        "s.xxxxxxxxxxxxxxxxxxxxxxxx",
        "myapp-readonly",
        "db.example.com",
        "myapp",
    )
    if err != nil {
        log.Fatalf("Failed to create client: %v", err)
    }

    // Ensure credentials are revoked on shutdown
    defer client.RevokeCredentials(ctx)

    // Get a database connection
    db, err := client.GetDB(ctx)
    if err != nil {
        log.Fatalf("Failed to get database connection: %v", err)
    }
    defer db.Close()

    // Execute a query
    var version string
    err = db.QueryRowContext(ctx, "SELECT version()").Scan(&version)
    if err != nil {
        log.Fatalf("Query failed: %v", err)
    }

    fmt.Printf("Connected to: %s\n", version)
}
```

## Step 7: Kubernetes Integration

In Kubernetes environments, the Vault Agent Injector or Vault CSI Provider can automatically inject credentials into pods.

### Vault Agent Injector Annotations

Add annotations to your deployment to have Vault Agent inject database credentials as files or environment variables.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp-api
  template:
    metadata:
      labels:
        app: myapp-api
      annotations:
        # Enable Vault Agent injection
        vault.hashicorp.com/agent-inject: "true"

        # Vault role to authenticate as (Kubernetes auth method)
        vault.hashicorp.com/role: "myapp-api"

        # Inject database credentials as a file
        vault.hashicorp.com/agent-inject-secret-db-creds: "database/creds/myapp-readwrite"

        # Template the credentials as environment variables
        vault.hashicorp.com/agent-inject-template-db-creds: |
          {{- with secret "database/creds/myapp-readwrite" -}}
          export DB_USERNAME="{{ .Data.username }}"
          export DB_PASSWORD="{{ .Data.password }}"
          {{- end -}}
    spec:
      serviceAccountName: myapp-api
      containers:
        - name: api
          image: ghcr.io/example/myapp-api:1.0.0
          command:
            - /bin/sh
            - -c
            # Source the credentials file before starting the app
            - source /vault/secrets/db-creds && ./myapp-api
          env:
            - name: DB_HOST
              value: "db.example.com"
            - name: DB_NAME
              value: "myapp"
```

### Vault CSI Provider

For environments using the Secrets Store CSI Driver, mount Vault secrets as volumes.

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: vault-db-creds
  namespace: production
spec:
  provider: vault
  parameters:
    # Vault server address
    vaultAddress: "https://vault.example.com:8200"

    # Vault role for Kubernetes auth
    roleName: "myapp-api"

    # Secrets to fetch
    objects: |
      - objectName: "db-username"
        secretPath: "database/creds/myapp-readwrite"
        secretKey: "username"
      - objectName: "db-password"
        secretPath: "database/creds/myapp-readwrite"
        secretKey: "password"

  # Sync to Kubernetes Secret for use as env vars
  secretObjects:
    - secretName: myapp-db-creds
      type: Opaque
      data:
        - objectName: db-username
          key: DB_USERNAME
        - objectName: db-password
          key: DB_PASSWORD
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp-api
  template:
    metadata:
      labels:
        app: myapp-api
    spec:
      serviceAccountName: myapp-api
      containers:
        - name: api
          image: ghcr.io/example/myapp-api:1.0.0
          env:
            - name: DB_HOST
              value: "db.example.com"
            - name: DB_NAME
              value: "myapp"
          envFrom:
            - secretRef:
                name: myapp-db-creds
          volumeMounts:
            - name: secrets-store
              mountPath: "/mnt/secrets"
              readOnly: true
      volumes:
        - name: secrets-store
          csi:
            driver: secrets-store.csi.k8s.io
            readOnly: true
            volumeAttributes:
              secretProviderClass: vault-db-creds
```

## Step 8: Vault Policies

Control who can generate credentials by creating appropriate Vault policies.

### Read-Only Application Policy

This policy allows an application to read credentials from the myapp-readonly role only.

```hcl
# Policy: myapp-readonly-app
# Allows reading credentials from the myapp-readonly role

# Generate read-only database credentials
path "database/creds/myapp-readonly" {
  capabilities = ["read"]
}

# Allow the application to renew its own leases
path "sys/leases/renew" {
  capabilities = ["update"]
}

# Allow the application to revoke its own leases
path "sys/leases/revoke" {
  capabilities = ["update"]
}
```

### Read-Write Application Policy

For services that need write access to the database.

```hcl
# Policy: myapp-readwrite-app
# Allows reading credentials from the myapp-readwrite role

# Generate read-write database credentials
path "database/creds/myapp-readwrite" {
  capabilities = ["read"]
}

# Allow lease renewal
path "sys/leases/renew" {
  capabilities = ["update"]
}

# Allow lease revocation
path "sys/leases/revoke" {
  capabilities = ["update"]
}
```

### Admin Policy for Operations Team

Operations teams need broader access to manage connections and roles.

```hcl
# Policy: database-admin
# Full access to database secrets engine management

# Manage database connections
path "database/config/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Manage dynamic roles
path "database/roles/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Manage static roles
path "database/static-roles/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

# Rotate root credentials
path "database/rotate-root/*" {
  capabilities = ["update"]
}

# Rotate static role credentials
path "database/rotate-role/*" {
  capabilities = ["update"]
}

# Generate credentials for any role (for testing)
path "database/creds/*" {
  capabilities = ["read"]
}

# Read static credentials
path "database/static-creds/*" {
  capabilities = ["read"]
}

# Manage leases
path "sys/leases/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}
```

Apply policies with the Vault CLI.

```bash
# Create the application policies
vault policy write myapp-readonly-app policies/myapp-readonly-app.hcl
vault policy write myapp-readwrite-app policies/myapp-readwrite-app.hcl

# Create the admin policy
vault policy write database-admin policies/database-admin.hcl
```

## Step 9: TTL Best Practices

Choosing the right TTL involves balancing security and operational overhead.

| Use Case | Recommended Default TTL | Recommended Max TTL | Rationale |
|----------|------------------------|---------------------|-----------|
| Interactive queries | 15-30 minutes | 2 hours | Short sessions, manual use |
| Long-running jobs | 1-4 hours | 8 hours | Batch processing needs stability |
| Web applications | 1 hour | 4 hours | Balance between reconnection and security |
| CI/CD pipelines | 15 minutes | 1 hour | Short, focused tasks |
| Admin access | 15 minutes | 1 hour | Minimize exposure window |
| Static roles | N/A | N/A | Use rotation_period instead (24-72 hours) |

### Tuning Tips

1. **Start short, extend if needed**: Begin with 1-hour default TTL and increase only if applications struggle with reconnection.

2. **Monitor lease counts**: If Vault is creating thousands of leases, consider longer TTLs or connection pooling.

3. **Set max_ttl slightly higher than default_ttl**: This allows applications to renew once or twice without forcing new credential generation.

4. **Use shorter TTLs for privileged roles**: Admin roles should have 15-minute defaults to limit exposure.

## Monitoring and Troubleshooting

### Check Active Leases

Monitor how many credentials are currently active.

```bash
# List all leases under the database path
vault list sys/leases/lookup/database/creds/myapp-readonly

# Get details about a specific lease
vault lease lookup database/creds/myapp-readonly/abc123def456
```

### Verify Database Connection

Test the Vault connection to your database.

```bash
# Check connection status (requires database-admin policy)
vault read database/config/myapp-postgres
```

### Common Issues and Solutions

**Problem**: Credentials fail to create with permission denied.

```bash
# Check if the Vault admin user has CREATEROLE permission
# In PostgreSQL:
SELECT rolcreaterole FROM pg_roles WHERE rolname = 'vault_admin';
```

**Problem**: Revocation fails with user still connected.

```sql
-- The revocation_statements must handle active connections
-- Add to your role definition:
-- REVOKE CONNECT ON DATABASE myapp FROM "{{name}}";
-- This prevents new connections but does not terminate existing ones

-- For immediate termination, use this in revocation_statements:
-- SELECT pg_terminate_backend(pid) FROM pg_stat_activity
-- WHERE usename = '{{name}}';
```

**Problem**: Credentials work initially but fail after some time.

This usually means the TTL expired and the application did not renew. Check your lease renewal logic or extend the default TTL.

---

Dynamic database credentials transform how you manage database access. Instead of spreadsheets tracking who has which password, Vault provides a complete audit trail. Instead of coordinated password rotations, credentials expire automatically. Start with a single read-only role, validate the workflow, then expand to cover all your database access patterns.
