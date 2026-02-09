# How to implement Vault dynamic database credentials for Kubernetes applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HashiCorp Vault, Kubernetes, Database Security, Dynamic Secrets, Credential Rotation

Description: Learn how to implement Vault dynamic database credentials that automatically rotate, providing Kubernetes applications with short-lived database access without static passwords.

---

Static database credentials create security risks when stolen or exposed. Vault's database secrets engine generates dynamic, time-limited credentials on demand, automatically rotating them and revoking access when no longer needed. This guide shows you how to implement dynamic database credentials for Kubernetes applications.

## Understanding Dynamic Database Credentials

Dynamic credentials are generated when requested and automatically expire after a configured TTL. Vault creates a new database user for each credential request, sets appropriate permissions, and revokes the user when the lease expires. This ensures credentials are short-lived and unique per consumer.

The workflow operates like this: application requests database credentials from Vault, Vault creates a new database user with configured privileges, application receives username and password with lease information, application uses credentials to connect to database, Vault automatically renews the lease if the application is still running, and when lease expires or is revoked, Vault deletes the database user.

## Enabling the Database Secrets Engine

Configure Vault to manage database credentials:

```bash
# Enable database secrets engine
vault secrets enable database

# Verify it's enabled
vault secrets list | grep database
```

## Configuring PostgreSQL Connection

Set up Vault to connect to your PostgreSQL database:

```bash
# Configure PostgreSQL connection
vault write database/config/postgres \
  plugin_name=postgresql-database-plugin \
  allowed_roles="app-role,readonly-role" \
  connection_url="postgresql://{{username}}:{{password}}@postgres.default.svc.cluster.local:5432/myapp?sslmode=disable" \
  username="vault" \
  password="vault-password"

# Test the connection
vault write -f database/rotate-root/postgres
```

For production, create a dedicated Vault user with appropriate permissions:

```sql
-- On your PostgreSQL database
CREATE USER vault WITH PASSWORD 'secure-password' CREATEROLE;
GRANT ALL PRIVILEGES ON DATABASE myapp TO vault;

-- Allow vault to create users
ALTER USER vault WITH SUPERUSER;  -- or more restrictive permissions
```

## Creating Database Roles

Define roles that specify what permissions dynamically created users receive:

```bash
# Create role for application with full access
vault write database/roles/app-role \
  db_name=postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"

# Create read-only role
vault write database/roles/readonly-role \
  db_name=postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"

# Create admin role for migrations
vault write database/roles/admin-role \
  db_name=postgres \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; \
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO \"{{name}}\"; \
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO \"{{name}}\";" \
  default_ttl="15m" \
  max_ttl="1h"
```

## Testing Dynamic Credentials

Generate credentials manually to verify configuration:

```bash
# Request credentials
vault read database/creds/app-role

# Output shows:
# Key                Value
# ---                -----
# lease_id           database/creds/app-role/abc123
# lease_duration     1h
# lease_renewable    true
# password           A1a-aBcDeFgHiJkLm
# username           v-root-app-role-nOpQrStUvWxYz

# Test the credentials
PGPASSWORD=A1a-aBcDeFgHiJkLm psql -h postgres.default.svc.cluster.local -U v-root-app-role-nOpQrStUvWxYz -d myapp -c "SELECT 1"
```

## Integrating with Kubernetes Applications

Create a Vault policy that allows reading database credentials:

```bash
vault policy write app-db-policy - <<EOF
# Allow reading database credentials
path "database/creds/app-role" {
  capabilities = ["read"]
}

# Allow renewing leases
path "sys/leases/renew" {
  capabilities = ["update"]
}
EOF

# Update Kubernetes auth role to use this policy
vault write auth/kubernetes/role/app \
  bound_service_account_names=app-sa \
  bound_service_account_namespaces=default \
  policies=app-db-policy \
  ttl=1h
```

## Using Dynamic Credentials in Go

Implement credential management in a Go application:

```go
package main

import (
    "database/sql"
    "fmt"
    "io/ioutil"
    "log"
    "time"

    vault "github.com/hashicorp/vault/api"
    _ "github.com/lib/pq"
)

type DBConfig struct {
    client   *vault.Client
    secret   *vault.Secret
    db       *sql.DB
    host     string
    database string
}

func (c *DBConfig) authenticate() error {
    // Read service account token
    jwt, err := ioutil.ReadFile("/var/run/secrets/kubernetes.io/serviceaccount/token")
    if err != nil {
        return err
    }

    // Login to Vault
    params := map[string]interface{}{
        "jwt":  string(jwt),
        "role": "app",
    }

    secret, err := c.client.Logical().Write("auth/kubernetes/login", params)
    if err != nil {
        return err
    }

    c.client.SetToken(secret.Auth.ClientToken)
    return nil
}

func (c *DBConfig) getDBCredentials() error {
    // Request dynamic credentials
    secret, err := c.client.Logical().Read("database/creds/app-role")
    if err != nil {
        return err
    }

    c.secret = secret
    username := secret.Data["username"].(string)
    password := secret.Data["password"].(string)

    // Connect to database
    connStr := fmt.Sprintf("host=%s user=%s password=%s dbname=%s sslmode=disable",
        c.host, username, password, c.database)

    db, err := sql.Open("postgres", connStr)
    if err != nil {
        return err
    }

    c.db = db
    return nil
}

func (c *DBConfig) renewLease() {
    ticker := time.NewTicker(30 * time.Minute)
    defer ticker.Stop()

    for range ticker.C {
        // Renew the lease
        secret, err := c.client.Sys().Renew(c.secret.LeaseID, 0)
        if err != nil {
            log.Printf("Failed to renew lease: %v", err)
            // Re-authenticate and get new credentials
            c.authenticate()
            c.getDBCredentials()
        } else {
            log.Printf("Lease renewed, new TTL: %d", secret.LeaseDuration)
        }
    }
}

func main() {
    config := vault.DefaultConfig()
    config.Address = "http://vault.vault.svc.cluster.local:8200"

    client, err := vault.NewClient(config)
    if err != nil {
        log.Fatal(err)
    }

    dbConfig := &DBConfig{
        client:   client,
        host:     "postgres.default.svc.cluster.local",
        database: "myapp",
    }

    // Authenticate to Vault
    if err := dbConfig.authenticate(); err != nil {
        log.Fatal(err)
    }

    // Get database credentials
    if err := dbConfig.getDBCredentials(); err != nil {
        log.Fatal(err)
    }

    // Start lease renewal in background
    go dbConfig.renewLease()

    // Use database connection
    rows, err := dbConfig.db.Query("SELECT * FROM users LIMIT 10")
    if err != nil {
        log.Fatal(err)
    }
    defer rows.Close()

    // Your application logic here
    fmt.Println("Connected to database with dynamic credentials")
}
```

## Using Dynamic Credentials in Python

Python implementation with automatic renewal:

```python
import hvac
import psycopg2
import time
import threading

class VaultDBManager:
    def __init__(self, vault_addr, db_host, db_name):
        self.vault_addr = vault_addr
        self.db_host = db_host
        self.db_name = db_name
        self.client = None
        self.db_conn = None
        self.lease_id = None
        self.credentials = None

    def authenticate(self):
        # Read service account token
        with open('/var/run/secrets/kubernetes.io/serviceaccount/token') as f:
            jwt = f.read()

        self.client = hvac.Client(url=self.vault_addr)
        self.client.auth.kubernetes.login(role='app', jwt=jwt)

    def get_db_credentials(self):
        # Request dynamic credentials
        response = self.client.read('database/creds/app-role')

        self.credentials = {
            'username': response['data']['username'],
            'password': response['data']['password']
        }
        self.lease_id = response['lease_id']

        # Connect to database
        self.db_conn = psycopg2.connect(
            host=self.db_host,
            database=self.db_name,
            user=self.credentials['username'],
            password=self.credentials['password']
        )

    def renew_lease(self):
        while True:
            time.sleep(1800)  # Renew every 30 minutes
            try:
                self.client.sys.renew_lease(self.lease_id)
                print("Lease renewed successfully")
            except Exception as e:
                print(f"Failed to renew lease: {e}")
                # Re-authenticate and get new credentials
                self.authenticate()
                self.get_db_credentials()

    def start(self):
        self.authenticate()
        self.get_db_credentials()

        # Start background lease renewal
        renewal_thread = threading.Thread(target=self.renew_lease, daemon=True)
        renewal_thread.start()

# Usage
manager = VaultDBManager(
    vault_addr='http://vault.vault.svc.cluster.local:8200',
    db_host='postgres.default.svc.cluster.local',
    db_name='myapp'
)
manager.start()

# Use database connection
cursor = manager.db_conn.cursor()
cursor.execute("SELECT * FROM users LIMIT 10")
rows = cursor.fetchall()
```

## Using Vault Agent for Automatic Credential Management

Let Vault Agent handle credential renewal automatically:

```yaml
# app-with-db-creds.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-db-creds
spec:
  replicas: 2
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "app"
        vault.hashicorp.com/agent-inject-secret-db-creds: "database/creds/app-role"
        vault.hashicorp.com/agent-inject-template-db-creds: |
          {{- with secret "database/creds/app-role" -}}
          export DB_USERNAME="{{ .Data.username }}"
          export DB_PASSWORD="{{ .Data.password }}"
          export DB_HOST="postgres.default.svc.cluster.local"
          export DB_NAME="myapp"
          export DATABASE_URL="postgresql://{{ .Data.username }}:{{ .Data.password }}@postgres.default.svc.cluster.local:5432/myapp"
          {{- end -}}
    spec:
      serviceAccountName: app-sa
      containers:
      - name: app
        image: myapp:latest
        command:
        - /bin/sh
        - -c
        - |
          # Source credentials before starting app
          . /vault/secrets/db-creds
          exec /app/start
```

The Vault Agent sidecar automatically renews the database credentials and updates the file.

## Configuring MySQL Connection

Similar setup for MySQL:

```bash
# Configure MySQL connection
vault write database/config/mysql \
  plugin_name=mysql-database-plugin \
  connection_url="{{username}}:{{password}}@tcp(mysql.default.svc.cluster.local:3306)/" \
  allowed_roles="app-role" \
  username="vault" \
  password="vault-password"

# Create role
vault write database/roles/app-role \
  db_name=mysql \
  creation_statements="CREATE USER '{{name}}'@'%' IDENTIFIED BY '{{password}}'; \
    GRANT SELECT, INSERT, UPDATE, DELETE ON myapp.* TO '{{name}}'@'%';" \
  default_ttl="1h" \
  max_ttl="24h"
```

## Configuring MongoDB Connection

For MongoDB:

```bash
# Configure MongoDB connection
vault write database/config/mongodb \
  plugin_name=mongodb-database-plugin \
  allowed_roles="app-role" \
  connection_url="mongodb://{{username}}:{{password}}@mongodb.default.svc.cluster.local:27017/admin" \
  username="vault" \
  password="vault-password"

# Create role
vault write database/roles/app-role \
  db_name=mongodb \
  creation_statements='{ "db": "myapp", "roles": [{ "role": "readWrite" }] }' \
  default_ttl="1h" \
  max_ttl="24h"
```

## Monitoring Dynamic Credentials

Track credential usage and leases:

```bash
# List active leases for database creds
vault list sys/leases/lookup/database/creds/app-role

# View specific lease details
vault lease lookup <lease-id>

# Count active database users
vault read database/config/postgres | grep "connection_url"

# On PostgreSQL, check created users
SELECT usename, valuntil FROM pg_user WHERE usename LIKE 'v-root-%';
```

## Handling Credential Rotation

Implement graceful credential updates:

```go
func (c *DBConfig) rotateCredentials() error {
    // Get new credentials
    newSecret, err := c.client.Logical().Read("database/creds/app-role")
    if err != nil {
        return err
    }

    username := newSecret.Data["username"].(string)
    password := newSecret.Data["password"].(string)

    // Create new connection
    connStr := fmt.Sprintf("host=%s user=%s password=%s dbname=%s sslmode=disable",
        c.host, username, password, c.database)

    newDB, err := sql.Open("postgres", connStr)
    if err != nil {
        return err
    }

    // Test new connection
    if err := newDB.Ping(); err != nil {
        newDB.Close()
        return err
    }

    // Close old connection
    if c.db != nil {
        c.db.Close()
    }

    // Update to new connection and credentials
    c.db = newDB
    c.secret = newSecret

    return nil
}
```

## Revoking Credentials

Manually revoke credentials when needed:

```bash
# Revoke specific lease
vault lease revoke database/creds/app-role/abc123

# Revoke all leases for a role
vault lease revoke -prefix database/creds/app-role/

# Force revoke (even if cleanup fails)
vault lease revoke -force database/creds/app-role/abc123
```

Dynamic database credentials eliminate static password management and reduce the blast radius of credential compromise. By automatically rotating credentials and revoking access when no longer needed, Vault provides defense-in-depth for database security. Implementing this pattern ensures your Kubernetes applications access databases with minimal risk and maximum auditability.
