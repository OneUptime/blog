# How to Configure TFLint Rules for AWS

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, TFLint, AWS, Linting, DevOps, Infrastructure as Code

Description: Learn how to configure TFLint with the AWS ruleset to catch invalid instance types, missing tags, deprecated features, and other AWS-specific Terraform issues.

---

TFLint's AWS plugin is what makes it genuinely useful beyond basic syntax checking. It validates your Terraform configurations against actual AWS API constraints - things like invalid instance types, nonexistent AMIs in your region, and deprecated resource features. Terraform's built-in validation does not catch these until apply time. TFLint catches them in seconds, during development.

## Installing the AWS Plugin

TFLint uses a plugin system. Install the AWS plugin by creating a `.tflint.hcl` configuration file:

```hcl
# .tflint.hcl
plugin "aws" {
  enabled = true
  version = "0.31.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}
```

Then initialize TFLint to download the plugin:

```bash
# Download and install the configured plugins
tflint --init

# Verify it is installed
tflint --version
```

## What the AWS Plugin Checks

The AWS plugin includes hundreds of rules across these categories:

1. **Invalid resource configurations** - Wrong instance types, invalid AMIs, unsupported regions
2. **Deprecated features** - Resources and arguments that AWS has deprecated
3. **Best practices** - Missing encryption, public access settings, tagging
4. **Naming conventions** - Resource names that violate AWS constraints

## Configuring the Plugin

The AWS plugin accepts configuration options:

```hcl
# .tflint.hcl
plugin "aws" {
  enabled = true
  version = "0.31.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"

  # Deep checking queries the AWS API for validation
  # Requires valid AWS credentials
  deep_check = true

  # Specify the AWS region for API checks
  region = "us-east-1"

  # Use a specific AWS profile
  profile = "development"

  # Use shared credentials file
  shared_credentials_file = "~/.aws/credentials"
}
```

With `deep_check = true`, TFLint will call the AWS API to verify things like:
- Whether an AMI ID actually exists
- Whether a subnet ID is valid
- Whether an instance type is available in your region

Without deep checking, TFLint uses a static list of known values, which is faster but might miss region-specific issues.

## Enabling and Disabling Specific Rules

Control individual rules in your configuration:

```hcl
# .tflint.hcl
plugin "aws" {
  enabled = true
  version = "0.31.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}

# Disable a specific rule
rule "aws_instance_invalid_type" {
  enabled = false
}

# Enable a rule that is disabled by default
rule "aws_resource_missing_tags" {
  enabled = true
  tags    = ["Environment", "Team", "ManagedBy"]
}

# Configure rule severity
rule "aws_s3_bucket_invalid_acl" {
  enabled = true
}
```

## Common AWS Rules

Here are the most useful rules and what they catch.

### Instance Type Validation

```hcl
# TFLint catches this immediately
resource "aws_instance" "bad" {
  ami           = "ami-12345678"
  instance_type = "t2.super-large"  # ERROR: invalid instance type
}
```

The `aws_instance_invalid_type` rule checks against all valid EC2 instance types. No more waiting until apply to find out you mistyped `t3.micro` as `t3.mirco`.

### Invalid AMI

```hcl
# With deep_check enabled, TFLint verifies the AMI exists
resource "aws_instance" "web" {
  ami           = "ami-doesnotexist"  # ERROR: AMI not found
  instance_type = "t3.micro"
}
```

### Security Group Rules

```hcl
# TFLint warns about invalid protocol values
resource "aws_security_group_rule" "bad" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "httpS"  # ERROR: invalid protocol
  security_group_id = aws_security_group.main.id
  cidr_blocks       = ["0.0.0.0/0"]
}
```

### IAM Policy Validation

```hcl
# TFLint checks for valid IAM policy syntax
resource "aws_iam_policy" "bad" {
  name   = "test-policy"
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "s3:*"
        Resource = "*"
        # TFLint can warn about overly permissive policies
      }
    ]
  })
}
```

### RDS Validation

```hcl
# Invalid RDS instance class
resource "aws_db_instance" "bad" {
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t2.nano"  # ERROR: not a valid RDS instance class
}
```

### S3 Bucket Configuration

```hcl
# Deprecated ACL usage
resource "aws_s3_bucket" "old_style" {
  bucket = "my-bucket"
  acl    = "private"  # WARNING: acl argument is deprecated
}
```

## Enforcing Tags

The `aws_resource_missing_tags` rule is one of the most valuable for organizations. Configure required tags:

```hcl
# .tflint.hcl
rule "aws_resource_missing_tags" {
  enabled = true

  # List of required tag keys
  tags = [
    "Environment",
    "Team",
    "CostCenter",
    "ManagedBy",
  ]

  # Exclude specific resource types that do not support tags
  exclude = []
}
```

This checks every taggable AWS resource for the required tags:

```hcl
# PASS - all required tags present
resource "aws_instance" "good" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"

  tags = {
    Environment = "production"
    Team        = "platform"
    CostCenter  = "engineering"
    ManagedBy   = "terraform"
  }
}

# FAIL - missing required tags
resource "aws_instance" "bad" {
  ami           = "ami-12345678"
  instance_type = "t3.micro"

  tags = {
    Name = "my-instance"
    # Missing: Environment, Team, CostCenter, ManagedBy
  }
}
```

## Per-Resource Rule Overrides

You can disable rules for specific resources using inline comments:

```hcl
# tflint-ignore: aws_instance_invalid_type
resource "aws_instance" "special" {
  ami           = "ami-12345678"
  instance_type = var.custom_instance_type  # Dynamic, cannot be validated statically
}
```

Or disable all rules for a block:

```hcl
# tflint-ignore-file: aws_resource_missing_tags
# This file contains test resources that do not need tags
```

## Running TFLint with the AWS Plugin

```bash
# Basic run
tflint

# Run with specific configuration file
tflint --config .tflint.hcl

# Run recursively for a multi-module project
tflint --recursive

# Output as JSON for CI processing
tflint --format json

# Show only errors (no warnings)
tflint --minimum-failure-severity error

# Check a specific directory
tflint --chdir modules/networking
```

## CI Integration

```yaml
# .github/workflows/tflint-aws.yml
name: TFLint AWS

on:
  pull_request:
    paths:
      - '**/*.tf'

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: terraform-linters/setup-tflint@v4
        with:
          tflint_version: latest

      - name: Init TFLint
        run: tflint --init

      - name: Run TFLint
        run: tflint --recursive --format compact
```

For deep checking in CI, configure AWS credentials:

```yaml
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.AWS_LINT_ROLE }}
          aws-region: us-east-1

      - name: Run TFLint with Deep Check
        run: tflint --recursive
        env:
          TFLINT_AWS_DEEP_CHECK: "true"
```

## Example Complete Configuration

Here is a production-ready `.tflint.hcl` for an AWS project:

```hcl
# .tflint.hcl
# TFLint configuration for AWS infrastructure

# Core TFLint configuration
config {
  # Enable module inspection
  call_module_type = "local"
}

# AWS plugin
plugin "aws" {
  enabled = true
  version = "0.31.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
  deep_check = false  # Enable in CI with credentials
}

# Require standard tags on all resources
rule "aws_resource_missing_tags" {
  enabled = true
  tags    = ["Environment", "Team", "ManagedBy"]
}

# Naming conventions
rule "terraform_naming_convention" {
  enabled = true
  format  = "snake_case"
}

# Require descriptions on variables
rule "terraform_documented_variables" {
  enabled = true
}

# Require descriptions on outputs
rule "terraform_documented_outputs" {
  enabled = true
}
```

## Summary

TFLint's AWS plugin catches the mistakes that Terraform's validation misses - invalid instance types, nonexistent AMIs, deprecated features, and missing tags. Configure it once with a `.tflint.hcl` file, run `tflint --init`, and you get instant feedback on AWS-specific issues in your Terraform code. For teams running on AWS, this is one of the highest-value tools you can add to your workflow.

For Azure and GCP equivalents, see [How to Configure TFLint Rules for Azure](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-tflint-rules-for-azure/view) and [How to Configure TFLint Rules for GCP](https://oneuptime.com/blog/post/2026-02-23-how-to-configure-tflint-rules-for-gcp/view).
