# How to Implement Dynamic Database Credentials with Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vault, HashiCorp, Database, Security, Secrets Management, PostgreSQL, MySQL, DevOps

Description: Learn how to implement dynamic database credentials using HashiCorp Vault, eliminating static passwords and providing automatic credential rotation for enhanced security.

---

Static database credentials are a security nightmare. Once leaked, they provide unlimited access until someone manually rotates them. HashiCorp Vault solves this problem by generating short-lived, unique credentials for each application instance on demand.

## Why Dynamic Database Credentials Matter

Traditional database access looks like this:

```mermaid
flowchart LR
    subgraph Problem["Static Credentials"]
        App1[App Instance 1]
        App2[App Instance 2]
        App3[App Instance 3]
        DB[(Database)]

        App1 -->|"user: app_user<br>pass: P@ssw0rd123"| DB
        App2 -->|"user: app_user<br>pass: P@ssw0rd123"| DB
        App3 -->|"user: app_user<br>pass: P@ssw0rd123"| DB
    end
```

With Vault, each application gets unique, time-limited credentials:

```mermaid
flowchart LR
    subgraph Solution["Dynamic Credentials"]
        V[Vault]
        App1[App Instance 1]
        App2[App Instance 2]
        App3[App Instance 3]
        DB[(Database)]

        App1 -->|Request| V
        App2 -->|Request| V
        App3 -->|Request| V

        V -->|"user: v-app-abc123<br>TTL: 1h"| App1
        V -->|"user: v-app-def456<br>TTL: 1h"| App2
        V -->|"user: v-app-ghi789<br>TTL: 1h"| App3

        App1 --> DB
        App2 --> DB
        App3 --> DB
    end
```

## Architecture Overview

```mermaid
flowchart TB
    subgraph Application Layer
        App[Application]
    end

    subgraph Vault Cluster
        V[Vault Server]
        DBE[Database Secrets Engine]
        Auth[Auth Methods]
    end

    subgraph Database Layer
        PG[(PostgreSQL)]
        MySQL[(MySQL)]
        Mongo[(MongoDB)]
    end

    App -->|1. Authenticate| Auth
    Auth -->|2. Token| App
    App -->|3. Request Credentials| DBE
    DBE -->|4. Create User| PG
    DBE -->|5. Return Credentials| App
    App -->|6. Connect| PG

    DBE -.->|Supports| MySQL
    DBE -.->|Supports| Mongo
```

## Setting Up Vault

### Installing Vault

The following commands download and install Vault on a Linux system using the official HashiCorp package:

```bash
# Add HashiCorp GPG key
curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo apt-key add -

# Add HashiCorp repository
sudo apt-add-repository "deb [arch=amd64] https://apt.releases.hashicorp.com $(lsb_release -cs) main"

# Install Vault
sudo apt-get update && sudo apt-get install vault

# Verify installation
vault version
```

### Starting Vault in Development Mode

For testing purposes, you can start Vault in development mode. Production deployments should use proper storage backends:

```bash
# Start Vault in dev mode (NOT for production)
vault server -dev -dev-root-token-id="root"

# In another terminal, set environment variables
export VAULT_ADDR='http://127.0.0.1:8200'
export VAULT_TOKEN='root'

# Verify connection
vault status
```

### Production Vault Configuration

Production deployments require persistent storage and TLS. Here is a configuration file for a production-ready Vault server:

```hcl
# /etc/vault.d/vault.hcl

storage "consul" {
  address = "127.0.0.1:8500"
  path    = "vault/"
}

listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_cert_file = "/etc/vault.d/tls/vault.crt"
  tls_key_file  = "/etc/vault.d/tls/vault.key"
}

api_addr = "https://vault.example.com:8200"
cluster_addr = "https://vault.example.com:8201"

ui = true
```

## Configuring the Database Secrets Engine

### Enable the Database Secrets Engine

The database secrets engine must be enabled before configuring any database connections:

```bash
# Enable the database secrets engine at the default path
vault secrets enable database

# Or enable at a custom path for multiple database configurations
vault secrets enable -path=databases database
```

### PostgreSQL Configuration

The following commands configure Vault to connect to a PostgreSQL database and manage credentials:

```bash
# Configure PostgreSQL connection
vault write database/config/my-postgresql-database \
    plugin_name="postgresql-database-plugin" \
    allowed_roles="readonly,readwrite" \
    connection_url="postgresql://{{username}}:{{password}}@postgres.example.com:5432/myapp?sslmode=require" \
    username="vault_admin" \
    password="vault_admin_password"

# Rotate the root credentials (Vault will manage them from now on)
vault write -force database/rotate-root/my-postgresql-database
```

### MySQL Configuration

MySQL setup follows a similar pattern with the MySQL plugin:

```bash
# Configure MySQL connection
vault write database/config/my-mysql-database \
    plugin_name="mysql-database-plugin" \
    allowed_roles="readonly,readwrite" \
    connection_url="{{username}}:{{password}}@tcp(mysql.example.com:3306)/myapp" \
    username="vault_admin" \
    password="vault_admin_password"

# Rotate root credentials
vault write -force database/rotate-root/my-mysql-database
```

### MongoDB Configuration

MongoDB Atlas and self-hosted MongoDB instances can also be configured:

```bash
# Configure MongoDB connection
vault write database/config/my-mongodb \
    plugin_name="mongodb-database-plugin" \
    allowed_roles="readonly,readwrite" \
    connection_url="mongodb://{{username}}:{{password}}@mongo.example.com:27017/admin" \
    username="vault_admin" \
    password="vault_admin_password"
```

## Creating Database Roles

### Read-Only Role

Roles define the SQL statements used to create and revoke users. The following creates a read-only role for PostgreSQL:

```bash
# Create a read-only role for PostgreSQL
vault write database/roles/readonly \
    db_name="my-postgresql-database" \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    revocation_statements="REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM \"{{name}}\"; \
        DROP ROLE IF EXISTS \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"
```

### Read-Write Role

Applications requiring write access need a role with appropriate privileges:

```bash
# Create a read-write role for PostgreSQL
vault write database/roles/readwrite \
    db_name="my-postgresql-database" \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\"; \
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO \"{{name}}\";" \
    revocation_statements="REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM \"{{name}}\"; \
        REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public FROM \"{{name}}\"; \
        DROP ROLE IF EXISTS \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"
```

### MySQL Read-Only Role

MySQL uses different SQL syntax for user creation:

```bash
# Create a read-only role for MySQL
vault write database/roles/mysql-readonly \
    db_name="my-mysql-database" \
    creation_statements="CREATE USER '{{name}}'@'%' IDENTIFIED BY '{{password}}'; \
        GRANT SELECT ON myapp.* TO '{{name}}'@'%';" \
    revocation_statements="REVOKE ALL PRIVILEGES, GRANT OPTION FROM '{{name}}'@'%'; \
        DROP USER '{{name}}'@'%';" \
    default_ttl="1h" \
    max_ttl="24h"
```

## Generating Dynamic Credentials

### Using the CLI

Requesting credentials through the Vault CLI is straightforward:

```bash
# Generate read-only credentials
vault read database/creds/readonly

# Output:
# Key                Value
# ---                -----
# lease_id           database/creds/readonly/abc123
# lease_duration     1h
# lease_renewable    true
# password           A1b2C3d4E5f6G7h8
# username           v-token-readonly-abc123

# Generate read-write credentials
vault read database/creds/readwrite
```

### Using the API

Applications can request credentials via the HTTP API. Here is an example using curl:

```bash
# Request credentials via API
curl --header "X-Vault-Token: ${VAULT_TOKEN}" \
     --request GET \
     ${VAULT_ADDR}/v1/database/creds/readonly

# Response:
# {
#   "request_id": "abc123",
#   "lease_id": "database/creds/readonly/def456",
#   "renewable": true,
#   "lease_duration": 3600,
#   "data": {
#     "username": "v-token-readonly-def456",
#     "password": "A1b2C3d4E5f6G7h8"
#   }
# }
```

## Application Integration

### Python Application

The following Python code demonstrates how to fetch credentials from Vault and connect to PostgreSQL:

```python
# vault_db_client.py
import hvac
import psycopg2
from contextlib import contextmanager
import time
import threading

class VaultDatabaseClient:
    """
    Client for managing dynamic database credentials from Vault.
    Handles credential fetching, caching, and automatic renewal.
    """

    def __init__(self, vault_addr, vault_token, db_role, db_host, db_name):
        # Initialize Vault client
        self.client = hvac.Client(url=vault_addr, token=vault_token)
        self.db_role = db_role
        self.db_host = db_host
        self.db_name = db_name

        # Credential cache
        self._credentials = None
        self._lease_id = None
        self._lease_expiry = 0
        self._lock = threading.Lock()

    def _fetch_credentials(self):
        """Fetch new credentials from Vault."""
        response = self.client.secrets.database.generate_credentials(
            name=self.db_role
        )

        self._credentials = {
            'username': response['data']['username'],
            'password': response['data']['password']
        }
        self._lease_id = response['lease_id']
        # Set expiry with 5-minute buffer for safety
        self._lease_expiry = time.time() + response['lease_duration'] - 300

        return self._credentials

    def get_credentials(self):
        """Get valid credentials, fetching new ones if expired."""
        with self._lock:
            if time.time() >= self._lease_expiry:
                return self._fetch_credentials()
            return self._credentials

    def renew_lease(self):
        """Renew the current credential lease."""
        if self._lease_id:
            self.client.sys.renew_lease(lease_id=self._lease_id)
            # Update expiry time
            self._lease_expiry = time.time() + 3600 - 300

    @contextmanager
    def get_connection(self):
        """Context manager for database connections."""
        creds = self.get_credentials()
        conn = psycopg2.connect(
            host=self.db_host,
            database=self.db_name,
            user=creds['username'],
            password=creds['password']
        )
        try:
            yield conn
        finally:
            conn.close()


# Example usage
if __name__ == "__main__":
    client = VaultDatabaseClient(
        vault_addr="https://vault.example.com:8200",
        vault_token="s.abc123",
        db_role="readonly",
        db_host="postgres.example.com",
        db_name="myapp"
    )

    with client.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users LIMIT 10")
        results = cursor.fetchall()
        print(results)
```

### Node.js Application

The following Node.js code shows similar functionality using the node-vault library:

```javascript
// vault-db-client.js
const vault = require('node-vault');
const { Pool } = require('pg');

class VaultDatabaseClient {
  /**
   * Client for managing dynamic database credentials from Vault.
   * Handles credential fetching, connection pooling, and automatic refresh.
   */
  constructor(options) {
    this.vaultClient = vault({
      apiVersion: 'v1',
      endpoint: options.vaultAddr,
      token: options.vaultToken
    });

    this.dbRole = options.dbRole;
    this.dbHost = options.dbHost;
    this.dbName = options.dbName;
    this.dbPort = options.dbPort || 5432;

    this.pool = null;
    this.leaseId = null;
    this.leaseExpiry = 0;
  }

  /**
   * Fetch new credentials from Vault and create a connection pool.
   */
  async refreshCredentials() {
    // Fetch new credentials from Vault
    const response = await this.vaultClient.read(
      `database/creds/${this.dbRole}`
    );

    const { username, password } = response.data;
    this.leaseId = response.lease_id;
    // Set expiry with 5-minute buffer
    this.leaseExpiry = Date.now() + (response.lease_duration * 1000) - 300000;

    // Close existing pool if any
    if (this.pool) {
      await this.pool.end();
    }

    // Create new connection pool with fresh credentials
    this.pool = new Pool({
      host: this.dbHost,
      port: this.dbPort,
      database: this.dbName,
      user: username,
      password: password,
      max: 10,
      idleTimeoutMillis: 30000
    });

    console.log(`Created pool with user: ${username}`);
    return this.pool;
  }

  /**
   * Get a valid connection pool, refreshing credentials if needed.
   */
  async getPool() {
    if (Date.now() >= this.leaseExpiry || !this.pool) {
      await this.refreshCredentials();
    }
    return this.pool;
  }

  /**
   * Renew the current lease to extend credential validity.
   */
  async renewLease() {
    if (this.leaseId) {
      await this.vaultClient.write('sys/leases/renew', {
        lease_id: this.leaseId
      });
      this.leaseExpiry = Date.now() + 3600000 - 300000;
    }
  }

  /**
   * Execute a query with automatic credential management.
   */
  async query(sql, params = []) {
    const pool = await this.getPool();
    return pool.query(sql, params);
  }

  /**
   * Clean up resources on shutdown.
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

// Example usage
async function main() {
  const client = new VaultDatabaseClient({
    vaultAddr: 'https://vault.example.com:8200',
    vaultToken: 's.abc123',
    dbRole: 'readonly',
    dbHost: 'postgres.example.com',
    dbName: 'myapp'
  });

  try {
    const result = await client.query('SELECT * FROM users LIMIT 10');
    console.log(result.rows);
  } finally {
    await client.close();
  }
}

module.exports = VaultDatabaseClient;
```

### Go Application

Go applications can use the official Vault API client:

```go
// main.go
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

// VaultDBClient manages dynamic database credentials from Vault.
// It handles credential fetching, caching, and automatic renewal.
type VaultDBClient struct {
    vaultClient *vault.Client
    dbRole      string
    dbHost      string
    dbName      string
    dbPort      int

    mu          sync.RWMutex
    credentials *DBCredentials
    leaseID     string
    leaseExpiry time.Time
}

// DBCredentials holds the username and password for database access.
type DBCredentials struct {
    Username string
    Password string
}

// NewVaultDBClient creates a new client with the given configuration.
func NewVaultDBClient(vaultAddr, vaultToken, dbRole, dbHost, dbName string) (*VaultDBClient, error) {
    config := vault.DefaultConfig()
    config.Address = vaultAddr

    client, err := vault.NewClient(config)
    if err != nil {
        return nil, fmt.Errorf("failed to create vault client: %w", err)
    }
    client.SetToken(vaultToken)

    return &VaultDBClient{
        vaultClient: client,
        dbRole:      dbRole,
        dbHost:      dbHost,
        dbName:      dbName,
        dbPort:      5432,
    }, nil
}

// fetchCredentials retrieves new credentials from Vault.
func (c *VaultDBClient) fetchCredentials() (*DBCredentials, error) {
    secret, err := c.vaultClient.Logical().Read(
        fmt.Sprintf("database/creds/%s", c.dbRole),
    )
    if err != nil {
        return nil, fmt.Errorf("failed to read credentials: %w", err)
    }

    c.credentials = &DBCredentials{
        Username: secret.Data["username"].(string),
        Password: secret.Data["password"].(string),
    }
    c.leaseID = secret.LeaseID
    // Set expiry with 5-minute buffer for safety
    c.leaseExpiry = time.Now().Add(
        time.Duration(secret.LeaseDuration)*time.Second - 5*time.Minute,
    )

    log.Printf("Fetched new credentials, user: %s", c.credentials.Username)
    return c.credentials, nil
}

// GetCredentials returns valid credentials, fetching new ones if expired.
func (c *VaultDBClient) GetCredentials() (*DBCredentials, error) {
    c.mu.Lock()
    defer c.mu.Unlock()

    if time.Now().After(c.leaseExpiry) || c.credentials == nil {
        return c.fetchCredentials()
    }
    return c.credentials, nil
}

// GetDB returns a database connection using current credentials.
func (c *VaultDBClient) GetDB() (*sql.DB, error) {
    creds, err := c.GetCredentials()
    if err != nil {
        return nil, err
    }

    connStr := fmt.Sprintf(
        "host=%s port=%d user=%s password=%s dbname=%s sslmode=require",
        c.dbHost, c.dbPort, creds.Username, creds.Password, c.dbName,
    )

    return sql.Open("postgres", connStr)
}

// RenewLease extends the validity of current credentials.
func (c *VaultDBClient) RenewLease(ctx context.Context) error {
    c.mu.Lock()
    defer c.mu.Unlock()

    if c.leaseID == "" {
        return nil
    }

    _, err := c.vaultClient.Sys().Renew(c.leaseID, 3600)
    if err != nil {
        return fmt.Errorf("failed to renew lease: %w", err)
    }

    c.leaseExpiry = time.Now().Add(55 * time.Minute)
    return nil
}

func main() {
    client, err := NewVaultDBClient(
        "https://vault.example.com:8200",
        "s.abc123",
        "readonly",
        "postgres.example.com",
        "myapp",
    )
    if err != nil {
        log.Fatal(err)
    }

    db, err := client.GetDB()
    if err != nil {
        log.Fatal(err)
    }
    defer db.Close()

    rows, err := db.Query("SELECT id, name FROM users LIMIT 10")
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    for rows.Next() {
        var id int
        var name string
        rows.Scan(&id, &name)
        fmt.Printf("User: %d - %s\n", id, name)
    }
}
```

## Kubernetes Integration

### Using Vault Agent Injector

The Vault Agent Injector automatically injects credentials into Kubernetes pods. First, install the Vault Helm chart:

```bash
# Add HashiCorp Helm repository
helm repo add hashicorp https://helm.releases.hashicorp.com
helm repo update

# Install Vault with injector enabled
helm install vault hashicorp/vault \
    --set "injector.enabled=true" \
    --set "server.enabled=false" \
    --set "injector.externalVaultAddr=https://vault.example.com:8200"
```

### Kubernetes Authentication

Configure Vault to authenticate Kubernetes service accounts:

```bash
# Enable Kubernetes auth method
vault auth enable kubernetes

# Configure Kubernetes auth
vault write auth/kubernetes/config \
    kubernetes_host="https://kubernetes.default.svc:443" \
    kubernetes_ca_cert=@/var/run/secrets/kubernetes.io/serviceaccount/ca.crt \
    token_reviewer_jwt=@/var/run/secrets/kubernetes.io/serviceaccount/token

# Create a policy for database access
vault policy write db-readonly - <<EOF
path "database/creds/readonly" {
  capabilities = ["read"]
}
EOF

# Create a role for the application
vault write auth/kubernetes/role/myapp \
    bound_service_account_names=myapp \
    bound_service_account_namespaces=default \
    policies=db-readonly \
    ttl=1h
```

### Pod Configuration with Annotations

The following deployment manifest shows how to inject database credentials into a pod:

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
      annotations:
        # Enable Vault Agent injection
        vault.hashicorp.com/agent-inject: "true"
        # Specify the Vault role to use
        vault.hashicorp.com/role: "myapp"
        # Inject database credentials as a file
        vault.hashicorp.com/agent-inject-secret-db-creds: "database/creds/readonly"
        # Format the credentials as environment variables
        vault.hashicorp.com/agent-inject-template-db-creds: |
          {{- with secret "database/creds/readonly" -}}
          export DB_USERNAME="{{ .Data.username }}"
          export DB_PASSWORD="{{ .Data.password }}"
          {{- end }}
    spec:
      serviceAccountName: myapp
      containers:
        - name: myapp
          image: myapp:latest
          command:
            - /bin/sh
            - -c
            - source /vault/secrets/db-creds && ./myapp
          env:
            - name: DB_HOST
              value: "postgres.example.com"
            - name: DB_NAME
              value: "myapp"
```

### Service Account

Create the service account referenced in the deployment:

```yaml
# serviceaccount.yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp
  namespace: default
```

## Credential Lifecycle Management

```mermaid
sequenceDiagram
    participant App as Application
    participant Vault as Vault Server
    participant DB as Database

    App->>Vault: Authenticate
    Vault-->>App: Vault Token

    App->>Vault: Request DB Credentials
    Vault->>DB: CREATE USER v-app-abc123
    DB-->>Vault: User Created
    Vault-->>App: Username + Password + Lease

    App->>DB: Connect with credentials

    Note over App,DB: Before lease expires

    App->>Vault: Renew Lease
    Vault-->>App: Lease Extended

    Note over App,DB: On application shutdown

    App->>Vault: Revoke Lease
    Vault->>DB: DROP USER v-app-abc123
    DB-->>Vault: User Dropped
```

### Implementing Lease Renewal

Applications should renew leases before they expire. Here is a Python implementation of a background renewal worker:

```python
# lease_renewal.py
import threading
import time
import logging

class LeaseRenewalWorker:
    """
    Background worker that automatically renews Vault leases.
    Prevents credential expiration during long-running operations.
    """

    def __init__(self, vault_client, renewal_interval=1800):
        self.vault_client = vault_client
        self.renewal_interval = renewal_interval
        self._stop_event = threading.Event()
        self._thread = None
        self.leases = {}
        self._lock = threading.Lock()

    def add_lease(self, lease_id, increment=3600):
        """Register a lease for automatic renewal."""
        with self._lock:
            self.leases[lease_id] = {
                'increment': increment,
                'last_renewed': time.time()
            }

    def remove_lease(self, lease_id):
        """Remove a lease from automatic renewal."""
        with self._lock:
            self.leases.pop(lease_id, None)

    def _renewal_loop(self):
        """Main renewal loop that runs in background."""
        while not self._stop_event.is_set():
            with self._lock:
                leases_to_renew = list(self.leases.items())

            for lease_id, info in leases_to_renew:
                try:
                    self.vault_client.sys.renew_lease(
                        lease_id=lease_id,
                        increment=info['increment']
                    )
                    logging.info(f"Renewed lease: {lease_id}")

                    with self._lock:
                        if lease_id in self.leases:
                            self.leases[lease_id]['last_renewed'] = time.time()

                except Exception as e:
                    logging.error(f"Failed to renew lease {lease_id}: {e}")
                    # Remove failed lease to prevent repeated failures
                    self.remove_lease(lease_id)

            # Wait for next renewal cycle
            self._stop_event.wait(self.renewal_interval)

    def start(self):
        """Start the background renewal worker."""
        self._thread = threading.Thread(target=self._renewal_loop, daemon=True)
        self._thread.start()
        logging.info("Lease renewal worker started")

    def stop(self):
        """Stop the background renewal worker."""
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=5)
        logging.info("Lease renewal worker stopped")
```

## Monitoring and Auditing

### Vault Audit Logging

Enable audit logging to track all credential requests:

```bash
# Enable file audit backend
vault audit enable file file_path=/var/log/vault/audit.log

# Enable syslog audit backend
vault audit enable syslog tag="vault" facility="AUTH"
```

### Prometheus Metrics

Vault exposes metrics that can be scraped by Prometheus. Configure Vault to enable telemetry:

```hcl
# /etc/vault.d/vault.hcl
telemetry {
  prometheus_retention_time = "30s"
  disable_hostname = true
}
```

### Key Metrics to Monitor

Set up alerts for these important metrics related to database credentials:

```yaml
# prometheus-alerts.yaml
groups:
  - name: vault-database
    rules:
      # Alert when credential generation is failing
      - alert: VaultDatabaseCredentialFailures
        expr: increase(vault_secret_lease_creation_error_count{mount_point="database/"}[5m]) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Vault database credential generation failing"
          description: "Database credential requests are failing"

      # Alert on high lease count indicating potential leak
      - alert: VaultHighLeaseCount
        expr: vault_expire_num_leases > 10000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High number of active Vault leases"
          description: "Active lease count is {{ $value }}, possible credential leak"

      # Alert when database connection is unhealthy
      - alert: VaultDatabaseConnectionUnhealthy
        expr: vault_database_connection_available == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Vault database connection is down"
```

## Security Best Practices

### 1. Use Short TTLs

Shorter TTLs limit the exposure window if credentials are compromised:

```bash
# Configure role with short TTL
vault write database/roles/readonly \
    db_name="my-postgresql-database" \
    creation_statements="..." \
    default_ttl="30m" \
    max_ttl="1h"
```

### 2. Implement Least Privilege

Create specific roles for each use case instead of broad access roles:

```bash
# Role for reporting - read-only on specific tables
vault write database/roles/reporting \
    db_name="my-postgresql-database" \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT ON TABLE reports, analytics TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="4h"

# Role for user service - limited to users table
vault write database/roles/user-service \
    db_name="my-postgresql-database" \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
        GRANT SELECT, INSERT, UPDATE ON TABLE users TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="4h"
```

### 3. Revoke Credentials on Shutdown

Applications should revoke their credentials when shutting down to clean up unused database users:

```python
# graceful_shutdown.py
import signal
import sys

def create_shutdown_handler(vault_client, lease_id):
    """Create a signal handler that revokes credentials on shutdown."""

    def handler(signum, frame):
        print("Shutting down, revoking credentials...")
        try:
            vault_client.sys.revoke_lease(lease_id)
            print("Credentials revoked successfully")
        except Exception as e:
            print(f"Failed to revoke credentials: {e}")
        sys.exit(0)

    return handler

# Register the shutdown handler
signal.signal(signal.SIGTERM, create_shutdown_handler(vault_client, lease_id))
signal.signal(signal.SIGINT, create_shutdown_handler(vault_client, lease_id))
```

### 4. Network Segmentation

Ensure Vault can reach databases but applications cannot access Vault admin endpoints:

```mermaid
flowchart TB
    subgraph App Network
        App1[App Server 1]
        App2[App Server 2]
    end

    subgraph Management Network
        Vault[Vault Server]
        Admin[Admin Workstation]
    end

    subgraph Database Network
        DB[(Database)]
    end

    App1 -->|Port 8200| Vault
    App2 -->|Port 8200| Vault
    Admin -->|Port 8200| Vault

    Vault -->|Port 5432| DB
    App1 -->|Port 5432| DB
    App2 -->|Port 5432| DB

    App1 -.-x|Blocked| Admin
    App2 -.-x|Blocked| Admin
```

## Troubleshooting

### Common Issues

**Credentials not working immediately after creation:**

PostgreSQL may cache authentication. Add a small delay or retry logic:

```python
import time
from tenacity import retry, stop_after_attempt, wait_exponential

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
def connect_with_retry(host, database, user, password):
    """Attempt database connection with exponential backoff."""
    return psycopg2.connect(
        host=host,
        database=database,
        user=user,
        password=password
    )
```

**Too many database users accumulating:**

Ensure proper lease revocation and check for orphaned users:

```sql
-- Find Vault-created users in PostgreSQL
SELECT usename, valuntil
FROM pg_user
WHERE usename LIKE 'v-%'
ORDER BY valuntil;

-- Clean up expired users manually if needed
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT usename FROM pg_user WHERE usename LIKE 'v-%' AND valuntil < NOW()
    LOOP
        EXECUTE 'DROP USER IF EXISTS ' || quote_ident(r.usename);
    END LOOP;
END $$;
```

**Vault connection failures:**

Implement circuit breaker pattern for resilience:

```python
from circuitbreaker import circuit

@circuit(failure_threshold=5, recovery_timeout=30)
def get_vault_credentials(vault_client, role):
    """Fetch credentials with circuit breaker protection."""
    return vault_client.secrets.database.generate_credentials(name=role)
```

---

Dynamic database credentials transform how applications access databases. Instead of managing static passwords that never change, Vault provides unique, short-lived credentials that automatically expire. When combined with proper auditing and monitoring, you gain complete visibility into database access patterns while significantly reducing the blast radius of any credential compromise.

Start with a single application and gradually expand Vault integration across your infrastructure. The initial setup investment pays dividends in improved security posture and simplified credential management.
