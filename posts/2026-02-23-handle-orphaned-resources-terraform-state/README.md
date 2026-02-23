# How to Handle Orphaned Resources in Terraform State

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Infrastructure as Code, DevOps, Cleanup

Description: Learn how to identify and handle orphaned resources in Terraform state - resources tracked by state but no longer defined in your configuration.

---

Orphaned resources are entries in your Terraform state file that don't correspond to any resource in your current configuration. They happen more often than you'd think, and if left unaddressed, they cause confusing plan outputs, unexpected destroys, and general headaches.

This guide covers how orphaned resources appear, how to find them, and what to do about them.

## What Creates Orphaned Resources

Orphaned resources show up in several common scenarios:

**Deleting a resource block without running apply.** If you remove a resource definition from your `.tf` files but don't run `terraform apply`, the resource still exists in both the state and your cloud provider. If you then move on to other work and forget about it, that resource sits in state with no corresponding configuration.

**Refactoring modules.** When you restructure modules and change resource addresses (say, moving from `aws_instance.web` to `module.compute.aws_instance.web`), the old address becomes orphaned if you don't use `terraform state mv`.

**Failed applies.** If an apply partially succeeds and then fails, some resources may have been created and added to state, while the corresponding configuration got rolled back in source control.

**Manual infrastructure changes.** If someone deletes a resource in the cloud console but Terraform still has it in state, the next plan will try to recreate it. That's the opposite problem - a resource in state that doesn't exist in reality.

## Finding Orphaned Resources

### Method 1: terraform plan

The simplest way to spot orphans is to run a plan:

```bash
# Run a plan and look for resources marked for destruction
terraform plan
```

Resources that appear in the plan with a `-` (destroy) action, and you don't recognize why Terraform wants to destroy them, are likely orphans. Terraform wants to destroy them because they exist in state but not in your configuration.

```
# Example plan output showing an orphaned resource
  # aws_instance.old_web will be destroyed
  # (because aws_instance.old_web is not in configuration)
  - resource "aws_instance" "old_web" {
      - ami           = "ami-0123456789abcdef0"
      - instance_type = "t3.micro"
      - id            = "i-0abc123def456"
    }
```

### Method 2: Compare State List to Configuration

For a more systematic approach, compare the resources in your state to the resources in your configuration:

```bash
# Get all resource addresses from state
terraform state list > /tmp/state-resources.txt

# Get all resource addresses from configuration
terraform providers schema -json | \
  jq -r '.provider_schemas | to_entries[] | .value.resource_schemas | keys[]' \
  > /tmp/config-resource-types.txt

# A simpler approach: look for planned destroys
terraform plan -no-color | grep "will be destroyed" > /tmp/orphans.txt
```

### Method 3: Script-Based Detection

Here's a more thorough script to detect potential orphans:

```bash
#!/bin/bash
# find-orphans.sh - Detect resources in state but not in configuration

set -euo pipefail

echo "Resources in state that Terraform wants to destroy:"
echo "===================================================="

# Run plan in JSON format for precise parsing
terraform plan -json 2>/dev/null | \
  jq -r 'select(.type == "planned_change") |
    select(.change.action == "delete") |
    .change.resource.addr' 2>/dev/null || \
  echo "Could not parse plan output. Run 'terraform plan' manually."
```

## Handling Orphaned Resources

Once you've identified orphaned resources, you have three options:

### Option 1: Let Terraform Destroy Them

If the resource is genuinely no longer needed, just run `terraform apply` and let Terraform clean it up:

```bash
# Target only the orphaned resources for destruction
terraform apply -target=aws_instance.old_web
```

Using `-target` limits the destroy to just the orphaned resource, so you don't accidentally apply other changes in the same operation.

### Option 2: Remove from State Without Destroying

If the real cloud resource should keep running but Terraform shouldn't manage it anymore, remove it from state:

```bash
# Remove the resource from Terraform state without destroying it
terraform state rm aws_instance.old_web
```

This tells Terraform to forget about the resource. It won't be destroyed, and it won't show up in future plans. The resource continues to run in your cloud provider, just unmanaged by Terraform.

This is common when:
- Ownership of a resource is transferring to another team or Terraform configuration.
- You're migrating from Terraform to a different tool for that specific resource.
- The resource was created manually and accidentally imported.

### Option 3: Re-add the Configuration

If the resource should still be managed by Terraform, add the resource block back to your configuration:

```hcl
# Re-add the resource definition to match what's in state
resource "aws_instance" "old_web" {
  ami           = "ami-0123456789abcdef0"
  instance_type = "t3.micro"

  # Use the state show command to get the current attributes
  # and build the configuration from them
  tags = {
    Name = "old-web-server"
  }
}
```

Use `terraform state show` to get the current attributes and build your configuration:

```bash
# Show all attributes of the orphaned resource
terraform state show aws_instance.old_web
```

After re-adding the configuration, run `terraform plan` to verify there are no differences.

## Orphaned Resources in Modules

Module refactoring is a common source of orphans. If you rename a module or change its source, resources at the old module path become orphaned:

```bash
# Old module path resources show as destroys
# module.old_name.aws_instance.web will be destroyed

# New module path resources show as creates
# module.new_name.aws_instance.web will be created

# Fix by moving in state instead
terraform state mv module.old_name module.new_name
```

This moves all resources from the old module path to the new one in a single command.

## Dealing with count and for_each Orphans

When you change a resource from using `count` to `for_each` (or vice versa), the existing state entries become orphaned because the addresses change:

```bash
# Resources with count have numeric indexes
# aws_instance.web[0]
# aws_instance.web[1]

# Resources with for_each have string keys
# aws_instance.web["app-1"]
# aws_instance.web["app-2"]
```

You need to move each one individually:

```bash
# Move count-indexed resources to for_each-indexed addresses
terraform state mv 'aws_instance.web[0]' 'aws_instance.web["app-1"]'
terraform state mv 'aws_instance.web[1]' 'aws_instance.web["app-2"]'
```

## Preventing Orphaned Resources

A few practices that reduce the chance of orphans:

**Always run plan before removing resource blocks.** Before deleting a resource from your `.tf` files, run `terraform plan` to see what will happen. If you want to keep the real resource, run `terraform state rm` first.

**Use terraform state mv during refactors.** When reorganizing modules or renaming resources, always use `state mv` to update the state addresses.

**Review plan output in CI/CD.** Your CI/CD pipeline should flag any unexpected destroys. A resource being destroyed that nobody expects is a red flag.

**Use lifecycle rules as guardrails.**

```hcl
# Prevent accidental destruction of critical resources
resource "aws_db_instance" "production" {
  # ... configuration ...

  lifecycle {
    prevent_destroy = true
  }
}
```

This won't prevent the resource from becoming orphaned, but it will prevent Terraform from actually destroying it if you accidentally remove the configuration.

## Bulk Cleanup of Orphaned Resources

If you have many orphaned resources (common after a large refactor), script the cleanup:

```bash
#!/bin/bash
# cleanup-orphans.sh - Remove orphaned resources from state

set -euo pipefail

# Get list of resources Terraform wants to destroy
ORPHANS=$(terraform plan -json 2>/dev/null | \
  jq -r 'select(.type == "planned_change") |
    select(.change.action == "delete") |
    .change.resource.addr' 2>/dev/null)

if [ -z "$ORPHANS" ]; then
  echo "No orphaned resources found."
  exit 0
fi

echo "Found orphaned resources:"
echo "$ORPHANS"
echo ""
read -p "Remove all from state? (yes/no): " CONFIRM

if [ "$CONFIRM" = "yes" ]; then
  while IFS= read -r resource; do
    echo "Removing $resource from state..."
    terraform state rm "$resource"
  done <<< "$ORPHANS"
  echo "Done. Run 'terraform plan' to verify."
fi
```

## Wrapping Up

Orphaned resources are a natural byproduct of Terraform configuration changes. The key is to catch them early and handle them intentionally - either destroy the real resource, remove it from state, or re-add the configuration. Don't ignore them, because they'll cause confusion and potentially unexpected changes down the road.

Regular `terraform plan` reviews and proper use of `terraform state mv` during refactors will keep orphans to a minimum.

For related topics, check out our post on [refreshing Terraform state without applying changes](https://oneuptime.com/blog/post/2026-02-23-refresh-terraform-state-without-applying/view) and [handling state when renaming resources](https://oneuptime.com/blog/post/2026-02-23-handle-state-renaming-terraform-resources/view).
