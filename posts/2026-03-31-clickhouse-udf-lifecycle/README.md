# How to Manage UDF Lifecycle in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, UDF, Lifecycle, Create, DROP, Replace

Description: Learn how to manage the full lifecycle of UDFs in ClickHouse, including creating, replacing, dropping, and versioning SQL and executable UDFs.

---

Managing UDF lifecycle in ClickHouse involves creating, updating, versioning, and removing both SQL and executable UDFs. Understanding how each type stores its definition affects how you deploy changes safely.

## Creating SQL UDFs

```sql
CREATE FUNCTION myCalc AS (a, b) ->
    round(a / greatest(b, 1) * 100, 2);
```

SQL UDFs are stored persistently in ClickHouse's metadata and survive server restarts.

## Replacing SQL UDFs

Use `CREATE OR REPLACE` to update a UDF atomically:

```sql
CREATE OR REPLACE FUNCTION myCalc AS (a, b) ->
    if(b = 0, 0.0, round(toFloat64(a) / toFloat64(b) * 100, 2));
```

The old version is replaced instantly with no downtime.

## Dropping SQL UDFs

```sql
DROP FUNCTION myCalc;
```

Trying to call a dropped UDF raises an exception. Verify deletion:

```sql
SELECT name FROM system.functions WHERE name = 'myCalc';
-- Returns empty result
```

## Listing All SQL UDFs

```sql
SELECT name, create_query
FROM system.functions
WHERE origin = 'SQLUserDefined'
ORDER BY name;
```

## Managing Executable UDFs

Executable UDFs are defined in XML files in the `user_defined` configuration directory. After adding or modifying these files, reload the definitions:

```sql
SYSTEM RELOAD FUNCTIONS;
```

## Updating an Executable UDF

1. Update the script file:

```bash
sudo vim /var/lib/clickhouse/user_scripts/my_func.py
```

2. If changing the XML config (arguments, return type):

```bash
sudo vim /etc/clickhouse-server/user_defined/my_func.xml
```

3. Reload:

```sql
SYSTEM RELOAD FUNCTIONS;
```

## Versioning Strategy for SQL UDFs

Since ClickHouse does not support named versions, use a naming convention:

```sql
CREATE FUNCTION calcV2 AS (a, b, c) -> a + b * c;
-- Test calcV2 before dropping calcV1
DROP FUNCTION calcV1;
CREATE OR REPLACE FUNCTION calc AS (a, b, c) -> a + b * c;
```

## Removing an Executable UDF

Delete the XML configuration file and reload:

```bash
sudo rm /etc/clickhouse-server/user_defined/my_func.xml
```

```sql
SYSTEM RELOAD FUNCTIONS;
```

Verify:

```sql
SELECT name FROM system.functions WHERE name = 'myFunc';
```

## Backup and Export

Export all SQL UDF definitions for backup or migration:

```sql
SELECT name, create_query
FROM system.functions
WHERE origin = 'SQLUserDefined'
INTO OUTFILE '/tmp/udf_backup.sql'
FORMAT TabSeparated;
```

## Deployment Best Practices

- Use `CREATE OR REPLACE` for SQL UDFs to avoid errors when re-running migrations
- Test new UDF versions in a staging environment before replacing production
- Track executable UDF scripts in version control
- Document expected input/output types in comments inside the script

## Summary

ClickHouse SQL UDFs are stored in metadata and managed via `CREATE FUNCTION`, `CREATE OR REPLACE FUNCTION`, and `DROP FUNCTION`. Executable UDFs are driven by XML config files and reloaded via `SYSTEM RELOAD FUNCTIONS`. Following a versioning convention and using `CREATE OR REPLACE` ensures safe zero-downtime updates to production UDFs.
