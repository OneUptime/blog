# How to Handle Module Errors and Debugging in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Debugging, Troubleshooting, Infrastructure as Code

Description: Practical techniques for debugging Terraform module errors including state inspection, logging, validation, and common troubleshooting patterns.

---

Terraform modules add a layer of abstraction that can make debugging harder. When something goes wrong inside a module, the error messages often point to the module internals rather than the actual problem in your configuration. This post covers the debugging techniques that will save you hours of frustration when working with Terraform modules.

## Understanding Module Error Messages

Terraform error messages include the module path, which tells you exactly where in the module hierarchy the error occurred.

```text
Error: Invalid value for variable

  on modules/networking/main.tf line 15, in module "subnets":
  15:   cidr_blocks = var.subnet_cidrs

  module.networking.module.subnets.var.cidr_blocks

The given value is not suitable for var.cidr_blocks defined at
modules/networking/modules/subnets/variables.tf:3,1-25: list of string required.
```

The path `module.networking.module.subnets.var.cidr_blocks` tells you the exact chain: root module called `networking`, which called `subnets`, and the issue is with the `cidr_blocks` variable. Reading these paths carefully is the first step in debugging.

## Enabling Detailed Logging

Terraform's built-in logging is your best friend for module debugging. Set the `TF_LOG` environment variable to get detailed output.

```bash
# Set log level - TRACE is the most verbose
export TF_LOG=TRACE

# Run your command
terraform plan

# For less verbose output, use DEBUG, INFO, WARN, or ERROR
export TF_LOG=DEBUG

# Send logs to a file instead of stderr
export TF_LOG_PATH="terraform-debug.log"
terraform plan

# Clean up when done
unset TF_LOG
unset TF_LOG_PATH
```

The `TRACE` level shows every API call, every provider operation, and the full evaluation of expressions. This is extremely helpful when a module is not behaving as expected because you can see exactly what values are being passed around.

## Using terraform console for Expression Debugging

The `terraform console` command lets you evaluate expressions interactively, including module outputs.

```bash
# Start the console
terraform console

# Check a module output value
> module.networking.vpc_id
"vpc-0abc123def456"

# Evaluate complex expressions
> module.networking.private_subnet_ids
[
  "subnet-0abc123",
  "subnet-0def456",
  "subnet-0ghi789",
]

# Test functions and transformations
> length(module.networking.private_subnet_ids)
3

# Check what a local value resolves to
> module.compute.local.cluster_name
"myapp-production-cluster"
```

## Debugging Variable Passing Between Modules

A common source of errors is passing the wrong type or value between modules. Use outputs to inspect intermediate values.

```hcl
# Add temporary debug outputs to your root module
output "debug_vpc_id" {
  description = "Debug: VPC ID from networking module"
  value       = module.networking.vpc_id
}

output "debug_subnet_ids" {
  description = "Debug: Subnet IDs from networking module"
  value       = module.networking.private_subnet_ids
}

output "debug_subnet_types" {
  description = "Debug: Types of subnet IDs"
  value       = [for s in module.networking.private_subnet_ids : "${s} (${type(s)})"]
}
```

Then run `terraform plan` to see these values without applying anything:

```bash
# Plan will show the output values
terraform plan

# Or use terraform output after an apply
terraform output debug_vpc_id
```

## Handling Provider Issues in Modules

Modules inherit providers from their parent. When a provider is misconfigured, errors can surface deep inside a module.

```hcl
# This error often means the provider is not correctly passed to the module
# Error: No provider "aws" with alias "us_east_1" has been declared

# Fix: Explicitly pass providers to modules that need aliased providers
module "cdn" {
  source = "./modules/cdn"

  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1  # Explicitly pass the aliased provider
  }

  domain_name = "example.com"
}
```

## Using terraform validate Effectively

Always validate before planning. The `validate` command catches syntax errors and type mismatches early.

```bash
# Basic validation
terraform validate

# Validate with JSON output for parsing in CI/CD
terraform validate -json

# Common validation errors with modules:

# 1. Missing required variable
# Error: Missing required argument
#   module.networking: The argument "vpc_cidr" is required

# 2. Wrong variable type
# Error: Invalid value for variable
#   Expected string, got number

# 3. Unknown module output
# Error: Unsupported attribute
#   module.networking.nonexistent_output
```

## Debugging State Issues

When modules behave unexpectedly, the state file often holds the answer. Use `terraform state` commands to inspect what Terraform thinks exists.

```bash
# List all resources including those in modules
terraform state list

# Filter by module
terraform state list module.networking
# Output:
# module.networking.aws_vpc.this
# module.networking.aws_subnet.public[0]
# module.networking.aws_subnet.public[1]
# module.networking.aws_subnet.private[0]
# module.networking.aws_subnet.private[1]

# Show detailed state for a specific resource in a module
terraform state show module.networking.aws_vpc.this

# Show the full module address for nested modules
terraform state list module.networking.module.subnets
```

## Targeted Plans for Isolation

When debugging a specific module, use `-target` to isolate it from the rest of the infrastructure.

```bash
# Plan only the networking module
terraform plan -target=module.networking

# Plan a specific resource within a module
terraform plan -target=module.networking.aws_vpc.this

# Apply only the problematic module
terraform apply -target=module.database

# Note: targeted applies should only be used for debugging
# Always run a full plan/apply afterwards
```

## Common Module Errors and Solutions

### Error: Cycle Detected

```text
Error: Cycle: module.a.output.id, module.b.var.a_id, module.b.output.id, module.a.var.b_id
```

This means two modules depend on each other. Break the cycle by restructuring your modules or using `depends_on`.

```hcl
# Break the cycle by removing one direction of the dependency
# Instead of A depending on B and B depending on A,
# create a third module C that both A and B depend on

module "shared" {
  source = "./modules/shared"
}

module "a" {
  source    = "./modules/a"
  shared_id = module.shared.id
}

module "b" {
  source    = "./modules/b"
  shared_id = module.shared.id
  a_id      = module.a.id
}
```

### Error: Module Not Found

```text
Error: Module not installed
  module.networking: This module is not yet installed.
  Run "terraform init" to install all modules.
```

```bash
# Fix: Re-initialize to download modules
terraform init

# If using local modules and the path is wrong
terraform init -upgrade

# Check the .terraform/modules directory
ls -la .terraform/modules/
```

### Error: For_each and Count Inside Modules

```hcl
# When using count or for_each with modules,
# you cannot use values that are not known until apply time

# This will fail if module.networking has not been applied yet
module "services" {
  source   = "./modules/service"
  for_each = toset(module.networking.subnet_ids)  # Error: value not known

  subnet_id = each.value
}

# Fix: Use a variable instead of a module output for for_each
variable "service_names" {
  type    = list(string)
  default = ["api", "web", "worker"]
}

module "services" {
  source   = "./modules/service"
  for_each = toset(var.service_names)

  name      = each.value
  subnet_id = module.networking.private_subnet_ids[0]
}
```

## Adding Preconditions and Postconditions

Terraform 1.2 introduced lifecycle preconditions and postconditions that make module errors much more informative.

```hcl
# Inside your module, add preconditions to catch bad inputs early
resource "aws_instance" "this" {
  ami           = var.ami_id
  instance_type = var.instance_type
  subnet_id     = var.subnet_id

  lifecycle {
    # Verify the AMI exists before trying to create the instance
    precondition {
      condition     = var.ami_id != ""
      error_message = "The ami_id variable must not be empty."
    }

    # Verify the instance was created in the correct subnet
    postcondition {
      condition     = self.subnet_id == var.subnet_id
      error_message = "Instance was not created in the expected subnet."
    }
  }
}
```

## Debugging with Replace and Taint

When a resource inside a module is in a bad state, you can force its recreation.

```bash
# Replace a specific resource inside a module
terraform apply -replace=module.compute.aws_instance.this

# Replace all resources in a module (be careful with this)
# First list, then replace selectively
terraform state list module.compute
terraform apply -replace=module.compute.aws_ecs_service.this
```

## Conclusion

Debugging Terraform modules comes down to understanding error paths, using the right logging level, and knowing how to inspect state. Start with `terraform validate` to catch obvious issues, use `TF_LOG=DEBUG` for deeper investigation, and lean on `terraform console` for interactive exploration. Adding preconditions to your modules will also catch problems early with clear error messages instead of cryptic failures deep in the provider layer.

For related content, see our posts on [how to handle circular dependencies between modules](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-circular-dependencies-between-modules/view) and [how to use local modules during development in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-use-local-modules-during-development-in-terraform/view).
