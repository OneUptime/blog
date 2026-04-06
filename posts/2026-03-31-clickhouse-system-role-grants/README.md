# How to Use system.role_grants in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, System, Security, Role, Access Control

Description: Learn how to use system.role_grants in ClickHouse to audit which roles are assigned to users and other roles, and manage RBAC role hierarchies.

---

`system.role_grants` records all role-to-user and role-to-role assignments in ClickHouse's role-based access control (RBAC) system. When you grant a role to a user (`GRANT analyst_role TO alice`) or grant a role to another role (creating a role hierarchy), the assignment appears here. It is the primary audit table for understanding who has access to what through role inheritance.

## RBAC Model in ClickHouse

```mermaid
flowchart TD
    A[Role: data_reader] --> B[GRANT SELECT ON *.* TO data_reader]
    C[Role: analyst] --> D[GRANT data_reader TO analyst]
    E[User: alice] --> F[GRANT analyst TO alice]
    F --> G[alice inherits: analyst + data_reader permissions]
    D --> G
    G --> H[system.role_grants: user_name=alice granted_role_name=analyst and role_name=analyst granted_role_name=data_reader]
```

## Key Columns

| Column | Type | Description |
|--------|------|-------------|
| `user_name` | Nullable(String) | User that received the role, if the grantee is a user |
| `role_name` | Nullable(String) | Role that received another role, if the grantee is a role |
| `granted_role_name` | String | Role that was granted |
| `granted_role_is_default` | UInt8 | 1 if the role is enabled by default at login |
| `with_admin_option` | UInt8 | 1 if the granted role includes `ADMIN OPTION` |

## Viewing All Role Grants

```sql
SELECT
    role_name,
    user_name,
    granted_role_name,
    granted_role_is_default,
    with_admin_option
FROM system.role_grants
ORDER BY user_name, role_name, granted_role_name;
```

## Roles Assigned to Users

```sql
SELECT
    user_name AS username,
    granted_role_name,
    granted_role_is_default,
    with_admin_option
FROM system.role_grants
WHERE user_name IS NOT NULL
ORDER BY username, granted_role_name;
```

## Roles Assigned to Other Roles (Role Hierarchy)

```sql
SELECT
    role_name AS recipient_role,
    granted_role_name,
    with_admin_option
FROM system.role_grants
WHERE role_name IS NOT NULL
ORDER BY recipient_role, granted_role_name;
```

## Finding All Roles a User Has (Direct and Inherited)

ClickHouse does not provide a built-in recursive role resolution query, but you can do two levels:

```sql
-- Direct role grants to a user
SELECT granted_role_name AS direct_role
FROM system.role_grants
WHERE user_name = 'alice';

-- Roles inherited through directly granted roles
SELECT rg2.granted_role_name AS inherited_role
FROM system.role_grants rg1
JOIN system.role_grants rg2
    ON rg1.granted_role_name = rg2.role_name
WHERE rg1.user_name = 'alice'
  AND rg2.role_name IS NOT NULL;
```

## Creating and Granting Roles

```sql
-- Create roles
CREATE ROLE data_reader;
CREATE ROLE analyst;
CREATE ROLE data_engineer;

-- Grant privileges to roles
GRANT SELECT ON default.* TO data_reader;
GRANT SELECT, INSERT ON default.* TO data_engineer;

-- Build role hierarchy
GRANT data_reader TO analyst;   -- analyst inherits data_reader

-- Assign roles to users
GRANT analyst TO alice;
GRANT data_engineer TO bob;
GRANT analyst, data_engineer TO charlie;

-- Verify in system.role_grants
SELECT user_name, role_name, granted_role_name
FROM system.role_grants
ORDER BY user_name, role_name, granted_role_name;
```

## Finding Users with Admin Option

The `WITH ADMIN OPTION` allows a user to grant the role to others:

```sql
SELECT user_name, role_name, granted_role_name
FROM system.role_grants
WHERE with_admin_option = 1
ORDER BY user_name, role_name, granted_role_name;
```

## Auditing Role Changes

`system.role_grants` reflects the current state. For historical change tracking, query `system.query_log` for DDL queries:

```sql
SELECT
    event_time,
    user,
    query
FROM system.query_log
WHERE type = 'QueryFinish'
  AND (
    query LIKE '%GRANT%TO%'
    OR query LIKE '%REVOKE%FROM%'
  )
  AND event_date >= today() - 30
ORDER BY event_time DESC
LIMIT 50;
```

## Revoking a Role

```sql
-- Revoke a role from a user
REVOKE analyst FROM alice;

-- Verify
SELECT user_name, granted_role_name
FROM system.role_grants
WHERE user_name = 'alice';
```

## Related Tables

| Table | Content |
|-------|---------|
| `system.role_grants` | Role-to-user and role-to-role assignments |
| `system.grants` | Privilege grants (SELECT, INSERT, etc.) to users and roles |
| `system.roles` | List of all defined roles |
| `system.users` | List of all users |
| `system.current_roles` | Roles active in the current session |
| `system.enabled_roles` | All roles enabled for the current user |

## Summary

`system.role_grants` is the audit table for ClickHouse RBAC role assignments. Use it to see which roles are assigned to users, discover role hierarchies (roles granted to other roles), find users with admin option, and audit privilege propagation chains. Combine it with `system.grants` to understand the full privilege set a user has through their role assignments, and with `system.query_log` for historical change tracking.
