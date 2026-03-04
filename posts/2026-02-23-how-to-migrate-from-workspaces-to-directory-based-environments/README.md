# How to Migrate from Workspaces to Directory-Based Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspaces, Migration, Directory Structure, Environment Management

Description: A step-by-step guide to migrating from Terraform workspace-based environment management to a directory-based structure, with state migration procedures and rollback strategies.

---

Workspaces are a quick way to start managing multiple environments, but many teams eventually outgrow them. The shared code constraint becomes painful when environments diverge. The lack of built-in variable separation leads to wrapper script sprawl. And the risk of operating in the wrong workspace keeps people nervous. This post walks through migrating from workspaces to a directory-based structure where each environment has its own Terraform root module.

## When to Migrate

Consider migrating when you notice these patterns:

- Your code is full of `terraform.workspace == "prod" ? ... : ...` conditionals
- Environments have significantly different resource sets (prod has WAF, CDN, multi-AZ; dev has none of that)
- Teams need different permissions for different environments
- You want to plan and apply environments independently without workspace switching
- Variable files are getting complex with overlapping and divergent values

## The Target Structure

You are going from this:

```text
# Workspace-based (before)
project/
  main.tf
  variables.tf
  outputs.tf
  envs/
    dev.tfvars
    staging.tfvars
    prod.tfvars
```

To this:

```text
# Directory-based (after)
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
  environments/
    dev/
      main.tf
      variables.tf
      terraform.tfvars
      backend.tf
    staging/
      main.tf
      variables.tf
      terraform.tfvars
      backend.tf
    prod/
      main.tf
      variables.tf
      terraform.tfvars
      backend.tf
```

Each environment directory is an independent Terraform root module. They share code through modules but have their own state, backend configuration, and variables.

## Step 1: Extract Shared Code into Modules

Before migrating state, refactor your shared code into modules:

```hcl
# modules/networking/main.tf

variable "environment" {
  type = string
}

variable "vpc_cidr" {
  type = string
}

variable "enable_nat_gateway" {
  type    = bool
  default = true
}

resource "aws_vpc" "main" {
  cidr_block = var.vpc_cidr

  tags = {
    Name        = "vpc-${var.environment}"
    Environment = var.environment
  }
}

resource "aws_nat_gateway" "main" {
  count = var.enable_nat_gateway ? 1 : 0
  # ...
}

output "vpc_id" {
  value = aws_vpc.main.id
}
```

```hcl
# modules/compute/main.tf

variable "environment" {
  type = string
}

variable "instance_type" {
  type = string
}

variable "instance_count" {
  type = number
}

variable "vpc_id" {
  type = string
}

resource "aws_instance" "web" {
  count         = var.instance_count
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type

  tags = {
    Name        = "web-${var.environment}-${count.index}"
    Environment = var.environment
  }
}
```

## Step 2: Create Environment Directories

Build out each environment directory:

```hcl
# environments/dev/main.tf

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

module "networking" {
  source = "../../modules/networking"

  environment        = "dev"
  vpc_cidr           = var.vpc_cidr
  enable_nat_gateway = false  # Save money in dev
}

module "compute" {
  source = "../../modules/compute"

  environment    = "dev"
  instance_type  = var.instance_type
  instance_count = var.instance_count
  vpc_id         = module.networking.vpc_id
}
```

```hcl
# environments/dev/backend.tf

terraform {
  backend "s3" {
    bucket         = "acme-terraform-state"
    key            = "environments/dev/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
    encrypt        = true
  }
}
```

```hcl
# environments/dev/terraform.tfvars

vpc_cidr       = "10.0.0.0/16"
instance_type  = "t3.micro"
instance_count = 1
```

Repeat for staging and prod with their own configurations.

## Step 3: Migrate State

This is the critical step. You need to move each workspace's state into its own backend path.

### Backup Everything First

```bash
#!/bin/bash
# backup-workspaces.sh - Create backups before migration

BACKUP_DIR="state-backups-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

cd /path/to/workspace-based/project

WORKSPACES=$(terraform workspace list | sed 's/^[ *]*//')

for WS in $WORKSPACES; do
  terraform workspace select "$WS"
  terraform state pull > "${BACKUP_DIR}/${WS}.tfstate"
  echo "Backed up $WS to ${BACKUP_DIR}/${WS}.tfstate"
done

echo "All backups saved to $BACKUP_DIR"
```

### Move State to New Backend Locations

For each environment, initialize the new directory and import the state:

```bash
#!/bin/bash
# migrate-workspace.sh - Migrate one workspace to a directory

WORKSPACE=$1  # e.g., "dev"
OLD_PROJECT="/path/to/workspace-based/project"
NEW_DIR="/path/to/directory-based/project/environments/${WORKSPACE}"

echo "=== Migrating workspace: $WORKSPACE ==="

# Step 1: Pull state from the old workspace
cd "$OLD_PROJECT"
terraform workspace select "$WORKSPACE"
terraform state pull > "/tmp/tf-migrate-${WORKSPACE}.json"

echo "Pulled state with $(grep -c '"type"' /tmp/tf-migrate-${WORKSPACE}.json) resource entries"

# Step 2: Initialize the new environment directory
cd "$NEW_DIR"
terraform init -input=false

# Step 3: Push the state into the new backend
terraform state push "/tmp/tf-migrate-${WORKSPACE}.json"

# Step 4: Verify by running a plan
terraform plan

echo "=== Migration of $WORKSPACE complete ==="
echo "Review the plan output above."
echo "It should show no changes if the migration was clean."
```

### Handle State Address Changes

If your resource addresses changed (for example, from `aws_instance.web` to `module.compute.aws_instance.web`), you need to move them in state:

```bash
#!/bin/bash
# remap-state.sh - Move resources to new addresses after modularization

cd /path/to/directory-based/project/environments/dev

# Move networking resources into the module
terraform state mv 'aws_vpc.main' 'module.networking.aws_vpc.main'
terraform state mv 'aws_subnet.public[0]' 'module.networking.aws_subnet.public[0]'
terraform state mv 'aws_subnet.public[1]' 'module.networking.aws_subnet.public[1]'

# Move compute resources into the module
terraform state mv 'aws_instance.web[0]' 'module.compute.aws_instance.web[0]'
terraform state mv 'aws_instance.web[1]' 'module.compute.aws_instance.web[1]'
terraform state mv 'aws_security_group.web' 'module.compute.aws_security_group.web'

# Verify
terraform plan
# Should show minimal or no changes
```

## Step 4: Remove terraform.workspace References

Search your modules for any remaining `terraform.workspace` references and replace them with the `environment` variable:

```bash
# Find all references to terraform.workspace
grep -r "terraform.workspace" modules/
```

Before:

```hcl
resource "aws_s3_bucket" "data" {
  bucket = "myapp-${terraform.workspace}-data"
}
```

After:

```hcl
variable "environment" {
  type = string
}

resource "aws_s3_bucket" "data" {
  bucket = "myapp-${var.environment}-data"
}
```

## Step 5: Verify Each Environment

Run plan in each environment directory and confirm no unexpected changes:

```bash
#!/bin/bash
# verify-all.sh - Verify migration for all environments

for ENV in dev staging prod; do
  echo "=== Verifying $ENV ==="
  cd "/path/to/project/environments/$ENV"
  terraform init -input=false
  terraform plan -detailed-exitcode

  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 0 ]; then
    echo "$ENV: No changes (clean)"
  elif [ $EXIT_CODE -eq 2 ]; then
    echo "$ENV: WARNING - Changes detected! Review plan output."
  else
    echo "$ENV: ERROR - Plan failed!"
  fi
  echo ""
done
```

## Step 6: Clean Up Old Workspaces

Once everything is verified and you are confident in the new structure:

```bash
#!/bin/bash
# cleanup-old-workspaces.sh

cd /path/to/workspace-based/project

# List workspaces for reference
terraform workspace list

# Delete each non-default workspace
for WS in dev staging prod; do
  terraform workspace select default
  terraform workspace delete -force "$WS"
  echo "Deleted workspace: $WS"
done

echo "Cleanup complete. Old workspace state files have been removed."
echo "Keep your state backups for at least 30 days."
```

## Shared Configuration with Terragrunt

If you want the benefits of directory-based environments without duplicating configuration, consider Terragrunt:

```hcl
# environments/dev/terragrunt.hcl

terraform {
  source = "../../modules/app"
}

inputs = {
  environment    = "dev"
  instance_type  = "t3.micro"
  instance_count = 1
}

remote_state {
  backend = "s3"
  config = {
    bucket = "acme-terraform-state"
    key    = "environments/dev/terraform.tfstate"
    region = "us-east-1"
  }
}
```

Terragrunt reduces duplication while keeping environments fully independent.

## Rollback Plan

If something goes wrong during migration, you can restore from backups:

```bash
#!/bin/bash
# rollback.sh - Restore workspace state from backups

BACKUP_DIR=$1
OLD_PROJECT="/path/to/workspace-based/project"

cd "$OLD_PROJECT"

for BACKUP_FILE in "${BACKUP_DIR}"/*.tfstate; do
  WS=$(basename "$BACKUP_FILE" .tfstate)

  if [ "$WS" = "default" ]; then
    terraform workspace select default
  else
    terraform workspace select "$WS" 2>/dev/null || terraform workspace new "$WS"
  fi

  terraform state push "$BACKUP_FILE"
  echo "Restored workspace: $WS"
done
```

## Comparing the Two Approaches

| Aspect | Workspaces | Directory-Based |
|---|---|---|
| Code sharing | Automatic (same files) | Through modules |
| Variable management | Wrapper scripts needed | Native terraform.tfvars |
| Access control | Shared backend credentials | Per-environment backends |
| Environment divergence | Conditional expressions | Independent code |
| State isolation | Same backend, different keys | Separate backends |
| Risk of wrong env | Higher (wrong workspace) | Lower (explicit directory) |
| Setup overhead | Low | Medium |

## Conclusion

Migrating from workspaces to directories is a significant refactor, but it pays off for teams that need stronger isolation between environments. The key steps are extracting shared code into modules, migrating state per environment, remapping resource addresses, and verifying with plan. Take it one environment at a time, keep backups, and have a rollback plan. The result is a structure where each environment is self-contained, independently deployable, and harder to accidentally cross-contaminate. For a detailed comparison of the two approaches, see our post on [workspaces vs separate state files](https://oneuptime.com/blog/post/2026-02-23-how-to-use-workspaces-vs-separate-state-files-in-terraform/view).
