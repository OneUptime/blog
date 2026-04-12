# How to Use USER() and CURRENT_USER() Functions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, USER Function, CURRENT_USER, Security, Information Functions

Description: Learn the difference between USER() and CURRENT_USER() in MySQL and how to use them for auditing, access control, and permission verification.

---

## What Are USER() and CURRENT_USER()

MySQL provides two related functions for identifying the connected user:

- `USER()` - returns the username and hostname that the client provided when connecting
- `CURRENT_USER()` - returns the MySQL account that was actually matched and authenticated by the server
- `SESSION_USER()` - synonym for `USER()`
- `SYSTEM_USER()` - synonym for `USER()`

The difference matters when using anonymous accounts or wildcard host patterns.

## Basic Usage

```sql
SELECT USER();
-- Output: 'alice@192.168.1.10'

SELECT CURRENT_USER();
-- Output: 'alice@%'

SELECT SESSION_USER();
-- Output: 'alice@192.168.1.10'
```

In most cases they return the same value, but they differ when the user account uses a wildcard host (`%`) or anonymous account:

- `USER()` shows the actual client host
- `CURRENT_USER()` shows the matched grant row in `mysql.user`

## Viewing Connection Details

```sql
SELECT
  USER() AS client_user,
  CURRENT_USER() AS matched_account,
  DATABASE() AS current_db,
  CONNECTION_ID() AS connection_id;
```

## Using in Audit Triggers

```sql
DELIMITER //
CREATE TRIGGER audit_employee_update
AFTER UPDATE ON employees
FOR EACH ROW
BEGIN
  INSERT INTO audit_log (
    table_name,
    record_id,
    action,
    performed_by,
    performed_at
  ) VALUES (
    'employees',
    NEW.id,
    'UPDATE',
    USER(),
    NOW()
  );
END //
DELIMITER ;
```

## Using CURRENT_USER() for Permission Checks

```sql
-- Check if the current user has SUPER privilege
SELECT user, super_priv
FROM mysql.user
WHERE CONCAT(user, '@', host) = CURRENT_USER();
```

Check grants for the current user:

```sql
SHOW GRANTS FOR CURRENT_USER();
-- or
SHOW GRANTS;
```

## Filtering Data by Current User

Useful for row-level security patterns:

```sql
-- Assume a user_name column in orders table
SELECT * FROM orders
WHERE created_by = CURRENT_USER();
```

## Using in Stored Procedures

```sql
DELIMITER //
CREATE PROCEDURE log_action(IN p_action VARCHAR(100))
BEGIN
  INSERT INTO activity_log (`user`, action, logged_at)
  VALUES (USER(), p_action, NOW());
END //
DELIMITER ;

CALL log_action('export_report');
```

## Comparing USER() and CURRENT_USER()

```sql
-- If alice connects from 192.168.1.10 and matches the 'alice'@'%' grant:
SELECT USER();          -- alice@192.168.1.10
SELECT CURRENT_USER();  -- alice@%

-- For local root connection:
SELECT USER();          -- root@localhost
SELECT CURRENT_USER();  -- root@localhost
```

## Practical Use Case - Application-Level User Context

Some applications store the application user in a connection attribute and use `USER()` for logging:

```sql
-- In a multi-tenant app, log which DB user ran the query
SELECT
  NOW() AS query_time,
  USER() AS db_user,
  'SELECT order summary' AS operation;
```

## Checking User in Views

```sql
CREATE VIEW my_orders AS
SELECT * FROM orders
WHERE owner = CURRENT_USER();
```

## Summary

`USER()` returns the exact client-provided credentials (user@actual-host), while `CURRENT_USER()` returns the MySQL account that was matched during authentication (user@matched-host-pattern). Use `USER()` for audit logs to record the exact source of a change, and `CURRENT_USER()` for permission checks against the `mysql.user` grant table. Both are indispensable for implementing audit trails and access control in MySQL applications.
