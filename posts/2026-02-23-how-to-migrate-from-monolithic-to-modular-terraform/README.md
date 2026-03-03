# How to Migrate from Monolithic to Modular Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, Refactoring, Migration, Infrastructure as Code

Description: Learn how to break apart a monolithic Terraform configuration into well-organized modules for better reusability, maintainability, and team collaboration.

---

Monolithic Terraform configurations start simple but become unwieldy as infrastructure grows. A single state file managing hundreds of resources leads to slow plan times, risky applies, and team collaboration bottlenecks. Migrating to a modular structure improves maintainability, enables parallel team workflows, and reduces the blast radius of changes. This guide walks you through the migration process.

## Signs You Need to Modularize

Your Terraform configuration needs modularization when `terraform plan` takes minutes to complete, multiple teams step on each other's changes, a single bad apply could affect unrelated infrastructure, your main.tf exceeds a few hundred lines, or you find yourself copying resource blocks between projects.

## Planning the Module Structure

Before moving code, design your target structure:

```text
project/
  modules/
    networking/
      main.tf
      variables.tf
      outputs.tf
    compute/
      main.tf
      variables.tf
      outputs.tf
    database/
      main.tf
      variables.tf
      outputs.tf
    monitoring/
      main.tf
      variables.tf
      outputs.tf
  environments/
    dev/
      main.tf         # Calls modules with dev values
      terraform.tfvars
    staging/
      main.tf
      terraform.tfvars
    production/
      main.tf
      terraform.tfvars
```

Group resources by domain, lifecycle, and team ownership rather than by resource type.

## Step 1: Create the Module

Extract related resources into a module:

```hcl
# modules/networking/main.tf
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true

  tags = {
    Name        = "${var.environment}-vpc"
    Environment = var.environment
  }
}

resource "aws_subnet" "public" {
  for_each = var.public_subnets

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az

  tags = {
    Name = "${var.environment}-public-${each.key}"
  }
}

resource "aws_subnet" "private" {
  for_each = var.private_subnets

  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value.cidr
  availability_zone = each.value.az

  tags = {
    Name = "${var.environment}-private-${each.key}"
  }
}
```

```hcl
# modules/networking/variables.tf
variable "environment" {
  type = string
}

variable "vpc_cidr" {
  type = string
}

variable "public_subnets" {
  type = map(object({
    cidr = string
    az   = string
  }))
}

variable "private_subnets" {
  type = map(object({
    cidr = string
    az   = string
  }))
}
```

```hcl
# modules/networking/outputs.tf
output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_ids" {
  value = { for k, v in aws_subnet.public : k => v.id }
}

output "private_subnet_ids" {
  value = { for k, v in aws_subnet.private : k => v.id }
}
```

## Step 2: Reference the Module

Update your root configuration to call the module:

```hcl
# environments/production/main.tf
module "networking" {
  source = "../../modules/networking"

  environment = "production"
  vpc_cidr    = "10.0.0.0/16"

  public_subnets = {
    "us-east-1a" = { cidr = "10.0.1.0/24", az = "us-east-1a" }
    "us-east-1b" = { cidr = "10.0.2.0/24", az = "us-east-1b" }
  }

  private_subnets = {
    "us-east-1a" = { cidr = "10.0.10.0/24", az = "us-east-1a" }
    "us-east-1b" = { cidr = "10.0.11.0/24", az = "us-east-1b" }
  }
}
```

## Step 3: Move State to Module Addresses

Use moved blocks to transfer state from root-level to module addresses:

```hcl
# moved.tf - Temporary file for state migration
moved {
  from = aws_vpc.main
  to   = module.networking.aws_vpc.main
}

moved {
  from = aws_subnet.public_1a
  to   = module.networking.aws_subnet.public["us-east-1a"]
}

moved {
  from = aws_subnet.public_1b
  to   = module.networking.aws_subnet.public["us-east-1b"]
}

moved {
  from = aws_subnet.private_1a
  to   = module.networking.aws_subnet.private["us-east-1a"]
}

moved {
  from = aws_subnet.private_1b
  to   = module.networking.aws_subnet.private["us-east-1b"]
}
```

Or use CLI state moves:

```bash
# Move resources to module addresses
terraform state mv aws_vpc.main module.networking.aws_vpc.main
terraform state mv 'aws_subnet.public_1a' 'module.networking.aws_subnet.public["us-east-1a"]'
terraform state mv 'aws_subnet.public_1b' 'module.networking.aws_subnet.public["us-east-1b"]'
```

## Step 4: Verify the Migration

```bash
# Initialize to register the module
terraform init

# Verify no changes
terraform plan
# Should show: No changes (with moved blocks) or moves only
```

## Step 5: Repeat for Each Domain

Follow the same process for each resource domain:

```bash
# Compute module
terraform state mv aws_instance.web module.compute.aws_instance.web
terraform state mv aws_lb.web module.compute.aws_lb.web

# Database module
terraform state mv aws_db_instance.primary module.database.aws_db_instance.primary

# Monitoring module
terraform state mv aws_cloudwatch_metric_alarm.cpu module.monitoring.aws_cloudwatch_metric_alarm.cpu
```

## Splitting State Files

For large configurations, consider splitting into separate state files:

```hcl
# environments/production/networking/main.tf
terraform {
  backend "s3" {
    bucket = "terraform-state"
    key    = "production/networking/terraform.tfstate"
  }
}

module "networking" {
  source = "../../../modules/networking"
  # ...
}
```

```hcl
# environments/production/compute/main.tf
terraform {
  backend "s3" {
    bucket = "terraform-state"
    key    = "production/compute/terraform.tfstate"
  }
}

# Reference networking outputs via remote state
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "terraform-state"
    key    = "production/networking/terraform.tfstate"
  }
}

module "compute" {
  source = "../../../modules/compute"

  vpc_id    = data.terraform_remote_state.networking.outputs.vpc_id
  subnet_id = data.terraform_remote_state.networking.outputs.private_subnet_ids["us-east-1a"]
}
```

## Handling Cross-Module Dependencies

When splitting state, use remote state data sources for cross-module references:

```hcl
# Output from networking module
output "vpc_id" {
  value = module.networking.vpc_id
}

# Input to compute module via remote state
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "terraform-state"
    key    = "production/networking/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "web" {
  subnet_id = data.terraform_remote_state.networking.outputs.private_subnet_ids["us-east-1a"]
}
```

## Migration Order

Migrate modules in dependency order, starting with the least dependent:

```text
1. Networking (no dependencies)
2. Security/IAM (depends on networking)
3. Storage (depends on networking)
4. Databases (depends on networking, security)
5. Compute (depends on networking, security, databases)
6. Monitoring (depends on all others)
```

## Cleaning Up After Migration

After all environments have been migrated:

```bash
# Remove moved blocks
rm moved.tf

# Remove old root-level resource definitions
# (already replaced by module calls)

# Remove unused variable definitions
# Terraform validate will catch references to undefined variables

# Run final verification
terraform validate
terraform plan
```

## Best Practices

Migrate one module at a time to minimize risk. Use moved blocks for state transitions whenever possible. Keep modules focused on a single domain. Define clear input variables and outputs for each module. Test each module migration with terraform plan before proceeding. Document module interfaces for other teams. Start with non-critical resources to build confidence.

## Conclusion

Migrating from monolithic to modular Terraform improves code organization, team collaboration, and operational safety. The process is methodical: design the module structure, extract resources, move state, and verify. By using moved blocks and following dependency order, you can complete the migration without disrupting running infrastructure. The effort pays off through faster plan times, safer applies, and better code reuse.

For related guides, see [How to Plan Large-Scale Terraform Migrations](https://oneuptime.com/blog/post/2026-02-23-how-to-plan-large-scale-terraform-migrations/view) and [How to Import Resources into Modules in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-import-resources-into-modules-in-terraform/view).
