# How to Lint OpenTofu Configurations with TFLint

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, TFLint, Linting, Code Quality, Infrastructure as Code

Description: Learn how to use TFLint to catch errors, enforce best practices, and detect provider-specific issues in OpenTofu configurations before running tofu plan.

## Introduction

TFLint is a Terraform linter that can lint Terraform-compatible OpenTofu configurations stored in `.tf` files. It catches errors not detected by `tofu validate`, such as invalid instance types, deprecated parameters, and module best-practice violations. It supports provider-specific rules through a plugin system.

## Installing TFLint

On macOS:

```bash
brew install tflint
```

On Linux:

```bash
curl -s https://raw.githubusercontent.com/terraform-linters/tflint/master/install_linux.sh | bash
```

Verify:

```bash
tflint --version
```

## Initializing TFLint with Plugins

Create a `.tflint.hcl` configuration file:

```hcl
plugin "aws" {
  enabled = true
  version = "0.47.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}

plugin "azurerm" {
  enabled = true
  version = "0.31.1"
  source  = "github.com/terraform-linters/tflint-ruleset-azurerm"
}
```

Initialize plugins:

```bash
tflint --init
```

## Running TFLint

```bash
# Lint current directory

tflint

# Lint specific directory
tflint --chdir=./modules/networking

# Recursive scan
tflint --recursive
```

## Common Issues Caught by TFLint

```hcl
# Invalid EC2 instance type
resource "aws_instance" "web" {
  ami           = "ami-0abcdef1234567890"
  instance_type = "t2.invalidtype" # TFLint catches this
}

# Deprecated security group rule resource
resource "aws_security_group_rule" "ssh" {
  type              = "ingress"
  security_group_id = "sg-12345678"
  from_port         = 22
  to_port           = 22
  protocol          = "tcp"
  cidr_blocks       = ["10.0.0.0/8"]
}

# Missing required tags
resource "aws_s3_bucket" "logs" {
  bucket = "example-company-logs"
  # TFLint can enforce required tags with aws_resource_missing_tags
}
```

## Enabling Specific Rules

```hcl
# .tflint.hcl
rule "aws_instance_invalid_type" {
  enabled = true
}

rule "aws_instance_previous_type" {
  enabled = true
}

rule "aws_resource_missing_tags" {
  enabled = true
  tags    = ["Environment", "Owner"]
}

rule "terraform_deprecated_interpolation" {
  enabled = true
}
```

## Ignoring Rules Inline

```hcl
resource "aws_instance" "legacy" {
  ami           = "ami-0abcdef1234567890"
  # tflint-ignore: aws_instance_previous_type
  instance_type = "t1.micro"
}
```

## CI/CD Integration

```yaml
- name: TFLint
  run: |
    tflint --recursive --init
    tflint --recursive
```

GitHub Actions:

```yaml
- uses: terraform-linters/setup-tflint@v6
- name: Init TFLint
  run: tflint --recursive --init
- name: Run TFLint
  run: tflint --recursive
```

## Output Format Options

```bash
tflint --format=json > tflint-results.json
tflint --format=checkstyle > tflint-checkstyle.xml
```

## Conclusion

TFLint closes the gap between `tofu validate` and real-world errors by catching provider-specific misconfigurations and best practice violations at development time. Integrating it into pre-commit hooks and CI/CD pipelines ensures consistent code quality across your OpenTofu codebase.
