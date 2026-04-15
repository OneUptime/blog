# How to Use ClickHouse ODBC Driver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ODBC, Integration, Window, Driver

Description: Learn how to install and configure the ClickHouse ODBC driver on Linux and Windows, create DSN entries, and connect from Excel, Tableau, Python, and C applications.

---

The ClickHouse ODBC driver allows any application that supports the Open Database Connectivity (ODBC) standard to connect to ClickHouse. This includes business intelligence tools like Tableau and Excel, ETL platforms, and applications written in C, C++, or Python using `pyodbc`. The driver works on both Linux and Windows.

## Download and Install

### Linux (Debian/Ubuntu)

```bash
# Install unixODBC
sudo apt-get install -y unixodbc unixodbc-dev

# Download the ClickHouse ODBC driver
# Find the latest release at https://github.com/ClickHouse/clickhouse-odbc/releases
wget https://github.com/ClickHouse/clickhouse-odbc/releases/download/v1.2.1.20220905/clickhouse-odbc-1.2.1-Linux.tar.gz
tar xzf clickhouse-odbc-1.2.1-Linux.tar.gz

# Copy the shared libraries
sudo cp clickhouse-odbc-1.2.1-Linux/lib64/libclickhouseodbc*.so /usr/local/lib/

# Register with unixODBC
sudo odbcinst -i -d -f clickhouse-odbc-1.2.1-Linux/share/doc/clickhouse-odbc/config/odbcinst.ini.sample
```

### macOS

```bash
brew install unixodbc
brew install clickhouse-odbc
```

### Windows

Download the MSI installer from the [ClickHouse ODBC GitHub releases page](https://github.com/ClickHouse/clickhouse-odbc/releases). Run the installer and it will register both the ANSI and Unicode variants in the Windows ODBC Data Source Administrator.

## Register the Driver (Linux/macOS)

Edit `/etc/odbcinst.ini` (system-wide) or `~/.odbcinst.ini` (user-specific):

```text
[ClickHouse ODBC Driver (ANSI)]
Description = ClickHouse ODBC Driver (ANSI)
Driver      = /usr/local/lib/libclickhouseodbc.so
Setup       = /usr/local/lib/libclickhouseodbc.so
UsageCount  = 1

[ClickHouse ODBC Driver (Unicode)]
Description = ClickHouse ODBC Driver (Unicode)
Driver      = /usr/local/lib/libclickhouseodbcw.so
Setup       = /usr/local/lib/libclickhouseodbcw.so
UsageCount  = 1
```

Verify registration:

```bash
odbcinst -q -d
```

## Create a DSN (Data Source Name)

### Linux/macOS - odbc.ini

System DSN in `/etc/odbc.ini` or user DSN in `~/.odbc.ini`:

```text
[ClickHouse_Analytics]
Description = ClickHouse Analytics Database
Driver      = ClickHouse ODBC Driver (Unicode)
Url         = http://localhost:8123/analytics
Database    = analytics
UID         = default
PWD         = secret
Port        = 8123
Verify      = 0
```

### DSN with SSL

```text
[ClickHouse_Prod]
Description = ClickHouse Production
Driver      = ClickHouse ODBC Driver (Unicode)
Url         = https://clickhouse.example.com:8443/analytics
Database    = analytics
UID         = reporting_user
PWD         = s3cret
SSLMode     = require
VerifyConnectionEarly = 0
```

### Windows DSN

Open ODBC Data Source Administrator (search "ODBC" in Start menu):

1. Click "System DSN" tab then "Add".
2. Select "ClickHouse ODBC Driver (Unicode)".
3. Fill in the connection details:

```text
Data Source Name: ClickHouse_Analytics
Description:      ClickHouse Analytics
URL:              http://localhost:8123/analytics
Database:         analytics
Username:         default
Password:         secret
```

## Test the Connection

```bash
# Test with isql (comes with unixODBC)
isql ClickHouse_Analytics default secret

# Run a query
isql ClickHouse_Analytics default secret -b << 'EOF'
SELECT version()
EOF
```

Expected output:

```text
+----------------------+
| version()            |
+----------------------+
| 24.3.1.2672          |
+----------------------+
SQLRowCount returns 1
1 rows fetched
```

## Python with pyodbc

```python
import pyodbc

# Connect using a DSN
conn = pyodbc.connect('DSN=ClickHouse_Analytics')

# Or connect with a full connection string (no DSN needed)
conn_str = (
    'Driver={ClickHouse ODBC Driver (Unicode)};'
    'Url=http://localhost:8123;'
    'Database=default;'
    'UID=default;'
    'PWD=;'
)
conn = pyodbc.connect(conn_str)

cursor = conn.cursor()
cursor.execute("""
    SELECT
        user_id,
        count() AS event_count
    FROM events
    GROUP BY user_id
    ORDER BY event_count DESC
    LIMIT 10
""")

columns = [desc[0] for desc in cursor.description]
print('\t'.join(columns))

for row in cursor.fetchall():
    print('\t'.join(str(v) for v in row))

conn.close()
```

## Python with pyodbc - Parameterized Query

```python
import pyodbc

conn = pyodbc.connect('DSN=ClickHouse_Analytics')
cursor = conn.cursor()

cursor.execute(
    "SELECT count() FROM events WHERE user_id = ? AND event_name = ?",
    1001,
    'purchase'
)

count = cursor.fetchone()[0]
print(f"Purchases for user 1001: {count}")
```

## Python - Insert Data

```python
import pyodbc

conn   = pyodbc.connect('DSN=ClickHouse_Analytics')
cursor = conn.cursor()

rows = [
    (1001, 'purchase', '2024-01-15 10:00:00', 49.99),
    (1002, 'page_view', '2024-01-15 10:01:00', None),
]

cursor.executemany(
    "INSERT INTO events (user_id, event_name, created_at, amount) VALUES (?, ?, ?, ?)",
    rows
)
print("Rows inserted")
```

## Python - Introspect Available Tables

```python
import pyodbc

conn = pyodbc.connect('DSN=ClickHouse_Analytics')
cursor = conn.cursor()

# List tables
for row in cursor.tables(tableType='TABLE'):
    print(row.table_name)

# List columns of a specific table
for row in cursor.columns(table='events'):
    print(f"{row.column_name:30} {row.type_name}")
```

## C Application Example

```c
#include <sql.h>
#include <sqlext.h>
#include <stdio.h>
#include <string.h>

int main() {
    SQLHENV  henv  = SQL_NULL_HANDLE;
    SQLHDBC  hdbc  = SQL_NULL_HANDLE;
    SQLHSTMT hstmt = SQL_NULL_HANDLE;
    SQLRETURN rc;

    SQLAllocHandle(SQL_HANDLE_ENV, SQL_NULL_HANDLE, &henv);
    SQLSetEnvAttr(henv, SQL_ATTR_ODBC_VERSION,
                  (void *)SQL_OV_ODBC3, 0);
    SQLAllocHandle(SQL_HANDLE_DBC, henv, &hdbc);

    // Connect using DSN
    rc = SQLConnect(hdbc,
                    (SQLCHAR *)"ClickHouse_Analytics", SQL_NTS,
                    (SQLCHAR *)"default", SQL_NTS,
                    (SQLCHAR *)"",        SQL_NTS);

    if (!SQL_SUCCEEDED(rc)) {
        printf("Connection failed\n");
        return 1;
    }

    SQLAllocHandle(SQL_HANDLE_STMT, hdbc, &hstmt);
    SQLExecDirect(hstmt,
                  (SQLCHAR *)"SELECT count() FROM events",
                  SQL_NTS);

    SQLBIGINT count;
    SQLLEN    indicator;
    SQLBindCol(hstmt, 1, SQL_C_SBIGINT, &count, 0, &indicator);

    if (SQLFetch(hstmt) == SQL_SUCCESS) {
        printf("Total events: %lld\n", (long long)count);
    }

    SQLFreeHandle(SQL_HANDLE_STMT, hstmt);
    SQLDisconnect(hdbc);
    SQLFreeHandle(SQL_HANDLE_DBC, hdbc);
    SQLFreeHandle(SQL_HANDLE_ENV, henv);
    return 0;
}
```

Compile:

```bash
gcc -o ch_query ch_query.c -lodbc
```

## Connect from Tableau

1. Open Tableau Desktop.
2. In the "Connect" pane, click "Other Databases (ODBC)".
3. Select "ClickHouse ODBC Driver (Unicode)" from the driver list.
4. Enter connection details or select your pre-configured DSN.
5. Click "Connect".

ClickHouse tables will appear in the schema browser. Drag tables to the canvas to start building visualizations.

## Connect from Excel (Windows)

1. Open Excel, go to Data > Get Data > From Other Sources > From ODBC.
2. Select your ClickHouse DSN from the dropdown.
3. Enter credentials if prompted.
4. Browse and select the table or enter a custom SQL query.
5. Load the results into the spreadsheet.

## DSN-Less Connection String Reference

```text
Driver={ClickHouse ODBC Driver (Unicode)};
Url=http://localhost:8123;
Database=default;
UID=default;
PWD=password;
Timeout=30;
SSLMode=disable;
```

## Common Pitfalls

- The ODBC driver uses the HTTP interface (port 8123), not the native protocol port (9000). Firewall rules must allow port 8123.
- On Linux, the `unixODBC` library and headers must be present before compiling the driver or any ODBC-dependent application.
- ClickHouse does not support ODBC transactions. Applications that call `SQLEndTran` will receive success return codes but no actual commit or rollback occurs.
- The ANSI driver (`libclickhouseodbc.so`) handles ASCII data. Use the Unicode driver (`libclickhouseodbcw.so`) for UTF-8 data including non-ASCII characters in strings.

## Summary

The ClickHouse ODBC driver brings ClickHouse connectivity to any ODBC-compatible tool without requiring a native client library. Configure a DSN in `odbc.ini`, then connect from Python via `pyodbc`, from BI tools like Tableau and Excel, or from C applications using the standard ODBC API. The setup is a one-time step that enables a broad ecosystem of tools to query ClickHouse directly.
