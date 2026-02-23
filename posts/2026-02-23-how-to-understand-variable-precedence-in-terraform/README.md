# How to Understand Variable Precedence in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Variables, Configuration, Infrastructure as Code, Best Practices

Description: Master Terraform's variable precedence rules to understand which value wins when the same variable is set in multiple places, from defaults to command-line flags.

---

When you set the same Terraform variable in multiple places - a default value, a tfvars file, an environment variable, and a `-var` flag - which one actually gets used? Terraform follows a specific precedence order, and understanding it prevents surprises that can range from deploying the wrong instance type to accidentally overwriting a production database.

This post breaks down the exact precedence order, demonstrates each level with examples, and shows you how to use this knowledge to build reliable configuration workflows.

## The Precedence Order

Terraform evaluates variable values from multiple sources and applies them in a specific order. When the same variable is defined in multiple sources, the higher-precedence source wins. From lowest to highest priority:

1. **Default values** in the variable declaration
2. **Environment variables** (`TF_VAR_*`)
3. **terraform.tfvars** file
4. **terraform.tfvars.json** file
5. **\*.auto.tfvars** or **\*.auto.tfvars.json** files (in alphabetical order)
6. **-var-file** flags (in the order specified on the command line)
7. **-var** flags (in the order specified on the command line)

The `-var` flag on the command line has the highest precedence. Default values have the lowest.

## Level 1: Default Values (Lowest Priority)

Default values are specified directly in the variable declaration. They are used only when no other source provides a value.

```hcl
# variables.tf

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"  # Used when nothing else sets this variable
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  # No default - this variable is required
}
```

If `instance_type` is not set anywhere else, it will be `"t3.micro"`. If `environment` is not set anywhere, Terraform prompts the user for a value (or errors in non-interactive mode).

## Level 2: Environment Variables

Environment variables with the `TF_VAR_` prefix override default values.

```bash
# This overrides the default "t3.micro"
export TF_VAR_instance_type="t3.small"

terraform plan
# instance_type = "t3.small"
```

## Level 3: terraform.tfvars

The `terraform.tfvars` file overrides both defaults and environment variables.

```hcl
# terraform.tfvars
instance_type = "t3.medium"
```

```bash
export TF_VAR_instance_type="t3.small"
terraform plan
# instance_type = "t3.medium" (tfvars wins over env var)
```

## Level 4: terraform.tfvars.json

If both `terraform.tfvars` and `terraform.tfvars.json` exist, the JSON file takes precedence for any variable defined in both.

```json
{
  "instance_type": "t3.large"
}
```

In practice, you rarely have both files. But if you do, the JSON one wins.

## Level 5: *.auto.tfvars Files

Files ending in `.auto.tfvars` override `terraform.tfvars`. They are loaded in alphabetical order, so later files (alphabetically) override earlier ones.

```hcl
# a-defaults.auto.tfvars
instance_type = "t3.small"

# z-overrides.auto.tfvars
instance_type = "t3.xlarge"  # This wins
```

## Level 6: -var-file Flags

Explicitly specified variable files override all auto-loaded files. When multiple `-var-file` flags are used, later ones override earlier ones for the same variable.

```bash
terraform apply \
  -var-file="base.tfvars" \
  -var-file="production.tfvars"
# If both files set instance_type, production.tfvars wins
```

```hcl
# base.tfvars
instance_type = "t3.medium"
environment   = "staging"

# production.tfvars
instance_type = "t3.xlarge"
environment   = "production"
# Both values from production.tfvars take effect
```

## Level 7: -var Flags (Highest Priority)

The `-var` flag on the command line overrides everything. When multiple `-var` flags set the same variable, the last one wins.

```bash
terraform apply \
  -var-file="production.tfvars" \
  -var="instance_type=t3.nano"
# instance_type = "t3.nano" regardless of what production.tfvars says
```

```bash
# Last -var wins for the same variable
terraform apply \
  -var="instance_type=t3.small" \
  -var="instance_type=t3.large"
# instance_type = "t3.large"
```

## A Complete Precedence Demonstration

Let us trace through a realistic scenario where the same variable is set at every level.

```hcl
# variables.tf
variable "instance_type" {
  type    = string
  default = "t3.micro"    # Level 1: default
}
```

```bash
# Level 2: environment variable
export TF_VAR_instance_type="t3.small"
```

```hcl
# terraform.tfvars (Level 3)
instance_type = "t3.medium"
```

```hcl
# compute.auto.tfvars (Level 5)
instance_type = "t3.large"
```

```hcl
# production.tfvars (used with -var-file, Level 6)
instance_type = "t3.xlarge"
```

```bash
# Level 7: -var flag
terraform apply \
  -var-file="production.tfvars" \
  -var="instance_type=t3.2xlarge"
```

Result: `instance_type = "t3.2xlarge"` because the `-var` flag has the highest precedence.

If we remove the `-var` flag:

```bash
terraform apply -var-file="production.tfvars"
```

Result: `instance_type = "t3.xlarge"` from `production.tfvars`.

If we also remove the `-var-file` flag:

```bash
terraform apply
```

Result: `instance_type = "t3.large"` from `compute.auto.tfvars`.

And so on down the chain.

## Practical Patterns Using Precedence

### Pattern 1: Safe Defaults with Environment Overrides

Set conservative defaults and let each environment override what it needs:

```hcl
# variables.tf
variable "instance_type" {
  type    = string
  default = "t3.micro"  # Safe, cheap default
}

variable "instance_count" {
  type    = number
  default = 1  # Minimal default
}
```

```hcl
# production.tfvars
instance_type  = "t3.xlarge"
instance_count = 5
```

```bash
# Dev uses defaults
terraform apply

# Production overrides
terraform apply -var-file="production.tfvars"
```

### Pattern 2: Base + Override Layering

Use auto-loaded files for base config and `-var-file` for environment specifics:

```hcl
# base.auto.tfvars (always loaded)
project     = "web-store"
owner       = "platform-team"
cost_center = "engineering"
```

```hcl
# dev.tfvars
environment    = "dev"
instance_type  = "t3.micro"
instance_count = 1
```

```hcl
# production.tfvars
environment    = "production"
instance_type  = "t3.xlarge"
instance_count = 10
```

```bash
# Base config is always loaded; environment specifics via -var-file
terraform apply -var-file="dev.tfvars"
terraform apply -var-file="production.tfvars"
```

### Pattern 3: CI/CD with Emergency Overrides

```bash
# Normal CI/CD deploy - uses tfvars file
terraform apply -var-file="production.tfvars" -auto-approve

# Emergency scale-down with -var override
terraform apply \
  -var-file="production.tfvars" \
  -var="instance_count=1" \
  -auto-approve
```

The `-var` flag overrides the `instance_count` from the file while keeping everything else.

### Pattern 4: Secrets via Environment, Config via Files

```bash
# Secrets set as environment variables (Level 2)
export TF_VAR_db_password="$(vault read -field=password secret/db)"
export TF_VAR_api_key="$(vault read -field=key secret/api)"

# Config set in tfvars (Level 3+, overrides env vars for non-secrets)
terraform apply -var-file="production.tfvars"
```

This works because environment variables are lower precedence than tfvars files. The secrets are set via environment variables (since they should not be in files), while non-sensitive config comes from the tfvars file.

## Debugging Precedence Issues

When you are not sure which source is providing a variable's value, here are some debugging techniques:

### Use terraform console

```bash
export TF_VAR_instance_type="from-env"
terraform console -var-file="production.tfvars"
> var.instance_type
"from-file"
# The tfvars file wins over the environment variable
```

### Use terraform plan with Output

```bash
terraform plan -var="instance_type=debug-value" 2>&1 | grep instance_type
```

### Remove Sources One at a Time

If you are getting an unexpected value, remove variable sources one by one (starting from the highest precedence) until the value changes. That tells you which source was providing it.

## Common Pitfalls

### Pitfall 1: Assuming Environment Variables Override Files

A common mistake is thinking `TF_VAR_*` overrides tfvars files. It does not - tfvars files have higher precedence.

```bash
export TF_VAR_environment="staging"
# terraform.tfvars has: environment = "production"
terraform plan
# environment = "production" (tfvars wins)
```

### Pitfall 2: Forgetting About Auto-Loaded Files

If you have leftover `.auto.tfvars` files from testing, they silently override your terraform.tfvars values.

```bash
# Clean up test files
rm -f *test*.auto.tfvars
```

### Pitfall 3: Order of -var-file Flags

The order matters. Later files override earlier ones.

```bash
# production.tfvars values override base.tfvars values
terraform apply -var-file="base.tfvars" -var-file="production.tfvars"
```

## Quick Reference Table

| Source | Priority | Auto-loaded? |
|--------|----------|-------------|
| Variable default | 1 (lowest) | N/A |
| TF_VAR_ env var | 2 | Yes |
| terraform.tfvars | 3 | Yes |
| terraform.tfvars.json | 4 | Yes |
| *.auto.tfvars | 5 | Yes |
| -var-file flag | 6 | No (explicit) |
| -var flag | 7 (highest) | No (explicit) |

## Wrapping Up

Terraform's variable precedence is designed to be predictable: defaults provide fallbacks, files provide standard configuration, and command-line flags provide overrides. Understanding this order lets you build layered configuration strategies where each environment gets the right values without duplicating your entire configuration. When in doubt, remember that more explicit methods (command-line flags) always beat less explicit ones (defaults and auto-loaded files).

For practical examples of each variable-setting method, see our posts on [passing variables with -var](https://oneuptime.com/blog/post/2026-02-23-how-to-pass-variables-via-command-line-with-var-flag-in-terraform/view) and [using terraform.tfvars](https://oneuptime.com/blog/post/2026-02-23-how-to-pass-variables-via-terraform-tfvars-file/view).
