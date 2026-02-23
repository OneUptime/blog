# How to Migrate from Inline Resources to Modules in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Migration, Refactoring, Infrastructure as Code

Description: Step-by-step guide to migrating existing inline Terraform resources into reusable modules using state moves, imports, and careful refactoring techniques.

---

You have a Terraform configuration that started small and grew into a 2000-line main.tf file. Resources are duplicated across environments, and every change requires updating the same thing in five places. It is time to extract those inline resources into modules. But how do you do that without destroying and recreating everything? This guide walks through the process step by step.

## Understanding the Challenge

When you move a resource from the root module into a child module, its address in the Terraform state changes. For example, `aws_vpc.main` becomes `module.networking.aws_vpc.this`. If you just move the code, Terraform will think the old resource was deleted and a new one needs to be created. That means downtime, and for some resources like databases, it means data loss.

The `terraform state mv` command solves this by updating the state to reflect the new addresses without touching the actual infrastructure.

## Step 1: Identify Resources to Extract

Start by grouping related resources that should become a module.

```hcl
# Before: Everything in root main.tf
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = { Name = "production-vpc" }
}

resource "aws_subnet" "public_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"
  tags = { Name = "production-public-a" }
}

resource "aws_subnet" "public_b" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1b"
  tags = { Name = "production-public-b" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags = { Name = "production-igw" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = { Name = "production-public-rt" }
}

# Plus dozens more resources for the database, compute, etc.
```

## Step 2: Create the Module

Build your module with the same resources but parameterized with variables.

```hcl
# modules/networking/variables.tf
variable "name" {
  type = string
}

variable "cidr_block" {
  type = string
}

variable "public_subnets" {
  type = list(object({
    cidr_block        = string
    availability_zone = string
  }))
}

variable "tags" {
  type    = map(string)
  default = {}
}
```

```hcl
# modules/networking/main.tf
resource "aws_vpc" "this" {
  cidr_block           = var.cidr_block
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags = merge(var.tags, { Name = "${var.name}-vpc" })
}

resource "aws_subnet" "public" {
  count = length(var.public_subnets)

  vpc_id            = aws_vpc.this.id
  cidr_block        = var.public_subnets[count.index].cidr_block
  availability_zone = var.public_subnets[count.index].availability_zone

  tags = merge(var.tags, {
    Name = "${var.name}-public-${count.index}"
  })
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  tags = merge(var.tags, { Name = "${var.name}-igw" })
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.this.id
  }
  tags = merge(var.tags, { Name = "${var.name}-public-rt" })
}
```

## Step 3: Add the Module Call

Replace the inline resources with a module call in your root module.

```hcl
# After: Clean root module calling the networking module
module "networking" {
  source = "./modules/networking"

  name       = "production"
  cidr_block = "10.0.0.0/16"

  public_subnets = [
    {
      cidr_block        = "10.0.1.0/24"
      availability_zone = "us-east-1a"
    },
    {
      cidr_block        = "10.0.2.0/24"
      availability_zone = "us-east-1b"
    }
  ]
}
```

## Step 4: Move State Entries

This is the critical step. Before running `terraform plan`, move the state entries to match the new resource addresses.

```bash
# First, back up your state
terraform state pull > state-backup.json

# Move the VPC
terraform state mv 'aws_vpc.main' 'module.networking.aws_vpc.this'

# Move the subnets - note the index change
# Individual resources become count-indexed resources
terraform state mv 'aws_subnet.public_a' 'module.networking.aws_subnet.public[0]'
terraform state mv 'aws_subnet.public_b' 'module.networking.aws_subnet.public[1]'

# Move the internet gateway
terraform state mv 'aws_internet_gateway.main' 'module.networking.aws_internet_gateway.this'

# Move the route table
terraform state mv 'aws_route_table.public' 'module.networking.aws_route_table.public'
```

## Step 5: Verify with Plan

After moving state, run a plan to verify nothing will be destroyed.

```bash
# Initialize to register the new module
terraform init

# Plan should show no changes (or only tag/name updates)
terraform plan
```

If the plan shows resources being destroyed and recreated, something went wrong with the state moves. Check the addresses carefully.

## Handling Common Migration Scenarios

### Individual Resources to count/for_each

When you have individually named resources that become indexed:

```bash
# Before: aws_subnet.web, aws_subnet.app, aws_subnet.db
# After: module.networking.aws_subnet.private[0], [1], [2]

terraform state mv 'aws_subnet.web' 'module.networking.aws_subnet.private[0]'
terraform state mv 'aws_subnet.app' 'module.networking.aws_subnet.private[1]'
terraform state mv 'aws_subnet.db' 'module.networking.aws_subnet.private[2]'
```

### Moving to for_each with String Keys

When migrating to `for_each` instead of `count`:

```bash
# Before: aws_subnet.web, aws_subnet.app
# After: module.networking.aws_subnet.this["web"], module.networking.aws_subnet.this["app"]

terraform state mv 'aws_subnet.web' 'module.networking.aws_subnet.this["web"]'
terraform state mv 'aws_subnet.app' 'module.networking.aws_subnet.this["app"]'
```

### Moving Resources Between Modules

When restructuring existing modules:

```bash
# Move from one module to another
terraform state mv \
  'module.old_module.aws_s3_bucket.data' \
  'module.new_module.aws_s3_bucket.this'
```

## Using moved Blocks (Terraform 1.1+)

Terraform 1.1 introduced `moved` blocks that handle state moves declaratively, which is much safer than manual state commands.

```hcl
# Add moved blocks to your configuration
# These tell Terraform about the address changes

moved {
  from = aws_vpc.main
  to   = module.networking.aws_vpc.this
}

moved {
  from = aws_subnet.public_a
  to   = module.networking.aws_subnet.public[0]
}

moved {
  from = aws_subnet.public_b
  to   = module.networking.aws_subnet.public[1]
}

moved {
  from = aws_internet_gateway.main
  to   = module.networking.aws_internet_gateway.this
}

moved {
  from = aws_route_table.public
  to   = module.networking.aws_route_table.public
}
```

With `moved` blocks, you just run `terraform plan` and Terraform handles the state updates automatically during the next apply. This is the preferred approach because:

- It works with remote state and team workflows
- It is version controlled alongside the code changes
- Multiple team members do not need to coordinate state moves

## Step-by-Step Migration Checklist

Here is the process I follow for every migration:

1. **Backup state** - `terraform state pull > backup-$(date +%Y%m%d).json`
2. **Create the module** with parameterized resources
3. **Add the module call** in the root module
4. **Remove the old inline resources** from the root module
5. **Add moved blocks** for every resource being relocated
6. **Run terraform plan** - should show zero or minimal changes
7. **Apply** - state is updated, infrastructure untouched
8. **Remove moved blocks** after one successful apply (optional, they are idempotent)

## Handling Outputs That Changed

If other resources reference the old resource addresses, update those references too.

```hcl
# Before
output "vpc_id" {
  value = aws_vpc.main.id
}

# After
output "vpc_id" {
  value = module.networking.vpc_id
}
```

## Conclusion

Migrating from inline resources to modules does not have to be scary. The combination of `moved` blocks and careful planning means you can refactor your Terraform code without touching any real infrastructure. Start with your most duplicated resources, extract them into modules, and gradually clean up your codebase. The key is to always run `terraform plan` after state moves and verify that the plan shows no unexpected changes.

For more on module design, see our posts on [how to organize child modules in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-organize-child-modules-in-terraform/view) and [how to handle module state when upgrading versions](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-module-state-when-upgrading-versions/view).
