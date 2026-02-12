# How to Analyze VPC Flow Logs with CloudWatch Logs Insights

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPC, CloudWatch, Flow Logs, Security

Description: Learn how to use CloudWatch Logs Insights to query and analyze VPC Flow Logs for security monitoring, troubleshooting, and traffic analysis.

---

You've got VPC Flow Logs enabled and data is flowing into CloudWatch Logs. Now what? Raw flow log data is practically unreadable at scale - thousands of records per minute, each one a single line of space-separated values. CloudWatch Logs Insights gives you a SQL-like query language to slice through this data and find what matters.

Let's explore the most useful queries for security analysis, troubleshooting, and traffic monitoring.

## CloudWatch Logs Insights Basics

Logs Insights uses a pipe-based query syntax. You start with data, filter it, transform it, and aggregate it. Queries run against a specific log group (or multiple log groups) and a time range.

The basic structure looks like this:

```
fields @timestamp, srcAddr, dstAddr, dstPort, action
| filter action = "REJECT"
| sort @timestamp desc
| limit 100
```

VPC Flow Logs sent to CloudWatch are automatically parsed, so you can reference fields directly by name. The available fields depend on your log format, but the defaults include: `@timestamp`, `srcAddr`, `dstAddr`, `srcPort`, `dstPort`, `protocol`, `packets`, `bytes`, `action`, `logStatus`, `accountId`, `interfaceId`.

## Security Analysis Queries

### Find Rejected Traffic by Source IP

This query identifies the top source IPs generating rejected traffic - potential attackers or misconfigured services:

```
# Top 20 source IPs with the most rejected connections
fields srcAddr, dstAddr, dstPort, action
| filter action = "REJECT"
| stats count(*) as rejectedCount by srcAddr
| sort rejectedCount desc
| limit 20
```

### Detect Potential Port Scans

A port scan typically shows up as a single source IP connecting to many different destination ports:

```
# Find IPs connecting to more than 20 different ports - possible port scan
fields srcAddr, dstPort
| filter action = "REJECT"
| stats count_distinct(dstPort) as uniquePorts by srcAddr
| filter uniquePorts > 20
| sort uniquePorts desc
| limit 20
```

### Find SSH/RDP Access Attempts

Monitor for unauthorized remote access attempts:

```
# Rejected SSH (22) and RDP (3389) attempts from external IPs
fields @timestamp, srcAddr, dstAddr, dstPort, action
| filter dstPort in [22, 3389] and action = "REJECT"
| filter not isprivateaddr(srcAddr)
| stats count(*) as attempts by srcAddr, dstPort
| sort attempts desc
| limit 25
```

### Identify Data Exfiltration Patterns

Large outbound data transfers could indicate data exfiltration:

```
# Top outbound data transfers by destination (external IPs only)
fields dstAddr, bytes, packets
| filter not isprivateaddr(dstAddr)
| stats sum(bytes) as totalBytes by dstAddr
| sort totalBytes desc
| limit 20
```

## Troubleshooting Queries

### Find Rejected Traffic for a Specific Instance

When an application can't connect to something, flow logs tell you if traffic is being blocked:

```
# All rejected traffic for a specific network interface
fields @timestamp, srcAddr, dstAddr, srcPort, dstPort, protocol, action
| filter interfaceId = "eni-abc123def456"
| filter action = "REJECT"
| sort @timestamp desc
| limit 100
```

### Check Connectivity Between Two IPs

If two services can't talk to each other, check the flow logs for both directions:

```
# Traffic between two specific IPs
fields @timestamp, srcAddr, dstAddr, srcPort, dstPort, protocol, action, packets, bytes
| filter (srcAddr = "10.0.1.15" and dstAddr = "10.0.2.25")
    or (srcAddr = "10.0.2.25" and dstAddr = "10.0.1.15")
| sort @timestamp desc
| limit 100
```

### Find Traffic to a Specific Port

Useful when debugging whether a service is receiving traffic on the expected port:

```
# All traffic hitting port 443 on a specific IP
fields @timestamp, srcAddr, dstAddr, dstPort, action, packets, bytes
| filter dstAddr = "10.0.1.100" and dstPort = 443
| stats count(*) as connections, sum(bytes) as totalBytes by srcAddr, action
| sort connections desc
```

## Traffic Analysis Queries

### Top Talkers by Bandwidth

Find which connections are using the most bandwidth:

```
# Top bandwidth consumers
fields srcAddr, dstAddr, bytes
| stats sum(bytes) as totalBytes by srcAddr, dstAddr
| sort totalBytes desc
| limit 25
```

### Traffic Volume Over Time

Create a time series of traffic volume:

```
# Traffic volume in 5-minute buckets
fields bytes
| stats sum(bytes) as totalBytes by bin(5m) as timeWindow
| sort timeWindow asc
```

### Protocol Distribution

See what protocols are in use across your VPC:

```
# Traffic breakdown by protocol number
# 6 = TCP, 17 = UDP, 1 = ICMP
fields protocol, bytes
| stats sum(bytes) as totalBytes, count(*) as flowCount by protocol
| sort totalBytes desc
```

### Top Destination Ports

Identify which services are receiving the most traffic:

```
# Most popular destination ports
fields dstPort, bytes, action
| filter action = "ACCEPT"
| stats sum(bytes) as totalBytes, count(*) as connections by dstPort
| sort connections desc
| limit 25
```

## Advanced Queries

### Accepted vs Rejected Ratio Per Source

A high rejection ratio from a single source is suspicious:

```
# Acceptance ratio by source IP
fields srcAddr, action
| stats count(*) as total,
    sum(action = "ACCEPT") as accepted,
    sum(action = "REJECT") as rejected by srcAddr
| filter total > 100
| fields srcAddr, total, accepted, rejected,
    (rejected / total * 100) as rejectPercent
| sort rejectPercent desc
| limit 20
```

### Traffic from Non-RFC1918 Addresses

Find external traffic hitting your private resources:

```
# External IPs communicating with internal resources
fields srcAddr, dstAddr, dstPort, action, bytes
| filter not isprivateaddr(srcAddr) and isprivateaddr(dstAddr)
| stats count(*) as connections, sum(bytes) as totalBytes by srcAddr, dstPort
| sort connections desc
| limit 25
```

### Unusual Time-of-Day Activity

Detect traffic spikes outside business hours:

```
# Traffic between midnight and 5 AM
fields @timestamp, srcAddr, dstAddr, bytes, action
| filter dateTimePart(@timestamp, "HH") >= 0
    and dateTimePart(@timestamp, "HH") < 5
| stats count(*) as flows, sum(bytes) as totalBytes by bin(1h)
| sort totalBytes desc
```

## Creating Dashboards

You can save these queries and add them to a CloudWatch dashboard for continuous monitoring.

```bash
# Create a dashboard with flow log widgets
aws cloudwatch put-dashboard \
  --dashboard-name "VPC-Flow-Log-Analysis" \
  --dashboard-body '{
    "widgets": [
      {
        "type": "log",
        "x": 0,
        "y": 0,
        "width": 12,
        "height": 6,
        "properties": {
          "query": "fields srcAddr, action | stats count(*) as total by srcAddr, action | sort total desc | limit 10",
          "region": "us-east-1",
          "stacked": false,
          "view": "table",
          "title": "Top Source IPs"
        }
      },
      {
        "type": "log",
        "x": 12,
        "y": 0,
        "width": 12,
        "height": 6,
        "properties": {
          "query": "fields bytes | stats sum(bytes) as totalBytes by bin(5m) | sort totalBytes desc",
          "region": "us-east-1",
          "stacked": false,
          "view": "timeSeries",
          "title": "Traffic Volume Over Time"
        }
      }
    ]
  }'
```

## Setting Up Automated Alerts

Combine Logs Insights queries with CloudWatch alarms using metric filters:

```bash
# Alert when a single IP gets rejected more than 1000 times in 5 minutes
aws logs put-metric-filter \
  --log-group-name "/vpc/flow-logs/vpc-abc123" \
  --filter-name "HighRejectRate" \
  --filter-pattern '[version, account, eni, srcaddr, dstaddr, srcport, dstport, protocol, packets, bytes, start, end, action="REJECT", status]' \
  --metric-transformations \
    metricName=RejectedFlows,metricNamespace=VPCFlowLogs,metricValue=1

aws cloudwatch put-metric-alarm \
  --alarm-name "HighFlowLogRejects" \
  --metric-name RejectedFlows \
  --namespace VPCFlowLogs \
  --statistic Sum \
  --period 300 \
  --threshold 1000 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:SecurityAlerts"
```

## Performance Tips

Logs Insights has some limits to keep in mind:

- Queries scan a maximum of 10,000 log groups
- Results are capped at 10,000 rows
- Queries timeout after 15 minutes
- You can run up to 30 concurrent queries per account per region

For better performance:

- Narrow your time range as much as possible
- Use `filter` early in the query to reduce the data scanned
- Use `limit` to cap results
- Query specific log groups rather than all of them

## When to Use Athena Instead

CloudWatch Logs Insights is great for ad-hoc queries and recent data. But if you need to analyze months of historical data or run very complex queries, consider using Athena with flow logs stored in S3. See our guide on [analyzing VPC Flow Logs with Athena](https://oneuptime.com/blog/post/analyze-vpc-flow-logs-athena/view) for that approach.

## Wrapping Up

CloudWatch Logs Insights turns raw flow log data into actionable intelligence. Keep a library of saved queries for common investigation scenarios, set up dashboards for continuous monitoring, and pair them with metric filters for automated alerting. The combination of flow logs and Logs Insights gives you solid network visibility without needing a dedicated SIEM tool.
