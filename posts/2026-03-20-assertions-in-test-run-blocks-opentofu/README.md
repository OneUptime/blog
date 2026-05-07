# How to Write Assertions in Test Run Blocks in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, Assertions, Infrastructure as Code, Validation

Description: Master writing effective assertions in OpenTofu test run blocks to validate infrastructure attributes, outputs, and expected failure conditions.

## Introduction

Assertions are the heart of OpenTofu tests. Each `assert` block inside a `run` block checks a condition and reports a custom error message if the condition is false. Writing clear, targeted assertions makes your test suite self-documenting and failures easy to diagnose.

## Basic Assertion Syntax

```hcl
run "bucket_has_correct_name" {
  variables {
    bucket_name = "my-app-data-bucket"
  }

  # Each assert block has exactly two arguments:
  # condition  - a boolean expression
  # error_message - shown when condition is false
  assert {
    condition     = aws_s3_bucket.this.bucket == "my-app-data-bucket"
    error_message = "Expected bucket name 'my-app-data-bucket', got '${aws_s3_bucket.this.bucket}'"
  }
}
```

## Asserting on Outputs

Outputs are the primary interface of a module-test them explicitly:

```hcl
run "outputs_expose_bucket_arn" {
  assert {
    condition     = output.bucket_arn != ""
    error_message = "bucket_arn output should not be empty after apply"
  }

  assert {
    condition     = startswith(output.bucket_arn, "arn:aws:s3:::")
    error_message = "bucket_arn does not look like a valid S3 ARN"
  }
}
```

## Common Assertion Patterns

### Equality

```hcl
assert {
  condition     = aws_instance.web.instance_type == "t3.micro"
  error_message = "Instance type should be t3.micro"
}
```

### Non-empty / existence check

```hcl
assert {
  condition     = length(aws_subnet.public) > 0
  error_message = "At least one public subnet must be created"
}
```

### List membership

```hcl
assert {
  condition     = contains(["us-east-1", "us-west-2"], aws_s3_bucket.this.bucket_region)
  error_message = "Bucket must be in a US region"
}
```

### Map key presence

```hcl
assert {
  condition     = contains(keys(aws_s3_bucket.this.tags), "Environment")
  error_message = "Bucket must have an Environment tag"
}
```

### String matching with regex

```hcl
assert {
  condition     = can(regex("^myapp-[a-z]+-[0-9]+$", aws_s3_bucket.this.bucket))
  error_message = "Bucket name does not match the required naming convention"
}
```

### Nested attribute check

```hcl
assert {
  condition     = aws_db_instance.this.multi_az == true
  error_message = "RDS instance must be Multi-AZ for the production environment"
}
```

## Multiple Assertions per Run Block

Add as many `assert` blocks as needed. OpenTofu evaluates all `assert` blocks in the `run` block:

```hcl
run "security_group_configuration" {
  assert {
    condition     = length(aws_security_group.web.ingress) == 2
    error_message = "Expected exactly 2 ingress rules"
  }

  assert {
    condition     = aws_security_group.web.egress[0].protocol == "-1"
    error_message = "Egress rule should allow all protocols"
  }

  assert {
    condition     = aws_security_group.web.vpc_id != ""
    error_message = "Security group must be associated with a VPC"
  }
}
```

## Writing Good Error Messages

Include the actual value in the error message using string interpolation so failures are self-explanatory:

```hcl
# Vague - hard to debug

assert {
  condition     = aws_instance.this.ami == var.expected_ami
  error_message = "AMI mismatch"
}

# Clear - includes both expected and actual values
assert {
  condition     = aws_instance.this.ami == var.expected_ami
  error_message = "Expected AMI '${var.expected_ami}' but resource uses '${aws_instance.this.ami}'"
}
```

## Assertions in Plan Mode

In `command = plan` mode, resource attributes may not be fully known. Stick to attributes that are deterministic at plan time:

```hcl
run "plan_check_tags" {
  command = plan

  # Tags are set from variables, so they are known at plan time
  assert {
    condition     = aws_s3_bucket.this.tags["Environment"] == "test"
    error_message = "Environment tag must be 'test'"
  }
}
```

## Conclusion

Good assertions are concise, focused on one concern, and produce error messages that tell you exactly what went wrong without digging through logs. Combine them with OpenTofu's `expect_failures` feature to cover both success paths and expected custom-condition failure paths comprehensively.
