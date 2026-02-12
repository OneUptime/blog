# How to Monitor RDS with Performance Insights

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, RDS, Monitoring, Performance, Database

Description: Learn how to enable and use Amazon RDS Performance Insights to monitor database performance, identify bottlenecks, and optimize query execution.

---

CloudWatch metrics tell you the basics - CPU, memory, disk I/O. But when your database is slow, those metrics rarely tell you why. Is it a single bad query? Lock contention? Too many connections? CloudWatch won't give you that level of detail.

That's where RDS Performance Insights comes in. It's a free (for the basic tier) monitoring tool built into RDS that shows you exactly what your database is doing at any given moment. You can see which queries are consuming the most resources, what types of waits are happening, and how your database load compares to its capacity.

## What Performance Insights Actually Shows You

Performance Insights centers around a single key concept: **Average Active Sessions (AAS)**. This metric tells you how many sessions are actively running queries at any point in time. If your instance has 4 vCPUs and AAS is consistently above 4, your database is overloaded - there's more work than it can handle concurrently.

The dashboard breaks down AAS by:

- **Wait events**: What the database is waiting on (CPU, I/O, locks, network, etc.)
- **SQL statements**: Which queries are consuming the most resources
- **Users**: Which database users are generating load
- **Hosts**: Which client hosts are sending the most queries

This combination lets you quickly narrow down problems. Instead of guessing, you can see that, say, 80% of your database load comes from one specific query that's doing a full table scan.

## Enabling Performance Insights

Performance Insights can be enabled when you create a new RDS instance or added to an existing one.

For a new instance via the CLI:

```bash
# Create an RDS instance with Performance Insights enabled
aws rds create-db-instance \
  --db-instance-identifier my-monitored-db \
  --db-instance-class db.r6g.large \
  --engine postgres \
  --master-username admin \
  --master-user-password "$DB_PASSWORD" \
  --allocated-storage 100 \
  --enable-performance-insights \
  --performance-insights-retention-period 7
```

For an existing instance:

```bash
# Enable Performance Insights on an existing RDS instance
aws rds modify-db-instance \
  --db-instance-identifier my-existing-db \
  --enable-performance-insights \
  --performance-insights-retention-period 7 \
  --apply-immediately
```

The `--performance-insights-retention-period` can be set to 7 (free tier) or 731 days (paid - about $0.06/vCPU/month). The 7-day retention is plenty for most troubleshooting scenarios, but the longer retention is useful if you need to compare performance over time.

## Understanding the Dashboard

Once enabled, open Performance Insights from the RDS console by selecting your instance and clicking the "Performance Insights" tab.

The main chart shows AAS over time, color-coded by wait event category. Here's what each color typically represents:

- **CPU**: The database is actively processing on CPU. Some CPU usage is normal, but if it dominates, you likely have unoptimized queries.
- **IO (orange)**: The database is waiting for disk reads or writes. Could indicate missing indexes, large table scans, or insufficient instance storage performance.
- **Lock**: Sessions are waiting to acquire locks. Usually caused by long-running transactions or conflicting updates.
- **Network**: Waiting for data to be sent to or received from clients. Often indicates the client isn't consuming results fast enough.

The max vCPU line on the chart is critical. When AAS exceeds this line, your database has more active work than it can handle, and sessions start queueing up.

## Analyzing Wait Events

Let's look at some common wait events and what they mean.

For PostgreSQL:

| Wait Event | Category | What It Means |
|---|---|---|
| `CPU` | CPU | Query actively executing on processor |
| `IO:DataFileRead` | IO | Reading data pages from disk (missing buffer cache hit) |
| `Lock:transactionid` | Lock | Waiting for another transaction to complete |
| `LWLock:BufferMapping` | Lock | Contention on shared buffer mapping |
| `Client:ClientRead` | Network | Waiting for the client to send data |

For MySQL:

| Wait Event | Category | What It Means |
|---|---|---|
| `CPU` | CPU | Active CPU processing |
| `io/table/sql/handler` | IO | Reading or writing table data |
| `synch/mutex/innodb/buf_pool_mutex` | Lock | Buffer pool contention |
| `wait/lock/table/sql/handler` | Lock | Table-level lock wait |

## Using the Top SQL Tab

The Top SQL section shows you which queries are consuming the most database resources. This is often the fastest way to find problems.

You can sort by:
- **Load by waits (AAS)**: Overall impact on the database
- **Calls/sec**: How frequently the query runs
- **Avg latency**: How long each execution takes
- **Rows examined/sec**: How much data the query touches

Here's what to look for:

1. **High AAS with high calls/sec**: A frequently executed query that's not well optimized. Even small improvements here have a big impact.
2. **High AAS with low calls/sec but high avg latency**: A heavy query that runs occasionally but takes a long time. Look for missing indexes or opportunities to restructure.
3. **High rows examined vs rows returned ratio**: The database is scanning way more rows than it returns. This almost always points to a missing index.

## Querying Performance Insights Programmatically

You can pull Performance Insights data through the API for custom dashboards or automated analysis:

```python
import boto3
from datetime import datetime, timedelta

pi_client = boto3.client('pi')

# Get the Performance Insights resource ID for your instance
rds = boto3.client('rds')
instance = rds.describe_db_instances(
    DBInstanceIdentifier='my-monitored-db'
)['DBInstances'][0]
resource_id = instance['DbiResourceId']

# Query database load for the last hour, broken down by wait events
end_time = datetime.utcnow()
start_time = end_time - timedelta(hours=1)

response = pi_client.get_resource_metrics(
    ServiceType='RDS',
    Identifier=resource_id,
    MetricQueries=[
        {
            'Metric': 'db.load.avg',
            'GroupBy': {
                'Group': 'db.wait_event',
                'Limit': 10
            }
        }
    ],
    StartTime=start_time,
    EndTime=end_time,
    PeriodInSeconds=60
)

# Print the top wait events
for key in response['MetricList'][0]['KeyList']:
    print(f"Wait event: {key['Dimensions']['db.wait_event']}")
```

To get the top SQL statements:

```python
# Query the top SQL statements by database load
response = pi_client.get_resource_metrics(
    ServiceType='RDS',
    Identifier=resource_id,
    MetricQueries=[
        {
            'Metric': 'db.load.avg',
            'GroupBy': {
                'Group': 'db.sql',
                'Limit': 5
            }
        }
    ],
    StartTime=start_time,
    EndTime=end_time,
    PeriodInSeconds=300
)

for key in response['MetricList'][0]['KeyList']:
    sql_id = key['Dimensions'].get('db.sql.id', 'N/A')
    statement = key['Dimensions'].get('db.sql.statement', 'N/A')
    print(f"SQL ID: {sql_id}")
    print(f"Statement: {statement[:100]}...")
    print("---")
```

## Setting Up Alerts Based on Performance Insights

Performance Insights integrates with CloudWatch, so you can set up alarms when database load exceeds your capacity:

```bash
# Create a CloudWatch alarm when database load exceeds vCPU count
aws cloudwatch put-metric-alarm \
  --alarm-name "rds-db-load-high" \
  --metric-name "DBLoad" \
  --namespace "AWS/RDS" \
  --statistic "Average" \
  --period 300 \
  --threshold 4 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 3 \
  --dimensions Name=DBInstanceIdentifier,Value=my-monitored-db \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:db-alerts
```

For a more comprehensive monitoring setup, see our post on [setting up CloudWatch alarms for RDS metrics](https://oneuptime.com/blog/post/set-up-cloudwatch-alarms-for-rds-metrics/view).

## Best Practices

**Check Performance Insights regularly, not just during incidents.** Look at it weekly to catch trends before they become problems. A slowly growing AAS over weeks usually means data growth is outpacing your indexes or instance size.

**Compare performance before and after deployments.** Performance Insights makes it easy to see if a new code release introduced a problematic query. Just look at the time window around the deployment.

**Use the counter metrics.** Beyond AAS, Performance Insights tracks database counters like transactions per second, temp table creation rates, and buffer pool hit ratios. These give you a fuller picture of database health.

**Enable Enhanced Monitoring alongside Performance Insights.** They complement each other - Performance Insights shows you what the database engine is doing, while [Enhanced Monitoring](https://oneuptime.com/blog/post/enable-rds-enhanced-monitoring/view) shows you what the operating system is doing.

Performance Insights is one of the most underused features of RDS. It takes about 30 seconds to enable and gives you visibility that would otherwise require installing and configuring third-party monitoring tools. If you're running any production workload on RDS, turn it on.
