# How to Use Athena with VPC Flow Logs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Athena, VPC Flow Logs, Networking, Security

Description: Learn how to query VPC Flow Logs with Amazon Athena for network traffic analysis, security investigations, and troubleshooting connectivity issues.

---

VPC Flow Logs capture information about IP traffic going to and from network interfaces in your VPC. They tell you who's talking to whom, on what ports, and whether the traffic was accepted or rejected. When something goes wrong - a connection timeout, a security breach, or unexpected traffic patterns - flow logs are where you start investigating.

The raw logs sit in S3 as text files. Querying them with Athena gives you SQL-powered network analysis without any infrastructure to manage.

## Enabling VPC Flow Logs

If you haven't enabled flow logs yet, set them up to deliver to S3:

```bash
# Create a VPC flow log that delivers to S3
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-abc12345 \
  --traffic-type ALL \
  --log-destination-type s3 \
  --log-destination arn:aws:s3:::my-flow-logs-bucket/vpc-flow-logs/ \
  --log-format '${version} ${account-id} ${interface-id} ${srcaddr} ${dstaddr} ${srcport} ${dstport} ${protocol} ${packets} ${bytes} ${start} ${end} ${action} ${log-status}' \
  --max-aggregation-interval 60
```

The `max-aggregation-interval` of 60 seconds gives you the most granular data. You can also set it to 600 seconds (10 minutes) to reduce log volume.

Logs are organized by date:
```
s3://my-flow-logs-bucket/vpc-flow-logs/AWSLogs/123456789012/vpcflowlogs/us-east-1/2025/02/12/
```

## Creating the Athena Table

Here's the table definition with partition projection:

```sql
-- Create a VPC Flow Logs table with partition projection
CREATE EXTERNAL TABLE vpc_flow_logs (
    version INT,
    account_id STRING,
    interface_id STRING,
    srcaddr STRING,
    dstaddr STRING,
    srcport INT,
    dstport INT,
    protocol BIGINT,
    packets BIGINT,
    bytes BIGINT,
    start_time BIGINT,
    end_time BIGINT,
    action STRING,
    log_status STRING
)
PARTITIONED BY (
    date_partition STRING
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ' '
LOCATION 's3://my-flow-logs-bucket/vpc-flow-logs/AWSLogs/123456789012/vpcflowlogs/us-east-1/'
TBLPROPERTIES (
    'skip.header.line.count'='1',
    'projection.enabled' = 'true',
    'projection.date_partition.type' = 'date',
    'projection.date_partition.range' = '2023/01/01,NOW',
    'projection.date_partition.format' = 'yyyy/MM/dd',
    'projection.date_partition.interval' = '1',
    'projection.date_partition.interval.unit' = 'DAYS',
    'storage.location.template' = 's3://my-flow-logs-bucket/vpc-flow-logs/AWSLogs/123456789012/vpcflowlogs/us-east-1/${date_partition}/'
);
```

## Understanding Protocol Numbers

Flow logs use IANA protocol numbers. The most common ones:

| Number | Protocol |
|--------|----------|
| 6 | TCP |
| 17 | UDP |
| 1 | ICMP |

You'll often want to translate these in your queries:

```sql
-- Map protocol numbers to names
SELECT
    srcaddr,
    dstaddr,
    dstport,
    CASE protocol
        WHEN 6 THEN 'TCP'
        WHEN 17 THEN 'UDP'
        WHEN 1 THEN 'ICMP'
        ELSE CAST(protocol AS VARCHAR)
    END as protocol_name,
    action,
    SUM(bytes) as total_bytes,
    SUM(packets) as total_packets
FROM vpc_flow_logs
WHERE date_partition = '2025/02/12'
GROUP BY srcaddr, dstaddr, dstport, protocol, action
ORDER BY total_bytes DESC
LIMIT 50;
```

## Network Traffic Analysis

### Top Talkers

```sql
-- Find the IP pairs generating the most traffic
SELECT
    srcaddr,
    dstaddr,
    SUM(bytes) / 1024 / 1024 as total_mb,
    SUM(packets) as total_packets,
    COUNT(*) as flow_count
FROM vpc_flow_logs
WHERE date_partition = '2025/02/12'
    AND action = 'ACCEPT'
GROUP BY srcaddr, dstaddr
ORDER BY total_mb DESC
LIMIT 25;
```

### Traffic by Port

```sql
-- Analyze traffic distribution by destination port
SELECT
    dstport,
    CASE protocol
        WHEN 6 THEN 'TCP'
        WHEN 17 THEN 'UDP'
        ELSE CAST(protocol AS VARCHAR)
    END as proto,
    COUNT(*) as connection_count,
    SUM(bytes) / 1024 / 1024 as total_mb,
    COUNT(DISTINCT srcaddr) as unique_sources
FROM vpc_flow_logs
WHERE date_partition = '2025/02/12'
    AND action = 'ACCEPT'
GROUP BY dstport, protocol
ORDER BY connection_count DESC
LIMIT 30;
```

### Bandwidth Over Time

```sql
-- Track bandwidth usage by hour
SELECT
    FROM_UNIXTIME(start_time - (start_time % 3600)) as hour,
    SUM(bytes) / 1024 / 1024 / 1024 as total_gb,
    SUM(packets) as total_packets,
    COUNT(DISTINCT srcaddr) as unique_sources,
    COUNT(DISTINCT dstaddr) as unique_destinations
FROM vpc_flow_logs
WHERE date_partition = '2025/02/12'
GROUP BY start_time - (start_time % 3600)
ORDER BY hour;
```

## Security Analysis

### Rejected Traffic

Rejected flows indicate traffic that was blocked by security groups or network ACLs:

```sql
-- Analyze rejected traffic to identify potential threats
SELECT
    srcaddr,
    dstaddr,
    dstport,
    CASE protocol
        WHEN 6 THEN 'TCP'
        WHEN 17 THEN 'UDP'
        WHEN 1 THEN 'ICMP'
        ELSE CAST(protocol AS VARCHAR)
    END as proto,
    COUNT(*) as rejected_count,
    SUM(packets) as total_packets
FROM vpc_flow_logs
WHERE date_partition = '2025/02/12'
    AND action = 'REJECT'
GROUP BY srcaddr, dstaddr, dstport, protocol
ORDER BY rejected_count DESC
LIMIT 50;
```

### Port Scan Detection

Port scans are characterized by a single source IP hitting many destination ports:

```sql
-- Detect potential port scanning activity
SELECT
    srcaddr,
    dstaddr,
    COUNT(DISTINCT dstport) as unique_ports_targeted,
    MIN(dstport) as min_port,
    MAX(dstport) as max_port,
    COUNT(*) as total_flows
FROM vpc_flow_logs
WHERE date_partition = '2025/02/12'
    AND protocol = 6  -- TCP
    AND action = 'REJECT'
GROUP BY srcaddr, dstaddr
HAVING COUNT(DISTINCT dstport) > 20
ORDER BY unique_ports_targeted DESC;
```

A source IP hitting 20+ different ports on the same destination is almost certainly scanning.

### Unexpected Outbound Traffic

Check for outbound connections to unusual ports that might indicate data exfiltration or compromised instances:

```sql
-- Find outbound traffic on non-standard ports
SELECT
    srcaddr,
    dstaddr,
    dstport,
    SUM(bytes) / 1024 as total_kb,
    SUM(packets) as total_packets,
    COUNT(*) as flow_count
FROM vpc_flow_logs
WHERE date_partition = '2025/02/12'
    AND action = 'ACCEPT'
    AND protocol = 6
    AND dstport NOT IN (80, 443, 22, 53, 123, 3306, 5432, 6379, 27017)
    AND srcaddr LIKE '10.%'  -- Internal source
    AND NOT dstaddr LIKE '10.%'  -- External destination
GROUP BY srcaddr, dstaddr, dstport
ORDER BY total_kb DESC
LIMIT 50;
```

### SSH/RDP Access Audit

```sql
-- Audit SSH and RDP access patterns
SELECT
    srcaddr,
    dstaddr,
    dstport,
    action,
    SUM(bytes) / 1024 as total_kb,
    COUNT(*) as connection_count,
    MIN(FROM_UNIXTIME(start_time)) as first_seen,
    MAX(FROM_UNIXTIME(end_time)) as last_seen
FROM vpc_flow_logs
WHERE date_partition >= '2025/02/06'
    AND date_partition <= '2025/02/12'
    AND dstport IN (22, 3389)
GROUP BY srcaddr, dstaddr, dstport, action
ORDER BY connection_count DESC;
```

## Troubleshooting Connectivity

### Finding Rejected Connections to a Specific Instance

When a service can't connect to something, check the flow logs:

```sql
-- Check all traffic to/from a specific network interface
SELECT
    FROM_UNIXTIME(start_time) as time,
    srcaddr,
    dstaddr,
    srcport,
    dstport,
    CASE protocol WHEN 6 THEN 'TCP' WHEN 17 THEN 'UDP' ELSE CAST(protocol AS VARCHAR) END as proto,
    action,
    packets,
    bytes
FROM vpc_flow_logs
WHERE date_partition = '2025/02/12'
    AND interface_id = 'eni-0abc123def456'
ORDER BY start_time DESC
LIMIT 200;
```

### Asymmetric Traffic Analysis

If traffic goes out but no response comes back, that's a routing or security group issue:

```sql
-- Find traffic with no return flow (potential routing or SG issues)
WITH outbound AS (
    SELECT srcaddr, dstaddr, dstport, protocol
    FROM vpc_flow_logs
    WHERE date_partition = '2025/02/12'
        AND srcaddr LIKE '10.0.1.%'
        AND action = 'ACCEPT'
),
inbound AS (
    SELECT srcaddr, dstaddr, srcport, protocol
    FROM vpc_flow_logs
    WHERE date_partition = '2025/02/12'
        AND dstaddr LIKE '10.0.1.%'
        AND action = 'ACCEPT'
)
SELECT DISTINCT
    o.srcaddr as source,
    o.dstaddr as destination,
    o.dstport as port,
    o.protocol
FROM outbound o
LEFT JOIN inbound i ON o.srcaddr = i.dstaddr
    AND o.dstaddr = i.srcaddr
    AND o.protocol = i.protocol
WHERE i.srcaddr IS NULL
LIMIT 50;
```

## Cost Optimization

VPC Flow Logs can generate a lot of data. A busy VPC might produce gigabytes per day. To keep query costs down:

1. **Always filter on the date partition** - never scan all dates
2. **Filter on action when possible** - if you only need rejected traffic, filter for it
3. **Consider converting to Parquet** - for very high-volume logs, converting to columnar format can cut costs by 90%+ (see [optimizing with column formats](https://oneuptime.com/blog/post/2026-02-12-optimize-athena-queries-with-column-formats-parquet-orc/view))
4. **Use aggregation intervals wisely** - 600-second intervals produce less data than 60-second intervals

For more tips on Athena cost management, check out [reducing Athena query costs](https://oneuptime.com/blog/post/2026-02-12-reduce-athena-query-costs/view).

## Wrapping Up

VPC Flow Logs with Athena give you network-level visibility that would otherwise require expensive third-party tools. The combination is particularly powerful for security investigations, connectivity troubleshooting, and understanding traffic patterns across your AWS infrastructure.

Build a library of saved queries for your common analysis tasks, and consider automating security-focused queries to run daily. For application-level monitoring to complement your network analysis, check out our posts on [using Athena with ALB access logs](https://oneuptime.com/blog/post/2026-02-12-use-athena-with-alb-access-logs/view) and [CloudTrail logs](https://oneuptime.com/blog/post/2026-02-12-use-athena-with-cloudtrail-logs/view).
