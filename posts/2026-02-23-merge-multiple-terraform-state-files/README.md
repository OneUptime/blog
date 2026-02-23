# How to Merge Multiple Terraform State Files

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Infrastructure as Code, DevOps, Migration

Description: Step-by-step guide to merging multiple Terraform state files into a single unified state for consolidating infrastructure management.

---

Sometimes you need to go the opposite direction from splitting - you need to combine multiple Terraform state files into one. Maybe your team over-fragmented the infrastructure, or you're consolidating several small projects into a single manageable configuration. Whatever the reason, merging Terraform states is doable but requires careful planning.

This guide covers the practical steps, common pitfalls, and verification process for merging states safely.

## When Merging Makes Sense

A few scenarios where combining states is the right call:

- You inherited multiple small Terraform projects that logically belong together.
- The overhead of managing cross-state dependencies (via `terraform_remote_state`) outweighs the benefits of separation.
- A reorganization means one team now owns resources that were previously split across teams.
- You're simplifying a proof-of-concept that was over-engineered with too many state files.

If your combined state would have more than a few hundred resources, think carefully before merging. Large monolithic states come with their own problems.

## Step 1: Inventory What You're Merging

Before touching any commands, list out the resources in each state:

```bash
# List resources in the networking state
cd terraform/networking
terraform state list > /tmp/networking-resources.txt

# List resources in the compute state
cd terraform/compute
terraform state list > /tmp/compute-resources.txt

# List resources in the database state
cd terraform/database
terraform state list > /tmp/database-resources.txt
```

Review these lists for conflicts. If two states contain a resource with the same address (like `aws_security_group.main`), you'll need to rename one of them during the merge.

```bash
# Check for duplicate resource addresses across states
sort /tmp/networking-resources.txt /tmp/compute-resources.txt /tmp/database-resources.txt | uniq -d
```

## Step 2: Create the Target Configuration

Build a single Terraform configuration that includes all the resources from every state you're merging. This means combining all the `.tf` files:

```bash
# Create the merged configuration directory
mkdir -p terraform/merged

# Copy all tf files (you'll need to reconcile duplicates manually)
cp terraform/networking/*.tf terraform/merged/
cp terraform/compute/*.tf terraform/merged/
cp terraform/database/*.tf terraform/merged/
```

You'll need to:

- Remove duplicate provider blocks (keep one).
- Remove duplicate variable definitions.
- Resolve any naming conflicts.
- Set up a single backend configuration.
- Replace any `terraform_remote_state` references with direct resource references.

```hcl
# terraform/merged/backend.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "merged/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-locks"
  }
}
```

## Step 3: Pull Each State Locally

Pull all the states you want to merge to local files:

```bash
# Pull each state to a local file
cd terraform/networking
terraform state pull > /tmp/networking.tfstate

cd terraform/compute
terraform state pull > /tmp/compute.tfstate

cd terraform/database
terraform state pull > /tmp/database.tfstate
```

## Step 4: Move Resources into the Target State

Initialize the merged configuration to create an empty state, then use `terraform state mv` to move resources from each source state into the merged state:

```bash
cd terraform/merged
terraform init

# Pull the empty state as the target
terraform state pull > /tmp/merged.tfstate
```

Now move resources from each source:

```bash
# Move networking resources into the merged state
terraform state mv \
  -state=/tmp/networking.tfstate \
  -state-out=/tmp/merged.tfstate \
  aws_vpc.main

terraform state mv \
  -state=/tmp/networking.tfstate \
  -state-out=/tmp/merged.tfstate \
  aws_subnet.public

terraform state mv \
  -state=/tmp/networking.tfstate \
  -state-out=/tmp/merged.tfstate \
  aws_subnet.private

# Move compute resources into the merged state
terraform state mv \
  -state=/tmp/compute.tfstate \
  -state-out=/tmp/merged.tfstate \
  aws_instance.web_server

terraform state mv \
  -state=/tmp/compute.tfstate \
  -state-out=/tmp/merged.tfstate \
  aws_autoscaling_group.app

# Move database resources into the merged state
terraform state mv \
  -state=/tmp/database.tfstate \
  -state-out=/tmp/merged.tfstate \
  aws_db_instance.main

terraform state mv \
  -state=/tmp/database.tfstate \
  -state-out=/tmp/merged.tfstate \
  aws_db_subnet_group.main
```

## Handling Address Conflicts

If two states have resources at the same address, rename one during the move:

```bash
# If both networking and compute have aws_security_group.main,
# rename one during the move
terraform state mv \
  -state=/tmp/compute.tfstate \
  -state-out=/tmp/merged.tfstate \
  aws_security_group.main \
  aws_security_group.compute_main
```

Make sure the corresponding `.tf` file in the merged configuration uses the new name too.

## Step 5: Push the Merged State

Once all resources have been moved:

```bash
# Push the merged state to the remote backend
cd terraform/merged
terraform state push /tmp/merged.tfstate
```

## Step 6: Replace Remote State References

If your split configurations used `terraform_remote_state` to reference each other, those data sources need to be replaced with direct references in the merged configuration.

Before (split configuration):

```hcl
# This was in the compute configuration
data "terraform_remote_state" "networking" {
  backend = "s3"
  config = {
    bucket = "my-terraform-state"
    key    = "networking/terraform.tfstate"
    region = "us-east-1"
  }
}

resource "aws_instance" "web_server" {
  subnet_id = data.terraform_remote_state.networking.outputs.public_subnet_id
}
```

After (merged configuration):

```hcl
# Direct reference in the merged configuration - no remote state needed
resource "aws_instance" "web_server" {
  subnet_id = aws_subnet.public.id
}
```

This is one of the main benefits of merging - simpler references and no circular dependency worries.

## Step 7: Verify the Merge

Run a plan to confirm everything matches:

```bash
cd terraform/merged
terraform plan
```

You should see "No changes" if the merge was done correctly. If Terraform wants to create or destroy resources, investigate:

```bash
# List all resources in the merged state to check completeness
terraform state list

# Show details of a specific resource to verify attributes
terraform state show aws_vpc.main
```

## Scripting the Merge

For large merges, a script keeps things organized:

```bash
#!/bin/bash
# merge-states.sh - Merge multiple Terraform state files

set -euo pipefail

MERGED_STATE="/tmp/merged.tfstate"

# Initialize the merged state as empty
echo '{"version":4,"terraform_version":"1.7.0","serial":0,"lineage":"","outputs":{},"resources":[]}' > "$MERGED_STATE"

# Define source states and their resources
declare -A SOURCES
SOURCES["/tmp/networking.tfstate"]="aws_vpc.main aws_subnet.public aws_subnet.private aws_internet_gateway.main aws_route_table.public"
SOURCES["/tmp/compute.tfstate"]="aws_instance.web_server aws_autoscaling_group.app aws_launch_template.app"
SOURCES["/tmp/database.tfstate"]="aws_db_instance.main aws_db_subnet_group.main aws_db_parameter_group.main"

for state_file in "${!SOURCES[@]}"; do
  resources=${SOURCES[$state_file]}
  for resource in $resources; do
    echo "Moving $resource from $state_file to merged state"
    terraform state mv \
      -state="$state_file" \
      -state-out="$MERGED_STATE" \
      "$resource"
  done
done

echo "Merge complete. Push with: terraform state push $MERGED_STATE"
```

## Handling Module Resources

If your source states contain resources inside modules, you can either keep the module structure or flatten it:

```bash
# Keep the module structure in the merged state
terraform state mv \
  -state=/tmp/networking.tfstate \
  -state-out=/tmp/merged.tfstate \
  module.vpc.aws_vpc.main

# Or flatten it by moving to a top-level address
terraform state mv \
  -state=/tmp/networking.tfstate \
  -state-out=/tmp/merged.tfstate \
  module.vpc.aws_vpc.main \
  aws_vpc.main
```

If you flatten, make sure your merged `.tf` files define the resource at the top level, not inside a module.

## Cleaning Up

After verifying the merged state works correctly:

1. Run `terraform plan` one more time to confirm no changes.
2. Apply a trivial change (like updating a tag) to exercise the full apply cycle.
3. Update your CI/CD pipelines to point to the merged configuration.
4. Keep the old state files around for a few weeks as backup.
5. Eventually, clean up the old backend state files and configurations.

## Wrapping Up

Merging Terraform states is essentially the reverse of splitting them. The key is being methodical - inventory everything first, move resources carefully, replace remote state references, and verify thoroughly after each step.

Always keep backups of every state file involved in the merge. If something goes wrong, you want to be able to restore the original states and try again.

For more Terraform state management techniques, see our posts on [splitting state files](https://oneuptime.com/blog/post/2026-02-23-split-terraform-state-file-multiple-states/view) and [optimizing state performance](https://oneuptime.com/blog/post/2026-02-23-optimize-terraform-state-performance/view).
