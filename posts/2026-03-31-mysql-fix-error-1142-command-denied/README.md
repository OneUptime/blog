# How to Fix ERROR 1142 Command Denied to User in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Error, Privilege, Security, Troubleshooting

Description: Learn how to fix MySQL ERROR 1142 command denied by identifying missing privileges and granting the correct permissions to the user.

---

## What Is ERROR 1142?

```text
ERROR 1142 (42000): SELECT command denied to user 'appuser'@'localhost' for table 'orders'
```

This error means the connected user does not have the required privilege to perform the SQL command on the specified table or database. The privilege mentioned in the message (SELECT, INSERT, UPDATE, DELETE, etc.) is the one that is missing.

## Step 1: Check the User's Current Privileges

```sql
SHOW GRANTS FOR 'appuser'@'localhost';
```

If you do not know the exact host, use:

```sql
SELECT user, host FROM mysql.user WHERE user = 'appuser';
```

Then check grants for each host combination.

## Step 2: Identify the Missing Privilege

The error message tells you exactly which command was denied. Match it to the corresponding MySQL privilege:

| Command Denied | Required Privilege |
|---|---|
| SELECT | SELECT |
| INSERT | INSERT |
| UPDATE | UPDATE |
| DELETE | DELETE |
| CREATE | CREATE |
| DROP | DROP |
| ALTER | ALTER |
| EXECUTE | EXECUTE |
| CREATE ROUTINE | CREATE ROUTINE |
| SHOW DATABASES | SHOW DATABASES |

## Step 3: Grant the Missing Privilege

Grant a specific privilege on a specific table:

```sql
GRANT SELECT ON mydb.orders TO 'appuser'@'localhost';
FLUSH PRIVILEGES;
```

Grant multiple privileges on an entire database:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'appuser'@'localhost';
FLUSH PRIVILEGES;
```

Grant all privileges on a database:

```sql
GRANT ALL PRIVILEGES ON mydb.* TO 'appuser'@'localhost';
FLUSH PRIVILEGES;
```

## Step 4: Re-verify the Grants

```sql
SHOW GRANTS FOR 'appuser'@'localhost';
```

Expected output:

```text
GRANT SELECT, INSERT, UPDATE, DELETE ON `mydb`.* TO `appuser`@`localhost`
```

## Common Scenarios

### User Can Connect But Cannot Query

The user has the `USAGE` privilege (login only) but no data privileges:

```sql
-- Current state
GRANT USAGE ON *.* TO 'appuser'@'localhost';

-- Fix: Add data access
GRANT SELECT, INSERT, UPDATE, DELETE ON mydb.* TO 'appuser'@'localhost';
FLUSH PRIVILEGES;
```

### User Has the Wrong Host

If the user was created as `'appuser'@'localhost'` but is connecting from `'appuser'@'192.168.1.50'`, grants on `localhost` do not apply:

```sql
CREATE USER 'appuser'@'%' IDENTIFIED BY 'password';
GRANT SELECT ON mydb.* TO 'appuser'@'%';
FLUSH PRIVILEGES;
```

### Stored Procedure or View Ownership

If a view or stored procedure was created by a user with higher privileges, the caller may need `EXECUTE` or `SELECT` on the underlying objects:

```sql
GRANT EXECUTE ON PROCEDURE mydb.my_proc TO 'appuser'@'localhost';
FLUSH PRIVILEGES;
```

## Checking Effective Privileges for Current User

```sql
SHOW GRANTS;
-- or
SHOW GRANTS FOR CURRENT_USER();
```

## Summary

ERROR 1142 is a privilege error. Resolve it by running `SHOW GRANTS FOR 'user'@'host'` to see what is missing, then use `GRANT` to add the required privilege on the specific table or database. Always follow the principle of least privilege and grant only what the user needs. Note that `GRANT` statements reload the privilege tables automatically, so `FLUSH PRIVILEGES` is only strictly required after direct modifications to the grant tables (such as `INSERT` or `UPDATE` on `mysql.user`).
