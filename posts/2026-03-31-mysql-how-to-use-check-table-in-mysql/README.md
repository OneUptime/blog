# How to Use CHECK TABLE in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, CHECK TABLE, Table Maintenance, Data Integrity

Description: Learn how to use CHECK TABLE in MySQL to verify table integrity, detect corruption, and interpret the diagnostic output for InnoDB and MyISAM tables.

---

## What Is CHECK TABLE

`CHECK TABLE` checks one or more tables for errors. It examines the table structure and data to detect corruption or consistency problems. It is a read-only operation - it does not modify the table.

Use it after:
- A server crash or power failure
- Unexpected query errors referencing specific tables
- Routine maintenance checks

## Syntax

```sql
CHECK TABLE table_name;
CHECK TABLE table1, table2;
CHECK TABLE table_name EXTENDED;
CHECK TABLE table_name QUICK;
CHECK TABLE table_name CHANGED;
CHECK TABLE table_name FOR UPGRADE;
```

## Check Options

| Option | Description |
|---|---|
| (default) | Performs the standard check |
| `QUICK` | Does not scan the rows to check for incorrect links (fastest) |
| `FAST` | Checks only tables not properly closed |
| `CHANGED` | Checks tables changed since last check or not properly closed |
| `MEDIUM` | Scans rows to verify that deleted links are valid and calculates key checksums |
| `EXTENDED` | Full row and index check (slowest, most thorough) |

## Running a Basic Check

```sql
CHECK TABLE mydb.orders;
```

```text
+-------------+-------+----------+----------+
| Table       | Op    | Msg_type | Msg_text |
+-------------+-------+----------+----------+
| mydb.orders | check | status   | OK       |
+-------------+-------+----------+----------+
```

`status: OK` means no problems were found.

## Interpreting Error Output

If corruption is found:

```text
+-------------+-------+----------+-------------------------------------------------------------------+
| Table       | Op    | Msg_type | Msg_text                                                          |
+-------------+-------+----------+-------------------------------------------------------------------+
| mydb.orders | check | warning  | 1 client is using or hasn't closed the table properly             |
| mydb.orders | check | error    | Record at pos: 1234 is not in a block that starts at 1000         |
| mydb.orders | check | error    | Corrupt                                                           |
+-------------+-------+----------+-------------------------------------------------------------------+
```

`Msg_type` values:
- `status` - informational, usually `OK`
- `info` - general information
- `note` - additional details about the check
- `warning` - minor issues, table may still work
- `error` - table is corrupted and needs repair

## Checking InnoDB vs MyISAM Tables

### InnoDB

For InnoDB tables, `CHECK TABLE` reads all rows and validates the data dictionary. If InnoDB detects corruption, it may also log messages to the MySQL error log:

```bash
tail -50 /var/log/mysql/error.log | grep -i corrupt
```

### MyISAM

For MyISAM, `CHECK TABLE` is more thorough and can detect index corruption at the file level. Follow up with `REPAIR TABLE` if errors are found.

## Checking All Tables in a Database

Use `mysqlcheck`:

```bash
# Check a single database
mysqlcheck -u root -p mydb

# Check a specific table
mysqlcheck -u root -p mydb orders

# Check all databases
mysqlcheck -u root -p --all-databases

# Check and auto-repair if needed (MyISAM only)
mysqlcheck -u root -p --check --auto-repair mydb
```

## Automating Checks with MySQL Events

```sql
CREATE EVENT check_tables_monthly
ON SCHEDULE EVERY 1 MONTH
STARTS '2026-04-01 03:00:00'
DO
  CHECK TABLE mydb.orders, mydb.customers, mydb.products;
```

## What to Do After Finding Errors

- For InnoDB: restore from backup or use `innodb_force_recovery` to extract data
- For MyISAM: run `REPAIR TABLE`

Check if InnoDB can recover automatically by restarting MySQL. InnoDB has its own crash recovery mechanism that runs at startup.

## Summary

`CHECK TABLE` is a non-destructive diagnostic command that verifies table integrity. It is most useful for MyISAM tables and after system crashes. For InnoDB, the main value is detecting obvious data dictionary issues; actual data corruption is usually caught by InnoDB's own checksum mechanisms. Run `mysqlcheck --all-databases` periodically as part of routine maintenance.
