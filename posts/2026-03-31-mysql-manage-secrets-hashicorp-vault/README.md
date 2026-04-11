# How to Manage MySQL Secrets with HashiCorp Vault

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, HashiCorp Vault, Secret, Security, Dynamic Credential

Description: Use HashiCorp Vault's database secrets engine to generate dynamic MySQL credentials with short TTLs, eliminating hardcoded passwords in your applications.

---

## Why Use Vault for MySQL Secrets?

Hardcoded database passwords in application configs or environment variables create serious risks: they are long-lived, broadly shared, and difficult to rotate without downtime. HashiCorp Vault's database secrets engine solves this by generating short-lived, unique credentials on demand. Each application instance gets its own username and password that expire automatically.

## Prerequisites

- Vault server running and unsealed
- MySQL 8.0+ accessible from the Vault server
- Vault CLI configured: `export VAULT_ADDR=http://vault.example.com:8200`

## Enabling the Database Secrets Engine

```bash
vault secrets enable database
```

## Creating a Vault Management User in MySQL

Vault needs a MySQL account with permissions to create and revoke users:

```sql
CREATE USER 'vault_admin'@'%' IDENTIFIED BY 'VaultAdminPass!';
GRANT CREATE USER ON *.* TO 'vault_admin'@'%' WITH GRANT OPTION;
GRANT SELECT, INSERT, UPDATE, DELETE ON myapp.* TO 'vault_admin'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
```

## Configuring the MySQL Connection in Vault

```bash
vault write database/config/myapp-mysql \
  plugin_name=mysql-database-plugin \
  connection_url="{{username}}:{{password}}@tcp(mysql.example.com:3306)/" \
  allowed_roles="app-role,readonly-role" \
  username="vault_admin" \
  password="VaultAdminPass!" \
  max_open_connections=5
```

## Creating Vault Roles

Define a role that specifies what SQL to run when creating credentials:

```bash
vault write database/roles/app-role \
  db_name=myapp-mysql \
  creation_statements="CREATE USER '{{name}}'@'%' IDENTIFIED BY '{{password}}'; GRANT SELECT, INSERT, UPDATE, DELETE ON myapp.* TO '{{name}}'@'%';" \
  default_ttl=1h \
  max_ttl=24h
```

For a read-only role:

```bash
vault write database/roles/readonly-role \
  db_name=myapp-mysql \
  creation_statements="CREATE USER '{{name}}'@'%' IDENTIFIED BY '{{password}}'; GRANT SELECT ON myapp.* TO '{{name}}'@'%';" \
  default_ttl=30m \
  max_ttl=2h
```

## Generating Dynamic Credentials

```bash
vault read database/creds/app-role
```

Output:

```text
Key                Value
---                -----
lease_id           database/creds/app-role/xyz123
lease_duration     1h
lease_renewable    true
password           A1b2C3d4-dynamic-password
username           v-app-role-abc123
```

These credentials expire after 1 hour. Vault automatically runs `DROP USER` when the lease expires.

## Renewing a Lease

```bash
vault lease renew database/creds/app-role/xyz123
```

## Using Dynamic Credentials in an Application

In Python with the hvac client:

```python
import hvac
import pymysql

client = hvac.Client(url='http://vault.example.com:8200', token='s.mytoken')

creds = client.secrets.database.generate_credentials(name='app-role')
username = creds['data']['username']
password = creds['data']['password']

conn = pymysql.connect(
    host='mysql.example.com',
    user=username,
    password=password,
    database='myapp'
)
```

## Revoking Credentials Early

```bash
vault lease revoke database/creds/app-role/xyz123
```

This immediately drops the MySQL user.

## Summary

HashiCorp Vault's database secrets engine transforms MySQL credential management from static, long-lived passwords to dynamic, short-TTL credentials that expire automatically. Applications request credentials at startup, use them for the lease duration, and Vault handles cleanup. This approach eliminates credential sprawl and makes rotation a non-event.
