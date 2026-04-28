# How to Use Check Blocks for Infrastructure Validation in OpenTofu - Opentofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Infrastructure as Code, Validation

Description: Learn how to use check blocks in OpenTofu to validate infrastructure state after deployment and assert expected conditions without blocking the apply.

## Introduction

Check blocks are OpenTofu's continuous validation mechanism. Unlike preconditions and postconditions (which block apply on failure), check blocks emit warnings without stopping the deployment. They are designed to validate the overall state of your infrastructure after resources are created - asserting things like API reachability, DNS resolution, or compliance with naming conventions.

## Basic Check Block

```hcl
check "s3_bucket_public_access" {
  assert {
    condition     = aws_s3_bucket_acl.data.acl == "private"
    error_message = "S3 bucket must not be public."
  }
}
```

## Check Block with a Data Source

```hcl
# Check blocks can query data sources for validation

check "api_healthy" {
  data "http" "health" {
    url = "https://api.acme-corp.com/health"
  }

  assert {
    condition     = data.http.health.status_code == 200
    error_message = "API health endpoint returned ${data.http.health.status_code}, expected 200."
  }
}
```

## Multiple Assertions per Check Block

```hcl
check "bucket_configuration" {
  assert {
    condition     = aws_s3_bucket.data.bucket_prefix == null
    error_message = "Use 'bucket' attribute, not 'bucket_prefix'."
  }

  assert {
    condition     = can(regex("^acme-", aws_s3_bucket.data.bucket))
    error_message = "Bucket name must start with 'acme-'. Got: ${aws_s3_bucket.data.bucket}"
  }
}
```

## Check vs Postcondition Behavior

```hcl
# Postcondition: BLOCKS apply if it fails
resource "aws_s3_bucket" "data" {
  bucket = var.bucket_name

  lifecycle {
    postcondition {
      condition     = can(regex("^acme-", self.bucket))
      error_message = "Bucket must start with 'acme-'."
    }
  }
}

# Check: WARNS but does not block apply if it fails
check "bucket_naming" {
  assert {
    condition     = can(regex("^acme-", aws_s3_bucket.data.bucket))
    error_message = "Bucket must start with 'acme-'."
  }
}
```

## Checking DNS Resolution

```hcl
check "dns_resolves" {
  data "dns_a_record_set" "app" {
    host = "app.acme-corp.com"
  }

  assert {
    condition     = length(data.dns_a_record_set.app.addrs) > 0
    error_message = "DNS record for app.acme-corp.com did not resolve."
  }
}
```

## Compliance Checks

```hcl
check "resource_tagging_compliance" {
  assert {
    condition     = contains(keys(aws_instance.web.tags), "Environment")
    error_message = "EC2 instance must have an 'Environment' tag."
  }

  assert {
    condition     = contains(keys(aws_instance.web.tags), "Owner")
    error_message = "EC2 instance must have an 'Owner' tag."
  }

  assert {
    condition     = contains(keys(aws_instance.web.tags), "CostCenter")
    error_message = "EC2 instance must have a 'CostCenter' tag."
  }
}
```

## Check Block Behavior During Apply

```bash
tofu apply

# Check failures appear as warnings, not errors:
# Warning: Check block assertion failed
# check.bucket_naming: Bucket must start with 'acme-'.
#   This result is reported, but will not prevent OpenTofu from continuing.
```

Apply completes successfully even if checks fail.

## Running Checks During Plan

```bash
tofu plan
# Checks are evaluated during plan as well
# Warning: Check block assertion failed
# check.api_healthy: API health endpoint returned 503...
```

## When to Use Check Blocks

Use check blocks for:
- Post-deployment API health verification
- Compliance policy enforcement (with warning, not blocking)
- Naming convention audits across existing resources
- DNS and network reachability tests
- External service availability assertions

## Conclusion

Check blocks validate infrastructure state after deployment without blocking the apply. They are continuous validation - every `tofu plan` and `tofu apply` evaluates them. Use check blocks for non-critical assertions that should warn operators without stopping deployment. For critical invariants that must be enforced, use `precondition` or `postcondition` lifecycle blocks instead.
