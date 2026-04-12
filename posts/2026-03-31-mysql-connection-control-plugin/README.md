# How to Configure MySQL Connection Control Plugin

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Security, Plugin, Connection Control, Brute Force

Description: Learn how to configure the MySQL Connection Control plugin to protect your database against brute-force login attacks by adding delays after failed login attempts.

---

## Overview

The MySQL Connection Control plugin adds an increasing delay between successive failed login attempts from the same account. This makes brute-force password attacks impractical by ensuring each guess takes progressively longer, without completely blocking legitimate users.

## Installing the Plugin

The Connection Control plugin consists of two components:

```sql
-- Install both plugin components
INSTALL PLUGIN CONNECTION_CONTROL
  SONAME 'connection_control.so';

INSTALL PLUGIN CONNECTION_CONTROL_FAILED_LOGIN_ATTEMPTS
  SONAME 'connection_control.so';

-- Verify installation
SHOW PLUGINS WHERE Name LIKE 'connection_control%';
```

To make the plugins load automatically on server restart, add to `my.cnf`:

```text
[mysqld]
plugin-load-add=connection_control.so
```

## Understanding the Delay Behavior

The plugin introduces a delay (in milliseconds) after a configured number of failed consecutive attempts:

```text
Attempts 1 to N (threshold): No delay
Attempt N+1: 1000ms delay
Attempt N+2: 2000ms delay
Attempt N+3: 3000ms delay
...
Maximum delay cap applied
```

## Configuring Plugin Parameters

```sql
-- Number of failed attempts before delays begin (default: 3)
SET GLOBAL connection_control_failed_connections_threshold = 3;

-- Minimum delay in milliseconds (default: 1000ms)
SET GLOBAL connection_control_min_connection_delay = 1000;

-- Maximum delay in milliseconds (default: 2147483647ms ~= 24 days)
SET GLOBAL connection_control_max_connection_delay = 30000;

-- Verify settings
SHOW VARIABLES LIKE 'connection_control%';
```

A practical configuration for production:

```sql
-- Delay after 5 failed attempts, capped at 30 seconds
SET GLOBAL connection_control_failed_connections_threshold = 5;
SET GLOBAL connection_control_min_connection_delay = 1000;
SET GLOBAL connection_control_max_connection_delay = 30000;
```

## Making Configuration Persistent

Add to `my.cnf` to survive server restarts:

```text
[mysqld]
plugin-load-add=connection_control.so
connection_control_failed_connections_threshold=5
connection_control_min_connection_delay=1000
connection_control_max_connection_delay=30000
```

## Monitoring Failed Login Attempts

The second plugin component provides a table to monitor activity:

```sql
-- View accounts with failed connection attempts
SELECT *
FROM information_schema.CONNECTION_CONTROL_FAILED_LOGIN_ATTEMPTS
ORDER BY FAILED_ATTEMPTS DESC;
```

Example output:

```text
+------------------+-----------------+
| USERHOST         | FAILED_ATTEMPTS |
+------------------+-----------------+
| 'root'@'%'       | 12              |
| 'admin'@'10.0.%' | 3               |
+------------------+-----------------+
```

## Resetting the Delay Counter

The failed attempt counter resets when a user successfully authenticates. You can also reset all counters manually by reassigning the threshold variable (even to the same value):

```sql
-- Reset all connection control counters by reassigning the threshold
SET GLOBAL connection_control_failed_connections_threshold = 5;

-- This clears the CONNECTION_CONTROL_FAILED_LOGIN_ATTEMPTS table
-- and resets tracking for all accounts
```

## Combining with Other Security Measures

The Connection Control plugin works best as part of a layered security strategy:

```sql
-- Require strong passwords
SET GLOBAL validate_password.policy = 'STRONG';
SET GLOBAL validate_password.length = 12;

-- Limit connections per user
CREATE USER 'app_user'@'10.0.0.%'
  IDENTIFIED BY 'secure_password'
  WITH MAX_USER_CONNECTIONS 20;

-- Use a firewall to restrict source IPs
-- (configure at OS/cloud level, not MySQL)
```

## Summary

The MySQL Connection Control plugin is a lightweight, effective defense against brute-force attacks. Configure `connection_control_failed_connections_threshold` to set how many attempts are allowed before delays begin, and `connection_control_max_connection_delay` to cap the maximum delay. Monitor `information_schema.CONNECTION_CONTROL_FAILED_LOGIN_ATTEMPTS` to detect ongoing attack patterns. Combine with strong password policies and IP-based access restrictions for comprehensive authentication security.
