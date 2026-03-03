# How to Refactor Terraform Code into Modules

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Refactoring, IaC, DevOps

Description: A step-by-step guide to refactoring existing Terraform configurations into reusable modules without destroying and recreating resources using moved blocks and state operations.

---

Most Terraform projects start the same way: everything in a single directory with one big `main.tf` file. It works fine for a while. Then the file hits 500 lines, you need a second environment, and suddenly you are copy-pasting hundreds of lines of HCL and hoping you changed all the values correctly.

That is when you need to refactor into modules. But refactoring Terraform is different from refactoring application code. You cannot just move resources around freely because Terraform tracks resources by their address in the state file. Moving a resource changes its address, and Terraform interprets that as "destroy the old one, create a new one."

This guide shows how to refactor safely.

## When to Refactor

Refactor into modules when you notice:

- Resources being copy-pasted between configurations
- The same pattern appearing across multiple environments
- A single file growing past 200-300 lines
- Multiple team members stepping on each other's changes

Do not refactor for the sake of it. If something is only used once and is unlikely to be reused, leaving it in the root module is fine.

## Step 1: Identify Module Boundaries

Before touching any code, identify the logical groups of resources that should become modules. Look for resources that:

- Are always created together
- Share a common lifecycle
- Would make sense to reuse elsewhere

For example, in a typical web application, you might identify:

```text
# Current flat structure
resource "aws_vpc" "main" { ... }
resource "aws_subnet" "public" { ... }
resource "aws_subnet" "private" { ... }
resource "aws_internet_gateway" "main" { ... }
resource "aws_nat_gateway" "main" { ... }
resource "aws_route_table" "public" { ... }
resource "aws_route_table" "private" { ... }
resource "aws_security_group" "web" { ... }
resource "aws_security_group" "db" { ... }
resource "aws_lb" "api" { ... }
resource "aws_lb_target_group" "api" { ... }
resource "aws_lb_listener" "https" { ... }
resource "aws_ecs_service" "api" { ... }
resource "aws_ecs_task_definition" "api" { ... }
resource "aws_rds_instance" "main" { ... }
```

Natural module boundaries:

- VPC module: vpc, subnets, gateways, route tables
- ALB module: load balancer, target groups, listeners
- ECS module: service, task definition, IAM roles
- RDS module: instance, subnet group, parameter group

## Step 2: Create the Module

Start by creating the module directory and files:

```text
modules/vpc/
  main.tf
  variables.tf
  outputs.tf
```

Write the module to accept inputs for everything that currently uses hardcoded values:

```hcl
# modules/vpc/variables.tf
variable "cidr_block" {
  description = "VPC CIDR block"
  type        = string
}

variable "name" {
  description = "Name prefix for resources"
  type        = string
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
}
```

```hcl
# modules/vpc/main.tf
resource "aws_vpc" "this" {
  cidr_block = var.cidr_block

  tags = {
    Name = var.name
  }
}

resource "aws_subnet" "public" {
  count = length(var.public_subnet_cidrs)

  vpc_id     = aws_vpc.this.id
  cidr_block = var.public_subnet_cidrs[count.index]

  tags = {
    Name = "${var.name}-public-${count.index}"
  }
}
# ... additional resources
```

## Step 3: Use the moved Block

Terraform 1.1 introduced the `moved` block, which tells Terraform that a resource has moved to a new address without needing to destroy and recreate it. This is the safest way to refactor.

```hcl
# In your root module, add moved blocks for each resource
moved {
  from = aws_vpc.main
  to   = module.vpc.aws_vpc.this
}

moved {
  from = aws_subnet.public
  to   = module.vpc.aws_subnet.public
}

moved {
  from = aws_internet_gateway.main
  to   = module.vpc.aws_internet_gateway.this
}
```

Then update your root module to use the new module:

```hcl
module "vpc" {
  source = "./modules/vpc"

  name                 = "production"
  cidr_block           = "10.0.0.0/16"
  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnet_cidrs = ["10.0.10.0/24", "10.0.11.0/24"]
}
```

## Step 4: Verify with Plan

Run `terraform plan` to verify that no resources will be destroyed or recreated:

```bash
terraform plan
```

You should see output like:

```text
# module.vpc.aws_vpc.this will be moved from aws_vpc.main
# (no changes)

# module.vpc.aws_subnet.public[0] will be moved from aws_subnet.public[0]
# (no changes)
```

If you see any resources being destroyed or created, something is wrong with the mapping. Fix the `moved` blocks before applying.

## Step 5: Apply and Clean Up

Once the plan shows only moves and no destructive changes:

```bash
terraform apply
```

After applying, the `moved` blocks have served their purpose. You can remove them after the state has been updated, but it is good practice to keep them for a few versions so that any colleagues who have not pulled the latest code yet will also get their state updated correctly.

## Handling Count and For_each Changes

One of the trickiest parts of refactoring is when you change how resources are indexed. For example, if you originally had:

```hcl
resource "aws_subnet" "public_a" { ... }
resource "aws_subnet" "public_b" { ... }
```

And your module uses `count`:

```hcl
resource "aws_subnet" "public" {
  count = 2
  ...
}
```

You need moved blocks for each:

```hcl
moved {
  from = aws_subnet.public_a
  to   = module.vpc.aws_subnet.public[0]
}

moved {
  from = aws_subnet.public_b
  to   = module.vpc.aws_subnet.public[1]
}
```

If your module uses `for_each` instead:

```hcl
moved {
  from = aws_subnet.public_a
  to   = module.vpc.aws_subnet.public["us-east-1a"]
}
```

## Alternative: State Move Commands

Before the `moved` block existed, you had to use `terraform state mv`:

```bash
# Move a resource into a module in the state file
terraform state mv aws_vpc.main module.vpc.aws_vpc.this
terraform state mv aws_subnet.public module.vpc.aws_subnet.public
```

This still works, but `moved` blocks are better because:

- They are tracked in version control
- They are applied automatically for all team members
- They do not require manual state manipulation
- They can be reviewed in code review

## Incremental Refactoring Strategy

Do not try to refactor everything at once. Take an incremental approach:

1. Identify one group of resources to extract
2. Create the module
3. Add `moved` blocks
4. Verify with `terraform plan`
5. Apply
6. Move on to the next group

This limits the blast radius of any mistakes.

## Updating References

After moving resources into a module, update all references to use module outputs:

```hcl
# Before refactoring
resource "aws_ecs_service" "api" {
  # Direct reference to resource
  network_configuration {
    subnets = [aws_subnet.private_a.id, aws_subnet.private_b.id]
  }
}

# After refactoring
resource "aws_ecs_service" "api" {
  # Reference module output
  network_configuration {
    subnets = module.vpc.private_subnet_ids
  }
}
```

Make sure your module outputs expose everything that other resources reference.

## Summary

Refactoring Terraform into modules is straightforward once you understand the tools. Use `moved` blocks to tell Terraform about address changes, verify with `terraform plan`, and apply incrementally. The result is a cleaner, more reusable codebase that scales with your team.

For more details on the moved block, see [how to use the moved block when refactoring modules](https://oneuptime.com/blog/post/2026-02-23-terraform-moved-block-refactoring-modules/view).
