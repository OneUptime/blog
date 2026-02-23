# How to Implement Chargeback Models with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Chargeback, FinOps, Cost Allocation, Cloud Cost Management

Description: Learn how to implement chargeback and showback models with Terraform using cost allocation tags, AWS Cost Explorer, and automated reporting pipelines.

---

Chargeback models assign cloud costs to the teams, projects, or business units that consume them. When teams are responsible for their own costs, they make more thoughtful decisions about resource provisioning and optimization. Terraform provides the infrastructure to implement chargeback by enforcing consistent tagging, setting up cost reporting, and automating the allocation process.

This guide covers how to build a complete chargeback system using Terraform, from tagging foundations to automated cost reports.

## Chargeback vs. Showback

Before implementing, it is important to understand the difference. Chargeback means costs are actually billed to each team's budget. Showback means costs are reported to teams for visibility, but a central budget absorbs the actual expense. Many organizations start with showback and move to chargeback as their cost allocation accuracy improves.

## Setting Up the Tagging Foundation

Accurate chargeback requires consistent, comprehensive tagging. Every resource must have tags that identify the cost owner.

```hcl
# Define the chargeback tag schema
variable "chargeback_tags" {
  description = "Required tags for cost allocation"
  type = object({
    business_unit = string
    team          = string
    cost_center   = string
    project       = string
    environment   = string
  })
}

# Validate that the cost center format is correct
variable "cost_center_pattern" {
  description = "Regex pattern for valid cost center codes"
  type        = string
  default     = "^CC-[0-9]{4}$"
}

locals {
  # Standard tags applied to all resources
  chargeback_resource_tags = {
    BusinessUnit = var.chargeback_tags.business_unit
    Team         = var.chargeback_tags.team
    CostCenter   = var.chargeback_tags.cost_center
    Project      = var.chargeback_tags.project
    Environment  = var.chargeback_tags.environment
    ManagedBy    = "terraform"
  }
}

# Activate cost allocation tags in AWS Billing
resource "aws_ce_cost_allocation_tag" "chargeback_tags" {
  for_each = toset([
    "BusinessUnit",
    "Team",
    "CostCenter",
    "Project",
    "Environment",
  ])

  tag_key = each.value
  status  = "Active"
}
```

## Creating AWS Cost Categories

AWS Cost Categories let you define rules that group costs into categories matching your chargeback model.

```hcl
# Cost category for business unit allocation
resource "aws_ce_cost_category" "business_unit" {
  name         = "BusinessUnit"
  rule_version = "CostCategoryExpression.v1"

  # Rules to categorize costs by business unit
  rule {
    value = "Engineering"
    rule {
      tags {
        key           = "BusinessUnit"
        values        = ["engineering", "Engineering"]
        match_options = ["EQUALS"]
      }
    }
  }

  rule {
    value = "Data Science"
    rule {
      tags {
        key           = "BusinessUnit"
        values        = ["data-science", "DataScience"]
        match_options = ["EQUALS"]
      }
    }
  }

  rule {
    value = "Marketing"
    rule {
      tags {
        key           = "BusinessUnit"
        values        = ["marketing", "Marketing"]
        match_options = ["EQUALS"]
      }
    }
  }

  # Default rule for untagged resources
  default_value = "Shared-Infrastructure"
}

# Cost category for team-level allocation
resource "aws_ce_cost_category" "team" {
  name         = "TeamAllocation"
  rule_version = "CostCategoryExpression.v1"

  dynamic "rule" {
    for_each = var.teams
    content {
      value = rule.key
      rule {
        tags {
          key           = "Team"
          values        = [rule.key]
          match_options = ["EQUALS"]
        }
      }
    }
  }

  default_value = "Unallocated"
}
```

## Building a Cost Reporting Pipeline

Automated reports are essential for chargeback. Teams need regular visibility into their spending.

```hcl
# S3 bucket for cost reports
resource "aws_s3_bucket" "cost_reports" {
  bucket = "company-cost-reports-${var.account_id}"
}

resource "aws_s3_bucket_lifecycle_configuration" "cost_reports" {
  bucket = aws_s3_bucket.cost_reports.id

  rule {
    id     = "archive-old-reports"
    status = "Enabled"

    filter {
      prefix = "reports/"
    }

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }

    expiration {
      days = 730
    }
  }
}

# AWS Cost and Usage Report
resource "aws_cur_report_definition" "chargeback" {
  report_name                = "chargeback-report"
  time_unit                  = "DAILY"
  format                     = "Parquet"
  compression                = "Parquet"
  additional_schema_elements = ["RESOURCES"]
  s3_bucket                  = aws_s3_bucket.cost_reports.id
  s3_prefix                  = "cur/"
  s3_region                  = var.region
  report_versioning          = "OVERWRITE_REPORT"
  refresh_closed_reports     = true

  additional_artifacts = ["ATHENA"]
}

# Athena database for querying cost data
resource "aws_athena_database" "cost_data" {
  name   = "cost_data"
  bucket = aws_s3_bucket.cost_reports.id

  force_destroy = true
}

# Glue crawler to catalog cost data
resource "aws_glue_crawler" "cost_data" {
  database_name = aws_athena_database.cost_data.name
  name          = "cost-data-crawler"
  role          = aws_iam_role.glue_crawler.arn

  s3_target {
    path = "s3://${aws_s3_bucket.cost_reports.id}/cur/"
  }

  schedule = "cron(0 6 * * ? *)"
}
```

## Automating Chargeback Reports

A Lambda function generates formatted chargeback reports and sends them to team leads.

```hcl
# Lambda function for generating chargeback reports
resource "aws_lambda_function" "chargeback_report" {
  filename         = data.archive_file.chargeback_report.output_path
  function_name    = "generate-chargeback-report"
  role             = aws_iam_role.chargeback_report.arn
  handler          = "index.handler"
  runtime          = "python3.11"
  timeout          = 300
  memory_size      = 512
  source_code_hash = data.archive_file.chargeback_report.output_base64sha256

  environment {
    variables = {
      ATHENA_DATABASE  = aws_athena_database.cost_data.name
      REPORT_BUCKET    = aws_s3_bucket.cost_reports.id
      SNS_TOPIC_ARN    = aws_sns_topic.chargeback.arn
      TEAM_CONFIG      = jsonencode(var.team_config)
    }
  }
}

# Monthly chargeback report schedule
resource "aws_cloudwatch_event_rule" "monthly_chargeback" {
  name                = "monthly-chargeback-report"
  description         = "Generate monthly chargeback reports"
  schedule_expression = "cron(0 9 1 * ? *)"
}

resource "aws_cloudwatch_event_target" "chargeback_report" {
  rule      = aws_cloudwatch_event_rule.monthly_chargeback.name
  target_id = "ChargebackReport"
  arn       = aws_lambda_function.chargeback_report.arn
}

# SNS topic for chargeback notifications
resource "aws_sns_topic" "chargeback" {
  name = "chargeback-reports"
}

# Per-team email subscriptions
resource "aws_sns_topic_subscription" "team_leads" {
  for_each  = var.team_config
  topic_arn = aws_sns_topic.chargeback.arn
  protocol  = "email"
  endpoint  = each.value.lead_email
}
```

## Handling Shared Resources

Not all costs map neatly to a single team. Shared resources like VPCs, NAT gateways, and monitoring tools need to be allocated proportionally.

```hcl
# Cost category for shared resource allocation
resource "aws_ce_cost_category" "shared_allocation" {
  name         = "SharedResourceAllocation"
  rule_version = "CostCategoryExpression.v1"

  # Tag-based allocation for team-owned resources
  rule {
    value = "Direct-Allocation"
    rule {
      tags {
        key           = "Team"
        values        = [for t in keys(var.teams) : t]
        match_options = ["EQUALS"]
      }
    }
  }

  # Everything else is shared infrastructure
  default_value = "Shared-Pool"
}

# Variables defining allocation percentages for shared costs
variable "shared_cost_allocation" {
  description = "Percentage allocation of shared costs per team"
  type = map(number)
  default = {
    "platform"  = 15
    "backend"   = 30
    "frontend"  = 20
    "data"      = 25
    "devops"    = 10
  }

  validation {
    condition     = sum(values(var.shared_cost_allocation)) == 100
    error_message = "Shared cost allocation percentages must sum to 100."
  }
}
```

## Budget Alerts per Team

Each team gets their own budget with alerts tailored to their spending patterns.

```hcl
# Per-team budgets
resource "aws_budgets_budget" "team_budgets" {
  for_each = var.team_config

  name              = "${each.key}-monthly-budget"
  budget_type       = "COST"
  limit_amount      = each.value.monthly_budget
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2026-01-01_00:00"

  cost_filter {
    name   = "TagKeyValue"
    values = ["user:Team$${each.key}"]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = [each.value.lead_email]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "FORECASTED"
    subscriber_email_addresses = [each.value.lead_email, var.finance_email]
  }
}
```

## Best Practices

Start with showback before implementing full chargeback. This gives teams time to adjust their tagging and understand their costs before being held financially accountable. Allocate shared costs transparently - publish the formula and update it quarterly based on actual usage patterns.

Invest in tagging compliance. Chargeback is only as accurate as your tagging. Resources without proper tags should be flagged and remediated quickly, not silently absorbed into a shared pool.

For more on cost allocation foundations, see our guide on [cost allocation tags across teams with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-cost-allocation-tags-across-teams-with-terraform/view) and [cost governance with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-cost-governance-with-terraform/view).

## Conclusion

Implementing chargeback with Terraform creates accountability for cloud spending at the team level. By combining consistent tagging, AWS Cost Categories, automated reporting, and per-team budgets, you build a system where every dollar of cloud spending is attributed to the team that consumed it. This transparency drives better decision-making and ultimately reduces overall cloud costs as teams become more deliberate about their resource consumption.
