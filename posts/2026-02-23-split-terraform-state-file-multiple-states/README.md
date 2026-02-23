# How to Split a Terraform State File into Multiple States

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Infrastructure as Code, DevOps, Refactoring

Description: A practical guide to splitting a monolithic Terraform state file into smaller, independent state files for better team workflows and faster operations.

---

When a Terraform project grows beyond a certain size, managing everything in a single state file becomes painful. Plans take forever, the blast radius of any change is enormous, and multiple teams end up stepping on each other's toes. Splitting the state into multiple smaller states is one of the best things you can do for long-term maintainability.

This guide walks through the full process of breaking apart a monolithic state file into separate, independently managed states.

## Why Split a State File?

A few signals that your state has gotten too big:

- `terraform plan` takes more than a few minutes.
- A change to one component (say, a DNS record) requires Terraform to refresh hundreds of unrelated resources.
- Multiple teams work in the same Terraform root module and constantly hit state lock conflicts.
- You're worried about the blast radius - a single misconfiguration could affect everything.

Splitting the state means each component can be planned and applied independently, reducing risk and improving speed.

## Planning the Split

Before you touch any commands, decide how you want to divide things. Common strategies include:

- **By environment**: dev, staging, production each get their own state.
- **By component**: networking, compute, databases, monitoring.
- **By team**: platform team manages networking, app team manages compute.
- **By lifecycle**: things that change frequently (app config) vs. things that rarely change (VPC setup).

Map out which resources belong to which new state. Write it down. You don't want to discover halfway through that you forgot to move a security group.

## Step 1: Create the New Terraform Configurations

For each new state, create a separate Terraform configuration directory:

```bash
# Create directories for the split configurations
mkdir -p terraform/networking
mkdir -p terraform/compute
mkdir -p terraform/database
```

Move or copy the relevant `.tf` files into each directory:

```bash
# Move networking resources to the networking directory
cp main.tf terraform/networking/  # Copy first, then trim
cp variables.tf terraform/networking/
cp providers.tf terraform/networking/
```

Edit each directory's `.tf` files so they only contain the resources that belong there. Make sure each directory has its own backend configuration pointing to a different state file.

```hcl
# terraform/networking/backend.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "networking/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
  }
}
```

```hcl
# terraform/compute/backend.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "compute/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
  }
}
```

## Step 2: Move Resources Using terraform state mv

The `terraform state mv` command can move resources from one state to another using the `-state-out` flag. First, pull your current state:

```bash
# Pull the current monolithic state to a local file
cd /path/to/original/terraform
terraform state pull > original.tfstate
```

Now move resources to new state files:

```bash
# Move networking resources to the networking state
terraform state mv \
  -state=original.tfstate \
  -state-out=networking.tfstate \
  aws_vpc.main

terraform state mv \
  -state=original.tfstate \
  -state-out=networking.tfstate \
  aws_subnet.public

terraform state mv \
  -state=original.tfstate \
  -state-out=networking.tfstate \
  aws_subnet.private

terraform state mv \
  -state=original.tfstate \
  -state-out=networking.tfstate \
  aws_internet_gateway.main

terraform state mv \
  -state=original.tfstate \
  -state-out=networking.tfstate \
  aws_route_table.public
```

```bash
# Move compute resources to the compute state
terraform state mv \
  -state=original.tfstate \
  -state-out=compute.tfstate \
  aws_instance.web_server

terraform state mv \
  -state=original.tfstate \
  -state-out=compute.tfstate \
  aws_launch_template.app

terraform state mv \
  -state=original.tfstate \
  -state-out=compute.tfstate \
  aws_autoscaling_group.app
```

Each `state mv` command removes the resource from the source state and adds it to the destination state. If the destination file doesn't exist, Terraform creates it.

## Step 3: Push the New States

After you've moved all the resources, push each new state to its respective backend:

```bash
# Initialize and push the networking state
cd terraform/networking
terraform init
terraform state push /path/to/networking.tfstate
```

```bash
# Initialize and push the compute state
cd terraform/compute
terraform init
terraform state push /path/to/compute.tfstate
```

```bash
# Initialize and push the database state
cd terraform/database
terraform init
terraform state push /path/to/database.tfstate
```

## Step 4: Handle Cross-State Dependencies

After splitting, some resources in one state will need to reference resources in another. For example, your compute instances need to know the VPC ID and subnet IDs from the networking state.

Use `terraform_remote_state` data sources to share information across states:

```hcl
# terraform/compute/data.tf
# Read outputs from the networking state
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

# Now reference networking outputs in your compute resources
resource "aws_instance" "web_server" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.medium"

  # Reference the VPC subnet from the networking state
  subnet_id = data.terraform_remote_state.networking.outputs.public_subnet_id

  vpc_security_group_ids = [
    data.terraform_remote_state.networking.outputs.web_sg_id
  ]
}
```

For this to work, the networking configuration needs to export those values as outputs:

```hcl
# terraform/networking/outputs.tf
output "vpc_id" {
  value = aws_vpc.main.id
}

output "public_subnet_id" {
  value = aws_subnet.public.id
}

output "web_sg_id" {
  value = aws_security_group.web.id
}
```

## Step 5: Verify Each Split State

Run `terraform plan` in each new directory. The plan should show no changes if you did everything correctly:

```bash
# Verify networking state
cd terraform/networking
terraform plan
# Expected: No changes. Your infrastructure matches the configuration.

# Verify compute state
cd terraform/compute
terraform plan
# Expected: No changes. Your infrastructure matches the configuration.
```

If the plan shows resources being created or destroyed, it means something wasn't moved correctly. Double-check your resource addresses and state contents.

## Using a Script for Large Splits

If you have hundreds of resources to move, scripting the process saves time and reduces mistakes:

```bash
#!/bin/bash
# split-state.sh - Move resources from monolithic state to component states

set -euo pipefail

ORIGINAL_STATE="original.tfstate"

# Define which resources go where
# Format: destination_state resource_address
MOVES=(
  "networking.tfstate aws_vpc.main"
  "networking.tfstate aws_subnet.public[0]"
  "networking.tfstate aws_subnet.public[1]"
  "networking.tfstate aws_subnet.private[0]"
  "networking.tfstate aws_subnet.private[1]"
  "compute.tfstate aws_instance.web[0]"
  "compute.tfstate aws_instance.web[1]"
  "compute.tfstate aws_autoscaling_group.app"
  "database.tfstate aws_db_instance.main"
  "database.tfstate aws_db_subnet_group.main"
)

for move in "${MOVES[@]}"; do
  dest=$(echo "$move" | awk '{print $1}')
  resource=$(echo "$move" | awk '{print $2}')

  echo "Moving $resource to $dest"
  terraform state mv \
    -state="$ORIGINAL_STATE" \
    -state-out="$dest" \
    "$resource"
done

echo "Split complete. Verify each state with terraform plan."
```

## Common Pitfalls

**Forgetting dependencies**: If you move a security group to the networking state but leave the instances that reference it in the compute state, you need to set up `terraform_remote_state` for that cross-reference. Otherwise the compute plan will try to create a new security group.

**Module resources**: If your resources are inside modules, the address includes the module path:

```bash
# Moving a resource that's inside a module
terraform state mv \
  -state=original.tfstate \
  -state-out=networking.tfstate \
  module.network.aws_vpc.main
```

**Count and for_each indexes**: Resources created with `count` or `for_each` have indexed addresses:

```bash
# Moving indexed resources
terraform state mv \
  -state=original.tfstate \
  -state-out=compute.tfstate \
  'aws_instance.web[0]'

terraform state mv \
  -state=original.tfstate \
  -state-out=compute.tfstate \
  'aws_instance.web[1]'
```

## After the Split

Once everything is verified, update your CI/CD pipelines to plan and apply each state independently. Set up proper ordering so that foundational states (like networking) are applied before dependent states (like compute).

Consider using a tool like Terragrunt if you need to manage dependencies between multiple Terraform configurations automatically.

## Wrapping Up

Splitting a Terraform state file takes careful planning and methodical execution. Back up everything first, move resources in small batches, and verify after each step. The payoff is well worth the effort - faster plans, smaller blast radius, and happier teams.

For related reading, check out our guides on [merging multiple state files](https://oneuptime.com/blog/post/2026-02-23-merge-multiple-terraform-state-files/view) and [handling state when moving resources between modules](https://oneuptime.com/blog/post/2026-02-23-handle-state-moving-resources-between-modules/view).
