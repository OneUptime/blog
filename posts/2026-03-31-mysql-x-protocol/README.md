# What Is the MySQL X Protocol

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, X Protocol, Networking, Protocol, Performance

Description: The MySQL X Protocol is a modern binary protocol for MySQL that enables multiplexed connections, asynchronous queries, and both SQL and NoSQL access on port 33060.

---

## Overview

The MySQL X Protocol is a next-generation communication protocol for MySQL introduced in MySQL 5.7.12. It was designed to overcome the limitations of the classic MySQL protocol, offering better support for modern application patterns including asynchronous query execution, pipelining, and document-based access.

The X Protocol listens on port 33060 by default, separate from the classic MySQL protocol on port 3306. It is the transport layer that powers the MySQL X DevAPI and MySQL Document Store.

## Why a New Protocol Was Needed

The classic MySQL protocol was designed for synchronous, single-request-per-connection workloads. As applications evolved, several shortcomings became apparent:

- No native support for asynchronous or non-blocking queries
- No built-in request pipelining
- Designed for SQL only - no document/NoSQL access
- Binary encoding tied to legacy design decisions

The X Protocol was built to address all of these limitations.

## Key Features of the X Protocol

**Protocol Buffers encoding** - The X Protocol uses Google Protocol Buffers (protobuf) for message serialization. This provides compact binary encoding and a well-defined schema for protocol messages, making it easier to implement connectors across languages.

**Request pipelining** - Multiple requests can be sent to the server before the first response arrives, reducing round-trip latency in high-throughput scenarios.

**Session reuse** - The protocol supports resetting and reusing sessions on a single connection without reconnecting, reducing connection setup overhead.

**Extensibility** - Adding new message types to the protocol does not break older clients, allowing forward compatibility.

## Checking the X Plugin Status

The X Protocol is enabled via the `mysqlx` plugin. Verify it is active:

```sql
SHOW PLUGINS WHERE Name = 'mysqlx';
```

```text
+--------+----------+----------------+-------------+---------+
| Name   | Status   | Type           | Library     | License |
+--------+----------+----------------+-------------+---------+
| mysqlx | ACTIVE   | DAEMON         | NULL        | GPL     |
+--------+----------+----------------+-------------+---------+
```

## Checking the X Protocol Port

```sql
SHOW VARIABLES LIKE 'mysqlx_port';
```

```text
+-------------+-------+
| Variable_name | Value |
+-------------+-------+
| mysqlx_port | 33060 |
+-------------+-------+
```

## Connecting Over the X Protocol

Using MySQL Shell:

```bash
mysqlsh root@localhost:33060 --mysqlx
```

Using a Python connector:

```python
import mysqlx

session = mysqlx.get_session({
    "host": "localhost",
    "port": 33060,
    "user": "root",
    "password": "secret"
})

result = session.sql("SELECT @@version").execute()
print(result.fetch_one()[0])
session.close()
```

## X Protocol vs Classic Protocol

| Feature | Classic Protocol (3306) | X Protocol (33060) |
|---|---|---|
| Encoding | Custom binary | Protocol Buffers |
| Async support | No | Yes |
| Request pipelining | No | Yes |
| NoSQL/Document access | No | Yes |
| Session reuse | No | Yes |

## Disabling the X Plugin

If you do not need the X Protocol, you can disable it to reduce attack surface. In MySQL 8.0+, the X Plugin is built into the server and cannot be uninstalled at runtime. Prevent it from loading at startup in `my.cnf`:

```text
[mysqld]
mysqlx=0
```

## Summary

The MySQL X Protocol is the modern transport layer underpinning the X DevAPI and Document Store. By using Protocol Buffers, supporting request pipelining, and enabling both SQL and NoSQL operations, it provides a more capable foundation than the classic MySQL protocol for contemporary application workloads.