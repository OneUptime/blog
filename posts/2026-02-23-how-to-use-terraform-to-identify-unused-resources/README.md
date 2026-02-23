# How to Use Terraform to Identify Unused Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Cost Optimization, Unused Resources, Cloud Waste, Infrastructure Cleanup

Description: Learn how to use Terraform to identify and clean up unused cloud resources like detached EBS volumes, idle load balancers, and orphaned snapshots.

---

Unused cloud resources are one of the biggest sources of wasted spending. Studies consistently show that 20-35% of cloud spending goes to resources that are idle, underutilized, or completely orphaned. These resources accumulate over time as teams create infrastructure for testing, migrate workloads, or scale down without cleaning up. Terraform can help you both identify and remediate this waste.

This guide covers practical approaches to finding and eliminating unused resources using Terraform alongside AWS services.

## Common Types of Unused Resources

Before diving into the technical implementation, it helps to know what you are looking for. The most common types of cloud waste include unattached EBS volumes, idle Elastic IPs, unused Elastic Load Balancers, old EBS snapshots, unused NAT gateways, and idle RDS instances with zero connections.

## Detecting Unattached EBS Volumes

Unattached EBS volumes continue to incur charges even though nothing is using them. This Lambda function, deployed with Terraform, finds and reports them.

```hcl
# Lambda function to detect unattached EBS volumes
resource "aws_lambda_function" "find_unused_ebs" {
  filename         = data.archive_file.unused_ebs.output_path
  function_name    = "find-unused-ebs-volumes"
  role             = aws_iam_role.resource_scanner.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  timeout          = 120
  source_code_hash = data.archive_file.unused_ebs.output_base64sha256

  environment {
    variables = {
      SNS_TOPIC_ARN         = aws_sns_topic.unused_resources.arn
      MIN_AGE_DAYS          = "7"
      DRY_RUN               = var.dry_run ? "true" : "false"
      SNAPSHOT_BEFORE_DELETE = "true"
    }
  }
}

# IAM role with permissions to scan and manage EBS volumes
resource "aws_iam_role" "resource_scanner" {
  name = "unused-resource-scanner"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "resource_scanner" {
  name = "resource-scanner-policy"
  role = aws_iam_role.resource_scanner.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeVolumes",
          "ec2:DescribeSnapshots",
          "ec2:CreateSnapshot",
          "ec2:DeleteVolume",
          "ec2:DescribeInstances",
          "ec2:DescribeAddresses",
          "ec2:ReleaseAddress",
          "elasticloadbalancing:DescribeLoadBalancers",
          "elasticloadbalancing:DescribeTargetGroups",
          "elasticloadbalancing:DescribeTargetHealth",
          "cloudwatch:GetMetricData",
          "rds:DescribeDBInstances",
          "sns:Publish",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}

# SNS topic for unused resource notifications
resource "aws_sns_topic" "unused_resources" {
  name = "unused-resource-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  for_each  = toset(var.alert_emails)
  topic_arn = aws_sns_topic.unused_resources.arn
  protocol  = "email"
  endpoint  = each.value
}
```

## Finding Idle Elastic IPs

Elastic IPs that are not associated with running instances incur charges. This is easy to detect and fix.

```hcl
# Lambda function to find unassociated Elastic IPs
resource "aws_lambda_function" "find_idle_eips" {
  filename         = data.archive_file.idle_eips.output_path
  function_name    = "find-idle-elastic-ips"
  role             = aws_iam_role.resource_scanner.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  timeout          = 60
  source_code_hash = data.archive_file.idle_eips.output_base64sha256

  environment {
    variables = {
      SNS_TOPIC_ARN = aws_sns_topic.unused_resources.arn
      AUTO_RELEASE  = var.auto_release_eips ? "true" : "false"
    }
  }
}

# AWS Config rule to detect unattached EIPs
resource "aws_config_config_rule" "eip_attached" {
  name = "eip-attached"

  source {
    owner             = "AWS"
    source_identifier = "EIP_ATTACHED"
  }

  depends_on = [aws_config_configuration_recorder.main]
}
```

## Detecting Idle Load Balancers

Load balancers with no healthy targets or zero requests are a common source of waste.

```hcl
# CloudWatch alarm for idle ALB detection
resource "aws_cloudwatch_metric_alarm" "idle_alb" {
  for_each = var.load_balancer_arns

  alarm_name          = "idle-alb-${each.key}"
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = 7
  metric_name         = "RequestCount"
  namespace           = "AWS/ApplicationELB"
  period              = 86400
  statistic           = "Sum"
  threshold           = 0
  treat_missing_data  = "breaching"
  alarm_description   = "ALB ${each.key} has had zero requests for 7 days"
  alarm_actions       = [aws_sns_topic.unused_resources.arn]

  dimensions = {
    LoadBalancer = each.value
  }
}

# Lambda to scan for load balancers with no targets
resource "aws_lambda_function" "find_idle_lbs" {
  filename         = data.archive_file.idle_lbs.output_path
  function_name    = "find-idle-load-balancers"
  role             = aws_iam_role.resource_scanner.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  timeout          = 120
  source_code_hash = data.archive_file.idle_lbs.output_base64sha256

  environment {
    variables = {
      SNS_TOPIC_ARN       = aws_sns_topic.unused_resources.arn
      IDLE_DAYS_THRESHOLD = "7"
    }
  }
}
```

## Finding Old Snapshots

EBS snapshots accumulate over time and can represent significant storage costs.

```hcl
# Lambda to find and clean up old snapshots
resource "aws_lambda_function" "snapshot_cleanup" {
  filename         = data.archive_file.snapshot_cleanup.output_path
  function_name    = "old-snapshot-cleanup"
  role             = aws_iam_role.resource_scanner.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  timeout          = 300
  source_code_hash = data.archive_file.snapshot_cleanup.output_base64sha256

  environment {
    variables = {
      SNS_TOPIC_ARN  = aws_sns_topic.unused_resources.arn
      MAX_AGE_DAYS   = var.snapshot_max_age_days
      DRY_RUN        = var.dry_run ? "true" : "false"
      EXCLUDE_TAGGED = "true"
      EXCLUDE_TAG    = "KeepSnapshot"
    }
  }
}
```

## Scheduling Regular Resource Scans

Set up a regular schedule to run all resource scanners.

```hcl
# Weekly schedule for all resource scanners
resource "aws_cloudwatch_event_rule" "weekly_scan" {
  name                = "weekly-unused-resource-scan"
  description         = "Run unused resource scans every Monday"
  schedule_expression = "cron(0 8 ? * MON *)"
}

# Connect each scanner to the schedule
locals {
  scanner_functions = {
    ebs_volumes    = aws_lambda_function.find_unused_ebs.arn
    elastic_ips    = aws_lambda_function.find_idle_eips.arn
    load_balancers = aws_lambda_function.find_idle_lbs.arn
    snapshots      = aws_lambda_function.snapshot_cleanup.arn
  }
}

resource "aws_cloudwatch_event_target" "scanner_targets" {
  for_each = local.scanner_functions

  rule      = aws_cloudwatch_event_rule.weekly_scan.name
  target_id = each.key
  arn       = each.value
}

resource "aws_lambda_permission" "allow_eventbridge" {
  for_each = local.scanner_functions

  statement_id  = "AllowEventBridge-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = each.value
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.weekly_scan.arn
}
```

## Using Terraform State to Detect Drift

Terraform state itself can help identify resources that have drifted from their intended configuration or should no longer exist.

```hcl
# Use Terraform data sources to check resource utilization
data "aws_instances" "all" {
  instance_state_names = ["running"]
}

# Output a report of instances and their types for review
output "running_instances_report" {
  description = "Report of all running instances for cost review"
  value = {
    total_count = length(data.aws_instances.all.ids)
    instance_ids = data.aws_instances.all.ids
  }
}

# Data source to find unattached volumes
data "aws_ebs_volumes" "unattached" {
  filter {
    name   = "status"
    values = ["available"]
  }
}

output "unattached_volumes" {
  description = "EBS volumes that are not attached to any instance"
  value = {
    count      = length(data.aws_ebs_volumes.unattached.ids)
    volume_ids = data.aws_ebs_volumes.unattached.ids
  }
}
```

## Best Practices

Always use a dry-run mode first when building cleanup automation. Deleting the wrong resource can be far more expensive than the waste you are trying to eliminate. Tag resources that should be exempt from cleanup with a specific tag like "KeepResource" or "DoNotDelete". Create snapshots of volumes before deleting them as an insurance policy.

Build a notification pipeline that gives resource owners time to claim resources before they are cleaned up. A typical workflow is: detect, notify, wait 7 days, notify again, wait 7 more days, then clean up.

For related cost optimization strategies, check out our guides on [creating resource lifecycle policies with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-resource-lifecycle-policies-for-cost-with-terraform/view) and [storage cost optimization with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-storage-cost-optimization-with-terraform/view).

## Conclusion

Identifying and eliminating unused resources is one of the highest-ROI activities in cloud cost optimization. By automating the detection process with Terraform-managed Lambda functions, CloudWatch alarms, and AWS Config rules, you can continuously scan your environment for waste without relying on manual reviews. The key is building safety into the process with dry runs, notifications, and grace periods, then gradually moving toward automated cleanup as confidence grows.
