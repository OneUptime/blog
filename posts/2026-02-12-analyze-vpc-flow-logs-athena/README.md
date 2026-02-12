# How to Analyze VPC Flow Logs with Athena

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPC, Athena, Flow Logs, Security

Description: A practical guide to querying VPC Flow Logs stored in S3 using Amazon Athena for large-scale network traffic analysis and security investigations.

---

When you're dealing with months of VPC Flow Logs across multiple VPCs, CloudWatch Logs Insights starts to struggle. That's where Athena shines. It queries data directly in S3 using standard SQL, handles petabytes of data, and costs you only for the data scanned. If your flow logs live in S3, Athena is the best tool for deep analysis.

Let's set up Athena to query flow logs and walk through the most useful queries.

## Setting Up the Athena Table

Before querying, you need to tell Athena about the structure of your flow log data. Create a database and table that maps to your S3 bucket.

This SQL statement creates a table in Athena that matches the default VPC Flow Log format:

```sql
-- Create a database for network analysis
CREATE DATABASE IF NOT EXISTS network_logs;

-- Create the flow logs table with partitioning
CREATE EXTERNAL TABLE IF NOT EXISTS network_logs.vpc_flow_logs (
  version int,
  account_id string,
  interface_id string,
  srcaddr string,
  dstaddr string,
  srcport int,
  dstport int,
  protocol bigint,
  packets bigint,
  bytes bigint,
  start bigint,
  `end` bigint,
  action string,
  log_status string
)
PARTITIONED BY (
  dt string
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ' '
LOCATION 's3://vpc-flow-logs-123456789012/AWSLogs/123456789012/vpcflowlogs/us-east-1/'
TBLPROPERTIES (
  "skip.header.line.count"="1"
);
```

## Adding Partitions

Athena uses partitions to limit the amount of data it scans. Without partitions, every query reads every file in the bucket. With partitions, it only reads data for the dates you specify.

You can add partitions manually:

```sql
-- Add a partition for a specific date
ALTER TABLE network_logs.vpc_flow_logs ADD
  PARTITION (dt='2026-02-12')
  LOCATION 's3://vpc-flow-logs-123456789012/AWSLogs/123456789012/vpcflowlogs/us-east-1/2026/02/12/';
```

Or use a projection to handle partitions automatically. This approach is much better for ongoing use:

```sql
-- Drop the previous table and recreate with partition projection
CREATE EXTERNAL TABLE IF NOT EXISTS network_logs.vpc_flow_logs_projected (
  version int,
  account_id string,
  interface_id string,
  srcaddr string,
  dstaddr string,
  srcport int,
  dstport int,
  protocol bigint,
  packets bigint,
  bytes bigint,
  start bigint,
  `end` bigint,
  action string,
  log_status string
)
PARTITIONED BY (
  `date` string
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ' '
LOCATION 's3://vpc-flow-logs-123456789012/AWSLogs/123456789012/vpcflowlogs/us-east-1/'
TBLPROPERTIES (
  "skip.header.line.count" = "1",
  "projection.enabled" = "true",
  "projection.date.type" = "date",
  "projection.date.range" = "2025/01/01,NOW",
  "projection.date.format" = "yyyy/MM/dd",
  "projection.date.interval" = "1",
  "projection.date.interval.unit" = "DAYS",
  "storage.location.template" = "s3://vpc-flow-logs-123456789012/AWSLogs/123456789012/vpcflowlogs/us-east-1/${date}"
);
```

Partition projection tells Athena to infer partition locations from a pattern, so you never need to add partitions manually.

## Custom Log Format Table

If you're using a custom flow log format, your table definition needs to match. Here's one for the enhanced format:

```sql
CREATE EXTERNAL TABLE IF NOT EXISTS network_logs.vpc_flow_logs_enhanced (
  version int,
  account_id string,
  interface_id string,
  srcaddr string,
  dstaddr string,
  srcport int,
  dstport int,
  protocol bigint,
  packets bigint,
  bytes bigint,
  start bigint,
  `end` bigint,
  action string,
  log_status string,
  vpc_id string,
  subnet_id string,
  az_id string,
  sublocation_type string,
  sublocation_id string,
  pkt_srcaddr string,
  pkt_dstaddr string,
  region string,
  pkt_src_aws_service string,
  pkt_dst_aws_service string,
  flow_direction string,
  traffic_path int,
  tcp_flags int
)
PARTITIONED BY (`date` string)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ' '
LOCATION 's3://vpc-flow-logs-123456789012/AWSLogs/123456789012/vpcflowlogs/us-east-1/'
TBLPROPERTIES (
  "skip.header.line.count" = "1",
  "projection.enabled" = "true",
  "projection.date.type" = "date",
  "projection.date.range" = "2025/01/01,NOW",
  "projection.date.format" = "yyyy/MM/dd",
  "projection.date.interval" = "1",
  "projection.date.interval.unit" = "DAYS",
  "storage.location.template" = "s3://vpc-flow-logs-123456789012/AWSLogs/123456789012/vpcflowlogs/us-east-1/${date}"
);
```

## Security Analysis Queries

### Top Rejected Source IPs

Find the most persistent sources of rejected traffic over the past week:

```sql
-- Top 20 source IPs with rejected traffic in the past 7 days
SELECT
  srcaddr,
  COUNT(*) as reject_count,
  SUM(bytes) as total_bytes,
  COUNT(DISTINCT dstport) as unique_ports_targeted,
  COUNT(DISTINCT dstaddr) as unique_destinations
FROM network_logs.vpc_flow_logs_projected
WHERE date >= date_format(date_add('day', -7, current_date), '%Y/%m/%d')
  AND action = 'REJECT'
GROUP BY srcaddr
ORDER BY reject_count DESC
LIMIT 20;
```

### Detect Port Scanning Activity

Port scans show a single source IP probing many ports in a short window:

```sql
-- Potential port scanners: IPs hitting 50+ unique ports in a day
SELECT
  srcaddr,
  COUNT(DISTINCT dstport) as ports_scanned,
  COUNT(DISTINCT dstaddr) as targets,
  MIN(from_unixtime(start)) as first_seen,
  MAX(from_unixtime(start)) as last_seen
FROM network_logs.vpc_flow_logs_projected
WHERE date = '2026/02/12'
  AND action = 'REJECT'
GROUP BY srcaddr
HAVING COUNT(DISTINCT dstport) > 50
ORDER BY ports_scanned DESC;
```

### Large Outbound Transfers

Identify possible data exfiltration:

```sql
-- Top outbound data transfers to external IPs
SELECT
  srcaddr,
  dstaddr,
  SUM(bytes) / 1024 / 1024 as megabytes_transferred,
  COUNT(*) as flow_count,
  MIN(from_unixtime(start)) as first_flow,
  MAX(from_unixtime(start)) as last_flow
FROM network_logs.vpc_flow_logs_projected
WHERE date >= date_format(date_add('day', -1, current_date), '%Y/%m/%d')
  AND action = 'ACCEPT'
  AND srcaddr LIKE '10.%'
  AND NOT (dstaddr LIKE '10.%' OR dstaddr LIKE '172.16.%' OR dstaddr LIKE '192.168.%')
GROUP BY srcaddr, dstaddr
HAVING SUM(bytes) > 100000000  -- More than 100 MB
ORDER BY megabytes_transferred DESC
LIMIT 25;
```

## Traffic Analysis Queries

### Daily Traffic Summary

Get a high-level view of traffic patterns:

```sql
-- Daily traffic summary for the past 30 days
SELECT
  date,
  action,
  COUNT(*) as flow_count,
  SUM(packets) as total_packets,
  ROUND(SUM(bytes) / 1024.0 / 1024.0 / 1024.0, 2) as total_gb
FROM network_logs.vpc_flow_logs_projected
WHERE date >= date_format(date_add('day', -30, current_date), '%Y/%m/%d')
GROUP BY date, action
ORDER BY date DESC, action;
```

### Traffic by Protocol

```sql
-- Protocol distribution
SELECT
  CASE protocol
    WHEN 6 THEN 'TCP'
    WHEN 17 THEN 'UDP'
    WHEN 1 THEN 'ICMP'
    ELSE CAST(protocol AS VARCHAR)
  END as protocol_name,
  COUNT(*) as flow_count,
  SUM(packets) as total_packets,
  ROUND(SUM(bytes) / 1024.0 / 1024.0, 2) as total_mb
FROM network_logs.vpc_flow_logs_projected
WHERE date = '2026/02/12'
GROUP BY protocol
ORDER BY total_mb DESC;
```

### Top Communicating Pairs

```sql
-- Top 20 source-destination pairs by traffic volume
SELECT
  srcaddr,
  dstaddr,
  dstport,
  ROUND(SUM(bytes) / 1024.0 / 1024.0, 2) as mb_transferred,
  COUNT(*) as flow_count
FROM network_logs.vpc_flow_logs_projected
WHERE date = '2026/02/12'
  AND action = 'ACCEPT'
GROUP BY srcaddr, dstaddr, dstport
ORDER BY mb_transferred DESC
LIMIT 20;
```

## Optimizing Query Performance and Cost

Athena charges $5 per TB of data scanned. Here's how to keep costs down:

### Always Filter by Date

Every query should include a date filter. This is the single most important optimization:

```sql
-- Good: scans only one day of data
WHERE date = '2026/02/12'

-- Better: scans exactly the range you need
WHERE date BETWEEN '2026/02/01' AND '2026/02/07'

-- Bad: scans everything
WHERE from_unixtime(start) > timestamp '2026-02-01 00:00:00'
```

### Use Parquet Format

If you're generating a lot of flow logs, convert them to Parquet for massive savings. You can set up a daily ETL job:

```sql
-- Create a Parquet version of the table
CREATE TABLE network_logs.vpc_flow_logs_parquet
WITH (
  format = 'PARQUET',
  external_location = 's3://vpc-flow-logs-parquet-123456789012/',
  partitioned_by = ARRAY['date']
) AS
SELECT * FROM network_logs.vpc_flow_logs_projected
WHERE date >= '2026/01/01';
```

Parquet is columnar, so queries that only need a few columns (like srcaddr and action) skip reading the others entirely.

### Create Views for Common Queries

Save time by creating views for queries you run regularly:

```sql
-- Create a view for rejected traffic analysis
CREATE OR REPLACE VIEW network_logs.rejected_traffic AS
SELECT
  from_unixtime(start) as event_time,
  srcaddr,
  dstaddr,
  srcport,
  dstport,
  CASE protocol WHEN 6 THEN 'TCP' WHEN 17 THEN 'UDP' WHEN 1 THEN 'ICMP' ELSE CAST(protocol AS VARCHAR) END as protocol_name,
  packets,
  bytes,
  date
FROM network_logs.vpc_flow_logs_projected
WHERE action = 'REJECT' AND log_status = 'OK';
```

## Scheduling Regular Reports

Use Athena's scheduled queries or Lambda to generate daily security reports:

```python
# Lambda function to run daily flow log analysis
import boto3

def lambda_handler(event, context):
    client = boto3.client('athena')

    query = """
    SELECT srcaddr, COUNT(*) as reject_count
    FROM network_logs.vpc_flow_logs_projected
    WHERE date = date_format(date_add('day', -1, current_date), '%Y/%m/%d')
      AND action = 'REJECT'
    GROUP BY srcaddr
    HAVING COUNT(*) > 1000
    ORDER BY reject_count DESC
    """

    response = client.start_query_execution(
        QueryString=query,
        QueryExecutionContext={'Database': 'network_logs'},
        ResultConfiguration={
            'OutputLocation': 's3://athena-results-123456789012/daily-reports/'
        }
    )

    return response['QueryExecutionId']
```

## Wrapping Up

Athena is the right tool when you need to analyze flow logs at scale - weeks or months of data, across multiple VPCs and accounts. The key is setting up partition projection so you never manage partitions manually, always filtering by date to control costs, and converting to Parquet when volume justifies it.

For real-time monitoring and quick queries on recent data, [CloudWatch Logs Insights](https://oneuptime.com/blog/post/analyze-vpc-flow-logs-cloudwatch-logs-insights/view) is often a better fit. Use both tools together: Athena for historical analysis and investigations, CloudWatch for live monitoring.
