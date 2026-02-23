# How to Use Terraform for FinOps Best Practices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, FinOps, Cost Optimization, Cloud Financial Management, Infrastructure as Code

Description: Learn how to implement FinOps best practices with Terraform including cost visibility, optimization, governance, and continuous improvement for cloud financial management.

---

FinOps is the practice of bringing financial accountability to cloud spending. Terraform, as the most widely used Infrastructure as Code tool, is uniquely positioned to implement FinOps practices at the infrastructure level. This guide covers how to use Terraform to build a comprehensive FinOps framework covering visibility, optimization, and governance.

## The Three Pillars of FinOps with Terraform

FinOps operates on three pillars: Inform (visibility into spending), Optimize (reducing waste), and Operate (governance and accountability). Terraform can address all three through infrastructure automation, policy enforcement, and cost-aware resource management.

## Pillar 1: Inform - Cost Visibility

### Consistent Tagging for Cost Attribution

```hcl
# Enforce tags on every resource for cost attribution
provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Environment  = var.environment
      Team         = var.team
      Project      = var.project
      CostCenter   = var.cost_center
      ManagedBy    = "terraform"
      BusinessUnit = var.business_unit
    }
  }
}
```

### Cost and Usage Reports

```hcl
# Set up automated cost data collection
resource "aws_cur_report_definition" "finops" {
  report_name                = "finops-report"
  time_unit                  = "HOURLY"
  format                     = "Parquet"
  compression                = "Parquet"
  additional_schema_elements = ["RESOURCES"]
  s3_bucket                  = aws_s3_bucket.finops.id
  s3_region                  = "us-east-1"
  s3_prefix                  = "cur"
  report_versioning          = "OVERWRITE_REPORT"
}
```

### Budget Alerts at Multiple Levels

```hcl
# Organization budget
resource "aws_budgets_budget" "org" {
  name         = "organization-budget"
  budget_type  = "COST"
  limit_amount = "100000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["finops@company.com"]
  }
}

# Per-team budgets using tags
resource "aws_budgets_budget" "teams" {
  for_each = var.team_budgets

  name         = "${each.key}-budget"
  budget_type  = "COST"
  limit_amount = tostring(each.value)
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  cost_filter {
    name   = "TagKeyValue"
    values = ["user:Team$${each.key}"]
  }

  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["${each.key}-team@company.com"]
  }
}
```

## Pillar 2: Optimize - Reduce Waste

### Right-Sizing Infrastructure

```hcl
# Use variables for easy right-sizing
variable "instance_configs" {
  description = "Right-sized instance configurations"
  type = map(object({
    type     = string
    graviton = bool
  }))

  default = {
    web = { type = "t4g.medium", graviton = true }   # Right-sized from t3.xlarge
    api = { type = "m6g.large", graviton = true }     # Migrated to Graviton
    worker = { type = "c6g.xlarge", graviton = true } # Right-sized from c5.2xlarge
  }
}

resource "aws_instance" "app" {
  for_each      = var.instance_configs
  ami           = each.value.graviton ? var.arm_ami : var.x86_ami
  instance_type = each.value.type

  tags = {
    Name       = each.key
    RightSized = "true"
  }
}
```

### Spot Instances for Non-Critical Workloads

```hcl
# Mixed on-demand and Spot for cost optimization
resource "aws_autoscaling_group" "workers" {
  name             = "workers"
  min_size         = 2
  max_size         = 20
  desired_capacity = 5

  mixed_instances_policy {
    instances_distribution {
      on_demand_base_capacity                  = 2
      on_demand_percentage_above_base_capacity = 0
      spot_allocation_strategy                 = "capacity-optimized"
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.worker.id
        version            = "$Latest"
      }

      override {
        instance_type = "c6i.xlarge"
      }
      override {
        instance_type = "c6g.xlarge"
      }
      override {
        instance_type = "m6i.xlarge"
      }
    }
  }
}
```

### Auto-Shutdown for Non-Production

```hcl
# Schedule-based shutdown for dev/staging
resource "aws_cloudwatch_event_rule" "stop_dev" {
  name                = "stop-dev-instances"
  schedule_expression = "cron(0 0 ? * MON-FRI *)"
}

resource "aws_cloudwatch_event_rule" "start_dev" {
  name                = "start-dev-instances"
  schedule_expression = "cron(0 12 ? * MON-FRI *)"
}
```

### Storage Lifecycle Policies

```hcl
# S3 lifecycle to move data to cheaper storage
resource "aws_s3_bucket_lifecycle_configuration" "data" {
  bucket = aws_s3_bucket.data.id

  rule {
    id     = "archive-old-data"
    status = "Enabled"

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    transition {
      days          = 365
      storage_class = "DEEP_ARCHIVE"
    }

    expiration {
      days = 730  # Delete after 2 years
    }
  }
}
```

## Pillar 3: Operate - Governance

### Cost Policies

```hcl
# Terraform variable validation as cost guardrails
variable "instance_type" {
  type = string
  validation {
    condition = contains([
      "t3.micro", "t3.small", "t3.medium", "t3.large",
      "t4g.micro", "t4g.small", "t4g.medium", "t4g.large",
      "m6i.large", "m6g.large"
    ], var.instance_type)
    error_message = "Instance type not in approved list. Submit a request for exceptions."
  }
}
```

### Infracost Integration

```yaml
# Cost estimation in CI/CD
# .github/workflows/finops.yml
name: FinOps Check
on:
  pull_request:
    paths: ['**/*.tf']

jobs:
  cost-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: infracost/actions/setup@v3
        with:
          api-key: ${{ secrets.INFRACOST_API_KEY }}
      - run: infracost diff --path . --format json --out-file /tmp/infracost.json
      - uses: infracost/actions/comment@v1
        with:
          path: /tmp/infracost.json
          behavior: update
```

### Anomaly Detection

```hcl
resource "aws_ce_anomaly_monitor" "services" {
  name              = "service-anomaly-monitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"
}

resource "aws_ce_anomaly_subscription" "alerts" {
  name            = "anomaly-alerts"
  monitor_arn_list = [aws_ce_anomaly_monitor.services.arn]

  subscriber {
    type    = "EMAIL"
    address = "finops@company.com"
  }

  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
      values        = ["100"]
      match_options = ["GREATER_THAN_OR_EQUAL"]
    }
  }

  frequency = "DAILY"
}
```

## FinOps Maturity Model with Terraform

### Crawl Phase
Start with basic visibility:
- Enable default tags
- Set up organization-level budgets
- Create CUR reports

### Walk Phase
Add optimization:
- Implement right-sizing
- Deploy auto-shutdown schedules
- Add Infracost to CI/CD
- Set up per-team budgets

### Run Phase
Full governance:
- Enforce cost policies with Sentinel/OPA
- Implement anomaly detection
- Create cost optimization dashboards
- Automate reserved instance/savings plan tracking

## Reusable FinOps Module

Create a Terraform module that implements all FinOps basics:

```hcl
# modules/finops/main.tf
module "finops" {
  source = "./modules/finops"

  organization_budget = 100000
  team_budgets = {
    platform    = 30000
    application = 25000
    data        = 35000
    sre         = 10000
  }

  alert_emails    = ["finops@company.com"]
  enable_cur      = true
  enable_anomaly  = true
  enable_shutdown = true
  shutdown_tag    = "AutoShutdown"
}
```

## Best Practices

Implement tagging before anything else as it is the foundation of FinOps. Use Infracost in every CI/CD pipeline. Create budgets at organization, account, and team levels. Right-size instances based on actual utilization data. Use Spot Instances and Savings Plans for predictable workloads. Automate shutdown of non-production resources. Review costs monthly with engineering and finance teams. Track FinOps metrics like cost per customer, waste percentage, and savings achieved.

## Conclusion

Terraform is a powerful enabler for FinOps practices. By codifying cost visibility, optimization, and governance into your infrastructure configurations, you ensure these practices are consistent, auditable, and automated. Start with tagging and budgets (Crawl), add optimization and Infracost (Walk), and build full governance with policies and anomaly detection (Run). The combination of Terraform and FinOps principles creates a sustainable approach to cloud financial management.

For related guides, see [How to Use Infracost with Terraform for Cost Estimation](https://oneuptime.com/blog/post/2026-02-23-how-to-use-infracost-with-terraform-for-cost-estimation/view) and [How to Use Terraform Tags for Cost Allocation](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraform-tags-for-cost-allocation/view).
