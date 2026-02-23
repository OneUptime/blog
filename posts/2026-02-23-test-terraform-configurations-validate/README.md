# How to Test Terraform Configurations with terraform validate

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Validation, Testing, CI/CD, DevOps, Infrastructure as Code

Description: Learn how to use terraform validate effectively to catch configuration errors early, integrate it into CI/CD pipelines, and combine it with other validation tools for comprehensive testing.

---

The `terraform validate` command checks whether your Terraform configuration is syntactically correct and internally consistent. It catches typos, missing required arguments, incorrect attribute types, and invalid references before you ever run a plan. It is the fastest feedback loop in Terraform development because it does not need cloud credentials or make any API calls.

Despite being simple, many teams underutilize `terraform validate`. This guide covers how to use it effectively, what it catches (and does not catch), and how to integrate it into your development workflow.

## What terraform validate Does

The `terraform validate` command performs several checks:

- **Syntax validation**: Is the HCL valid?
- **Type checking**: Are attribute values the correct type?
- **Required arguments**: Are all required resource arguments provided?
- **Reference validation**: Do all references (variables, locals, resources) point to real things?
- **Provider schema validation**: Do resource configurations match the provider's expected schema?
- **Module interface validation**: Are required module variables provided?

It does NOT check:

- Whether cloud resources already exist
- Whether your credentials are valid
- Whether resource configurations are logically correct (e.g., CIDR ranges that overlap)
- Runtime errors that only surface during plan or apply

## Basic Usage

```bash
# Initialize the configuration first (required for provider schemas)
terraform init

# Run validation
terraform validate

# Output on success:
# Success! The configuration is valid.

# Output on failure:
# Error: Missing required argument
#   on main.tf line 15, in resource "aws_instance" "web":
#   15: resource "aws_instance" "web" {
# The argument "ami" is required, but no definition was found.
```

### JSON Output for Automation

```bash
# Get machine-readable output
terraform validate -json

# Example successful output:
# {
#   "format_version": "1.0",
#   "valid": true,
#   "error_count": 0,
#   "warning_count": 0,
#   "diagnostics": []
# }

# Example failed output:
# {
#   "format_version": "1.0",
#   "valid": false,
#   "error_count": 1,
#   "warning_count": 0,
#   "diagnostics": [
#     {
#       "severity": "error",
#       "summary": "Missing required argument",
#       "detail": "The argument \"ami\" is required...",
#       "range": {
#         "filename": "main.tf",
#         "start": {"line": 15, "column": 1},
#         "end": {"line": 15, "column": 37}
#       }
#     }
#   ]
# }
```

## Common Errors Caught by terraform validate

### Missing Required Arguments

```hcl
# This will fail validation - ami is required
resource "aws_instance" "web" {
  instance_type = "t3.micro"
  # Error: Missing required argument "ami"
}

# Fixed version
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
}
```

### Invalid Attribute References

```hcl
# This will fail - typo in the reference
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.main.ids  # Error: 'ids' is not an attribute
}

# Fixed - correct attribute name
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.main.id  # Correct attribute
}
```

### Type Mismatches

```hcl
# This will fail - count must be a number
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  count         = "three"  # Error: Invalid value for count
}

# Fixed
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  count         = 3
}
```

### Undeclared Variables

```hcl
# This will fail - variable not declared
resource "aws_instance" "web" {
  ami           = var.ami_id  # Error if ami_id is not declared
  instance_type = var.instance_type
}

# Fix: declare the variable
variable "ami_id" {
  description = "AMI ID for the EC2 instance"
  type        = string
}
```

### Module Source Issues

```hcl
# Validate catches invalid module sources
module "vpc" {
  source = "./modules/vpc"
  # Error if the path does not exist (after terraform init)

  cidr_block = "10.0.0.0/16"
}
```

## Integrating into CI/CD Pipelines

### GitHub Actions

```yaml
# .github/workflows/terraform-validate.yml
name: Terraform Validate
on:
  pull_request:
    paths:
      - 'terraform/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.8.5

      - name: Terraform Format Check
        run: terraform fmt -check -recursive terraform/
        continue-on-error: false

      - name: Terraform Init
        working-directory: terraform
        run: terraform init -backend=false

      - name: Terraform Validate
        working-directory: terraform
        run: terraform validate

      - name: Validate JSON Output
        if: always()
        working-directory: terraform
        run: |
          RESULT=$(terraform validate -json)
          echo "${RESULT}" | jq .

          VALID=$(echo "${RESULT}" | jq -r '.valid')
          if [ "${VALID}" != "true" ]; then
            echo "Validation failed!"
            echo "${RESULT}" | jq -r '.diagnostics[] | "[\(.severity)] \(.summary): \(.detail)"'
            exit 1
          fi
```

### GitLab CI

```yaml
# .gitlab-ci.yml
stages:
  - validate

terraform-validate:
  stage: validate
  image: hashicorp/terraform:1.8.5
  script:
    - cd terraform/
    - terraform init -backend=false
    - terraform validate
    - terraform fmt -check -recursive
  rules:
    - changes:
        - terraform/**/*
```

### Pre-Commit Hook

```bash
# Install pre-commit
pip install pre-commit

# Create .pre-commit-config.yaml
cat > .pre-commit-config.yaml << 'EOF'
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.86.0
    hooks:
      - id: terraform_fmt
      - id: terraform_validate
        args:
          - --hook-config=--retry-once-with-cleanup=true
      - id: terraform_tflint
EOF

# Install the hooks
pre-commit install

# Now validation runs automatically before every commit
```

## Validating Across Multiple Directories

Most Terraform projects have multiple root modules. Validate them all:

```bash
#!/bin/bash
# validate-all.sh
# Validate all Terraform configurations in the repository

ERRORS=0
TOTAL=0

# Find all directories containing .tf files
for DIR in $(find . -name "*.tf" -exec dirname {} \; | sort -u); do
  TOTAL=$((TOTAL + 1))
  echo "Validating: ${DIR}"

  # Initialize without backend to avoid needing credentials
  if terraform -chdir="${DIR}" init -backend=false -input=false > /dev/null 2>&1; then
    RESULT=$(terraform -chdir="${DIR}" validate -json 2>/dev/null)
    VALID=$(echo "${RESULT}" | jq -r '.valid')

    if [ "${VALID}" = "true" ]; then
      echo "  PASS"
    else
      echo "  FAIL"
      echo "${RESULT}" | jq -r '.diagnostics[] | "    [\(.severity)] \(.summary)"'
      ERRORS=$((ERRORS + 1))
    fi
  else
    echo "  SKIP (init failed)"
  fi
done

echo ""
echo "=== Results: ${TOTAL} modules checked, ${ERRORS} failures ==="

exit ${ERRORS}
```

## Combining terraform validate with Other Tools

`terraform validate` is just one layer of validation. Combine it with other tools for comprehensive checking:

### terraform fmt

```bash
# Check formatting (does not fix, just reports)
terraform fmt -check -recursive -diff

# Fix formatting
terraform fmt -recursive
```

### tflint

```bash
# Install tflint
curl -s https://raw.githubusercontent.com/terraform-linters/tflint/master/install_linux.sh | bash

# Run tflint for deeper analysis
tflint --init
tflint

# tflint catches things validate misses:
# - Invalid instance types
# - Deprecated resource arguments
# - Naming convention violations
```

### tfsec / trivy

```bash
# Security scanning
tfsec .

# Or with trivy
trivy config .
```

### Complete Validation Pipeline

```bash
#!/bin/bash
# full-validate.sh
# Run all validation tools in sequence

set -e

echo "Step 1: Format check"
terraform fmt -check -recursive

echo "Step 2: Initialize"
terraform init -backend=false

echo "Step 3: Validate"
terraform validate

echo "Step 4: Lint"
tflint --init && tflint

echo "Step 5: Security scan"
tfsec . --minimum-severity HIGH

echo "All validation checks passed!"
```

## Tips for Effective Use

**Always run `terraform init` first**: Validation needs provider schemas, which are only available after initialization. Use `terraform init -backend=false` in CI to skip backend configuration.

**Use `-json` in automation**: The JSON output is stable and machine-parseable. Parse it with `jq` for custom reporting.

**Validate early and often**: Run validation on every commit, not just before deployment. The earlier you catch errors, the faster you fix them.

**Combine with type constraints**: Use variable type constraints and validation rules to make `terraform validate` catch more issues:

```hcl
variable "environment" {
  type        = string
  description = "Deployment environment"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "cidr_block" {
  type        = string
  description = "VPC CIDR block"

  validation {
    condition     = can(cidrhost(var.cidr_block, 0))
    error_message = "Must be a valid CIDR block."
  }
}
```

These custom validations run during `terraform validate`, catching bad inputs before they reach the plan stage.

## Summary

`terraform validate` is the fastest and cheapest way to catch configuration errors. It runs in seconds, needs no cloud credentials, and catches a significant portion of the mistakes developers make. Use it in pre-commit hooks for immediate feedback, in CI pipelines for enforcement, and combine it with `terraform fmt`, tflint, and security scanners for comprehensive validation coverage. The small investment in setting up validation pays for itself many times over by catching errors before they reach your Terraform Enterprise run queue.

For more on Terraform testing strategies, see [How to Implement Infrastructure Testing with Terraform](https://oneuptime.com/blog/post/2026-02-02-terraform-testing/view).
