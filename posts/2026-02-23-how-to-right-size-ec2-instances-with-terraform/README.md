# How to Right-Size EC2 Instances with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, EC2, Right-Sizing, Cost Optimization

Description: Learn how to use Terraform with AWS Compute Optimizer and CloudWatch data to right-size EC2 instances and reduce unnecessary cloud spending.

---

Oversized EC2 instances are one of the most common sources of cloud waste. Right-sizing means matching instance types to actual workload requirements. Terraform makes it easy to change instance types and automate right-sizing recommendations into your infrastructure code. This guide covers how to identify oversized instances and implement right-sizing with Terraform.

## Identifying Oversized Instances

Use AWS Compute Optimizer to find right-sizing opportunities:

```hcl
# Enable Compute Optimizer
resource "aws_computeoptimizer_enrollment_status" "main" {
  status = "Active"
}
```

Query recommendations:

```bash
# Get Compute Optimizer recommendations
aws compute-optimizer get-ec2-instance-recommendations \
  --query 'instanceRecommendations[?finding==`OVER_PROVISIONED`].[instanceArn,currentInstanceType,recommendationOptions[0].instanceType,recommendationOptions[0].estimatedMonthlySavings.value]' \
  --output table
```

## Using CloudWatch Metrics for Right-Sizing

Create CloudWatch queries to identify underutilized instances:

```hcl
# CloudWatch alarm for low CPU utilization
resource "aws_cloudwatch_metric_alarm" "low_cpu" {
  for_each = toset(var.monitored_instance_ids)

  alarm_name          = "low-cpu-${each.key}"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 14  # 14 days
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 86400  # Daily average
  statistic           = "Average"
  threshold           = 10  # Less than 10% average CPU

  dimensions = {
    InstanceId = each.key
  }

  alarm_description = "Instance ${each.key} has low CPU utilization - consider right-sizing"
  alarm_actions     = [aws_sns_topic.right_sizing.arn]
}

resource "aws_sns_topic" "right_sizing" {
  name = "right-sizing-recommendations"
}
```

## Implementing Right-Sizing with Terraform

Once you have identified the right instance types, update your Terraform configuration:

```hcl
# Variables for flexible instance sizing
variable "instance_configs" {
  type = map(object({
    instance_type = string
    min_size      = number
    max_size      = number
  }))

  default = {
    web = {
      instance_type = "t3.medium"  # Right-sized from t3.xlarge
      min_size      = 2
      max_size      = 10
    }
    api = {
      instance_type = "m6i.large"  # Right-sized from m5.2xlarge
      min_size      = 2
      max_size      = 8
    }
    worker = {
      instance_type = "c6i.large"  # Right-sized from c5.2xlarge
      min_size      = 1
      max_size      = 5
    }
  }
}

resource "aws_instance" "app" {
  for_each = var.instance_configs

  ami           = var.ami_id
  instance_type = each.value.instance_type

  tags = {
    Name         = "${each.key}-server"
    RightSized   = "true"
    PreviousType = "see git history"
  }
}
```

## Graviton Migration for Cost Savings

Migrate to ARM-based Graviton instances for up to 40% cost savings:

```hcl
# Use Graviton instance types
variable "use_graviton" {
  type    = bool
  default = true
}

locals {
  # Map x86 instance types to Graviton equivalents
  graviton_map = {
    "t3.micro"    = "t4g.micro"
    "t3.small"    = "t4g.small"
    "t3.medium"   = "t4g.medium"
    "t3.large"    = "t4g.large"
    "m5.large"    = "m6g.large"
    "m5.xlarge"   = "m6g.xlarge"
    "c5.large"    = "c6g.large"
    "c5.xlarge"   = "c6g.xlarge"
    "r5.large"    = "r6g.large"
    "r5.xlarge"   = "r6g.xlarge"
  }

  # Select instance type based on Graviton preference
  instance_type = var.use_graviton ? local.graviton_map[var.base_instance_type] : var.base_instance_type

  # Use ARM AMI for Graviton
  ami_id = var.use_graviton ? var.arm_ami_id : var.x86_ami_id
}

resource "aws_instance" "web" {
  ami           = local.ami_id
  instance_type = local.instance_type

  tags = {
    Name        = "web-server"
    Architecture = var.use_graviton ? "arm64" : "x86_64"
  }
}
```

## Auto Scaling for Dynamic Right-Sizing

Use Auto Scaling to dynamically adjust capacity:

```hcl
resource "aws_autoscaling_group" "web" {
  name                = "web-asg"
  min_size            = 2
  max_size            = 10
  desired_capacity    = 2
  vpc_zone_identifier = var.subnet_ids

  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }

  # Target tracking for CPU
  tag {
    key                 = "Name"
    value               = "web-server"
    propagate_at_launch = true
  }
}

resource "aws_autoscaling_policy" "cpu_target" {
  name                   = "cpu-target-tracking"
  autoscaling_group_name = aws_autoscaling_group.web.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 60.0  # Scale to maintain 60% CPU utilization
  }
}

resource "aws_launch_template" "web" {
  name_prefix   = "web-"
  image_id      = var.ami_id
  instance_type = "t3.medium"  # Right-sized base instance

  # Enable T3 unlimited for burstable performance
  credit_specification {
    cpu_credits = "standard"  # Use standard to save on burstable costs
  }
}
```

## Scheduling Right-Sizing Reviews

Automate periodic right-sizing reviews:

```hcl
# Lambda function for monthly right-sizing analysis
resource "aws_lambda_function" "right_sizing_report" {
  function_name = "monthly-right-sizing-report"
  handler       = "index.handler"
  runtime       = "python3.11"
  timeout       = 300
  role          = aws_iam_role.right_sizing_lambda.arn

  filename         = "right-sizing-lambda.zip"
  source_code_hash = filebase64sha256("right-sizing-lambda.zip")

  environment {
    variables = {
      SNS_TOPIC_ARN = aws_sns_topic.right_sizing.arn
    }
  }
}

# Monthly schedule
resource "aws_cloudwatch_event_rule" "monthly_review" {
  name                = "monthly-right-sizing-review"
  schedule_expression = "cron(0 9 1 * ? *)"  # First of every month
}

resource "aws_cloudwatch_event_target" "right_sizing" {
  rule = aws_cloudwatch_event_rule.monthly_review.name
  arn  = aws_lambda_function.right_sizing_report.arn
}
```

## Best Practices

Collect at least two weeks of metrics before making right-sizing decisions. Start with non-production environments to validate new instance types. Use Graviton instances where application compatibility allows. Implement Auto Scaling to dynamically adjust capacity. Schedule monthly right-sizing reviews. Track cost savings from right-sizing in a dashboard. Use the `lifecycle` block with `create_before_destroy` for zero-downtime instance type changes.

## Conclusion

Right-sizing EC2 instances with Terraform is a high-impact cost optimization strategy. By leveraging AWS Compute Optimizer, CloudWatch metrics, and Graviton instances, you can significantly reduce compute costs. Terraform makes it easy to implement and track these changes through version control. Make right-sizing a regular practice rather than a one-time effort for sustained cost optimization.

For related guides, see [How to Use Spot Instances for Cost Savings with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-spot-instances-for-cost-savings-with-terraform/view) and [How to Use Terraform for FinOps Best Practices](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-for-finops-best-practices/view).
