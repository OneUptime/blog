# How to Use Workspaces for A/B Infrastructure Testing

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspace, A/B Testing, Infrastructure as Code, DevOps, Performance

Description: Learn how to leverage Terraform workspaces to run A/B tests on infrastructure configurations and compare performance between setups.

---

A/B testing is not just for web pages and user interfaces. You can apply the same principle to infrastructure. Want to know if a different instance type performs better? Whether a new database configuration handles your workload more efficiently? Whether switching from a NAT gateway to a NAT instance saves money without impacting performance? Terraform workspaces let you run these experiments side by side.

## The Concept

Infrastructure A/B testing means deploying two variations of your setup simultaneously and comparing their behavior under similar conditions. Each variation runs in its own Terraform workspace with its own state, and you measure performance, cost, reliability, or whatever metric matters to your decision.

```bash
# Create two workspaces for the A/B test
terraform workspace new ab-test-variant-a
terraform workspace new ab-test-variant-b

# Deploy variant A with current configuration
terraform workspace select ab-test-variant-a
terraform apply -var-file="variants/variant-a.tfvars"

# Deploy variant B with the change you want to test
terraform workspace select ab-test-variant-b
terraform apply -var-file="variants/variant-b.tfvars"
```

## Setting Up the Test Configuration

The key is structuring your Terraform code so the variable differences between variants are clean and isolated.

```hcl
# variables.tf
variable "variant_name" {
  description = "Name of this A/B test variant"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type to test"
  type        = string
}

variable "instance_count" {
  description = "Number of instances"
  type        = number
  default     = 2
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
}

variable "enable_enhanced_networking" {
  description = "Enable enhanced networking on instances"
  type        = bool
  default     = false
}

variable "ebs_volume_type" {
  description = "EBS volume type (gp3, io1, io2)"
  type        = string
  default     = "gp3"
}

variable "ebs_iops" {
  description = "Provisioned IOPS for EBS volumes"
  type        = number
  default     = 3000
}
```

Create variant files with the specific differences:

```hcl
# variants/variant-a.tfvars
# Variant A: Current production configuration
variant_name               = "variant-a"
instance_type              = "m5.xlarge"
instance_count             = 2
db_instance_class          = "db.r5.large"
enable_enhanced_networking = false
ebs_volume_type            = "gp3"
ebs_iops                   = 3000
```

```hcl
# variants/variant-b.tfvars
# Variant B: Testing newer generation instances with enhanced networking
variant_name               = "variant-b"
instance_type              = "m6i.xlarge"
instance_count             = 2
db_instance_class          = "db.r6g.large"
enable_enhanced_networking = true
ebs_volume_type            = "gp3"
ebs_iops                   = 6000
```

## Infrastructure Configuration

```hcl
# main.tf
locals {
  name_prefix = "ab-test-${var.variant_name}"

  common_tags = {
    Project    = "ab-infrastructure-test"
    Variant    = var.variant_name
    Workspace  = terraform.workspace
    TestDate   = "2026-02-23"
    ManagedBy  = "terraform"
  }
}

# VPC - identical for both variants
resource "aws_vpc" "test" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-vpc"
  })
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.test.id
  cidr_block        = cidrsubnet("10.0.0.0/16", 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-private-${count.index + 1}"
  })
}

# Application instances - this is where the variants differ
resource "aws_instance" "app" {
  count         = var.instance_count
  ami           = data.aws_ami.app.id
  instance_type = var.instance_type
  subnet_id     = aws_subnet.private[count.index % length(aws_subnet.private)].id

  # Enhanced networking if enabled for this variant
  ebs_optimized = var.enable_enhanced_networking

  root_block_device {
    volume_type = var.ebs_volume_type
    volume_size = 50
    iops        = var.ebs_iops
    encrypted   = true
  }

  # Install monitoring agent via user data
  user_data = templatefile("${path.module}/scripts/setup-monitoring.sh.tpl", {
    variant_name = var.variant_name
    cloudwatch_namespace = "ABTest/${var.variant_name}"
  })

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-app-${count.index + 1}"
  })
}

# Database - testing different instance classes
resource "aws_db_instance" "test" {
  identifier     = "${local.name_prefix}-db"
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = var.db_instance_class

  allocated_storage = 100
  storage_type      = var.ebs_volume_type
  iops              = var.ebs_volume_type == "io1" ? var.ebs_iops : null

  db_subnet_group_name   = aws_db_subnet_group.test.name
  vpc_security_group_ids = [aws_security_group.db.id]

  skip_final_snapshot = true

  # Enable Performance Insights for comparison
  performance_insights_enabled = true

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-db"
  })
}
```

## Setting Up Monitoring for Comparison

To compare variants, you need consistent monitoring across both:

```hcl
# monitoring.tf

# CloudWatch dashboard that shows both variants side by side
resource "aws_cloudwatch_dashboard" "ab_test" {
  dashboard_name = "${local.name_prefix}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          title   = "CPU Utilization - ${var.variant_name}"
          metrics = [
            for i, inst in aws_instance.app : [
              "AWS/EC2", "CPUUtilization",
              "InstanceId", inst.id,
              { label = "Instance ${i + 1}" }
            ]
          ]
          period = 60
          stat   = "Average"
          region = data.aws_region.current.name
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          title   = "Network I/O - ${var.variant_name}"
          metrics = [
            for i, inst in aws_instance.app : [
              ["AWS/EC2", "NetworkIn", "InstanceId", inst.id, { label = "In ${i + 1}" }],
              ["AWS/EC2", "NetworkOut", "InstanceId", inst.id, { label = "Out ${i + 1}" }]
            ]
          ]
          period = 60
          stat   = "Average"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6
        properties = {
          title   = "RDS Performance - ${var.variant_name}"
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", aws_db_instance.test.identifier],
            ["AWS/RDS", "ReadLatency", "DBInstanceIdentifier", aws_db_instance.test.identifier],
            ["AWS/RDS", "WriteLatency", "DBInstanceIdentifier", aws_db_instance.test.identifier]
          ]
          period = 60
          stat   = "Average"
        }
      }
    ]
  })
}

# Custom CloudWatch metrics for application-level comparison
resource "aws_cloudwatch_metric_alarm" "high_latency" {
  alarm_name          = "${local.name_prefix}-high-latency"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ResponseLatency"
  namespace           = "ABTest/${var.variant_name}"
  period              = 60
  statistic           = "p99"
  threshold           = 500
  alarm_description   = "P99 latency exceeded 500ms for ${var.variant_name}"

  tags = local.common_tags
}
```

## Running the Load Test

Use a consistent load testing setup that sends equal traffic to both variants:

```bash
#!/bin/bash
# run-ab-load-test.sh
# Runs identical load tests against both variants

# Get endpoints from both workspaces
terraform workspace select ab-test-variant-a
ENDPOINT_A=$(terraform output -raw app_endpoint)

terraform workspace select ab-test-variant-b
ENDPOINT_B=$(terraform output -raw app_endpoint)

echo "Variant A endpoint: $ENDPOINT_A"
echo "Variant B endpoint: $ENDPOINT_B"

# Run load tests in parallel
echo "Starting load tests..."

# Test Variant A
k6 run \
  -e TARGET_URL="$ENDPOINT_A" \
  -e VARIANT="variant-a" \
  --out json=results-variant-a.json \
  load-test.js &
PID_A=$!

# Test Variant B
k6 run \
  -e TARGET_URL="$ENDPOINT_B" \
  -e VARIANT="variant-b" \
  --out json=results-variant-b.json \
  load-test.js &
PID_B=$!

# Wait for both to complete
wait $PID_A $PID_B

echo "Load tests complete."
echo "Results saved to results-variant-a.json and results-variant-b.json"
```

## Analyzing Results and Making Decisions

After the test, compare the results:

```bash
#!/bin/bash
# compare-results.sh
# Compares A/B test results

echo "A/B Infrastructure Test Results"
echo "================================"
echo ""

# Compare cost estimates
for variant in a b; do
  ws="ab-test-variant-${variant}"
  terraform workspace select "$ws" > /dev/null 2>&1

  echo "Variant ${variant^^}:"
  echo "  Instance Type: $(terraform output -raw instance_type 2>/dev/null)"
  echo "  DB Class: $(terraform output -raw db_instance_class 2>/dev/null)"

  # Pull metrics from CloudWatch for the test period
  # (simplified - you would use aws cloudwatch get-metric-statistics)
  echo "  (See CloudWatch dashboard for detailed metrics)"
  echo ""
done
```

## Cleaning Up After the Test

Once you have your results, clean up both variants:

```bash
#!/bin/bash
# cleanup-ab-test.sh

set -e

for variant in a b; do
  ws="ab-test-variant-${variant}"
  echo "Cleaning up $ws..."

  terraform workspace select "$ws"
  terraform destroy -var-file="variants/variant-${variant}.tfvars" -auto-approve

  terraform workspace select default
  terraform workspace delete "$ws"

  echo "$ws removed."
done

echo "A/B test cleanup complete."
```

## Practical Tips for Infrastructure A/B Testing

Run both variants for the same duration under the same conditions. Differences in time of day, traffic patterns, or external factors can skew results.

Keep your variants as similar as possible - change only one variable at a time. If you change the instance type and the database class simultaneously, you will not know which change caused the performance difference.

Use the same AMI, the same application version, and the same dataset for both variants. The only differences should be the infrastructure parameters you are testing.

Tag everything consistently. When the test is over, you need to be able to find and delete all resources cleanly.

## Summary

A/B infrastructure testing with Terraform workspaces gives you a structured way to make data-driven infrastructure decisions. Instead of guessing whether a different instance type or database configuration will perform better, you can deploy both, measure the difference, and choose with confidence. The workspace model makes this clean because each variant is fully isolated with its own state. For more on workspace patterns, see our guide on [workspace state isolation](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-workspace-state-isolation-in-terraform/view).
