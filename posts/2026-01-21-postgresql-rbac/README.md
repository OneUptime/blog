# How to Implement PostgreSQL Role-Based Access Control

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, RBAC, Security, Roles, Permissions, Access Control

Description: A comprehensive guide to implementing role-based access control in PostgreSQL, covering role hierarchies, privilege management, and security best practices.

---

PostgreSQL's role system provides flexible access control through roles, privileges, and inheritance. This guide covers implementing RBAC for secure database access.

## Role Basics

### Create Roles

```sql
-- Create login role (user)
CREATE ROLE app_user WITH LOGIN PASSWORD 'secure_password';

-- Create group role (no login)
CREATE ROLE app_readers;
CREATE ROLE app_writers;
CREATE ROLE app_admins;
```

### Role Inheritance

```sql
-- Grant group membership
GRANT app_readers TO app_user;

-- User inherits permissions from app_readers
```

## Privilege Hierarchy

```
Superuser
    |
Database Owner
    |
Schema Owner
    |
Table Owner
    |
Granted Privileges (SELECT, INSERT, UPDATE, DELETE)
```

## Common Patterns

### Read-Only Role

```sql
-- Create read-only role
CREATE ROLE readonly;
GRANT CONNECT ON DATABASE myapp TO readonly;
GRANT USAGE ON SCHEMA public TO readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;

-- For future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT ON TABLES TO readonly;
```

### Read-Write Role

```sql
-- Create read-write role
CREATE ROLE readwrite;
GRANT CONNECT ON DATABASE myapp TO readwrite;
GRANT USAGE ON SCHEMA public TO readwrite;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO readwrite;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO readwrite;

-- For future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO readwrite;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT USAGE ON SEQUENCES TO readwrite;
```

### Admin Role

```sql
-- Create admin role (not superuser)
CREATE ROLE app_admin;
GRANT CONNECT ON DATABASE myapp TO app_admin;
GRANT ALL PRIVILEGES ON SCHEMA public TO app_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO app_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO app_admin;
```

## Application Users

```sql
-- Create application user
CREATE ROLE myapp_user WITH LOGIN PASSWORD 'secure_pass';
GRANT readwrite TO myapp_user;

-- Create reporting user
CREATE ROLE reports_user WITH LOGIN PASSWORD 'secure_pass';
GRANT readonly TO reports_user;
```

## Check Permissions

```sql
-- User's roles
SELECT rolname FROM pg_roles WHERE pg_has_role(current_user, oid, 'member');

-- Table permissions
SELECT grantee, privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'users';

-- All user permissions
\dp users
```

## Revoke Permissions

```sql
-- Revoke specific privilege
REVOKE INSERT ON users FROM app_user;

-- Revoke all privileges
REVOKE ALL PRIVILEGES ON users FROM app_user;

-- Revoke role membership
REVOKE readwrite FROM app_user;
```

## Best Practices

1. **Use group roles** - Assign permissions to groups, not users
2. **Principle of least privilege** - Grant minimum necessary
3. **Avoid superuser** - Use specific privileges instead
4. **Set default privileges** - For future objects
5. **Regular audits** - Review permissions periodically
6. **Separate environments** - Different roles per environment

## Complete Example

```sql
-- Create role hierarchy
CREATE ROLE app_base;
CREATE ROLE app_reader INHERIT IN ROLE app_base;
CREATE ROLE app_writer INHERIT IN ROLE app_reader;
CREATE ROLE app_admin INHERIT IN ROLE app_writer;

-- Grant base permissions
GRANT CONNECT ON DATABASE myapp TO app_base;
GRANT USAGE ON SCHEMA public TO app_base;

-- Grant reader permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO app_reader;

-- Grant writer permissions
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_writer;

-- Grant admin permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO app_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO app_admin;

-- Create users with appropriate roles
CREATE ROLE api_user WITH LOGIN PASSWORD 'pass' IN ROLE app_writer;
CREATE ROLE report_user WITH LOGIN PASSWORD 'pass' IN ROLE app_reader;
```

## Conclusion

PostgreSQL RBAC provides granular access control through roles and inheritance. Design role hierarchies based on your application's access patterns.
