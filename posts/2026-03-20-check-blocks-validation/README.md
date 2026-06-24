# How to Use Check Blocks for Infrastructure Validation in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, Testing

Description: Learn how to use OpenTofu check blocks to continuously validate infrastructure assumptions and detect configuration drift with custom assertions.

## Introduction

Check blocks allow you to write assertions about your infrastructure outside the usual resource lifecycle. Unlike preconditions and postconditions, which are attached to specific resources, data sources, or outputs, check blocks execute as the last step of every plan and apply, making them suitable for ongoing infrastructure validation.

## Basic Check Block Syntax

```hcl
check "website_is_live" {
  assert {
    condition     = data.http.website.status_code >= 200 && data.http.website.status_code < 300
    error_message = "Website returned a non-2xx status code: ${data.http.website.status_code}"
  }
}
```

## Check Block with Data Source

Check blocks can include an optional scoped data source:

```hcl
check "s3_bucket_exists" {
  # Scoped data source - only available within this check block
  data "aws_s3_bucket" "state" {
    bucket = "my-terraform-state"
  }

  assert {
    condition     = data.aws_s3_bucket.state.bucket == "my-terraform-state"
    error_message = "Expected state bucket not found"
  }
}
```

## Multiple Assertions in One Check Block

```hcl
check "database_configuration" {
  data "aws_db_instance" "main" {
    db_instance_identifier = aws_db_instance.main.identifier
  }

  assert {
    condition     = data.aws_db_instance.main.multi_az == true
    error_message = "Production database must have Multi-AZ enabled"
  }

  assert {
    condition     = aws_db_instance.main.deletion_protection == true
    error_message = "Production database must have deletion protection enabled"
  }

  assert {
    condition     = data.aws_db_instance.main.backup_retention_period >= 7
    error_message = "Database backup retention must be at least 7 days, got: ${data.aws_db_instance.main.backup_retention_period}"
  }
}
```

## Check Block Behavior

Check blocks produce **warnings**, not errors:

```bash
tofu apply

# Output:

# ╷
# │ Warning: Check block assertion failed
# │
# │   on main.tf line 42, in check "database_configuration":
# │   42:     condition = data.aws_db_instance.main.multi_az == true
# │
# │ Production database must have Multi-AZ enabled
# ╵
# Apply complete! Resources: 0 added, 0 changed, 0 destroyed.
# (apply still succeeds - checks are warnings, not blockers)
```

## Using Check Blocks for Security Compliance

```hcl
check "s3_encryption_enabled" {
  assert {
    condition     = length(aws_s3_bucket_server_side_encryption_configuration.app.rule) > 0
    error_message = "S3 bucket must have server-side encryption enabled"
  }
}

check "no_public_s3_access" {
  assert {
    condition     = aws_s3_bucket_public_access_block.app.block_public_acls == true && aws_s3_bucket_public_access_block.app.block_public_policy == true && aws_s3_bucket_public_access_block.app.ignore_public_acls == true && aws_s3_bucket_public_access_block.app.restrict_public_buckets == true
    error_message = "S3 bucket must have all public access block settings enabled"
  }
}
```

## Tagging Compliance Checks

```hcl
check "required_tags_present" {
  assert {
    condition = contains(keys(aws_instance.web.tags_all), "Environment") && contains(keys(aws_instance.web.tags_all), "Owner")
    error_message = "EC2 instance missing required tags: Environment and Owner"
  }
}

check "tag_values_valid" {
  assert {
    condition     = contains(["dev", "staging", "prod"], lookup(aws_instance.web.tags_all, "Environment", ""))
    error_message = "Environment tag must be one of: dev, staging, prod"
  }
}
```

## Check vs Precondition/Postcondition

| Feature | check block | precondition | postcondition |
|---------|-------------|-------------|---------------|
| Runs during | Last step of every plan/apply | Before evaluating the associated resource, data source, or output | After evaluating the associated resource or data source |
| On failure | Warning (non-blocking) | Error (blocks operation) | Error (blocks operation and prevents dependents from proceeding) |
| Scoped nested data source support | Yes | No | No |

## Conclusion

Check blocks provide ongoing infrastructure validation that can surface configuration drift and compliance issues during every plan and apply. They're non-blocking (warnings, not errors), making them suitable for gradual adoption of validation rules. Use them for security compliance, tagging policies, and validating dependencies between infrastructure components.
