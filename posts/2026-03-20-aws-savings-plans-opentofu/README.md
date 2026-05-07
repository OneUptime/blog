# How to Manage AWS Savings Plans with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, AWS, Savings Plans, Cost Optimization, Infrastructure as Code

Description: Learn how to purchase and manage AWS Savings Plans with OpenTofu to reduce compute costs by committing to consistent usage in exchange for discounted rates.

AWS Savings Plans offer up to 72% savings compared to On-Demand pricing in exchange for a 1 or 3-year commitment to a consistent usage amount. Managing Savings Plans purchases in OpenTofu keeps financial commitments version-controlled and reviewable, but active Savings Plans can't be canceled after purchase.

## Types of Savings Plans

- **Compute Savings Plans**: Most flexible, apply to any EC2 instance, Fargate, and Lambda across regions and instance families. Up to 66% savings.
- **EC2 Instance Savings Plans**: Highest discount (up to 72%), but tied to a specific instance family and region.
- **Database Savings Plans**: Apply to eligible AWS database services. Up to 35% savings.
- **SageMaker AI Savings Plans**: Apply to SageMaker AI instance usage. Up to 64% savings.

## Purchasing a Savings Plan

```hcl
resource "aws_savingsplans_savings_plan" "compute" {
  # The offering ID determines the plan type, payment option, and term.
  # Example lookup:
  # aws savingsplans describe-savings-plans-offerings \
  #   --plan-types Compute \
  #   --payment-options "No Upfront" \
  #   --durations 31536000
  savings_plan_offering_id = "00000000-0000-0000-0000-000000000000"
  commitment               = "100.00"  # USD per hour commitment

  tags = {
    Purpose     = "EC2 and Fargate compute savings"
    Owner       = "platform-team"
    BudgetCode  = "INFRA-2024"
  }
}
```

## EC2 Instance Savings Plan

```hcl
resource "aws_savingsplans_savings_plan" "ec2" {
  # EC2 Instance plans are tied to a specific region and instance family.
  # Query a matching offering ID first, for example:
  # aws savingsplans describe-savings-plans-offerings \
  #   --plan-types EC2Instance \
  #   --payment-options "Partial Upfront" \
  #   --durations 31536000 \
  #   --filters name=region,values=us-east-1 name=instanceFamily,values=m7g
  savings_plan_offering_id = "11111111-1111-1111-1111-111111111111"
  commitment               = "50.00"  # USD per hour commitment
}
```

## Understanding Commitment Sizing

Before purchasing, generate a fresh recommendation set and analyze your current On-Demand spend:

```bash
# Request a fresh set of Savings Plans recommendations
aws ce start-savings-plans-purchase-recommendation-generation

# Then retrieve the recommendation details
aws ce get-savings-plans-purchase-recommendation \
  --savings-plans-type COMPUTE_SP \
  --term-in-years ONE_YEAR \
  --payment-option NO_UPFRONT \
  --lookback-period-in-days SIXTY_DAYS
```

```hcl
# Look up an existing Savings Plan by ID
data "aws_savingsplans_savings_plan" "existing" {
  savings_plan_id = "sp-12345678901234567"
}

output "existing_savings_plan_commitment" {
  value = data.aws_savingsplans_savings_plan.existing.commitment
}
```

## Cost Allocation Tags

Tag Savings Plans for cost allocation reporting:

```hcl
resource "aws_savingsplans_savings_plan" "tagged" {
  savings_plan_offering_id = "22222222-2222-2222-2222-222222222222"
  commitment               = "200.00"

  tags = {
    CostCenter  = "engineering"
    Team        = "platform"
    Commitment  = "1-year"
    PurchasedBy = "opentofu"
  }
}
```

## Budget Alert for Savings Plan Coverage

```hcl
resource "aws_budgets_budget" "savings_plan_coverage" {
  name         = "savings-plan-coverage"
  budget_type  = "SAVINGS_PLANS_COVERAGE"
  limit_amount = "100.0"
  limit_unit   = "PERCENTAGE"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "LESS_THAN"
    threshold                  = 80  # Alert if coverage drops below 80%
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["finops@example.com"]
  }
}

resource "aws_budgets_budget" "savings_plan_utilization" {
  name         = "savings-plan-utilization"
  budget_type  = "SAVINGS_PLANS_UTILIZATION"
  limit_amount = "100.0"
  limit_unit   = "PERCENTAGE"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "LESS_THAN"
    threshold                  = 90  # Alert if utilization drops below 90%
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["finops@example.com"]
  }
}
```

## Conclusion

AWS Savings Plans purchased via OpenTofu give you version-controlled financial commitments. Choose Compute Savings Plans for maximum flexibility across EC2, Fargate, and Lambda; choose EC2 Instance Savings Plans for maximum discount on predictable instance usage. Set budget alerts for coverage and utilization to ensure you're maximizing the value of your commitments.
