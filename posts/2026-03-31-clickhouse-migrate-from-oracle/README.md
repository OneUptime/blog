# How to Migrate from Oracle to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Oracle, Migration, Database, Analytics, Enterprise

Description: Migrate large reporting and analytics tables from Oracle Database to ClickHouse by mapping data types, exporting with SQL*Plus, and rewriting Oracle SQL functions for ClickHouse.

---

Oracle Database is the standard for enterprise OLTP workloads, but its licensing costs and complexity make it expensive to scale for analytical query workloads. Many organizations offload large reporting and analytics tables to ClickHouse to reduce Oracle licenses and improve query performance. This guide covers the complete migration from Oracle to ClickHouse.

## Migration Strategy

The recommended approach is a hybrid architecture:

- Oracle handles transactional operations, financial records, and master data
- ClickHouse receives copies of large historical and event tables for analytics
- A nightly or near-real-time ETL job keeps ClickHouse in sync

This avoids downtime and allows gradual migration of reporting workloads.

## Data Type Mapping

| Oracle | ClickHouse |
|--------|------------|
| NUMBER(p, 0) where p <= 9 | Int32 |
| NUMBER(p, 0) where p <= 18 | Int64 |
| NUMBER(p, s) | Decimal(p, s) |
| FLOAT / BINARY_FLOAT | Float32 |
| BINARY_DOUBLE | Float64 |
| VARCHAR2 / NVARCHAR2 | String |
| CHAR / NCHAR | FixedString(n) |
| CLOB / NCLOB | String |
| BLOB | String |
| DATE | DateTime (Oracle DATE includes time) |
| TIMESTAMP | DateTime64(6) |
| TIMESTAMP WITH TIME ZONE | DateTime64(6) (normalize to UTC) |
| INTERVAL | Int64 (store seconds) |
| RAW | String |
| XMLTYPE | String |
| BOOLEAN (PL/SQL only) | Bool |

## Example Oracle Schema

```sql
-- Oracle
CREATE TABLE ANALYTICS.EVENTS (
    EVENT_ID     NUMBER(18)       NOT NULL,
    USER_ID      NUMBER(18)       NOT NULL,
    SESSION_ID   VARCHAR2(64)     DEFAULT '' NOT NULL,
    EVENT_TYPE   VARCHAR2(64)     NOT NULL,
    PAGE         VARCHAR2(512),
    AMOUNT       NUMBER(10, 2)    DEFAULT 0,
    PROPERTIES   CLOB,
    CREATED_AT   TIMESTAMP        DEFAULT SYSTIMESTAMP NOT NULL,
    CONSTRAINT PK_EVENTS PRIMARY KEY (EVENT_ID)
);

CREATE INDEX IDX_EVENTS_USER    ON ANALYTICS.EVENTS(USER_ID);
CREATE INDEX IDX_EVENTS_CREATED ON ANALYTICS.EVENTS(CREATED_AT);
```

## Equivalent ClickHouse Schema

```sql
CREATE TABLE events
(
    event_id    Int64,
    user_id     Int64,
    session_id  String,
    event_type  LowCardinality(String),
    page        String,
    amount      Decimal(10, 2)  DEFAULT 0,
    properties  String          DEFAULT '{}',
    created_at  DateTime64(6)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (event_type, user_id, created_at);
```

Key differences:
- No `PRIMARY KEY` constraint enforcement
- No secondary indexes - `ORDER BY` serves as the access key
- `CLOB` becomes `String`
- Oracle `TIMESTAMP` maps to `DateTime64(6)` for microsecond precision

## Step 1: Export with SQL*Plus

Export to CSV using SQL*Plus:

```bash
sqlplus analytics/password@//oracle.host:1521/ORCLPDB1 << 'EOF'
SET MARKUP CSV ON DELIMITER , QUOTE ON
SET PAGESIZE 0
SET FEEDBACK OFF
SET HEADING ON
SET TRIMSPOOL ON
SPOOL /tmp/events.csv
SELECT
    EVENT_ID,
    USER_ID,
    SESSION_ID,
    EVENT_TYPE,
    PAGE,
    AMOUNT,
    REPLACE(REPLACE(DBMS_LOB.SUBSTR(PROPERTIES, 4000, 1), CHR(13), ''), CHR(10), ' '),
    TO_CHAR(CREATED_AT, 'YYYY-MM-DD HH24:MI:SS.FF6')
FROM ANALYTICS.EVENTS;
SPOOL OFF
EXIT
EOF
```

## Step 2: Export with Oracle Data Pump

For large tables, Oracle Data Pump is faster than SQL*Plus:

```bash
# Export to dump file
expdp analytics/password@//oracle.host:1521/ORCLPDB1 \
  TABLES=ANALYTICS.EVENTS \
  DIRECTORY=DATA_PUMP_DIR \
  DUMPFILE=events_%U.dmp \
  LOGFILE=events_export.log \
  PARALLEL=4 \
  QUERY="WHERE CREATED_AT >= TIMESTAMP '2024-01-01 00:00:00'"
```

Then use Oracle's `sqlcl` or a JDBC-based tool to convert the dump to CSV.

Alternatively, use a Python script with python-oracledb:

```python
# oracle_export.py
import oracledb
import csv
import sys

conn   = oracledb.connect(user="analytics", password="password",
                         dsn="oracle.host:1521/ORCLPDB1")
cursor = conn.cursor()

cursor.execute("""
    SELECT
        EVENT_ID, USER_ID, SESSION_ID, EVENT_TYPE, PAGE, AMOUNT,
        DBMS_LOB.SUBSTR(PROPERTIES, 4000, 1),
        TO_CHAR(CREATED_AT, 'YYYY-MM-DD HH24:MI:SS.FF6')
    FROM ANALYTICS.EVENTS
    WHERE CREATED_AT >= TIMESTAMP '2024-01-01 00:00:00'
    ORDER BY CREATED_AT
""")

with open("/tmp/events.csv", "w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["event_id", "user_id", "session_id", "event_type",
                     "page", "amount", "properties", "created_at"])
    while True:
        rows = cursor.fetchmany(10_000)
        if not rows:
            break
        writer.writerows(rows)
        print(f"Exported {cursor.rowcount} rows", end="\r")

print(f"\nDone: {cursor.rowcount} rows exported")
cursor.close()
conn.close()
```

Install dependencies:

```bash
pip install oracledb
```

## Step 3: Load into ClickHouse

```bash
clickhouse-client \
  --database analytics \
  --query "INSERT INTO events FORMAT CSVWithNames" \
  < /tmp/events.csv
```

## Step 4: Use ClickHouse JDBC Bridge for Live Access

ClickHouse's JDBC bridge lets you query Oracle tables directly from ClickHouse:

```bash
# Start the JDBC bridge
docker run -d \
  --name clickhouse-jdbc-bridge \
  -p 9019:9019 \
  -v $(pwd)/datasources.json:/app/config/datasources.json \
  clickhouse/jdbc-bridge:latest
```

`datasources.json`:

```json
{
  "oracle": {
    "driverUrls": ["https://repo1.maven.org/maven2/com/oracle/database/jdbc/ojdbc11/23.3.0.23.09/ojdbc11-23.3.0.23.09.jar"],
    "driverClassName": "oracle.jdbc.OracleDriver",
    "jdbcUrl": "jdbc:oracle:thin:@oracle.host:1521/ORCLPDB1",
    "dataSource.user": "analytics",
    "dataSource.password": "password"
  }
}
```

Query Oracle from ClickHouse:

```sql
SELECT *
FROM jdbc('oracle', 'SELECT * FROM ANALYTICS.EVENTS WHERE ROWNUM <= 10')
```

Insert from Oracle to ClickHouse via JDBC bridge:

```sql
INSERT INTO events
SELECT
    event_id,
    user_id,
    session_id,
    event_type,
    page,
    amount,
    properties,
    created_at
FROM jdbc('oracle',
    'SELECT EVENT_ID, USER_ID, SESSION_ID, EVENT_TYPE, PAGE, AMOUNT,
            DBMS_LOB.SUBSTR(PROPERTIES, 4000, 1) AS PROPERTIES,
            TO_CHAR(CREATED_AT, ''YYYY-MM-DD HH24:MI:SS'') AS CREATED_AT
     FROM ANALYTICS.EVENTS');
```

## Step 5: Rewrite Oracle SQL

Oracle has many proprietary functions. Here are the most common rewrites:

```sql
-- Oracle: SYSDATE / SYSTIMESTAMP
SELECT SYSDATE FROM DUAL;

-- ClickHouse
SELECT now();
```

```sql
-- Oracle: NVL
SELECT NVL(page, '/') FROM events;

-- ClickHouse
SELECT ifNull(page, '/') FROM events;
```

```sql
-- Oracle: DECODE
SELECT DECODE(event_type, 'purchase', 'revenue', 'page_view', 'traffic', 'other')
FROM events;

-- ClickHouse: CASE WHEN
SELECT CASE event_type
    WHEN 'purchase' THEN 'revenue'
    WHEN 'page_view' THEN 'traffic'
    ELSE 'other'
END FROM events;
```

```sql
-- Oracle: ROWNUM
SELECT * FROM events WHERE ROWNUM <= 100;

-- ClickHouse
SELECT * FROM events LIMIT 100;
```

```sql
-- Oracle: CONNECT BY (hierarchical queries)
SELECT LEVEL, employee_id, manager_id
FROM employees
START WITH manager_id IS NULL
CONNECT BY PRIOR employee_id = manager_id;

-- ClickHouse: use WITH RECURSIVE CTE
WITH RECURSIVE hierarchy AS (
    SELECT employee_id, manager_id, 1 AS level
    FROM employees
    WHERE manager_id IS NULL
    UNION ALL
    SELECT e.employee_id, e.manager_id, h.level + 1
    FROM employees e
    INNER JOIN hierarchy h ON e.manager_id = h.employee_id
)
SELECT level, employee_id, manager_id FROM hierarchy;
```

```sql
-- Oracle: TO_DATE / TO_TIMESTAMP
SELECT TO_DATE('2024-01-15', 'YYYY-MM-DD') FROM DUAL;
SELECT TO_TIMESTAMP('2024-01-15 10:30:00', 'YYYY-MM-DD HH24:MI:SS') FROM DUAL;

-- ClickHouse
SELECT toDate('2024-01-15');
SELECT toDateTime('2024-01-15 10:30:00');
SELECT parseDateTimeBestEffort('2024-01-15 10:30:00');
```

```sql
-- Oracle: LISTAGG
SELECT LISTAGG(event_type, ',') WITHIN GROUP (ORDER BY created_at)
FROM events GROUP BY user_id;

-- ClickHouse (sort by created_at to match Oracle's WITHIN GROUP ORDER BY)
SELECT arrayStringConcat(
    arrayMap(x -> x.2, arraySort(x -> x.1, groupArray(tuple(created_at, event_type)))),
    ','
)
FROM events GROUP BY user_id;
```

```sql
-- Oracle: TRUNC (date truncation)
SELECT TRUNC(created_at, 'MM') FROM events;  -- First of the month

-- ClickHouse
SELECT toStartOfMonth(created_at) FROM events;
```

## Step 6: Validate Migration

```sql
-- Oracle
SELECT COUNT(*), SUM(AMOUNT), MIN(CREATED_AT), MAX(CREATED_AT)
FROM ANALYTICS.EVENTS;

-- ClickHouse
SELECT count(), sum(amount), min(created_at), max(created_at)
FROM events;
```

## Summary

Migrating analytical tables from Oracle to ClickHouse involves careful data type mapping (especially for Oracle's `NUMBER`, `DATE`, and `CLOB` types), exporting data via SQL*Plus or python-oracledb scripts, loading into ClickHouse with `CSVWithNames` format, and rewriting Oracle-specific SQL functions. The JDBC bridge provides an optional live query path during migration. After cutover, Oracle license costs can be reduced by removing the tables that now live in ClickHouse.
