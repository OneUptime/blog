# MySQL User Management Cheat Sheet

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, User Management, Security, Cheat Sheet

Description: Quick reference for MySQL user management including CREATE USER, GRANT, REVOKE, ALTER USER, roles, and privilege inspection commands with practical examples.

---

## Creating Users

```sql
-- Basic user (connects from any host)
CREATE USER 'alice'@'%' IDENTIFIED BY 'strong_password';

-- Restrict to localhost
CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'pass';

-- Specific host
CREATE USER 'dbadmin'@'10.0.1.%' IDENTIFIED BY 'pass';

-- With password expiry
CREATE USER 'temp'@'%' IDENTIFIED BY 'pass' PASSWORD EXPIRE INTERVAL 90 DAY;
```

## Viewing Users

```sql
SELECT user, host, account_locked, password_expired
FROM mysql.user;

-- Current user
SELECT CURRENT_USER();
```

## Granting Privileges

```sql
-- All privileges on a database
GRANT ALL PRIVILEGES ON mydb.* TO 'alice'@'%';

-- Read-only access
GRANT SELECT ON mydb.* TO 'reader'@'%';

-- Specific table privileges
GRANT SELECT, INSERT, UPDATE ON mydb.orders TO 'appuser'@'%';

-- Grant with option to pass privileges to others
GRANT SELECT ON mydb.* TO 'alice'@'%' WITH GRANT OPTION;

-- Only needed if you modified grant tables directly (INSERT/UPDATE on mysql.user)
FLUSH PRIVILEGES;
```

## Privilege Types Reference

```text
ALL PRIVILEGES   - everything except GRANT OPTION
SELECT           - read rows
INSERT           - add rows
UPDATE           - modify rows
DELETE           - remove rows
CREATE           - create tables/databases
DROP             - drop tables/databases
ALTER            - alter table structure
INDEX            - create/drop indexes
EXECUTE          - run stored procedures
REPLICATION SLAVE - connect for replication
SUPER            - administrative operations
```

## Revoking Privileges

```sql
REVOKE INSERT, UPDATE ON mydb.orders FROM 'appuser'@'%';
REVOKE ALL PRIVILEGES ON mydb.* FROM 'alice'@'%';
REVOKE GRANT OPTION ON *.* FROM 'alice'@'%';
```

## Inspecting Privileges

```sql
SHOW GRANTS FOR 'alice'@'%';
SHOW GRANTS FOR CURRENT_USER();

-- Via information_schema
SELECT * FROM information_schema.USER_PRIVILEGES WHERE grantee LIKE '%alice%';
```

## Roles (MySQL 8.0+)

```sql
-- Create a role
CREATE ROLE 'app_read', 'app_write';

-- Grant privileges to the role
GRANT SELECT ON mydb.* TO 'app_read';
GRANT INSERT, UPDATE, DELETE ON mydb.* TO 'app_write';

-- Assign role to user
GRANT 'app_read' TO 'alice'@'%';
GRANT 'app_read', 'app_write' TO 'bob'@'%';

-- Activate role for the session
SET ROLE 'app_read';
SET DEFAULT ROLE 'app_read' TO 'alice'@'%';

-- View active roles
SELECT CURRENT_ROLE();
```

## Changing Passwords

```sql
-- Change own password
ALTER USER CURRENT_USER() IDENTIFIED BY 'new_pass';

-- Change another user's password
ALTER USER 'alice'@'%' IDENTIFIED BY 'new_pass';

-- Expire a user's password (forces reset on next login)
ALTER USER 'alice'@'%' PASSWORD EXPIRE;
```

## Locking and Unlocking Accounts

```sql
ALTER USER 'alice'@'%' ACCOUNT LOCK;
ALTER USER 'alice'@'%' ACCOUNT UNLOCK;
```

## Dropping Users

```sql
DROP USER 'alice'@'%';
DROP USER IF EXISTS 'temp'@'%';
```

## Summary

MySQL user management centers on CREATE USER, GRANT, and REVOKE. Always use least-privilege grants - give applications only SELECT/INSERT/UPDATE/DELETE on specific schemas. Roles (MySQL 8.0+) make permission management scalable by grouping privileges into reusable templates. Monitor grants regularly with SHOW GRANTS and lock unused accounts instead of deleting them.
