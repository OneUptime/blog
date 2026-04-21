# How to Test OpenTofu Configurations with tflint

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, TFLint, Linting, Code Quality, Best Practice

Description: Learn how to use tflint to lint OpenTofu configurations, catch deprecated syntax, enforce naming conventions, and validate provider-specific best practices before applying.

## Introduction

tflint is a Terraform-language linter you can use with OpenTofu/Terraform configurations. It catches errors not detectable by `tofu validate` - deprecated syntax, invalid instance types, naming convention violations, and provider-specific issues. It's faster than running `tofu plan` for local/static checks; AWS deep checking needs read-only cloud credentials.

## Installation and Configuration

```bash
# Install tflint

brew install tflint  # macOS
# or
curl -s https://raw.githubusercontent.com/terraform-linters/tflint/master/install_linux.sh | bash

# Install configured rulesets (run after creating .tflint.hcl)
tflint --init
```

```hcl
# .tflint.hcl (project root)
config {
  format              = "default"
  call_module_type    = "local"
  force               = false
  disabled_by_default = false
}

plugin "aws" {
  enabled = true
  version = "0.47.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}

# Enable specific rules
rule "terraform_naming_convention" {
  enabled = true

  resource {
    format = "snake_case"
  }

  variable {
    format = "snake_case"
  }

  output {
    format = "snake_case"
  }
}

rule "terraform_required_providers" {
  enabled = true
}

rule "terraform_required_version" {
  enabled = true
}

rule "terraform_documented_variables" {
  enabled = true
}

rule "terraform_documented_outputs" {
  enabled = true
}
```

## Running tflint

```bash
# Run tflint in the current directory
tflint

# Run recursively across all modules with the project-root config
tflint --recursive --config "$(pwd)/.tflint.hcl"

# Run with specific format
tflint --format=compact

# Save lint results as JSON
tflint --format=json > tflint-results.json

# Initialize plugins before first run
tflint --init
```

## Common tflint Findings

```hcl
# FINDING: aws_instance_invalid_type
resource "aws_instance" "web" {
  # tflint catches invalid instance types before applying
  instance_type = "t1.2xlarge"  # Warning: invalid instance type
}

# FINDING: terraform_deprecated_interpolation
output "example" {
  # Deprecated interpolation syntax
  value = "${var.example}"  # Use: value = var.example
}

# FINDING: terraform_naming_convention
resource "aws_s3_bucket" "MyBucket" {  # Should be snake_case: my_bucket
  bucket = "my-bucket"
}

# FINDING: terraform_documented_variables
variable "instance_type" {
  # Missing description
  type = string
}
```

## Provider-Specific Rules

```bash
# AWS ruleset checks include:
# aws_instance_invalid_type - validates EC2 instance types
# aws_db_instance_invalid_engine - validates RDS engine names
# aws_iam_policy_sid_invalid_characters - validates IAM policy SID format
# aws_elasticache_cluster_invalid_type - validates ElastiCache node types

tflint --only=aws_instance_invalid_type --only=aws_db_instance_invalid_engine
```

## Custom Rules

```go
// rules/check_s3_bucket_prefix.go
package rules

import (
    "strings"

    "github.com/terraform-linters/tflint-plugin-sdk/hclext"
    "github.com/terraform-linters/tflint-plugin-sdk/tflint"
)

type AwsS3BucketPrefixRule struct {
    tflint.DefaultRule
}

func (r *AwsS3BucketPrefixRule) Name() string {
    return "aws_s3_bucket_required_prefix"
}

func (r *AwsS3BucketPrefixRule) Enabled() bool {
    return true
}

func (r *AwsS3BucketPrefixRule) Severity() tflint.Severity {
    return tflint.WARNING
}

func (r *AwsS3BucketPrefixRule) Check(runner tflint.Runner) error {
    resources, err := runner.GetResourceContent("aws_s3_bucket", &hclext.BodySchema{
        Attributes: []hclext.AttributeSchema{{Name: "bucket"}},
    }, nil)
    if err != nil {
        return err
    }

    for _, resource := range resources.Blocks {
        attr, exists := resource.Body.Attributes["bucket"]
        if !exists {
            continue
        }

        err := runner.EvaluateExpr(attr.Expr, func(bucket string) error {
            if strings.HasPrefix(bucket, "prod-") {
                return nil
            }
            return runner.EmitIssue(r, "S3 bucket name must start with prod-", attr.Expr.Range())
        }, nil)
        if err != nil {
            return err
        }
    }

    return nil
}
```

## CI/CD Integration

```yaml
# .github/workflows/tflint.yml
name: tflint

on: [pull_request]

jobs:
  tflint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup tflint
        uses: terraform-linters/setup-tflint@v6
        with:
          tflint_version: v0.62.0

      - name: Init tflint plugins
        run: tflint --init

      - name: Run tflint
        run: tflint --recursive --config "$(pwd)/.tflint.hcl" --format=compact
```

## Ignoring Specific Rules per File

```hcl
# main.tf
# tflint-ignore: terraform_naming_convention
resource "aws_s3_bucket" "S3Bucket" {
  bucket = "legacy-bucket-name"
}
```

## Conclusion

tflint catches a class of errors that `tofu validate` misses - provider-specific invalid values, deprecated syntax, and convention violations. Run it in pre-commit hooks for immediate developer feedback and as a required CI check. The recursive mode (`--recursive --config "$(pwd)/.tflint.hcl"`) lints modules in a monorepo with a single command while sharing the root configuration, making it practical for large infrastructure codebases.
