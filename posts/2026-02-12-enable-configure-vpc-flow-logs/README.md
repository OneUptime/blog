# How to Enable and Configure VPC Flow Logs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPC, Flow Logs, Networking, Security

Description: Learn how to enable and configure VPC Flow Logs to capture network traffic metadata for security analysis, troubleshooting, and compliance monitoring.

---

VPC Flow Logs capture information about IP traffic going to and from network interfaces in your VPC. They don't capture packet contents - just metadata like source IP, destination IP, ports, protocol, and whether the traffic was accepted or rejected. This metadata is incredibly useful for security investigations, network troubleshooting, and compliance requirements.

Let's set them up properly.

## Where Flow Logs Can Be Attached

You can create flow logs at three levels:

- **VPC level** - Captures traffic for all network interfaces in the VPC
- **Subnet level** - Captures traffic for all network interfaces in a specific subnet
- **Network interface level** - Captures traffic for a single ENI

Most organizations start with VPC-level flow logs to get broad visibility, then add more granular logs for specific workloads that need extra attention.

## Flow Log Destinations

Flow logs can be sent to three destinations:

1. **CloudWatch Logs** - Good for real-time monitoring and alerting
2. **S3** - Best for long-term storage and batch analysis
3. **Kinesis Data Firehose** - Good for streaming to third-party tools

Each has trade-offs. CloudWatch Logs is more expensive for high-volume traffic but lets you query logs quickly and set up alarms. S3 is cheaper for storage and works great with Athena for analysis. Kinesis Firehose is the best choice when you're shipping logs to external SIEM tools.

## Creating a VPC Flow Log to CloudWatch Logs

First, create an IAM role that allows VPC Flow Logs to publish to CloudWatch:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "vpc-flow-logs.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

And the permission policy the role needs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ],
      "Resource": "*"
    }
  ]
}
```

Now create the flow log:

```bash
# Create a CloudWatch log group for flow logs
aws logs create-log-group \
  --log-group-name "/vpc/flow-logs/vpc-abc123"

# Set a retention policy to control costs
aws logs put-retention-policy \
  --log-group-name "/vpc/flow-logs/vpc-abc123" \
  --retention-in-days 30

# Create the flow log
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-abc123 \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name "/vpc/flow-logs/vpc-abc123" \
  --deliver-logs-permission-arn "arn:aws:iam::123456789012:role/VPCFlowLogsRole"
```

The `--traffic-type ALL` flag captures both accepted and rejected traffic. You can also use `ACCEPT` or `REJECT` if you only care about one type.

## Creating a VPC Flow Log to S3

For long-term storage and cost efficiency, S3 is the better destination.

```bash
# Create the S3 bucket
aws s3 mb s3://vpc-flow-logs-123456789012 --region us-east-1

# Create the flow log pointing to S3
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-abc123 \
  --traffic-type ALL \
  --log-destination-type s3 \
  --log-destination "arn:aws:s3:::vpc-flow-logs-123456789012" \
  --max-aggregation-interval 60
```

The `--max-aggregation-interval` controls how often logs are published. Options are 60 seconds (1 minute) or 600 seconds (10 minutes). One-minute intervals give you more timely data but generate more files and cost slightly more.

## Custom Log Format

The default flow log format gives you the basics, but you can customize it to capture additional fields. The custom format lets you include fields like TCP flags, packet-level info, and sublocation data.

Here's an enhanced format that captures the most useful fields:

```bash
# Create a flow log with a custom format
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-abc123 \
  --traffic-type ALL \
  --log-destination-type s3 \
  --log-destination "arn:aws:s3:::vpc-flow-logs-123456789012" \
  --log-format '${version} ${account-id} ${interface-id} ${srcaddr} ${dstaddr} ${srcport} ${dstport} ${protocol} ${packets} ${bytes} ${start} ${end} ${action} ${log-status} ${vpc-id} ${subnet-id} ${az-id} ${sublocation-type} ${sublocation-id} ${pkt-srcaddr} ${pkt-dstaddr} ${region} ${pkt-src-aws-service} ${pkt-dst-aws-service} ${flow-direction} ${traffic-path} ${tcp-flags}'
```

Some notable custom fields:

- **pkt-srcaddr / pkt-dstaddr** - The actual packet source/destination (different from srcaddr/dstaddr when traffic traverses a NAT gateway)
- **flow-direction** - Whether traffic is ingress or egress
- **traffic-path** - The path traffic takes through the network
- **tcp-flags** - TCP flag bitmask (useful for identifying SYN floods, port scans, etc.)
- **pkt-src-aws-service / pkt-dst-aws-service** - Identifies if traffic came from or went to an AWS service

## Understanding Flow Log Records

Here's what a typical flow log record looks like:

```
2 123456789012 eni-abc123 10.0.1.15 10.0.2.25 49152 3306 6 20 4000 1620140661 1620140721 ACCEPT OK
```

Breaking that down:

| Field | Value | Meaning |
|-------|-------|---------|
| version | 2 | Log format version |
| account-id | 123456789012 | AWS account |
| interface-id | eni-abc123 | Network interface |
| srcaddr | 10.0.1.15 | Source IP |
| dstaddr | 10.0.2.25 | Destination IP |
| srcport | 49152 | Source port |
| dstport | 3306 | Destination port (MySQL) |
| protocol | 6 | TCP |
| packets | 20 | Number of packets |
| bytes | 4000 | Total bytes |
| start | 1620140661 | Start time (Unix) |
| end | 1620140721 | End time (Unix) |
| action | ACCEPT | Traffic allowed |
| log-status | OK | Logging working |

Protocol 6 is TCP, 17 is UDP, and 1 is ICMP. You'll see these numbers frequently when analyzing flow logs.

## Organizing Flow Logs in S3

When flow logs go to S3, they're organized in a specific path structure:

```
s3://bucket-name/AWSLogs/account-id/vpcflowlogs/region/year/month/day/
```

Each file is gzipped and contains roughly 5-10 minutes of data. For busy VPCs, this can mean hundreds of files per day. That's where Athena comes in handy for querying - check out our post on [analyzing VPC Flow Logs with Athena](https://oneuptime.com/blog/post/analyze-vpc-flow-logs-athena/view).

## Monitoring with CloudWatch

If you're sending flow logs to CloudWatch, you can create metric filters to alert on suspicious activity.

This filter catches rejected traffic to SSH ports, which could indicate a brute-force attempt:

```bash
# Create a metric filter for rejected SSH traffic
aws logs put-metric-filter \
  --log-group-name "/vpc/flow-logs/vpc-abc123" \
  --filter-name "RejectedSSH" \
  --filter-pattern '[version, account, eni, srcaddr, dstaddr, srcport, dstport=22, protocol=6, packets, bytes, start, end, action="REJECT", status]' \
  --metric-transformations \
    metricName=RejectedSSHAttempts,metricNamespace=VPCFlowLogs,metricValue=1

# Create a CloudWatch alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "HighRejectedSSH" \
  --metric-name RejectedSSHAttempts \
  --namespace VPCFlowLogs \
  --statistic Sum \
  --period 300 \
  --threshold 100 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:SecurityAlerts"
```

## Cost Management

Flow logs can get expensive, especially for high-traffic VPCs. Here are ways to control costs:

- **Use S3 instead of CloudWatch** for high-volume VPCs (S3 storage is much cheaper)
- **Set retention policies** on CloudWatch log groups
- **Use lifecycle policies** on S3 to move old logs to Glacier
- **Filter traffic type** - If you only need rejected traffic for security monitoring, don't capture ACCEPT traffic
- **Use 10-minute aggregation** instead of 1-minute if you don't need near-real-time data

A typical cost estimate for a moderately busy VPC (50 GB/month of flow log data) would be roughly $25/month to CloudWatch or $3-5/month to S3.

## Wrapping Up

VPC Flow Logs are one of those services you should enable everywhere. The cost is minimal compared to the visibility they provide. Start with VPC-level flow logs to S3 for everything, add CloudWatch destinations for VPCs that need real-time alerting, and use custom log formats when you need deeper network analysis.

For analyzing the data you collect, see our guides on [CloudWatch Logs Insights](https://oneuptime.com/blog/post/analyze-vpc-flow-logs-cloudwatch-logs-insights/view) and [Athena](https://oneuptime.com/blog/post/analyze-vpc-flow-logs-athena/view).
