# How to Debug Dictionary Loading Failures in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Dictionary, Debugging, Troubleshooting, Configuration

Description: Learn how to debug ClickHouse dictionary loading failures including source connection errors, schema mismatches, and reload problems.

---

## What Are ClickHouse Dictionaries?

Dictionaries are in-memory lookup tables that allow fast key-value lookups in queries. They can be loaded from various sources: files, MySQL, PostgreSQL, HTTP, and other ClickHouse tables. When loading fails, queries that depend on the dictionary will fail.

## Step 1: Check Dictionary Status

```sql
SELECT
    database,
    name,
    status,
    origin,
    last_successful_update_time,
    last_exception
FROM system.dictionaries
ORDER BY name;
```

The `status` column shows the current state:

```text
NOT_LOADED       - Never attempted
LOADED           - Healthy
FAILED           - Last load attempt failed
LOADING          - Currently loading
FAILED_AND_RELOADING - Failed, retrying
```

## Step 2: Read the Last Exception

```sql
SELECT name, last_exception
FROM system.dictionaries
WHERE status = 'FAILED';
```

Common exceptions:

```text
"Connection refused" - Source database unreachable
"Authentication failed" - Wrong credentials
"Table ... does not exist" - Source table missing
"Cannot parse type" - Schema mismatch
```

## Step 3: Test Source Connectivity

For a MySQL-backed dictionary, test the connection from the ClickHouse host:

```bash
mysql -h mysql-host -u clickhouse_user -p -e "SELECT 1"
```

For a file-based dictionary, check the file exists and is readable:

```bash
ls -la /etc/clickhouse-server/dictionaries/geo_data.csv
```

## Step 4: Manually Reload a Dictionary

```sql
SYSTEM RELOAD DICTIONARY geo_ip;
```

Check the status immediately after:

```sql
SELECT name, status, last_exception
FROM system.dictionaries
WHERE name = 'geo_ip';
```

## Step 5: Reload All Dictionaries

```sql
SYSTEM RELOAD DICTIONARIES;
```

## Step 6: Validate the Dictionary Configuration

Check the DDL or XML config for typos:

```sql
SHOW CREATE DICTIONARY geo_ip;
```

Or inspect the config file:

```xml
<dictionary>
  <name>geo_ip</name>
  <source>
    <file>
      <path>/etc/clickhouse-server/dictionaries/geo_ip.csv</path>
      <format>CSV</format>
    </file>
  </source>
  <lifetime>
    <min>300</min>
    <max>600</max>
  </lifetime>
  <layout><flat/></layout>
  <structure>
    <id><name>ip_range_start</name></id>
    <attribute>
      <name>country_code</name>
      <type>String</type>
      <null_value></null_value>
    </attribute>
  </structure>
</dictionary>
```

## Step 7: Check Dictionary Memory Usage

A large dictionary may fail to load if the server is out of memory:

```sql
SELECT
    name,
    bytes_allocated,
    element_count
FROM system.dictionaries
WHERE status = 'LOADED'
ORDER BY bytes_allocated DESC;
```

## Step 8: Test the Dictionary Lookup

After successful loading, verify the data is correct:

```sql
SELECT dictGet('geo_ip', 'country_code', toIPv4('8.8.8.8'));
```

## Summary

Debug dictionary loading failures by checking `system.dictionaries` for status and last exception, testing source connectivity directly, and manually reloading with `SYSTEM RELOAD DICTIONARY`. Common fixes involve correcting source credentials, ensuring the source table or file exists, and resolving schema mismatches between the dictionary definition and source data.
