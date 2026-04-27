# Using tofu state list in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, IaC, State

Description: Learn how to use the tofu state list command to inspect what resources are tracked in your OpenTofu state file.

The `tofu state list` command lists all resources tracked in your state file. It's the starting point for any state inspection - helping you understand what OpenTofu knows about, troubleshoot unexpected plan behavior, and find resources to move or remove.

## Basic Usage

```bash
# List all resources in state

tofu state list

# Example output:
aws_instance.web
aws_instance.app[0]
aws_instance.app[1]
aws_security_group.web
aws_security_group.app
module.networking.aws_vpc.main
module.networking.aws_subnet.public[0]
module.networking.aws_subnet.public[1]
module.networking.aws_subnet.private[0]
module.database.aws_db_instance.main
```

## Filtering by Resource Address

```bash
# Filter to a specific resource (matches all instances when count/for_each is used)
tofu state list aws_instance.app
# Output:
# aws_instance.app[0]
# aws_instance.app[1]

# Filter to a specific module (lists every resource inside the module)
tofu state list 'module.networking'
# Output:
# module.networking.aws_vpc.main
# module.networking.aws_subnet.public[0]
# module.networking.aws_subnet.public[1]
# module.networking.aws_subnet.private[0]

# Filter to another module
tofu state list 'module.database'
# Output:
# module.database.aws_db_instance.main
# module.database.aws_db_subnet_group.main
# module.database.aws_security_group.db

# To filter by resource type alone, pipe through grep
tofu state list | grep '^aws_instance\.'
# Output:
# aws_instance.web
# aws_instance.app[0]
# aws_instance.app[1]
```

## Specifying State File

```bash
# List resources from a specific state file
tofu state list -state=path/to/terraform.tfstate

# Useful for comparing states or examining backups
tofu state list -state=terraform.tfstate.backup
```

## Counting Resources

```bash
# Count total resources in state
tofu state list | wc -l

# Count resources by type
tofu state list | grep 'aws_instance' | wc -l
tofu state list | grep 'aws_security_group' | wc -l

# Count by module
tofu state list | grep '^module\.' | cut -d. -f1-2 | sort | uniq -c | sort -rn
```

## Practical Use Cases

### Finding Orphaned Resources

```bash
# Save current state inventory for reference
tofu state list > state-resources.txt

# Run a plan and find resources marked for deletion (orphans no longer in config)
tofu plan -out=tfplan
tofu show -json tfplan | jq -r '.resource_changes[] | select(.change.actions == ["delete"]) | .address'
```

### Checking After Import

```bash
# After tofu import, verify the resource is in state
tofu import aws_instance.legacy i-0123456789abcdef0
tofu state list | grep 'aws_instance.legacy'
# aws_instance.legacy
```

### Pre-Migration Inventory

```bash
# Before refactoring, capture full resource list
tofu state list > pre-migration-resources.txt

# After refactoring, compare
tofu state list > post-migration-resources.txt
diff pre-migration-resources.txt post-migration-resources.txt
# Should show moved resources renamed but same total count
```

### Finding for_each Resources

```bash
# List all instances of a for_each resource
tofu state list | grep 'aws_s3_bucket.regional'
# aws_s3_bucket.regional["us-east-1"]
# aws_s3_bucket.regional["us-west-2"]
# aws_s3_bucket.regional["eu-west-1"]
```

## Scripting with state list

```bash
#!/bin/bash
# report-state-summary.sh

echo "=== State Summary ==="
echo "Total resources: $(tofu state list | wc -l)"
echo ""
echo "By type:"
tofu state list | \
  sed 's/\[.*\]//' | \
  awk -F'.' '{
    if ($0 ~ /^module\./) {
      # Extract resource type from module path
      n = split($0, a, ".");
      print a[n-1] "." a[n]
    } else {
      print $1 "." $2
    }
  }' | \
  sort | uniq -c | sort -rn
```

## Understanding Resource Addresses

The address format in `state list` output:

```bash
# Root resource
aws_instance.web

# Root resource with count index
aws_instance.app[0]
aws_instance.app[1]

# Root resource with for_each key
aws_s3_bucket.logs["us-east-1"]

# Module resource
module.networking.aws_vpc.main

# Nested module resource
module.app.module.database.aws_db_instance.primary

# Module with for_each
module.regional["us-east-1"].aws_vpc.main
```

## Conclusion

`tofu state list` is an essential tool for understanding your infrastructure state. Use it to audit what's tracked, filter by module or resource type, count resources, and as the starting point for state manipulation commands like `state mv`, `state rm`, and `state show`. Make it part of your regular workflow for maintaining healthy OpenTofu state.
