# How to Analyze IPv6 Traffic in AWS VPC Flow Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: AWS, IPv6, VPC Flow Logs, Network Monitoring, CloudWatch, Athena

Description: Enable and analyze VPC Flow Logs for IPv6 traffic, filter IPv6 flows in CloudWatch Insights and Athena, and monitor IPv6 security events.

## Introduction

AWS VPC Flow Logs capture information about IP traffic flowing through network interfaces, including IPv6 flows. Flow logs record source/destination IPv6 addresses, ports, protocols, and accept/reject decisions. Analyzing IPv6 flow logs helps identify security threats, verify routing, and understand IPv6 traffic patterns in your VPC.

## Enable VPC Flow Logs

```bash
VPC_ID="vpc-12345678"
LOG_GROUP="/aws/vpc/flowlogs"
ROLE_NAME="VPCFlowLogsRole"

# Create CloudWatch log group

aws logs create-log-group --log-group-name "$LOG_GROUP"

# Create IAM role for flow logs
ROLE_ARN=$(aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document '{
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Principal": {"Service": "vpc-flow-logs.amazonaws.com"},
            "Action": "sts:AssumeRole"
        }]
    }' \
    --query "Role.Arn" \
    --output text)

# Grant the role permission to publish flow logs to CloudWatch Logs
aws iam put-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-name VPCFlowLogsPermissions \
    --policy-document '{
        "Version": "2012-10-17",
        "Statement": [{
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
                "logs:DescribeLogGroups",
                "logs:DescribeLogStreams"
            ],
            "Resource": "*"
        }]
    }'

# Enable flow logs with a custom format that includes the IP address family
aws ec2 create-flow-logs \
    --resource-type VPC \
    --resource-ids "$VPC_ID" \
    --traffic-type ALL \
    --log-destination-type cloud-watch-logs \
    --log-group-name "$LOG_GROUP" \
    --deliver-logs-permission-arn "$ROLE_ARN" \
    --log-format '${version} ${account-id} ${interface-id} ${srcaddr} ${dstaddr} ${srcport} ${dstport} ${protocol} ${packets} ${bytes} ${start} ${end} ${action} ${log-status} ${type}'
```

## Terraform Flow Logs with IPv6 Fields

```hcl
# flow_logs.tf

resource "aws_flow_log" "vpc" {
  iam_role_arn    = aws_iam_role.flow_logs.arn
  log_destination = aws_cloudwatch_log_group.flow_logs.arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.main.id

  # Custom format including the IP address family for IPv4/IPv6 filtering
  log_format = "$${version} $${account-id} $${interface-id} $${srcaddr} $${dstaddr} $${srcport} $${dstport} $${protocol} $${packets} $${bytes} $${start} $${end} $${action} $${log-status} $${type}"

  tags = { Name = "vpc-flow-logs" }
}

resource "aws_cloudwatch_log_group" "flow_logs" {
  name              = "/aws/vpc/flowlogs"
  retention_in_days = 30
}

resource "aws_iam_role" "flow_logs" {
  name = "vpc-flow-logs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "vpc-flow-logs.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy" "flow_logs" {
  name   = "vpc-flow-logs-policy"
  role   = aws_iam_role.flow_logs.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogGroups", "logs:DescribeLogStreams"]
      Effect   = "Allow"
      Resource = "*"
    }]
  })
}
```

## Query IPv6 Flow Logs in CloudWatch Insights

```text
# CloudWatch Logs Insights queries for IPv6 traffic

# All IPv6 traffic
fields srcAddr, dstAddr, srcPort, dstPort, protocol, bytes, action
| filter srcAddr like /:/
| sort bytes desc
| limit 100

# Rejected IPv6 traffic
fields srcAddr, dstAddr, dstPort, bytes
| filter srcAddr like /:/ and action = "REJECT"
| stats sum(bytes) as total_bytes by srcAddr
| sort total_bytes desc
| limit 20

# Top IPv6 destinations
fields dstAddr, bytes
| filter dstAddr like /:/
| stats sum(bytes) as total_bytes by dstAddr
| sort total_bytes desc
| limit 10

# IPv6 traffic to specific port (e.g., 443)
fields srcAddr, dstAddr, bytes
| filter srcAddr like /:/ and dstPort = 443
| stats sum(bytes) as total by srcAddr
| sort total desc

# Security: Detect IPv6 port scanning (many ports from one source)
fields srcAddr, dstPort
| filter srcAddr like /:/
| stats count_distinct(dstPort) as ports_scanned by srcAddr
| filter ports_scanned > 10
| sort ports_scanned desc
```

## Query IPv6 Flows in Athena (S3 Flow Logs)

```sql
-- Create Athena table for default-format flow logs
CREATE EXTERNAL TABLE IF NOT EXISTS vpc_flow_logs (
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
    start BIGINT,
    `end` BIGINT,
    action STRING,
    log_status STRING
)
PARTITIONED BY (`date` DATE)
ROW FORMAT DELIMITED
FIELDS TERMINATED BY ' '
LOCATION 's3://my-flow-logs-bucket/AWSLogs/123456789012/vpcflowlogs/us-east-1/'
TBLPROPERTIES ("skip.header.line.count"="1");

-- Add at least one partition before querying
ALTER TABLE vpc_flow_logs
ADD PARTITION (`date`='2026-03-20')
LOCATION 's3://my-flow-logs-bucket/AWSLogs/123456789012/vpcflowlogs/us-east-1/2026/03/20/';

-- Query all IPv6 traffic
SELECT srcaddr, dstaddr, dstport,
       SUM(bytes) AS total_bytes
FROM vpc_flow_logs
WHERE `date` = DATE('2026-03-20')
  AND srcaddr LIKE '%:%'  -- IPv6 addresses contain ':'
GROUP BY srcaddr, dstaddr, dstport
ORDER BY total_bytes DESC
LIMIT 20;

-- Find rejected IPv6 connections
SELECT srcaddr, dstaddr, dstport,
       COUNT(*) AS attempts
FROM vpc_flow_logs
WHERE `date` = DATE('2026-03-20')
  AND srcaddr LIKE '%:%'
  AND action = 'REJECT'
GROUP BY srcaddr, dstaddr, dstport
ORDER BY attempts DESC;
```

## Conclusion

VPC Flow Logs capture IPv6 traffic using the same format as IPv4, with IPv6 addresses recorded in the `srcaddr` and `dstaddr` fields. Filter IPv6 flows in CloudWatch Logs Insights using `filter srcAddr like /:/` since IPv6 addresses always contain colons. In Athena, use `WHERE srcaddr LIKE '%:%'`, or filter on the `type` field if your custom log format includes it. Custom log formats can include additional fields like `type`, `flow-direction`, and `pkt-src-aws-service` for richer analysis. Monitor IPv6 REJECT actions to identify misconfigured security groups or NACLs blocking legitimate IPv6 traffic.
