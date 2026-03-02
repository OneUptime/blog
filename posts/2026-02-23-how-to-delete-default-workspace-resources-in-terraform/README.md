# How to Delete Default Workspace Resources in Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Workspace, State Management, Infrastructure as Code, Cleanup

Description: A step-by-step guide to safely removing resources from the default Terraform workspace and migrating to named workspaces.

---

Every Terraform project starts with a "default" workspace. It is there whether you want it or not. As your project matures and you adopt named workspaces for different environments, you often need to clean up resources that were created in the default workspace. This process requires care because a wrong move can destroy production infrastructure. Let me walk you through how to do it safely.

## Understanding the Default Workspace

The default workspace is created automatically when you initialize a Terraform project. Many teams start building infrastructure in this workspace before they even realize workspaces exist. Later, when they adopt a workspace-based strategy for managing environments, they end up with orphaned resources stuck in the default workspace.

```bash
# Check which workspace you are currently in
terraform workspace show
# Output: default

# List all workspaces - the asterisk marks the current one
terraform workspace list
#   * default
#     dev
#     staging
#     prod
```

One important thing to know: you cannot delete the default workspace. Terraform does not allow it. But you can remove all resources from it and stop using it.

## Step 1: Audit What Exists in the Default Workspace

Before deleting anything, you need to know exactly what is in the default workspace state.

```bash
# Switch to the default workspace
terraform workspace select default

# List all resources tracked in the default workspace
terraform state list

# Example output:
# aws_vpc.main
# aws_subnet.public[0]
# aws_subnet.public[1]
# aws_security_group.web
# aws_instance.app

# Get detailed information about a specific resource
terraform state show aws_vpc.main
```

Save this list somewhere. You will need it to verify that everything is accounted for after cleanup.

```bash
# Save the full state list to a file for reference
terraform state list > default_workspace_resources.txt

# Also save the full state as a backup
terraform state pull > default_workspace_backup.json
```

## Step 2: Decide What to Do With Each Resource

For each resource in the default workspace, you have three options:

1. **Destroy it** - The resource is no longer needed
2. **Migrate it** - Move the resource to a named workspace
3. **Remove from state only** - Stop tracking it but leave it running

Here is how to handle each scenario.

### Option A: Destroying Resources

If the resources in the default workspace are from testing or are duplicates, you can destroy them:

```bash
# Make sure you are in the default workspace
terraform workspace select default

# Preview what will be destroyed
terraform plan -destroy

# Review the plan carefully, then destroy
terraform destroy
```

If you only want to destroy specific resources rather than everything:

```bash
# Destroy a single resource
terraform destroy -target=aws_instance.app

# Destroy multiple specific resources
terraform destroy \
  -target=aws_instance.app \
  -target=aws_security_group.web
```

### Option B: Migrating Resources to Another Workspace

If the resources in the default workspace are actually your production infrastructure and you want to move them to a "prod" workspace, you need to migrate the state.

```bash
# Step 1: Pull the current state from the default workspace
terraform workspace select default
terraform state pull > default_state.json

# Step 2: Create or select the target workspace
terraform workspace select prod
# Or: terraform workspace new prod

# Step 3: For each resource, move it using state mv
# Unfortunately, there is no built-in cross-workspace state mv,
# so you need to use import or a manual state manipulation approach
```

Here is the practical approach for cross-workspace migration:

```bash
# Pull the state from the default workspace
terraform workspace select default
terraform state pull > default_state.json

# Get the resource IDs you need
terraform state show aws_vpc.main
# Note the id field, e.g., vpc-0abc123def456

# Switch to the target workspace
terraform workspace select prod

# Import each resource into the new workspace
terraform import aws_vpc.main vpc-0abc123def456
terraform import aws_subnet.public[0] subnet-0abc123
terraform import aws_subnet.public[1] subnet-0def456
terraform import aws_security_group.web sg-0abc123

# After importing, run a plan to verify everything matches
terraform plan
# The plan should show no changes if the import was successful
```

### Option C: Removing From State Without Destroying

If the resource exists but should not be managed by Terraform anymore:

```bash
# Remove a resource from Terraform state without destroying it
terraform state rm aws_instance.legacy_app

# The resource continues to exist in AWS but Terraform
# no longer knows about or manages it
```

## Step 3: Handling Resources With Dependencies

Resources often depend on each other. When destroying or migrating, you need to respect these dependencies.

```bash
# Wrong order - this will fail because the VPC has dependencies
terraform destroy -target=aws_vpc.main

# Correct order - destroy dependents first
terraform destroy -target=aws_instance.app
terraform destroy -target=aws_security_group.web
terraform destroy -target=aws_subnet.public[0]
terraform destroy -target=aws_subnet.public[1]
terraform destroy -target=aws_vpc.main
```

For a cleaner approach, use a script:

```bash
#!/bin/bash
# cleanup-default-workspace.sh
# Safely removes all resources from the default workspace

set -e

# Make sure we are in the default workspace
current_ws=$(terraform workspace show)
if [ "$current_ws" != "default" ]; then
  echo "Switching to default workspace..."
  terraform workspace select default
fi

# Create a backup first
echo "Creating state backup..."
terraform state pull > "backup-default-$(date +%Y%m%d-%H%M%S).json"

# Count resources
resource_count=$(terraform state list | wc -l | tr -d ' ')
echo "Found $resource_count resources in default workspace"

if [ "$resource_count" -eq "0" ]; then
  echo "Default workspace is already empty."
  exit 0
fi

# Show what will be destroyed
echo "Resources to be removed:"
terraform state list

# Confirm before proceeding
read -p "Destroy all resources? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
  echo "Aborted."
  exit 1
fi

# Destroy everything
terraform destroy -auto-approve

# Verify the workspace is empty
remaining=$(terraform state list | wc -l | tr -d ' ')
echo "Remaining resources: $remaining"
```

## Step 4: Preventing Future Use of the Default Workspace

After cleaning up the default workspace, you probably want to prevent anyone from accidentally deploying to it again. Here is a pattern that blocks deployment in the default workspace:

```hcl
# main.tf

# This check prevents any resources from being created in the default workspace
resource "null_resource" "workspace_check" {
  count = terraform.workspace == "default" ? 1 : 0

  provisioner "local-exec" {
    command = "echo 'ERROR: Do not use the default workspace. Use a named workspace instead.' && exit 1"
  }
}

# Alternative approach using a validation local
locals {
  # This will cause an error if someone tries to plan in the default workspace
  validate_workspace = (
    terraform.workspace == "default"
    ? file("ERROR: Do not deploy to the default workspace")
    : terraform.workspace
  )
}
```

A simpler approach that produces a clear error:

```hcl
# workspace_guard.tf
variable "allowed_workspaces" {
  description = "List of valid workspace names"
  type        = list(string)
  default     = ["dev", "staging", "prod"]
}

locals {
  workspace_valid = contains(var.allowed_workspaces, terraform.workspace)
  # This triggers an error when workspace is not in the allowed list
  workspace_check = local.workspace_valid ? true : file("ERROR: Workspace '${terraform.workspace}' is not allowed. Use one of: ${join(", ", var.allowed_workspaces)}")
}
```

## Step 5: Verify the Cleanup

After you have removed everything from the default workspace, do a final verification:

```bash
# Check that the default workspace is empty
terraform workspace select default
terraform state list
# Should return nothing

# Verify your named workspaces still have their resources
terraform workspace select prod
terraform state list
# Should show your production resources

# Run a plan in each workspace to confirm everything is consistent
for ws in dev staging prod; do
  echo "=== Checking $ws ==="
  terraform workspace select "$ws"
  terraform plan -detailed-exitcode
  echo ""
done
```

## Common Mistakes to Watch Out For

The most dangerous mistake is running `terraform destroy` in the wrong workspace. Always double-check with `terraform workspace show` before running any destructive commands.

Another common issue is forgetting to back up the state before starting. If something goes wrong during migration, having that backup means you can recover. Without it, you might lose track of resources entirely.

Finally, be aware that some resources have deletion protection enabled. Things like RDS instances or S3 buckets with versioning will not be destroyed by a simple `terraform destroy`. You may need to disable deletion protection or empty buckets first.

## Summary

Cleaning up the default workspace is a straightforward process: audit what is there, decide what to do with each resource, execute the cleanup in the right order, and then guard against future use of the default workspace. Take your time with it, back up your state, and verify everything after each step. For more on workspace management, see our post on [workspace state isolation](https://oneuptime.com/blog/post/2026-02-23-how-to-handle-workspace-state-isolation-in-terraform/view).
