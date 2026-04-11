# How to Migrate from MySQL to MariaDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, MariaDB, Migration, Database, Schema

Description: Step-by-step guide to migrating from MySQL to MariaDB, covering compatibility checks, data export, import, and post-migration validation.

---

## Why Migrate from MySQL to MariaDB

MariaDB is a community-developed fork of MySQL that offers several advantages: it is fully open source under the GPL, includes additional storage engines, and often ships newer features faster than Oracle's MySQL releases. Organizations migrating away from Oracle licensing concerns or seeking performance improvements in specific workloads often choose MariaDB as a drop-in replacement.

MariaDB maintains high compatibility with MySQL. Most MySQL applications run on MariaDB without code changes, but there are subtle differences in behavior, system tables, and certain SQL syntax that require attention before and after migration.

## Pre-Migration Compatibility Check

Before migrating, audit your MySQL version and compare it against the target MariaDB version. MariaDB 10.x maps roughly to MySQL 5.7/8.0 feature sets.

Check your MySQL version:

```sql
SELECT VERSION();
```

Review any MySQL-specific features you rely on:

```sql
SHOW CREATE TABLE your_table\G
SHOW TRIGGERS FROM your_database\G
SHOW PROCEDURE STATUS WHERE Db = 'your_database'\G
```

Known compatibility considerations:

- MariaDB does not support MySQL 8.0's `caching_sha2_password` authentication plugin by default. Use `mysql_native_password` or configure the equivalent MariaDB plugin.
- `JSON` column type in MySQL uses a native binary storage format, while MariaDB's `JSON` type is an alias for `LONGTEXT`. Test JSON-heavy schemas carefully as this can affect storage efficiency and some JSON function behavior.
- `INVISIBLE` columns and some `CHECK` constraint syntax differ between versions.

## Export Data from MySQL

Use `mysqldump` to export your database. This tool works identically on both MySQL and MariaDB:

```bash
mysqldump \
  --single-transaction \
  --routines \
  --triggers \
  --events \
  --set-gtid-purged=OFF \
  -u root -p \
  your_database > mysql_backup.sql
```

For large databases, consider exporting table by table or using `mydumper` for parallel exports:

```bash
mydumper \
  --database your_database \
  --outputdir /backup/mysql_dump \
  --compress \
  --threads 4
```

## Install MariaDB

Install MariaDB on the target server. On Ubuntu:

```bash
sudo apt-get install mariadb-server
sudo systemctl start mariadb
sudo systemctl enable mariadb
sudo mariadb-secure-installation
```

On RHEL/CentOS:

```bash
sudo dnf install mariadb-server
sudo systemctl start mariadb
sudo systemctl enable mariadb
```

## Import Data into MariaDB

Create the target database and import the dump:

```bash
mariadb -u root -p -e "CREATE DATABASE your_database CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mariadb -u root -p your_database < mysql_backup.sql
```

If you used `mydumper`, restore with `myloader`:

```bash
myloader \
  --database your_database \
  --directory /backup/mysql_dump \
  --threads 4
```

## Update Application Connection Strings

MariaDB uses the same default port (3306) and accepts standard MySQL client libraries. Update your application configuration to point to the new host.

For applications using `mysql2` in Node.js:

```javascript
const mysql = require('mysql2');
const pool = mysql.createPool({
  host: 'mariadb-host',
  user: 'app_user',
  password: 'app_password',
  database: 'your_database',
  port: 3306,
});
```

No driver change is required since `mysql2` and most MySQL drivers are compatible with MariaDB.

## Post-Migration Validation

After importing, run validation queries to confirm row counts match between source and destination:

```sql
SELECT TABLE_NAME, TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'your_database'
ORDER BY TABLE_NAME;
```

Run checksums on critical tables:

```sql
CHECKSUM TABLE orders, users, products;
```

Test stored procedures, triggers, and views by calling them with known inputs and comparing outputs against the MySQL baseline.

## Monitoring After Migration

Use OneUptime to set up uptime monitors and alerting for your MariaDB server. After migration, monitor slow query logs to catch any performance regressions:

```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
SET GLOBAL slow_query_log_file = '/var/log/mariadb/slow.log';
```

Track error rates, connection counts, and replication lag if you run replicas.

## Summary

Migrating from MySQL to MariaDB involves exporting your data with `mysqldump` or `mydumper`, installing MariaDB on the target, importing the dump, and validating row counts and checksums. Compatibility is high, but you should test JSON columns, authentication plugins, and stored routines before cutting over production traffic. Post-migration monitoring ensures any regressions are caught early.
