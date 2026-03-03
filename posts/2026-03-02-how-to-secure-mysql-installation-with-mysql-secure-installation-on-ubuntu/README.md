# How to Secure MySQL Installation with mysql_secure_installation on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, MySQL, Database, Security

Description: Harden a MySQL installation on Ubuntu using mysql_secure_installation and additional manual security steps to protect against common attack vectors.

---

A fresh MySQL installation prioritizes ease of use over security. Anonymous users exist, the test database is accessible to anyone, and root might have no password. The `mysql_secure_installation` script addresses the most obvious security gaps, but proper hardening goes further than running one command.

## Running mysql_secure_installation

```bash
sudo mysql_secure_installation
```

The script walks through several prompts. Here is what each one does and the recommended response:

### VALIDATE PASSWORD Component

```text
VALIDATE PASSWORD COMPONENT can be used to test passwords
and improve security. It checks the strength of password
and allows the users to set only those passwords which are
secure enough.

Would you like to setup VALIDATE PASSWORD component? [Y/n]
```

Answer **Y**. This enforces password strength for new user creation.

```text
There are three levels of password validation policy:
LOW    Length >= 8
MEDIUM Length >= 8, numeric, mixed case, and special characters
STRONG Length >= 8, numeric, mixed case, special characters and dictionary

Please enter 0 = LOW, 1 = MEDIUM and 2 = STRONG: 2
```

Use **2 (STRONG)** for production servers.

### Change Root Password

```text
Change the password for root? [Y/n]
```

If root uses `auth_socket` (the default on Ubuntu), you might answer N and keep socket authentication. If root uses password authentication, set a strong password.

### Remove Anonymous Users

```text
Remove anonymous users? [Y/n]
```

Always answer **Y**. Anonymous users allow anyone to log into MySQL without a password. There is no legitimate reason to keep them.

### Disallow Root Login Remotely

```text
Disallow root login remotely? [Y/n]
```

Always answer **Y**. The root account should never be accessible over the network. Create dedicated remote users if needed.

### Remove Test Database

```text
Remove test database and access to it? [Y/n]
```

Answer **Y**. The test database is accessible to anonymous users by default and serves no production purpose.

### Reload Privilege Tables

```text
Reload privilege tables now? [Y/n]
```

Answer **Y** to apply all changes immediately.

## Verifying the Changes

After running the script, verify the security changes took effect:

```bash
sudo mysql
```

```sql
-- Verify no anonymous users remain
SELECT user, host, plugin, account_locked FROM mysql.user WHERE user = '';
-- Should return empty result set

-- Check root can only login from localhost
SELECT user, host FROM mysql.user WHERE user = 'root';
-- Should only show 'root'@'localhost'

-- Verify test database is gone
SHOW DATABASES;
-- 'test' should not appear
```

## Hardening the MySQL Configuration File

Open `/etc/mysql/mysql.conf.d/mysqld.cnf` and add or modify these security settings:

```ini
[mysqld]
# Bind to localhost only - prevents network access entirely
# Remove or change to your server IP if remote access is needed
bind-address = 127.0.0.1

# Disable LOAD DATA LOCAL INFILE - prevents reading files from client machine
local-infile = 0

# Disable symbolic links to prevent following symlinks to other files
symbolic-links = 0

# Limit maximum allowed packet (reduces some attack surface)
max_allowed_packet = 16M

# Skip DNS lookups for client connections (performance + security)
skip-name-resolve = ON

# Enable binary logging (provides audit trail and enables point-in-time recovery)
log_bin = /var/log/mysql/mysql-bin.log

# Log all connections and queries to a separate file for audit
# Only enable if needed - generates large log files
# general_log = 1
# general_log_file = /var/log/mysql/general.log

# Log slow queries
slow_query_log = 1
slow_query_log_file = /var/log/mysql/slow.log
long_query_time = 2

# Require SSL for connections (see SSL section below)
# require_secure_transport = ON
```

Restart MySQL after changes:

```bash
sudo systemctl restart mysql
sudo mysql -e "SHOW VARIABLES LIKE 'local_infile';"
sudo mysql -e "SHOW VARIABLES LIKE 'skip_name_resolve';"
```

## Setting Up User Permissions Correctly

Create dedicated users with minimal required permissions:

```sql
-- Connect as root
sudo mysql

-- Application user: only access to its own database
CREATE USER 'appuser'@'localhost'
    IDENTIFIED WITH caching_sha2_password BY 'strong-unique-password';
GRANT SELECT, INSERT, UPDATE, DELETE ON appdb.* TO 'appuser'@'localhost';

-- Read-only user for reporting
CREATE USER 'reporter'@'localhost'
    IDENTIFIED WITH caching_sha2_password BY 'another-strong-password';
GRANT SELECT ON appdb.* TO 'reporter'@'localhost';

-- Backup user: needs specific privileges for dumps
CREATE USER 'backup'@'localhost'
    IDENTIFIED WITH caching_sha2_password BY 'backup-password';
GRANT SELECT, SHOW VIEW, RELOAD, LOCK TABLES, EVENT,
    TRIGGER, REPLICATION CLIENT ON *.* TO 'backup'@'localhost';

FLUSH PRIVILEGES;
```

Never grant `GRANT OPTION` to application users unless you understand what it allows (they can grant their permissions to other users).

## Password Validation Plugin Configuration

Configure the password validation component to enforce strong passwords:

```bash
sudo mysql
```

```sql
-- Check current password policy settings
SHOW VARIABLES LIKE 'validate_password%';

-- Set strict password validation
SET GLOBAL validate_password.policy = STRONG;
SET GLOBAL validate_password.length = 12;
SET GLOBAL validate_password.mixed_case_count = 1;
SET GLOBAL validate_password.number_count = 1;
SET GLOBAL validate_password.special_char_count = 1;
```

Make these permanent in `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```ini
[mysqld]
validate_password.policy = STRONG
validate_password.length = 12
```

## Implementing Account Lockout

MySQL 8 supports account locking after failed login attempts:

```sql
-- Lock an account after 5 failed attempts for 1 hour
CREATE USER 'secure_user'@'localhost'
    IDENTIFIED BY 'password'
    FAILED_LOGIN_ATTEMPTS 5
    PASSWORD_LOCK_TIME 1;

-- Apply to existing user
ALTER USER 'appuser'@'localhost'
    FAILED_LOGIN_ATTEMPTS 5
    PASSWORD_LOCK_TIME 1;
```

## Password Expiry

Force users to change passwords periodically:

```sql
-- Require password change every 90 days
ALTER USER 'appuser'@'localhost'
    PASSWORD EXPIRE INTERVAL 90 DAY;

-- Check password expiry status
SELECT user, host, password_expired, password_last_changed, password_lifetime
FROM mysql.user WHERE user = 'appuser';
```

## Enabling MySQL Audit Logging

For compliance environments, enable the audit log plugin:

```bash
sudo mysql
```

```sql
-- Check if audit log plugin is available
SHOW PLUGINS;

-- Install audit log (Enterprise feature, or use community audit plugin)
-- For community edition, consider using general_log for basic auditing
SET GLOBAL general_log = 'ON';
SET GLOBAL general_log_file = '/var/log/mysql/audit.log';
```

## File System Permissions

MySQL's data directory should only be accessible by the mysql user:

```bash
# Check current permissions
ls -la /var/lib/mysql
# Should show: drwx------ 2 mysql mysql

# Check MySQL configuration files
ls -la /etc/mysql/
# Config files should not be world-readable

# Fix permissions if needed
sudo chmod 750 /var/lib/mysql
sudo chmod 640 /etc/mysql/mysql.conf.d/mysqld.cnf
```

## Testing Security After Hardening

```bash
# Try connecting without a password (should fail)
mysql -u root
# ERROR 1045 (28000): Access denied

# Try connecting as anonymous user (should fail)
mysql
# ERROR 1045 (28000): Access denied

# Verify test database is gone
mysql -u root -p -e "SHOW DATABASES;" 2>/dev/null | grep test
# No output expected

# Check local-infile is disabled
mysql -u root -p -e "SHOW VARIABLES LIKE 'local_infile';"
# local_infile | OFF
```

Security hardening is not a one-time activity. Review user accounts regularly, rotate passwords on a schedule, monitor the error log for failed authentication attempts, and apply MySQL security patches promptly when they are released.
