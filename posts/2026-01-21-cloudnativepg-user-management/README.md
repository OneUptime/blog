# How to Manage PostgreSQL Users and Databases with CloudNativePG

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudNativePG, Kubernetes, PostgreSQL, Users, Roles, Security, Database Management

Description: A comprehensive guide to managing PostgreSQL users, roles, and databases with CloudNativePG, covering declarative user management, password rotation, RBAC integration, and security best practices.

---

Proper user and database management is essential for PostgreSQL security and operations. CloudNativePG provides declarative management of PostgreSQL roles, making it easy to manage users as code. This guide covers all aspects of user and database management.

## Prerequisites

- CloudNativePG operator installed
- PostgreSQL cluster running
- Understanding of PostgreSQL roles and privileges

## User Management Approaches

CloudNativePG supports two approaches:

1. **Declarative (Managed Roles)**: Define users in cluster spec
2. **Imperative (Manual)**: Create users via SQL

## Declarative User Management

### Basic Managed Roles

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: postgres-cluster
spec:
  instances: 3
  storage:
    size: 10Gi

  managed:
    roles:
      - name: app_user
        ensure: present
        login: true
        passwordSecret:
          name: app-user-credentials
```

Create the password secret:

```bash
kubectl create secret generic app-user-credentials \
  --from-literal=username=app_user \
  --from-literal=password=$(openssl rand -base64 24)
```

### Complete Role Configuration

```yaml
spec:
  managed:
    roles:
      # Application user
      - name: app_user
        ensure: present
        login: true
        superuser: false
        createdb: false
        createrole: false
        inherit: true
        replication: false
        bypassrls: false
        connectionLimit: 100
        validUntil: "2027-01-01T00:00:00Z"
        passwordSecret:
          name: app-user-credentials
        inRoles:
          - pg_read_all_data

      # Read-only user
      - name: readonly_user
        ensure: present
        login: true
        superuser: false
        createdb: false
        connectionLimit: 50
        passwordSecret:
          name: readonly-credentials
        inRoles:
          - pg_read_all_data

      # Admin user
      - name: admin_user
        ensure: present
        login: true
        superuser: true
        passwordSecret:
          name: admin-credentials

      # Replication user
      - name: replication_user
        ensure: present
        login: true
        replication: true
        passwordSecret:
          name: replication-credentials

      # Service account (for automated tools)
      - name: backup_user
        ensure: present
        login: true
        superuser: false
        passwordSecret:
          name: backup-credentials
        inRoles:
          - pg_read_all_data
```

### Role Attributes

| Attribute | Description | Default |
|-----------|-------------|---------|
| `login` | Can connect to database | false |
| `superuser` | Has superuser privileges | false |
| `createdb` | Can create databases | false |
| `createrole` | Can create other roles | false |
| `inherit` | Inherits privileges from roles | true |
| `replication` | Can initiate replication | false |
| `bypassrls` | Bypasses row-level security | false |
| `connectionLimit` | Max concurrent connections | -1 (unlimited) |
| `validUntil` | Password expiry timestamp | none |

### Built-in PostgreSQL Roles

Reference these in `inRoles`:

| Role | Description |
|------|-------------|
| `pg_read_all_data` | Read all data (PostgreSQL 14+) |
| `pg_write_all_data` | Write all data (PostgreSQL 14+) |
| `pg_read_all_settings` | Read all configuration |
| `pg_read_all_stats` | Read all statistics |
| `pg_monitor` | Monitoring privileges |
| `pg_signal_backend` | Send signals to backends |

## Database Management

### Bootstrap Database

```yaml
spec:
  bootstrap:
    initdb:
      database: myapp
      owner: app_user
      secret:
        name: db-credentials
```

### Additional Databases

Create via post-init SQL:

```yaml
spec:
  bootstrap:
    initdb:
      database: primary_db
      owner: app_user
      postInitSQL:
        - CREATE DATABASE analytics OWNER app_user
        - CREATE DATABASE reporting OWNER readonly_user
        - CREATE DATABASE staging OWNER app_user
```

### Database with Extensions

```yaml
spec:
  bootstrap:
    initdb:
      database: myapp
      owner: app_user
      postInitSQL:
        - CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
        - CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"
        - CREATE EXTENSION IF NOT EXISTS "pgcrypto"
```

### Schema Management

```yaml
spec:
  bootstrap:
    initdb:
      database: myapp
      postInitSQL:
        - CREATE SCHEMA IF NOT EXISTS app
        - CREATE SCHEMA IF NOT EXISTS audit
        - GRANT USAGE ON SCHEMA app TO app_user
        - GRANT ALL ON SCHEMA app TO app_user
        - GRANT USAGE ON SCHEMA audit TO readonly_user
        - ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user
```

## Password Management

### Generate Secure Passwords

```bash
# Generate random password
kubectl create secret generic app-user-credentials \
  --from-literal=username=app_user \
  --from-literal=password=$(openssl rand -base64 32)

# Or use a password generator
kubectl create secret generic app-user-credentials \
  --from-literal=username=app_user \
  --from-literal=password=$(tr -dc 'A-Za-z0-9!@#$%^&*' </dev/urandom | head -c 32)
```

### Password Rotation

Update the secret to rotate password:

```bash
# Generate new password
NEW_PASSWORD=$(openssl rand -base64 32)

# Update secret
kubectl create secret generic app-user-credentials \
  --from-literal=username=app_user \
  --from-literal=password=$NEW_PASSWORD \
  --dry-run=client -o yaml | kubectl apply -f -
```

CloudNativePG will automatically update the role password.

### Password Expiry

```yaml
spec:
  managed:
    roles:
      - name: temp_user
        ensure: present
        login: true
        validUntil: "2026-06-01T00:00:00Z"
        passwordSecret:
          name: temp-user-credentials
```

## Access Default Credentials

### Cluster Secrets

CloudNativePG creates several secrets automatically:

```bash
# List cluster secrets
kubectl get secrets -l cnpg.io/cluster=postgres-cluster

# Secrets created:
# postgres-cluster-superuser - Superuser (postgres) credentials
# postgres-cluster-app - Application user credentials
```

### Retrieve Credentials

```bash
# Get superuser password
kubectl get secret postgres-cluster-superuser -o jsonpath='{.data.password}' | base64 -d

# Get app user credentials
kubectl get secret postgres-cluster-app -o jsonpath='{.data.username}' | base64 -d
kubectl get secret postgres-cluster-app -o jsonpath='{.data.password}' | base64 -d

# Get connection string
kubectl get secret postgres-cluster-app -o jsonpath='{.data.uri}' | base64 -d
```

## Granting Privileges

### Via Post-Init SQL

```yaml
spec:
  bootstrap:
    initdb:
      database: myapp
      postInitApplicationSQLRefs:
        configMapRefs:
          - name: database-grants
            key: grants.sql
```

Create ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: database-grants
data:
  grants.sql: |
    -- Grant schema access
    GRANT USAGE ON SCHEMA public TO app_user;
    GRANT USAGE ON SCHEMA app TO app_user;

    -- Grant table access
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
    GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;

    -- Grant sequence access
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

    -- Default privileges for future tables
    ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

    ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO readonly_user;

    ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE, SELECT ON SEQUENCES TO app_user;
```

### Manual Privilege Management

```bash
# Connect as superuser
kubectl exec -it postgres-cluster-1 -- psql -U postgres

# Grant privileges
GRANT CONNECT ON DATABASE myapp TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
```

## Row-Level Security

### Enable RLS

```yaml
spec:
  bootstrap:
    initdb:
      postInitSQL:
        - |
          -- Enable RLS on table
          ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

          -- Create policy for tenant isolation
          CREATE POLICY tenant_isolation ON customers
            USING (tenant_id = current_setting('app.tenant_id')::int);

          -- Force RLS for table owner
          ALTER TABLE customers FORCE ROW LEVEL SECURITY;
```

### Application Usage

```sql
-- Set tenant context
SET app.tenant_id = '123';

-- Query only sees tenant's data
SELECT * FROM customers;
```

## Removing Users

### Declarative Removal

```yaml
spec:
  managed:
    roles:
      - name: old_user
        ensure: absent  # Remove this user
```

### Manual Removal

```bash
# Connect as superuser
kubectl exec -it postgres-cluster-1 -- psql -U postgres

# Remove user
REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM old_user;
REVOKE ALL PRIVILEGES ON DATABASE myapp FROM old_user;
DROP USER old_user;
```

## Integration with External Systems

### LDAP Authentication

```yaml
spec:
  postgresql:
    ldap:
      server: ldap.example.com
      port: 389
      scheme: ldap
      bindAsAuth: true
      prefix: "uid="
      suffix: ",ou=users,dc=example,dc=com"
```

Update pg_hba.conf:

```yaml
spec:
  postgresql:
    pg_hba:
      - host all all 0.0.0.0/0 ldap ldapserver=ldap.example.com ldapprefix="uid=" ldapsuffix=",ou=users,dc=example,dc=com"
```

### External Secrets Operator

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: app-user-credentials
spec:
  secretStoreRef:
    name: vault-backend
    kind: ClusterSecretStore
  target:
    name: app-user-credentials
  data:
    - secretKey: username
      remoteRef:
        key: postgres/app-user
        property: username
    - secretKey: password
      remoteRef:
        key: postgres/app-user
        property: password
```

## Complete Example

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Cluster
metadata:
  name: production-postgres
  namespace: production
spec:
  instances: 3
  imageName: ghcr.io/cloudnative-pg/postgresql:16.1

  storage:
    size: 100Gi

  bootstrap:
    initdb:
      database: myapp
      owner: app_owner
      secret:
        name: owner-credentials
      postInitSQL:
        # Extensions
        - CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
        - CREATE EXTENSION IF NOT EXISTS "pg_stat_statements"

        # Additional databases
        - CREATE DATABASE analytics OWNER app_owner
        - CREATE DATABASE staging OWNER app_owner

        # Schemas
        - CREATE SCHEMA IF NOT EXISTS app
        - CREATE SCHEMA IF NOT EXISTS audit

      postInitApplicationSQLRefs:
        configMapRefs:
          - name: initial-grants
            key: grants.sql

  managed:
    roles:
      # Application owner
      - name: app_owner
        ensure: present
        login: true
        superuser: false
        createdb: true
        passwordSecret:
          name: owner-credentials

      # Application user (read-write)
      - name: app_user
        ensure: present
        login: true
        connectionLimit: 100
        passwordSecret:
          name: app-user-credentials
        inRoles:
          - pg_read_all_data
          - pg_write_all_data

      # Read-only user
      - name: readonly_user
        ensure: present
        login: true
        connectionLimit: 50
        passwordSecret:
          name: readonly-credentials
        inRoles:
          - pg_read_all_data

      # Monitoring user
      - name: monitoring
        ensure: present
        login: true
        connectionLimit: 5
        passwordSecret:
          name: monitoring-credentials
        inRoles:
          - pg_monitor
          - pg_read_all_stats

      # Backup user
      - name: backup_user
        ensure: present
        login: true
        superuser: false
        passwordSecret:
          name: backup-credentials
        inRoles:
          - pg_read_all_data
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: initial-grants
  namespace: production
data:
  grants.sql: |
    -- App schema grants
    GRANT USAGE ON SCHEMA app TO app_user;
    GRANT USAGE ON SCHEMA app TO readonly_user;
    GRANT ALL ON SCHEMA app TO app_owner;

    -- Table grants
    GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO app_user;
    GRANT SELECT ON ALL TABLES IN SCHEMA app TO readonly_user;

    -- Sequence grants
    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO app_user;

    -- Default privileges
    ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA app
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;

    ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA app
    GRANT SELECT ON TABLES TO readonly_user;

    ALTER DEFAULT PRIVILEGES FOR ROLE app_owner IN SCHEMA app
    GRANT USAGE, SELECT ON SEQUENCES TO app_user;
```

## Best Practices

### Security Principles

1. **Least privilege** - Grant only necessary permissions
2. **Separate users** - Different users for different purposes
3. **Strong passwords** - Use generated passwords, rotate regularly
4. **No shared accounts** - Each application gets its own user
5. **Audit access** - Enable logging for sensitive operations

### User Categories

| User Type | Privileges | Use Case |
|-----------|------------|----------|
| Owner | CREATEDB, owns objects | Schema management |
| Application | CRUD on specific schemas | Application access |
| Read-only | SELECT only | Reporting, analytics |
| Monitoring | pg_monitor | Metrics collection |
| Backup | pg_read_all_data | Backup operations |
| Admin | Superuser | Emergency access |

## Conclusion

CloudNativePG simplifies PostgreSQL user management:

1. **Declarative roles** - Define users as code
2. **Automatic sync** - Operator manages passwords
3. **Secret integration** - Kubernetes-native credential management
4. **Flexible grants** - Support for complex permission models
5. **Security features** - RLS, LDAP, external secrets

Properly managed users and permissions are fundamental to database security. Use CloudNativePG's declarative approach to maintain consistent, auditable user management across your clusters.
