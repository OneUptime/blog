# How to Configure Network Monitoring with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Network Monitoring, CloudWatch, VPC Flow Logs, Infrastructure as Code

Description: Learn how to configure comprehensive network monitoring using Terraform with VPC Flow Logs, CloudWatch alarms, and traffic mirroring for full visibility into your AWS network.

---

Network monitoring is essential for maintaining the health, security, and performance of your cloud infrastructure. Without proper visibility into network traffic, diagnosing issues becomes guesswork. In this guide, we will set up comprehensive network monitoring using Terraform, covering VPC Flow Logs, CloudWatch alarms, traffic mirroring, and more.

## Why Network Monitoring Matters

Network issues can manifest in many ways - increased latency, packet loss, unexpected traffic patterns, or security breaches. Proactive monitoring helps you detect and respond to these issues before they impact your users. AWS provides several native tools for network monitoring, and Terraform makes it easy to deploy them consistently across your infrastructure.

## Prerequisites

You will need Terraform 1.0 or later, AWS CLI configured with appropriate permissions, and an existing VPC. If you do not have a VPC yet, you can create one using our guide on [How to Create Dual-Stack VPC with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-dual-stack-vpc-with-terraform/view).

## Setting Up VPC Flow Logs

VPC Flow Logs capture information about IP traffic going to and from network interfaces in your VPC. They are the foundation of network monitoring in AWS.

```hcl
# Create a CloudWatch Log Group to store flow logs
resource "aws_cloudwatch_log_group" "flow_logs" {
  name              = "/vpc/flow-logs"
  retention_in_days = 30  # Retain logs for 30 days to balance cost and visibility

  tags = {
    Name = "vpc-flow-logs"
  }
}

# IAM role that allows VPC Flow Logs to write to CloudWatch
resource "aws_iam_role" "flow_logs" {
  name = "vpc-flow-logs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
      }
    ]
  })
}

# Policy allowing the role to write to CloudWatch Logs
resource "aws_iam_role_policy" "flow_logs" {
  name = "vpc-flow-logs-policy"
  role = aws_iam_role.flow_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Effect   = "Allow"
        Resource = "*"
      }
    ]
  })
}

# Enable VPC Flow Logs with custom format for detailed monitoring
resource "aws_flow_log" "main" {
  vpc_id                   = aws_vpc.main.id
  traffic_type             = "ALL"  # Capture ACCEPT, REJECT, and ALL traffic
  log_destination_type     = "cloud-watch-logs"
  log_destination          = aws_cloudwatch_log_group.flow_logs.arn
  iam_role_arn             = aws_iam_role.flow_logs.arn
  max_aggregation_interval = 60  # 1-minute aggregation for near real-time monitoring

  # Custom log format for richer data
  log_format = "$${version} $${account-id} $${interface-id} $${srcaddr} $${dstaddr} $${srcport} $${dstport} $${protocol} $${packets} $${bytes} $${start} $${end} $${action} $${log-status} $${vpc-id} $${subnet-id} $${tcp-flags} $${flow-direction}"

  tags = {
    Name = "vpc-flow-logs"
  }
}
```

## Flow Logs to S3 for Long-Term Storage

For cost-effective long-term storage and analytics, send flow logs to S3 as well.

```hcl
# S3 bucket for long-term flow log storage
resource "aws_s3_bucket" "flow_logs" {
  bucket = "my-vpc-flow-logs-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "vpc-flow-logs-bucket"
  }
}

# Enable versioning for audit compliance
resource "aws_s3_bucket_versioning" "flow_logs" {
  bucket = aws_s3_bucket.flow_logs.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Lifecycle rule to transition old logs to cheaper storage
resource "aws_s3_bucket_lifecycle_configuration" "flow_logs" {
  bucket = aws_s3_bucket.flow_logs.id

  rule {
    id     = "archive-old-logs"
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
      days = 365  # Delete logs after 1 year
    }
  }
}

# Flow log to S3 for long-term storage
resource "aws_flow_log" "s3" {
  vpc_id               = aws_vpc.main.id
  traffic_type         = "ALL"
  log_destination_type = "s3"
  log_destination      = aws_s3_bucket.flow_logs.arn

  tags = {
    Name = "vpc-flow-logs-s3"
  }
}

# Get current account ID
data "aws_caller_identity" "current" {}
```

## CloudWatch Alarms for Network Metrics

Set up alarms to detect anomalous network behavior.

```hcl
# Metric filter to count rejected packets from flow logs
resource "aws_cloudwatch_log_metric_filter" "rejected_packets" {
  name           = "rejected-packets"
  log_group_name = aws_cloudwatch_log_group.flow_logs.name
  pattern        = "[version, account, eni, source, destination, srcport, destport, protocol, packets, bytes, windowstart, windowend, action=\"REJECT\", flowlogstatus]"

  metric_transformation {
    name      = "RejectedPacketCount"
    namespace = "CustomNetworkMetrics"
    value     = "1"
  }
}

# Alarm when rejected packet rate is high (potential security issue)
resource "aws_cloudwatch_metric_alarm" "high_rejected_packets" {
  alarm_name          = "high-rejected-packets"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "RejectedPacketCount"
  namespace           = "CustomNetworkMetrics"
  period              = 300        # 5-minute periods
  statistic           = "Sum"
  threshold           = 1000       # Alert if more than 1000 rejected packets in 5 minutes
  alarm_description   = "High number of rejected network packets detected"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.network_alerts.arn]

  tags = {
    Name = "high-rejected-packets-alarm"
  }
}

# SNS topic for network alerts
resource "aws_sns_topic" "network_alerts" {
  name = "network-monitoring-alerts"

  tags = {
    Name = "network-alerts"
  }
}

# Email subscription for alerts
resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.network_alerts.arn
  protocol  = "email"
  endpoint  = "ops-team@example.com"
}
```

## NAT Gateway Monitoring

NAT Gateways are critical components that need specific monitoring.

```hcl
# Monitor NAT Gateway bytes processed
resource "aws_cloudwatch_metric_alarm" "nat_gateway_bytes" {
  alarm_name          = "nat-gateway-high-traffic"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "BytesOutToDestination"
  namespace           = "AWS/NATGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 5000000000  # 5 GB in 5 minutes
  alarm_description   = "NAT Gateway processing unusually high traffic volume"

  dimensions = {
    NatGatewayId = aws_nat_gateway.main.id
  }

  alarm_actions = [aws_sns_topic.network_alerts.arn]
}

# Monitor NAT Gateway connection count
resource "aws_cloudwatch_metric_alarm" "nat_gateway_connections" {
  alarm_name          = "nat-gateway-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "ActiveConnectionCount"
  namespace           = "AWS/NATGateway"
  period              = 300
  statistic           = "Maximum"
  threshold           = 50000  # Alert at 50k active connections
  alarm_description   = "NAT Gateway has high number of active connections"

  dimensions = {
    NatGatewayId = aws_nat_gateway.main.id
  }

  alarm_actions = [aws_sns_topic.network_alerts.arn]
}

# Monitor NAT Gateway error rates
resource "aws_cloudwatch_metric_alarm" "nat_gateway_errors" {
  alarm_name          = "nat-gateway-port-allocation-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ErrorPortAllocation"
  namespace           = "AWS/NATGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 0  # Any port allocation error is concerning
  alarm_description   = "NAT Gateway experiencing port allocation errors"

  dimensions = {
    NatGatewayId = aws_nat_gateway.main.id
  }

  alarm_actions = [aws_sns_topic.network_alerts.arn]
}
```

## Traffic Mirroring for Deep Packet Inspection

Traffic mirroring copies network traffic for analysis with third-party tools.

```hcl
# Traffic mirror target - send mirrored traffic to an ENI for analysis
resource "aws_ec2_traffic_mirror_target" "analysis" {
  description          = "Traffic mirror target for network analysis"
  network_interface_id = aws_network_interface.analysis.id

  tags = {
    Name = "traffic-mirror-target"
  }
}

# Traffic mirror filter to capture specific traffic
resource "aws_ec2_traffic_mirror_filter" "main" {
  description = "Filter for mirrored traffic"

  tags = {
    Name = "traffic-mirror-filter"
  }
}

# Filter rule to capture HTTP traffic
resource "aws_ec2_traffic_mirror_filter_rule" "http_inbound" {
  traffic_mirror_filter_id = aws_ec2_traffic_mirror_filter.main.id
  description              = "Capture inbound HTTP traffic"
  rule_number              = 100
  rule_action              = "accept"
  traffic_direction        = "ingress"
  protocol                 = 6  # TCP

  destination_port_range {
    from_port = 80
    to_port   = 80
  }

  source_cidr_block      = "0.0.0.0/0"
  destination_cidr_block = "0.0.0.0/0"
}

# Filter rule to capture HTTPS traffic
resource "aws_ec2_traffic_mirror_filter_rule" "https_inbound" {
  traffic_mirror_filter_id = aws_ec2_traffic_mirror_filter.main.id
  description              = "Capture inbound HTTPS traffic"
  rule_number              = 200
  rule_action              = "accept"
  traffic_direction        = "ingress"
  protocol                 = 6  # TCP

  destination_port_range {
    from_port = 443
    to_port   = 443
  }

  source_cidr_block      = "0.0.0.0/0"
  destination_cidr_block = "0.0.0.0/0"
}

# Traffic mirror session to connect source, target, and filter
resource "aws_ec2_traffic_mirror_session" "main" {
  description              = "Mirror web traffic for analysis"
  traffic_mirror_filter_id = aws_ec2_traffic_mirror_filter.main.id
  traffic_mirror_target_id = aws_ec2_traffic_mirror_target.analysis.id
  network_interface_id     = aws_network_interface.web_server.id
  session_number           = 1

  tags = {
    Name = "traffic-mirror-session"
  }
}
```

## CloudWatch Dashboard for Network Visibility

Create a dashboard that provides a centralized view of network health.

```hcl
# CloudWatch dashboard for network monitoring overview
resource "aws_cloudwatch_dashboard" "network" {
  dashboard_name = "network-monitoring"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/NATGateway", "BytesOutToDestination", "NatGatewayId", aws_nat_gateway.main.id],
            ["AWS/NATGateway", "BytesInFromDestination", "NatGatewayId", aws_nat_gateway.main.id]
          ]
          period = 300
          stat   = "Sum"
          region = "us-east-1"
          title  = "NAT Gateway Traffic"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/NATGateway", "ActiveConnectionCount", "NatGatewayId", aws_nat_gateway.main.id]
          ]
          period = 300
          stat   = "Maximum"
          region = "us-east-1"
          title  = "NAT Gateway Connections"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 24
        height = 6
        properties = {
          metrics = [
            ["CustomNetworkMetrics", "RejectedPacketCount"]
          ]
          period = 300
          stat   = "Sum"
          region = "us-east-1"
          title  = "Rejected Packets Over Time"
        }
      }
    ]
  })
}
```

## CloudWatch Insights Queries

Use CloudWatch Logs Insights to analyze flow log data. Here is a Terraform resource that stores commonly used queries.

```hcl
# Saved query for finding top talkers
resource "aws_cloudwatch_query_definition" "top_talkers" {
  name            = "network/top-talkers"
  log_group_names = [aws_cloudwatch_log_group.flow_logs.name]

  query_string = <<-EOF
    stats sum(bytes) as totalBytes by srcAddr
    | sort totalBytes desc
    | limit 20
  EOF
}

# Saved query for rejected connections by source
resource "aws_cloudwatch_query_definition" "rejected_by_source" {
  name            = "network/rejected-by-source"
  log_group_names = [aws_cloudwatch_log_group.flow_logs.name]

  query_string = <<-EOF
    filter action = "REJECT"
    | stats count(*) as rejectedCount by srcAddr
    | sort rejectedCount desc
    | limit 20
  EOF
}
```

## Best Practices

When configuring network monitoring, start with VPC Flow Logs at the VPC level to get broad coverage. Use the 1-minute aggregation interval for near real-time visibility. Send logs to both CloudWatch for quick analysis and S3 for cost-effective long-term storage.

Set meaningful alarm thresholds based on your baseline traffic patterns. Overly sensitive alarms lead to alert fatigue, while thresholds that are too high miss real issues. Review and adjust thresholds regularly as your traffic patterns evolve.

Enable traffic mirroring selectively, as it can impact network performance and incur additional costs. Use it primarily for security analysis and troubleshooting specific issues.

## Conclusion

Comprehensive network monitoring with Terraform gives you consistent, repeatable visibility into your cloud network. By combining VPC Flow Logs, CloudWatch alarms, traffic mirroring, and custom dashboards, you can detect and respond to network issues before they affect your users. The infrastructure-as-code approach ensures that your monitoring setup is version-controlled and can be replicated across environments.

For related topics, check out our guide on [How to Create Network Segmentation with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-network-segmentation-with-terraform/view).
