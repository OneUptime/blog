# How to Handle Reserved Capacity Planning with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Reserved Instances, Savings Plans, Cost Optimization, Capacity Planning

Description: Learn how to plan and manage reserved capacity with Terraform using Reserved Instances, Savings Plans, and capacity reservations to reduce cloud costs by up to 72%.

---

Reserved capacity is one of the most effective ways to reduce cloud costs. AWS Reserved Instances and Savings Plans can save 30-72% compared to on-demand pricing, but they require careful planning to avoid committing to capacity you do not need. Terraform helps you manage this process by tracking your actual resource usage and aligning your reservations with real deployment patterns.

This guide covers how to use Terraform to plan, implement, and monitor reserved capacity commitments across your cloud infrastructure.

## Understanding Reserved Capacity Options

AWS offers several reserved capacity models. Reserved Instances (RIs) provide discounts on specific instance types in specific regions. Savings Plans offer more flexibility by committing to a dollar amount of hourly usage rather than specific instance types. On-Demand Capacity Reservations guarantee that capacity is available when you need it but do not provide a price discount on their own.

## Tracking Current Usage for Reservation Planning

Before purchasing reservations, you need to understand your baseline usage. Terraform data sources can help you inventory your current resources.

```hcl
# Data source to inventory current EC2 instances
data "aws_instances" "running" {
  filter {
    name   = "instance-state-name"
    values = ["running"]
  }

  filter {
    name   = "tag:Environment"
    values = ["production"]
  }
}

# Data source to get instance details
data "aws_instance" "details" {
  for_each    = toset(data.aws_instances.running.ids)
  instance_id = each.value
}

# Output a summary of current instance types for reservation planning
output "instance_type_summary" {
  description = "Count of running instances by type for reservation planning"
  value = {
    for type in distinct([for i in data.aws_instance.details : i.instance_type]) :
    type => length([for i in data.aws_instance.details : i if i.instance_type == type])
  }
}

# Output total compute hours for Savings Plan sizing
output "estimated_monthly_compute_hours" {
  description = "Estimated monthly compute hours by instance type"
  value = {
    for type in distinct([for i in data.aws_instance.details : i.instance_type]) :
    type => length([for i in data.aws_instance.details : i if i.instance_type == type]) * 730
  }
}
```

## Managing On-Demand Capacity Reservations

Capacity Reservations ensure you have guaranteed access to compute capacity. Pair these with Reserved Instances for both capacity assurance and cost savings.

```hcl
# Capacity reservation for critical production workloads
resource "aws_ec2_capacity_reservation" "production" {
  instance_type           = "m6i.xlarge"
  instance_platform       = "Linux/UNIX"
  availability_zone       = var.primary_az
  instance_count          = var.production_instance_count
  instance_match_criteria = "targeted"
  end_date_type           = "unlimited"

  tags = {
    Name        = "production-capacity-${var.primary_az}"
    Environment = "production"
    CostCenter  = var.cost_center
    Purpose     = "guaranteed-capacity"
  }
}

# EC2 instances that target the capacity reservation
resource "aws_instance" "production" {
  count         = var.production_instance_count
  ami           = var.ami_id
  instance_type = "m6i.xlarge"

  capacity_reservation_specification {
    capacity_reservation_target {
      capacity_reservation_id = aws_ec2_capacity_reservation.production.id
    }
  }

  tags = {
    Name        = "production-server-${count.index}"
    Environment = "production"
  }
}
```

## Creating a Reservation Planning Module

A reusable module helps standardize reservation planning across teams.

```hcl
# modules/reservation-planner/variables.tf
variable "instance_types" {
  description = "Map of instance types to their usage"
  type = map(object({
    count              = number
    hours_per_month    = number
    on_demand_price    = number
    reserved_1yr_price = number
    reserved_3yr_price = number
    savings_plan_price = number
  }))
}

variable "commitment_term" {
  description = "Reservation term: 1yr or 3yr"
  type        = string
  default     = "1yr"
  validation {
    condition     = contains(["1yr", "3yr"], var.commitment_term)
    error_message = "Term must be 1yr or 3yr."
  }
}

variable "payment_option" {
  description = "Payment option: all-upfront, partial-upfront, no-upfront"
  type        = string
  default     = "partial-upfront"
}

# modules/reservation-planner/main.tf
locals {
  # Calculate cost comparison for each instance type
  cost_analysis = {
    for type, config in var.instance_types : type => {
      monthly_on_demand = config.count * config.hours_per_month * config.on_demand_price
      monthly_reserved  = config.count * config.hours_per_month * (
        var.commitment_term == "1yr" ? config.reserved_1yr_price : config.reserved_3yr_price
      )
      monthly_savings_plan = config.count * config.hours_per_month * config.savings_plan_price
      savings_ri = (
        config.count * config.hours_per_month * config.on_demand_price -
        config.count * config.hours_per_month * (
          var.commitment_term == "1yr" ? config.reserved_1yr_price : config.reserved_3yr_price
        )
      )
      savings_sp = (
        config.count * config.hours_per_month * config.on_demand_price -
        config.count * config.hours_per_month * config.savings_plan_price
      )
    }
  }

  total_monthly_on_demand = sum([for _, v in local.cost_analysis : v.monthly_on_demand])
  total_monthly_reserved  = sum([for _, v in local.cost_analysis : v.monthly_reserved])
  total_monthly_sp        = sum([for _, v in local.cost_analysis : v.monthly_savings_plan])
}

output "cost_comparison" {
  description = "Cost comparison between on-demand, RI, and Savings Plans"
  value = {
    per_instance_type    = local.cost_analysis
    total_monthly_on_demand = local.total_monthly_on_demand
    total_monthly_reserved  = local.total_monthly_reserved
    total_monthly_savings_plan = local.total_monthly_sp
    recommended_savings_plan_commitment = local.total_monthly_sp / 730
  }
}
```

## Monitoring Reservation Utilization

Track whether your reservations are being fully used to avoid paying for unused capacity.

```hcl
# CloudWatch alarm for low RI utilization
resource "aws_cloudwatch_metric_alarm" "ri_utilization" {
  alarm_name          = "low-ri-utilization"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 7
  metric_name         = "ReservedInstanceUtilization"
  namespace           = "AWS/Billing"
  period              = 86400
  statistic           = "Average"
  threshold           = 80
  treat_missing_data  = "notBreaching"
  alarm_description   = "Reserved Instance utilization has dropped below 80%"
  alarm_actions       = [aws_sns_topic.reservation_alerts.arn]
}

# SNS topic for reservation alerts
resource "aws_sns_topic" "reservation_alerts" {
  name = "reservation-utilization-alerts"
}

resource "aws_sns_topic_subscription" "reservation_email" {
  for_each  = toset(var.finance_emails)
  topic_arn = aws_sns_topic.reservation_alerts.arn
  protocol  = "email"
  endpoint  = each.value
}

# Budget for tracking savings vs. on-demand
resource "aws_budgets_budget" "reservation_coverage" {
  name              = "reservation-coverage"
  budget_type       = "RI_COVERAGE"
  limit_amount      = "80"
  limit_unit        = "PERCENTAGE"
  time_unit         = "MONTHLY"
  time_period_start = "2026-01-01_00:00"

  cost_filter {
    name   = "Service"
    values = ["Amazon Elastic Compute Cloud - Compute"]
  }

  notification {
    comparison_operator       = "LESS_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = var.finance_emails
  }
}

# Budget for RI utilization monitoring
resource "aws_budgets_budget" "ri_utilization" {
  name              = "ri-utilization"
  budget_type       = "RI_UTILIZATION"
  limit_amount      = "80"
  limit_unit        = "PERCENTAGE"
  time_unit         = "MONTHLY"
  time_period_start = "2026-01-01_00:00"

  notification {
    comparison_operator       = "LESS_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = var.finance_emails
  }
}
```

## RDS Reserved Instance Planning

Database reservations offer some of the highest savings because databases typically run 24/7.

```hcl
# Inventory current RDS instances for reservation planning
data "aws_db_instances" "all" {}

output "rds_reservation_candidates" {
  description = "RDS instances that are candidates for reservation"
  value = {
    instances = data.aws_db_instances.all.instance_identifiers
  }
}

# Budget to track RDS reservation coverage
resource "aws_budgets_budget" "rds_ri_coverage" {
  name              = "rds-ri-coverage"
  budget_type       = "RI_COVERAGE"
  limit_amount      = "80"
  limit_unit        = "PERCENTAGE"
  time_unit         = "MONTHLY"
  time_period_start = "2026-01-01_00:00"

  cost_filter {
    name   = "Service"
    values = ["Amazon Relational Database Service"]
  }

  notification {
    comparison_operator       = "LESS_THAN"
    threshold                 = 70
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = var.finance_emails
  }
}
```

## Best Practices

Start with Compute Savings Plans rather than Reserved Instances for maximum flexibility. Savings Plans automatically apply to any matching usage, regardless of instance type, size, or region. Reserve only your baseline steady-state usage and use on-demand or spot for variable workloads.

Review your reservations quarterly. As workloads change, your optimal reservation mix changes too. Use the reservation planner module to model different scenarios before committing.

For related cost optimization strategies, see our guides on [database cost optimization with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-database-cost-optimization-with-terraform/view) and [monitoring cloud spend with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-monitor-cloud-spend-with-terraform/view).

## Conclusion

Reserved capacity planning with Terraform turns a complex financial decision into a data-driven, repeatable process. By inventorying your current usage, modeling different reservation scenarios, and monitoring utilization after purchase, you maximize your savings while minimizing the risk of overcommitment. The key is to start conservatively, measure carefully, and increase your reservation coverage over time as you gain confidence in your usage patterns.
