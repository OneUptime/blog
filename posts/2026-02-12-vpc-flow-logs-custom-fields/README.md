# How to Set Up VPC Flow Logs with Custom Fields

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, VPC, Flow Logs, Networking, Security

Description: Configure VPC Flow Logs with custom fields to capture detailed network traffic metadata including TCP flags, packet paths, and traffic direction.

---

Default VPC Flow Logs give you the basics: source IP, destination IP, source port, destination port, protocol, bytes, packets, and whether the traffic was accepted or rejected. That's enough for simple network troubleshooting, but when you're doing serious security analysis or debugging complex connectivity issues, you need more.

Custom fields in VPC Flow Logs let you capture additional metadata about each flow. Things like TCP flags (was it a SYN? FIN? RST?), the traffic direction (ingress vs egress), the sublocation (like the wavelength zone or local zone), and even the path the traffic took through AWS networking infrastructure. Let's configure flow logs with the fields that actually matter.

## Available Custom Fields

Here are the fields available beyond the default set:

| Field | Description | Use Case |
|-------|-------------|----------|
| `vpc-id` | VPC the ENI belongs to | Multi-VPC analysis |
| `subnet-id` | Subnet the ENI belongs to | Subnet-level traffic analysis |
| `instance-id` | EC2 instance ID | Instance-level troubleshooting |
| `tcp-flags` | Bitmask of TCP flags | Connection analysis |
| `type` | Traffic type (IPv4, IPv6, EFA) | Protocol analysis |
| `pkt-srcaddr` | Packet source address | NAT traversal analysis |
| `pkt-dstaddr` | Packet destination address | NAT traversal analysis |
| `region` | AWS region | Multi-region analysis |
| `az-id` | Availability Zone ID | AZ-level traffic patterns |
| `sublocation-type` | Sub-location type | Edge location analysis |
| `sublocation-id` | Sub-location ID | Edge location analysis |
| `pkt-src-aws-service` | AWS service source | Service traffic identification |
| `pkt-dst-aws-service` | AWS service destination | Service traffic identification |
| `flow-direction` | Ingress or egress | Directional analysis |
| `traffic-path` | Path through AWS network | Routing analysis |

## Creating Flow Logs with Custom Fields

### To CloudWatch Logs

This creates a VPC Flow Log with custom fields sent to CloudWatch:

```bash
# Create log group first
aws logs create-log-group --log-group-name /vpc/flow-logs/custom

# Create flow log with custom fields
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-12345678 \
  --traffic-type ALL \
  --log-destination-type cloud-watch-logs \
  --log-group-name /vpc/flow-logs/custom \
  --deliver-logs-permission-arn arn:aws:iam::111111111111:role/VPCFlowLogsRole \
  --log-format '${version} ${account-id} ${interface-id} ${srcaddr} ${dstaddr} ${srcport} ${dstport} ${protocol} ${packets} ${bytes} ${start} ${end} ${action} ${log-status} ${vpc-id} ${subnet-id} ${instance-id} ${tcp-flags} ${type} ${pkt-srcaddr} ${pkt-dstaddr} ${flow-direction} ${traffic-path} ${pkt-src-aws-service} ${pkt-dst-aws-service}'
```

### To S3

For longer-term storage and Athena querying:

```bash
# Create flow log to S3 with custom format
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-12345678 \
  --traffic-type ALL \
  --log-destination-type s3 \
  --log-destination arn:aws:s3:::my-flow-logs-bucket/vpc-logs/ \
  --log-format '${version} ${account-id} ${interface-id} ${srcaddr} ${dstaddr} ${srcport} ${dstport} ${protocol} ${packets} ${bytes} ${start} ${end} ${action} ${log-status} ${vpc-id} ${subnet-id} ${instance-id} ${tcp-flags} ${type} ${pkt-srcaddr} ${pkt-dstaddr} ${flow-direction} ${traffic-path}' \
  --max-aggregation-interval 60
```

The `--max-aggregation-interval 60` sets the capture window to 60 seconds (minimum) instead of the default 600 seconds. Shorter intervals mean more granular data but higher volume.

### Subnet-Level Flow Logs

You can also create flow logs at the subnet level for targeted monitoring:

```bash
aws ec2 create-flow-logs \
  --resource-type Subnet \
  --resource-ids subnet-aaa111 \
  --traffic-type REJECT \
  --log-destination-type s3 \
  --log-destination arn:aws:s3:::my-flow-logs-bucket/rejected-traffic/ \
  --log-format '${version} ${account-id} ${interface-id} ${srcaddr} ${dstaddr} ${srcport} ${dstport} ${protocol} ${packets} ${bytes} ${start} ${end} ${action} ${log-status} ${tcp-flags} ${flow-direction} ${instance-id}'
```

This captures only rejected traffic - useful for security analysis without the cost of logging all accepted traffic.

## Terraform Configuration

Here's the complete Terraform setup:

```hcl
resource "aws_flow_log" "custom" {
  vpc_id               = aws_vpc.main.id
  traffic_type         = "ALL"
  log_destination_type = "s3"
  log_destination      = "${aws_s3_bucket.flow_logs.arn}/vpc-logs/"
  max_aggregation_interval = 60

  log_format = join(" ", [
    "$${version}",
    "$${account-id}",
    "$${interface-id}",
    "$${srcaddr}",
    "$${dstaddr}",
    "$${srcport}",
    "$${dstport}",
    "$${protocol}",
    "$${packets}",
    "$${bytes}",
    "$${start}",
    "$${end}",
    "$${action}",
    "$${log-status}",
    "$${vpc-id}",
    "$${subnet-id}",
    "$${instance-id}",
    "$${tcp-flags}",
    "$${type}",
    "$${pkt-srcaddr}",
    "$${pkt-dstaddr}",
    "$${flow-direction}",
    "$${traffic-path}",
    "$${pkt-src-aws-service}",
    "$${pkt-dst-aws-service}"
  ])

  tags = {
    Name = "vpc-custom-flow-logs"
  }
}

resource "aws_s3_bucket" "flow_logs" {
  bucket = "flow-logs-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_lifecycle_configuration" "flow_logs" {
  bucket = aws_s3_bucket.flow_logs.id

  rule {
    id     = "flow-log-lifecycle"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 365
    }
  }
}
```

## Understanding TCP Flags

TCP flags are represented as a bitmask integer. Here's how to decode them:

| Flag | Value | Meaning |
|------|-------|---------|
| FIN | 1 | Connection teardown |
| SYN | 2 | Connection initiation |
| RST | 4 | Connection reset |
| PSH | 8 | Push data |
| ACK | 16 | Acknowledgment |
| SYN-ACK | 18 | Connection accepted |
| FIN-ACK | 17 | Clean shutdown |

Common patterns:
- `2` (SYN only) - New connection attempt
- `18` (SYN+ACK) - Connection accepted by server
- `4` (RST) - Connection forcefully closed
- `1` (FIN) - Clean connection close

## Understanding Traffic Path

The `traffic-path` field tells you how traffic flowed through AWS networking:

| Value | Meaning |
|-------|---------|
| 1 | Through an internet gateway |
| 2 | Through a NAT gateway |
| 3 | Through a transit gateway |
| 4 | Through intra-region VPC peering |
| 5 | Through inter-region VPC peering |
| 6 | Through a local gateway |
| 7 | Through a gateway VPC endpoint |
| 8 | Through an internet gateway (for AWS service) |

This is incredibly useful for understanding routing and cost optimization.

## Querying with Athena

Create an Athena table that maps to your custom flow log format.

This creates a partitioned Athena table for custom flow logs stored in S3:

```sql
CREATE EXTERNAL TABLE vpc_flow_logs (
    version INT,
    account_id STRING,
    interface_id STRING,
    srcaddr STRING,
    dstaddr STRING,
    srcport INT,
    dstport INT,
    protocol INT,
    packets BIGINT,
    bytes BIGINT,
    start_time BIGINT,
    end_time BIGINT,
    action STRING,
    log_status STRING,
    vpc_id STRING,
    subnet_id STRING,
    instance_id STRING,
    tcp_flags INT,
    traffic_type STRING,
    pkt_srcaddr STRING,
    pkt_dstaddr STRING,
    flow_direction STRING,
    traffic_path INT,
    pkt_src_aws_service STRING,
    pkt_dst_aws_service STRING
)
PARTITIONED BY (
    date_partition STRING
)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ' '
LOCATION 's3://my-flow-logs-bucket/vpc-logs/AWSLogs/111111111111/vpcflowlogs/'
TBLPROPERTIES ("skip.header.line.count"="1");
```

### Useful Queries

Find connection reset patterns (potential network issues):

```sql
-- Connections that were forcefully reset
SELECT
    srcaddr,
    dstaddr,
    dstport,
    instance_id,
    COUNT(*) as rst_count
FROM vpc_flow_logs
WHERE tcp_flags = 4  -- RST flag
    AND date_partition = '2026/02/12'
GROUP BY srcaddr, dstaddr, dstport, instance_id
ORDER BY rst_count DESC
LIMIT 20;
```

Analyze traffic by path (for cost optimization):

```sql
-- Traffic volume by network path
SELECT
    CASE traffic_path
        WHEN 1 THEN 'Internet Gateway'
        WHEN 2 THEN 'NAT Gateway'
        WHEN 3 THEN 'Transit Gateway'
        WHEN 4 THEN 'VPC Peering (intra-region)'
        WHEN 5 THEN 'VPC Peering (inter-region)'
        WHEN 7 THEN 'Gateway Endpoint'
        ELSE CAST(traffic_path AS VARCHAR)
    END as path_type,
    SUM(bytes) / 1073741824.0 as total_gb,
    COUNT(*) as flow_count
FROM vpc_flow_logs
WHERE date_partition = '2026/02/12'
    AND traffic_path IS NOT NULL
GROUP BY traffic_path
ORDER BY total_gb DESC;
```

Find rejected ingress traffic (security analysis):

```sql
-- Top rejected inbound connections
SELECT
    srcaddr,
    dstaddr,
    dstport,
    protocol,
    flow_direction,
    COUNT(*) as reject_count,
    SUM(packets) as total_packets
FROM vpc_flow_logs
WHERE action = 'REJECT'
    AND flow_direction = 'ingress'
    AND date_partition = '2026/02/12'
GROUP BY srcaddr, dstaddr, dstport, protocol, flow_direction
ORDER BY reject_count DESC
LIMIT 50;
```

Identify traffic to AWS services:

```sql
-- Traffic to AWS services
SELECT
    pkt_dst_aws_service,
    SUM(bytes) / 1048576.0 as total_mb,
    COUNT(*) as flow_count
FROM vpc_flow_logs
WHERE pkt_dst_aws_service != '-'
    AND date_partition = '2026/02/12'
GROUP BY pkt_dst_aws_service
ORDER BY total_mb DESC;
```

## CloudWatch Insights Queries

If you're sending logs to CloudWatch, use Insights for quick analysis.

This CloudWatch Insights query finds the top talkers by bytes transferred:

```
fields @timestamp, srcaddr, dstaddr, dstport, bytes, action, flow_direction
| filter action = "ACCEPT"
| stats sum(bytes) as total_bytes by srcaddr, dstaddr, dstport
| sort total_bytes desc
| limit 20
```

Find SYN floods (possible DDoS):

```
fields @timestamp, srcaddr, dstaddr, dstport, tcp_flags, action
| filter tcp_flags = 2 and action = "REJECT"
| stats count(*) as syn_count by srcaddr
| sort syn_count desc
| limit 10
```

## IAM Role for Flow Logs

If sending to CloudWatch, you need an IAM role. Here it is:

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

Trust policy:

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

## Best Practices

**Choose fields wisely.** More fields means more data and higher costs. Only include what you'll actually query.

**Use S3 for long-term analysis.** CloudWatch is great for real-time, but S3 + Athena is much cheaper for historical analysis.

**Set a 60-second aggregation interval** for security-sensitive VPCs. The default 600 seconds is too coarse for detecting fast-moving attacks.

**Partition your S3 data.** Use the built-in date-based partitioning for efficient Athena queries. Without partitions, every query scans all data.

**Monitor log delivery.** Flow log delivery can fail silently. Track it with CloudWatch metrics and alert on gaps.

For firewall-level traffic analysis, see our guide on [AWS Network Firewall logging](https://oneuptime.com/blog/post/2026-02-12-aws-network-firewall-logging/view). Combine flow logs with [OneUptime](https://oneuptime.com) monitoring for a complete picture of your network health and security.
