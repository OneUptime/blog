# What Is the mysql_secure_installation Script

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, Installation, Hardening, Administration

Description: The mysql_secure_installation script is a post-installation utility that hardens a new MySQL server by setting root passwords and removing insecure defaults.

---

## Overview

After installing MySQL on a new server, the default configuration often leaves several security vulnerabilities open. The `mysql_secure_installation` script is a command-line utility provided by MySQL to address these issues in a guided, interactive way.

Running this script is considered a best practice for any production MySQL deployment.

## What the Script Does

When you run `mysql_secure_installation`, it walks you through several security-related configuration steps:

1. Setting or validating the root user password
2. Enabling the password validation component (optional)
3. Removing anonymous user accounts
4. Disabling remote root login
5. Removing the test database
6. Reloading privilege tables so changes take effect immediately

## Running the Script

```bash
sudo mysql_secure_installation
```

On systems using the `auth_socket` plugin (common on Ubuntu), you may need to first log in as root:

```bash
sudo mysql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'YourStrongPassword!';
FLUSH PRIVILEGES;
EXIT;
sudo mysql_secure_installation
```

## Interactive Prompts Explained

The script presents a series of prompts. Here is a typical session:

```text
Securing the MySQL server deployment.

Enter password for user root:

VALIDATE PASSWORD COMPONENT can be used to test passwords...
Press y|Y for Yes, any other key for No: Y

There are three levels of password validation policy:
LOW    Length >= 8
MEDIUM Length >= 8, numeric, mixed case, and special characters
STRONG Length >= 8, numeric, mixed case, special characters and dictionary file
Please enter 0 = LOW, 1 = MEDIUM and 2 = STRONG: 2

Remove anonymous users? (Press y|Y for Yes): Y
Disallow root login remotely? (Press y|Y for Yes): Y
Remove test database and access to it? (Press y|Y for Yes): Y
Reload privilege tables now? (Press y|Y for Yes): Y
```

## Non-Interactive Mode

For automated deployments, you can pass options directly to avoid interactive prompts:

```bash
sudo mysql_secure_installation \
  --password='YourStrongPassword!' \
  --use-default
```

Or using a here-document approach for scripting:

```bash
sudo mysql_secure_installation <<EOF
Y
2
YourStrongPassword!
YourStrongPassword!
Y
Y
Y
Y
EOF
```

## What Gets Changed Under the Hood

After running the script, you can verify the changes in MySQL:

```sql
-- Check that anonymous users are gone
SELECT User, Host FROM mysql.user WHERE User = '';

-- Confirm root can only login locally
SELECT User, Host FROM mysql.user WHERE User = 'root';

-- Verify the test database is removed
SHOW DATABASES LIKE 'test';
```

Expected output after hardening:

```text
Empty set (0.00 sec)  -- no anonymous users
+------+-----------+
| User | Host      |
+------+-----------+
| root | localhost |
+------+-----------+
Empty set (0.00 sec)  -- no test database
```

## Password Validation Component

When you enable the password validation component, MySQL enforces password policies for all new user accounts:

```sql
-- Check current password policy settings
SHOW VARIABLES LIKE 'validate_password%';
```

```text
+--------------------------------------+--------+
| Variable_name                        | Value  |
+--------------------------------------+--------+
| validate_password.check_user_name   | ON     |
| validate_password.length            | 8      |
| validate_password.mixed_case_count  | 1      |
| validate_password.number_count      | 1      |
| validate_password.policy            | MEDIUM |
| validate_password.special_char_count| 1      |
+--------------------------------------+--------+
```

You can adjust the policy after the fact:

```sql
SET GLOBAL validate_password.policy = STRONG;
SET GLOBAL validate_password.length = 12;
```

## Post-Script Checklist

After running the script, consider these additional hardening steps:

```sql
-- Create application-specific users instead of using root
CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'StrongAppPassword1!';
GRANT SELECT, INSERT, UPDATE, DELETE ON myapp.* TO 'appuser'@'localhost';

-- Verify the user has only the intended privileges
SHOW GRANTS FOR 'appuser'@'localhost';
FLUSH PRIVILEGES;
```

## Summary

The `mysql_secure_installation` script is an essential first step after any MySQL installation. It removes default insecure configurations like anonymous users, the test database, and remote root access. Running this script before exposing your MySQL server to any application or network traffic significantly reduces your attack surface.
