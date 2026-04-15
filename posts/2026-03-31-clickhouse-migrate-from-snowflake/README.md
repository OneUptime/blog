# How to Migrate from Snowflake to ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Snowflake, Migration, Database, Analytics, Cloud

Description: Migrate from Snowflake to ClickHouse by exporting data to S3 or local files, mapping Snowflake types, loading with ClickHouse S3 functions, and rewriting Snowflake SQL.

---

Snowflake's per-second compute billing and storage separation make it attractive at small scale, but costs grow rapidly for always-on analytical workloads. ClickHouse on self-managed infrastructure delivers comparable query performance at a fixed infrastructure cost. This guide covers migrating from Snowflake to ClickHouse.

## Cost Considerations

Snowflake costs break into two components: storage ($23/TB/month) and compute (credits per second of virtual warehouse usage). A medium warehouse running continuously costs thousands of dollars per month. ClickHouse on a dedicated server or cloud VM has a fixed monthly cost regardless of query frequency, making it significantly cheaper for high-concurrency analytical workloads.

## Data Type Mapping

| Snowflake | ClickHouse |
|----------|------------|
| NUMBER(p, 0) / INT / INTEGER | Int64 |
| NUMBER(p, s) / DECIMAL / NUMERIC | Decimal(p, s) |
| FLOAT / FLOAT4 / FLOAT8 | Float64 |
| DOUBLE / REAL | Float64 |
| VARCHAR / TEXT / STRING | String |
| CHAR(n) | FixedString(n) |
| BOOLEAN | Bool |
| DATE | Date |
| DATETIME / TIMESTAMP_NTZ | DateTime |
| TIMESTAMP_TZ | DateTime (normalize to UTC) |
| TIMESTAMP_LTZ | DateTime (convert to UTC) |
| VARIANT / OBJECT | String (use JSONExtract) |
| ARRAY | Array(T) or String |
| BINARY / VARBINARY | String |
| GEOGRAPHY | String |
| VECTOR | Array(Float32) |

## Step 1: Export from Snowflake to S3

Use Snowflake's `COPY INTO` command to export to S3:

```sql
-- Create a stage pointing to your S3 bucket
CREATE STAGE migration_stage
URL = 's3://my-migration-bucket/snowflake-export/'
CREDENTIALS = (
    AWS_KEY_ID     = 'AWS_ACCESS_KEY_ID'
    AWS_SECRET_KEY = 'AWS_SECRET_ACCESS_KEY'
);

-- Export the events table to S3 as Parquet
COPY INTO @migration_stage/events/
FROM (
    SELECT
        event_id,
        user_id,
        session_id,
        event_type,
        page,
        amount,
        CONVERT_TIMEZONE('UTC', created_at)::TIMESTAMP_NTZ AS created_at
    FROM events
    WHERE created_at >= '2024-01-01'
)
FILE_FORMAT = (TYPE = PARQUET)
OVERWRITE = TRUE
HEADER = TRUE;
```

Export as CSV (useful when Parquet types cause issues):

```sql
COPY INTO @migration_stage/events_csv/
FROM events
FILE_FORMAT = (
    TYPE             = CSV
    FIELD_OPTIONALLY_ENCLOSED_BY = '"'
    NULL_IF          = ('\\N', 'NULL', '')
    DATE_FORMAT      = 'YYYY-MM-DD'
    TIMESTAMP_FORMAT = 'YYYY-MM-DD HH24:MI:SS.FF6'
)
OVERWRITE = TRUE
HEADER = TRUE
MAX_FILE_SIZE = 256000000;
```

Export large tables in date partitions:

```sql
-- Loop through months in Snowflake
EXECUTE IMMEDIATE $$
DECLARE
    start_date DATE := '2023-01-01';
    end_date   DATE := '2025-01-01';
    cur_date   DATE := start_date;
BEGIN
    WHILE (cur_date < end_date) DO
        LET next_date DATE := DATEADD(month, 1, cur_date);
        COPY INTO @migration_stage/events/:cur_date/
        FROM (
            SELECT * FROM events
            WHERE created_at >= :cur_date AND created_at < :next_date
        )
        FILE_FORMAT = (TYPE = PARQUET)
        OVERWRITE = TRUE;
        cur_date := next_date;
    END WHILE;
END;
$$;
```

## Step 2: Design the ClickHouse Schema

Given a Snowflake table:

```sql
-- Snowflake DDL
CREATE TABLE ANALYTICS.EVENTS (
    EVENT_ID    VARCHAR(36)    NOT NULL,
    USER_ID     NUMBER(18, 0)  NOT NULL,
    SESSION_ID  VARCHAR(64),
    EVENT_TYPE  VARCHAR(64)    NOT NULL,
    PAGE        VARCHAR(512),
    AMOUNT      NUMBER(10, 2)  DEFAULT 0,
    PROPERTIES  VARIANT,
    CREATED_AT  TIMESTAMP_NTZ  DEFAULT CURRENT_TIMESTAMP()
);
```

ClickHouse equivalent:

```sql
CREATE TABLE events
(
    event_id    String,
    user_id     Int64,
    session_id  String,
    event_type  LowCardinality(String),
    page        String,
    amount      Decimal(10, 2)  DEFAULT 0,
    properties  String          DEFAULT '{}',
    created_at  DateTime
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (event_type, user_id, created_at);
```

## Step 3: Load from S3 into ClickHouse

Load Parquet files directly:

```sql
INSERT INTO events
SELECT
    event_id,
    user_id,
    session_id,
    event_type,
    page,
    amount,
    properties,
    created_at
FROM s3(
    'https://my-migration-bucket.s3.amazonaws.com/snowflake-export/events/**/*.parquet',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'Parquet'
);
```

Preview the schema of Parquet files before loading:

```sql
DESCRIBE TABLE s3(
    'https://my-migration-bucket.s3.amazonaws.com/snowflake-export/events/*.parquet',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'Parquet'
);
```

Load CSV files:

```sql
INSERT INTO events
SELECT event_id, user_id, session_id, event_type, page, amount, properties, created_at
FROM s3(
    'https://my-migration-bucket.s3.amazonaws.com/snowflake-export/events_csv/*.csv.gz',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'CSVWithNames',
    'event_id String, user_id Int64, session_id String, event_type String,
     page String, amount Decimal(10,2), properties String, created_at DateTime'
);
```

## Step 4: Rewrite Snowflake SQL

Snowflake has several proprietary functions and syntax patterns:

```sql
-- Snowflake: QUALIFY with window function
SELECT event_type, user_id, ts,
       ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY ts DESC) AS rn
FROM events
QUALIFY rn = 1;

-- ClickHouse: subquery (QUALIFY not supported)
SELECT event_type, user_id, ts
FROM (
    SELECT
        event_type, user_id, ts,
        row_number() OVER (PARTITION BY user_id ORDER BY ts DESC) AS rn
    FROM events
)
WHERE rn = 1;
```

```sql
-- Snowflake: FLATTEN (explode VARIANT arrays)
SELECT e.user_id, f.value::STRING AS tag
FROM events e,
LATERAL FLATTEN(input => PARSE_JSON(e.properties):tags) f;

-- ClickHouse: arrayJoin with JSONExtractArrayRaw
SELECT
    user_id,
    JSONExtract(tag, 'String') AS tag_value
FROM events
ARRAY JOIN JSONExtractArrayRaw(properties, 'tags') AS tag;
```

```sql
-- Snowflake: IFF
SELECT IFF(amount > 100, 'high', 'low') AS tier FROM events;

-- ClickHouse: if
SELECT if(amount > 100, 'high', 'low') AS tier FROM events;
```

```sql
-- Snowflake: ZEROIFNULL
SELECT ZEROIFNULL(amount) FROM events;

-- ClickHouse: ifNull
SELECT ifNull(amount, 0) FROM events;
```

```sql
-- Snowflake: DATEADD
SELECT DATEADD(day, 7, created_at) FROM events;

-- ClickHouse: addDays
SELECT addDays(created_at, 7) FROM events;
```

```sql
-- Snowflake: DATEDIFF
SELECT DATEDIFF(day, start_date, end_date) FROM sessions;

-- ClickHouse: dateDiff
SELECT dateDiff('day', start_date, end_date) FROM sessions;
```

```sql
-- Snowflake: TO_TIMESTAMP / TO_DATE
SELECT TO_TIMESTAMP('2024-01-15 10:30:00'), TO_DATE('2024-01-15');

-- ClickHouse
SELECT toDateTime('2024-01-15 10:30:00'), toDate('2024-01-15');
```

```sql
-- Snowflake: OBJECT_CONSTRUCT (build JSON)
SELECT OBJECT_CONSTRUCT('key', value, 'key2', value2) FROM t;

-- ClickHouse: map() or toJSONString
SELECT map('key', toString(value), 'key2', toString(value2)) FROM t;
```

```sql
-- Snowflake: SPLIT_TO_TABLE
SELECT value FROM TABLE(SPLIT_TO_TABLE('a,b,c', ','));

-- ClickHouse: splitByChar + arrayJoin
SELECT arrayJoin(splitByChar(',', 'a,b,c')) AS value;
```

```sql
-- Snowflake: GENERATOR (row generator)
SELECT SEQ4() AS n FROM TABLE(GENERATOR(ROWCOUNT => 100));

-- ClickHouse: numbers()
SELECT number AS n FROM numbers(100);
```

## Step 5: Handle Snowflake VARIANT Columns

Snowflake VARIANT is a semi-structured JSON column. ClickHouse stores this as a String and uses `JSONExtract` functions:

```sql
-- Snowflake: access VARIANT fields
SELECT
    properties:device::STRING   AS device,
    properties:amount::FLOAT    AS amount,
    properties:tags[0]::STRING  AS first_tag
FROM events;

-- ClickHouse
SELECT
    JSONExtractString(properties, 'device')                     AS device,
    JSONExtractFloat(properties, 'amount')                      AS amount,
    JSONExtract(JSONExtractArrayRaw(properties, 'tags')[1], 'String') AS first_tag
FROM events;
```

For frequently accessed VARIANT keys, extract them into dedicated columns after migration:

```sql
ALTER TABLE events ADD COLUMN device LowCardinality(String) DEFAULT '';
ALTER TABLE events ADD COLUMN platform String DEFAULT '';

-- Backfill
ALTER TABLE events
    UPDATE device   = JSONExtractString(properties, 'device'),
           platform = JSONExtractString(properties, 'platform')
WHERE properties != '{}';
```

## Step 6: Recreate Snowflake Dynamic Tables

Snowflake dynamic tables automatically refresh materialized results. In ClickHouse, use materialized views for the same pattern:

```sql
-- Snowflake dynamic table
CREATE DYNAMIC TABLE daily_event_stats
    TARGET_LAG = '1 hour'
    WAREHOUSE = 'ANALYTICS_WH'
AS
SELECT
    DATE_TRUNC('day', created_at) AS event_date,
    event_type,
    COUNT(*)                      AS total,
    COUNT(DISTINCT user_id)       AS unique_users
FROM events
GROUP BY event_date, event_type;
```

```sql
-- ClickHouse destination table
CREATE TABLE daily_event_stats
(
    event_date   Date,
    event_type   LowCardinality(String),
    total        SimpleAggregateFunction(sum, UInt64),
    unique_users AggregateFunction(uniq, Int64)
)
ENGINE = AggregatingMergeTree()
ORDER BY (event_date, event_type);

-- Materialized view
CREATE MATERIALIZED VIEW daily_event_stats_mv
TO daily_event_stats
AS
SELECT
    toDate(created_at) AS event_date,
    event_type,
    count()            AS total,
    uniqState(user_id) AS unique_users
FROM events
GROUP BY event_date, event_type;
```

## Step 7: Validate Migration

```sql
-- Snowflake
SELECT
    COUNT(*),
    COUNT(DISTINCT user_id),
    SUM(amount),
    MIN(created_at),
    MAX(created_at)
FROM events;

-- ClickHouse
SELECT
    count(),
    uniqExact(user_id),
    sum(amount),
    min(created_at),
    max(created_at)
FROM events;
```

Compare row counts per month:

```sql
-- Snowflake
SELECT DATE_TRUNC('month', created_at) AS month, COUNT(*) AS rows
FROM events GROUP BY 1 ORDER BY 1;

-- ClickHouse
SELECT toStartOfMonth(created_at) AS month, count() AS rows
FROM events GROUP BY month ORDER BY month;
```

## Summary

Migrating from Snowflake to ClickHouse eliminates per-query compute billing and provides predictable infrastructure costs. Export data to S3 using Snowflake's `COPY INTO` with Parquet format, load via ClickHouse's `s3()` table function, rewrite Snowflake-specific SQL functions (QUALIFY, FLATTEN, IFF, DATEADD, VARIANT access), and replace dynamic tables with materialized views. After validation, existing Snowflake warehouses can be downsized or suspended to immediately reduce costs.
