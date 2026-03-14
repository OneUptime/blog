# How to Use terraform validate to Check Configuration Syntax

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Validation, Terraform validate, Syntax, DevOps, Infrastructure as Code

Description: Learn how to use terraform validate to catch configuration errors early including syntax checks, type validation, and integration with CI/CD pipelines.

---

Catching errors before they reach `terraform plan` or `terraform apply` saves time and frustration. `terraform validate` is a built-in command that checks your Terraform configuration for syntax errors, type mismatches, invalid references, and other issues without connecting to any cloud provider or reading the state file.

Think of it as a linter for your Terraform code. It is fast, does not require credentials, and catches a surprising number of mistakes.

## Basic Usage

```bash
# Validate the configuration in the current directory
terraform validate
```

If everything is correct:

```text
Success! The configuration is valid.
```

If there are errors:

```text
Error: Missing required argument

  on main.tf line 5, in resource "aws_instance" "web":
   5: resource "aws_instance" "web" {

The argument "ami" is required, but no definition was found.
```

## What terraform validate Checks

### Syntax Errors

Basic HCL parsing errors like missing braces, bad indentation, or typos:

```hcl
# This will fail validation - missing closing brace
resource "aws_instance" "web" {
  ami           = "ami-abc123"
  instance_type = "t3.micro"
```

### Type Mismatches

When you pass the wrong type to an argument:

```hcl
variable "instance_count" {
  type    = number
  default = "not-a-number"  # Error: string where number is expected
}
```

### Invalid References

When you reference a resource, variable, or attribute that does not exist:

```hcl
resource "aws_instance" "web" {
  ami           = "ami-abc123"
  instance_type = "t3.micro"
  subnet_id     = aws_subnet.nonexistent.id  # Error: no such resource
}
```

### Required Argument Validation

When you forget a required argument:

```hcl
resource "aws_instance" "web" {
  # Missing required 'ami' and 'instance_type' arguments
}
```

### Duplicate Resource Names

```hcl
# Error: two resources with the same type and name
resource "aws_instance" "web" {
  ami           = "ami-abc123"
  instance_type = "t3.micro"
}

resource "aws_instance" "web" {
  ami           = "ami-def456"
  instance_type = "t3.small"
}
```

### Module Input Validation

When calling a module, validate checks that required inputs are provided:

```hcl
module "vpc" {
  source = "./modules/vpc"
  # Missing required variable 'cidr_block'
}
```

## What terraform validate Does NOT Check

Understanding the limitations is just as important:

- **Does not check if resource configurations are valid with the cloud provider** - It does not know if an AMI ID actually exists or if an instance type is available in your region
- **Does not check state** - It does not compare against existing infrastructure
- **Does not check if credentials are valid** - Authentication issues are not caught
- **Does not check provider-specific argument values** - For example, it will not flag an invalid CIDR block format
- **Does not check if resources will actually succeed** - A security group rule might reference a non-existent VPC, and validate will not catch that

For these deeper checks, you need `terraform plan`.

## Prerequisites

Before running `terraform validate`, you must initialize the project:

```bash
# Initialize first (required for validate to know about providers)
terraform init

# Then validate
terraform validate
```

If you have not run `terraform init`, validate will fail because it does not know about the providers and their schemas.

However, you can initialize without backend configuration if you only want to validate:

```bash
# Initialize without backend (faster, no credentials needed)
terraform init -backend=false

# Now validate
terraform validate
```

This is useful in CI/CD where you want to validate without needing cloud credentials.

## JSON Output

For machine-readable output (useful in CI/CD and automated tools):

```bash
# Output validation results in JSON format
terraform validate -json
```

Successful output:

```json
{
  "valid": true,
  "error_count": 0,
  "warning_count": 0,
  "diagnostics": []
}
```

Error output:

```json
{
  "valid": false,
  "error_count": 1,
  "warning_count": 0,
  "diagnostics": [
    {
      "severity": "error",
      "summary": "Missing required argument",
      "detail": "The argument \"ami\" is required, but no definition was found.",
      "range": {
        "filename": "main.tf",
        "start": { "line": 5, "column": 1 },
        "end": { "line": 5, "column": 36 }
      }
    }
  ]
}
```

The JSON output includes file names, line numbers, and column positions, making it easy to integrate with editors and CI systems.

## Using terraform validate in CI/CD

### GitHub Actions

```yaml
name: Terraform Validate
on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init -backend=false

      - name: Terraform Validate
        run: terraform validate
```

### GitLab CI

```yaml
validate:
  stage: test
  image: hashicorp/terraform:1.7.5
  script:
    - terraform init -backend=false
    - terraform validate
  only:
    - merge_requests
```

### Pre-Commit Hook

Add validation as a Git pre-commit hook:

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Find all directories containing .tf files
TF_DIRS=$(find . -name "*.tf" -not -path "./.terraform/*" -exec dirname {} \; | sort -u)

ERRORS=0

for dir in $TF_DIRS; do
    echo "Validating $dir..."
    cd "$dir"
    terraform init -backend=false -input=false > /dev/null 2>&1
    if ! terraform validate; then
        ERRORS=$((ERRORS + 1))
    fi
    cd - > /dev/null
done

if [ $ERRORS -gt 0 ]; then
    echo "Validation failed in $ERRORS directories"
    exit 1
fi
```

Make it executable:

```bash
chmod +x .git/hooks/pre-commit
```

## Combining Validate with Other Checks

For a thorough code quality pipeline, combine `terraform validate` with other tools:

```bash
#!/bin/bash
# Full Terraform code quality check

# Step 1: Format check
echo "Checking formatting..."
terraform fmt -check -recursive
if [ $? -ne 0 ]; then
    echo "Formatting issues found. Run 'terraform fmt' to fix."
    exit 1
fi

# Step 2: Validation
echo "Validating configuration..."
terraform init -backend=false > /dev/null 2>&1
terraform validate
if [ $? -ne 0 ]; then
    echo "Validation failed."
    exit 1
fi

# Step 3: TFLint (if installed)
if command -v tflint &> /dev/null; then
    echo "Running TFLint..."
    tflint --init
    tflint
fi

echo "All checks passed."
```

## Validating Multiple Configurations

If your repository contains multiple Terraform configurations in different directories:

```bash
# Validate all Terraform directories
for dir in $(find . -name "*.tf" -not -path "./.terraform/*" -exec dirname {} \; | sort -u); do
    echo "Validating: $dir"
    (cd "$dir" && terraform init -backend=false -input=false > /dev/null 2>&1 && terraform validate)
    if [ $? -ne 0 ]; then
        echo "FAILED: $dir"
    fi
done
```

## Custom Validation Rules

While `terraform validate` checks structural validity, you can add custom validation to your variables:

```hcl
variable "environment" {
  type        = string
  description = "The deployment environment"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be one of: dev, staging, production."
  }
}

variable "instance_type" {
  type        = string
  description = "EC2 instance type"

  validation {
    condition     = can(regex("^t[23]\\.", var.instance_type))
    error_message = "Instance type must be a t2 or t3 type."
  }
}
```

These validation rules are checked during `terraform validate` and `terraform plan`, giving you earlier feedback on invalid inputs.

## Validate vs Plan

Here is a quick comparison:

| Feature | terraform validate | terraform plan |
|---------|-------------------|----------------|
| Speed | Very fast | Slower (queries cloud) |
| Credentials needed | No | Yes |
| Checks syntax | Yes | Yes |
| Checks types | Yes | Yes |
| Checks cloud validity | No | Yes |
| Checks state | No | Yes |
| Detects drift | No | Yes |
| Backend required | No | Yes |

Use `terraform validate` as a fast first pass. Use `terraform plan` for the complete picture.

## Troubleshooting

### "Provider not installed" Error

If validate fails because a provider is not installed:

```bash
# Make sure you initialized first
terraform init -backend=false
terraform validate
```

### Validate Passes But Plan Fails

This is normal and expected. Validate only checks structural correctness. Plan checks against the real cloud provider. A valid configuration can still fail during plan if, for example, you reference an AMI that does not exist in your region.

### Slow Validation on Large Projects

Validation should be fast, but if your project has many modules, the init step (which is required before validate) can be slow. Use the plugin cache to speed up init:

```bash
export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"
terraform init -backend=false
terraform validate
```

## Conclusion

`terraform validate` is a lightweight, fast safety check that should be part of every Terraform workflow. Run it locally before committing, enforce it in CI/CD pipelines, and use it in pre-commit hooks. It catches syntax errors, type mismatches, and reference issues instantly without needing cloud credentials or network access. Combined with `terraform fmt` for formatting and `terraform plan` for full validation, you get a thorough quality assurance pipeline for your infrastructure code.
