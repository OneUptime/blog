# How to Fix Terraform Module Output Mismatch Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Troubleshooting, Infrastructure as Code, Modules

Description: Troubleshoot and fix Terraform module output mismatch errors including missing outputs, type mismatches, and incorrect references between modules.

---

Terraform module outputs are the primary way modules communicate with the rest of your configuration. When something goes wrong with those outputs, you get errors that can be confusing because the problem is often in a different file than where the error points. This guide covers the most common module output mismatch scenarios and how to fix each one.

## What the Error Looks Like

Module output mismatches typically produce errors like these:

```
Error: Unsupported attribute

  on main.tf line 15, in resource "aws_instance" "web":
  15:   subnet_id = module.vpc.public_subnet_id

This object has no attribute named "public_subnet_id".
```

Or a type mismatch:

```
Error: Invalid value for module argument

  on main.tf line 8, in module "app":
   8:   subnet_ids = module.vpc.public_subnet_id

The given value is not suitable for module.app variable "subnet_ids":
string required.
```

These errors mean the output you are referencing either does not exist or returns a different type than what the consumer expects.

## Cause 1: Referencing a Non-Existent Output

The most basic case. You reference `module.vpc.public_subnet_id` but the module only defines `public_subnet_ids` (plural).

Check what outputs the module actually exposes:

```bash
# If using a local module
grep -n "output" ./modules/vpc/outputs.tf
```

Or look at the module documentation if it is from the registry. The fix is simply to use the correct output name:

```hcl
# Wrong
subnet_id = module.vpc.public_subnet_id

# Right - check the actual output name
subnet_id = module.vpc.public_subnet_ids[0]
```

## Cause 2: Output Type Does Not Match Expected Input

A module might output a list of subnet IDs, but you are passing it to an argument that expects a single string:

```hcl
# Module output definition (in the child module)
output "subnet_ids" {
  value = aws_subnet.public[*].id
  # This returns a list like ["subnet-abc123", "subnet-def456"]
}

# Wrong - passing a list where a string is expected
resource "aws_instance" "web" {
  subnet_id = module.vpc.subnet_ids
  # subnet_id expects a single string, not a list
}

# Fix - select one element from the list
resource "aws_instance" "web" {
  subnet_id = module.vpc.subnet_ids[0]
}
```

The reverse is also common. You need a list but the output gives you a single value:

```hcl
# Module outputs a single string
output "subnet_id" {
  value = aws_subnet.main.id
}

# You need a list
resource "aws_lb" "main" {
  subnets = [module.vpc.subnet_id]
  # Wrap it in brackets to make a list
}
```

## Cause 3: Module Output Depends on Conditional Resources

If the module creates resources conditionally, the output might not exist in all scenarios:

```hcl
# Inside the module
resource "aws_nat_gateway" "main" {
  count = var.enable_nat ? 1 : 0
  # ...
}

output "nat_gateway_id" {
  value = aws_nat_gateway.main[0].id
  # This fails when count is 0
}
```

Fix the output to handle the conditional case:

```hcl
output "nat_gateway_id" {
  value = var.enable_nat ? aws_nat_gateway.main[0].id : null
}
```

Or use `try()` for a cleaner approach:

```hcl
output "nat_gateway_id" {
  value = try(aws_nat_gateway.main[0].id, null)
}
```

Then in the consuming code, handle the null:

```hcl
resource "aws_route" "nat" {
  count = module.vpc.nat_gateway_id != null ? 1 : 0

  route_table_id         = aws_route_table.private.id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id         = module.vpc.nat_gateway_id
}
```

## Cause 4: Output Changed After Module Upgrade

You upgrade a module version and suddenly your outputs break. Module authors sometimes rename or restructure outputs between versions.

```hcl
# This worked with v3.x of the VPC module
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 4.0"
  # ...
}

# But v4.x renamed the output
resource "aws_instance" "web" {
  subnet_id = module.vpc.public_subnets[0]
  # Might have been module.vpc.public_subnet_ids[0] in v3.x
}
```

Always read the changelog or migration guide when upgrading module versions. The Terraform Registry shows the outputs tab for each module version.

## Cause 5: for_each Module Instances

When you use `for_each` on a module, the output structure changes. You cannot reference `module.vpc.subnet_id` directly because there are multiple instances:

```hcl
module "vpc" {
  for_each = toset(["us-east-1", "us-west-2"])
  source   = "./modules/vpc"
  region   = each.key
}

# Wrong - module.vpc is now a map, not a single instance
resource "aws_instance" "web" {
  subnet_id = module.vpc.subnet_id
}

# Right - reference a specific instance
resource "aws_instance" "web" {
  subnet_id = module.vpc["us-east-1"].subnet_id
}

# Or iterate over all instances
output "all_subnet_ids" {
  value = { for k, v in module.vpc : k => v.subnet_id }
}
```

The same applies to `count`:

```hcl
module "vpc" {
  count  = 2
  source = "./modules/vpc"
}

# Reference by index
resource "aws_instance" "web" {
  subnet_id = module.vpc[0].subnet_id
}
```

## Cause 6: Nested Module Outputs Not Propagated

If you have a nested module structure (module A calls module B), the inner module's outputs are not automatically available to the root. You must explicitly pass them through.

```hcl
# modules/infrastructure/main.tf
module "vpc" {
  source = "../vpc"
}

# You must re-export the output in modules/infrastructure/outputs.tf
output "vpc_id" {
  value = module.vpc.vpc_id
}
```

If you forget the intermediate output, the root module cannot access it:

```hcl
# root main.tf
module "infrastructure" {
  source = "./modules/infrastructure"
}

# This only works if infrastructure module re-exports vpc_id
resource "aws_security_group" "main" {
  vpc_id = module.infrastructure.vpc_id
}
```

## Cause 7: Sensitive Output Mismatch

If a module marks an output as sensitive, you might hit errors when using it in contexts that expect non-sensitive values:

```hcl
# In the module
output "db_password" {
  value     = random_password.db.result
  sensitive = true
}

# In the root module - this can cause issues in some contexts
output "connection_string" {
  value = "postgres://admin:${module.db.db_password}@${module.db.endpoint}/mydb"
  # Error: output depends on sensitive values
}
```

Fix by marking the consuming output as sensitive too:

```hcl
output "connection_string" {
  value     = "postgres://admin:${module.db.db_password}@${module.db.endpoint}/mydb"
  sensitive = true
}
```

## Debugging Strategy

When you hit a module output mismatch, follow this process:

1. **Check the exact output name** - Look at the module's `outputs.tf` file or the registry documentation.

2. **Check the output type** - Use `terraform console` to inspect:

```bash
terraform console
> module.vpc.subnet_ids
> type(module.vpc.subnet_ids)
```

3. **Check for count/for_each** - If the module uses these, you need indexed or keyed references.

4. **Check the module version** - Output names can change between versions.

5. **Run terraform plan with detailed output** - Sometimes the plan output tells you exactly what type was expected versus what was provided.

```bash
terraform plan 2>&1 | grep -A 5 "Error"
```

## Best Practices

To avoid output mismatch issues going forward:

- **Type-constrain your outputs** - Use explicit types in output blocks where possible.
- **Document outputs clearly** - Include the type and an example value in the description.
- **Pin module versions** - Never use unpinned module versions in production.
- **Write tests** - Tools like `terraform test` or Terratest catch output mismatches before they hit production.
- **Use consistent naming** - Stick to conventions like `_ids` (plural list) vs `_id` (single string).

## Conclusion

Module output mismatches are fundamentally about two things: the output name being wrong or the output type not matching what the consumer expects. Once you identify which of these is the actual problem, the fix is usually straightforward. The trickiest cases involve conditional resources, module versioning, and for_each instances, but even those follow predictable patterns once you know what to look for.
