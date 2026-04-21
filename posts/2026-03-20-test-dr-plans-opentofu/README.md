# How to Test Disaster Recovery Plans with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Disaster Recovery, Testing, OpenTofu, Chaos Engineering, DR Drills

Description: Learn how to test disaster recovery plans using OpenTofu with automated DR drills, chaos injection, and validation frameworks to ensure your DR strategy actually works.

## Overview

DR plans are only effective if tested regularly. OpenTofu provides a controlled way to simulate failures, execute failover, validate the DR environment, and measure actual RTO/RPO against targets. This post covers DR testing patterns and automation.

## Step 1: Isolated DR Test Environment

```hcl
# main.tf - DR test environment using workspace isolation

variable "is_dr_test" {
  type        = bool
  default     = false
  description = "Enable DR test mode - creates isolated test infrastructure"
}

locals {
  environment = var.is_dr_test ? "dr-test" : terraform.workspace
}

# DR test uses separate VPC to avoid production impact
resource "aws_vpc" "dr_test" {
  count      = var.is_dr_test ? 1 : 0
  cidr_block = "10.100.0.0/16"

  tags = {
    Name        = "dr-test-vpc"
    Environment = "dr-test"
    AutoDelete  = "true"
    DeleteAfter = formatdate("YYYY-MM-DD", timeadd(timestamp(), "24h"))
  }
}
```

## Step 2: Chaos Injection Module

```hcl
# Simulate primary region failure by inverting the Route53 health check
variable "simulate_primary_failure" {
  type    = bool
  default = false
}

resource "aws_route53_health_check" "primary_test" {
  fqdn               = aws_lb.primary.dns_name
  port               = 443
  type               = "HTTPS"
  resource_path      = "/health"
  failure_threshold = 3
  request_interval  = 30
  invert_healthcheck = var.simulate_primary_failure
}

# When simulate_primary_failure = true, Route53 inverts the health check result
# so a normally healthy primary is treated as unhealthy and fails over to DR
```

## Step 3: DR Validation Tests

```hcl
# Built-in terraform_data resource to run validation scripts after DR failover
resource "terraform_data" "dr_validation" {
  count = var.run_dr_validation ? 1 : 0

  provisioner "local-exec" {
    interpreter = ["/bin/bash", "-c"]

    command = <<-EOT
      #!/bin/bash
      set -e

      echo "=== DR Validation Suite ==="

      # Test 1: DNS resolution points to DR
      echo "Testing DNS resolution..."
      DR_IPS=$(dig +short app.example.com | sort -u)
      DR_ALB_IPS=$(dig +short ${aws_lb.dr.dns_name} | sort -u)
      if [ -n "$DR_IPS" ] && [ -n "$DR_ALB_IPS" ] && comm -12 <(printf "%s\n" "$DR_IPS") <(printf "%s\n" "$DR_ALB_IPS") | grep -q .; then
        echo "✓ DNS resolved to DR ALB"
      else
        echo "✗ DNS still pointing to primary"
        exit 1
      fi

      # Test 2: Application health check
      echo "Testing application health..."
      HTTP_STATUS=$(curl -s -o /dev/null -w "%%{http_code}" https://app.example.com/health)
      if [ "$HTTP_STATUS" == "200" ]; then
        echo "✓ Application responding in DR (HTTP $HTTP_STATUS)"
      else
        echo "✗ Application not healthy (HTTP $HTTP_STATUS)"
        exit 1
      fi

      # Test 3: Database connectivity
      echo "Testing database connectivity..."
      DB_STATUS=$(psql -h ${aws_db_instance.dr_replica.address} \
        -U dbadmin -d appdb -c "SELECT 1" -t 2>&1)
      if echo "$DB_STATUS" | grep -q "1"; then
        echo "✓ Database accessible in DR"
      else
        echo "✗ Database not accessible"
        exit 1
      fi

      echo "=== DR Validation PASSED ==="
      echo "RTO achieved: $(date)"
    EOT
  }

  triggers_replace = {
    run_validation = var.run_dr_validation
  }
}
```

## Step 4: RTO/RPO Measurement

```hcl
# Lambda to measure actual RTO/RPO during DR tests
resource "aws_lambda_function" "dr_metrics" {
  filename      = "dr_metrics.zip"
  function_name = "dr-rto-rpo-metrics"
  role          = aws_iam_role.dr_lambda.arn
  handler       = "index.handler"
  runtime       = "python3.12"

  environment {
    variables = {
      CLOUDWATCH_NAMESPACE  = "DR/Metrics"
      FAILOVER_START_PARAM  = "/dr/failover-start-time"
      PRIMARY_ENDPOINT      = "https://app-primary.example.com"
      DR_ENDPOINT           = "https://app-dr.example.com"
    }
  }
}

# Scheduled DR test - runs quarterly
resource "aws_cloudwatch_event_rule" "quarterly_dr_test" {
  name                = "quarterly-dr-test"
  description         = "Trigger quarterly DR test"
  schedule_expression = "cron(0 2 1 1,4,7,10 ? *)"  # 1st of Jan, Apr, Jul, Oct
}

resource "aws_cloudwatch_event_target" "dr_test_sfn" {
  rule     = aws_cloudwatch_event_rule.quarterly_dr_test.name
  arn      = aws_sfn_state_machine.dr_runbook.arn
  role_arn = aws_iam_role.events.arn

  input = jsonencode({
    test_mode     = true
    duration_mins = 60
    notify_teams  = true
  })
}
```

## Summary

DR testing with OpenTofu uses workspace isolation to create throwaway test environments that mirror production without impacting live users. Chaos injection simulates failures by temporarily inverting health checks or failing controlled infrastructure components. Automated validation scripts measure actual RTO from failure detection to successful health checks in the DR environment, providing evidence that the DR plan meets its RTO/RPO objectives. Quarterly automated DR drills scheduled via EventBridge ensure the plan remains valid as infrastructure evolves.
