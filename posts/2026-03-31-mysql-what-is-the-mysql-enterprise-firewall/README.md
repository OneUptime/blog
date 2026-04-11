# What Is the MySQL Enterprise Firewall

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, Firewall, Enterprise, Plugin

Description: The MySQL Enterprise Firewall is a plugin that blocks SQL injection and enforces query allowlists by learning and validating query patterns at runtime.

---

## Overview

The MySQL Enterprise Firewall is a security plugin included in MySQL Enterprise Edition. Unlike network-level firewalls that restrict which hosts can connect to MySQL, the Enterprise Firewall operates inside the database engine and analyzes the SQL statements themselves. It protects against SQL injection attacks by maintaining per-account allowlists of normalized query patterns and blocking any statement that does not match a known-safe pattern.

## How It Works

The firewall operates in several modes, the most important being RECORDING, PROTECTING, and DETECTING.

In RECORDING mode, the firewall records every query a given account executes and builds a digest of normalized patterns. For example, the statements `SELECT * FROM orders WHERE id = 1` and `SELECT * FROM orders WHERE id = 99` both normalize to `SELECT * FROM orders WHERE id = ?` and are stored as a single pattern.

In PROTECTING mode, any incoming statement is normalized and checked against the allowlist. If no match is found, the statement is blocked and an error is returned to the client.

In DETECTING mode, non-matching statements are allowed through but logged to the error log, which is useful for auditing before switching to full enforcement.

## Installation

```sql
INSTALL PLUGIN MYSQL_FIREWALL SONAME 'firewall.so';
INSTALL PLUGIN MYSQL_FIREWALL_USERS SONAME 'firewall.so';
INSTALL PLUGIN MYSQL_FIREWALL_WHITELIST SONAME 'firewall.so';
```

Verify the plugins are active:

```sql
SELECT PLUGIN_NAME, PLUGIN_STATUS
FROM INFORMATION_SCHEMA.PLUGINS
WHERE PLUGIN_NAME LIKE 'MYSQL_FIREWALL%';
```

## Configuring Recording Mode

Enable recording for a specific user account:

```sql
CALL mysql.sp_set_firewall_mode('appuser@%', 'RECORDING');
```

Run your application through its normal flows - execute all expected queries. Then switch to PROTECTING mode:

```sql
CALL mysql.sp_set_firewall_mode('appuser@%', 'PROTECTING');
```

## Reviewing Recorded Patterns

```sql
SELECT * FROM information_schema.MYSQL_FIREWALL_WHITELIST
WHERE USERHOST = 'appuser@%';
```

Sample output shows each recorded normalized statement:

```text
+-------------+---------------------------------------------+
| USERHOST    | RULE                                        |
+-------------+---------------------------------------------+
| appuser@%   | SELECT `name` , `email` FROM `users` WHERE `id` = ? |
| appuser@%   | INSERT INTO `orders` ( `user_id` , `total` ) VALUES ( ? , ? ) |
+-------------+---------------------------------------------+
```

## Adding Manual Rules

You can add patterns manually if certain queries were not captured during recording. Insert the rule into the `mysql.firewall_whitelist` table and then reload:

```sql
INSERT INTO mysql.firewall_whitelist (USERHOST, RULE)
VALUES ('appuser@%', 'SELECT `id` , `status` FROM `jobs` WHERE `queue` = ?');

CALL mysql.sp_reload_firewall_rules('appuser@%');
```

## Blocking Behavior

When a statement is blocked in PROTECTING mode, MySQL returns an error:

```text
ERROR HY000: Statement was blocked by Firewall
```

You can also configure DETECTING mode to log violations without blocking, useful for auditing before enforcing:

```sql
CALL mysql.sp_set_firewall_mode('appuser@%', 'DETECTING');
```

Detected violations are written to the MySQL error log.

## Resetting an Allowlist

To clear all recorded rules for an account and start over, set the mode to RESET:

```sql
CALL mysql.sp_set_firewall_mode('appuser@%', 'RESET');
```

This removes all allowlist entries for the account and sets its mode to OFF. You can then re-enable RECORDING to begin again.

## Limitations

The MySQL Enterprise Firewall is only available in MySQL Enterprise Edition. It works per-account, not per-role or per-table. It does not replace application-level input validation - it is a defense-in-depth layer that catches injection patterns that bypass application controls.

## Summary

The MySQL Enterprise Firewall adds a query allowlist layer directly inside the database engine. By running in RECORDING mode to capture expected query patterns and then switching to PROTECTING mode, you can block SQL injection attacks even if malicious input reaches the database layer. It is a practical complement to parameterized queries and network-level access controls.
