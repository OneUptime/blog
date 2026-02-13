# How to Enable and Analyze VPC Flow Logs

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPC, Networking, Monitoring, Security

Description: Learn how to enable VPC Flow Logs in AWS, configure log destinations, and analyze network traffic patterns to troubleshoot connectivity issues and detect security threats.

---

If you've ever stared at a failing connection between two AWS resources and wondered "where exactly is this traffic getting dropped?", VPC Flow Logs are your answer. They capture metadata about the IP traffic going to and from network interfaces in your VPC, giving you visibility into what's actually happening on the wire.

Flow Logs don't capture packet contents - they record connection-level metadata like source/destination IPs, ports, protocols, and whether traffic was accepted or rejected. That's usually enough to diagnose most networking problems you'll run into.

## What VPC Flow Logs Actually Capture

Each flow log record contains fields like the source address, destination address, source port, destination port, protocol number, number of packets, number of bytes, and the action taken (ACCEPT or REJECT). Here's what a typical record looks like:

```
2 123456789012 eni-abc123de 10.0.1.5 10.0.2.15 443 49152 6 25 5000 1620140661 1620140720 ACCEPT OK
```

Breaking that down: account ID, network interface ID, source IP, destination IP, destination port, source port, protocol (6 = TCP), packets, bytes, start time, end time, action, and log status.

## Enabling Flow Logs at Different Levels

You can attach flow logs at three levels: VPC, subnet, or individual network interface. VPC-level is the most common because it captures everything in one shot.

Here's how to create a VPC flow log that sends data to CloudWatch Logs using the AWS CLI.

First, you need an IAM role that allows the flow log service to publish to CloudWatch.

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

Create the role and attach a policy that grants write access to CloudWatch Logs.

```bash
# Create the IAM role for flow logs
aws iam create-role \
  --role-name VPCFlowLogsRole \
  --assume-role-policy-document file://trust-policy.json

# Attach the CloudWatch Logs policy
aws iam put-role-policy \
  --role-name VPCFlowLogsRole \
  --policy-name VPCFlowLogsPolicy \
  --policy-document '{
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
  }'
```

Now create the flow log itself.

```bash
# Create a VPC flow log that publishes to CloudWatch Logs
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-0abc123def456789 \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name /aws/vpc/flow-logs \
  --deliver-logs-permission-arn arn:aws:iam::123456789012:role/VPCFlowLogsRole
```

The `--traffic-type` flag accepts `ALL`, `ACCEPT`, or `REJECT`. If you're primarily troubleshooting blocked connections, `REJECT` alone can cut down on noise significantly.

## Sending Flow Logs to S3

For long-term storage and cost efficiency, S3 is often a better destination than CloudWatch. S3 storage is cheaper, and you can use Athena to query the logs with SQL.

```bash
# Create flow log with S3 as the destination
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-0abc123def456789 \
  --traffic-type ALL \
  --log-destination-type s3 \
  --log-destination arn:aws:s3:::my-flow-logs-bucket/vpc-logs/ \
  --max-aggregation-interval 60
```

The `--max-aggregation-interval` can be 60 or 600 seconds. A 60-second interval gives you more granular data but generates more log volume.

## Custom Log Format

You don't have to stick with the default fields. Custom formats let you include additional metadata like the VPC ID, subnet ID, and TCP flags.

```bash
# Create flow log with custom format including TCP flags and traffic path
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-0abc123def456789 \
  --traffic-type ALL \
  --log-destination-type s3 \
  --log-destination arn:aws:s3:::my-flow-logs-bucket/vpc-logs/ \
  --log-format '${version} ${account-id} ${interface-id} ${srcaddr} ${dstaddr} ${srcport} ${dstport} ${protocol} ${packets} ${bytes} ${start} ${end} ${action} ${log-status} ${vpc-id} ${subnet-id} ${tcp-flags} ${flow-direction}'
```

TCP flags are particularly useful - they tell you if a connection completed a three-way handshake or if you're only seeing SYN packets (which usually means something is blocking the response).

## Querying Flow Logs with Athena

Once your logs are in S3, you can create an Athena table and run SQL queries against them. This is where flow logs really become powerful.

```sql
-- Create an Athena table for VPC flow logs
CREATE EXTERNAL TABLE vpc_flow_logs (
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
  start_time bigint,
  end_time bigint,
  action string,
  log_status string
)
PARTITIONED BY (dt string)
ROW FORMAT DELIMITED FIELDS TERMINATED BY ' '
LOCATION 's3://my-flow-logs-bucket/vpc-logs/AWSLogs/123456789012/vpcflowlogs/us-east-1/'
TBLPROPERTIES ("skip.header.line.count"="1");
```

Now you can run queries to find rejected traffic, top talkers, or suspicious patterns.

```sql
-- Find the top 10 sources of rejected traffic
SELECT srcaddr, COUNT(*) as reject_count
FROM vpc_flow_logs
WHERE action = 'REJECT'
  AND dt = '2026/02/12'
GROUP BY srcaddr
ORDER BY reject_count DESC
LIMIT 10;

-- Find traffic between two specific hosts
SELECT srcaddr, dstaddr, srcport, dstport, action, packets
FROM vpc_flow_logs
WHERE (srcaddr = '10.0.1.5' AND dstaddr = '10.0.2.15')
   OR (srcaddr = '10.0.2.15' AND dstaddr = '10.0.1.5')
ORDER BY start_time DESC
LIMIT 50;
```

## Analyzing Logs in CloudWatch Insights

If your flow logs go to CloudWatch, you can use CloudWatch Logs Insights for quick analysis without setting up Athena.

```
# Find rejected SSH attempts in the last hour
fields @timestamp, srcAddr, dstAddr, srcPort, dstPort, action
| filter action = "REJECT" and dstPort = 22
| sort @timestamp desc
| limit 50
```

```
# Calculate bytes transferred per source IP
fields srcAddr, bytes
| stats sum(bytes) as totalBytes by srcAddr
| sort totalBytes desc
| limit 20
```

## Common Troubleshooting Patterns

When you see traffic being rejected, it's typically caused by either a security group rule or a network ACL. Flow logs tell you the traffic was rejected but not which layer blocked it. Here's a mental model to work through it:

1. If you see outbound traffic from instance A accepted, but no inbound record at instance B - the problem is likely a network ACL or routing issue between them.
2. If you see inbound traffic at instance B rejected - it's a security group or network ACL on that subnet.
3. If you see SYN packets going out but no SYN-ACK coming back - the remote end isn't responding or something in the path is dropping the response.

For more on the differences between security groups and NACLs, check out the comparison guide at https://oneuptime.com/blog/post/2026-02-12-security-groups-vs-network-acls/view.

## Cost Considerations

Flow logs themselves are free to create, but you pay for the storage and data processing. CloudWatch Logs charges per GB ingested, while S3 is significantly cheaper for storage. For a busy VPC, flow logs can generate several GB per day, so keep an eye on costs.

A few ways to reduce costs: filter by REJECT only if that's all you need, use a longer aggregation interval (600 seconds instead of 60), or enable flow logs only on specific subnets rather than the entire VPC.

## Monitoring Flow Logs

You should also set up monitoring to make sure your flow logs are actually being delivered. CloudWatch metrics for flow logs include `DeliverLogsSuccess` and `DeliverLogsError`. If the IAM role permissions get changed or the S3 bucket policy breaks, you'll want to know about it right away. Consider integrating this with your existing monitoring stack - tools like OneUptime can alert you when log delivery fails so you're never flying blind during an incident.

VPC Flow Logs aren't glamorous, but they're one of those foundational pieces that saves you hours when things go wrong. Enable them early, set up your Athena table, and you'll thank yourself the next time a deployment breaks network connectivity.
