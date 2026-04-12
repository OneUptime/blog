# How to Use CREATE SERVER Statement in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Server, Federated, DDL, Connection

Description: Learn how to use CREATE SERVER in MySQL to define remote server connection definitions used by FEDERATED storage engine tables.

---

## Overview

The `CREATE SERVER` statement in MySQL defines a named server entry that stores connection parameters - host, port, database, user, and password - for a remote MySQL server. Server definitions are used primarily by the `FEDERATED` storage engine to create tables that transparently access data on another MySQL instance.

## Basic Syntax

```sql
CREATE SERVER server_name
  FOREIGN DATA WRAPPER wrapper_name
  OPTIONS (option [, option] ...);
```

The only supported `wrapper_name` is `mysql`. Options include `HOST`, `PORT`, `DATABASE`, `USER`, `PASSWORD`, and `SOCKET`.

## Creating a Server Definition

```sql
CREATE SERVER remote_analytics
  FOREIGN DATA WRAPPER mysql
  OPTIONS (
    HOST     '10.0.1.50',
    PORT     3306,
    DATABASE 'analytics',
    USER     'federated_user',
    PASSWORD 'secret_password'
  );
```

Server definitions are stored in the `mysql.servers` table and persist across restarts.

## Using a Server with FEDERATED Tables

Once a server is defined, you can create a `FEDERATED` table that references it:

```sql
CREATE TABLE remote_events (
  id         INT          NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  occurred_at DATETIME    NOT NULL,
  PRIMARY KEY (id)
) ENGINE = FEDERATED
  CONNECTION = 'remote_analytics/events';
```

The `CONNECTION` string takes the form `server_name/remote_table_name`. MySQL uses the stored credentials to connect to the remote server and query the `events` table in the `analytics` database.

## Viewing Existing Server Definitions

```sql
SELECT * FROM mysql.servers;
```

Or use `SHOW CREATE SERVER` (requires `SUPER` privilege):

```sql
SHOW CREATE SERVER remote_analytics\G
```

## Security Considerations

Server passwords are stored in the `mysql.servers` table. Access to this table should be restricted:

```sql
-- Restrict access to the servers table
REVOKE SELECT ON mysql.servers FROM 'app_user'@'%';
```

Consider using a dedicated low-privilege account for the FEDERATED connection that only has `SELECT` access on the remote tables it needs.

## Required Privileges

Creating a server requires the `SUPER` privilege:

```sql
GRANT SUPER ON *.* TO 'admin_user'@'localhost';
```

## Updating Server Credentials

Use `ALTER SERVER` to change any connection option without recreating the server:

```sql
ALTER SERVER remote_analytics
  OPTIONS (PASSWORD 'new_password');
```

## Dropping a Server Definition

```sql
DROP SERVER IF EXISTS remote_analytics;
```

Dropping a server does not affect any `FEDERATED` tables that used this connection information when they were created. Existing `FEDERATED` tables retain their connection details and continue to function.

## Summary

`CREATE SERVER` defines a named remote server connection profile used by the MySQL `FEDERATED` storage engine. It stores host, port, credentials, and database information in `mysql.servers`, enabling `FEDERATED` tables to access remote MySQL data transparently. Always restrict access to server credentials and use minimal-privilege accounts for federated connections.
