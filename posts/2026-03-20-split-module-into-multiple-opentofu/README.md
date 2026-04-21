# How to Split a Module into Multiple Modules in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Module, Refactoring, Moved Blocks, Infrastructure as Code

Description: Learn how to safely split a large OpenTofu module into smaller, focused modules without destroying any infrastructure.

Monolithic modules become hard to understand, test, and reuse over time. Splitting them into focused modules - networking, compute, database - improves maintainability. Combined with `moved` blocks, this refactoring is safe and non-destructive.

## Planning the Split

Before writing any code, map out which resources belong to each new module:

```text
Before:
modules/app/
├── main.tf        (VPC, subnets, SGs, EC2 instances, RDS, S3 all in one file)
└── variables.tf

After:
modules/networking/   (VPC, subnets, security groups)
modules/compute/      (EC2 instances, launch templates, ASGs)
modules/data/         (RDS, S3, ElastiCache)
```

## Step 1: Create the New Module Structure

```bash
mkdir -p modules/networking modules/compute modules/data
```

Move the relevant resource blocks into each new module file.

## Step 2: Add Outputs to New Modules

Each new module needs to export values the others depend on:

```hcl
# modules/networking/outputs.tf

output "vpc_id"         { value = aws_vpc.main.id }
output "subnet_ids"     { value = [for subnet in aws_subnet.public : subnet.id] }
output "sg_web_id"      { value = aws_security_group.web.id }
```

## Step 3: Update the Root Module

Replace the single module call with calls to each new module:

```hcl
# root main.tf (after split)
module "networking" {
  source = "./modules/networking"
  cidr_block = var.vpc_cidr
}

module "compute" {
  source     = "./modules/compute"
  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.subnet_ids
  sg_ids     = [module.networking.sg_web_id]
}

module "data" {
  source     = "./modules/data"
  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.subnet_ids
}
```

## Step 4: Add moved Blocks

This is the critical step that prevents resource destruction. For every resource that moved from the old module to a new module, add a `moved` block:

```hcl
# root moved.tf

# Networking resources moved from module.app to module.networking
moved {
  from = module.app.aws_vpc.main
  to   = module.networking.aws_vpc.main
}

moved {
  from = module.app.aws_subnet.public["us-east-1a"]
  to   = module.networking.aws_subnet.public["us-east-1a"]
}

moved {
  from = module.app.aws_security_group.web
  to   = module.networking.aws_security_group.web
}

# Compute resources moved to module.compute
moved {
  from = module.app.aws_instance.web
  to   = module.compute.aws_instance.web
}

# Data resources moved to module.data
moved {
  from = module.app.aws_db_instance.main
  to   = module.data.aws_db_instance.main
}
```

## Step 5: Reinitialize and Verify with tofu plan

```bash
tofu init
tofu plan
```

Look for only `moved` annotations - no `+` creates or `-` destroys. If you see any, check that your `moved` block addresses exactly match the current state:

```bash
# Verify current state addresses
tofu state list | grep "module.app"
```

## Step 6: Apply and Validate

```bash
tofu apply
```

After the apply succeeds, verify the new state structure:

```bash
tofu state list
```

## Cleaning Up

Once the split is applied and the old module no longer exists, you can delete the old module directory. Only remove the `moved` blocks after every workspace or module consumer has successfully applied the split; for shared modules, keep historical `moved` blocks to preserve the upgrade path.

## Conclusion

Splitting a module is a multi-step refactoring that requires careful planning, new module structure, output wiring, and `moved` blocks for every relocated resource. The `moved` blocks are the safety net - without them, the split would destroy and recreate all your infrastructure.
