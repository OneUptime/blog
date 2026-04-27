# How to Use the OpenTofu State Commands Quick Reference

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, State, Command, Quick Reference, Infrastructure as Code

Description: A quick reference for all OpenTofu state management commands including list, show, mv, rm, pull, push, and taint operations.

## Introduction

State commands allow you to inspect and modify OpenTofu state without changing infrastructure. This quick reference covers all state subcommands with practical examples.

## tofu state list

List all resources tracked in state.

```bash
# List all resources

tofu state list

# Filter by resource type
tofu state list | grep aws_s3_bucket

# List resources in a module
tofu state list module.networking

# List a specific resource address
tofu state list aws_security_group.web

# Use a specific state file
tofu state list -state=terraform.tfstate
```

## tofu state show

Display all attributes of a specific resource.

```bash
# Show a specific resource
tofu state show aws_s3_bucket.main

# Show a for_each resource instance
tofu state show 'aws_s3_bucket.env["prod"]'

# Show a resource inside a module
tofu state show module.vpc.aws_vpc.main

# Output in JSON
tofu state pull | jq '.resources[] | select(.type == "aws_s3_bucket")'
```

## tofu state mv

Rename a resource address or move it to a module.

```bash
# Rename a resource
tofu state mv aws_s3_bucket.old_name aws_s3_bucket.new_name

# Move resource into a module
tofu state mv aws_s3_bucket.app module.storage.aws_s3_bucket.app

# Move resource out of a module
tofu state mv module.storage.aws_s3_bucket.app aws_s3_bucket.app

# Move a for_each instance
tofu state mv 'aws_s3_bucket.env["dev"]' 'aws_s3_bucket.env["development"]'

# Move between state files
tofu state mv \
  -state=source.tfstate \
  -state-out=target.tfstate \
  aws_s3_bucket.main aws_s3_bucket.main

# Always run plan after mv to verify no unexpected changes
tofu plan  # should show no changes if rename matches HCL
```

## tofu state rm

Remove a resource from state without destroying it.

```bash
# Remove a resource from state (resource continues to exist in cloud)
tofu state rm aws_s3_bucket.old_bucket

# Remove all resources in a module
tofu state rm module.old_module

# Remove a for_each instance
tofu state rm 'aws_instance.web["old-server"]'

# Dry run (preview what would be removed)
tofu state rm -dry-run aws_s3_bucket.temp
```

## tofu state pull / push

Export and import raw state.

```bash
# Export current state (from remote backend)
tofu state pull > backup.tfstate

# Push a state file to the backend
tofu state push backup.tfstate

# Force push (overwrites existing state)
tofu state push -force recovered.tfstate

# Inspect state structure
tofu state pull | jq '.resources | length'  # count resources
tofu state pull | jq '.terraform_version'    # get state version
```

## tofu taint / untaint

Mark resources for replacement (legacy, prefer -replace flag).

```bash
# Mark resource for replacement on next apply
tofu taint aws_instance.web

# Remove taint mark
tofu untaint aws_instance.web

# Preferred modern approach: use -replace at plan/apply time
tofu plan -replace=aws_instance.web
tofu apply -replace=aws_instance.web
```

## tofu apply -refresh-only

Sync state from cloud without making changes.

```bash
# Refresh state to match current cloud reality
tofu apply -refresh-only

# Preview what drift was detected
tofu plan -refresh-only
```

## State Command Safety Practices

```bash
# ALWAYS backup before state operations
tofu state pull > backup-$(date +%Y%m%d%H%M%S).tfstate

# ALWAYS run plan after state modifications
tofu plan  # verify no unexpected changes

# For state mv operations, use -dry-run first
tofu state mv -dry-run old.address new.address

# Use -lock=false only when a lock is stuck and no one else is operating
tofu state rm -lock=false aws_s3_bucket.old
```

## Summary

State commands let you safely inspect and restructure OpenTofu state without touching cloud infrastructure. Use `state list` and `state show` for inspection, `state mv` for resource renaming and module restructuring, `state rm` for removing resources from management, and `state pull/push` for state backup and migration. Always back up state before any modifications, run `tofu plan` after changes to verify consistency, and prefer `tofu apply -replace` over `taint` for forcing resource recreation.
