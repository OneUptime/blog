# How to Use ClickHouse MySQL Wire Protocol Compatibility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, MySQL, Protocol, Compatibility, Integration

Description: Learn how to enable ClickHouse's MySQL wire protocol compatibility to connect MySQL clients, drivers, and BI tools directly to ClickHouse.

---

## What is MySQL Wire Protocol Compatibility

ClickHouse includes a MySQL interface that speaks the MySQL binary protocol. This means MySQL clients, drivers, and tools can connect to ClickHouse without any ClickHouse-specific driver.

## Enable the MySQL Interface

Add to `config.xml` or `config.d/mysql.xml`:

```xml
<mysql_port>9004</mysql_port>
```

Or run ClickHouse in Docker with the MySQL port exposed:

```bash
docker run -d \
  --name clickhouse \
  -p 8123:8123 \
  -p 9000:9000 \
  -p 9004:9004 \
  clickhouse/clickhouse-server
```

Verify it is listening:

```bash
nc -zv localhost 9004
```

## Connect with MySQL Client

```bash
mysql -h 127.0.0.1 -P 9004 -u default --password="" default
```

Run queries as usual:

```sql
SHOW DATABASES;
USE default;
SHOW TABLES;
SELECT count() FROM events;
```

## Connect with Python mysql-connector

```bash
pip install mysql-connector-python
```

```python
import mysql.connector

conn = mysql.connector.connect(
    host="127.0.0.1",
    port=9004,
    user="default",
    password="",
    database="default"
)

cursor = conn.cursor()
cursor.execute("SELECT event_type, count(*) AS cnt FROM events GROUP BY event_type")
for row in cursor.fetchall():
    print(row)
cursor.close()
conn.close()
```

## Connect with PyMySQL

```bash
pip install pymysql
```

```python
import pymysql

conn = pymysql.connect(
    host="127.0.0.1",
    port=9004,
    user="default",
    password="",
    database="default"
)

with conn.cursor() as cursor:
    cursor.execute("SELECT toDate(ts), count() FROM events GROUP BY 1 ORDER BY 1")
    rows = cursor.fetchall()
    for row in rows:
        print(row)
```

## Connect with SQLAlchemy + PyMySQL

```python
from sqlalchemy import create_engine, text

engine = create_engine(
    "mysql+pymysql://default:@127.0.0.1:9004/default"
)

with engine.connect() as conn:
    result = conn.execute(text("SELECT count() FROM events"))
    print(result.fetchone())
```

## Limitations

```text
- No support for MySQL-specific DDL (AUTO_INCREMENT, etc.)
- Transactions behave differently (ClickHouse is not ACID)
- Some MySQL functions are not available
- Prepared statements have limited support
- INFORMATION_SCHEMA compatibility is partial
```

## Use Cases

- Connecting BI tools that only support MySQL
- Migrating MySQL analytics queries to ClickHouse gradually
- Using MySQL-based ORM code against ClickHouse during testing
- Connecting legacy MySQL applications without driver changes

## Summary

ClickHouse's MySQL wire protocol compatibility opens the door to any MySQL-compatible tool or driver. Enable port 9004 in your ClickHouse config, then connect using standard MySQL clients, Python drivers like `mysql-connector` or `PyMySQL`, and even SQLAlchemy - making migration and integration seamless.
