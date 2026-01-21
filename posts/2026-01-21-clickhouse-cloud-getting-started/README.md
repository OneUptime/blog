# How to Get Started with ClickHouse Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Cloud, Serverless, Managed Service, Getting Started

Description: A comprehensive guide to getting started with ClickHouse Cloud, covering account setup, service creation, data loading, query optimization, and cost management for serverless analytics.

---

ClickHouse Cloud provides a fully managed, serverless ClickHouse experience that eliminates infrastructure management. This guide covers everything you need to get started, from account creation to running your first queries.

## Creating Your ClickHouse Cloud Account

### Sign Up Process

1. Visit [clickhouse.cloud](https://clickhouse.cloud)
2. Sign up with email, Google, or GitHub
3. Verify your email address
4. Choose your cloud provider (AWS, GCP, or Azure)

### Free Trial

ClickHouse Cloud offers a free trial with:
- $300 in credits
- 30-day trial period
- Full feature access

## Creating Your First Service

### Service Configuration

```
Service Settings:
- Name: my-analytics-service
- Cloud Provider: AWS
- Region: us-east-1
- Tier: Development (or Production)
```

### Development vs Production Tiers

| Feature | Development | Production |
|---------|-------------|------------|
| Min Replicas | 1 | 2 |
| Auto-scaling | Limited | Full |
| Availability | 99.5% | 99.95% |
| Support | Community | Priority |
| Price | Lower | Higher |

## Connecting to ClickHouse Cloud

### Connection Details

After service creation, you'll receive:
- Host: `xxxxx.region.aws.clickhouse.cloud`
- Port: 8443 (HTTPS) / 9440 (Native TLS)
- Database: `default`
- Username: `default`
- Password: (generated)

### Using clickhouse-client

```bash
# Install clickhouse-client
curl https://clickhouse.com/ | sh

# Connect to ClickHouse Cloud
./clickhouse client \
    --host xxxxx.us-east-1.aws.clickhouse.cloud \
    --port 9440 \
    --secure \
    --user default \
    --password 'your-password'
```

### Using HTTP Interface

```bash
# Query via HTTPS
curl -X POST \
    'https://xxxxx.us-east-1.aws.clickhouse.cloud:8443/?user=default&password=your-password' \
    -d 'SELECT 1'

# With query parameter
curl 'https://xxxxx.us-east-1.aws.clickhouse.cloud:8443/?query=SELECT%201' \
    --user 'default:your-password'
```

### Using Python

```python
import clickhouse_connect

# Create client
client = clickhouse_connect.get_client(
    host='xxxxx.us-east-1.aws.clickhouse.cloud',
    port=8443,
    username='default',
    password='your-password',
    secure=True
)

# Execute query
result = client.query('SELECT 1')
print(result.result_rows)
```

### Using Node.js

```javascript
const { createClient } = require('@clickhouse/client');

const client = createClient({
    host: 'https://xxxxx.us-east-1.aws.clickhouse.cloud:8443',
    username: 'default',
    password: 'your-password'
});

async function query() {
    const result = await client.query({
        query: 'SELECT 1'
    });
    console.log(await result.json());
}
```

## Loading Your First Data

### Create a Table

```sql
-- Create a sample events table
CREATE TABLE events (
    event_id UUID DEFAULT generateUUIDv4(),
    timestamp DateTime64(3) DEFAULT now64(3),
    user_id UInt64,
    event_type LowCardinality(String),
    properties Map(String, String)
) ENGINE = MergeTree()
ORDER BY (timestamp, event_id);
```

### Insert Sample Data

```sql
-- Insert test data
INSERT INTO events (user_id, event_type, properties)
VALUES
    (1, 'page_view', {'page': '/home'}),
    (1, 'click', {'element': 'signup_button'}),
    (2, 'page_view', {'page': '/products'}),
    (2, 'purchase', {'product_id': '123', 'amount': '99.99'});

-- Generate bulk test data
INSERT INTO events (user_id, event_type, properties)
SELECT
    rand() % 10000 AS user_id,
    arrayElement(['page_view', 'click', 'purchase'], rand() % 3 + 1) AS event_type,
    map('key', toString(rand())) AS properties
FROM numbers(100000);
```

### Load Data from S3

```sql
-- Load data directly from S3
INSERT INTO events
SELECT *
FROM s3(
    'https://your-bucket.s3.amazonaws.com/data/*.parquet',
    'AWS_ACCESS_KEY',
    'AWS_SECRET_KEY',
    'Parquet'
);

-- Using ClickHouse Cloud's IAM integration (no credentials needed)
INSERT INTO events
SELECT *
FROM s3(
    'https://your-bucket.s3.amazonaws.com/data/*.parquet',
    'Parquet'
);
```

## Query Examples

### Basic Analytics

```sql
-- Events per hour
SELECT
    toStartOfHour(timestamp) AS hour,
    event_type,
    count() AS events
FROM events
WHERE timestamp >= now() - INTERVAL 24 HOUR
GROUP BY hour, event_type
ORDER BY hour DESC;

-- Unique users per day
SELECT
    toDate(timestamp) AS date,
    uniqExact(user_id) AS unique_users
FROM events
WHERE timestamp >= now() - INTERVAL 30 DAY
GROUP BY date
ORDER BY date;
```

### Query Performance

```sql
-- Check query execution details
SELECT
    query,
    read_rows,
    read_bytes,
    result_rows,
    query_duration_ms
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query_start_time >= now() - INTERVAL 1 HOUR
ORDER BY query_duration_ms DESC
LIMIT 10;
```

## ClickHouse Cloud Console Features

### SQL Console

- Web-based query editor
- Syntax highlighting
- Query history
- Result visualization

### Data Explorer

- Browse tables and schemas
- View table structures
- Sample data preview

### Query Insights

- Query performance metrics
- Resource utilization
- Cost attribution

## Cost Management

### Understanding Pricing

ClickHouse Cloud pricing components:
1. **Compute**: Based on compute units consumed
2. **Storage**: Based on compressed data stored
3. **Data Transfer**: Egress charges

### Cost Optimization Tips

```sql
-- Check storage per table
SELECT
    database,
    table,
    formatReadableSize(sum(bytes_on_disk)) AS size,
    sum(rows) AS rows
FROM system.parts
WHERE active
GROUP BY database, table
ORDER BY sum(bytes_on_disk) DESC;

-- Use appropriate data types
-- Bad: String for everything
-- Good: LowCardinality(String), UInt32, Date

-- Example: Optimize column types
CREATE TABLE events_optimized (
    -- Use UInt32 instead of UInt64 when possible
    user_id UInt32,
    -- Use LowCardinality for low-cardinality strings
    event_type LowCardinality(String),
    -- Use Date instead of DateTime for date-only columns
    event_date Date,
    -- Use appropriate decimal precision
    amount Decimal32(2)
) ENGINE = MergeTree()
ORDER BY (event_date, user_id);
```

### Setting Budgets

In the ClickHouse Cloud console:
1. Navigate to Settings > Billing
2. Set monthly budget alerts
3. Configure auto-scaling limits

## Security Configuration

### IP Access Lists

```
# Allow specific IPs
Settings > Security > IP Access List
- Add: 203.0.113.0/24 (Office network)
- Add: 198.51.100.50/32 (CI/CD server)
```

### User Management

```sql
-- Create additional users
CREATE USER analyst IDENTIFIED BY 'secure_password';

-- Grant read-only access
GRANT SELECT ON default.* TO analyst;

-- Create a role
CREATE ROLE data_analyst;
GRANT SELECT ON default.* TO data_analyst;
GRANT data_analyst TO analyst;
```

### Private Endpoints

For production workloads, configure private endpoints:
- AWS PrivateLink
- GCP Private Service Connect
- Azure Private Link

## Monitoring and Alerts

### Built-in Metrics

```sql
-- Current resource usage
SELECT * FROM system.metrics;

-- Async metrics
SELECT * FROM system.asynchronous_metrics;

-- Query statistics
SELECT
    user,
    count() AS queries,
    sum(read_rows) AS total_rows_read,
    sum(read_bytes) AS total_bytes_read
FROM system.query_log
WHERE type = 'QueryFinish'
  AND event_time >= now() - INTERVAL 1 HOUR
GROUP BY user;
```

### Setting Up Alerts

Configure alerts in the console for:
- Query failures
- High resource utilization
- Storage thresholds
- Budget limits

## Integration with BI Tools

### Grafana

```yaml
# Grafana data source configuration
Name: ClickHouse Cloud
Type: Grafana ClickHouse Plugin
Host: xxxxx.us-east-1.aws.clickhouse.cloud
Port: 8443
Protocol: https
Username: default
Password: your-password
```

### Metabase

```
Host: xxxxx.us-east-1.aws.clickhouse.cloud
Port: 8443
Database: default
Username: default
Password: your-password
SSL: true
```

## Best Practices

### 1. Use Appropriate Table Engines

```sql
-- For most analytics: MergeTree
CREATE TABLE metrics (...) ENGINE = MergeTree() ORDER BY (...);

-- For deduplication: ReplacingMergeTree
CREATE TABLE users (...) ENGINE = ReplacingMergeTree(updated_at) ORDER BY user_id;

-- For aggregations: AggregatingMergeTree
CREATE TABLE daily_stats (...) ENGINE = AggregatingMergeTree() ORDER BY (...);
```

### 2. Optimize ORDER BY

```sql
-- Order by frequently filtered columns first
CREATE TABLE events (...)
ENGINE = MergeTree()
ORDER BY (tenant_id, event_date, event_type);
```

### 3. Use Materialized Views

```sql
-- Pre-aggregate frequently queried data
CREATE MATERIALIZED VIEW hourly_stats_mv
ENGINE = SummingMergeTree()
ORDER BY (hour, event_type)
AS SELECT
    toStartOfHour(timestamp) AS hour,
    event_type,
    count() AS count
FROM events
GROUP BY hour, event_type;
```

## Conclusion

Getting started with ClickHouse Cloud involves:

1. **Create an account** and service
2. **Connect** using your preferred client
3. **Load data** from various sources
4. **Optimize** for cost and performance
5. **Secure** with users and access controls
6. **Monitor** with built-in tools

ClickHouse Cloud eliminates infrastructure management while providing the full power of ClickHouse for your analytical workloads.
