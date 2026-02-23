# How to Troubleshoot terraform state mv Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, State Management, Troubleshooting, Infrastructure as Code, DevOps, Debugging

Description: Learn how to diagnose and fix common terraform state mv errors including resource addressing issues, module moves, and cross-state migrations with practical examples and solutions.

---

The `terraform state mv` command lets you rename resources, move them between modules, or migrate them to different state files without destroying and recreating them. But it is also one of the more error-prone Terraform commands. Addressing mistakes, type mismatches, and module path issues cause frustrating failures that can be hard to debug.

This guide walks through the most common `terraform state mv` errors, explains why they happen, and shows you how to fix them.

## How terraform state mv Works

The command takes a source and destination address:

```bash
# Basic syntax
terraform state mv [options] SOURCE DESTINATION

# Rename a resource
terraform state mv aws_instance.old_name aws_instance.new_name

# Move a resource into a module
terraform state mv aws_instance.web module.web.aws_instance.this

# Move between state files
terraform state mv -state-out=other.tfstate aws_instance.web aws_instance.web
```

Under the hood, `terraform state mv` reads the resource from the source address, writes it to the destination address, and removes the original entry. If anything goes wrong during this process, you get an error.

## Error: Invalid Source Address

```
Error: Invalid target address

  Cannot move to
  "aws_instance.web[0]": resource instance keys are not
  allowed in the source address.
```

This happens when you use index notation incorrectly. The source and destination must be compatible addresses:

```bash
# Wrong - you cannot move a specific instance to a non-indexed address
terraform state mv 'aws_instance.web[0]' aws_instance.web_primary

# Right - move a specific instance
terraform state mv 'aws_instance.web[0]' aws_instance.web_primary

# Note: the error message can be misleading. Make sure to quote
# addresses with brackets to prevent shell expansion
terraform state mv 'aws_instance.web["key"]' 'aws_instance.web_key'
```

Always quote addresses containing brackets. Without quotes, your shell may interpret `[0]` as a glob pattern.

## Error: Resource Not Found

```
Error: Invalid target address

  Cannot move "aws_instance.server": resource not found in state.
```

This error means the source address does not exist in the state file. Common causes:

```bash
# Check what resources actually exist in state
terraform state list

# The resource name might be different than you think
terraform state list | grep instance

# Maybe it is inside a module
terraform state list | grep aws_instance
# Output might show:
# module.compute.aws_instance.server

# If it is in a module, use the full path
terraform state mv module.compute.aws_instance.server module.compute.aws_instance.new_name
```

## Error: Resource Already Exists at Destination

```
Error: Cannot move to aws_instance.new_name: there is already
a resource instance at that address in the state.
```

The destination address already has a resource. You need to either remove the existing resource first or choose a different destination:

```bash
# Option 1: Remove the existing resource from state first
# (does NOT destroy the actual cloud resource)
terraform state rm aws_instance.new_name

# Then move
terraform state mv aws_instance.old_name aws_instance.new_name

# Option 2: Move the existing resource out of the way first
terraform state mv aws_instance.new_name aws_instance.new_name_temp
terraform state mv aws_instance.old_name aws_instance.new_name
```

## Error: Moving Resources Between Modules

Moving resources into or out of modules requires getting the address format exactly right:

```bash
# Move a root resource into a module
terraform state mv aws_instance.web module.web_server.aws_instance.this

# Move a resource out of a module to root
terraform state mv module.web_server.aws_instance.this aws_instance.web

# Move a resource between modules
terraform state mv module.old_module.aws_instance.web module.new_module.aws_instance.web

# Move an entire module (all resources inside it)
terraform state mv module.old_name module.new_name
```

A common mistake is forgetting that the resource type must match the configuration at the destination:

```hcl
# If your new module has this resource defined:
# module "web_server" {
#   resource "aws_instance" "main" { ... }
# }

# Then the destination must use "main", not "this" or "web"
terraform state mv aws_instance.web module.web_server.aws_instance.main
```

## Error: Type Mismatch

```
Error: Cannot move aws_instance.web to aws_lb.web: resource types don't match.
```

You cannot change the resource type during a move. The source and destination must be the same resource type:

```bash
# Wrong - different resource types
terraform state mv aws_instance.web aws_lb.web

# Right - same resource type, different name
terraform state mv aws_instance.web aws_instance.web_server
```

## Error: Moving count to for_each

Converting a resource from `count` to `for_each` requires moving each instance individually:

```bash
# Original: aws_instance.web with count = 3
# State has: aws_instance.web[0], aws_instance.web[1], aws_instance.web[2]

# New config uses for_each with keys: "a", "b", "c"
# Move each instance to its new key
terraform state mv 'aws_instance.web[0]' 'aws_instance.web["a"]'
terraform state mv 'aws_instance.web[1]' 'aws_instance.web["b"]'
terraform state mv 'aws_instance.web[2]' 'aws_instance.web["c"]'
```

Make sure the total count matches, and double-check which index maps to which key.

## Error: Moving to a Different State File

When moving resources between state files, both states must be initialized:

```bash
# Move from current state to another state file
terraform state mv -state-out=../other-project/terraform.tfstate \
  aws_instance.web aws_instance.web

# If the destination is a remote backend, you need to pull it first
cd ../other-project
terraform state pull > local-copy.tfstate
cd -

# Move to the local copy
terraform state mv -state-out=../other-project/local-copy.tfstate \
  aws_instance.web aws_instance.web

# Push the updated state back
cd ../other-project
terraform state push local-copy.tfstate
```

## Error: State Lock Conflicts

```
Error: Error acquiring the state lock

  Lock Info:
    ID:        abc-123
```

Another operation holds the lock. Wait for it to finish or force-unlock:

```bash
# Check if the lock is stale (the locking operation is no longer running)
# If confirmed stale, force unlock
terraform force-unlock abc-123

# Then retry the move
terraform state mv aws_instance.web aws_instance.web_server
```

## Dry Run Before Moving

Always preview what will happen before making changes:

```bash
# Use -dry-run to preview without making changes
terraform state mv -dry-run aws_instance.web aws_instance.web_server

# Output: Would move "aws_instance.web" to "aws_instance.web_server"
```

This verifies that both addresses are valid without modifying state.

## Using moved Blocks Instead

For Terraform 1.1 and later, consider using `moved` blocks in your configuration instead of `terraform state mv`. They are declarative, reviewable, and apply automatically:

```hcl
# main.tf - Declare the move in configuration
moved {
  from = aws_instance.web
  to   = aws_instance.web_server
}

# Moving into a module
moved {
  from = aws_instance.web
  to   = module.web.aws_instance.this
}

# Moving count to for_each
moved {
  from = aws_instance.web[0]
  to   = aws_instance.web["primary"]
}
```

The `moved` block runs during `terraform plan` and `terraform apply`, making it safer than manual state manipulation. Team members reviewing the pull request can see exactly what is being moved.

## Recovery Script

If a `terraform state mv` goes wrong, here is how to recover:

```bash
#!/bin/bash
# recover-state.sh - Recover from a failed state mv

set -euo pipefail

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: ./recover-state.sh <backup-file>"
  exit 1
fi

# Verify the backup is valid JSON
if ! jq empty "$BACKUP_FILE" 2>/dev/null; then
  echo "ERROR: Backup file is not valid JSON"
  exit 1
fi

echo "Current state serial: $(terraform state pull | jq .serial)"
echo "Backup state serial: $(jq .serial "$BACKUP_FILE")"

read -p "Restore from backup? (yes/no): " confirm
if [ "$confirm" = "yes" ]; then
  terraform state push "$BACKUP_FILE"
  echo "State restored. Run 'terraform plan' to verify."
fi
```

## Best Practices

1. **Always back up state before running state mv.** Run `terraform state pull > backup.json` first.
2. **Use `-dry-run`** to preview moves before executing them.
3. **Quote addresses with brackets** to prevent shell expansion.
4. **Prefer `moved` blocks** over `terraform state mv` for declarative, reviewable moves.
5. **Verify with `terraform plan`** after every move. A clean plan means the move was successful.
6. **Move one resource at a time** to make debugging easier if something goes wrong.
7. **Document complex moves** in your team's runbook for future reference.

The `terraform state mv` command is powerful but unforgiving. Take it slow, back up your state, and verify after every operation.
