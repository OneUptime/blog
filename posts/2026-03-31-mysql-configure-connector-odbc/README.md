# How to Configure MySQL Connector/ODBC

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, ODBC, Connector, Configuration, Driver

Description: Learn how to install and configure MySQL Connector/ODBC (MyODBC) for connecting MySQL databases to ODBC-compatible applications and tools.

---

## Overview

MySQL Connector/ODBC (also called MyODBC) is the official ODBC driver for MySQL. It enables any ODBC-compatible application - including Microsoft Excel, Access, Tableau, and legacy enterprise systems - to connect to MySQL databases using a standardized interface.

## Installing MySQL Connector/ODBC

Download the driver from the MySQL website or install via package manager:

```bash
# On Ubuntu/Debian
sudo apt-get install mysql-connector-odbc unixodbc

# On RHEL/CentOS
sudo yum install mysql-connector-odbc unixODBC

# On Windows (PowerShell) - download MSI from mysql.com
# Then install silently:
msiexec /i mysql-connector-odbc-8.0.xx-winx64.msi /quiet
```

## Registering the Driver (Linux)

On Linux, register the MySQL ODBC driver with the ODBC Driver Manager:

```bash
# Locate the driver shared library
sudo find /usr -name "libmyodbc*.so" 2>/dev/null

# Register the driver
sudo odbcinst -i -d -f /usr/share/mysql-connector-odbc/mysql-connector-odbc-setup.ini
```

The driver configuration file looks like this:

```text
[MySQL ODBC 8.0 Unicode Driver]
Description = MySQL ODBC 8.0 Unicode Driver
Driver      = /usr/lib/x86_64-linux-gnu/odbc/libmyodbc8w.so
Setup       = /usr/lib/x86_64-linux-gnu/odbc/libmyodbc8w.so
FileUsage   = 1
```

## Configuring a Data Source Name (DSN)

A DSN stores connection parameters so applications can connect using just the DSN name.

### System DSN on Linux (`/etc/odbc.ini`):

```text
[MySQLDB]
Driver    = MySQL ODBC 8.0 Unicode Driver
Server    = localhost
Port      = 3306
Database  = myapp
User      = app_user
Password  = secure_password
CharSet   = utf8mb4
Option    = 2
```

### DSN-Less Connection String

For applications that accept connection strings directly:

```text
Driver={MySQL ODBC 8.0 Unicode Driver};Server=localhost;Port=3306;Database=myapp;Uid=app_user;Pwd=secure_password;CharSet=utf8mb4;
```

## Important Connection Options

The `Option` parameter controls driver behavior through a bitmask:

```text
[MySQLDB]
Driver    = MySQL ODBC 8.0 Unicode Driver
Server    = db.example.com
Port      = 3306
Database  = myapp
User      = app_user
Password  = secure_password
Option    = 2
# Option=2  - Return matched rows instead of affected rows (FOUND_ROWS)
# Option=8  - Allow big result set (BIG_PACKETS)
# Option=32 - Enable dynamic cursors (DYNAMIC_CURSOR)
ssl-ca    = /path/to/ca-cert.pem
ssl-mode  = VERIFY_CA
```

## Testing the Connection

Use `isql` to test your DSN configuration:

```bash
# Test connection using DSN name
isql -v MySQLDB

# Run a test query
isql MySQLDB app_user secure_password -v
```

Expected output:

```text
+---------------------------------------+
| Connected!                            |
|                                       |
| sql-statement                         |
| help [tablename]                      |
| quit                                  |
|                                       |
+---------------------------------------+
SQL>
```

## Connecting from Python via pyodbc

Once the DSN is configured, any language with an ODBC library can use it:

```python
import pyodbc

# Connect using DSN
conn = pyodbc.connect('DSN=MySQLDB;UID=app_user;PWD=secure_password')

cursor = conn.cursor()
cursor.execute("SELECT id, name FROM users LIMIT 10")

for row in cursor.fetchall():
    print(row.id, row.name)

conn.close()
```

## Summary

MySQL Connector/ODBC provides a standards-compliant way to connect MySQL to a wide range of ODBC-compatible applications. The key steps are installing the driver, registering it with the ODBC Driver Manager, configuring a DSN with the appropriate server and credential settings, and testing with `isql`. For secure production deployments, always configure SSL parameters and avoid embedding passwords directly in DSN files by using application-level credential injection.
