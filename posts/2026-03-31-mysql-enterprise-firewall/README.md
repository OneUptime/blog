# How to Use the MySQL Enterprise Firewall

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, Firewall, Enterprise, Allowlist

Description: Learn how to configure the MySQL Enterprise Firewall to create SQL statement allowlists and block unauthorized or anomalous database queries.

---

The MySQL Enterprise Firewall is a plugin available in MySQL Enterprise Edition that provides application-level query filtering. Unlike network firewalls that operate at the IP/port level, the Enterprise Firewall inspects individual SQL statements and accepts or rejects them based on allowlists defined per user. This protects against SQL injection attacks and unauthorized query patterns even if an attacker has valid credentials.

## How the Enterprise Firewall Works

The firewall operates in four modes:

- **RECORDING** - Learns what queries are legitimate for a user (builds allowlist)
- **PROTECTING** - Enforces the allowlist, blocking queries not in the learned set
- **DETECTING** - Logs queries that would be blocked without actually blocking them
- **OFF** - Disabled for the user

## Installing the Firewall Plugin

Run the installation script included in the MySQL Enterprise Edition `share` directory. This installs the plugins, creates the required tables, and registers the stored procedures:

```bash
mysql -u root -p mysql < /path/to/mysql/share/linux_install_firewall.sql
```

On Windows, use `win_install_firewall.sql` instead.

Or load the plugin via `my.cnf`:

```text
[mysqld]
plugin-load-add=mysql_firewall.so
mysql_firewall_mode=ON
```

## Enabling the Firewall Globally

```sql
SET GLOBAL mysql_firewall_mode = ON;
```

## Recording Mode - Training the Firewall

Put a user into RECORDING mode to capture their legitimate query patterns:

```sql
CALL mysql.sp_set_firewall_mode('app_user@%', 'RECORDING');
```

Now run your application normally. All queries executed by `app_user` are added to the allowlist. After exercising all legitimate application features:

```sql
-- Stop recording and switch to protection mode
CALL mysql.sp_set_firewall_mode('app_user@%', 'PROTECTING');
```

## Viewing the Allowlist

```sql
SELECT USERHOST, RULE
FROM information_schema.MYSQL_FIREWALL_WHITELIST
WHERE USERHOST = 'app_user@%'
ORDER BY RULE;
```

The allowlist contains normalized query patterns:

```text
+-------------+-----------------------------------------------+
| USERHOST    | RULE                                          |
+-------------+-----------------------------------------------+
| app_user@%  | SELECT `id` , `email` FROM `users` WHERE `id` = ?  |
| app_user@%  | INSERT INTO `orders` ( `user_id` , `amount` ) VALUES (?) |
+-------------+-----------------------------------------------+
```

## Adding Rules Manually

```sql
INSERT INTO mysql.firewall_whitelist (USERHOST, RULE)
VALUES ('app_user@%', 'SELECT ? FROM `reports`');

CALL mysql.sp_reload_firewall_rules('app_user@%');
```

## Testing the Firewall in DETECTING Mode

Before switching to PROTECTING, use DETECTING mode to log blocked queries without actually blocking them:

```sql
CALL mysql.sp_set_firewall_mode('app_user@%', 'DETECTING');
```

Detected queries that would be blocked are written to the error log:

```text
[Warning] Plugin MYSQL_FIREWALL reported: 'ACCESS DENIED for app_user@%.'
```

## Resetting the Allowlist

```sql
-- Clear all rules for a user (start fresh)
CALL mysql.sp_set_firewall_mode('app_user@%', 'RESET');
```

## Disabling the Firewall for a User

```sql
CALL mysql.sp_set_firewall_mode('app_user@%', 'OFF');
```

## Monitoring Blocked Queries

Check the firewall status variables to see how many queries have been accepted or denied:

```sql
SHOW GLOBAL STATUS LIKE 'Firewall%';
```

```text
+----------------------------+-------+
| Variable_name              | Value |
+----------------------------+-------+
| Firewall_access_denied     | 3     |
| Firewall_access_granted    | 218   |
| Firewall_cached_entries    | 5     |
+----------------------------+-------+
```

Individual blocked queries are logged to the MySQL error log. In DETECTING mode, suspected violations are also written there for review.

## Summary

The MySQL Enterprise Firewall protects databases by maintaining per-user SQL allowlists. Start in RECORDING mode during application testing, then switch to PROTECTING mode for production. Use DETECTING mode for a non-blocking transition period. The firewall normalizes queries by replacing literals with `?` wildcards, making the allowlist robust against parameter variation while still blocking genuinely anomalous query patterns.
