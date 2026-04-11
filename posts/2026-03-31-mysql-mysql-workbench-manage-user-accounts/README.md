# How to Manage User Accounts in MySQL Workbench

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Workbench, User, Security, Privilege

Description: Learn how to create, modify, and delete MySQL user accounts and manage privileges using MySQL Workbench's Users and Privileges interface.

---

## Introduction

MySQL Workbench provides a graphical Users and Privileges panel that simplifies user account management without requiring manual SQL. You can create accounts, set passwords, assign administrative roles, configure schema-level privileges, and revoke access - all from a single interface. This is especially useful for DBAs managing multiple user accounts across environments.

## Opening Users and Privileges

Connect to a MySQL server in Workbench, then navigate to:

```text
Server > Users and Privileges
```

The panel shows a list of all existing user accounts on the left, with detail tabs on the right.

## Creating a New User Account

Click **Add Account** at the bottom left. Fill in the account details:

```text
Login Name:    developer
Limit to Host: %
Password:      ************
Confirm:       ************
```

- **Login Name** - the MySQL username
- **Limit to Host** - `%` allows connections from any host; `localhost` restricts to local connections
- **Password** - click **Store in Vault** to save the password in the OS keychain

Click **Apply** to execute:

```sql
CREATE USER 'developer'@'%' IDENTIFIED BY 'SecurePass123!';
```

## Setting Administrative Roles

The **Administrative Roles** tab provides shortcut role assignments:

```text
[ ] DBA          - Full administrative privileges
[ ] MaintenanceAdmin - Process, Reload, Shutdown
[x] DBManager    - All schemas, no GRANT
[ ] BackupAdmin  - SELECT, RELOAD, LOCK TABLES, SHOW DATABASES
[ ] ReadOnly     - SELECT on all schemas
```

Selecting **DBManager** grants:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP,
      REFERENCES, INDEX, ALTER, CREATE TEMPORARY TABLES,
      LOCK TABLES, EXECUTE, CREATE VIEW, SHOW VIEW,
      CREATE ROUTINE, ALTER ROUTINE, EVENT, TRIGGER
      ON *.* TO 'developer'@'%';
```

## Schema Privileges

The **Schema Privileges** tab provides fine-grained per-schema control:

1. Click **Add Entry**
2. Select the target schema:

```text
Selected Schema: ecommerce
```

3. Check the desired privileges:

```text
[x] SELECT
[x] INSERT
[x] UPDATE
[x] DELETE
[ ] CREATE
[ ] DROP
[ ] ALTER
```

4. Click **Apply** to execute:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON `ecommerce`.* TO 'developer'@'%';
```

## Changing a User's Password

Select the user from the list, navigate to the **Login** tab, enter a new password, and click **Apply**:

```sql
ALTER USER 'developer'@'%' IDENTIFIED BY 'NewSecurePass456!';
```

## Revoking Privileges

In the Schema Privileges tab, select a schema entry and click **Delete Entry** to revoke all privileges for that schema:

```sql
REVOKE ALL PRIVILEGES ON `ecommerce`.* FROM 'developer'@'%';
```

## Deleting a User Account

Select the user in the left panel and click **Delete**. Confirm the dialog. This executes:

```sql
DROP USER 'developer'@'%';
```

## Viewing Current Privileges via SQL

To verify the effective privileges for a user:

```sql
SHOW GRANTS FOR 'developer'@'%';
```

Output:

```text
GRANTS FOR developer@%
GRANT USAGE ON *.* TO `developer`@`%`
GRANT SELECT, INSERT, UPDATE, DELETE ON `ecommerce`.* TO `developer`@`%`
```

## Refreshing the User List

After making changes directly via SQL (outside Workbench), click **Refresh** to reload the user list from the server.

## Summary

MySQL Workbench's Users and Privileges panel provides a complete graphical interface for MySQL account management. Use it to create accounts with host restrictions, assign administrative roles, set fine-grained schema privileges, change passwords, and revoke access. For bulk user management or automation, prefer SQL scripts or MySQL Shell, but Workbench is ideal for interactive, one-off account operations.
