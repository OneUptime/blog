# How to Use Terraform with Cost Management Platforms

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Cost Management, FinOps, DevOps, Infrastructure as Code, Cloud Cost Optimization

Description: Learn how to integrate Terraform with cost management platforms like Infracost, AWS Cost Explorer, and Kubecost to estimate, track, and optimize cloud spending.

---

Cloud cost management is one of the biggest challenges facing organizations using infrastructure as code. While Terraform makes it easy to provision resources, it does not natively show you how much those resources will cost. Integrating cost management platforms into your Terraform workflow helps teams understand the financial impact of infrastructure changes before they are applied. This guide covers multiple tools and approaches for managing costs in Terraform.

## Why Integrate Cost Management with Terraform?

Without cost visibility in the Terraform workflow, teams often discover unexpected charges only when the monthly bill arrives. By integrating cost management tools, you can estimate costs before applying Terraform changes, compare cost impact of different configuration options, set budgets and alerts for infrastructure spending, identify cost optimization opportunities in existing infrastructure, and provide cost accountability through tagging and allocation.

## Prerequisites

You need Terraform version 1.0 or later, an account with your preferred cost management tool, cloud provider credentials, and a CI/CD pipeline for automated cost estimation.

## Method 1: Infracost for Pre-Deployment Cost Estimation

Infracost is the most popular tool for estimating Terraform costs before deployment.

```bash
# Install Infracost
brew install infracost

# or download directly
curl -fsSL https://raw.githubusercontent.com/infracost/infracost/master/scripts/install.sh | sh

# Authenticate with the Infracost API
infracost auth login

# Generate a cost estimate for Terraform code
infracost breakdown --path terraform/

# Compare costs between the current state and planned changes
infracost diff --path terraform/

# Output in different formats
infracost breakdown --path terraform/ --format json > costs.json
infracost breakdown --path terraform/ --format table
infracost breakdown --path terraform/ --format html > costs.html
```

Example Terraform configuration and cost output:

```hcl
# terraform/main.tf
# Infrastructure with cost implications

resource "aws_instance" "web" {
  count         = 3
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.large"    # $0.0832/hr each

  root_block_device {
    volume_size = 100            # 100 GB gp3 at $0.08/GB-month
    volume_type = "gp3"
  }

  tags = {
    Name        = "web-server-${count.index}"
    Environment = "production"
    CostCenter  = "engineering"
  }
}

resource "aws_rds_cluster" "main" {
  cluster_identifier = "main-database"
  engine             = "aurora-postgresql"
  engine_version     = "15.4"
  master_username    = "admin"
  master_password    = var.db_password
  database_name      = "application"
}

resource "aws_rds_cluster_instance" "main" {
  count              = 2
  identifier         = "main-db-${count.index}"
  cluster_identifier = aws_rds_cluster.main.id
  instance_class     = "db.r6g.large"  # $0.260/hr each
  engine             = "aurora-postgresql"
}

resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "app-cache"
  engine               = "redis"
  node_type            = "cache.r6g.large"  # $0.226/hr
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
}

resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = var.public_subnet_id
  # NAT Gateway: $0.045/hr + $0.045/GB processed
}
```

## Method 2: CI/CD Pipeline with Cost Estimation

Integrate Infracost into your CI/CD pipeline to show costs on every pull request.

```yaml
# .github/workflows/terraform-cost.yml
name: Terraform Cost Estimation

on:
  pull_request:
    paths:
      - 'terraform/**'

jobs:
  infracost:
    runs-on: ubuntu-latest
    name: Estimate Infrastructure Costs
    permissions:
      pull-requests: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      # Setup Infracost
      - name: Setup Infracost
        uses: infracost/actions/setup@v3
        with:
          api-key: ${{ secrets.INFRACOST_API_KEY }}

      # Generate Infracost baseline from main branch
      - name: Checkout Base Branch
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.pull_request.base.ref }}
          path: base

      - name: Generate Baseline Cost
        run: |
          infracost breakdown \
            --path base/terraform \
            --format json \
            --out-file /tmp/infracost-base.json

      # Generate Infracost diff for the PR
      - name: Checkout PR Branch
        uses: actions/checkout@v4
        with:
          path: pr

      - name: Generate PR Cost Diff
        run: |
          infracost diff \
            --path pr/terraform \
            --compare-to /tmp/infracost-base.json \
            --format json \
            --out-file /tmp/infracost-diff.json

      # Post cost comment on the PR
      - name: Post Infracost Comment
        run: |
          infracost comment github \
            --path /tmp/infracost-diff.json \
            --repo ${{ github.event.repository.full_name }} \
            --pull-request ${{ github.event.pull_request.number }} \
            --github-token ${{ secrets.GITHUB_TOKEN }} \
            --behavior update
```

## Method 3: Cost Policies with Infracost

Set up cost policies to enforce budget limits.

```yaml
# infracost-policy.yml
# Infracost cost policy configuration

version: 0.1

policies:
  # Warn if monthly cost increase exceeds $500
  - name: warn-on-large-cost-increase
    description: Warn when a PR increases monthly costs by more than $500
    resource_type: total_monthly_cost
    condition:
      operator: percentage_increase
      threshold: 25  # 25% increase
    action: warn

  # Block if monthly cost exceeds $10,000
  - name: block-excessive-costs
    description: Block PRs that would push monthly costs above $10,000
    resource_type: total_monthly_cost
    condition:
      operator: greater_than
      threshold: 10000
    action: deny

  # Warn on specific expensive resources
  - name: warn-expensive-instances
    description: Warn when creating instances larger than m5.xlarge
    resource_type: aws_instance
    condition:
      attribute: instance_type
      not_in:
        - t3.micro
        - t3.small
        - t3.medium
        - t3.large
        - m5.large
        - m5.xlarge
    action: warn
```

```hcl
# infracost-usage.yml referenced by infracost
# Estimate usage-based costs by providing expected usage values

version: 0.1

resource_usage:
  # Estimate S3 usage
  aws_s3_bucket.data:
    standard:
      storage_gb: 1000
      monthly_tier_1_requests: 1000000
      monthly_tier_2_requests: 5000000
    glacier:
      storage_gb: 5000

  # Estimate data transfer
  aws_nat_gateway.main:
    monthly_data_processed_gb: 500

  # Estimate Lambda invocations
  aws_lambda_function.api:
    monthly_requests: 10000000
    request_duration_ms: 200
```

## Method 4: Terraform Cost Tags and Allocation

Implement a tagging strategy for cost allocation.

```hcl
# cost-tags.tf
# Implement cost allocation tags across all resources

# Define standard cost tags
locals {
  cost_tags = {
    CostCenter  = var.cost_center
    Project     = var.project_name
    Environment = var.environment
    Owner       = var.team_owner
    ManagedBy   = "terraform"
    CreatedDate = formatdate("YYYY-MM-DD", timestamp())
  }
}

# Apply tags to all resources using default_tags
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.cost_tags
  }
}

# Create AWS Cost Allocation Tags
resource "aws_ce_cost_allocation_tag" "cost_center" {
  tag_key = "CostCenter"
  status  = "Active"
}

resource "aws_ce_cost_allocation_tag" "project" {
  tag_key = "Project"
  status  = "Active"
}

resource "aws_ce_cost_allocation_tag" "environment" {
  tag_key = "Environment"
  status  = "Active"
}
```

## Method 5: AWS Cost Management with Terraform

Use Terraform to set up AWS cost management resources.

```hcl
# aws-cost-management.tf
# Set up AWS Budgets and Cost Anomaly Detection with Terraform

# Create a monthly budget with alerts
resource "aws_budgets_budget" "monthly" {
  name         = "monthly-infrastructure-budget"
  budget_type  = "COST"
  limit_amount = "5000"
  limit_unit   = "USD"
  time_unit    = "MONTHLY"

  # Filter by cost allocation tags
  cost_filter {
    name   = "TagKeyValue"
    values = ["user:Environment$production"]
  }

  # Alert at 80% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.finance_team_emails
  }

  # Alert at 100% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 100
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = var.finance_team_emails
  }

  # Forecasted alert at 110% of budget
  notification {
    comparison_operator        = "GREATER_THAN"
    threshold                  = 110
    threshold_type             = "PERCENTAGE"
    notification_type          = "FORECASTED"
    subscriber_email_addresses = concat(var.finance_team_emails, var.engineering_leads)
  }
}

# Set up cost anomaly detection
resource "aws_ce_anomaly_monitor" "service" {
  name              = "service-cost-anomaly-monitor"
  monitor_type      = "DIMENSIONAL"
  monitor_dimension = "SERVICE"
}

resource "aws_ce_anomaly_subscription" "alert" {
  name      = "cost-anomaly-alert"
  frequency = "IMMEDIATE"

  monitor_arn_list = [
    aws_ce_anomaly_monitor.service.arn,
  ]

  subscriber {
    type    = "EMAIL"
    address = var.finops_email
  }

  threshold_expression {
    dimension {
      key           = "ANOMALY_TOTAL_IMPACT_ABSOLUTE"
      match_options = ["GREATER_THAN_OR_EQUAL"]
      values        = ["100"]
    }
  }
}
```

## Method 6: Kubecost for Kubernetes Cost Management

If your Terraform manages Kubernetes clusters, Kubecost provides granular cost visibility.

```hcl
# kubecost.tf
# Install Kubecost for Kubernetes cost monitoring
resource "helm_release" "kubecost" {
  name       = "kubecost"
  repository = "https://kubecost.github.io/cost-analyzer/"
  chart      = "cost-analyzer"
  namespace  = "kubecost"
  version    = "1.100.0"

  create_namespace = true

  # Configure Kubecost
  set {
    name  = "kubecostToken"
    value = var.kubecost_token
  }

  set {
    name  = "prometheus.server.retention"
    value = "15d"
  }

  # Enable cloud cost integration
  set {
    name  = "kubecostProductConfigs.cloudCost.enabled"
    value = "true"
  }

  set {
    name  = "kubecostProductConfigs.cloudCost.provider"
    value = "AWS"
  }

  depends_on = [module.eks]
}
```

## Method 7: Cost Optimization Recommendations

Use Terraform to implement common cost optimizations.

```hcl
# cost-optimization.tf
# Implement cost optimization patterns

# Use Spot Instances for non-critical workloads
resource "aws_autoscaling_group" "spot_workers" {
  name                = "spot-workers"
  desired_capacity    = 5
  max_size            = 20
  min_size            = 2
  vpc_zone_identifier = var.private_subnet_ids

  mixed_instances_policy {
    instances_distribution {
      # Use 80% Spot, 20% On-Demand
      on_demand_base_capacity                  = 1
      on_demand_percentage_above_base_capacity = 20
      spot_allocation_strategy                 = "capacity-optimized"
    }

    launch_template {
      launch_template_specification {
        launch_template_id = aws_launch_template.worker.id
        version            = "$Latest"
      }

      # Multiple instance types for better Spot availability
      override {
        instance_type = "t3.large"
      }
      override {
        instance_type = "t3a.large"
      }
      override {
        instance_type = "m5.large"
      }
      override {
        instance_type = "m5a.large"
      }
    }
  }
}

# Schedule non-production resources to shut down after hours
resource "aws_autoscaling_schedule" "scale_down_night" {
  scheduled_action_name  = "scale-down-night"
  min_size               = 0
  max_size               = 0
  desired_capacity       = 0
  recurrence             = "0 20 * * MON-FRI"  # 8 PM weekdays
  autoscaling_group_name = aws_autoscaling_group.dev_servers.name
}

resource "aws_autoscaling_schedule" "scale_up_morning" {
  scheduled_action_name  = "scale-up-morning"
  min_size               = 2
  max_size               = 5
  desired_capacity       = 2
  recurrence             = "0 8 * * MON-FRI"  # 8 AM weekdays
  autoscaling_group_name = aws_autoscaling_group.dev_servers.name
}

# Use S3 Intelligent-Tiering for storage cost optimization
resource "aws_s3_bucket_intelligent_tiering_configuration" "data" {
  bucket = aws_s3_bucket.data.id
  name   = "auto-tier"

  tiering {
    access_tier = "DEEP_ARCHIVE_ACCESS"
    days        = 180
  }

  tiering {
    access_tier = "ARCHIVE_ACCESS"
    days        = 90
  }
}

# Reserved Instance recommendation tracking
resource "aws_budgets_budget" "ri_coverage" {
  name         = "ri-coverage-tracking"
  budget_type  = "RI_COVERAGE"
  limit_amount = "80"
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
    subscriber_email_addresses = var.finops_team_emails
  }
}
```

## Best Practices

Run Infracost on every pull request to give developers immediate cost feedback. Use cost policies to set guardrails that prevent accidental expensive deployments. Implement comprehensive tagging for cost allocation across teams and projects. Set up AWS Budgets with multiple alert thresholds for proactive cost management. Use Spot Instances and scheduling to reduce costs for non-critical and non-production workloads. Review cost reports regularly and feed findings back into Terraform configurations. Track cost trends over time to identify optimization opportunities and anomalies.

## Conclusion

Integrating cost management with Terraform is essential for maintaining control over cloud spending. By combining tools like Infracost for pre-deployment estimates, AWS Budgets for ongoing monitoring, and Kubecost for Kubernetes-specific cost visibility, you create a comprehensive FinOps practice. The key is to make cost information visible at every stage of the infrastructure lifecycle, from initial planning through ongoing operations, so teams can make informed decisions about their infrastructure spending.
