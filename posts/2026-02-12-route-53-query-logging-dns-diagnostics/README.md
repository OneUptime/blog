# How to Use Route 53 Query Logging for DNS Diagnostics

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Route 53, DNS, Logging, Monitoring

Description: Learn how to enable and analyze Route 53 DNS query logs for troubleshooting resolution issues, security monitoring, and traffic analysis.

---

When DNS resolution goes sideways, you need to know what's happening at the query level. Route 53 query logging captures every DNS query that hits your hosted zones or resolver endpoints, giving you the raw data to troubleshoot failures, detect anomalies, and understand traffic patterns. Let's set it up and dig into how to actually use the logs.

## Two Types of Query Logging

Route 53 has two separate logging features, and they cover different things:

1. **DNS Query Logging** - Logs queries to your public and private hosted zones. Shows which domains are being queried, from where, and what responses were returned.

2. **Resolver Query Logging** - Logs queries that pass through Route 53 Resolver in your VPC. This captures all DNS queries from your VPC resources, not just ones for your hosted zones.

For most diagnostic work, you'll want both.

## Setting Up DNS Query Logging for Hosted Zones

First, create a CloudWatch Logs log group. It must be in us-east-1 for public hosted zones:

```bash
# Create the log group in us-east-1 (required for public hosted zones)
aws logs create-log-group \
  --log-group-name /aws/route53/example.com \
  --region us-east-1
```

Set a retention policy so logs don't grow forever:

```bash
# Set log retention to 30 days
aws logs put-retention-policy \
  --log-group-name /aws/route53/example.com \
  --retention-in-days 30 \
  --region us-east-1
```

Route 53 needs permission to write to the log group. Create a resource policy:

```bash
# Grant Route 53 permission to write to the log group
aws logs put-resource-policy \
  --policy-name route53-query-logging \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Sid": "Route53LogsToCloudWatchLogs",
      "Effect": "Allow",
      "Principal": {"Service": "route53.amazonaws.com"},
      "Action": ["logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": "arn:aws:logs:us-east-1:123456789012:log-group:/aws/route53/*"
    }]
  }' \
  --region us-east-1
```

Now enable query logging on your hosted zone:

```bash
# Enable query logging on your hosted zone
aws route53 create-query-logging-config \
  --hosted-zone-id Z1234567890 \
  --cloud-watch-logs-log-group-arn \
    "arn:aws:logs:us-east-1:123456789012:log-group:/aws/route53/example.com"
```

## Setting Up Resolver Query Logging

This captures all DNS queries from your VPC, regardless of whether they hit your hosted zones:

```bash
# Create a log group for resolver query logs
aws logs create-log-group \
  --log-group-name /aws/route53resolver/vpc-queries \
  --region us-east-1

# Create the resolver query log configuration
aws route53resolver create-resolver-query-log-config \
  --name "vpc-dns-queries" \
  --destination-arn "arn:aws:logs:us-east-1:123456789012:log-group:/aws/route53resolver/vpc-queries" \
  --creator-request-id "qlog-$(date +%s)"
```

Associate it with your VPC:

```bash
# Associate the query log config with your VPC
aws route53resolver associate-resolver-query-log-config \
  --resolver-query-log-config-id rqlc-abc123 \
  --resource-id vpc-0abc123
```

You can also send resolver logs to S3 or Kinesis Data Firehose instead of CloudWatch Logs:

```bash
# Alternative: send to S3 for long-term storage
aws route53resolver create-resolver-query-log-config \
  --name "vpc-dns-queries-s3" \
  --destination-arn "arn:aws:s3:::my-dns-logs-bucket" \
  --creator-request-id "qlog-s3-$(date +%s)"
```

## Understanding the Log Format

DNS query logs include these fields:

```
version account_id region hosted_zone_id query_name query_type response_code
protocol edge_location resolver_ip edns_client_subnet query_timestamp
```

Here's a real example log line:

```
1.0 123456789012 us-east-1 Z1234567890 www.example.com A NOERROR UDP
IAD89-C1 10.0.1.2 - 2026-02-12T10:30:45Z
```

Resolver query logs are in JSON format and include more detail:

```json
{
  "srcaddr": "10.0.1.50",
  "srcport": "54321",
  "qdcount": 1,
  "opcode": "Query",
  "qname": "api.example.com.",
  "qclass": "IN",
  "qtype": "A",
  "rcode": "NOERROR",
  "answers": [
    {
      "Rdata": "10.0.5.20",
      "Type": "A",
      "Class": "IN"
    }
  ],
  "srcids": {
    "instance": "i-0abc123def456"
  },
  "timestamp": "2026-02-12T10:30:45Z",
  "version": "1.1",
  "account_id": "123456789012",
  "region": "us-east-1",
  "vpc_id": "vpc-0abc123"
}
```

The `srcids` field is particularly useful - it tells you which EC2 instance made the query.

## Querying Logs for Diagnostics

Use CloudWatch Logs Insights to analyze the data. Here are some practical queries:

Find all failed DNS queries (NXDOMAIN means the domain doesn't exist, SERVFAIL means the server couldn't resolve it):

```
# Find failed DNS queries in the last hour
fields @timestamp, qname, qtype, rcode, srcaddr
| filter rcode != "NOERROR"
| sort @timestamp desc
| limit 100
```

Identify the top queried domains:

```
# Top 20 most queried domain names
fields qname
| stats count(*) as query_count by qname
| sort query_count desc
| limit 20
```

Find queries from a specific instance:

```
# All DNS queries from a specific EC2 instance
fields @timestamp, qname, qtype, rcode
| filter srcids.instance = "i-0abc123def456"
| sort @timestamp desc
| limit 50
```

Track DNS query volume over time:

```
# DNS query volume per 5-minute interval
fields @timestamp
| stats count(*) as queries by bin(5m) as time_bucket
| sort time_bucket asc
```

Find potential DNS tunneling (unusually long domain names):

```
# Find queries with suspiciously long domain names
fields @timestamp, qname, srcaddr, strlen(qname) as name_length
| filter name_length > 100
| sort name_length desc
| limit 50
```

## Setting Up Alerts

Create CloudWatch alarms to catch DNS issues proactively:

```bash
# Create a metric filter for SERVFAIL responses
aws logs put-metric-filter \
  --log-group-name /aws/route53resolver/vpc-queries \
  --filter-name "dns-servfail" \
  --filter-pattern '{ $.rcode = "SERVFAIL" }' \
  --metric-transformations \
    'metricName=DNSServfailCount,metricNamespace=DNS/Resolver,metricValue=1,defaultValue=0'

# Create an alarm when SERVFAIL count spikes
aws cloudwatch put-metric-alarm \
  --alarm-name "dns-servfail-spike" \
  --namespace DNS/Resolver \
  --metric-name DNSServfailCount \
  --statistic Sum \
  --period 300 \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:alerts
```

Similarly, alert on NXDOMAIN spikes which could indicate misconfigured applications or DNS enumeration attacks:

```bash
# Create a metric filter for NXDOMAIN responses
aws logs put-metric-filter \
  --log-group-name /aws/route53resolver/vpc-queries \
  --filter-name "dns-nxdomain" \
  --filter-pattern '{ $.rcode = "NXDOMAIN" }' \
  --metric-transformations \
    'metricName=DNSNxdomainCount,metricNamespace=DNS/Resolver,metricValue=1,defaultValue=0'
```

## Practical Diagnostic Scenarios

**Scenario: Application can't connect to a database by hostname**

Check the resolver logs for the specific hostname:

```
fields @timestamp, qname, rcode, answers.0.Rdata, srcids.instance
| filter qname like /mydb.internal/
| sort @timestamp desc
| limit 20
```

If you see NXDOMAIN, the record doesn't exist in your private hosted zone. If you see SERVFAIL, the resolver can't reach the authoritative DNS server.

**Scenario: Intermittent DNS timeouts**

Look for patterns in query timing:

```
fields @timestamp, qname, rcode, srcaddr
| filter rcode = "SERVFAIL" or rcode = "REFUSED"
| stats count(*) as failures by bin(1m), srcaddr
| sort failures desc
```

This might reveal that a specific source is generating too many queries and hitting rate limits, or that failures correlate with VPN connectivity issues.

**Scenario: Unexpected external DNS queries**

Find out what external domains your VPC resources are querying:

```
fields qname, srcids.instance
| filter qname not like /\.internal$/ and qname not like /amazonaws\.com$/
| stats count(*) as queries by qname
| sort queries desc
| limit 50
```

## Cost Management

DNS query logs can generate a lot of data. A moderately busy VPC might produce gigabytes of logs per day. To control costs:

- Set appropriate retention periods (7-30 days for troubleshooting)
- Use S3 instead of CloudWatch Logs for long-term storage (much cheaper)
- Apply log group filters to only capture specific record types or response codes if you don't need everything
- Consider sampling if volume is extremely high

## Summary

Route 53 query logging is essential for DNS troubleshooting and security monitoring. Set up both hosted zone logging and resolver query logging for complete visibility. Use CloudWatch Logs Insights for ad-hoc analysis and metric filters with alarms for proactive monitoring. The logs tell you exactly what's being queried, by whom, and what response they got - which is usually all you need to diagnose DNS issues quickly.
