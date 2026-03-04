# How to Configure Dynamic Secrets with Vault Database Engine on RHEL

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, Vault, Dynamic Secrets, Database, Security, HashiCorp, Linux

Description: Learn how to configure HashiCorp Vault's database secrets engine on RHEL to generate short-lived, unique database credentials on demand, eliminating long-lived static passwords.

---

Static database passwords are a security liability. They get shared, stored in plain text, and rarely rotated. Vault's database secrets engine solves this by generating unique, short-lived credentials for each application or user request. When the lease expires, Vault revokes the credentials automatically. This guide covers setting up dynamic database secrets with Vault on RHEL.

## How Dynamic Database Secrets Work

The flow is straightforward:

1. An administrator configures Vault with a connection to the database and a set of creation statements
2. When an application needs database access, it requests credentials from Vault
3. Vault creates a new database user with the specified permissions
4. Vault returns the username and password to the application along with a lease duration
5. When the lease expires (or is revoked), Vault drops the database user

Every set of credentials is unique and short-lived. If credentials leak, they expire quickly and can be traced back to the requesting application.

## Prerequisites

- RHEL with a running Vault server
- A PostgreSQL or MySQL database server
- A privileged database account that Vault can use to create and revoke users

## Installing Vault

If Vault is not yet installed:

```bash
# Install Vault from the HashiCorp repository
sudo dnf install -y yum-utils
sudo yum-config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo
sudo dnf install -y vault
```

```bash
# Start Vault in dev mode for testing
vault server -dev -dev-root-token-id="root" &
export VAULT_ADDR="http://127.0.0.1:8200"
export VAULT_TOKEN="root"
```

## Setting Up PostgreSQL

Install and configure PostgreSQL:

```bash
# Install PostgreSQL
sudo dnf install -y postgresql-server postgresql
sudo postgresql-setup --initdb
sudo systemctl enable --now postgresql
```

Create a Vault management user:

```bash
# Connect to PostgreSQL and create the Vault user
sudo -u postgres psql << 'SQL'
CREATE ROLE vault_admin WITH LOGIN PASSWORD 'vault_admin_password' CREATEROLE VALID UNTIL 'infinity';
GRANT ALL PRIVILEGES ON DATABASE postgres TO vault_admin;
SQL
```

Configure PostgreSQL to accept password authentication from Vault:

```bash
# Edit pg_hba.conf to allow password auth
sudo tee -a /var/lib/pgsql/data/pg_hba.conf > /dev/null << 'EOF'
host    all    vault_admin    127.0.0.1/32    md5
host    all    all            127.0.0.1/32    md5
EOF
```

```bash
# Restart PostgreSQL
sudo systemctl restart postgresql
```

## Enabling the Database Secrets Engine

```bash
# Enable the database secrets engine
vault secrets enable database
```

## Configuring the PostgreSQL Connection

```bash
# Configure the PostgreSQL connection
vault write database/config/myapp-db \
  plugin_name=postgresql-database-plugin \
  allowed_roles="myapp-readonly,myapp-readwrite" \
  connection_url="postgresql://{{username}}:{{password}}@127.0.0.1:5432/postgres?sslmode=disable" \
  username="vault_admin" \
  password="vault_admin_password"
```

Rotate the root credentials so that only Vault knows the password:

```bash
# Rotate the root credentials
vault write -force database/rotate-root/myapp-db
```

After rotation, the `vault_admin` password you set manually no longer works. Only Vault has the updated password.

## Creating Database Roles

### Read-Only Role

```bash
# Create a read-only role
vault write database/roles/myapp-readonly \
  db_name=myapp-db \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  revocation_statements="REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM \"{{name}}\"; DROP ROLE IF EXISTS \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="24h"
```

### Read-Write Role

```bash
# Create a read-write role
vault write database/roles/myapp-readwrite \
  db_name=myapp-db \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO \"{{name}}\";" \
  revocation_statements="REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM \"{{name}}\"; DROP ROLE IF EXISTS \"{{name}}\";" \
  default_ttl="1h" \
  max_ttl="8h"
```

## Generating Dynamic Credentials

Request credentials from Vault:

```bash
# Request read-only credentials
vault read database/creds/myapp-readonly
```

Output:

```
Key                Value
---                -----
lease_id           database/creds/myapp-readonly/abc123
lease_duration     1h
lease_renewable    true
password           A1a-xyz789generated
username           v-token-myapp-rea-xyz789
```

Test the credentials:

```bash
# Connect to PostgreSQL with the dynamic credentials
PGPASSWORD="A1a-xyz789generated" psql -h 127.0.0.1 -U v-token-myapp-rea-xyz789 -d postgres -c "SELECT current_user;"
```

## Setting Up MySQL Dynamic Secrets

The process is similar for MySQL:

```bash
# Install MySQL
sudo dnf install -y mysql-server
sudo systemctl enable --now mysqld
```

```bash
# Configure MySQL connection in Vault
vault write database/config/mysql-db \
  plugin_name=mysql-database-plugin \
  allowed_roles="mysql-readonly" \
  connection_url="{{username}}:{{password}}@tcp(127.0.0.1:3306)/" \
  username="vault_admin" \
  password="vault_admin_password"
```

```bash
# Create a MySQL role
vault write database/roles/mysql-readonly \
  db_name=mysql-db \
  creation_statements="CREATE USER '{{name}}'@'%' IDENTIFIED BY '{{password}}'; GRANT SELECT ON *.* TO '{{name}}'@'%';" \
  revocation_statements="DROP USER IF EXISTS '{{name}}'@'%';" \
  default_ttl="1h" \
  max_ttl="24h"
```

## Renewing and Revoking Leases

Renew a lease before it expires:

```bash
# Renew a lease
vault lease renew database/creds/myapp-readonly/abc123
```

Revoke credentials immediately:

```bash
# Revoke a specific lease
vault lease revoke database/creds/myapp-readonly/abc123
```

Revoke all credentials for a role:

```bash
# Revoke all leases under a prefix
vault lease revoke -prefix database/creds/myapp-readonly
```

## Application Integration

Here is how an application fetches and uses dynamic credentials in Python:

```python
import hvac
import psycopg2

# Connect to Vault
client = hvac.Client(url='http://127.0.0.1:8200', token='your-app-token')

# Request database credentials
creds = client.secrets.database.generate_credentials(name='myapp-readonly')
username = creds['data']['username']
password = creds['data']['password']
lease_id = creds['lease_id']

# Connect to PostgreSQL with dynamic credentials
conn = psycopg2.connect(
    host='127.0.0.1',
    database='postgres',
    user=username,
    password=password
)

# Use the connection
cursor = conn.cursor()
cursor.execute("SELECT * FROM users LIMIT 10")
results = cursor.fetchall()

# When done, revoke the credentials
client.sys.revoke_lease(lease_id)
conn.close()
```

## Creating a Vault Policy for Applications

```bash
# Create a policy that allows requesting database credentials
vault policy write myapp-db-policy - << 'EOF'
path "database/creds/myapp-readonly" {
  capabilities = ["read"]
}
path "database/creds/myapp-readwrite" {
  capabilities = ["read"]
}
path "sys/leases/renew" {
  capabilities = ["update"]
}
path "sys/leases/revoke" {
  capabilities = ["update"]
}
EOF
```

## Monitoring Dynamic Secrets

Check active leases:

```bash
# List active leases
vault list sys/leases/lookup/database/creds/myapp-readonly
```

Monitor Vault audit logs for credential creation:

```bash
# Enable file audit logging
vault audit enable file file_path=/var/log/vault/audit.log
```

## Conclusion

Dynamic database secrets with Vault on RHEL eliminate the need for long-lived database passwords. Each application request gets unique, short-lived credentials that Vault automatically revokes when they expire. This dramatically reduces the blast radius of credential leaks and gives you a clear audit trail of who accessed what database and when.
