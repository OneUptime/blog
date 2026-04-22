# How to Configure MySQL Server Time Zone

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL, Configuration, Database, Time Zone

Description: Learn how to configure the MySQL server time zone globally and per session, load the time zone tables, and verify the active setting.

---

## Why Server Time Zone Matters

MySQL uses a system time zone and a global time zone. Functions like `NOW()`, `CURRENT_TIMESTAMP`, and automatic `TIMESTAMP` columns record values relative to the session time zone. If your server time zone is misconfigured, timestamps stored by different application servers or jobs will be inconsistent. Setting the time zone explicitly - and ideally to UTC - eliminates ambiguity.

## Checking the Current Time Zone

```sql
SELECT @@global.time_zone, @@session.time_zone;
```

A result of `SYSTEM` means MySQL defers to the OS time zone. A named zone like `UTC` or `America/New_York` means a specific zone is configured.

```sql
SELECT NOW(), UTC_TIMESTAMP();
```

If `NOW()` and `UTC_TIMESTAMP()` differ, the server is not running in UTC.

## Setting the Time Zone Globally at Runtime

```sql
SET GLOBAL time_zone = '+00:00';
```

This change applies to new connections immediately but does not persist across server restarts. Existing sessions keep their current session time zone. You can also use a named zone like `'UTC'` instead of `'+00:00'`, but named zones require the time zone tables to be loaded first (see "Loading Named Time Zone Data" below).

Confirm the change:

```sql
SELECT @@global.time_zone;
-- +00:00
```

## Setting the Time Zone for the Current Session

```sql
SET time_zone = 'America/New_York';
SELECT NOW();  -- returns current time in Eastern Time
```

This is useful for testing or for applications that need to display times in a user's local zone while storing UTC in the database.

## Persisting the Time Zone in my.cnf

Edit `/etc/mysql/my.cnf` or `/etc/my.cnf` (location varies by distribution):

```text
[mysqld]
default-time-zone = '+00:00'
```

Or use a named time zone (requires time zone tables to be loaded first - see below):

```text
[mysqld]
default-time-zone = 'UTC'
```

Restart MySQL after editing:

```bash
sudo systemctl restart mysql
```

## Loading Named Time Zone Data

Named zones like `America/Chicago` require the time zone tables in the `mysql` system database. On Linux, populate them from the OS zone data:

```bash
mysql_tzinfo_to_sql /usr/share/zoneinfo | mysql -u root -p mysql
```

On systems without `/usr/share/zoneinfo` (e.g., some minimal Docker images), download the prebuilt SQL file from the MySQL downloads page:

```bash
mysql -u root -p mysql < timezone_posix.sql
```

After loading, restart MySQL so that it does not continue to serve previously cached time zone data:

```bash
sudo systemctl restart mysql
```

Verify that the tables are populated:

```sql
SELECT COUNT(*) FROM mysql.time_zone_name;
-- Should return hundreds of rows
```

## Per-Connection Time Zone in Application Code

Set the time zone immediately after opening a connection so that all timestamps in that session are consistent:

```sql
SET time_zone = 'UTC';
```

In a connection pool configuration (e.g., Java, Node.js), use the `connectionInitSql` or `initCommand` option:

```text
initCommand=SET time_zone='UTC'
```

## Time Zone and TIMESTAMP vs DATETIME

`TIMESTAMP` columns are stored internally as UTC and converted to the session time zone on read. `DATETIME` columns store the literal value you insert with no time zone conversion. This distinction matters when clients connect from different time zones:

```sql
CREATE TABLE demo (
  ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  dt DATETIME  DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO demo () VALUES ();

SELECT ts, dt FROM demo;
-- ts: converted to session TZ on retrieval
-- dt: always the literal value inserted
```

## Summary

Configure the MySQL server time zone by setting `default-time-zone = UTC` in `my.cnf` and restarting the server. Load named time zone data with `mysql_tzinfo_to_sql` if you need zone names beyond numeric offsets. Set the session time zone per connection for application code that must display times in a local zone. Use `TIMESTAMP` for audit columns that need automatic UTC conversion, and `DATETIME` when you want to store a literal wall-clock value.
