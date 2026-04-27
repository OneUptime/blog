# How to Override Resources in OpenTofu Tests - Opentofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Testing, Override Resources, Mock, Infrastructure as Code

Description: Learn how to use the `override_resource` block in OpenTofu tests to replace specific resource implementations with controlled mock values during testing.

## Introduction

OpenTofu 1.8 introduced fine-grained resource overrides for tests. While `mock_provider` replaces an entire provider, `override_resource` lets you replace only a specific resource within an otherwise real (or mock) provider configuration. This is useful when most of your module uses mock providers but a few resources need specific computed values.

## Basic `override_resource` Syntax

Place `override_resource` blocks inside a `run` block (or at the file level to apply across all runs):

```hcl
# tests/override_example.tftest.hcl

mock_provider "aws" {}

run "test_with_overridden_bucket" {
  # Override the specific S3 bucket resource
  override_resource {
    target = aws_s3_bucket.main

    # Provide specific values for computed attributes
    values = {
      arn    = "arn:aws:s3:::controlled-bucket-name"
      bucket = "controlled-bucket-name"
      region = "us-east-1"
    }
  }

  assert {
    condition     = aws_s3_bucket.main.arn == "arn:aws:s3:::controlled-bucket-name"
    error_message = "Bucket ARN should match the override value"
  }
}
```

## File-Level Overrides

Define an override at the top level to apply it to all `run` blocks in the file:

```hcl
# Apply this override to every run block

override_resource {
  target = aws_kms_key.encryption

  values = {
    id      = "mrk-abc123def456"
    arn     = "arn:aws:kms:us-east-1:123456789012:key/mrk-abc123def456"
    key_id  = "mrk-abc123def456"
  }
}

run "encryption_key_used_in_bucket" {
  assert {
    condition     = aws_s3_bucket_server_side_encryption_configuration.this.rule[0].apply_server_side_encryption_by_default[0].kms_master_key_id == "mrk-abc123def456"
    error_message = "Bucket should use the KMS key from the override"
  }
}
```

## Use Case: Testing Dependent Resources

Override a dependency to test how your module uses it without creating the dependency:

```hcl
mock_provider "aws" {}

run "lambda_uses_correct_execution_role" {
  # Override the IAM role so we can test the Lambda configuration
  # without the IAM creation workflow
  override_resource {
    target = aws_iam_role.lambda_execution

    values = {
      arn  = "arn:aws:iam::123456789012:role/my-lambda-role"
      name = "my-lambda-role"
    }
  }

  assert {
    condition     = aws_lambda_function.this.role == "arn:aws:iam::123456789012:role/my-lambda-role"
    error_message = "Lambda should use the execution role ARN"
  }
}
```

## Combining `override_resource` with `override_data`

You can mix resource and data source overrides in the same `run` block:

```hcl
run "uses_correct_ami_from_data_source" {
  override_resource {
    target = aws_instance.web
    values = {
      id        = "i-override123"
      public_ip = "10.20.30.40"
    }
  }

  override_data {
    target = data.aws_ami.ubuntu
    values = {
      id   = "ami-override98765"
      name = "ubuntu-22-04-override"
    }
  }

  assert {
    condition     = aws_instance.web.ami == data.aws_ami.ubuntu.id
    error_message = "Instance should use the AMI from the data source"
  }
}
```

## When to Use `override_resource` vs `mock_provider`

| Scenario | Recommended Approach |
|---|---|
| All resources in module need mocking | `mock_provider` |
| Most resources are mocked, one needs specific values | `mock_provider` + `override_resource` |
| Real provider, but one dependency needs a known value | `override_resource` only |
| Testing cross-resource attribute references | `override_resource` |

## Conclusion

`override_resource` gives you surgical control over which resources return mock values during testing. Combined with `mock_provider` and `override_data`, it enables you to build test scenarios that are both fast and precise-no real cloud calls, but full control over the values that flow between resources.
