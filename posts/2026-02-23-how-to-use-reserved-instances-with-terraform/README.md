# How to Use Reserved Instances with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Reserved Instances, Cost Optimization, FinOps

Description: Learn how to manage AWS Reserved Instance purchases and coverage tracking with Terraform for significant long-term cost savings on compute resources.

---

AWS Reserved Instances (RIs) offer up to 72% savings compared to on-demand pricing in exchange for a one or three-year commitment. While the RI purchase itself is typically done through the AWS Console or API, Terraform plays a crucial role in managing the infrastructure that leverages RIs and tracking coverage. This guide covers how to work with Reserved Instances in a Terraform-managed environment.

## Understanding Reserved Instances

Reserved Instances are a billing construct, not a specific resource. When you purchase an RI for a specific instance type in a specific region, AWS automatically applies the discount to matching on-demand instances. You do not need to modify your Terraform configuration for the discount to apply.

```hcl
# This instance automatically benefits from an RI purchase
# for t3.large in us-east-1
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.large"  # Matches the RI

  tags = {
    Name          = "web-server"
    ReservedCover = "true"  # Tag for tracking
  }
}
```

## Purchasing Reserved Instances with Terraform

While direct RI purchase through Terraform is limited, you can use the AWS provider to manage EC2 Reserved Instance listings:

```hcl
# Purchase an EC2 Reserved Instance
resource "aws_ec2_capacity_reservation" "web" {
  instance_type           = "t3.large"
  instance_platform       = "Linux/UNIX"
  availability_zone       = "us-east-1a"
  instance_count          = 5
  end_date_type           = "limited"
  end_date                = "2027-02-23T00:00:00Z"
  instance_match_criteria = "targeted"

  tags = {
    Name    = "web-server-reservation"
    Purpose = "cost-optimization"
  }
}

# Target the capacity reservation
resource "aws_instance" "web" {
  count         = 5
  ami           = var.ami_id
  instance_type = "t3.large"

  capacity_reservation_specification {
    capacity_reservation_target {
      capacity_reservation_id = aws_ec2_capacity_reservation.web.id
    }
  }
}
```

## Tracking RI Coverage with Terraform

Set up monitoring to track whether your instances are covered by RIs:

```hcl
# CloudWatch alarm for RI coverage
resource "aws_cloudwatch_metric_alarm" "ri_coverage" {
  alarm_name          = "ri-coverage-below-threshold"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name         = "Coverage"
  namespace           = "AWS/EC2"
  period              = 86400
  statistic           = "Average"
  threshold           = 80  # Alert if RI coverage drops below 80%

  alarm_description = "RI coverage has dropped below 80%"
  alarm_actions     = [aws_sns_topic.cost_alerts.arn]
}

# Budget for RI utilization monitoring
resource "aws_budgets_budget" "ri_utilization" {
  name         = "ri-utilization-budget"
  budget_type  = "RI_UTILIZATION"
  limit_amount = "80"  # Alert if utilization drops below 80%
  limit_unit   = "PERCENTAGE"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "Service"
    values = ["Amazon Elastic Compute Cloud - Compute"]
  }

  notification {
    comparison_operator        = "LESS_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["finops@company.com"]
  }
}
```

## Ensuring Instances Match RI Specifications

Use Terraform variables to ensure consistency between your instances and RI purchases:

```hcl
# Define RI-covered instance types
variable "ri_instance_types" {
  description = "Instance types covered by Reserved Instances"
  type = map(object({
    type      = string
    count     = number
    az        = string
  }))

  default = {
    web = {
      type  = "t3.large"
      count = 5
      az    = "us-east-1a"
    }
    api = {
      type  = "m5.xlarge"
      count = 3
      az    = "us-east-1b"
    }
  }
}

# Create instances matching RI specifications
resource "aws_instance" "ri_covered" {
  for_each = var.ri_instance_types

  count             = each.value.count
  ami               = var.ami_id
  instance_type     = each.value.type
  availability_zone = each.value.az

  tags = {
    Name            = "${each.key}-server"
    RICovered       = "true"
    RIInstanceType  = each.value.type
  }
}
```

## Managing RI Modifications

When you need to change instance types, plan the RI modification alongside:

```hcl
# Document RI modifications needed
# Step 1: Modify RI from t3.large to t3.xlarge (AWS Console)
# Step 2: Update Terraform configuration

variable "web_instance_type" {
  type    = string
  default = "t3.xlarge"  # Updated from t3.large after RI modification
}

resource "aws_instance" "web" {
  count         = 5
  ami           = var.ami_id
  instance_type = var.web_instance_type

  tags = {
    Name       = "web-server-${count.index}"
    RICovered  = "true"
    RIModified = "2026-02-23"
  }
}
```

## RDS Reserved Instances

Track RDS RI coverage similarly:

```hcl
resource "aws_db_instance" "primary" {
  identifier     = "app-db"
  engine         = "postgres"
  instance_class = "db.r5.large"  # Must match RDS RI purchase

  tags = {
    RICovered = "true"
  }
}

# Monitor RDS RI utilization
resource "aws_budgets_budget" "rds_ri_utilization" {
  name         = "rds-ri-utilization"
  budget_type  = "RI_UTILIZATION"
  limit_amount = "80"
  limit_unit   = "PERCENTAGE"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "Service"
    values = ["Amazon Relational Database Service"]
  }

  notification {
    comparison_operator        = "LESS_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["finops@company.com"]
  }
}
```

## RI Planning with Tags

Use tags to plan RI purchases:

```hcl
# Tag all instances with RI planning information
locals {
  ri_planning_tags = {
    RICandidate   = "true"
    UsagePattern  = "steady"  # steady, variable, or burst
    MinUptime     = "24x7"    # 24x7 or business-hours
    ExpectedLife  = "12months" # Expected resource lifetime
  }
}

resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = "t3.large"

  tags = merge(local.common_tags, local.ri_planning_tags, {
    Name = "web-server"
  })
}
```

## Best Practices

Only purchase RIs for instances with steady, predictable usage. Tag instances to track RI coverage and candidates. Monitor RI utilization and coverage with CloudWatch and AWS Budgets. Plan RI modifications alongside Terraform instance type changes. Consider Convertible RIs for flexibility to change instance families. Use Savings Plans as a more flexible alternative for mixed workloads. Review RI inventory quarterly against actual Terraform-managed infrastructure.

## Conclusion

Reserved Instances provide significant cost savings for steady-state workloads. While RI purchases happen outside Terraform, your Terraform configurations must align with RI specifications to receive discounts. By using consistent variables, tags for coverage tracking, and monitoring for utilization, you can maximize the value of your RI investments while managing infrastructure through Terraform.

For related guides, see [How to Use Savings Plans with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-savings-plans-with-terraform/view) and [How to Right-Size EC2 Instances with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-right-size-ec2-instances-with-terraform/view).
