# How to Set Up Scheduled Data Exports from ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Scheduled Export, Automation, Cron, Data Pipeline

Description: Learn how to set up scheduled data exports from ClickHouse using cron jobs, ClickHouse Scheduled Jobs, and pipeline tools for automated reporting.

---

Scheduled exports automate the delivery of ClickHouse data to downstream systems - dashboards, data warehouses, or object storage - on a regular cadence.

## Option 1 - Cron Jobs

The simplest approach uses a shell script triggered by cron:

```bash
#!/bin/bash
# /opt/scripts/export_events.sh
set -e

DATE=$(date -d yesterday +%Y-%m-%d)
EXPORT_PATH="/exports/events_${DATE}.csv.gz"

clickhouse-client \
  --host "${CLICKHOUSE_HOST}" \
  --user default \
  --password "${CLICKHOUSE_PASSWORD}" \
  --query "SELECT * FROM events WHERE toDate(ts) = '${DATE}'" \
  --format CSVWithNames \
  | gzip > "${EXPORT_PATH}"

# Upload to S3
aws s3 cp "${EXPORT_PATH}" "s3://my-bucket/events/date=${DATE}/data.csv.gz"
rm "${EXPORT_PATH}"

echo "Export complete for ${DATE}"
```

Register with cron:

```bash
# Run daily at 2am
0 2 * * * /opt/scripts/export_events.sh >> /var/log/clickhouse-exports.log 2>&1
```

## Option 2 - Refreshable Materialized Views

ClickHouse supports refreshable materialized views that re-execute a query on a defined schedule:

```sql
CREATE MATERIALIZED VIEW daily_events_export
REFRESH EVERY 1 DAY OFFSET 2 HOUR
ENGINE = S3('s3://my-bucket/events/latest/data.parquet', 'Parquet')
AS
SELECT * FROM events
WHERE toDate(ts) = today() - 1;
```

The view refreshes daily at 2:00 AM and writes yesterday's events to S3 in Parquet format. Each refresh atomically replaces the previous contents. For date-partitioned paths, use cron or Airflow to construct dynamic URLs.

## Option 3 - Materialized View with Background Refresh

For continuously updated export targets:

```sql
CREATE TABLE events_daily_summary (
    date Date,
    event_type LowCardinality(String),
    event_count UInt64,
    unique_users AggregateFunction(uniq, UInt64)
) ENGINE = SummingMergeTree()
ORDER BY (date, event_type);

CREATE MATERIALIZED VIEW events_daily_mv TO events_daily_summary
AS SELECT
    toDate(ts) AS date,
    event_type,
    count() AS event_count,
    uniqState(user_id) AS unique_users
FROM events
GROUP BY date, event_type;
```

## Option 4 - Airflow DAG

```python
from airflow import DAG
from airflow.operators.bash import BashOperator
from datetime import datetime

with DAG('clickhouse_export', schedule='@daily', start_date=datetime(2026,1,1)) as dag:
    export = BashOperator(
        task_id='export_to_s3',
        bash_command="""
        clickhouse-client --query "
          INSERT INTO FUNCTION s3('s3://my-bucket/events/{{ ds }}/data.parquet', 'Parquet')
          SELECT * FROM events WHERE toDate(ts) = '{{ ds }}'
        "
        """
    )
```

## Summary

Schedule ClickHouse exports via cron for simplicity, refreshable materialized views for built-in periodic refresh, or Airflow for orchestrated pipelines. Use standard materialized views with SummingMergeTree for continuously refreshed aggregated exports.
