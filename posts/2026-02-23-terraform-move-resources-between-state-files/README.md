# How to Move Resources Between State Files in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Infrastructure as Code, Refactoring, DevOps

Description: Learn how to safely move resources between Terraform state files using terraform state mv, enabling you to split monoliths and reorganize your infrastructure code.

---

As Terraform configurations grow, you eventually need to reorganize. Maybe you want to split a monolithic state file into smaller, team-specific ones. Maybe you are moving a module from one workspace to another. Or maybe a resource logically belongs in a different Terraform project. The `terraform state mv` command lets you move resources between state files without destroying and recreating the actual infrastructure.

This guide walks through the mechanics of state moves, common patterns, and the precautions you need to take to avoid accidents.

## Why Move Resources Between States?

There are several situations where this comes up:

- Breaking a large state file into smaller, more manageable pieces
- Reorganizing resources by team ownership
- Moving shared resources (like a VPC) into a dedicated workspace
- Migrating from a flat structure to a module-based architecture across workspaces
- Splitting production and staging into separate state files

The key benefit is that moving a resource in state preserves the actual cloud resource. Without state moves, you would have to destroy the resource in one configuration and recreate it in another, which causes downtime and potential data loss.

## Prerequisites

Before moving resources between states, make sure you:

1. Back up both state files
2. Have write access to both state files
3. Know the exact resource addresses in both the source and destination configurations

```bash
# Back up the source state
terraform -chdir=/path/to/source state pull > source-state-backup.json

# Back up the destination state
terraform -chdir=/path/to/destination state pull > destination-state-backup.json
```

## Basic State Move Between Files

The `terraform state mv` command with the `-state` and `-state-out` flags moves a resource from one state file to another.

### Step 1: Identify the Resource Address

```bash
# List resources in the source state
terraform -chdir=/path/to/source state list

# Example output:
# aws_vpc.main
# aws_subnet.private[0]
# aws_subnet.private[1]
# aws_security_group.web
# aws_instance.app
```

### Step 2: Move the Resource

```bash
# Move a single resource to a different state file
terraform state mv \
  -state=/path/to/source/terraform.tfstate \
  -state-out=/path/to/destination/terraform.tfstate \
  aws_vpc.main aws_vpc.main
```

The syntax is:
```text
terraform state mv -state=SOURCE -state-out=DESTINATION SOURCE_ADDRESS DESTINATION_ADDRESS
```

You can rename the resource during the move by using a different destination address:

```bash
# Move and rename
terraform state mv \
  -state=/path/to/source/terraform.tfstate \
  -state-out=/path/to/destination/terraform.tfstate \
  aws_vpc.main aws_vpc.shared
```

## Moving Resources with Remote State

If you use remote state (S3, Terraform Cloud, etc.), the process is slightly different because you cannot directly reference the state file path. You need to work from within each configuration's directory.

### Step 1: Remove from Source

```bash
# From the source configuration directory
cd /path/to/source

# Remove the resource from state (does not destroy the actual resource)
terraform state rm aws_vpc.main
```

### Step 2: Import into Destination

```bash
# From the destination configuration directory
cd /path/to/destination

# Import the resource into the new state
terraform import aws_vpc.main vpc-0abc123def456
```

This two-step approach (remove then import) works with any backend.

### Step 3: Update Configuration

Make sure the destination configuration has the matching resource block:

```hcl
# In the destination configuration
resource "aws_vpc" "main" {
  cidr_block = "10.0.0.0/16"

  tags = {
    Name = "main-vpc"
  }
}
```

### Step 4: Verify

```bash
# Run plan in both configurations to verify no unexpected changes
cd /path/to/source
terraform plan
# Should show the resource is no longer managed (or removed from config)

cd /path/to/destination
terraform plan
# Should show no changes (resource already exists in state)
```

## Moving Entire Modules

You can move an entire module at once:

```bash
# Move a complete module between states
terraform state mv \
  -state=source.tfstate \
  -state-out=destination.tfstate \
  module.networking module.networking
```

This moves all resources within the module, preserving their relative addresses.

```bash
# You can also rename the module during the move
terraform state mv \
  -state=source.tfstate \
  -state-out=destination.tfstate \
  module.networking module.vpc
```

## Moving Resources with count or for_each

Resources with indexes require careful handling:

```bash
# Move a specific indexed resource
terraform state mv \
  -state=source.tfstate \
  -state-out=destination.tfstate \
  'aws_subnet.private[0]' 'aws_subnet.private[0]'

# Move a for_each resource
terraform state mv \
  -state=source.tfstate \
  -state-out=destination.tfstate \
  'aws_subnet.private["us-east-1a"]' 'aws_subnet.private["us-east-1a"]'
```

To move all instances of a counted resource, you need to move each one individually:

```bash
# Move all instances of a counted resource
for i in 0 1 2; do
  terraform state mv \
    -state=source.tfstate \
    -state-out=destination.tfstate \
    "aws_subnet.private[$i]" "aws_subnet.private[$i]"
done
```

## Practical Example: Splitting a Monolith

Let's say you have a single Terraform configuration managing everything: VPC, databases, applications, and monitoring. You want to split it into separate configurations.

### Original Structure

```text
infrastructure/
  main.tf          # Everything in one file
  terraform.tfstate
```

### Target Structure

```text
networking/
  main.tf          # VPC, subnets, routes
  terraform.tfstate

database/
  main.tf          # RDS, ElastiCache
  terraform.tfstate

application/
  main.tf          # EC2, ECS, Lambda
  terraform.tfstate
```

### Migration Steps

```bash
# 1. Back up the original state
cd infrastructure
terraform state pull > backup.json

# 2. Create the new configurations with matching resource blocks
# (You need to write the .tf files for each new directory)

# 3. Move networking resources
terraform state mv -state=terraform.tfstate -state-out=../networking/terraform.tfstate \
  aws_vpc.main aws_vpc.main

terraform state mv -state=terraform.tfstate -state-out=../networking/terraform.tfstate \
  aws_subnet.private aws_subnet.private

terraform state mv -state=terraform.tfstate -state-out=../networking/terraform.tfstate \
  aws_subnet.public aws_subnet.public

# 4. Move database resources
terraform state mv -state=terraform.tfstate -state-out=../database/terraform.tfstate \
  aws_db_instance.main aws_db_instance.main

terraform state mv -state=terraform.tfstate -state-out=../database/terraform.tfstate \
  aws_elasticache_cluster.cache aws_elasticache_cluster.cache

# 5. Move application resources
terraform state mv -state=terraform.tfstate -state-out=../application/terraform.tfstate \
  aws_ecs_cluster.app aws_ecs_cluster.app

terraform state mv -state=terraform.tfstate -state-out=../application/terraform.tfstate \
  aws_ecs_service.web aws_ecs_service.web

# 6. Verify each configuration
cd ../networking && terraform plan
cd ../database && terraform plan
cd ../application && terraform plan
```

## Using Data Sources After the Split

After splitting, configurations that previously referenced resources directly now need data sources:

```hcl
# In the database configuration, look up the VPC from the networking state
data "aws_vpc" "main" {
  tags = {
    Name = "main-vpc"
  }
}

# Or use a remote state data source
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_db_subnet_group" "main" {
  name       = "main"
  subnet_ids = data.terraform_remote_state.networking.outputs.private_subnet_ids
}
```

## Safety Checklist

Before performing state moves:

- [ ] Back up all affected state files
- [ ] Verify the resource exists in the source state with `terraform state show`
- [ ] Ensure the destination configuration has matching resource blocks
- [ ] Test with `terraform plan` in both configurations after the move
- [ ] Confirm no unexpected creates or destroys in the plans
- [ ] Update any cross-references to use data sources or remote state

## Common Mistakes

1. Forgetting to update the configuration files. Moving state without updating the `.tf` files will cause Terraform to plan a destroy in the source and a create in the destination.

2. Not handling cross-references. If resource B references resource A, and you move A to a different state, B's reference breaks.

3. Moving resources with remote state using `-state` flags. Remote state requires the remove-and-import approach.

4. Not backing up state before the move. If something goes wrong, you need the backup to restore.

## Conclusion

Moving resources between Terraform state files is a core skill for managing growing infrastructure. Whether you are splitting a monolith, reorganizing by team, or migrating between workspaces, the combination of `terraform state mv`, `terraform state rm`, and `terraform import` gives you the tools to restructure without touching actual infrastructure. Always back up your state files, verify with `terraform plan` after moves, and update your cross-references to use data sources or remote state outputs.

For related state management techniques, see our guide on [how to use the removed block to forget resources in Terraform](https://oneuptime.com/blog/post/2026-02-23-terraform-removed-block-forget-resources/view).
