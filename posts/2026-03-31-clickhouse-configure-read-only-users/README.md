# How to Configure Read-Only Users in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Security, Access Control, Read-Only, User Management

Description: Learn how to create and configure read-only users in ClickHouse using SQL RBAC and users.xml to restrict access to SELECT operations only.

---

Read-only users are essential for analysts, dashboards, and reporting tools that should never modify data. ClickHouse provides multiple ways to configure read-only access with fine-grained control over which databases and tables a user can query.

## Creating a Read-Only User via SQL

The simplest approach uses SQL-driven access control:

```sql
CREATE USER readonly_user
IDENTIFIED WITH sha256_password BY 'ReadOnlyPass123!'
DEFAULT DATABASE reporting_db;

GRANT SELECT ON reporting_db.* TO readonly_user;
```

Verify the user cannot write:

```sql
-- Connecting as readonly_user, this should fail
INSERT INTO reporting_db.events VALUES (1, 'test', now());
-- Error: Not enough privileges
```

## Using the readonly Setting

ClickHouse has a `readonly` session setting that restricts what a user can do:

- `readonly = 0` - no restrictions (default)
- `readonly = 1` - only SELECT queries allowed, no settings changes
- `readonly = 2` - SELECT queries plus settings changes allowed (the `readonly` setting itself cannot be changed to escape this mode)

Set it as a profile setting:

```sql
CREATE SETTINGS PROFILE readonly_profile
SETTINGS readonly = 1;

ALTER USER readonly_user ADD PROFILES 'readonly_profile';
```

## Configuring Read-Only in users.xml

For XML-based configuration, add a `readonly` constraint:

```text
<users>
  <readonly_user>
    <password_sha256_hex>...</password_sha256_hex>
    <profile>readonly</profile>
    <networks>
      <ip>::/0</ip>
    </networks>
    <quota>default</quota>
  </readonly_user>
</users>

<profiles>
  <readonly>
    <readonly>1</readonly>
  </readonly>
</profiles>
```

## Restricting to Specific Tables

Limit the user to certain tables instead of the entire database:

```sql
CREATE USER dashboard_user
IDENTIFIED WITH sha256_password BY 'DashPass456!';

GRANT SELECT ON analytics_db.daily_summary TO dashboard_user;
GRANT SELECT ON analytics_db.user_metrics TO dashboard_user;
```

## Restricting to Specific Columns

For sensitive data, grant access to specific columns only:

```sql
GRANT SELECT(event_date, event_type, region)
ON analytics_db.events
TO readonly_user;
```

Attempting to select a restricted column returns an error:

```sql
-- This fails if user_email is not in the grant
SELECT user_email FROM analytics_db.events;
-- Error: Not enough privileges
```

## Setting Network Restrictions

Combine read-only access with IP restrictions:

```sql
CREATE USER readonly_user
IDENTIFIED WITH sha256_password BY 'ReadOnlyPass123!'
HOST IP '10.0.0.0/24';
```

## Monitoring Read-Only User Activity

Track what read-only users are querying:

```sql
SELECT user, query_kind, query, read_rows, read_bytes
FROM system.query_log
WHERE user = 'readonly_user'
  AND type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 20;
```

## Best Practices

- Always use `readonly = 1` for analyst users to prevent accidental mutations
- Combine network restrictions with read-only settings
- Use dedicated roles (e.g., `data_reader`) and assign them to multiple users
- Regularly audit `system.grants` to ensure no write permissions crept in

```sql
SELECT user_name, access_type, database, table
FROM system.grants
WHERE user_name = 'readonly_user';
```

## Summary

Configuring read-only users in ClickHouse protects your data from accidental modifications by analysts and external tools. Use SQL RBAC with targeted GRANT SELECT statements, enforce the `readonly = 1` setting via profiles, and add column-level restrictions for sensitive datasets.
