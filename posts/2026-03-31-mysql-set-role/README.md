# How to Use SET ROLE Statement in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Role, Security

Description: Learn how to use SET ROLE in MySQL to activate or deactivate assigned roles within a session to control which privileges are in effect.

---

## What Is SET ROLE

In MySQL's role-based access control system, assigning a role to a user does not automatically make that role active. The user must explicitly activate roles within their session using `SET ROLE`. This design allows users to have multiple roles assigned and selectively activate only the ones needed for a specific task - reducing the risk of accidental privilege escalation.

```sql
SET ROLE role_name;
SET ROLE role1, role2;
SET ROLE ALL;
SET ROLE ALL EXCEPT role_name;
SET ROLE NONE;
SET ROLE DEFAULT;
```

## Activating a Specific Role

Activate one or more specific roles for the current session:

```sql
-- Activate a single role
SET ROLE 'app_reader';

-- Activate multiple roles
SET ROLE 'app_reader', 'reporting_viewer';
```

After this, the privileges granted to those roles are available for the rest of the session.

## Activating All Assigned Roles

To activate all roles currently assigned to the user:

```sql
SET ROLE ALL;
```

This is a shorthand for activating every role the user has been granted.

## Deactivating All Roles

To remove all active roles and revert to only direct user privileges:

```sql
SET ROLE NONE;
```

This is useful when you want to verify what a user can do based purely on their direct grants, without any role influence.

## Restoring Default Roles

`SET ROLE DEFAULT` activates the roles configured as defaults for the user via `SET DEFAULT ROLE`:

```sql
SET ROLE DEFAULT;
```

This resets the session to the user's default role configuration.

## Checking Currently Active Roles

```sql
-- See roles active in the current session
SELECT CURRENT_ROLE();
```

```text
+------------------------------------------+
| CURRENT_ROLE()                           |
+------------------------------------------+
| `app_reader`@`%`,`reporting_viewer`@`%`  |
+------------------------------------------+
```

## Seeing All Assigned Roles

```sql
-- See all roles granted to current user
SHOW GRANTS FOR CURRENT_USER();

-- See roles granted to a specific user
SHOW GRANTS FOR 'alice'@'%';
```

## Practical Example: Least Privilege Session

A user has multiple roles but activates only what is needed for a specific task:

```sql
-- User 'bob' has app_reader, app_writer, app_admin
-- For a read-only audit session, activate only reader
SET ROLE 'app_reader';

-- Verify only reader is active
SELECT CURRENT_ROLE();

-- Now queries work but writes are blocked
SELECT * FROM orders WHERE status = 'pending';  -- works
DELETE FROM orders WHERE id = 1;  -- ERROR 1142: DELETE command denied

-- Later, switch to writer role (this replaces app_reader, not adds to it)
SET ROLE 'app_writer';
UPDATE orders SET status = 'reviewed' WHERE id = 1;  -- works now
```

## Automatic Role Activation on Login

To avoid requiring users to manually run `SET ROLE`, configure automatic activation:

```sql
-- Set default roles that activate on login for a user
SET DEFAULT ROLE 'app_reader' TO 'alice'@'%';

-- Enable server-wide automatic role activation
SET GLOBAL activate_all_roles_on_login = ON;
```

With `activate_all_roles_on_login = ON`, all assigned roles are active from the moment of login without needing `SET ROLE`.

## SET ROLE in Stored Procedures

Note that `SET ROLE` affects the current session. In stored procedures, role changes apply within that procedure context:

```sql
DELIMITER $$
CREATE PROCEDURE read_report()
BEGIN
  SET ROLE 'reporting_reader';
  SELECT * FROM monthly_summary;
  SET ROLE DEFAULT;
END$$
DELIMITER ;
```

## Summary

`SET ROLE` controls which assigned roles are active in the current MySQL session. Use `SET ROLE ALL` to activate everything, `SET ROLE NONE` to clear all role privileges, and specific role names for fine-grained control. Combined with `SET DEFAULT ROLE` and `activate_all_roles_on_login`, you can balance security and convenience in your access control design.
