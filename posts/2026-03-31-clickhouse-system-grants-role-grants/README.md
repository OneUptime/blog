# How to Use system.grants and system.role_grants in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, system.grants, system.role_grants, Access Control, Security, Permission

Description: Use system.grants and system.role_grants to audit what privileges users and roles have in ClickHouse's SQL-based access control system.

---

ClickHouse supports SQL-based access control with users, roles, and fine-grained privileges. The `system.grants` and `system.role_grants` tables let you audit which privileges are granted directly to users or roles, and which roles have been assigned to users.

## system.grants

`system.grants` shows all privilege grants - both those assigned to users directly and those assigned to roles. Key columns:

- `user_name` - user receiving the grant (NULL if granted to a role)
- `role_name` - role receiving the grant (NULL if granted to a user)
- `access_type` - the privilege type (SELECT, INSERT, ALTER, etc.)
- `database` - database scope (NULL = global)
- `table` - table scope (NULL = all tables in database)
- `column` - column scope (NULL = all columns)
- `is_partial_revoke` - whether this is a revoke within a broader grant
- `grant_option` - whether the grantee can pass this grant to others

## Viewing All Grants

```sql
SELECT
    user_name,
    role_name,
    access_type,
    database,
    table,
    grant_option
FROM system.grants
ORDER BY user_name, role_name, access_type;
```

## Auditing Grants for a Specific User

```sql
SELECT
    access_type,
    database,
    table,
    column,
    grant_option
FROM system.grants
WHERE user_name = 'analyst'
ORDER BY access_type, database;
```

## Finding Overly Broad Grants

Users with global (all databases) grants:

```sql
SELECT
    user_name,
    access_type,
    database,
    table
FROM system.grants
WHERE database IS NULL
  AND user_name IS NOT NULL
ORDER BY user_name, access_type;
```

## system.role_grants

`system.role_grants` shows which roles have been assigned to users or to other roles. Key columns:

- `user_name` - user who received the role (NULL if granted to a role)
- `role_name` - role that received the role (NULL if granted to a user)
- `granted_role_name` - role assigned
- `granted_role_is_default` - whether the role is active by default on login
- `with_admin_option` - whether the user can grant this role to others

## Listing Role Assignments

```sql
SELECT
    user_name,
    granted_role_name,
    granted_role_is_default,
    with_admin_option
FROM system.role_grants
ORDER BY user_name, granted_role_name;
```

## Finding All Users with a Specific Role

```sql
SELECT user_name, granted_role_is_default
FROM system.role_grants
WHERE granted_role_name = 'read_only'
ORDER BY user_name;
```

## Full Access Audit per User

Combine grants and role grants for a complete picture:

```sql
-- Direct grants
SELECT 'direct' AS grant_type, access_type, database, table
FROM system.grants
WHERE user_name = 'analyst'

UNION ALL

-- Roles assigned
SELECT 'role' AS grant_type, granted_role_name, NULL, NULL
FROM system.role_grants
WHERE user_name = 'analyst'
ORDER BY grant_type, access_type;
```

## Checking Roles Table

For role definitions:

```sql
SELECT name, id FROM system.roles ORDER BY name;
```

## Summary

`system.grants` and `system.role_grants` are the primary tables for auditing access control in ClickHouse. Use them to verify privilege assignments, find overly broad grants, ensure least-privilege compliance, and understand the full permission chain for any user. Pair them with `system.users` and `system.roles` for a complete IAM audit.
