# How to Grant All Privileges to a User in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, User, Privilege, Security, Database Administration

Description: Learn how to use GRANT ALL PRIVILEGES in MySQL to give a user full access to a database or globally, and understand what 'all privileges' includes.

---

## What ALL PRIVILEGES Includes

`ALL PRIVILEGES` is shorthand for granting every applicable privilege at the chosen scope. At the database level it includes SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, REFERENCES, INDEX, ALTER, CREATE TEMPORARY TABLES, LOCK TABLES, EXECUTE, CREATE VIEW, SHOW VIEW, CREATE ROUTINE, ALTER ROUTINE, EVENT, and TRIGGER.

## Granting All Privileges on a Specific Database

The most common production pattern is granting full access to a single database:

```sql
GRANT ALL PRIVILEGES ON mydb.* TO 'alice'@'localhost';
```

The `mydb.*` notation means all tables (current and future) within the `mydb` database. Alice can create tables, alter them, insert, delete, and manage views and procedures - but only within `mydb`.

## Granting All Privileges Globally

A global `ALL PRIVILEGES` grant is equivalent to making the user a super-user. Use with extreme caution:

```sql
GRANT ALL PRIVILEGES ON *.* TO 'admin_user'@'localhost';
```

`*.*` means all databases, all tables.

## Granting WITH GRANT OPTION

Adding `WITH GRANT OPTION` allows the user to grant the same privileges to others:

```sql
GRANT ALL PRIVILEGES ON mydb.* TO 'alice'@'localhost' WITH GRANT OPTION;
```

Only grant this to trusted administrators, as it allows privilege escalation.

## Applying the Grant

In MySQL 8.0, `GRANT` statements take effect immediately for new connections. You do not need to run `FLUSH PRIVILEGES` when using the `GRANT` statement directly. `FLUSH PRIVILEGES` is only required when you manually modify the grant tables (`mysql.user`, `mysql.db`, etc.):

```sql
-- Not needed after GRANT statements, but harmless
FLUSH PRIVILEGES;
```

## Verifying the Grant

```sql
SHOW GRANTS FOR 'alice'@'localhost';
```

Expected output:

```text
+----------------------------------------------------------+
| Grants for alice@localhost                               |
+----------------------------------------------------------+
| GRANT USAGE ON *.* TO `alice`@`localhost`                |
| GRANT ALL PRIVILEGES ON `mydb`.* TO `alice`@`localhost`  |
+----------------------------------------------------------+
```

## Revoking All Privileges

To remove all privileges on a database:

```sql
REVOKE ALL PRIVILEGES ON mydb.* FROM 'alice'@'localhost';
```

To remove the grant option separately:

```sql
REVOKE GRANT OPTION ON mydb.* FROM 'alice'@'localhost';
```

## Principle of Least Privilege

Avoid granting `ALL PRIVILEGES` globally in production. Instead, grant only the privileges an account actually needs:

```sql
-- Application user: read and write only
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'app_user'@'%';

-- Migration user: schema changes allowed
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, INDEX ON mydb.* TO 'migration_user'@'localhost';
```

## Summary

`GRANT ALL PRIVILEGES ON db.* TO 'user'@'host'` gives a user complete control over the specified database. Use database-scoped grants rather than global `*.*` grants to limit blast radius. Add `WITH GRANT OPTION` only for administrative users who need to delegate privileges, and always verify grants with `SHOW GRANTS`.
