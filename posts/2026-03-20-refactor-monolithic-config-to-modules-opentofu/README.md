# How to Refactor Monolithic Configurations into Modules in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Module, Refactoring, Moved Blocks, Infrastructure as Code

Description: Learn how to break apart a monolithic OpenTofu configuration into reusable modules without disrupting running infrastructure.

Monolithic configurations - all resources in a single directory - become unmanageable as they grow. Refactoring them into modules improves organization, enables reuse, and makes it easier for multiple teams to work on infrastructure concurrently. This guide provides a step-by-step approach using `moved` blocks for safe migration.

## Signs You Need Modularization

- A single `main.tf` longer than ~200 lines.
- Resources from different domains (networking, compute, database) all in one file.
- Copy-pasting entire configurations to create similar environments.
- Teams waiting on each other to edit the same files.

## Step 1: Identify Logical Groupings

Group resources by domain:

```text
Monolithic main.tf (500+ lines)
├── VPC, subnets, route tables, internet gateway → modules/networking/
├── Security groups → modules/networking/ or modules/security/
├── EC2 instances, ASGs, launch templates → modules/compute/
├── RDS, ElastiCache → modules/database/
└── S3 buckets, IAM roles → modules/storage/, modules/iam/
```

## Step 2: Create Module Directories and Files

```bash
mkdir -p modules/{networking,compute,database,storage,iam}

# Each module gets these files

for mod in networking compute database storage iam; do
  touch modules/$mod/{main.tf,variables.tf,outputs.tf}
done
```

## Step 3: Move Resources to Modules

Move resource blocks from `main.tf` to the appropriate module file. Example for networking:

```hcl
# modules/networking/main.tf
resource "aws_vpc" "main" {
  cidr_block           = var.cidr_block
  enable_dns_hostnames = true
  tags = { Name = var.name }
}

resource "aws_subnet" "public" {
  for_each          = var.public_subnets
  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value
  availability_zone = each.key
}
```

```hcl
# modules/networking/variables.tf
variable "cidr_block"     { type = string }
variable "name"           { type = string }
variable "public_subnets" { type = map(string) }
```

```hcl
# modules/networking/outputs.tf
output "vpc_id"     { value = aws_vpc.main.id }
output "subnet_ids" { value = { for k, s in aws_subnet.public : k => s.id } }
```

## Step 4: Update the Root Configuration

Replace the monolithic resources with module calls:

```hcl
# root main.tf (after modularization)
module "networking" {
  source = "./modules/networking"
  name   = "production"
  cidr_block     = "10.0.0.0/16"
  public_subnets = {
    "us-east-1a" = "10.0.1.0/24"
    "us-east-1b" = "10.0.2.0/24"
  }
}

module "compute" {
  source     = "./modules/compute"
  vpc_id     = module.networking.vpc_id
  subnet_ids = module.networking.subnet_ids
}
```

After adding or changing module blocks, run `tofu init` before planning so OpenTofu can install or update the child modules.

## Step 5: Add moved Blocks for All Migrated Resources

This is the critical step - map every resource from its old root address to its new module address:

```hcl
# moved.tf

moved {
  from = aws_vpc.main
  to   = module.networking.aws_vpc.main
}

moved {
  from = aws_subnet.public["us-east-1a"]
  to   = module.networking.aws_subnet.public["us-east-1a"]
}

moved {
  from = aws_subnet.public["us-east-1b"]
  to   = module.networking.aws_subnet.public["us-east-1b"]
}

moved {
  from = aws_instance.web
  to   = module.compute.aws_instance.web
}

# ... one moved block per resource or resource instance whose address changes
```

## Step 6: Verify Incrementally

Migrate one module at a time to keep changes reviewable:

```bash
# Apply networking module first
tofu init   # Re-run after adding or changing module blocks
tofu plan   # Should show only "moved" annotations for networking resources
tofu apply

# Then compute
# Add compute moved blocks, run plan and apply
# Then database, etc.
```

## Conclusion

Modularizing a monolithic configuration is a multi-step process that requires planning, careful `moved` block authoring, and incremental verification. Take it one module at a time, run `tofu plan` after each batch of `moved` blocks, and never apply until the plan shows only moves - no creates or destroys.
