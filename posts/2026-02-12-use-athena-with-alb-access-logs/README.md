# How to Use Athena with ALB Access Logs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Amazon Athena, ALB, Access Logs, Monitoring

Description: Learn how to query Application Load Balancer access logs with Amazon Athena to analyze traffic patterns, debug errors, and monitor application performance.

---

Application Load Balancer access logs capture every request that flows through your ALB. That's a goldmine of data - client IPs, request paths, response codes, latency breakdowns, backend targets, and more. The problem is that these logs land in S3 as compressed text files, and sifting through them manually is painful.

Athena lets you query ALB logs with SQL, turning raw log files into actionable insights about your traffic patterns, error rates, and performance. Let's set it up.

## Enabling ALB Access Logs

First, make sure access logging is turned on for your ALB:

```bash
# Enable access logging for an Application Load Balancer
aws elbv2 modify-load-balancer-attributes \
  --load-balancer-arn arn:aws:elasticloadbalancing:us-east-1:123456789012:loadbalancer/app/my-alb/abc123 \
  --attributes \
    Key=access_logs.s3.enabled,Value=true \
    Key=access_logs.s3.bucket,Value=my-alb-logs \
    Key=access_logs.s3.prefix,Value=alb-logs
```

Logs are delivered to S3 in this structure:
```
s3://my-alb-logs/alb-logs/AWSLogs/123456789012/elasticloadbalancing/us-east-1/2025/01/15/
```

Each file is gzip-compressed and contains space-delimited log entries.

## ALB Log Format

Each line has these fields (in order):

```
type timestamp elb client:port target:port request_processing_time
target_processing_time response_processing_time elb_status_code
target_status_code received_bytes sent_bytes "request" "user_agent"
ssl_cipher ssl_protocol target_group_arn
"trace_id" "domain_name" "chosen_cert_arn"
matched_rule_priority request_creation_time "actions_executed"
"redirect_url" "error_reason" "target:port_list"
"target_status_code_list" "classification" "classification_reason"
```

## Creating the Athena Table

Here's the table definition with partition projection:

```sql
-- Create ALB access logs table with partition projection
CREATE EXTERNAL TABLE alb_logs (
    type STRING,
    time STRING,
    elb STRING,
    client_ip STRING,
    client_port INT,
    target_ip STRING,
    target_port INT,
    request_processing_time DOUBLE,
    target_processing_time DOUBLE,
    response_processing_time DOUBLE,
    elb_status_code INT,
    target_status_code STRING,
    received_bytes BIGINT,
    sent_bytes BIGINT,
    request_verb STRING,
    request_url STRING,
    request_proto STRING,
    user_agent STRING,
    ssl_cipher STRING,
    ssl_protocol STRING,
    target_group_arn STRING,
    trace_id STRING,
    domain_name STRING,
    chosen_cert_arn STRING,
    matched_rule_priority STRING,
    request_creation_time STRING,
    actions_executed STRING,
    redirect_url STRING,
    lambda_error_reason STRING,
    target_port_list STRING,
    target_status_code_list STRING,
    classification STRING,
    classification_reason STRING
)
PARTITIONED BY (
    day STRING
)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.RegexSerDe'
WITH SERDEPROPERTIES (
    'serialization.format' = '1',
    'input.regex' = '([^ ]*) ([^ ]*) ([^ ]*) ([^ ]*):([0-9]*) ([^ ]*)[:-]([0-9]*) ([-.0-9]*) ([-.0-9]*) ([-.0-9]*) (|[-0-9]*) (-|[-0-9]*) ([-0-9]*) ([-0-9]*) \"([^ ]*) (.*) (- |[^ ]*)\" \"([^\"]*)\" ([A-Z0-9-_]+) ([A-Za-z0-9.-]*) ([^ ]*) \"([^\"]*)\" \"([^\"]*)\" \"([^\"]*)\" ([-.0-9]*) ([^ ]*) \"([^\"]*)\" \"([^\"]*)\" \"([^ ]*)\" \"([^\"]*)\" \"([^ ]*)\" \"([^ ]*)\" \"([^ ]*)\"'
)
LOCATION 's3://my-alb-logs/alb-logs/AWSLogs/123456789012/elasticloadbalancing/us-east-1/'
TBLPROPERTIES (
    'projection.enabled' = 'true',
    'projection.day.type' = 'date',
    'projection.day.range' = '2023/01/01,NOW',
    'projection.day.format' = 'yyyy/MM/dd',
    'projection.day.interval' = '1',
    'projection.day.interval.unit' = 'DAYS',
    'storage.location.template' = 's3://my-alb-logs/alb-logs/AWSLogs/123456789012/elasticloadbalancing/us-east-1/${day}/'
);
```

That regex is brutal to read but it correctly parses every field in the ALB log format. The partition projection on `day` means you never need to manually add partitions.

## Traffic Analysis Queries

### Request Volume Over Time

```sql
-- Hourly request count for today
SELECT
    DATE_FORMAT(FROM_ISO8601_TIMESTAMP(time), '%Y-%m-%d %H:00') as hour,
    COUNT(*) as request_count,
    SUM(received_bytes) / 1024 / 1024 as received_mb,
    SUM(sent_bytes) / 1024 / 1024 as sent_mb
FROM alb_logs
WHERE day = '2025/02/12'
GROUP BY DATE_FORMAT(FROM_ISO8601_TIMESTAMP(time), '%Y-%m-%d %H:00')
ORDER BY hour;
```

### Top Requested URLs

```sql
-- Most frequently requested URLs in the last 7 days
SELECT
    request_url,
    COUNT(*) as hits,
    AVG(target_processing_time) as avg_latency,
    APPROX_PERCENTILE(target_processing_time, 0.99) as p99_latency
FROM alb_logs
WHERE day >= '2025/02/06'
    AND day <= '2025/02/12'
GROUP BY request_url
ORDER BY hits DESC
LIMIT 50;
```

### Traffic by Client IP

```sql
-- Top client IPs by request volume
SELECT
    client_ip,
    COUNT(*) as request_count,
    COUNT(DISTINCT request_url) as unique_urls,
    SUM(sent_bytes) / 1024 / 1024 as data_sent_mb
FROM alb_logs
WHERE day = '2025/02/12'
GROUP BY client_ip
ORDER BY request_count DESC
LIMIT 25;
```

## Error Analysis

### HTTP Error Breakdown

```sql
-- Break down errors by status code and URL
SELECT
    elb_status_code,
    request_url,
    COUNT(*) as error_count
FROM alb_logs
WHERE day = '2025/02/12'
    AND elb_status_code >= 400
GROUP BY elb_status_code, request_url
ORDER BY error_count DESC
LIMIT 50;
```

### 5xx Errors with Details

```sql
-- Detailed view of server errors for troubleshooting
SELECT
    time,
    client_ip,
    request_verb,
    request_url,
    elb_status_code,
    target_status_code,
    target_ip,
    target_processing_time,
    lambda_error_reason
FROM alb_logs
WHERE day = '2025/02/12'
    AND elb_status_code >= 500
ORDER BY time DESC
LIMIT 100;
```

### Error Rate Trend

```sql
-- Track error rate by hour
SELECT
    DATE_FORMAT(FROM_ISO8601_TIMESTAMP(time), '%Y-%m-%d %H:00') as hour,
    COUNT(*) as total_requests,
    SUM(CASE WHEN elb_status_code >= 500 THEN 1 ELSE 0 END) as server_errors,
    SUM(CASE WHEN elb_status_code >= 400 AND elb_status_code < 500 THEN 1 ELSE 0 END) as client_errors,
    ROUND(CAST(SUM(CASE WHEN elb_status_code >= 500 THEN 1 ELSE 0 END) AS DOUBLE) / COUNT(*) * 100, 2) as error_rate_pct
FROM alb_logs
WHERE day = '2025/02/12'
GROUP BY DATE_FORMAT(FROM_ISO8601_TIMESTAMP(time), '%Y-%m-%d %H:00')
ORDER BY hour;
```

## Performance Analysis

### Latency Distribution

```sql
-- Latency percentiles by endpoint
SELECT
    request_url,
    COUNT(*) as requests,
    ROUND(AVG(target_processing_time) * 1000, 1) as avg_ms,
    ROUND(APPROX_PERCENTILE(target_processing_time, 0.50) * 1000, 1) as p50_ms,
    ROUND(APPROX_PERCENTILE(target_processing_time, 0.95) * 1000, 1) as p95_ms,
    ROUND(APPROX_PERCENTILE(target_processing_time, 0.99) * 1000, 1) as p99_ms,
    ROUND(MAX(target_processing_time) * 1000, 1) as max_ms
FROM alb_logs
WHERE day = '2025/02/12'
    AND target_processing_time >= 0
GROUP BY request_url
HAVING COUNT(*) > 100
ORDER BY p99_ms DESC
LIMIT 20;
```

### Slow Requests

```sql
-- Find requests taking longer than 5 seconds
SELECT
    time,
    client_ip,
    request_verb,
    request_url,
    target_ip,
    ROUND(request_processing_time * 1000) as alb_time_ms,
    ROUND(target_processing_time * 1000) as target_time_ms,
    ROUND(response_processing_time * 1000) as response_time_ms,
    elb_status_code
FROM alb_logs
WHERE day = '2025/02/12'
    AND target_processing_time > 5.0
ORDER BY target_processing_time DESC
LIMIT 50;
```

### Target Health Analysis

```sql
-- Check which backend targets are serving the most errors
SELECT
    target_ip,
    COUNT(*) as total_requests,
    SUM(CASE WHEN CAST(target_status_code AS INTEGER) >= 500 THEN 1 ELSE 0 END) as errors,
    ROUND(AVG(target_processing_time) * 1000, 1) as avg_latency_ms,
    ROUND(CAST(SUM(CASE WHEN CAST(target_status_code AS INTEGER) >= 500 THEN 1 ELSE 0 END) AS DOUBLE) / COUNT(*) * 100, 2) as error_pct
FROM alb_logs
WHERE day = '2025/02/12'
    AND target_ip != '-'
    AND target_status_code != '-'
GROUP BY target_ip
ORDER BY error_pct DESC;
```

This is especially useful for identifying unhealthy targets that haven't failed health checks yet but are serving errors to a portion of traffic.

## Security Analysis

### Potential Bot Traffic

```sql
-- Identify potential bots by user agent and request patterns
SELECT
    user_agent,
    COUNT(DISTINCT client_ip) as unique_ips,
    COUNT(*) as total_requests,
    COUNT(DISTINCT request_url) as unique_urls
FROM alb_logs
WHERE day = '2025/02/12'
GROUP BY user_agent
HAVING COUNT(*) > 500
ORDER BY total_requests DESC
LIMIT 30;
```

### Suspicious Rate Patterns

```sql
-- Find IPs making too many requests per minute
SELECT
    client_ip,
    DATE_FORMAT(FROM_ISO8601_TIMESTAMP(time), '%Y-%m-%d %H:%i') as minute,
    COUNT(*) as requests_per_minute
FROM alb_logs
WHERE day = '2025/02/12'
GROUP BY client_ip, DATE_FORMAT(FROM_ISO8601_TIMESTAMP(time), '%Y-%m-%d %H:%i')
HAVING COUNT(*) > 100
ORDER BY requests_per_minute DESC
LIMIT 50;
```

## Automating Log Analysis

For continuous monitoring, run these queries on a schedule and alert on thresholds. A Lambda function triggered by CloudWatch Events can execute Athena queries and send alerts via SNS when error rates spike or unusual traffic patterns appear.

For comprehensive application monitoring that includes uptime checks, incident management, and status pages alongside your log analysis, consider a platform like [OneUptime](https://oneuptime.com). It complements Athena-based log analysis with real-time alerting and incident workflows.

Also check out our guide on [using Athena with VPC Flow Logs](https://oneuptime.com/blog/post/use-athena-with-vpc-flow-logs/view) for network-level traffic analysis.

## Wrapping Up

ALB access logs combined with Athena give you a powerful traffic analysis tool without any infrastructure to manage. The key is using partition projection so queries target only the days you care about, which keeps costs low and queries fast. Build a library of saved queries for your most common analysis tasks and automate the critical ones for continuous monitoring.
