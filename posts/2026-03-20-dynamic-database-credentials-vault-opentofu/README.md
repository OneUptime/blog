# How to Use Dynamic Database Credentials with Vault and OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, HashiCorp Vault, PostgreSQL, MySQL, Security, Dynamic Credential, Database

Description: Learn how to configure HashiCorp Vault's database secrets engine to generate dynamic, short-lived database credentials for use with OpenTofu and your applications.

---

Static database passwords stored in configuration files or environment variables are a significant security risk. HashiCorp Vault's database secrets engine generates dynamic, short-lived credentials for PostgreSQL, MySQL, and other databases. This guide shows how to configure Vault and use dynamic database credentials in OpenTofu.

---

## Architecture

```text
Application/OpenTofu → Vault (Database Secrets Engine) → Database
                                                              ↓
                                                   Temporary user created
                                                   (expires after TTL)
```

---

## Step 1: Configure the Vault Database Secrets Engine

```bash
# Enable the database secrets engine

vault secrets enable database

# Configure PostgreSQL connection
vault write database/config/postgresql \
    plugin_name=postgresql-database-plugin \
    allowed_roles="app-role,readonly" \
    connection_url="postgresql://{{username}}:{{password}}@postgres.corp.example.com:5432/appdb?sslmode=require" \
    username="vault_admin" \
    password="vault_admin_password"

# Rotate the initial root credentials (best practice)
vault write -force database/rotate-root/postgresql
```

---

## Step 2: Create Database Roles in Vault

```bash
# App role - read/write access
vault write database/roles/app-role \
    db_name=postgresql \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="1h" \
    max_ttl="24h"

# Read-only role
vault write database/roles/readonly \
    db_name=postgresql \
    creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
    default_ttl="4h" \
    max_ttl="24h"
```

---

## Step 3: Test Credential Generation

```bash
# Generate credentials
vault read database/creds/app-role

# Output:
# Key                Value
# ---                -----
# lease_id           database/creds/app-role/xyz789
# lease_duration     1h
# username           v-root-app-role-AbCdEfGh
# password           A1b2C3d4E5f6G7h8

# Test connection
psql -h postgres.corp.example.com -U v-root-app-role-AbCdEfGh -d appdb
```

---

## Step 4: Use Dynamic DB Credentials in OpenTofu

```hcl
# providers.tf
terraform {
  required_providers {
    vault = {
      source  = "hashicorp/vault"
      version = "~> 5.0"
    }
    postgresql = {
      source  = "cyrilgdn/postgresql"
      version = "~> 1.0"
    }
  }
}

provider "vault" {
  address = "https://vault.corp.example.com:8200"
}

# Read dynamic credentials from Vault
# Note: vault_generic_secret writes the secret into OpenTofu state and
# requests a new lease each time the data source is refreshed.
data "vault_generic_secret" "db_creds" {
  path = "database/creds/app-role"
}

provider "postgresql" {
  host     = "postgres.corp.example.com"
  username = data.vault_generic_secret.db_creds.data["username"]
  password = data.vault_generic_secret.db_creds.data["password"]
  database = "appdb"
  sslmode  = "require"
}
```

---

## Step 5: Store Credentials in Kubernetes Secrets via OpenTofu

```hcl
# Provision DB credentials as Kubernetes secrets
# Be aware: this stores the credentials in OpenTofu state, and the
# Kubernetes Secret will not auto-renew when the Vault lease expires.
resource "kubernetes_secret" "db_credentials" {
  metadata {
    name      = "app-db-credentials"
    namespace = "production"
  }

  data = {
    username = data.vault_generic_secret.db_creds.data["username"]
    password = data.vault_generic_secret.db_creds.data["password"]
    host     = "postgres.corp.example.com"
    dbname   = "appdb"
  }

  type = "Opaque"
}
```

---

## MySQL Configuration

```bash
# Configure MySQL connection
vault write database/config/mysql \
    plugin_name=mysql-database-plugin \
    allowed_roles="mysql-app" \
    connection_url="{{username}}:{{password}}@tcp(mysql.corp.example.com:3306)/" \
    username="vault_admin" \
    password="vault_admin_password"

vault write database/roles/mysql-app \
    db_name=mysql \
    creation_statements="CREATE USER '{{name}}'@'%' IDENTIFIED BY '{{password}}';
    GRANT SELECT, INSERT, UPDATE, DELETE ON appdb.* TO '{{name}}'@'%';" \
    default_ttl="1h" \
    max_ttl="24h"
```

---

## Vault Policy for DB Credentials

```hcl
# db-policy.hcl
path "database/creds/app-role" {
  capabilities = ["read"]
}

path "database/creds/readonly" {
  capabilities = ["read"]
}
```

```bash
vault policy write db-app-policy db-policy.hcl
```

---

## Automatic Credential Renewal

```bash
# Renew a lease before expiry
vault lease renew database/creds/app-role/xyz789

# Configure auto-renewal in application
# Using Vault Agent or the Vault SDK's lease renewal feature
```

---

## Best Practices

1. **Use Vault Agent** in applications to handle credential renewal automatically
2. **Set short TTLs** (1–4 hours) and let Vault handle renewal
3. **Never log credentials** - Vault audit devices HMAC most string values by default, so secret values are not logged in plaintext
4. **Use separate roles** for each application (principle of least privilege)
5. **Rotate root credentials** immediately after configuring the database connection

---

## Conclusion

Vault's database secrets engine eliminates static database passwords from your infrastructure. Dynamic credentials are unique per lease, expire automatically, and are logged for auditability. Integrate with OpenTofu to provision infrastructure without hardcoding database secrets in your configuration.

---

*Monitor your database and application health with [OneUptime](https://oneuptime.com) - full-stack observability.*
