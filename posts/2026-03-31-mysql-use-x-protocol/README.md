# How to Use MySQL X Protocol

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, X Protocol, Network, Plugin, Connection

Description: Learn how the MySQL X Protocol works, how to configure it, and how to connect using both the X DevAPI and raw protocol clients on port 33060.

---

## What is the MySQL X Protocol?

The MySQL X Protocol is a modern, binary network protocol introduced in MySQL 5.7.12 that operates on port 33060 by default. It powers the X DevAPI and supports full-duplex, asynchronous communication between clients and the MySQL server. Unlike the classic MySQL protocol (port 3306), the X Protocol is built on Protocol Buffers (protobuf) and supports:

- CRUD operations on document collections
- CRUD operations on SQL tables
- Asynchronous query execution
- Row streaming
- Authentication via SHA-256 and cached SHA-2 plugins

## Verifying the X Plugin is Active

```sql
SHOW PLUGINS WHERE Name = 'mysqlx';
```

Expected output:

```text
Name    | Status | Type       | Library | License
mysqlx  | ACTIVE | DAEMON     | NULL    | GPL
```

Note: In MySQL 8.0+, the X Plugin is built into the server binary, so the Library column shows `NULL`. In MySQL 5.7, it was a loadable plugin (`mysqlx.so`).

## Checking the X Protocol Port

```sql
SHOW VARIABLES LIKE 'mysqlx_port';
```

```text
Variable_name | Value
mysqlx_port   | 33060
```

## Enabling the Plugin Manually

In MySQL 8.0+, the X Plugin is built-in and enabled by default. If it has been disabled, re-enable it by adding the following to `/etc/mysql/my.cnf` and restarting:

```text
[mysqld]
mysqlx=ON
mysqlx-port=33060
mysqlx-socket=/var/run/mysqld/mysqlx.sock
```

## Connecting via MySQL Shell

```bash
# Using the X Protocol (mysqlx://)
mysqlsh --uri mysqlx://root@127.0.0.1:33060

# Classic protocol for comparison
mysqlsh --uri mysql://root@127.0.0.1:3306
```

## Connecting via Node.js X DevAPI

```javascript
const mysqlx = require('@mysql/xdevapi');

const session = await mysqlx.getSession('mysqlx://root:secret@127.0.0.1:33060/mydb');
console.log('Connected via X Protocol');
await session.close();
```

## Connecting via Python X DevAPI

```python
import mysqlx

session = mysqlx.get_session({
    "host": "127.0.0.1",
    "port": 33060,
    "user": "root",
    "password": "secret"
})
print("Connected:", session.is_open())
session.close()
```

## Configuring the Bind Address and Socket

```text
[mysqld]
mysqlx-bind-address=0.0.0.0
mysqlx-port=33060
mysqlx-socket=/tmp/mysqlx.sock
```

To restrict X Protocol to localhost only:

```text
[mysqld]
mysqlx-bind-address=127.0.0.1
```

## Monitoring X Protocol Connections

```sql
SHOW STATUS LIKE 'Mysqlx%';
```

Key metrics:

```text
Mysqlx_connections_accepted
Mysqlx_connections_closed
Mysqlx_connections_rejected
Mysqlx_crud_insert
Mysqlx_crud_find
Mysqlx_crud_update
Mysqlx_crud_delete
```

## Disabling the X Protocol

If the X Protocol is not needed:

```text
[mysqld]
mysqlx=OFF
```

Or pass the `--mysqlx=0` flag when starting the server:

```bash
mysqld --mysqlx=0
```

## Summary

The MySQL X Protocol provides a modern, efficient communication layer for the X DevAPI on port 33060. It is enabled by default on MySQL 8.0. Verify with `SHOW PLUGINS`, and connect using `mysqlx://` URIs from MySQL Shell or supported language connectors. Monitor connection metrics via `SHOW STATUS LIKE 'Mysqlx%'` and restrict the bind address to localhost if remote X Protocol access is not needed.
