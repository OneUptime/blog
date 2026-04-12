# How to Use ALTER SERVER Statement in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Server, Federated, DDL, Connection

Description: Learn how to use ALTER SERVER in MySQL to update connection options for an existing remote server definition used by FEDERATED tables.

---

## Overview

The `ALTER SERVER` statement modifies the connection options of an existing server definition created with `CREATE SERVER`. Use it to update credentials, change the host, adjust the port, or modify any other connection parameter without dropping and recreating the server - which would not interrupt any existing FEDERATED table definitions.

## Basic Syntax

```sql
ALTER SERVER server_name
  OPTIONS (option_changes);
```

Each option is expressed as `option_name 'value'` (or `option_name numeric_value` for PORT).

## Changing a Password

The most common use case is rotating credentials:

```sql
ALTER SERVER remote_analytics
  OPTIONS (PASSWORD 'new_secure_password');
```

After changing the password, existing FEDERATED connections that are currently open may need to reconnect.

## Changing the Host

If the remote server is migrated to a new IP or hostname:

```sql
ALTER SERVER remote_analytics
  OPTIONS (HOST '10.0.2.100');
```

## Changing Multiple Options at Once

You can modify several options in a single statement by separating them with commas:

```sql
ALTER SERVER remote_analytics
  OPTIONS (
    HOST '10.0.2.100',
    PORT 3307,
    USER 'new_federated_user',
    PASSWORD 'new_password'
  );
```

## Setting a Socket Option

If the remote connection should use a Unix socket instead of TCP:

```sql
ALTER SERVER local_secondary
  OPTIONS (SOCKET '/var/run/mysqld/mysqld.sock');
```

## Verifying the Change

After altering, verify by querying `mysql.servers`:

```sql
SELECT
  Server_name,
  Host,
  Db,
  Username,
  Port
FROM mysql.servers
WHERE Server_name = 'remote_analytics';
```

## Required Privileges

`ALTER SERVER` requires the `SUPER` privilege:

```sql
GRANT SUPER ON *.* TO 'dba_user'@'localhost';
```

## Full Workflow Example

```sql
-- Create the server
CREATE SERVER warehouse_db
  FOREIGN DATA WRAPPER mysql
  OPTIONS (
    HOST 'warehouse.internal',
    PORT 3306,
    DATABASE 'warehouse',
    USER 'wh_reader',
    PASSWORD 'initial_pass'
  );

-- Rotate credentials
ALTER SERVER warehouse_db
  OPTIONS (PASSWORD 'rotated_pass');

-- Move to a new host after migration
ALTER SERVER warehouse_db
  OPTIONS (HOST 'warehouse-new.internal');

-- Verify
SELECT Host, Username FROM mysql.servers
WHERE Server_name = 'warehouse_db';
```

## FEDERATED Table Behavior After ALTER SERVER

Existing `FEDERATED` tables that reference the server will use the updated settings on the next connection attempt. No DDL changes to the FEDERATED tables themselves are required:

```sql
-- This FEDERATED table automatically uses the new credentials
SELECT COUNT(*) FROM remote_products;
```

## Summary

`ALTER SERVER` updates connection options for an existing MySQL server definition in-place, without requiring you to drop and recreate the server or modify any `FEDERATED` tables that depend on it. It is the standard way to rotate credentials, update host information, or adjust port settings for remote server connections.
