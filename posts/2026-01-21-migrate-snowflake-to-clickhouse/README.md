# How to Migrate from Snowflake to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Snowflake, Migration, Data Warehouse, Cost Savings, Self-Hosted Analytics

Description: A comprehensive guide to migrating from Snowflake to ClickHouse, covering schema mapping, data export, query translation, and achieving significant cost savings with self-hosted analytics.

---

Snowflake's consumption-based pricing can lead to unpredictable and rapidly growing costs. Migrating to ClickHouse offers predictable pricing and often superior performance for analytical workloads. This guide provides a complete migration path.

## Cost Savings Analysis

### Snowflake vs ClickHouse Cost Comparison

| Cost Factor | Snowflake | ClickHouse (Self-Hosted) |
|-------------|-----------|--------------------------|
| Compute (X-Small, 8hr/day) | ~$2,400/mo | ~$400/mo (equivalent) |
| Storage (10 TB) | ~$230/mo | ~$100/mo |
| Data Transfer | $0.02-0.05/GB | Minimal |
| Serverless Tasks | Usage-based | Included |
| **Typical Monthly** | **$5,000-20,000** | **$1,000-3,000** |

Typical savings: 60-80% reduction in costs

## Pre-Migration Assessment

### Analyze Snowflake Usage

```sql
-- Snowflake: Query history analysis
SELECT
    QUERY_TYPE,
    COUNT(*) as query_count,
    AVG(TOTAL_ELAPSED_TIME) as avg_time_ms,
    SUM(BYTES_SCANNED) as total_bytes,
    SUM(CREDITS_USED_CLOUD_SERVICES) as credits
FROM SNOWFLAKE.ACCOUNT_USAGE.QUERY_HISTORY
WHERE START_TIME >= DATEADD('day', -30, CURRENT_TIMESTAMP())
GROUP BY QUERY_TYPE
ORDER BY total_bytes DESC;

-- Identify largest tables
SELECT
    TABLE_SCHEMA,
    TABLE_NAME,
    ROW_COUNT,
    BYTES / (1024*1024*1024) as size_gb
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY BYTES DESC
LIMIT 50;
```

### Schema Mapping

| Snowflake Type | ClickHouse Type |
|----------------|-----------------|
| VARCHAR, STRING, TEXT | String |
| NUMBER(38,0) | Int64 or Int128 |
| NUMBER(38,N) | Decimal128(N) |
| FLOAT, DOUBLE | Float64 |
| BOOLEAN | UInt8 |
| DATE | Date |
| TIMESTAMP_NTZ | DateTime64(6) |
| TIMESTAMP_TZ | DateTime64(6) with timezone |
| TIMESTAMP_LTZ | DateTime64(6) |
| VARIANT | String (JSON) |
| ARRAY | Array(Type) |
| OBJECT | Map(String, String) |

## Schema Conversion

### Snowflake Table

```sql
-- Snowflake schema
CREATE TABLE analytics.events (
    event_id VARCHAR(36),
    event_timestamp TIMESTAMP_NTZ,
    user_id NUMBER(38,0),
    session_id VARCHAR(100),
    event_name VARCHAR(50),
    event_properties VARIANT,
    geo_data OBJECT,
    items ARRAY,
    revenue NUMBER(18,2)
)
CLUSTER BY (event_timestamp, user_id);
```

### ClickHouse Equivalent

```sql
-- ClickHouse schema
CREATE TABLE events (
    event_id UUID,
    event_timestamp DateTime64(6),
    event_date Date MATERIALIZED toDate(event_timestamp),
    user_id Int64,
    session_id String,
    event_name LowCardinality(String),
    -- VARIANT as JSON string
    event_properties String,
    -- OBJECT as Map
    geo_data Map(String, String),
    -- ARRAY as Array of Tuples
    items Array(Tuple(item_id String, quantity Int32, price Decimal64(2))),
    revenue Decimal64(2)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_timestamp)
ORDER BY (user_id, event_timestamp, event_id)
SETTINGS index_granularity = 8192;
```

### Handling VARIANT Type

```sql
-- Snowflake: VARIANT column access
SELECT
    event_properties:page_url::STRING as page_url,
    event_properties:utm_source::STRING as utm_source,
    event_properties:items[0]:product_id::STRING as first_product
FROM events;

-- ClickHouse: JSON string access
SELECT
    JSONExtractString(event_properties, 'page_url') as page_url,
    JSONExtractString(event_properties, 'utm_source') as utm_source,
    JSONExtractString(
        JSONExtractRaw(
            JSONExtractRaw(event_properties, 'items'),
            '1'
        ),
        'product_id'
    ) as first_product
FROM events;

-- Better: Pre-extract common fields as columns
CREATE TABLE events_optimized (
    event_id UUID,
    event_timestamp DateTime64(6),
    user_id Int64,
    event_name LowCardinality(String),
    -- Extract common fields
    page_url String MATERIALIZED JSONExtractString(event_properties, 'page_url'),
    utm_source LowCardinality(String) MATERIALIZED JSONExtractString(event_properties, 'utm_source'),
    -- Keep full JSON for flexibility
    event_properties String
) ENGINE = MergeTree()
ORDER BY (user_id, event_timestamp);
```

## Data Export from Snowflake

### Export to S3 (Preferred)

```sql
-- Create external stage
CREATE OR REPLACE STAGE migration_stage
    URL = 's3://your-bucket/snowflake-export/'
    CREDENTIALS = (AWS_KEY_ID='...' AWS_SECRET_KEY='...')
    FILE_FORMAT = (TYPE = PARQUET);

-- Export table to S3
COPY INTO @migration_stage/events/
FROM (
    SELECT
        event_id,
        event_timestamp,
        user_id,
        session_id,
        event_name,
        TO_VARCHAR(event_properties) as event_properties,
        OBJECT_CONSTRUCT(*) as geo_data,  -- Convert OBJECT
        items,
        revenue
    FROM analytics.events
)
FILE_FORMAT = (TYPE = PARQUET)
HEADER = TRUE
OVERWRITE = TRUE
MAX_FILE_SIZE = 268435456;  -- 256 MB files

-- Export with date partitioning for large tables
COPY INTO @migration_stage/events/year=2024/month=01/
FROM (
    SELECT * FROM analytics.events
    WHERE event_timestamp >= '2024-01-01'
      AND event_timestamp < '2024-02-01'
)
FILE_FORMAT = (TYPE = PARQUET);
```

### Export Using Snowflake CLI

```bash
# snowsql export
snowsql -c my_connection -q "
    COPY INTO @migration_stage/events/
    FROM analytics.events
    FILE_FORMAT = (TYPE = PARQUET)
"
```

## Data Import to ClickHouse

### Import from S3

```sql
-- Direct import from S3
INSERT INTO events
SELECT
    event_id,
    event_timestamp,
    user_id,
    session_id,
    event_name,
    event_properties,
    geo_data,
    items,
    revenue
FROM s3(
    'https://your-bucket.s3.amazonaws.com/snowflake-export/events/*.parquet',
    'AWS_ACCESS_KEY',
    'AWS_SECRET_KEY',
    'Parquet'
)
SETTINGS max_insert_threads = 8;

-- Parallel import with cluster
INSERT INTO events
SELECT * FROM s3Cluster(
    'default',
    'https://your-bucket.s3.amazonaws.com/snowflake-export/events/*.parquet',
    'AWS_ACCESS_KEY',
    'AWS_SECRET_KEY',
    'Parquet'
)
SETTINGS parallel_distributed_insert_select = 1;
```

### Incremental Migration

```sql
-- Track migration progress
CREATE TABLE migration_progress (
    table_name String,
    partition_date Date,
    rows_migrated UInt64,
    migrated_at DateTime DEFAULT now()
) ENGINE = MergeTree()
ORDER BY (table_name, partition_date);

-- Migrate by date partition
INSERT INTO events
SELECT * FROM s3(
    'https://bucket.s3.amazonaws.com/events/year=2024/month=01/*.parquet',
    '...', '...', 'Parquet'
);

INSERT INTO migration_progress VALUES ('events', '2024-01-01', 1000000);
```

## Query Translation

### Date/Time Functions

```sql
-- Snowflake
SELECT
    DATE_TRUNC('hour', event_timestamp) as hour,
    DATEDIFF('day', first_purchase, event_timestamp) as days_since_first,
    DATEADD('day', 7, event_timestamp) as plus_7_days,
    TO_CHAR(event_timestamp, 'YYYY-MM-DD') as date_string
FROM events;

-- ClickHouse
SELECT
    toStartOfHour(event_timestamp) as hour,
    dateDiff('day', first_purchase, event_timestamp) as days_since_first,
    event_timestamp + INTERVAL 7 DAY as plus_7_days,
    formatDateTime(event_timestamp, '%Y-%m-%d') as date_string
FROM events;
```

### Conditional Expressions

```sql
-- Snowflake
SELECT
    IFF(revenue > 100, 'high', 'low') as value_tier,
    IFNULL(utm_source, 'direct') as source,
    NULLIF(status, 'unknown') as clean_status,
    COALESCE(preferred_name, first_name, 'Guest') as display_name,
    DECODE(status, 'A', 'Active', 'I', 'Inactive', 'Unknown') as status_text
FROM events;

-- ClickHouse
SELECT
    if(revenue > 100, 'high', 'low') as value_tier,
    ifNull(utm_source, 'direct') as source,
    nullIf(status, 'unknown') as clean_status,
    coalesce(preferred_name, first_name, 'Guest') as display_name,
    multiIf(status = 'A', 'Active', status = 'I', 'Inactive', 'Unknown') as status_text
FROM events;
```

### Window Functions

```sql
-- Snowflake
SELECT
    user_id,
    event_timestamp,
    revenue,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY event_timestamp) as event_num,
    LAG(revenue, 1) OVER (PARTITION BY user_id ORDER BY event_timestamp) as prev_revenue,
    SUM(revenue) OVER (PARTITION BY user_id ORDER BY event_timestamp
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as running_total,
    FIRST_VALUE(event_timestamp) OVER (PARTITION BY user_id ORDER BY event_timestamp) as first_event
FROM events;

-- ClickHouse
SELECT
    user_id,
    event_timestamp,
    revenue,
    row_number() OVER (PARTITION BY user_id ORDER BY event_timestamp) as event_num,
    lagInFrame(revenue, 1) OVER (PARTITION BY user_id ORDER BY event_timestamp) as prev_revenue,
    sum(revenue) OVER (PARTITION BY user_id ORDER BY event_timestamp
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as running_total,
    first_value(event_timestamp) OVER (PARTITION BY user_id ORDER BY event_timestamp) as first_event
FROM events;
```

### Array Functions

```sql
-- Snowflake: FLATTEN for arrays
SELECT
    event_id,
    f.value:item_id::STRING as item_id,
    f.value:quantity::NUMBER as quantity
FROM events,
    LATERAL FLATTEN(input => items) f;

-- ClickHouse: ARRAY JOIN
SELECT
    event_id,
    item.1 as item_id,  -- Tuple access
    item.2 as quantity
FROM events
ARRAY JOIN items as item;

-- Or with arrayJoin
SELECT
    event_id,
    arrayJoin(items) as item
FROM events;
```

### Semi-Structured Data (VARIANT/JSON)

```sql
-- Snowflake: Dot notation and bracket notation
SELECT
    event_properties:user.name::STRING as user_name,
    event_properties['page']['url']::STRING as page_url,
    ARRAY_SIZE(event_properties:items) as item_count
FROM events;

-- ClickHouse: JSON functions
SELECT
    JSONExtractString(event_properties, 'user', 'name') as user_name,
    JSONExtractString(event_properties, 'page', 'url') as page_url,
    JSONLength(JSONExtractRaw(event_properties, 'items')) as item_count
FROM events;
```

## Handling Snowflake-Specific Features

### Time Travel (Historical Queries)

```sql
-- Snowflake: Time travel
SELECT * FROM events AT(TIMESTAMP => '2024-01-15 10:00:00');
SELECT * FROM events BEFORE(STATEMENT => '01a2b3c4-...');

-- ClickHouse: No direct equivalent, but options exist
-- 1. Partition-based snapshots
-- 2. ReplacingMergeTree with version column
-- 3. External backup/restore

-- Using ReplacingMergeTree for versioning
CREATE TABLE events_versioned (
    event_id UUID,
    event_timestamp DateTime64(6),
    user_id Int64,
    data String,
    _version UInt64 DEFAULT now64()
) ENGINE = ReplacingMergeTree(_version)
ORDER BY (user_id, event_id);
```

### Streams and Tasks

```sql
-- Snowflake: Stream for CDC
CREATE STREAM events_stream ON TABLE events;

-- Snowflake: Task for scheduling
CREATE TASK daily_agg
    WAREHOUSE = compute_wh
    SCHEDULE = 'USING CRON 0 0 * * * UTC'
AS
    INSERT INTO daily_summary SELECT ...;

-- ClickHouse: Materialized views for real-time aggregation
CREATE MATERIALIZED VIEW daily_summary_mv
ENGINE = SummingMergeTree()
ORDER BY (date, event_name)
AS SELECT
    toDate(event_timestamp) as date,
    event_name,
    count() as event_count,
    sum(revenue) as total_revenue
FROM events
GROUP BY date, event_name;

-- ClickHouse: External scheduler (cron, Airflow) for batch jobs
```

### Secure Views

```sql
-- Snowflake: Secure view
CREATE SECURE VIEW customer_data AS
SELECT * FROM customers WHERE tenant_id = CURRENT_ROLE();

-- ClickHouse: Row policies
CREATE ROW POLICY tenant_policy ON customers
FOR SELECT USING tenant_id = currentUser();
```

## Migration Script

```python
#!/usr/bin/env python3
"""Snowflake to ClickHouse Migration"""

import snowflake.connector
import clickhouse_driver
import boto3

class SnowflakeToClickHouse:
    def __init__(self, sf_config, ch_config, s3_bucket):
        self.sf_conn = snowflake.connector.connect(**sf_config)
        self.ch_client = clickhouse_driver.Client(**ch_config)
        self.s3 = boto3.client('s3')
        self.bucket = s3_bucket

    def export_to_s3(self, schema, table, date_column=None, start_date=None, end_date=None):
        """Export Snowflake table to S3"""
        cursor = self.sf_conn.cursor()

        # Build WHERE clause for incremental export
        where_clause = ""
        if date_column and start_date:
            where_clause = f"WHERE {date_column} >= '{start_date}'"
            if end_date:
                where_clause += f" AND {date_column} < '{end_date}'"

        # Export query
        prefix = f"migration/{schema}/{table}"
        query = f"""
            COPY INTO @migration_stage/{prefix}/
            FROM (SELECT * FROM {schema}.{table} {where_clause})
            FILE_FORMAT = (TYPE = PARQUET)
            HEADER = TRUE
            MAX_FILE_SIZE = 268435456
        """

        cursor.execute(query)
        print(f"Exported {schema}.{table} to s3://{self.bucket}/{prefix}/")
        return prefix

    def import_to_clickhouse(self, s3_prefix, ch_table, transform_sql=None):
        """Import from S3 to ClickHouse"""
        s3_url = f"https://{self.bucket}.s3.amazonaws.com/{s3_prefix}/*.parquet"

        if transform_sql:
            query = f"""
                INSERT INTO {ch_table}
                SELECT {transform_sql}
                FROM s3('{s3_url}', 'Parquet')
            """
        else:
            query = f"""
                INSERT INTO {ch_table}
                SELECT * FROM s3('{s3_url}', 'Parquet')
            """

        self.ch_client.execute(query)
        print(f"Imported to {ch_table}")

    def migrate_table(self, sf_schema, sf_table, ch_table, transform_sql=None):
        """Full migration for a table"""
        prefix = self.export_to_s3(sf_schema, sf_table)
        self.import_to_clickhouse(prefix, ch_table, transform_sql)

# Usage
migrator = SnowflakeToClickHouse(
    sf_config={
        'account': 'xxx.snowflakecomputing.com',
        'user': 'user',
        'password': 'pass',
        'warehouse': 'COMPUTE_WH',
        'database': 'ANALYTICS'
    },
    ch_config={'host': 'clickhouse-host'},
    s3_bucket='migration-bucket'
)

migrator.migrate_table('ANALYTICS', 'EVENTS', 'events')
```

## Validation

```sql
-- Row count comparison
-- Snowflake
SELECT COUNT(*) FROM analytics.events;

-- ClickHouse
SELECT count() FROM events;

-- Checksum validation
-- Snowflake
SELECT
    COUNT(*) as rows,
    SUM(HASH(event_id)) as checksum,
    SUM(revenue) as revenue_sum
FROM analytics.events
WHERE DATE(event_timestamp) = '2024-01-15';

-- ClickHouse
SELECT
    count() as rows,
    sum(cityHash64(event_id)) as checksum,
    sum(revenue) as revenue_sum
FROM events
WHERE toDate(event_timestamp) = '2024-01-15';
```

## Conclusion

Migrating from Snowflake to ClickHouse involves:

1. **Schema mapping** - Convert Snowflake types to ClickHouse equivalents
2. **VARIANT handling** - Extract JSON or keep as String
3. **Data export** - Use S3 as intermediate storage
4. **Query translation** - Adapt SQL syntax differences
5. **Feature mapping** - Replace Streams/Tasks with materialized views

The migration typically results in 60-80% cost savings with predictable pricing and often better query performance for analytical workloads.
