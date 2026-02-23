# How to Use terraform state list to View Resources

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, CLI Commands, Infrastructure as Code

Description: Practical guide to using terraform state list to view and filter resources tracked in Terraform state, with filtering patterns, scripting examples, and real-world use cases.

---

The `terraform state list` command is your window into what Terraform is managing. It prints the addresses of all resources tracked in the current state, giving you a quick inventory of your infrastructure. Whether you are debugging an issue, preparing a refactor, or just trying to understand what is deployed, this command is the starting point.

## Basic Usage

The simplest invocation lists everything:

```bash
# List all resources in the current state
terraform state list
```

Output looks like this:

```
aws_instance.web
aws_instance.worker[0]
aws_instance.worker[1]
aws_instance.worker[2]
aws_security_group.web
aws_security_group.worker
aws_subnet.main
aws_vpc.main
data.aws_ami.ubuntu
```

Each line is a resource address. The format is `<type>.<name>` for root-level resources, with index notation for count-based or for_each resources.

## Filtering by Address

You can pass an address pattern to filter the output:

```bash
# List only aws_instance resources
terraform state list aws_instance

# Output:
# aws_instance.web
# aws_instance.worker[0]
# aws_instance.worker[1]
# aws_instance.worker[2]
```

The filter matches the beginning of the address:

```bash
# List all resources with a specific name prefix
terraform state list aws_instance.worker

# Output:
# aws_instance.worker[0]
# aws_instance.worker[1]
# aws_instance.worker[2]
```

## Listing Module Resources

For resources inside modules, the address includes the module path:

```bash
# List all resources in a specific module
terraform state list module.networking

# Output:
# module.networking.aws_subnet.private[0]
# module.networking.aws_subnet.private[1]
# module.networking.aws_subnet.public[0]
# module.networking.aws_subnet.public[1]
# module.networking.aws_vpc.main
# module.networking.aws_internet_gateway.main
```

For nested modules:

```bash
# List resources in a nested module
terraform state list module.app.module.database

# Output:
# module.app.module.database.aws_db_instance.main
# module.app.module.database.aws_db_subnet_group.main
```

## Working with for_each Resources

Resources created with `for_each` use string keys instead of numeric indices:

```bash
terraform state list aws_s3_bucket.data

# Output:
# aws_s3_bucket.data["logs"]
# aws_s3_bucket.data["backups"]
# aws_s3_bucket.data["artifacts"]
```

To reference a specific instance:

```bash
# List a specific for_each instance
terraform state list 'aws_s3_bucket.data["logs"]'

# Output:
# aws_s3_bucket.data["logs"]
```

Note the quoting - the square brackets and quotes need to be protected from shell interpretation.

## Listing Data Sources

Data sources appear in the list with a `data.` prefix:

```bash
# List all data sources
terraform state list data.

# Output:
# data.aws_ami.ubuntu
# data.aws_availability_zones.available
# data.aws_caller_identity.current
```

## Using the -id Flag

The `-id` flag filters resources by their provider-assigned ID:

```bash
# Find a resource by its provider ID
terraform state list -id=i-0abc123def456789

# Output:
# aws_instance.web
```

This is incredibly useful when you have an AWS resource ID from the console and need to find its Terraform address.

## Scripting with terraform state list

The output of `terraform state list` is designed for scripting. Each address is on its own line, making it easy to pipe to other commands.

### Count Resources by Type

```bash
# Count resources grouped by type
terraform state list | sed 's/\[.*//; s/\..*//' | sort | uniq -c | sort -rn

# Output:
#   15 aws_security_group_rule
#    8 aws_subnet
#    5 aws_instance
#    3 aws_route_table_association
#    2 aws_security_group
#    1 aws_vpc
#    1 aws_internet_gateway
```

### Find All Resources of a Type

```bash
# List all security groups
terraform state list | grep "aws_security_group\."

# Output:
# aws_security_group.web
# aws_security_group.worker
# aws_security_group.database
```

### Batch Operations

Combine state list with other terraform commands:

```bash
# Show details for all instances
for resource in $(terraform state list aws_instance); do
  echo "=== $resource ==="
  terraform state show "$resource"
  echo ""
done
```

### Export Resource List

```bash
# Save the resource list for comparison or documentation
terraform state list > resources-$(date +%Y%m%d).txt

# Compare with a previous snapshot
diff resources-20260222.txt resources-20260223.txt
```

## Using with Remote State

`terraform state list` works identically with remote backends. Terraform handles fetching the state transparently:

```bash
# Works the same regardless of backend
# S3, Azure Blob, GCS, Consul, etc.
terraform state list

# The command reads the state from whatever backend is configured
```

## Comparing State Across Workspaces

Check resources in different workspaces:

```bash
# List resources in the current workspace
echo "=== Current workspace ==="
terraform workspace show
terraform state list

# Switch and list another workspace
terraform workspace select staging
echo "=== Staging workspace ==="
terraform state list

# Switch back
terraform workspace select default
```

## Real-World Use Cases

### Pre-Refactor Inventory

Before refactoring Terraform code, capture the current resource list:

```bash
# Save the current state as a reference
terraform state list > pre-refactor-resources.txt

# After refactoring, compare
terraform state list > post-refactor-resources.txt
diff pre-refactor-resources.txt post-refactor-resources.txt

# Any resources that disappeared need to be moved with terraform state mv
# Any new addresses need to be verified
```

### Identifying Orphaned Resources

Find resources in state that no longer have corresponding configuration:

```bash
# Run a plan and look for resources to be destroyed
terraform plan -no-color | grep "will be destroyed"

# Cross-reference with state list to understand the scope
terraform state list | wc -l
```

### Auditing Infrastructure

Generate a report of all managed infrastructure:

```bash
#!/bin/bash
# audit.sh - Generate an infrastructure audit report

echo "Infrastructure Audit Report"
echo "Date: $(date)"
echo "Workspace: $(terraform workspace show)"
echo ""

echo "Total resources: $(terraform state list | wc -l)"
echo ""

echo "Resources by type:"
terraform state list | \
  sed 's/\[.*//; s/\..*//' | \
  sort | uniq -c | sort -rn

echo ""
echo "Modules in use:"
terraform state list | \
  grep "^module\." | \
  sed 's/\.[^.]*$//' | \
  sort -u
```

### Finding Resources Before State Surgery

Before running `terraform state mv` or `terraform state rm`, use `state list` to confirm the exact addresses:

```bash
# Find the exact address before moving
terraform state list aws_instance

# Verify the address exists
terraform state list aws_instance.old_name

# Then move with confidence
terraform state mv aws_instance.old_name aws_instance.new_name
```

## Common Issues

### Empty Output

If `terraform state list` returns nothing, check:

```bash
# Make sure you're initialized
terraform init

# Check which workspace you're in
terraform workspace show

# Verify the backend is configured correctly
terraform state pull | head -5
```

### Address Not Found

If filtering returns no results, check the exact address format:

```bash
# This won't work - wrong format
terraform state list aws_instance[0]

# This is correct for count-based resources
terraform state list 'aws_instance.web[0]'

# This is correct for for_each resources
terraform state list 'aws_instance.web["app-1"]'
```

## Summary

The `terraform state list` command is a fundamental tool for understanding and managing your Terraform state. It gives you a clean, scriptable inventory of everything Terraform manages. Use it before refactors, for auditing, for debugging, and as a starting point for state surgery operations. Combined with shell scripting, it becomes a powerful tool for infrastructure analysis. For more detailed resource inspection, see our guide on [terraform state show](https://oneuptime.com/blog/post/2026-02-23-terraform-state-show-command/view). For modifying state, check out [terraform state mv](https://oneuptime.com/blog/post/2026-02-23-terraform-state-mv-command/view) and [terraform state rm](https://oneuptime.com/blog/post/2026-02-23-terraform-state-rm-command/view).
