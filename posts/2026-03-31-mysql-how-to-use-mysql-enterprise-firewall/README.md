# How to Use MySQL Enterprise Firewall

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, Enterprise, Firewall, Query Filtering

Description: Learn how to configure and use MySQL Enterprise Firewall to protect your database from SQL injection and unauthorized query patterns.

---

## What Is MySQL Enterprise Firewall

MySQL Enterprise Firewall is a security plugin available in MySQL Enterprise Edition that monitors, alerts, and blocks unauthorized database activity. It works by learning the allowlist of legitimate SQL statements and rejecting any queries that deviate from those patterns.

This makes it a powerful tool against SQL injection attacks, since injected SQL will not match any pre-approved pattern.

## Prerequisites

- MySQL Enterprise Edition 8.0 or later
- `SUPER` or `FIREWALL_ADMIN` privilege
- The Enterprise Firewall plugin must be installed

## Installing the Plugin

To install MySQL Enterprise Firewall, run the provided SQL script that ships with the Enterprise distribution:

```bash
mysql -u root -p < /usr/share/mysql/linux_install_firewall.sql
```

You can verify the plugin is active:

```sql
SHOW PLUGINS WHERE Name LIKE '%firewall%';
```

Expected output includes `MYSQL_FIREWALL` and `MYSQL_FIREWALL_USERS` plugins with status `ACTIVE`.

## Operating Modes

The firewall supports four modes per user:

| Mode | Behavior |
|------|----------|
| `OFF` | Firewall disabled for this user |
| `RECORDING` | Learns and records approved SQL patterns |
| `PROTECTING` | Blocks queries not in the allowlist |
| `DETECTING` | Logs violations but does not block |

## Step 1 - Enable Recording Mode

Put a user into recording mode to capture approved query patterns:

```sql
CALL mysql.sp_set_firewall_mode('app_user@%', 'RECORDING');
```

Then run your application through all its normal operations. The firewall records each unique normalized SQL pattern.

## Step 2 - Review Recorded Rules

After recording, inspect what was captured:

```sql
SELECT USERHOST, RULE
FROM mysql.firewall_whitelist
WHERE USERHOST = 'app_user@%'
ORDER BY RULE;
```

Each row shows a normalized SQL template. For example:

```text
app_user@%  | SELECT * FROM orders WHERE id = ?
app_user@%  | INSERT INTO logs (message, created_at) VALUES (?, ?)
```

## Step 3 - Enable Protection Mode

Once recording is complete, switch the user to protection mode:

```sql
CALL mysql.sp_set_firewall_mode('app_user@%', 'PROTECTING');
```

Any SQL that does not match a recorded pattern will be blocked with an error:

```text
ERROR 1045 (28000): Statement was blocked by MySQL Enterprise Firewall
```

## Step 4 - Test the Firewall

Try sending a query that was not in the recording phase:

```sql
-- This would be blocked if not in the recorded allowlist
SELECT * FROM users WHERE 1=1;
```

A SQL injection attempt like the following would also be rejected:

```sql
SELECT * FROM orders WHERE id = 1 OR 1=1;
```

## Adding Rules Manually

You can manually insert approved query patterns without recording:

```sql
INSERT INTO mysql.firewall_whitelist (USERHOST, RULE)
VALUES ('app_user@%', 'SELECT * FROM products WHERE category = ?');

CALL mysql.sp_reload_firewall_rules('app_user@%');
```

Always reload the rules after making manual changes.

## Detecting Mode - Audit Without Blocking

For initial deployment, use `DETECTING` mode to log violations without blocking traffic:

```sql
CALL mysql.sp_set_firewall_mode('app_user@%', 'DETECTING');
```

Violations are logged to the MySQL error log. Review them to ensure legitimate traffic is not blocked before enabling `PROTECTING` mode.

## Resetting Rules

To clear all recorded rules for a user:

```sql
CALL mysql.sp_set_firewall_mode('app_user@%', 'RESET');
```

This removes all whitelist entries and sets the mode to `OFF`.

## Monitoring Firewall Activity

Check overall firewall status using status variables:

```sql
SHOW GLOBAL STATUS LIKE 'Firewall%';
```

Key variables:

| Variable | Description |
|----------|-------------|
| `Firewall_access_denied` | Count of blocked queries |
| `Firewall_access_granted` | Count of allowed queries |
| `Firewall_cached_entries` | Number of cached rules |

## Managing Multiple Users

You can configure the firewall separately for each database user:

```sql
-- Set different modes per user
CALL mysql.sp_set_firewall_mode('readonly_user@%', 'PROTECTING');
CALL mysql.sp_set_firewall_mode('admin_user@%', 'OFF');
CALL mysql.sp_set_firewall_mode('etl_user@%', 'DETECTING');
```

## Best Practices

- Always test in `DETECTING` mode before enabling `PROTECTING` mode
- Run through the full application test suite during the recording phase to capture all legitimate query patterns
- Keep rules for privileged users in `OFF` mode and protect application users aggressively
- Periodically audit the whitelist to remove stale patterns after application refactoring

## Summary

MySQL Enterprise Firewall protects your database by learning approved SQL patterns and blocking anything that does not match. By moving through recording, detecting, and protecting modes in sequence, you can safely deploy query-level security without disrupting legitimate application traffic. Combined with role-based access control and audit logging, it provides a strong layer of database security.
