# How to Query VPC Flow Logs with CloudWatch Logs Insights

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudWatch, VPC, Networking, Security

Description: Learn how to use CloudWatch Logs Insights to query and analyze VPC Flow Logs for network troubleshooting, security analysis, and traffic monitoring.

---

VPC Flow Logs capture information about the IP traffic flowing through your VPC network interfaces. They're indispensable for network troubleshooting, security monitoring, and understanding traffic patterns. But raw flow log data is dense and hard to read - you need a good query tool to make sense of it. That's where CloudWatch Logs Insights comes in.

When you enable VPC Flow Logs with CloudWatch Logs as the destination, every flow record lands in a log group you specify. From there, Logs Insights lets you slice, filter, and aggregate the data in ways that would be painful or impossible with raw log browsing.

## VPC Flow Log Format

The default flow log format (version 2) includes these fields:

```
version account-id interface-id srcaddr dstaddr srcport dstport protocol packets bytes start end action log-status
```

A sample record looks like:

```
2 123456789012 eni-abc123 10.0.1.100 10.0.2.50 44312 443 6 25 5000 1707696000 1707696060 ACCEPT OK
```

CloudWatch Logs Insights automatically discovers these fields when you query them, so you can reference `srcaddr`, `dstaddr`, `srcport`, `dstport`, `protocol`, `packets`, `bytes`, `action`, etc. directly.

## Basic Traffic Queries

### Most recent rejected connections

This is usually the first thing you check when debugging connectivity issues:

```
filter action = "REJECT"
| fields @timestamp, srcaddr, dstaddr, srcport, dstport, protocol
| sort @timestamp desc
| limit 50
```

### Top talkers by bytes transferred

Find which sources are sending the most data:

```
stats sum(bytes) as totalBytes by srcaddr
| sort totalBytes desc
| limit 20
```

### Traffic volume over time

Visualize total network throughput:

```
stats sum(bytes) / 1048576 as totalMB, sum(packets) as totalPackets by bin(5m)
```

## Security Analysis Queries

### Rejected connections by source IP

Identify IPs that are hitting your security groups and getting blocked:

```
filter action = "REJECT"
| stats count(*) as rejectedFlows by srcaddr
| sort rejectedFlows desc
| limit 25
```

### Port scanning detection

Look for IPs probing multiple ports on a single destination:

```
filter action = "REJECT"
| stats count_distinct(dstport) as uniquePorts, count(*) as attempts by srcaddr, dstaddr
| filter uniquePorts > 10
| sort uniquePorts desc
| limit 20
```

This query finds source IPs that tried to connect to more than 10 different ports on the same destination - a classic sign of port scanning.

### External traffic to unexpected ports

Check for traffic on ports that shouldn't be publicly accessible:

```
filter dstport not in [80, 443, 22] and action = "ACCEPT"
| filter not ispresent(srcaddr like /^10\./ or srcaddr like /^172\.(1[6-9]|2[0-9]|3[01])\./ or srcaddr like /^192\.168\./)
| stats count(*) as flows, sum(bytes) as totalBytes by dstport, dstaddr
| sort flows desc
| limit 20
```

### SSH access patterns

Monitor who's connecting via SSH:

```
filter dstport = 22 and action = "ACCEPT"
| stats count(*) as connections, sum(bytes) as totalBytes by srcaddr, dstaddr
| sort connections desc
| limit 20
```

### Connections to known bad ports

Check for traffic on ports commonly used by malware:

```
filter dstport in [4444, 5555, 6666, 1234, 31337, 12345]
| fields @timestamp, srcaddr, dstaddr, dstport, action
| sort @timestamp desc
| limit 50
```

## Network Troubleshooting Queries

### Check connectivity between two hosts

When you know the source and destination and want to see what's happening:

```
filter (srcaddr = "10.0.1.100" and dstaddr = "10.0.2.50") or (srcaddr = "10.0.2.50" and dstaddr = "10.0.1.100")
| fields @timestamp, srcaddr, dstaddr, srcport, dstport, protocol, action, packets, bytes
| sort @timestamp desc
| limit 100
```

### Find rejected connections for a specific instance

When an application can't connect and you suspect security groups:

```
filter srcaddr = "10.0.1.100" and action = "REJECT"
| stats count(*) as rejected by dstaddr, dstport, protocol
| sort rejected desc
| limit 20
```

### Protocol breakdown

See the mix of TCP, UDP, and ICMP traffic:

```
stats sum(bytes) as totalBytes, sum(packets) as totalPackets, count(*) as flows by protocol
| sort totalBytes desc
```

Protocol numbers map to: 6 = TCP, 17 = UDP, 1 = ICMP.

### DNS traffic analysis

DNS runs on UDP port 53:

```
filter dstport = 53 and protocol = 17
| stats count(*) as queries, sum(bytes) as totalBytes by srcaddr
| sort queries desc
| limit 20
```

## Traffic Pattern Analysis

### Traffic by subnet

If you use consistent CIDR ranges, you can group traffic by subnet:

```
filter action = "ACCEPT"
| parse srcaddr /(?<srcSubnet>\d+\.\d+\.\d+)\.\d+/
| parse dstaddr /(?<dstSubnet>\d+\.\d+\.\d+)\.\d+/
| stats sum(bytes) / 1048576 as trafficMB, count(*) as flows by srcSubnet, dstSubnet
| sort trafficMB desc
| limit 20
```

### Peak traffic hours

Identify when your network is busiest:

```
stats sum(bytes) / 1073741824 as trafficGB by bin(1h)
| sort trafficGB desc
| limit 24
```

### Top communication pairs

Find which host pairs exchange the most data:

```
filter action = "ACCEPT"
| stats sum(bytes) / 1048576 as trafficMB, sum(packets) as totalPackets by srcaddr, dstaddr
| sort trafficMB desc
| limit 20
```

### Service port distribution

See which services are handling the most traffic:

```
filter action = "ACCEPT"
| stats sum(bytes) / 1048576 as trafficMB, count(*) as flows by dstport
| sort trafficMB desc
| limit 20
```

## Cross-AZ Traffic Analysis

Cross-AZ data transfer costs money on AWS. If your flow logs include the `az-id` field (custom format), you can identify cross-AZ traffic:

```
filter srcaz != dstaz
| stats sum(bytes) / 1073741824 as crossAzGB by srcaz, dstaz
| sort crossAzGB desc
```

Even without the AZ field, you can approximate by checking traffic between subnets in different AZs.

## Enabling VPC Flow Logs

If you haven't set up flow logs yet, here's how:

```bash
# Create a log group for flow logs
aws logs create-log-group \
  --log-group-name "/vpc/flow-logs/prod-vpc"

# Set retention to keep costs manageable
aws logs put-retention-policy \
  --log-group-name "/vpc/flow-logs/prod-vpc" \
  --retention-in-days 14

# Create the flow log
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-abc123 \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name "/vpc/flow-logs/prod-vpc" \
  --deliver-logs-permission-arn arn:aws:iam::123456789012:role/VPCFlowLogsRole
```

The IAM role needs permission to write to CloudWatch Logs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ],
      "Effect": "Allow",
      "Resource": "*"
    }
  ]
}
```

## Performance Tips

VPC Flow Logs can generate a massive volume of data. A few tips for query performance:

- Narrow your time range as much as possible. Querying 7 days of flow logs across a busy VPC will be slow and expensive.
- Use `filter` early in your query pipeline to reduce the data processed.
- If you only need specific ENIs, filter by `interfaceId` first.
- Consider using the Infrequent Access log class for flow logs if you only query them occasionally.

## Wrapping Up

VPC Flow Logs combined with Logs Insights give you powerful network visibility. Whether you're troubleshooting a connectivity issue, investigating a security incident, or understanding your traffic patterns, these queries will get you answers fast. For more on the query syntax behind these examples, see our [Logs Insights query syntax guide](https://oneuptime.com/blog/post/2026-02-12-cloudwatch-logs-insights-query-syntax/view). And if you want to keep flow logs long-term at lower cost, check out [exporting CloudWatch Logs to S3](https://oneuptime.com/blog/post/2026-02-12-export-cloudwatch-logs-s3/view).
