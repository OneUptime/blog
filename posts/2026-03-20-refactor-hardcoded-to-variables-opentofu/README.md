# How to Refactor Hardcoded Values to Variables in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Variable, Refactoring, HCL, Infrastructure as Code

Description: Learn how to systematically replace hardcoded values in OpenTofu configurations with variables to create reusable, environment-agnostic modules.

Hardcoded values - instance types, region names, CIDR blocks, account IDs - make configurations brittle and impossible to reuse across environments. Extracting them to variables is one of the most important refactoring steps in maturing an OpenTofu codebase.

## Identifying Hardcoded Values

Scan your configuration for values that might differ between environments or deployments:

```bash
# Search for potential hardcoded strings (region names, account IDs, etc.)

grep -rn '"us-east-1"' .
grep -rn '"123456789012"' .
grep -rn '"t3\.' .
grep -rn '"10\.0\.' .
```

## Step 1: Extract to Local Variables First

Start by moving hardcoded values to `locals` - this is a safe first step that doesn't change behavior:

```hcl
# Before: hardcoded throughout main.tf
resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  subnet_id     = "subnet-0123456789abcdef0"
  tags = {
    Environment = "production"
    Owner       = "platform-team"
  }
}

# Step 1: Extract to locals
locals {
  ami_id        = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  subnet_id     = "subnet-0123456789abcdef0"
  environment   = "production"
  owner         = "platform-team"
}

resource "aws_instance" "web" {
  ami           = local.ami_id
  instance_type = local.instance_type
  subnet_id     = local.subnet_id
  tags = {
    Environment = local.environment
    Owner       = local.owner
  }
}
```

## Step 2: Promote Locals to Variables

Promote values that callers should be able to override to `variables.tf`:

```hcl
# variables.tf
variable "ami_id" {
  description = "AMI ID for EC2 instances"
  type        = string
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "subnet_id" {
  description = "Subnet ID for the EC2 instance"
  type        = string
}

variable "environment" {
  description = "Deployment environment (dev, staging, production)"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "environment must be dev, staging, or production."
  }
}

variable "owner" {
  description = "Owner tag for the EC2 instance"
  type        = string
  default     = "platform-team"
}
```

## Step 3: Update the Resource to Use Variables

```hcl
# main.tf (after full refactor)
resource "aws_instance" "web" {
  ami           = var.ami_id
  instance_type = var.instance_type
  subnet_id     = var.subnet_id
  tags = {
    Environment = var.environment
    Owner       = var.owner
    ManagedBy   = "opentofu"  # Keep genuinely constant values hardcoded or in locals
  }
}
```

## Handling Constants vs Variables

Not everything should be a variable. Keep values that are truly constant (not environment-specific) as literals or locals:

```hcl
locals {
  # These never change - keep as locals, not variables
  managed_by  = "opentofu"
  aws_service = "ec2"
}
```

## Providing Values with tfvars Files

After extracting variables, provide values through `.tfvars` files:

```hcl
# dev.tfvars
ami_id        = "ami-0c55b159cbfafe1f0"
instance_type = "t3.micro"
subnet_id     = "subnet-0123456789abcdef0"
environment   = "dev"
```

```hcl
# production.tfvars
ami_id        = "ami-0c55b159cbfafe1f0"
instance_type = "m5.large"
subnet_id     = "subnet-0fedcba9876543210"
environment   = "production"
```

```bash
# Apply with environment-specific values
tofu apply -var-file="production.tfvars"
```

## Adding Validation to Extracted Variables

Add validation when you extract variables to enforce constraints:

```hcl
variable "instance_type" {
  type        = string
  description = "EC2 instance type"

  validation {
    condition     = length(regexall("^[a-z0-9-]+\\.[a-z0-9]+$", var.instance_type)) > 0
    error_message = "Must look like an EC2 instance type, such as t3.micro or m5.large."
  }
}
```

## Conclusion

Refactoring hardcoded values to variables is foundational work that transforms a script-like configuration into a reusable module. Start with `locals` for safety, promote to `variables` when callers need to override values, add defaults for optional parameters, and validate with type constraints and `validation` blocks to catch mistakes early.
