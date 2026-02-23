# How to Use Savings Plans with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, AWS, Savings Plans, Cost Optimization, FinOps

Description: Learn how to leverage AWS Savings Plans alongside Terraform to reduce compute costs with flexible commitment-based pricing across instance families and regions.

---

AWS Savings Plans offer flexible pricing similar to Reserved Instances but with broader applicability. They apply automatically to eligible usage across instance families, sizes, and regions. This guide covers how to plan Savings Plans purchases based on your Terraform-managed infrastructure and track their utilization.

## Savings Plans vs Reserved Instances

Savings Plans come in three types. Compute Savings Plans apply to any EC2 instance, Lambda function, or Fargate task regardless of family, size, or region, offering up to 66% savings. EC2 Instance Savings Plans apply to specific instance families in specific regions, offering up to 72% savings. SageMaker Savings Plans apply to SageMaker usage.

The main advantage over Reserved Instances is flexibility. If you change instance types or regions, Compute Savings Plans still apply.

## Planning Savings Plans from Terraform Data

Analyze your Terraform-managed compute to determine the right commitment:

```bash
#!/bin/bash
# analyze-compute-for-savings-plans.sh
# Estimate hourly compute spend from Terraform state

# Get all EC2 instances from state
terraform state list | grep "aws_instance" | while read -r resource; do
  DETAILS=$(terraform state show "$resource" 2>/dev/null)
  INSTANCE_TYPE=$(echo "$DETAILS" | grep "instance_type" | awk '{print $3}' | tr -d '"')
  echo "$INSTANCE_TYPE"
done | sort | uniq -c | sort -rn

echo ""
echo "Use AWS Cost Explorer Savings Plans recommendations"
echo "to determine the optimal hourly commitment based on this usage."
```

## Tracking Savings Plans Coverage

Monitor whether your Terraform-managed resources are covered:

```hcl
# Budget for Savings Plans utilization
resource "aws_budgets_budget" "sp_utilization" {
  name         = "savings-plans-utilization"
  budget_type  = "SAVINGS_PLANS_UTILIZATION"
  limit_amount = "80"
  limit_unit   = "PERCENTAGE"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "LESS_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["finops@company.com"]
  }
}

# Budget for Savings Plans coverage
resource "aws_budgets_budget" "sp_coverage" {
  name         = "savings-plans-coverage"
  budget_type  = "SAVINGS_PLANS_COVERAGE"
  limit_amount = "80"
  limit_unit   = "PERCENTAGE"
  time_unit    = "MONTHLY"

  notification {
    comparison_operator        = "LESS_THAN"
    threshold                  = 80
    threshold_type             = "PERCENTAGE"
    notification_type          = "ACTUAL"
    subscriber_email_addresses = ["finops@company.com"]
  }
}
```

## Designing Terraform for Savings Plans Flexibility

Since Compute Savings Plans apply across instance families, design your Terraform for maximum flexibility:

```hcl
# Use variables that allow easy instance family changes
variable "compute_configs" {
  type = map(object({
    instance_family = string
    size            = string
    count           = number
  }))

  default = {
    web = {
      instance_family = "m6i"
      size            = "large"
      count           = 5
    }
    api = {
      instance_family = "c6i"
      size            = "xlarge"
      count           = 3
    }
  }
}

resource "aws_instance" "compute" {
  for_each = var.compute_configs

  ami           = var.ami_id
  instance_type = "${each.value.instance_family}.${each.value.size}"
  count         = each.value.count

  tags = {
    Name            = "${each.key}-server"
    SavingsPlanType = "compute"
  }
}
```

## Lambda and Fargate Coverage

Compute Savings Plans also cover Lambda and Fargate:

```hcl
# Lambda functions covered by Compute Savings Plans
resource "aws_lambda_function" "api" {
  function_name = "api-handler"
  handler       = "index.handler"
  runtime       = "nodejs18.x"
  memory_size   = 256
  timeout       = 30
  role          = aws_iam_role.lambda.arn

  filename         = "lambda.zip"
  source_code_hash = filebase64sha256("lambda.zip")

  tags = {
    SavingsPlanCovered = "compute"
  }
}

# Fargate tasks covered by Compute Savings Plans
resource "aws_ecs_service" "web" {
  name            = "web-service"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.web.arn
  desired_count   = 3
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = [aws_security_group.web.id]
  }

  tags = {
    SavingsPlanCovered = "compute"
  }
}
```

## Monitoring and Alerting

Set up comprehensive monitoring for Savings Plans:

```hcl
# SNS topic for Savings Plans alerts
resource "aws_sns_topic" "savings_plans" {
  name = "savings-plans-alerts"
}

# CloudWatch dashboard for Savings Plans tracking
resource "aws_cloudwatch_dashboard" "savings_plans" {
  dashboard_name = "SavingsPlans"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "EC2 Running Hours by Instance Type"
          metrics = [
            ["AWS/EC2", "CPUUtilization", "InstanceType", "t3.large", { stat = "SampleCount" }],
            ["AWS/EC2", "CPUUtilization", "InstanceType", "m5.xlarge", { stat = "SampleCount" }],
          ]
          period = 86400
          region = var.region
        }
      }
    ]
  })
}
```

## Best Practices

Start with Compute Savings Plans for maximum flexibility. Analyze at least 30 days of usage before committing. Use 1-year terms initially then switch to 3-year for proven steady workloads. Monitor utilization monthly and adjust as needed. Tag all compute resources to track Savings Plans coverage. Consider a mix of Savings Plans types for optimal savings. Review Savings Plans before making major Terraform infrastructure changes.

## Conclusion

AWS Savings Plans provide flexible cost savings for Terraform-managed compute workloads. Their broad applicability across instance families, Lambda, and Fargate makes them easier to manage than Reserved Instances. By tracking coverage and utilization through Terraform-managed monitoring, you can ensure maximum savings while maintaining infrastructure flexibility.

For related guides, see [How to Use Reserved Instances with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-reserved-instances-with-terraform/view) and [How to Use Spot Instances for Cost Savings with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-spot-instances-for-cost-savings-with-terraform/view).
