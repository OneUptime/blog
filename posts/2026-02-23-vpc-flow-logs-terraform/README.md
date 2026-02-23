# How to Create VPC Flow Logs with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, VPC, Flow Logs, Networking, Monitoring, Security

Description: Complete guide to creating and configuring AWS VPC Flow Logs with Terraform including CloudWatch Logs, S3 destinations, custom formats, and analysis techniques.

---

VPC Flow Logs capture information about IP traffic going to and from network interfaces in your VPC. They are essential for network troubleshooting, security monitoring, and compliance auditing. Terraform makes it straightforward to enable flow logs across your VPCs, subnets, or individual network interfaces.

This post walks through setting up VPC Flow Logs with Terraform for different destinations and configurations.

## Basic VPC Flow Logs to CloudWatch

The simplest setup sends flow logs to a CloudWatch Logs group:

```hcl
# flow-logs.tf
# CloudWatch Logs group for flow logs
resource "aws_cloudwatch_log_group" "flow_logs" {
  name              = "/vpc/flow-logs/${var.vpc_name}"
  retention_in_days = 30  # Adjust based on your retention needs

  tags = {
    Environment = var.environment
    Purpose     = "vpc-flow-logs"
  }
}

# IAM role for flow logs to write to CloudWatch
resource "aws_iam_role" "flow_logs" {
  name = "${var.vpc_name}-flow-logs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "vpc-flow-logs.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })
}

# Policy allowing flow logs to write to CloudWatch
resource "aws_iam_role_policy" "flow_logs" {
  name = "flow-logs-cloudwatch"
  role = aws_iam_role.flow_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ]
      Resource = "*"
    }]
  })
}

# VPC Flow Log resource
resource "aws_flow_log" "main" {
  vpc_id          = aws_vpc.main.id
  traffic_type    = "ALL"  # ALL, ACCEPT, or REJECT
  iam_role_arn    = aws_iam_role.flow_logs.arn
  log_destination = aws_cloudwatch_log_group.flow_logs.arn

  tags = {
    Name        = "${var.vpc_name}-flow-logs"
    Environment = var.environment
  }
}
```

## Flow Logs to S3

For long-term storage and cost efficiency, send flow logs to S3:

```hcl
# S3 bucket for flow log storage
resource "aws_s3_bucket" "flow_logs" {
  bucket = "${var.account_id}-vpc-flow-logs"

  tags = {
    Purpose = "vpc-flow-logs"
  }
}

# Enable versioning for audit compliance
resource "aws_s3_bucket_versioning" "flow_logs" {
  bucket = aws_s3_bucket.flow_logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle rules to manage costs
resource "aws_s3_bucket_lifecycle_configuration" "flow_logs" {
  bucket = aws_s3_bucket.flow_logs.id

  rule {
    id     = "flow-logs-lifecycle"
    status = "Enabled"

    # Move to Infrequent Access after 30 days
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    # Move to Glacier after 90 days
    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    # Delete after 365 days
    expiration {
      days = 365
    }
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "flow_logs" {
  bucket = aws_s3_bucket.flow_logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "flow_logs" {
  bucket = aws_s3_bucket.flow_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "aws:kms"
    }
  }
}

# Flow log to S3
resource "aws_flow_log" "s3" {
  vpc_id               = aws_vpc.main.id
  traffic_type         = "ALL"
  log_destination      = aws_s3_bucket.flow_logs.arn
  log_destination_type = "s3"

  # Organize logs by date
  destination_options {
    file_format                = "parquet"  # parquet or plain-text
    hive_compatible_partitions = true
    per_hour_partition         = true
  }

  tags = {
    Name = "${var.vpc_name}-flow-logs-s3"
  }
}
```

## Custom Log Format

The default flow log format captures basic fields. Custom formats let you capture additional data:

```hcl
# Flow log with custom format
resource "aws_flow_log" "custom" {
  vpc_id          = aws_vpc.main.id
  traffic_type    = "ALL"
  iam_role_arn    = aws_iam_role.flow_logs.arn
  log_destination = aws_cloudwatch_log_group.flow_logs.arn

  # Custom format with additional fields
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
    "$${az-id}",
    "$${sublocation-type}",
    "$${sublocation-id}",
    "$${pkt-srcaddr}",
    "$${pkt-dstaddr}",
    "$${region}",
    "$${pkt-src-aws-service}",
    "$${pkt-dst-aws-service}",
    "$${flow-direction}",
    "$${traffic-path}",
  ])

  tags = {
    Name = "${var.vpc_name}-flow-logs-custom"
  }
}
```

## Subnet-Level Flow Logs

Enable flow logs for specific subnets instead of the entire VPC:

```hcl
# Flow logs for private subnets only
resource "aws_flow_log" "private_subnets" {
  for_each = toset(var.private_subnet_ids)

  subnet_id       = each.value
  traffic_type    = "ALL"
  iam_role_arn    = aws_iam_role.flow_logs.arn
  log_destination = aws_cloudwatch_log_group.flow_logs.arn

  tags = {
    Name   = "flow-log-${each.value}"
    Subnet = each.value
  }
}
```

## ENI-Level Flow Logs

Monitor specific network interfaces:

```hcl
# Flow log for a specific EC2 instance's ENI
resource "aws_flow_log" "database_eni" {
  eni_id          = aws_instance.database.primary_network_interface_id
  traffic_type    = "ALL"
  iam_role_arn    = aws_iam_role.flow_logs.arn
  log_destination = aws_cloudwatch_log_group.flow_logs.arn

  tags = {
    Name     = "database-eni-flow-log"
    Instance = aws_instance.database.id
  }
}
```

## CloudWatch Metric Filters and Alarms

Create alerts based on flow log patterns:

```hcl
# Metric filter for rejected SSH traffic
resource "aws_cloudwatch_log_metric_filter" "rejected_ssh" {
  name           = "rejected-ssh-connections"
  pattern        = "[version, account, eni, source, destination, srcport, dstport=22, protocol=6, packets, bytes, windowstart, windowend, action=REJECT, flowlogstatus]"
  log_group_name = aws_cloudwatch_log_group.flow_logs.name

  metric_transformation {
    name          = "RejectedSSHConnections"
    namespace     = "VPCFlowLogs"
    value         = "1"
    default_value = "0"
  }
}

# Alarm when rejected SSH attempts exceed threshold
resource "aws_cloudwatch_metric_alarm" "ssh_rejected" {
  alarm_name          = "high-rejected-ssh"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "RejectedSSHConnections"
  namespace           = "VPCFlowLogs"
  period              = 300  # 5 minutes
  statistic           = "Sum"
  threshold           = 100
  alarm_description   = "High number of rejected SSH connections detected"

  alarm_actions = [aws_sns_topic.security_alerts.arn]

  tags = {
    Severity = "high"
  }
}

# Metric filter for traffic to known bad ports
resource "aws_cloudwatch_log_metric_filter" "suspicious_ports" {
  name           = "suspicious-port-traffic"
  pattern        = "[version, account, eni, source, destination, srcport, dstport=4444 || dstport=5555 || dstport=6666, protocol, packets, bytes, windowstart, windowend, action, flowlogstatus]"
  log_group_name = aws_cloudwatch_log_group.flow_logs.name

  metric_transformation {
    name      = "SuspiciousPortTraffic"
    namespace = "VPCFlowLogs"
    value     = "1"
  }
}
```

## Flow Logs Module

Wrap everything into a reusable module:

```hcl
# modules/vpc-flow-logs/variables.tf
variable "vpc_id" {
  type        = string
  description = "VPC ID to enable flow logs on"
}

variable "vpc_name" {
  type        = string
  description = "Name for resource naming"
}

variable "destination" {
  type        = string
  description = "Destination type: cloudwatch or s3"
  default     = "cloudwatch"

  validation {
    condition     = contains(["cloudwatch", "s3"], var.destination)
    error_message = "Destination must be cloudwatch or s3."
  }
}

variable "retention_days" {
  type        = number
  description = "Log retention in days"
  default     = 30
}

variable "traffic_type" {
  type        = string
  description = "Traffic type to capture: ALL, ACCEPT, or REJECT"
  default     = "ALL"
}

variable "s3_bucket_arn" {
  type        = string
  description = "S3 bucket ARN (required if destination is s3)"
  default     = ""
}

variable "tags" {
  type    = map(string)
  default = {}
}
```

```hcl
# modules/vpc-flow-logs/main.tf
# CloudWatch resources (only created if destination is cloudwatch)
resource "aws_cloudwatch_log_group" "flow_logs" {
  count             = var.destination == "cloudwatch" ? 1 : 0
  name              = "/vpc/flow-logs/${var.vpc_name}"
  retention_in_days = var.retention_days
  tags              = var.tags
}

resource "aws_iam_role" "flow_logs" {
  count = var.destination == "cloudwatch" ? 1 : 0
  name  = "${var.vpc_name}-flow-logs"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "vpc-flow-logs.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "flow_logs" {
  count = var.destination == "cloudwatch" ? 1 : 0
  name  = "cloudwatch-logs"
  role  = aws_iam_role.flow_logs[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents", "logs:DescribeLogGroups", "logs:DescribeLogStreams"]
      Resource = "*"
    }]
  })
}

# Flow log resource
resource "aws_flow_log" "main" {
  vpc_id               = var.vpc_id
  traffic_type         = var.traffic_type
  iam_role_arn         = var.destination == "cloudwatch" ? aws_iam_role.flow_logs[0].arn : null
  log_destination      = var.destination == "cloudwatch" ? aws_cloudwatch_log_group.flow_logs[0].arn : var.s3_bucket_arn
  log_destination_type = var.destination == "cloudwatch" ? "cloud-watch-logs" : "s3"

  dynamic "destination_options" {
    for_each = var.destination == "s3" ? [1] : []
    content {
      file_format                = "parquet"
      hive_compatible_partitions = true
      per_hour_partition         = true
    }
  }

  tags = merge(var.tags, {
    Name = "${var.vpc_name}-flow-logs"
  })
}
```

Use the module:

```hcl
# Enable flow logs on your VPC
module "flow_logs" {
  source = "./modules/vpc-flow-logs"

  vpc_id         = module.vpc.vpc_id
  vpc_name       = "production"
  destination    = "cloudwatch"
  retention_days = 30
  traffic_type   = "ALL"

  tags = {
    Environment = "production"
  }
}
```

## Querying Flow Logs with Athena

For S3-based flow logs, set up Athena for SQL queries:

```hcl
# Athena database and table for flow logs
resource "aws_athena_database" "flow_logs" {
  name   = "vpc_flow_logs"
  bucket = aws_s3_bucket.athena_results.id
}

resource "aws_athena_named_query" "top_talkers" {
  name     = "top-talkers"
  database = aws_athena_database.flow_logs.name
  query    = <<-SQL
    SELECT srcaddr, dstaddr, sum(bytes) as total_bytes
    FROM vpc_flow_logs
    WHERE action = 'ACCEPT'
    AND date = current_date
    GROUP BY srcaddr, dstaddr
    ORDER BY total_bytes DESC
    LIMIT 20
  SQL
}

resource "aws_athena_named_query" "rejected_connections" {
  name     = "rejected-connections"
  database = aws_athena_database.flow_logs.name
  query    = <<-SQL
    SELECT srcaddr, dstport, count(*) as attempts
    FROM vpc_flow_logs
    WHERE action = 'REJECT'
    AND date >= date_add('day', -7, current_date)
    GROUP BY srcaddr, dstport
    ORDER BY attempts DESC
    LIMIT 50
  SQL
}
```

## Summary

Setting up VPC Flow Logs with Terraform involves:

1. Choose your destination - CloudWatch for real-time analysis, S3 for long-term storage
2. Configure IAM roles for the flow log service to write to your destination
3. Use custom log formats when you need additional fields like AZ, flow direction, or AWS service info
4. Set up CloudWatch metric filters and alarms for security monitoring
5. Wrap everything in a reusable module for consistency across VPCs
6. Use Athena with S3 flow logs for ad-hoc network analysis

Start with CloudWatch Logs for immediate visibility, then add S3 as a long-term destination as your logging needs grow. For the broader VPC setup, check out the [Terraform AWS VPC module guide](https://oneuptime.com/blog/post/terraform-aws-vpc-module/view).
