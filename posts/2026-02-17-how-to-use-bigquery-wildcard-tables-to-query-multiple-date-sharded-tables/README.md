# How to Use BigQuery Wildcard Tables to Query Multiple Date-Sharded Tables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Wildcard Tables, Date Sharding, SQL, Performance

Description: Learn how to use BigQuery wildcard tables to efficiently query across multiple date-sharded tables, including filtering with _TABLE_SUFFIX and optimizing query costs.

---

Date-sharded tables are a common pattern in BigQuery where data is split across multiple tables with dates in their names, like `events_20260101`, `events_20260102`, and so on. Google Analytics, Firebase, and many data pipelines use this approach. Querying these tables one at a time would be tedious, so BigQuery provides wildcard tables - a way to query all matching tables with a single SQL statement.

Wildcard tables use the `*` operator in the table name to match multiple tables, and the `_TABLE_SUFFIX` pseudo-column lets you filter which specific tables to include. This keeps your queries efficient by only scanning the tables you need.

## Basic Wildcard Table Syntax

The wildcard replaces the variable part of the table name.

```sql
-- Query all tables matching the pattern events_*
SELECT
    event_type,
    user_id,
    event_timestamp
FROM
    `my-project-id.analytics.events_*`
LIMIT 100;
```

This queries every table in the `analytics` dataset whose name starts with `events_`. If you have tables named `events_20260101` through `events_20260217`, this query scans all of them.

## Filtering with _TABLE_SUFFIX

The `_TABLE_SUFFIX` pseudo-column contains the part of the table name that matched the wildcard. Use it to filter which tables to scan.

```sql
-- Query only tables from January 2026
SELECT
    event_type,
    COUNT(*) AS event_count
FROM
    `my-project-id.analytics.events_*`
WHERE
    _TABLE_SUFFIX BETWEEN '20260101' AND '20260131'
GROUP BY
    event_type
ORDER BY
    event_count DESC;
```

This only scans the 31 tables for January, not every `events_*` table in the dataset. This is critical for controlling costs - without the `_TABLE_SUFFIX` filter, you scan all matching tables.

## Common Filtering Patterns

### Last N Days

```sql
-- Query the last 7 days of data
SELECT
    event_type,
    user_id,
    event_timestamp
FROM
    `my-project-id.analytics.events_*`
WHERE
    _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))
    AND _TABLE_SUFFIX <= FORMAT_DATE('%Y%m%d', CURRENT_DATE());
```

### Specific Month

```sql
-- Query all data from February 2026
SELECT *
FROM `my-project-id.analytics.events_*`
WHERE _TABLE_SUFFIX LIKE '202602%';
```

### Specific Dates

```sql
-- Query specific dates
SELECT *
FROM `my-project-id.analytics.events_*`
WHERE _TABLE_SUFFIX IN ('20260214', '20260215', '20260216');
```

### Year Range

```sql
-- Query all data from 2025 and 2026
SELECT *
FROM `my-project-id.analytics.events_*`
WHERE _TABLE_SUFFIX >= '20250101' AND _TABLE_SUFFIX <= '20261231';
```

## Using _TABLE_SUFFIX in SELECT

You can include `_TABLE_SUFFIX` in your SELECT clause to know which table each row came from.

```sql
-- Include the source table date in results
SELECT
    _TABLE_SUFFIX AS table_date,
    event_type,
    COUNT(*) AS event_count,
    COUNT(DISTINCT user_id) AS unique_users
FROM
    `my-project-id.analytics.events_*`
WHERE
    _TABLE_SUFFIX >= '20260201'
GROUP BY
    table_date, event_type
ORDER BY
    table_date, event_count DESC;
```

## Converting _TABLE_SUFFIX to a Date

`_TABLE_SUFFIX` is a string, so you need to parse it for date operations.

```sql
-- Convert _TABLE_SUFFIX to a proper date for calculations
SELECT
    PARSE_DATE('%Y%m%d', _TABLE_SUFFIX) AS event_date,
    COUNT(*) AS event_count
FROM
    `my-project-id.analytics.events_*`
WHERE
    _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY))
GROUP BY
    event_date
ORDER BY
    event_date;
```

## Wildcard Tables with Google Analytics Data

Google Analytics 4 exports to BigQuery using date-sharded tables. Here is how to query them efficiently.

```sql
-- Query GA4 events for the last 7 days
SELECT
    event_name,
    COUNT(*) AS event_count,
    COUNT(DISTINCT user_pseudo_id) AS unique_users
FROM
    `my-project-id.analytics_12345678.events_*`
WHERE
    _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))
GROUP BY
    event_name
ORDER BY
    event_count DESC
LIMIT 20;
```

GA4 also creates an `events_intraday_*` table for today's data:

```sql
-- Include today's intraday data with historical data
SELECT event_name, COUNT(*) AS event_count
FROM (
    -- Historical data
    SELECT event_name
    FROM `my-project-id.analytics_12345678.events_*`
    WHERE _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY))
      AND _TABLE_SUFFIX < FORMAT_DATE('%Y%m%d', CURRENT_DATE())

    UNION ALL

    -- Today's intraday data
    SELECT event_name
    FROM `my-project-id.analytics_12345678.events_intraday_*`
    WHERE _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', CURRENT_DATE())
)
GROUP BY event_name
ORDER BY event_count DESC;
```

## Cost Optimization

Wildcard table queries can be expensive if you are not careful. Here is how to keep costs under control.

### Always Use _TABLE_SUFFIX Filters

Without a filter, BigQuery scans all matching tables.

```sql
-- BAD: Scans every events_* table (could be years of data)
SELECT COUNT(*) FROM `my-project-id.analytics.events_*`;

-- GOOD: Scans only today's table
SELECT COUNT(*)
FROM `my-project-id.analytics.events_*`
WHERE _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', CURRENT_DATE());
```

### Use Dry Run to Check Bytes Scanned

Before running an expensive query, check how much data it will scan.

```bash
# Dry run to check bytes scanned
bq query --nouse_legacy_sql --dry_run \
    "SELECT * FROM \`my-project-id.analytics.events_*\` WHERE _TABLE_SUFFIX >= '20260201'"
```

### Limit Columns in SELECT

Only select the columns you need. BigQuery charges per bytes scanned, and selecting fewer columns means less data processed.

```sql
-- BAD: SELECT * scans all columns across all matching tables
SELECT * FROM `my-project-id.analytics.events_*`
WHERE _TABLE_SUFFIX >= '20260201';

-- GOOD: Only scan the columns you need
SELECT event_type, user_id, event_timestamp
FROM `my-project-id.analytics.events_*`
WHERE _TABLE_SUFFIX >= '20260201';
```

## Wildcard Tables vs Partitioned Tables

If you are designing a new table structure, partitioned tables are generally better than date-sharded tables.

| Feature | Wildcard (Date-Sharded) | Partitioned Table |
|---------|------------------------|-------------------|
| Setup | Multiple tables | Single table |
| Query syntax | Uses _TABLE_SUFFIX | Uses partition column |
| Metadata | Separate for each table | Unified |
| Maintenance | Manage many tables | Manage one table |
| Access control | Per table possible | Single table |
| Cost optimization | _TABLE_SUFFIX filter | Partition filter |

If you have existing date-sharded tables, you can migrate to a partitioned table:

```sql
-- Migrate date-sharded tables to a single partitioned table
CREATE TABLE `my-project-id.analytics.events_partitioned`
PARTITION BY DATE(event_timestamp)
AS
SELECT
    *,
    PARSE_DATE('%Y%m%d', _TABLE_SUFFIX) AS shard_date
FROM
    `my-project-id.analytics.events_*`;
```

## Querying Non-Date Sharded Tables

Wildcard tables work with any naming pattern, not just dates.

```sql
-- Query tables sharded by region
SELECT *
FROM `my-project-id.regional_data.users_*`
WHERE _TABLE_SUFFIX IN ('us', 'eu', 'apac');

-- Query tables sharded by category
SELECT *
FROM `my-project-id.catalog.products_*`
WHERE _TABLE_SUFFIX LIKE 'electronics%';
```

## Views over Wildcard Tables

Create views to simplify wildcard table queries for your team.

```sql
-- Create a view that provides a clean interface over date-sharded tables
CREATE VIEW `my-project-id.analytics.recent_events` AS
SELECT
    PARSE_DATE('%Y%m%d', _TABLE_SUFFIX) AS event_date,
    event_type,
    user_id,
    event_timestamp,
    event_properties
FROM
    `my-project-id.analytics.events_*`
WHERE
    _TABLE_SUFFIX >= FORMAT_DATE('%Y%m%d', DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY));
```

Now users can query the view without worrying about wildcard syntax:

```sql
-- Clean query against the view
SELECT event_type, COUNT(*) AS count
FROM `my-project-id.analytics.recent_events`
WHERE event_date >= '2026-02-01'
GROUP BY event_type;
```

## Troubleshooting

**"Not found: Table" error**: Make sure at least one table matches the wildcard pattern. If the dataset has no tables starting with the prefix, the query fails.

**Unexpected columns or schema mismatches**: All tables matched by the wildcard should have compatible schemas. If table A has a column that table B does not, queries selecting that column will fail on table B's rows.

**Scanning too much data**: Always check the bytes processed estimate. Add `_TABLE_SUFFIX` filters to narrow the scope.

**_TABLE_SUFFIX returning unexpected values**: Remember that the suffix is everything after the prefix you specified. For `events_*`, the suffix of `events_20260217` is `20260217`. For `e*`, the suffix of `events_20260217` is `vents_20260217`.

## Summary

Wildcard tables let you query multiple date-sharded BigQuery tables with a single SQL statement. The `_TABLE_SUFFIX` pseudo-column is your primary tool for filtering which tables to scan, and using it properly is critical for controlling costs. Always include a `_TABLE_SUFFIX` filter, select only the columns you need, and use dry runs to estimate costs before running large queries. For new projects, consider partitioned tables instead of date-sharding, but for existing sharded tables, wildcard queries work well.
