# How to Fix 'role does not exist' Errors in PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Database, Troubleshooting, Roles, Users, Permissions, Authentication

Description: Learn how to diagnose and fix 'role does not exist' errors in PostgreSQL. This guide covers role creation, permission management, and common authentication issues.

---

The "role does not exist" error in PostgreSQL occurs when you try to connect or perform an operation using a role (user) that has not been created in the database cluster. This is one of the most common errors new PostgreSQL users encounter, especially when setting up new databases or restoring backups. This guide will help you understand roles and fix this error.

---

## Understanding the Error

The error appears in different contexts:

```
FATAL: role "myuser" does not exist

ERROR: role "myuser" does not exist

psql: error: FATAL: role "myuser" does not exist
```

In PostgreSQL, roles and users are the same thing. The term "role" is used because a role can represent a user, a group, or both.

---

## Diagnosing the Issue

### List Existing Roles

```sql
-- List all roles
SELECT rolname FROM pg_roles;

-- Detailed role information
SELECT
    rolname,
    rolsuper,
    rolcreatedb,
    rolcreaterole,
    rolcanlogin
FROM pg_roles
ORDER BY rolname;

-- Or use the shortcut command in psql
\du
```

### Check How You Are Connecting

```bash
# Check current user
whoami

# PostgreSQL defaults to system username if not specified
psql mydb  # Tries to connect as system user

# Specify user explicitly
psql -U postgres mydb
```

---

## Solutions

### Solution 1: Create the Missing Role

```sql
-- Connect as superuser (postgres)
sudo -u postgres psql

-- Create a basic role that can login
CREATE ROLE myuser WITH LOGIN PASSWORD 'mypassword';

-- Create a role with more privileges
CREATE ROLE admin_user WITH
    LOGIN
    PASSWORD 'secure_password'
    CREATEDB
    CREATEROLE;

-- Create a superuser role (use with caution)
CREATE ROLE superadmin WITH
    LOGIN
    PASSWORD 'very_secure_password'
    SUPERUSER;
```

### Solution 2: Create Role Matching System User

If you want to connect without specifying a username:

```bash
# Create role matching your system username
sudo -u postgres createuser $(whoami)

# Or with psql
sudo -u postgres psql -c "CREATE ROLE $(whoami) WITH LOGIN;"
```

### Solution 3: Grant Database Access

```sql
-- Create user and grant database access
CREATE ROLE myuser WITH LOGIN PASSWORD 'mypassword';

-- Grant connect privilege to database
GRANT CONNECT ON DATABASE mydb TO myuser;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO myuser;

-- Grant table privileges
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO myuser;

-- Grant privileges on future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO myuser;
```

---

## Common Scenarios

### Scenario 1: Restoring a Backup

When restoring a backup, roles from the original database may not exist:

```bash
# Error during restore:
pg_restore: error: role "original_owner" does not exist

# Solution 1: Create the role before restore
sudo -u postgres psql -c "CREATE ROLE original_owner WITH LOGIN;"
pg_restore -U postgres -d mydb backup.dump

# Solution 2: Restore without owner information
pg_restore --no-owner -U postgres -d mydb backup.dump

# Solution 3: Remap ownership during restore
pg_restore --role=myuser -U postgres -d mydb backup.dump
```

### Scenario 2: Application Connection

```python
# Python application error:
# psycopg2.OperationalError: FATAL: role "app_user" does not exist

# Fix: Create the application role
# sudo -u postgres psql
```

```sql
CREATE ROLE app_user WITH
    LOGIN
    PASSWORD 'app_password'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE;

GRANT CONNECT ON DATABASE mydb TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
```

### Scenario 3: Docker/Container Setup

```dockerfile
# Dockerfile or docker-compose.yml
# PostgreSQL creates the POSTGRES_USER automatically

# docker-compose.yml
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: myuser        # This role is created automatically
      POSTGRES_PASSWORD: mypassword
      POSTGRES_DB: mydb
```

```bash
# If you need additional roles, create them in init script
# init.sql (mounted to /docker-entrypoint-initdb.d/)
CREATE ROLE readonly_user WITH LOGIN PASSWORD 'readonly_pass';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly_user;
```

### Scenario 4: Peer Authentication Failure

```bash
# Error: FATAL: Peer authentication failed for user "myuser"
# This means the role exists but peer auth requires matching OS user

# Option 1: Use password authentication
psql -U myuser -h localhost mydb  # Forces TCP connection with password auth

# Option 2: Modify pg_hba.conf to allow password auth
# local   all   myuser   md5
```

---

## Role Management Commands

### Creating Roles

```sql
-- Basic login role
CREATE ROLE username WITH LOGIN PASSWORD 'password';

-- Role with specific privileges
CREATE ROLE developer WITH
    LOGIN
    PASSWORD 'dev_pass'
    CREATEDB              -- Can create databases
    VALID UNTIL '2027-01-01';  -- Password expiration

-- Group role (no login)
CREATE ROLE readonly NOLOGIN;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;

-- Add user to group
GRANT readonly TO myuser;
```

### Modifying Roles

```sql
-- Change password
ALTER ROLE myuser WITH PASSWORD 'new_password';

-- Add privileges
ALTER ROLE myuser WITH CREATEDB;

-- Remove privileges
ALTER ROLE myuser WITH NOCREATEDB;

-- Rename role
ALTER ROLE oldname RENAME TO newname;

-- Set password expiration
ALTER ROLE myuser VALID UNTIL '2027-01-01';

-- Remove password expiration
ALTER ROLE myuser VALID UNTIL 'infinity';
```

### Deleting Roles

```sql
-- First, revoke privileges and reassign owned objects
REASSIGN OWNED BY myuser TO postgres;
DROP OWNED BY myuser;

-- Then drop the role
DROP ROLE myuser;

-- Drop if exists (no error if missing)
DROP ROLE IF EXISTS myuser;
```

---

## Permission Quick Reference

```sql
-- Database-level permissions
GRANT CONNECT ON DATABASE mydb TO myuser;
GRANT CREATE ON DATABASE mydb TO myuser;  -- Can create schemas

-- Schema-level permissions
GRANT USAGE ON SCHEMA public TO myuser;
GRANT CREATE ON SCHEMA public TO myuser;  -- Can create objects

-- Table-level permissions
GRANT SELECT ON TABLE mytable TO myuser;
GRANT INSERT, UPDATE, DELETE ON TABLE mytable TO myuser;
GRANT ALL ON TABLE mytable TO myuser;

-- All tables in schema
GRANT SELECT ON ALL TABLES IN SCHEMA public TO myuser;

-- Future tables (default privileges)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT ON TABLES TO myuser;

-- Sequence permissions (needed for SERIAL columns)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO myuser;
```

---

## Script for Creating Application Roles

```sql
-- create_app_role.sql
-- Run as superuser: psql -U postgres -f create_app_role.sql

-- Variables (replace with actual values)
\set app_user 'myapp'
\set app_password 'secure_random_password'
\set app_database 'myapp_db'

-- Create role
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = :'app_user') THEN
        EXECUTE format('CREATE ROLE %I WITH LOGIN PASSWORD %L', :'app_user', :'app_password');
    END IF;
END
$$;

-- Grant database access
GRANT CONNECT ON DATABASE :app_database TO :app_user;

-- Connect to application database
\c :app_database

-- Grant schema access
GRANT USAGE ON SCHEMA public TO :app_user;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :app_user;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :app_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO :app_user;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES TO :app_user;

-- Confirm role creation
\echo 'Role created successfully:'
\du :app_user
```

---

## Best Practices

1. **Never use superuser for applications** - Create dedicated roles with minimum privileges
2. **Use password authentication** - Do not rely only on peer authentication
3. **Set password expiration** - For compliance and security
4. **Use role inheritance** - Create group roles for common permission sets
5. **Document roles** - Keep track of what each role can access
6. **Audit regularly** - Review roles and permissions periodically
7. **Use connection limits** - Prevent resource exhaustion

```sql
-- Example: Role with connection limit
CREATE ROLE limited_user WITH
    LOGIN
    PASSWORD 'password'
    CONNECTION LIMIT 5;  -- Max 5 concurrent connections
```

---

## Conclusion

The "role does not exist" error is straightforward to fix once you understand PostgreSQL's role system:

1. **Check existing roles** with `\du` or `SELECT * FROM pg_roles`
2. **Create the missing role** with appropriate privileges
3. **Grant necessary permissions** on databases, schemas, and tables
4. **Update connection strings** to use the correct role name

Remember that in PostgreSQL, roles and users are the same concept, and proper role management is key to database security.

---

*Need to monitor your PostgreSQL roles and permissions? [OneUptime](https://oneuptime.com) provides comprehensive database monitoring including role tracking, permission auditing, and security alerts.*
