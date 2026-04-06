# How to Secure a Fresh MySQL Installation with mysql_secure_installation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, mysql_secure_installation, Database Administration, Linux

Description: Run mysql_secure_installation after installing MySQL to set the root password, remove anonymous users, and disable remote root login for a hardened setup.

---

## Why Run mysql_secure_installation

A fresh MySQL installation comes with several default settings that are convenient for development but insecure for production use. These include:

- An empty or insecure root password
- Anonymous user accounts that allow anyone to connect without a username
- A test database accessible to anonymous users
- Remote root login enabled

The `mysql_secure_installation` script walks you through disabling or removing all of these risks in a single interactive session.

## Prerequisites

You must have MySQL installed and the MySQL server running before you run the script:

```bash
sudo systemctl start mysqld
sudo systemctl status mysqld
```

## Running mysql_secure_installation

Run the script as the system root or using sudo:

```bash
sudo mysql_secure_installation
```

The script will prompt you through several steps.

## Step 1 - Enter the Current Root Password

On a fresh installation, MySQL may generate a temporary root password in the error log:

```bash
sudo grep 'temporary password' /var/log/mysqld.log
```

Enter that temporary password when prompted. On some distributions (like Ubuntu), the root user uses `auth_socket` authentication and you can press Enter with no password.

```text
Enter password for user root:
```

## Step 2 - Set Up the Validate Password Component

The script may ask if you want to enable the validate password component, which enforces password strength:

```text
VALIDATE PASSWORD COMPONENT can be used to test passwords
and improve security. It checks the strength of password
and allows the users to set only those passwords which are
secure enough. Would you like to setup VALIDATE PASSWORD component?

Press y|Y for Yes, any other key for No: y
```

If you enable it, choose a policy level:

```text
There are three levels of password validation policy:

LOW    Length >= 8
MEDIUM Length >= 8, numeric, mixed case, and special characters
STRONG Length >= 8, numeric, mixed case, special characters and dictionary file

Please enter 0 = LOW, 1 = MEDIUM and 2 = STRONG: 1
```

## Step 3 - Set the Root Password

Enter and confirm a new strong root password:

```text
New password: ************
Re-enter new password: ************

Estimated strength of the password: 100
Do you wish to continue with the password provided? y
```

## Step 4 - Remove Anonymous Users

Anonymous users allow anyone to log in without a username. Remove them:

```text
By default, a MySQL installation has an anonymous user,
allowing anyone to log into MySQL without having to have
a user account created for them. This is intended only for
testing, and to make the installation go a bit smoother.
You should remove them before moving into a production
environment.

Remove anonymous users? (Press y|Y for Yes): y
```

## Step 5 - Disallow Remote Root Login

Root should only be allowed to connect from localhost. Disabling remote root login forces administrators to either connect locally or use a non-root account for remote access:

```text
Normally, root should only be allowed to connect from
'localhost'. This ensures that someone cannot guess at
the root password from the network.

Disallow root login remotely? (Press y|Y for Yes): y
```

## Step 6 - Remove the Test Database

The default test database is accessible to anonymous users and should be removed:

```text
By default, MySQL comes with a database named 'test' that
anyone can access. This is also intended only for testing,
and should be removed before moving into a production
environment.

Remove test database and access to it? (Press y|Y for Yes): y
```

## Step 7 - Reload Privilege Tables

Apply all changes immediately by reloading the grant tables:

```text
Reloading the privilege tables will ensure that all changes
made so far will take effect immediately.

Reload privilege tables now? (Press y|Y for Yes): y
```

You will see a success message:

```text
All done!
```

## Verifying the Changes

After running the script, verify the anonymous users are gone:

```sql
SELECT user, host FROM mysql.user;
```

Expected output should only show legitimate users:

```text
+------------------+-----------+
| user             | host      |
+------------------+-----------+
| mysql.infoschema | localhost |
| mysql.session    | localhost |
| mysql.sys        | localhost |
| root             | localhost |
+------------------+-----------+
```

Verify remote root login is disabled:

```sql
SELECT user, host FROM mysql.user WHERE user = 'root';
```

The root user should only have `localhost` as the host, not `%`.

## Running Non-Interactively

You can also run parts of the hardening manually via SQL after connecting as root:

```sql
-- Remove anonymous users
DROP USER IF EXISTS ''@'localhost';
DROP USER IF EXISTS ''@'::1';

-- Disallow remote root login
DROP USER IF EXISTS 'root'@'%';

-- Remove test database
DROP DATABASE IF EXISTS test;
```

## Summary

Running `mysql_secure_installation` after a fresh MySQL installation applies a series of security hardening steps including setting a strong root password, removing anonymous users, disabling remote root login, and deleting the test database. These steps take only a few minutes and significantly reduce the attack surface of your MySQL server before it goes into production.
