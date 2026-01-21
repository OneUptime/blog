# How to Manage ClickHouse Users and Access Control

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Security, RBAC, Access Control, Database, Authentication, Users, Permissions

Description: A comprehensive guide to managing users, roles, and access control in ClickHouse, covering SQL-based RBAC, row-level security, quotas, and settings profiles for multi-tenant environments.

---

ClickHouse provides flexible access control through SQL-based role-based access control (RBAC). You can create users, define roles, set quotas, and implement row-level security. This guide covers everything you need to secure your ClickHouse deployment.

## Enabling Access Control

First, enable SQL-based access management:

```xml
<!-- /etc/clickhouse-server/users.d/access_management.xml -->
<clickhouse>
    <users>
        <default>
            <!-- Enable access management for the default user -->
            <access_management>1</access_management>
        </default>
    </users>
</clickhouse>
```

Or create an admin user with access management enabled:

```xml
<clickhouse>
    <users>
        <admin>
            <password_sha256_hex>...</password_sha256_hex>
            <networks>
                <ip>::/0</ip>
            </networks>
            <profile>default</profile>
            <quota>default</quota>
            <access_management>1</access_management>
        </admin>
    </users>
</clickhouse>
```

## Creating Users

### Basic User Creation

```sql
-- Create a user with password
CREATE USER analyst IDENTIFIED BY 'secure_password_123';

-- Create user with SHA256 hash
CREATE USER analyst IDENTIFIED WITH sha256_password BY 'password';

-- Create user with double SHA1 (MySQL compatible)
CREATE USER app_user IDENTIFIED WITH double_sha1_password BY 'password';

-- Create user with LDAP authentication
CREATE USER ldap_user IDENTIFIED WITH ldap SERVER 'ldap_server';
```

### User with Network Restrictions

```sql
-- Restrict to specific IPs
CREATE USER analyst
IDENTIFIED BY 'password'
HOST IP '10.0.0.0/8', IP '192.168.1.0/24';

-- Allow from localhost only
CREATE USER local_user
IDENTIFIED BY 'password'
HOST LOCAL;

-- Allow from specific hostname patterns
CREATE USER office_user
IDENTIFIED BY 'password'
HOST REGEXP '.*\.company\.com';
```

### User with Default Database

```sql
-- Set default database
CREATE USER analyst
IDENTIFIED BY 'password'
DEFAULT DATABASE analytics;

-- User automatically connects to analytics database
```

### Managing Users

```sql
-- List all users
SELECT * FROM system.users;

-- Show user grants
SHOW GRANTS FOR analyst;

-- Change password
ALTER USER analyst IDENTIFIED BY 'new_password';

-- Rename user
ALTER USER analyst RENAME TO senior_analyst;

-- Drop user
DROP USER analyst;
```

## Creating Roles

### Basic Role Management

```sql
-- Create roles
CREATE ROLE data_reader;
CREATE ROLE data_writer;
CREATE ROLE admin;

-- Grant privileges to roles
GRANT SELECT ON analytics.* TO data_reader;
GRANT INSERT, SELECT ON analytics.* TO data_writer;
GRANT ALL ON *.* TO admin;

-- Assign roles to users
GRANT data_reader TO analyst;
GRANT data_writer TO etl_user;
GRANT admin TO admin_user;

-- Set default roles
SET DEFAULT ROLE data_reader TO analyst;
```

### Role Hierarchy

```sql
-- Create hierarchical roles
CREATE ROLE junior_analyst;
CREATE ROLE senior_analyst;
CREATE ROLE lead_analyst;

-- Junior can read from specific tables
GRANT SELECT ON analytics.events TO junior_analyst;
GRANT SELECT ON analytics.users TO junior_analyst;

-- Senior inherits junior and can read more
GRANT junior_analyst TO senior_analyst;
GRANT SELECT ON analytics.revenue TO senior_analyst;

-- Lead inherits senior and can write
GRANT senior_analyst TO lead_analyst;
GRANT INSERT ON analytics.* TO lead_analyst;
```

### Managing Roles

```sql
-- List all roles
SELECT * FROM system.roles;

-- Show role grants
SHOW GRANTS FOR data_reader;

-- Revoke role from user
REVOKE data_reader FROM analyst;

-- Drop role
DROP ROLE old_role;
```

## Granting Privileges

### Database Level

```sql
-- Read access to database
GRANT SELECT ON database_name.* TO role_name;

-- Write access
GRANT INSERT ON database_name.* TO role_name;

-- Full access
GRANT ALL ON database_name.* TO role_name;

-- Create tables
GRANT CREATE TABLE ON database_name.* TO role_name;

-- Drop tables
GRANT DROP TABLE ON database_name.* TO role_name;
```

### Table Level

```sql
-- Select on specific tables
GRANT SELECT ON analytics.events TO analyst;
GRANT SELECT ON analytics.users TO analyst;

-- Insert on specific table
GRANT INSERT ON analytics.events TO etl_user;

-- Column-level access
GRANT SELECT(user_id, event_type, event_time) ON analytics.events TO limited_user;

-- Deny access to specific columns (PII)
REVOKE SELECT(email, phone) ON analytics.users FROM analyst;
```

### Cluster Level

```sql
-- Access to distributed queries
GRANT CLUSTER ON cluster_name TO role_name;

-- Remote server access
GRANT REMOTE ON 'remote_host:9000' TO role_name;
```

### Dictionary Access

```sql
-- Grant dictionary access
GRANT dictGet ON dict_name TO role_name;
GRANT dictGet ON *.* TO role_name;  -- All dictionaries
```

## Settings Profiles

### Creating Profiles

```sql
-- Create a profile for analysts
CREATE SETTINGS PROFILE analyst_profile
SETTINGS
    max_memory_usage = 10000000000,  -- 10 GB
    max_execution_time = 300,
    max_threads = 8,
    readonly = 1;

-- Create profile for ETL
CREATE SETTINGS PROFILE etl_profile
SETTINGS
    max_memory_usage = 50000000000,  -- 50 GB
    max_execution_time = 3600,
    max_insert_threads = 16,
    async_insert = 1;

-- Create profile with inheritance
CREATE SETTINGS PROFILE senior_analyst_profile
SETTINGS INHERIT analyst_profile,
    max_memory_usage = 20000000000,
    readonly = 0;
```

### Assigning Profiles

```sql
-- Assign profile to user
ALTER USER analyst SETTINGS PROFILE analyst_profile;

-- Assign profile to role
ALTER ROLE data_reader SETTINGS PROFILE analyst_profile;

-- Override specific settings
ALTER USER analyst SETTINGS
    PROFILE analyst_profile,
    max_execution_time = 600;
```

### Profile Constraints

```sql
-- Create profile with constraints
CREATE SETTINGS PROFILE restricted_profile
SETTINGS
    max_memory_usage = 5000000000 MIN 1000000000 MAX 10000000000,
    max_threads = 4 MIN 1 MAX 8,
    readonly = 1 CONST;  -- Cannot be changed

-- CONST: cannot be changed by user
-- MIN/MAX: user can change within range
-- CHANGEABLE_IN_READONLY: can be changed even in readonly mode
```

## Quotas

### Creating Quotas

```sql
-- Create quota with limits
CREATE QUOTA analyst_quota
FOR INTERVAL 1 hour
    MAX queries = 1000,
    MAX query_selects = 900,
    MAX query_inserts = 100,
    MAX result_rows = 10000000,
    MAX read_rows = 100000000000,
    MAX execution_time = 36000
FOR INTERVAL 1 day
    MAX queries = 10000,
    MAX result_rows = 100000000
TO analyst;

-- Quota for ETL processes
CREATE QUOTA etl_quota
FOR INTERVAL 1 hour
    MAX queries = 100,
    MAX query_inserts = 90,
    MAX written_bytes = 100000000000  -- 100 GB per hour
TO etl_user;
```

### Quota Keys

```sql
-- Different quotas per client IP
CREATE QUOTA ip_based_quota
KEYED BY ip_address
FOR INTERVAL 1 hour
    MAX queries = 100;

-- Quota per user
CREATE QUOTA user_quota
KEYED BY user_name
FOR INTERVAL 1 hour
    MAX queries = 500;

-- Combined key
CREATE QUOTA combined_quota
KEYED BY client_key  -- set via session setting
FOR INTERVAL 1 hour
    MAX queries = 100;
```

### Monitoring Quotas

```sql
-- Check quota usage
SELECT * FROM system.quotas;

-- Current quota consumption
SELECT * FROM system.quota_usage;

-- Detailed quota limits
SELECT * FROM system.quota_limits;
```

## Row-Level Security

### Creating Row Policies

```sql
-- Each user sees only their team's data
CREATE ROW POLICY team_policy ON analytics.events
FOR SELECT
USING team_id = currentUser()
TO analyst_role;

-- Multiple conditions
CREATE ROW POLICY region_policy ON analytics.events
FOR SELECT
USING region IN ('us-east', 'us-west')
TO us_analysts;

-- Policy based on user settings
CREATE ROW POLICY tenant_policy ON analytics.events
FOR SELECT
USING tenant_id = getSetting('tenant_id')
TO multi_tenant_role;
```

### Row Policy Modes

```sql
-- PERMISSIVE: rows match if ANY policy allows (OR)
CREATE ROW POLICY policy1 ON table
AS PERMISSIVE
FOR SELECT
USING condition1
TO role1;

-- RESTRICTIVE: rows must match ALL restrictive policies (AND)
CREATE ROW POLICY policy2 ON table
AS RESTRICTIVE
FOR SELECT
USING condition2
TO role1;
```

### Managing Row Policies

```sql
-- List all policies
SELECT * FROM system.row_policies;

-- Show policies for table
SHOW ROW POLICIES ON analytics.events;

-- Drop policy
DROP ROW POLICY policy_name ON table_name;
```

## Authentication Methods

### Password Authentication

```sql
-- Plaintext (for development only)
CREATE USER dev_user IDENTIFIED WITH plaintext_password BY 'password';

-- SHA256 (recommended)
CREATE USER prod_user IDENTIFIED WITH sha256_password BY 'password';

-- Double SHA1 (MySQL compatible)
CREATE USER mysql_compat IDENTIFIED WITH double_sha1_password BY 'password';

-- bcrypt
CREATE USER bcrypt_user IDENTIFIED WITH bcrypt_password BY 'password';
```

### LDAP Authentication

```xml
<!-- /etc/clickhouse-server/config.d/ldap.xml -->
<clickhouse>
    <ldap_servers>
        <company_ldap>
            <host>ldap.company.com</host>
            <port>636</port>
            <bind_dn>cn=admin,dc=company,dc=com</bind_dn>
            <verification_cooldown>300</verification_cooldown>
            <enable_tls>yes</enable_tls>
        </company_ldap>
    </ldap_servers>
</clickhouse>
```

```sql
-- Create LDAP user
CREATE USER ldap_user IDENTIFIED WITH ldap SERVER 'company_ldap';
```

### Kerberos Authentication

```xml
<!-- /etc/clickhouse-server/config.d/kerberos.xml -->
<clickhouse>
    <kerberos>
        <principal>HTTP/clickhouse.company.com@COMPANY.COM</principal>
        <keytab>/etc/clickhouse-server/clickhouse.keytab</keytab>
    </kerberos>
</clickhouse>
```

```sql
-- Create Kerberos user
CREATE USER krb_user IDENTIFIED WITH kerberos REALM 'COMPANY.COM';
```

### SSL Certificate Authentication

```xml
<!-- /etc/clickhouse-server/config.d/ssl_auth.xml -->
<clickhouse>
    <openSSL>
        <server>
            <verificationMode>strict</verificationMode>
            <caConfig>/etc/clickhouse-server/ca.pem</caConfig>
        </server>
    </openSSL>
</clickhouse>
```

```sql
-- Create certificate-based user
CREATE USER cert_user IDENTIFIED WITH ssl_certificate CN 'user@company.com';
```

## Multi-Tenant Setup

### Tenant Isolation Example

```sql
-- Create tenant-specific roles
CREATE ROLE tenant_a_role;
CREATE ROLE tenant_b_role;

-- Create row policies for tenant isolation
CREATE ROW POLICY tenant_a_isolation ON shared_data
FOR SELECT
USING tenant_id = 'tenant_a'
TO tenant_a_role;

CREATE ROW POLICY tenant_b_isolation ON shared_data
FOR SELECT
USING tenant_id = 'tenant_b'
TO tenant_b_role;

-- Create users for each tenant
CREATE USER tenant_a_user IDENTIFIED BY 'pass' DEFAULT ROLE tenant_a_role;
CREATE USER tenant_b_user IDENTIFIED BY 'pass' DEFAULT ROLE tenant_b_role;

-- Set tenant quotas
CREATE QUOTA tenant_a_quota
FOR INTERVAL 1 hour
    MAX queries = 1000,
    MAX read_rows = 1000000000
TO tenant_a_role;
```

### Dynamic Tenant Context

```sql
-- Set tenant context via settings
SET tenant_id = 'tenant_a';

-- Row policy uses this setting
CREATE ROW POLICY dynamic_tenant ON shared_data
FOR SELECT
USING tenant_id = getSetting('tenant_id')
TO multi_tenant_role;
```

## Best Practices

### User Management

```sql
-- Use roles instead of direct grants
-- Bad
GRANT SELECT ON analytics.* TO user1;
GRANT SELECT ON analytics.* TO user2;

-- Good
CREATE ROLE analytics_reader;
GRANT SELECT ON analytics.* TO analytics_reader;
GRANT analytics_reader TO user1, user2;
```

### Principle of Least Privilege

```sql
-- Start with minimal permissions
CREATE ROLE minimal_reader;
GRANT SELECT ON analytics.events(event_type, event_time) TO minimal_reader;

-- Add more as needed
GRANT SELECT ON analytics.events(user_id) TO minimal_reader;
```

### Audit Access

```sql
-- Monitor who has access to what
SELECT
    user_name,
    granted_role_name,
    access_type,
    database,
    table
FROM system.grants
WHERE database = 'analytics';

-- Check current privileges
SHOW ACCESS;

-- Show grants for specific user
SHOW GRANTS FOR analyst;
```

### Security Checklist

```sql
-- 1. Disable default user in production
ALTER USER default IDENTIFIED BY 'complex_password' HOST LOCAL;

-- 2. Create admin user with strong auth
CREATE USER admin IDENTIFIED BY 'very_complex_password'
HOST IP '10.0.0.0/8';

-- 3. Create application users with minimal permissions
CREATE USER app_readonly IDENTIFIED BY 'password'
HOST NAME 'app-server.company.com'
DEFAULT ROLE app_reader;

-- 4. Set up quotas for all users
CREATE QUOTA default_quota
FOR INTERVAL 1 hour MAX queries = 10000
TO ALL EXCEPT admin;

-- 5. Enable query logging
-- Already enabled by default in system.query_log
```

---

ClickHouse's SQL-based access control provides the flexibility to implement sophisticated security models. Use roles for permission inheritance, row policies for data isolation, quotas to prevent resource abuse, and settings profiles to control query behavior. Always follow the principle of least privilege and audit access regularly.
