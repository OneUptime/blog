# How to Fix Invalid Value for Input Variable Error in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Variables, Validation, HCL

Description: How to fix Invalid Value for Input Variable errors in Terraform caused by type mismatches, validation failures, and incorrect variable assignments.

---

You run `terraform plan` and see:

```
Error: Invalid value for variable

on variables.tf line 5:
   5: variable "instance_type" {

The given value is not valid for variable "instance_type": expected a
string, got number.
```

Or maybe something like:

```
Error: Invalid value for variable

on variables.tf line 10:
  10: variable "environment" {

This variable does not have a default value, so a value must be set.
```

These errors mean that the value you provided for a variable does not match what Terraform expects. The causes range from simple type mismatches to validation rule failures. Let us go through each scenario.

## Cause 1: Type Mismatch

The most common case. The variable expects one type, but you gave it another:

```hcl
# variables.tf
variable "port" {
  type = number
}

# terraform.tfvars
port = "8080"  # This is a string, not a number
```

**Fix**: Provide the correct type:

```hcl
# terraform.tfvars
port = 8080  # Number, no quotes
```

Common type mismatches:

```hcl
# String vs Number
variable "count_value" {
  type = number
}
# WRONG: count_value = "5"
# RIGHT: count_value = 5

# String vs Bool
variable "enable_monitoring" {
  type = bool
}
# WRONG: enable_monitoring = "true"
# RIGHT: enable_monitoring = true

# String vs List
variable "availability_zones" {
  type = list(string)
}
# WRONG: availability_zones = "us-east-1a"
# RIGHT: availability_zones = ["us-east-1a"]

# List vs Map
variable "tags" {
  type = map(string)
}
# WRONG: tags = ["Name=web", "Env=prod"]
# RIGHT: tags = { Name = "web", Env = "prod" }
```

## Cause 2: Variable Not Set

If a variable has no default value and you do not provide one:

```hcl
# variables.tf
variable "environment" {
  type        = string
  description = "Deployment environment"
  # No default value
}
```

```
Error: No value for required variable

The root module input variable "environment" is not set, and has no default
value. Use a -var or -var-file command line argument or set a TF_VAR_
environment variable to provide a value for this variable.
```

**Fix**: Provide the value using one of these methods:

```bash
# Method 1: Command line flag
terraform plan -var="environment=prod"

# Method 2: Environment variable
export TF_VAR_environment="prod"
terraform plan

# Method 3: terraform.tfvars file
echo 'environment = "prod"' >> terraform.tfvars
terraform plan

# Method 4: Named .tfvars file
terraform plan -var-file="prod.tfvars"
```

Or add a default value:

```hcl
variable "environment" {
  type        = string
  description = "Deployment environment"
  default     = "dev"
}
```

## Cause 3: Validation Rule Failure

If you defined custom validation rules, the value might fail those checks:

```hcl
variable "environment" {
  type = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}
```

```
Error: Invalid value for variable

on variables.tf line 1:
   1: variable "environment" {

Environment must be dev, staging, or prod.

This was checked by the validation rule at variables.tf:4,3-13.
```

**Fix**: Provide a value that passes the validation:

```hcl
# WRONG
environment = "production"  # Not in the allowed list

# RIGHT
environment = "prod"  # Matches the validation rule
```

## Cause 4: Complex Type Mismatch

With complex types (objects, lists of objects, maps of maps), the structure needs to match exactly:

```hcl
variable "server_config" {
  type = object({
    instance_type = string
    ami_id        = string
    disk_size     = number
    tags          = map(string)
  })
}
```

```hcl
# WRONG - missing required fields and wrong types
server_config = {
  instance_type = "t3.micro"
  # Missing: ami_id
  disk_size     = "20"  # Should be number, not string
  # Missing: tags
}

# RIGHT - all fields present with correct types
server_config = {
  instance_type = "t3.micro"
  ami_id        = "ami-0123456789abcdef0"
  disk_size     = 20
  tags = {
    Name = "web-server"
    Env  = "prod"
  }
}
```

## Cause 5: Null Value Where Not Expected

Passing null to a variable that does not accept it:

```hcl
variable "instance_type" {
  type = string
  # nullable defaults to true in Terraform 1.x
}

# This works:
instance_type = null

# But if the variable is used directly:
resource "aws_instance" "web" {
  instance_type = var.instance_type  # null causes an error at apply time
}
```

**Fix**: Use `nullable = false` to prevent null values, or handle nulls in your code:

```hcl
variable "instance_type" {
  type     = string
  nullable = false  # Rejects null values at plan time
  default  = "t3.micro"
}

# Or handle nulls with a fallback
locals {
  instance_type = coalesce(var.instance_type, "t3.micro")
}
```

## Cause 6: Variable File Format Issues

If your `.tfvars` file has syntax errors:

```hcl
# WRONG - various syntax issues in terraform.tfvars

# Missing equals sign
environment "prod"

# Using colon instead of equals
region: "us-east-1"

# Missing quotes around string
name = my-server

# Trailing comma in list (actually OK in HCL, but watch out in JSON)
subnets = ["a", "b", "c",]
```

```hcl
# RIGHT
environment = "prod"
region      = "us-east-1"
name        = "my-server"
subnets     = ["a", "b", "c"]
```

If you are using a `.tfvars.json` file, make sure it is valid JSON:

```json
{
  "environment": "prod",
  "region": "us-east-1",
  "instance_count": 3,
  "enable_monitoring": true,
  "tags": {
    "Name": "web-server",
    "Environment": "prod"
  }
}
```

## Cause 7: Variable Set Multiple Times

If you set the same variable in multiple places, Terraform follows a precedence order:

1. Environment variables (`TF_VAR_name`)
2. `terraform.tfvars`
3. `*.auto.tfvars` (alphabetical order)
4. `-var` and `-var-file` on the command line (last one wins)

```bash
# This can cause confusion:
export TF_VAR_environment="dev"
terraform plan -var="environment=prod"
# Result: environment = "prod" (CLI overrides env var)
```

If the value does not seem right, check all the places it could be set:

```bash
# Check for environment variables
env | grep TF_VAR_

# Check for .tfvars files
ls *.tfvars *.auto.tfvars 2>/dev/null

# Check the command being run for -var flags
```

## Debugging Variable Values

Use `terraform console` to test variable values interactively:

```bash
terraform console -var="environment=prod"

> var.environment
"prod"

> type(var.environment)
string
```

Or add a temporary output:

```hcl
output "debug_variable" {
  value = {
    type  = type(var.server_config)
    value = var.server_config
  }
}
```

## Writing Better Variable Definitions

To prevent these errors from happening, write defensive variable definitions:

```hcl
variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, or prod)"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "instance_count" {
  type        = number
  description = "Number of instances to create"
  default     = 1

  validation {
    condition     = var.instance_count > 0 && var.instance_count <= 100
    error_message = "Instance count must be between 1 and 100."
  }
}

variable "cidr_block" {
  type        = string
  description = "VPC CIDR block"

  validation {
    condition     = can(cidrnetmask(var.cidr_block))
    error_message = "Must be a valid CIDR block (e.g., 10.0.0.0/16)."
  }
}
```

Clear descriptions, sensible defaults, and validation rules go a long way toward making variable errors obvious and easy to fix when they happen.
