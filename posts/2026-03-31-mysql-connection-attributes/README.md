# How to Configure MySQL Connection Attributes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Connection, Attribute, Performance Schema, Monitoring

Description: Learn how to set and query MySQL connection attributes to identify application connections, improve observability, and debug connection-level issues.

---

## Overview

MySQL connection attributes are key-value metadata pairs that client applications can set when establishing a connection. They appear in the Performance Schema and allow you to identify which application, service, or code path is responsible for a connection without requiring additional logging infrastructure.

## How Connection Attributes Work

When a client connects to MySQL, it can send a set of attributes as part of the connection packet. MySQL stores these in the Performance Schema `session_connect_attrs` table for the duration of the connection.

Default attributes sent by most drivers:

```text
_client_name     - Driver name (e.g., "libmysql", "mysql-connector-python")
_client_version  - Driver version
_os              - Operating system
_pid             - Process ID of the connecting process
_platform        - Hardware platform
_program_name    - Name of the connecting program
```

## Viewing Connection Attributes

```sql
-- View attributes for all current connections
SELECT
    ca.PROCESSLIST_ID,
    ca.ATTR_NAME,
    ca.ATTR_VALUE
FROM performance_schema.session_connect_attrs ca
ORDER BY ca.PROCESSLIST_ID, ca.ATTR_NAME;

-- View attributes for a specific connection
SELECT ATTR_NAME, ATTR_VALUE
FROM performance_schema.session_connect_attrs
WHERE PROCESSLIST_ID = CONNECTION_ID();

-- Join with session info for full picture
SELECT
    pl.ID,
    pl.USER,
    pl.HOST,
    pl.DB,
    pl.COMMAND,
    ca.ATTR_NAME,
    ca.ATTR_VALUE
FROM information_schema.processlist pl
JOIN performance_schema.session_connect_attrs ca
    ON pl.ID = ca.PROCESSLIST_ID
WHERE ca.ATTR_NAME IN ('_program_name', '_client_name', 'app_name')
ORDER BY pl.ID;
```

## Setting Custom Connection Attributes in Application Code

### Python (mysql-connector-python)

```python
import mysql.connector

conn = mysql.connector.connect(
    host='localhost',
    user='app_user',
    password='secure_password',
    database='myapp',
    # Custom connection attributes
    conn_attrs={
        'app_name': 'order-service',
        'app_version': '2.4.1',
        'environment': 'production',
        'team': 'backend'
    }
)
```

### Java (JDBC)

```java
Properties props = new Properties();
props.setProperty("user", "app_user");
props.setProperty("password", "secure_password");

// Set connection attributes
props.setProperty("connectionAttributes",
    "app_name:order-service,app_version:2.4.1,environment:production");

Connection conn = DriverManager.getConnection(
    "jdbc:mysql://localhost:3306/myapp", props
);
```

### Node.js (mysql2)

```javascript
const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'app_user',
  password: 'secure_password',
  database: 'myapp',
  // Custom connection attributes sent during handshake
  connectAttributes: {
    app_name: 'order-service',
    app_version: '2.4.1',
    environment: 'production'
  }
});
```

## Using Connection Attributes for Monitoring

Build a view to see active connections with their application metadata:

```sql
CREATE VIEW active_connections_with_attrs AS
SELECT
    pl.ID AS connection_id,
    pl.USER AS db_user,
    pl.HOST AS client_host,
    pl.DB AS database_name,
    pl.COMMAND,
    pl.TIME AS seconds_active,
    MAX(CASE WHEN ca.ATTR_NAME = '_program_name' THEN ca.ATTR_VALUE END) AS program,
    MAX(CASE WHEN ca.ATTR_NAME = 'app_name' THEN ca.ATTR_VALUE END) AS app_name,
    MAX(CASE WHEN ca.ATTR_NAME = '_client_name' THEN ca.ATTR_VALUE END) AS driver
FROM information_schema.processlist pl
LEFT JOIN performance_schema.session_connect_attrs ca
    ON pl.ID = ca.PROCESSLIST_ID
GROUP BY pl.ID, pl.USER, pl.HOST, pl.DB, pl.COMMAND, pl.TIME;
```

## Disabling Connection Attributes (If Needed)

```text
[mysqld]
# Disable connection attribute collection to reduce Performance Schema overhead
performance_schema_session_connect_attrs_size = 0
```

## Summary

MySQL connection attributes provide a lightweight mechanism to embed application metadata directly into database connections. Use custom attributes like `app_name`, `app_version`, and `environment` to make it easy to trace which application service owns a given connection in Performance Schema. This is particularly valuable in microservices architectures where many services share a MySQL instance and you need to identify the source of high connection counts, slow queries, or lock contention.
