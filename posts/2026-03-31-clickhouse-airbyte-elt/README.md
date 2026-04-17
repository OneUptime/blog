# How to Use ClickHouse with Airbyte for ELT

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Airbyte, ELT, Data Engineering, Pipeline, Integration

Description: Set up Airbyte to load data into ClickHouse as a destination, configure sync modes, handle schema changes, and optimize the destination for analytical query performance.

---

Airbyte is an open-source ELT platform that replicates data from hundreds of sources into a destination database. ClickHouse is available as an Airbyte destination, making it straightforward to pipe data from SaaS tools, databases, and APIs directly into ClickHouse for analytical queries. This guide covers the full setup from deploying Airbyte to optimizing your ClickHouse destination.

## Deploying Airbyte

The fastest way to run Airbyte locally is with `abctl`, which provisions a kind Kubernetes cluster and installs Airbyte via Helm:

```bash
curl -LsfS https://get.airbyte.com | bash -
abctl local install
```

Airbyte's UI will be available at `http://localhost:8000`. Retrieve the auto-generated credentials with:

```bash
abctl local credentials
```

For production, deploy with the Airbyte Helm chart V2:

```bash
helm repo add airbyte-v2 https://airbytehq.github.io/charts
helm repo update
helm install airbyte airbyte-v2/airbyte \
  --namespace airbyte \
  --create-namespace \
  -f values.yaml
```

## Preparing ClickHouse as a Destination

Create a dedicated database and user for Airbyte:

```sql
CREATE DATABASE IF NOT EXISTS airbyte_raw;
CREATE DATABASE IF NOT EXISTS airbyte_transformed;

CREATE USER airbyte_user IDENTIFIED WITH plaintext_password BY 'strong_password';

GRANT CREATE TABLE, DROP TABLE, INSERT, SELECT, ALTER ON airbyte_raw.*        TO airbyte_user;
GRANT CREATE TABLE, DROP TABLE, INSERT, SELECT, ALTER ON airbyte_transformed.* TO airbyte_user;
```

Enable the HTTP interface (default port 8123) and verify ClickHouse is reachable from Airbyte's network.

## Configuring ClickHouse as a Destination in Airbyte

In the Airbyte UI:

1. Go to **Destinations** and click **New destination**
2. Search for **ClickHouse**
3. Fill in the connection details:

```text
Host:           clickhouse.internal
HTTP port:      8123
Database:       airbyte_raw
Username:       airbyte_user
Password:       strong_password
SSL:            enabled (for production)
```

4. Click **Test and save**

Airbyte will attempt a ping query and verify write access before saving.

## Understanding Airbyte's Write Modes

Airbyte supports three sync modes with ClickHouse:

| Mode | Description | ClickHouse table engine |
|------|-------------|------------------------|
| Full refresh / Overwrite | Replaces the table contents each sync | MergeTree |
| Full refresh / Append | Appends all records each sync | MergeTree |
| Incremental / Append | Appends only new records using a cursor field | MergeTree |
| Incremental / Append + Deduped | Deduplicates by primary key on read | ReplacingMergeTree |

Airbyte creates tables with this approximate schema for each stream:

```sql
CREATE TABLE airbyte_raw.my_stream
(
    _airbyte_raw_id         String,
    _airbyte_extracted_at   DateTime,
    _airbyte_loaded_at      DateTime,
    _airbyte_data           String   -- JSON blob of the source record
)
ENGINE = MergeTree()
ORDER BY (_airbyte_extracted_at, _airbyte_raw_id);
```

## Setting Up a Connection

To replicate Postgres orders to ClickHouse:

1. Add **PostgreSQL** as a source
2. Add **ClickHouse** as a destination
3. Create a new connection, selecting the source and destination
4. Configure streams:
   - Select `orders` table
   - Choose sync mode: **Incremental | Append**
   - Set cursor field: `updated_at`
5. Set sync frequency: every 1 hour
6. Click **Set up connection**

## Transforming Raw Airbyte Data with SQL Views

Airbyte stores raw JSON in `_airbyte_data`. Create a view or materialized view to extract typed columns:

```sql
CREATE VIEW airbyte_transformed.orders AS
SELECT
    JSONExtractUInt(_airbyte_data, 'id')          AS order_id,
    JSONExtractUInt(_airbyte_data, 'user_id')      AS user_id,
    JSONExtractString(_airbyte_data, 'status')     AS status,
    JSONExtractFloat(_airbyte_data, 'total')       AS total,
    toDateTime(JSONExtractString(_airbyte_data, 'created_at')) AS created_at,
    toDateTime(JSONExtractString(_airbyte_data, 'updated_at')) AS updated_at,
    _airbyte_extracted_at
FROM airbyte_raw.orders
WHERE _airbyte_data != '';
```

For better query performance, create a materialized view that stores typed columns:

```sql
CREATE TABLE airbyte_transformed.orders_typed
(
    order_id     UInt64,
    user_id      UInt64,
    status       LowCardinality(String),
    total        Float64,
    created_at   DateTime,
    updated_at   DateTime,
    synced_at    DateTime
)
ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (order_id);

CREATE MATERIALIZED VIEW airbyte_transformed.orders_mv
TO airbyte_transformed.orders_typed
AS
SELECT
    JSONExtractUInt(_airbyte_data, 'id')           AS order_id,
    JSONExtractUInt(_airbyte_data, 'user_id')       AS user_id,
    JSONExtractString(_airbyte_data, 'status')      AS status,
    JSONExtractFloat(_airbyte_data, 'total')        AS total,
    toDateTime(JSONExtractString(_airbyte_data, 'created_at')) AS created_at,
    toDateTime(JSONExtractString(_airbyte_data, 'updated_at')) AS updated_at,
    _airbyte_extracted_at                           AS synced_at
FROM airbyte_raw.orders;
```

With this setup, every Airbyte sync automatically populates `orders_typed` in real time through the materialized view.

## Using dbt on Top of Airbyte

The standard modern data stack is Airbyte (EL) + dbt (T). Configure dbt to read from `airbyte_raw` and write to `airbyte_transformed`:

```yaml
# profiles.yml

analytics:
  outputs:
    prod:
      type: clickhouse
      host: clickhouse.internal
      port: 8123
      schema: airbyte_transformed
      user: dbt_user
      password: "{{ env_var('DBT_PASSWORD') }}"
```

```sql
-- models/staging/stg_orders.sql
{{
  config(materialized='view')
}}

SELECT
    JSONExtractUInt(_airbyte_data, 'id')          AS order_id,
    JSONExtractUInt(_airbyte_data, 'user_id')      AS user_id,
    JSONExtractString(_airbyte_data, 'status')     AS status,
    toDateTime(JSONExtractString(_airbyte_data, 'created_at')) AS created_at
FROM airbyte_raw.orders
WHERE _airbyte_data != ''
```

## Monitoring Sync Health

Check the state of recent Airbyte syncs in ClickHouse:

```sql
SELECT
    toDate(_airbyte_extracted_at)  AS sync_date,
    count()                        AS records_synced,
    min(_airbyte_extracted_at)     AS first_record,
    max(_airbyte_extracted_at)     AS last_record
FROM airbyte_raw.orders
GROUP BY sync_date
ORDER BY sync_date DESC
LIMIT 30;
```

Check for gaps in sync coverage:

```sql
SELECT
    toStartOfHour(_airbyte_extracted_at) AS hour,
    count()                              AS records
FROM airbyte_raw.orders
WHERE _airbyte_extracted_at >= now() - INTERVAL 7 DAY
GROUP BY hour
ORDER BY hour;
```

## Airbyte via API for Automation

Use the Airbyte public API to trigger syncs programmatically:

```bash
curl -X POST http://localhost:8000/api/public/v1/jobs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AIRBYTE_API_TOKEN" \
  -d '{"connectionId": "your-connection-id", "jobType": "sync"}'
```

List recent jobs for a connection:

```bash
curl "http://localhost:8000/api/public/v1/jobs?connectionId=your-connection-id&jobType=sync" \
  -H "Authorization: Bearer $AIRBYTE_API_TOKEN"
```

## Summary

Airbyte + ClickHouse is a powerful ELT pattern: Airbyte handles extraction and loading of raw JSON records, and ClickHouse materialized views or dbt models handle the transformation into typed, queryable tables. Configure incremental append mode for large tables, use `ReplacingMergeTree` for tables that receive updates, and layer dbt on top for complex SQL transformations with testing and documentation.
