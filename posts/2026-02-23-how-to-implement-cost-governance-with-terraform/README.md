# How to Implement Cost Governance with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Cost Governance, FinOps, Cloud Cost Management, Policy as Code

Description: Learn how to implement cost governance with Terraform using budgets, policies, tagging enforcement, and organizational controls to manage cloud spending.

---

Cost governance is the practice of establishing rules, processes, and controls that ensure cloud spending stays within acceptable bounds while still enabling teams to innovate. Without governance, cloud costs tend to grow unchecked as teams provision resources without considering the financial impact. Terraform is an excellent tool for implementing cost governance because it makes infrastructure changes visible, reviewable, and enforceable before any money is spent.

This guide walks through practical Terraform configurations for establishing effective cost governance across your organization.

## Building a Cost Governance Framework

Effective cost governance has several layers: budgets that set spending limits, policies that restrict expensive resource types, tagging requirements that enable cost allocation, and alerts that notify stakeholders when spending deviates from expectations. Terraform can implement all of these layers.

## Setting Up AWS Budgets

AWS Budgets allow you to set custom cost thresholds and receive alerts when actual or forecasted spending crosses those thresholds.

```hcl
# Overall account budget
resource "aws_budgets_budget" "account_monthly" {
  name              = "account-monthly-budget"
  budget_type       = "COST"
  limit_amount      = var.monthly_account_budget
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2026-01-01_00:00"

  # Alert at 50% of budget
  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 50
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = var.finance_team_emails
  }

  # Alert at 80% of budget
  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = var.finance_team_emails
    subscriber_sns_topic_arns = [aws_sns_topic.cost_alerts.arn]
  }

  # Forecasted to exceed budget
  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "FORECASTED"
    subscriber_email_addresses = concat(var.finance_team_emails, var.engineering_leads)
    subscriber_sns_topic_arns = [aws_sns_topic.cost_alerts.arn]
  }
}

# Per-team budgets using cost allocation tags
resource "aws_budgets_budget" "team_budgets" {
  for_each = var.team_budgets

  name              = "${each.key}-monthly-budget"
  budget_type       = "COST"
  limit_amount      = each.value.budget
  limit_unit        = "USD"
  time_unit         = "MONTHLY"
  time_period_start = "2026-01-01_00:00"

  # Filter by team tag
  cost_filter {
    name   = "TagKeyValue"
    values = ["user:Team$${each.key}"]
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 80
    threshold_type            = "PERCENTAGE"
    notification_type         = "ACTUAL"
    subscriber_email_addresses = each.value.alert_emails
  }

  notification {
    comparison_operator       = "GREATER_THAN"
    threshold                 = 100
    threshold_type            = "PERCENTAGE"
    notification_type         = "FORECASTED"
    subscriber_email_addresses = concat(each.value.alert_emails, var.finance_team_emails)
  }
}
```

## Enforcing Tagging Standards

Consistent tagging is the foundation of cost governance. Without proper tags, you cannot allocate costs to teams, projects, or environments.

```hcl
# AWS Config rule to enforce required tags
resource "aws_config_config_rule" "required_tags" {
  name = "required-tags"

  source {
    owner             = "AWS"
    source_identifier = "REQUIRED_TAGS"
  }

  input_parameters = jsonencode({
    tag1Key   = "Environment"
    tag1Value = "development,staging,production"
    tag2Key   = "Team"
    tag3Key   = "CostCenter"
    tag4Key   = "Project"
    tag5Key   = "ManagedBy"
  })

  scope {
    compliance_resource_types = [
      "AWS::EC2::Instance",
      "AWS::RDS::DBInstance",
      "AWS::S3::Bucket",
      "AWS::Lambda::Function",
      "AWS::ElasticLoadBalancingV2::LoadBalancer",
    ]
  }
}

# Tag policy at the AWS Organization level
resource "aws_organizations_policy" "tagging" {
  name        = "required-tagging-policy"
  description = "Enforce required tags across the organization"
  type        = "TAG_POLICY"

  content = jsonencode({
    tags = {
      Environment = {
        tag_key = {
          "@@assign" = "Environment"
        }
        tag_value = {
          "@@assign" = ["development", "staging", "production"]
        }
        enforced_for = {
          "@@assign" = [
            "ec2:instance",
            "rds:db",
            "s3:bucket"
          ]
        }
      }
      CostCenter = {
        tag_key = {
          "@@assign" = "CostCenter"
        }
        enforced_for = {
          "@@assign" = [
            "ec2:instance",
            "rds:db",
            "s3:bucket"
          ]
        }
      }
    }
  })
}

# Attach the tag policy to the organization
resource "aws_organizations_policy_attachment" "tagging" {
  policy_id = aws_organizations_policy.tagging.id
  target_id = var.organization_root_id
}
```

## Service Control Policies for Cost Guardrails

Service Control Policies (SCPs) provide hard limits on what resources can be provisioned, preventing expensive mistakes.

```hcl
# SCP to prevent launching expensive instance types
resource "aws_organizations_policy" "restrict_instances" {
  name        = "restrict-expensive-instances"
  description = "Prevent launching expensive instance types in non-production accounts"
  type        = "SERVICE_CONTROL_POLICY"

  content = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyExpensiveInstances"
        Effect = "Deny"
        Action = "ec2:RunInstances"
        Resource = "arn:aws:ec2:*:*:instance/*"
        Condition = {
          StringLike = {
            "ec2:InstanceType" = [
              "*.metal",
              "*.24xlarge",
              "*.16xlarge",
              "*.12xlarge",
              "p4d.*",
              "p3.*",
              "p2.*",
            ]
          }
        }
      },
      {
        Sid    = "DenyExpensiveRDS"
        Effect = "Deny"
        Action = "rds:CreateDBInstance"
        Resource = "*"
        Condition = {
          StringLike = {
            "rds:DatabaseClass" = [
              "db.*.24xlarge",
              "db.*.16xlarge",
              "db.*.12xlarge",
            ]
          }
        }
      }
    ]
  })
}

# Attach SCP to non-production organizational unit
resource "aws_organizations_policy_attachment" "restrict_nonprod" {
  policy_id = aws_organizations_policy.restrict_instances.id
  target_id = var.nonprod_ou_id
}
```

## Cost Anomaly Detection

AWS Cost Anomaly Detection uses machine learning to identify unusual spending patterns.

```hcl
# Cost anomaly monitor for the entire account
resource "aws_ce_anomaly_monitor" "account" {
  name              = "account-anomaly-monitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"
}

# Cost anomaly monitor for specific cost allocation tags
resource "aws_ce_anomaly_monitor" "team_monitors" {
  for_each     = toset(var.team_names)
  name         = "${each.value}-anomaly-monitor"
  monitor_type = "CUSTOM"

  monitor_specification = jsonencode({
    And = null
    Or  = null
    Not = null
    Dimensions = null
    Tags = {
      Key          = "Team"
      Values       = [each.value]
      MatchOptions = ["EQUALS"]
    }
    CostCategories = null
  })
}

# Anomaly subscription with alert thresholds
resource "aws_ce_anomaly_subscription" "alerts" {
  name      = "cost-anomaly-alerts"
  frequency = "DAILY"

  monitor_arn_list = concat(
    [aws_ce_anomaly_monitor.account.arn],
    [for m in aws_ce_anomaly_monitor.team_monitors : m.arn]
  )

  subscriber {
    type    = "SNS"
    address = aws_sns_topic.cost_alerts.arn
  }

  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
      values        = ["100"]
      match_options = ["GREATER_THAN_OR_EQUAL"]
    }
  }
}
```

## Implementing Approval Workflows

For high-cost resources, you can require manual approval before Terraform applies changes.

```hcl
# Use Terraform Cloud run tasks or CI/CD pipeline checks
# to enforce cost review for expensive changes

# Output cost estimates for review
output "estimated_monthly_cost" {
  description = "Estimated monthly cost of resources in this workspace"
  value = {
    ec2_instances = sum([
      for i in aws_instance.main : lookup(var.instance_hourly_costs, i.instance_type, 0) * 730
    ])
    rds_instances = sum([
      for db in aws_db_instance.main : lookup(var.rds_hourly_costs, db.instance_class, 0) * 730
    ])
    total_estimate = "See Terraform Cloud cost estimation for full breakdown"
  }
}

# Variables defining cost thresholds for approval
variable "cost_approval_threshold" {
  description = "Monthly cost threshold requiring management approval"
  type        = number
  default     = 5000
}
```

## Best Practices for Cost Governance

Effective cost governance requires both technical controls and organizational alignment. Start by establishing clear ownership of cloud costs at the team level. Use Terraform workspaces or separate state files per team so that cost changes are visible in pull requests. Implement cost estimation tools like Infracost in your CI/CD pipeline to show the dollar impact of every Terraform change before it is applied.

Regular cost reviews should be part of your sprint process. Use the budgets and anomaly detection systems described above to surface issues early rather than waiting for the monthly bill.

For related approaches, check out our guides on [cost allocation tags across teams with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-cost-allocation-tags-across-teams-with-terraform/view) and [cost policies with Sentinel for Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-implement-cost-policies-with-sentinel-for-terraform/view).

## Conclusion

Cost governance with Terraform transforms cloud spending from an uncontrolled variable into a managed, predictable expense. By implementing budgets, enforcing tagging standards, restricting expensive resource types, and detecting anomalies, you create multiple layers of defense against cost overruns. The most important step is making cost visibility part of your development workflow so that every infrastructure change is evaluated not just for technical merit but also for its financial impact.
