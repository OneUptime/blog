# How to Use terraform state rm to Remove Resources from State

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, CLI Commands, Infrastructure as Code

Description: Guide to using terraform state rm to remove resources from Terraform state without destroying the actual infrastructure, with use cases, safety steps, and recovery options.

---

Sometimes you need to tell Terraform to stop managing a resource without actually destroying it. Maybe you are moving a resource to a different Terraform configuration. Maybe the resource was created manually and accidentally imported. Or maybe you are decommissioning a Terraform project but want to keep the infrastructure running. The `terraform state rm` command removes a resource from state while leaving the real infrastructure untouched.

## What terraform state rm Does

When you run `terraform state rm`, Terraform deletes the resource entry from its state file. After removal:

- Terraform no longer knows about the resource
- Running `terraform plan` will not show the resource
- Running `terraform destroy` will not try to delete it
- The actual infrastructure resource continues to exist unchanged

This is fundamentally different from `terraform destroy`, which removes the resource from both state and the real world.

## Basic Syntax

```bash
terraform state rm [options] ADDRESS [ADDRESS...]
```

You can remove one or multiple resources in a single command.

## Removing a Single Resource

```bash
# Remove a single resource from state
terraform state rm aws_instance.legacy_server

# Output:
# Removed aws_instance.legacy_server
# Successfully removed 1 resource instance(s).
```

## Removing Multiple Resources

```bash
# Remove multiple resources at once
terraform state rm aws_instance.server1 aws_instance.server2 aws_instance.server3

# Output:
# Removed aws_instance.server1
# Removed aws_instance.server2
# Removed aws_instance.server3
# Successfully removed 3 resource instance(s).
```

## Removing Indexed Resources

For `count`-based resources:

```bash
# Remove a specific index
terraform state rm 'aws_instance.worker[0]'

# Remove all instances of a count resource
terraform state rm 'aws_instance.worker[0]' 'aws_instance.worker[1]' 'aws_instance.worker[2]'
```

For `for_each`-based resources:

```bash
# Remove a specific for_each instance
terraform state rm 'aws_s3_bucket.data["logs"]'

# Remove multiple for_each instances
terraform state rm 'aws_s3_bucket.data["logs"]' 'aws_s3_bucket.data["backups"]'
```

Remember to use single quotes to protect the brackets and double quotes from shell interpretation.

## Removing an Entire Module

You can remove all resources in a module at once:

```bash
# Remove everything in a module
terraform state rm module.old_networking

# Output:
# Removed module.old_networking.aws_vpc.main
# Removed module.old_networking.aws_subnet.public[0]
# Removed module.old_networking.aws_subnet.public[1]
# Removed module.old_networking.aws_subnet.private[0]
# Removed module.old_networking.aws_subnet.private[1]
# Removed module.old_networking.aws_internet_gateway.main
# Successfully removed 6 resource instance(s).
```

## Common Use Cases

### Transferring Resources Between Configurations

When splitting a monolithic configuration into smaller ones:

```bash
# Step 1: In the source configuration, remove from state
cd /path/to/monolith
terraform state rm aws_rds_cluster.database
terraform state rm aws_rds_cluster_instance.database

# Step 2: In the target configuration, import the resources
cd /path/to/database-config
terraform import aws_rds_cluster.database my-cluster-id
terraform import aws_rds_cluster_instance.database my-instance-id

# Step 3: Verify both configurations
cd /path/to/monolith
terraform plan  # Should not try to recreate removed resources

cd /path/to/database-config
terraform plan  # Should show the imported resources match
```

### Abandoning a Terraform-Managed Resource

When you want Terraform to stop managing something permanently:

```bash
# First, remove the resource block from your .tf files
# Then remove it from state
terraform state rm aws_instance.manual_server

# Also remove any references to it in your code
# Then verify
terraform plan
# Should show no changes
```

### Handling Import Mistakes

If you imported the wrong resource:

```bash
# Oops - imported the wrong instance
terraform import aws_instance.web i-wrong-instance-id

# Fix: remove the bad import
terraform state rm aws_instance.web

# Re-import the correct one
terraform import aws_instance.web i-correct-instance-id
```

### Preparing for terraform destroy

Sometimes you want to destroy most resources but keep some:

```bash
# Remove the resources you want to keep from state
terraform state rm aws_s3_bucket.important_data
terraform state rm aws_rds_instance.production_db

# Now destroy will skip those resources
terraform destroy

# The S3 bucket and RDS instance are safe
```

### Decommissioning a Terraform Project

When you stop using Terraform for a project but want to keep the infrastructure:

```bash
# List everything in state
terraform state list

# Remove everything (the infrastructure stays)
terraform state list | xargs -I {} terraform state rm {}

# Or simpler - just delete the state
# (but state rm is safer because it verifies each resource)
```

## The -dry-run Flag

Unfortunately, `terraform state rm` does not have a built-in dry-run option. Simulate one by listing first:

```bash
# Preview what would be removed
terraform state list module.networking

# Output shows what state rm will remove:
# module.networking.aws_vpc.main
# module.networking.aws_subnet.public[0]
# module.networking.aws_subnet.public[1]

# If the list looks right, proceed
terraform state rm module.networking
```

## Backup and Recovery

Terraform creates a backup before each state modification:

```bash
# Default backup location
ls terraform.tfstate.backup

# Specify a custom backup location
terraform state rm -backup=./backups/pre-removal.tfstate aws_instance.web
```

If you accidentally removed the wrong resource, restore from backup:

```bash
# Check what was in the backup
terraform state list -state=terraform.tfstate.backup | grep web

# Restore the entire state from backup
terraform state push terraform.tfstate.backup

# Or more surgically - pull the resource from backup and import it
# First find the resource ID from the backup
terraform state show -state=terraform.tfstate.backup aws_instance.web | grep "id "
# Then import it back
terraform import aws_instance.web i-0abc123def456789
```

## Removing vs. Deleting

A quick comparison to clarify the terminology:

| Action | State | Infrastructure |
|--------|-------|----------------|
| `terraform state rm` | Removes from state | No change |
| `terraform destroy` | Removes from state | Destroys resource |
| `terraform destroy -target=X` | Removes target from state | Destroys target resource |

## Removing Data Sources

You can also remove data sources from state:

```bash
# Remove a data source
terraform state rm data.aws_ami.ubuntu
```

This is less common but sometimes needed when a data source query has changed or is causing errors during planning.

## Interaction with Configuration

After removing a resource from state, you also need to handle the corresponding configuration:

**If you remove from state AND remove from config** - Clean removal. Terraform ignores the resource going forward.

**If you remove from state but keep in config** - Terraform will try to create a new resource on the next apply. This is usually not what you want.

**If you remove from config but not from state** - Terraform will try to destroy the resource on the next apply. Use `state rm` to prevent this.

The typical workflow is:

```bash
# Step 1: Remove from configuration files
# (edit your .tf files to remove the resource block)

# Step 2: Remove from state
terraform state rm aws_instance.web

# Step 3: Verify
terraform plan
# Should show: No changes.
```

## Bulk Removal with Scripting

For large-scale removals, use scripting:

```bash
#!/bin/bash
# remove-module.sh - Remove all resources in a module from state

MODULE=${1:?"Usage: $0 <module_name>"}

# List resources in the module
RESOURCES=$(terraform state list "module.${MODULE}")

if [ -z "$RESOURCES" ]; then
  echo "No resources found in module.${MODULE}"
  exit 1
fi

echo "Resources to remove:"
echo "$RESOURCES"
echo ""
read -p "Continue? (yes/no) " CONFIRM

if [ "$CONFIRM" = "yes" ]; then
  echo "$RESOURCES" | while read -r resource; do
    echo "Removing: $resource"
    terraform state rm "$resource"
  done
  echo "Done. Run 'terraform plan' to verify."
else
  echo "Aborted."
fi
```

## Using removed Blocks (Terraform 1.7+)

Terraform 1.7 introduced the `removed` block as a declarative alternative:

```hcl
# Declare that a resource should be removed from state
removed {
  from = aws_instance.legacy_server

  lifecycle {
    destroy = false  # Do not destroy the actual resource
  }
}
```

This is better than `terraform state rm` for team workflows because it is version-controlled and applies automatically for all team members.

## Summary

The `terraform state rm` command is a vital tool for managing the relationship between Terraform state and real infrastructure. Use it when transferring resources between configurations, abandoning management of resources, fixing import mistakes, or decommissioning Terraform projects. Always verify with `terraform plan` afterward, keep backups, and coordinate the state removal with corresponding configuration changes. For moving resources to a new address instead of removing them, use [terraform state mv](https://oneuptime.com/blog/post/2026-02-23-terraform-state-mv-command/view). For inspecting resources before removal, use [terraform state show](https://oneuptime.com/blog/post/2026-02-23-terraform-state-show-command/view).
