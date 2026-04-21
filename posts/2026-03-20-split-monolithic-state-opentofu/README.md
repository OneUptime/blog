# How to Split a Monolithic State File into Smaller States in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Infrastructure as Code, Terraform, IaC, DevOps, State Management

Description: Learn how to safely split a large monolithic OpenTofu state file into smaller, more manageable state files organized by component or environment.

## Introduction

As infrastructure grows, a single monolithic state file becomes a bottleneck. Large state files slow down plans and applies, increase blast radius for mistakes, and make collaboration difficult. Splitting the state into smaller, focused files improves performance, security, and team autonomy.

## Why Split State Files?

- **Performance**: Smaller state files mean faster plan and apply operations
- **Blast radius**: Issues in one state file don't affect others
- **Team ownership**: Different teams can own different state files
- **Security**: Limit who can read sensitive state data

## Planning the Split

Before splitting, decide on the boundaries. Common patterns include:

- By layer: networking, compute, data
- By team: platform, application, data
- By environment: dev, staging, prod (though workspaces often handle this)

## Step 1: Audit Your Current State

```bash
# List all resources in the monolithic state

tofu state list

# Example output:
# aws_vpc.main
# aws_subnet.private[0]
# aws_subnet.public[0]
# aws_instance.web[0]
# aws_rds_instance.database
# aws_s3_bucket.assets
```

Group resources into logical components.

## Step 2: Create Target Configurations

Create separate directories for each new state:

```bash
mkdir -p infrastructure/networking
mkdir -p infrastructure/compute
mkdir -p infrastructure/database
```

Move the relevant `.tf` files into each directory.

## Step 3: Move Resources Between States

Use `tofu state mv` to move resources without destroying and recreating them:

```bash
# Initialize target configuration first
cd infrastructure/networking
tofu init

# Move networking resources from monolithic state to networking state
tofu state mv \
  -state=/path/to/monolithic/terraform.tfstate \
  -state-out=./terraform.tfstate \
  aws_vpc.main aws_vpc.main

tofu state mv \
  -state=/path/to/monolithic/terraform.tfstate \
  -state-out=./terraform.tfstate \
  'aws_subnet.private[0]' 'aws_subnet.private[0]'

tofu state mv \
  -state=/path/to/monolithic/terraform.tfstate \
  -state-out=./terraform.tfstate \
  'aws_subnet.public[0]' 'aws_subnet.public[0]'
```

## Step 4: Handle Cross-State Dependencies with Outputs

Values from resources in one state that are referenced by another can be exposed as root outputs and consumed via `terraform_remote_state`:

```hcl
# networking/outputs.tf
output "vpc_id" {
  value = aws_vpc.main.id
}

output "private_subnet_ids" {
  value = aws_subnet.private[*].id
}
```

```hcl
# compute/main.tf
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "web" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"
  subnet_id     = data.terraform_remote_state.networking.outputs.private_subnet_ids[0]
}
```

## Step 5: Migrate New State Files to Backend

If using remote backends, configure each sub-configuration to use the correct backend:

```hcl
# networking/backend.tf
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}
```

Then migrate each local state file into its configured backend:

```bash
cd infrastructure/networking
tofu init -migrate-state

cd ../compute
tofu init -migrate-state
```

## Step 6: Validate Each New State

```bash
# Validate networking state
cd infrastructure/networking
tofu init
tofu state list
tofu plan  # Should show no changes

# Validate compute state
cd ../compute
tofu init
tofu state list
tofu plan  # Should show no changes
```

## Step 7: Clean Up the Monolithic State

Once all resources are moved and validated, the old monolithic state should be empty:

```bash
# Verify the monolithic state is empty
cd /path/to/monolithic
tofu state list  # Should return nothing
```

Archive or delete the old configuration.

## Conclusion

Splitting a monolithic state file is a careful, multi-step process that pays significant dividends in team productivity and operational safety. By moving resources using `tofu state mv`, creating outputs to share data between states, and validating each step, you can safely transition to a modular state architecture without any infrastructure downtime.
