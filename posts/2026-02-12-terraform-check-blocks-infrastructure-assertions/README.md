# How to Use Terraform Check Blocks for Infrastructure Assertions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Terraform, Infrastructure as Code, Testing

Description: Learn how to use Terraform check blocks and custom conditions to validate infrastructure state, enforce policies, and catch configuration errors before they reach production.

---

Terraform's `check` blocks let you define assertions about your infrastructure that are evaluated during plan and apply. Unlike preconditions and postconditions (which fail the entire run), check blocks produce warnings. They tell you something is wrong without blocking the deployment.

This makes them perfect for continuous validation - checking that your infrastructure is healthy, compliant, and configured correctly, even when the issues aren't caused by Terraform itself.

## What Check Blocks Are

Introduced in Terraform 1.5, check blocks are top-level blocks that contain assertions about your infrastructure. They can reference data sources to check real-world state, not just Terraform configuration.

Here's the basic structure:

```hcl
check "descriptive_name" {
  # Optional: data source scoped to this check
  data "aws_s3_bucket" "example" {
    bucket = "my-important-bucket"
  }

  assert {
    condition     = data.aws_s3_bucket.example.versioning[0].enabled
    error_message = "S3 bucket versioning is not enabled!"
  }
}
```

If the assertion fails, Terraform shows a warning but continues with the plan/apply. This is different from `precondition` and `postcondition` blocks, which halt execution on failure.

## Checking S3 Bucket Configuration

Let's start with practical examples. This check verifies that critical S3 buckets have the right security settings:

```hcl
# Verify production buckets have versioning enabled
check "s3_versioning" {
  data "aws_s3_bucket" "production_data" {
    bucket = aws_s3_bucket.production_data.id
  }

  assert {
    condition     = data.aws_s3_bucket.production_data.versioning[0].enabled
    error_message = "Production data bucket does not have versioning enabled. This is a compliance requirement."
  }
}

# Verify buckets are encrypted
check "s3_encryption" {
  data "aws_s3_bucket_server_side_encryption_configuration" "production" {
    bucket = aws_s3_bucket.production_data.id
  }

  assert {
    condition     = length(data.aws_s3_bucket_server_side_encryption_configuration.production.rule) > 0
    error_message = "Production data bucket does not have server-side encryption configured."
  }
}
```

## Checking DNS Resolution

Verify that your services are reachable by checking DNS:

```hcl
# Verify that our API domain resolves correctly
check "api_dns" {
  data "dns_a_record_set" "api" {
    host = "api.example.com"
  }

  assert {
    condition     = length(data.dns_a_record_set.api.addrs) > 0
    error_message = "api.example.com does not resolve to any IP addresses."
  }
}
```

This catches issues like accidentally deleted DNS records or misconfigured Route 53 entries.

## Checking Certificate Expiry

Make sure your SSL certificates aren't about to expire:

```hcl
# Check that certificates aren't expiring soon
check "cert_expiry" {
  data "aws_acm_certificate" "main" {
    domain      = "example.com"
    statuses    = ["ISSUED"]
    most_recent = true
  }

  assert {
    condition     = data.aws_acm_certificate.main.status == "ISSUED"
    error_message = "The ACM certificate for example.com is not in ISSUED status. Current status: ${data.aws_acm_certificate.main.status}"
  }
}
```

For more on managing certificates, see our post on [managing ACM certificates with Terraform](https://oneuptime.com/blog/post/2026-02-12-manage-aws-acm-certificates-with-terraform/view).

## Checking RDS Instance Health

Verify your database is running and properly configured:

```hcl
# Verify RDS instance is available
check "rds_status" {
  data "aws_db_instance" "production" {
    db_instance_identifier = aws_db_instance.production.identifier
  }

  assert {
    condition     = data.aws_db_instance.production.db_instance_status == "available"
    error_message = "Production database is not in 'available' status. Current status: ${data.aws_db_instance.production.db_instance_status}"
  }

  assert {
    condition     = data.aws_db_instance.production.multi_az == true
    error_message = "Production database does not have Multi-AZ enabled. This is required for high availability."
  }

  assert {
    condition     = data.aws_db_instance.production.storage_encrypted == true
    error_message = "Production database storage is not encrypted."
  }
}
```

## Policy Enforcement

Check blocks are excellent for enforcing organizational policies:

```hcl
# Enforce tagging policy
check "required_tags" {
  assert {
    condition = alltrue([
      contains(keys(aws_instance.app.tags), "Environment"),
      contains(keys(aws_instance.app.tags), "Team"),
      contains(keys(aws_instance.app.tags), "ManagedBy"),
    ])
    error_message = "EC2 instance is missing required tags. All instances must have Environment, Team, and ManagedBy tags."
  }
}

# Enforce encryption policy
check "encryption_policy" {
  assert {
    condition     = aws_db_instance.production.storage_encrypted == true
    error_message = "All production databases must have storage encryption enabled."
  }
}

# Enforce instance type restrictions
check "instance_type_policy" {
  assert {
    condition     = !startswith(aws_instance.app.instance_type, "t2.")
    error_message = "T2 instances are deprecated. Use T3 or newer instance types."
  }
}
```

## Checking Security Group Rules

Verify that security groups aren't too permissive:

```hcl
# Check that database security groups don't allow public access
check "db_sg_no_public" {
  data "aws_security_group" "db" {
    id = aws_security_group.database.id
  }

  assert {
    condition = !anytrue([
      for rule in data.aws_security_group.db.ingress :
      contains(rule.cidr_blocks, "0.0.0.0/0")
    ])
    error_message = "Database security group allows ingress from 0.0.0.0/0. This is a security risk."
  }
}
```

## Multiple Assertions in One Check

A single check block can contain multiple assertions. All of them are evaluated, and each failure produces its own warning:

```hcl
# Comprehensive production readiness check
check "production_readiness" {
  assert {
    condition     = aws_db_instance.production.multi_az == true
    error_message = "Database: Multi-AZ is not enabled."
  }

  assert {
    condition     = aws_db_instance.production.backup_retention_period >= 7
    error_message = "Database: Backup retention is less than 7 days."
  }

  assert {
    condition     = aws_db_instance.production.deletion_protection == true
    error_message = "Database: Deletion protection is not enabled."
  }

  assert {
    condition     = aws_db_instance.production.storage_encrypted == true
    error_message = "Database: Storage encryption is not enabled."
  }

  assert {
    condition     = aws_db_instance.production.performance_insights_enabled == true
    error_message = "Database: Performance Insights is not enabled."
  }
}
```

## Check Blocks vs Preconditions vs Postconditions

Each validation mechanism serves a different purpose:

**Check blocks** - top-level, produce warnings, evaluate every run. Good for continuous validation and policy enforcement.

**Preconditions** - inside resource lifecycle blocks, halt execution on failure. Good for validating inputs before creating a resource.

**Postconditions** - inside resource lifecycle blocks, halt execution on failure. Good for validating the result after a resource is created.

Here's how they compare in practice:

```hcl
# Check block - warns but doesn't block
check "instance_health" {
  assert {
    condition     = data.aws_instance.app.instance_state == "running"
    error_message = "Instance is not running."
  }
}

# Precondition - blocks the run if invalid
resource "aws_db_instance" "production" {
  instance_class = var.instance_class

  lifecycle {
    precondition {
      condition     = contains(["db.r6g.large", "db.r6g.xlarge"], var.instance_class)
      error_message = "Only r6g.large and r6g.xlarge are approved for production."
    }
  }
}

# Postcondition - blocks if result is unexpected
resource "aws_lb" "main" {
  name = "app-lb"

  lifecycle {
    postcondition {
      condition     = length(self.subnets) >= 2
      error_message = "Load balancer must be in at least 2 subnets."
    }
  }
}
```

For details on lifecycle rules including preconditions and postconditions, see our post on [Terraform lifecycle rules](https://oneuptime.com/blog/post/terraform-lifecycle-rules/view).

## Using Check Blocks with HTTP Data Source

Verify that your services respond correctly:

```hcl
# Check that the health endpoint returns 200
check "api_health" {
  data "http" "health" {
    url = "https://api.example.com/health"
  }

  assert {
    condition     = data.http.health.status_code == 200
    error_message = "API health check failed. Status code: ${data.http.health.status_code}"
  }
}
```

## Organizing Checks

For large configurations, put all your checks in a dedicated file:

```hcl
# checks.tf - All infrastructure validation checks

check "security_compliance" {
  # ... security-related assertions
}

check "cost_optimization" {
  # ... cost-related assertions
}

check "availability" {
  # ... availability-related assertions
}

check "monitoring" {
  # ... monitoring-related assertions
}
```

This keeps your validation logic separate from your resource definitions and makes it easy to review.

## Wrapping Up

Check blocks fill a gap that Terraform had for a long time - the ability to continuously validate infrastructure state without blocking deployments. Use them for policy enforcement, compliance checks, health monitoring, and catching configuration drift. They're especially valuable in CI/CD pipelines where you want visibility into infrastructure health without breaking the deployment pipeline. Start with a few checks for your most critical resources and expand from there.
