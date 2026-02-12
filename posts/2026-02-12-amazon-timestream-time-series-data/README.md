# How to Use Amazon Timestream for Time-Series Data

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Timestream, Time Series, Database, IoT

Description: Learn how to use Amazon Timestream for time-series data workloads, covering database setup, data ingestion, querying with SQL, and performance optimization strategies.

---

Time-series data is everywhere - server metrics, IoT sensor readings, financial ticks, application logs. Traditional databases can handle this data, but they weren't designed for it. As your dataset grows into billions of data points, you start fighting with storage costs, query performance, and data lifecycle management.

Amazon Timestream was built specifically for these problems. It automatically moves recent data to a fast in-memory store and older data to cheaper magnetic storage, all transparent to your queries. Let's set it up and see how it works.

## Creating a Timestream Database and Table

Timestream organizes data into databases and tables. Each table has its own retention policies.

```bash
# Create a Timestream database
aws timestream-write create-database \
  --database-name monitoring

# Create a table with retention policies
# Memory store keeps recent data hot (for fast queries)
# Magnetic store holds older data cheaply
aws timestream-write create-table \
  --database-name monitoring \
  --table-name server_metrics \
  --retention-properties '{
    "MemoryStoreRetentionPeriodInHours": 24,
    "MagneticStoreRetentionPeriodInDays": 365
  }'
```

The memory store retention defines how long data stays in the fast tier. After that, it automatically moves to magnetic storage. You can query across both tiers seamlessly.

## Understanding the Data Model

Timestream's data model is different from a regular relational database. Each record has:

- **Dimensions** - metadata that identifies the time series (like hostname, region, service name)
- **Measure name** - what's being measured (cpu_usage, memory_free, request_count)
- **Measure value** - the actual measurement
- **Time** - the timestamp

Think of dimensions as tags and measures as the values you're tracking.

## Writing Data

Here's how to write records from Python.

```python
# Install with: pip install boto3
import boto3
import time

client = boto3.client('timestream-write', region_name='us-east-1')

# Build records for server metrics
current_time = str(int(time.time() * 1000))  # Timestream expects milliseconds

records = [
    {
        'Dimensions': [
            {'Name': 'hostname', 'Value': 'web-server-01'},
            {'Name': 'region', 'Value': 'us-east-1'},
            {'Name': 'service', 'Value': 'api'}
        ],
        'MeasureName': 'cpu_usage',
        'MeasureValue': '72.5',
        'MeasureValueType': 'DOUBLE',
        'Time': current_time,
        'TimeUnit': 'MILLISECONDS'
    },
    {
        'Dimensions': [
            {'Name': 'hostname', 'Value': 'web-server-01'},
            {'Name': 'region', 'Value': 'us-east-1'},
            {'Name': 'service', 'Value': 'api'}
        ],
        'MeasureName': 'memory_usage_mb',
        'MeasureValue': '3421',
        'MeasureValueType': 'BIGINT',
        'Time': current_time,
        'TimeUnit': 'MILLISECONDS'
    }
]

# Write the records
response = client.write_records(
    DatabaseName='monitoring',
    TableName='server_metrics',
    Records=records
)
print(f"Records written: {response['RecordsIngested']['Total']}")
```

For high-throughput ingestion, use multi-measure records. They let you pack multiple measurements into a single record, which is more efficient.

```python
# Multi-measure record - write multiple metrics in one record
multi_measure_record = {
    'Dimensions': [
        {'Name': 'hostname', 'Value': 'web-server-01'},
        {'Name': 'region', 'Value': 'us-east-1'},
        {'Name': 'service', 'Value': 'api'}
    ],
    'MeasureName': 'server_health',
    'MeasureValues': [
        {'Name': 'cpu_usage', 'Value': '72.5', 'Type': 'DOUBLE'},
        {'Name': 'memory_usage_mb', 'Value': '3421', 'Type': 'BIGINT'},
        {'Name': 'disk_usage_percent', 'Value': '45.2', 'Type': 'DOUBLE'},
        {'Name': 'network_in_bytes', 'Value': '1048576', 'Type': 'BIGINT'}
    ],
    'MeasureValueType': 'MULTI',
    'Time': current_time,
    'TimeUnit': 'MILLISECONDS'
}

client.write_records(
    DatabaseName='monitoring',
    TableName='server_metrics',
    Records=[multi_measure_record]
)
```

## Querying Data with SQL

Timestream uses a SQL-compatible query language with time-series extensions. Queries hit both memory and magnetic stores automatically.

```python
query_client = boto3.client('timestream-query', region_name='us-east-1')

def run_query(query_string):
    """Execute a Timestream query and return the results"""
    paginator = query_client.get_paginator('query')
    pages = paginator.paginate(QueryString=query_string)

    rows = []
    for page in pages:
        for row in page['Rows']:
            rows.append([col.get('ScalarValue', 'NULL') for col in row['Data']])
    return rows
```

Here are the most useful query patterns.

```sql
-- Get the latest CPU usage for each server
SELECT hostname, measure_value::double AS cpu_usage, time
FROM monitoring.server_metrics
WHERE measure_name = 'cpu_usage'
  AND time > ago(1h)
ORDER BY time DESC
```

```sql
-- Average CPU usage per server over the last hour, in 5-minute buckets
SELECT hostname,
       bin(time, 5m) AS five_min_bucket,
       AVG(measure_value::double) AS avg_cpu,
       MAX(measure_value::double) AS max_cpu
FROM monitoring.server_metrics
WHERE measure_name = 'cpu_usage'
  AND time > ago(1h)
GROUP BY hostname, bin(time, 5m)
ORDER BY five_min_bucket DESC
```

```sql
-- Find servers with CPU usage above 90% in the last 15 minutes
SELECT DISTINCT hostname
FROM monitoring.server_metrics
WHERE measure_name = 'cpu_usage'
  AND measure_value::double > 90.0
  AND time > ago(15m)
```

## Time-Series Functions

Timestream provides built-in functions for interpolation, smoothing, and gap filling.

```sql
-- Interpolate missing data points using linear interpolation
-- Useful when sensors report at irregular intervals
SELECT hostname,
       INTERPOLATE_LINEAR(
         CREATE_TIME_SERIES(time, measure_value::double),
         SEQUENCE(ago(1h), now(), 1m)
       ) AS interpolated_cpu
FROM monitoring.server_metrics
WHERE measure_name = 'cpu_usage'
  AND time > ago(1h)
GROUP BY hostname
```

```sql
-- Calculate the derivative (rate of change) of a metric
-- Great for spotting sudden spikes
SELECT hostname, time,
       measure_value::double AS current_value,
       measure_value::double - LAG(measure_value::double) OVER (
         PARTITION BY hostname ORDER BY time
       ) AS change_from_previous
FROM monitoring.server_metrics
WHERE measure_name = 'cpu_usage'
  AND time > ago(1h)
ORDER BY hostname, time
```

## Scheduled Queries

Scheduled queries let you pre-compute aggregations on a schedule and store the results in another Timestream table. This is perfect for dashboards that don't need real-time precision.

```bash
# Create a table for aggregated results
aws timestream-write create-table \
  --database-name monitoring \
  --table-name metrics_hourly \
  --retention-properties '{
    "MemoryStoreRetentionPeriodInHours": 168,
    "MagneticStoreRetentionPeriodInDays": 730
  }'

# Create a scheduled query that runs every hour
aws timestream-query create-scheduled-query \
  --name hourly-cpu-summary \
  --query-string "SELECT hostname, bin(time, 1h) AS hour, AVG(measure_value::double) AS avg_cpu, MAX(measure_value::double) AS max_cpu FROM monitoring.server_metrics WHERE measure_name = 'cpu_usage' AND time > @scheduled_runtime - 1h GROUP BY hostname, bin(time, 1h)" \
  --schedule-configuration '{"ScheduleExpression": "rate(1 hour)"}' \
  --notification-configuration '{"SnsConfiguration": {"TopicArn": "arn:aws:sns:us-east-1:123456789:timestream-notifications"}}' \
  --target-configuration '{
    "TimestreamConfiguration": {
      "DatabaseName": "monitoring",
      "TableName": "metrics_hourly",
      "TimeColumn": "hour",
      "DimensionMappings": [
        {"Name": "hostname", "DimensionValueType": "VARCHAR"}
      ],
      "MultiMeasureMappings": {
        "TargetMultiMeasureName": "cpu_summary",
        "MultiMeasureAttributeMappings": [
          {"SourceColumn": "avg_cpu", "MeasureValueType": "DOUBLE"},
          {"SourceColumn": "max_cpu", "MeasureValueType": "DOUBLE"}
        ]
      }
    }
  }' \
  --scheduled-query-execution-role-arn arn:aws:iam::123456789:role/TimestreamScheduledQueryRole
```

## Batch Ingestion from Applications

For high-volume ingestion, batch your writes. Timestream supports up to 100 records per write call.

```python
# Batch writer that buffers records and flushes in batches
import threading
import time

class TimestreamBatchWriter:
    def __init__(self, client, database, table, batch_size=100, flush_interval=5):
        self.client = client
        self.database = database
        self.table = table
        self.batch_size = batch_size
        self.buffer = []
        self.lock = threading.Lock()

        # Start a background thread that flushes periodically
        self.flush_thread = threading.Thread(target=self._periodic_flush, daemon=True)
        self.flush_interval = flush_interval
        self.flush_thread.start()

    def add_record(self, record):
        with self.lock:
            self.buffer.append(record)
            if len(self.buffer) >= self.batch_size:
                self._flush()

    def _flush(self):
        if not self.buffer:
            return
        batch = self.buffer[:self.batch_size]
        self.buffer = self.buffer[self.batch_size:]
        try:
            self.client.write_records(
                DatabaseName=self.database,
                TableName=self.table,
                Records=batch
            )
        except Exception as e:
            print(f"Write failed: {e}")
            # Put records back for retry
            self.buffer = batch + self.buffer

    def _periodic_flush(self):
        while True:
            time.sleep(self.flush_interval)
            with self.lock:
                self._flush()
```

## Cost Optimization Tips

Timestream charges for writes, storage, and queries. Here's how to keep costs down:

- Use multi-measure records to reduce the number of write operations
- Set memory retention to the minimum you need for real-time queries
- Use scheduled queries to pre-aggregate data for dashboard queries
- Avoid `SELECT *` - query only the columns you need, as Timestream charges per byte scanned

## Wrapping Up

Timestream is a great fit for workloads where time is the primary axis of your data. The automatic tiering between memory and magnetic storage saves you from building your own data lifecycle pipeline, and the SQL interface with time-series extensions makes it accessible to anyone who knows SQL. Start with on-demand capacity, get your ingestion and query patterns working, then optimize from there.
