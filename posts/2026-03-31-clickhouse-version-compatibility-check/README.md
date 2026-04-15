# How to Check ClickHouse Version Compatibility Before Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Upgrade, Compatibility, Version, Migration

Description: Learn how to verify ClickHouse version compatibility before upgrading, including checking deprecated settings, SQL changes, and client-server version mismatches.

---

Upgrading ClickHouse without checking compatibility can break queries, cause configuration errors, or create replication issues. A thorough compatibility check before upgrading prevents unpleasant surprises in production.

## Check Current Version

Start by knowing exactly what you are running:

```sql
SELECT version();
```

```bash
clickhouse-server --version
clickhouse-client --version
```

Note any version mismatches between server and client, as they can cause issues.

## Review Incompatible Changes in the Changelog

ClickHouse maintains a detailed changelog at `https://github.com/ClickHouse/ClickHouse/blob/master/CHANGELOG.md`. Filter for `Incompatible Change` entries between your current and target version:

```bash
# Download and search changelog
curl -s https://raw.githubusercontent.com/ClickHouse/ClickHouse/master/CHANGELOG.md | \
  grep -A3 "Incompatible change"
```

## Check Deprecated Settings in Use

```sql
-- Find deprecated settings currently active
SELECT
    name,
    value,
    description
FROM system.settings
WHERE description ILIKE '%deprecated%'
   OR description ILIKE '%obsolete%'
ORDER BY name;
```

Also check server settings:

```sql
SELECT name, value, description
FROM system.server_settings
WHERE description ILIKE '%deprecated%';
```

## Verify Configuration File Compatibility

New ClickHouse versions sometimes add required configuration keys or change XML structure. Validate the XML syntax of your configuration file before upgrading:

```bash
xmllint --noout /etc/clickhouse-server/config.xml
```

This checks that the configuration XML is well-formed. To further verify that ClickHouse can parse the configuration, start the server and check the logs for configuration-related errors.

## Check for Removed or Renamed Functions

Query the system to find functions you use that may have changed:

```sql
-- List all available functions in current version
SELECT name, is_aggregate, case_insensitive
FROM system.functions
ORDER BY name;
```

Search your query logs for functions mentioned in the changelog as changed:

```sql
SELECT query, count() AS cnt
FROM system.query_log
WHERE query_start_time >= now() - INTERVAL 30 DAY
  AND query LIKE '%anyLast%'  -- check a specific function
GROUP BY query
ORDER BY cnt DESC
LIMIT 10;
```

## Check Table Engine Compatibility

Some table engines or parameters may change behavior between versions:

```sql
SELECT
    database,
    name,
    engine,
    engine_full
FROM system.tables
WHERE database NOT IN ('system', 'information_schema')
ORDER BY engine, database, name;
```

Pay special attention to `ReplicatedMergeTree` tables as replication protocol changes can affect clusters.

## Check Replication Compatibility

In a cluster, replicas must be at compatible versions. Check all replica versions:

```sql
-- On each node, check version
SELECT hostName(), version();

-- Check replication health
SELECT
    database,
    table,
    is_leader,
    total_replicas,
    active_replicas
FROM system.replicas;
```

## Test with a Shadow Upgrade

Before production, run a compatibility test:

```bash
# Install the new version alongside old (if possible) or in a Docker container
docker run -d --name ch-new \
  -v /var/lib/clickhouse:/var/lib/clickhouse \
  -p 19000:9000 \
  clickhouse/clickhouse-server:24.3

# Connect and run compatibility checks
clickhouse-client --port 19000 --multiquery --query "SELECT version(); SELECT count() FROM my_db.my_table;"
```

## Generating a Compatibility Report

Create a pre-upgrade compatibility report:

```bash
clickhouse-client --query "
SELECT 'version' AS check, version() AS value
UNION ALL
SELECT 'tables', toString(count()) FROM system.tables WHERE database NOT IN ('system')
UNION ALL
SELECT 'replicas', toString(count()) FROM system.replicas
UNION ALL
SELECT 'deprecated_settings', toString(count()) FROM system.settings WHERE description ILIKE '%deprecated%' AND changed = 1
" --format PrettyCompact
```

## Summary

Version compatibility checks before ClickHouse upgrades should cover deprecated settings, incompatible SQL changes, configuration file validity, and table engine compatibility. Use `xmllint` to validate configuration syntax before starting, review the changelog for incompatible changes, and test on a Docker instance or staging environment before touching production.
