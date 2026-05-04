# How to Convert Between count and for_each Without Destroying Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, Count, for_each, State Migration, Tofu state mv

Description: Learn how to safely convert count-based resources to for_each in OpenTofu without destroying and recreating existing infrastructure by using state move operations.

## Introduction

Resources created with `count` are identified as `resource.name[0]`, `resource.name[1]`, etc. Resources created with `for_each` are identified as `resource.name["key"]`. Converting between them requires moving existing state entries from the old address format to the new one using `tofu state mv`.

## Understanding the State Address Difference

```hcl
# count-based resource - addresses: aws_instance.app[0], aws_instance.app[1]

resource "aws_instance" "app" {
  count         = 2
  ami           = "ami-abc123"
  instance_type = "t3.micro"
  tags = { Name = "app-${count.index + 1}" }
}
```

```hcl
# for_each-based resource - addresses: aws_instance.app["server-1"], aws_instance.app["server-2"]
resource "aws_instance" "app" {
  for_each      = toset(["server-1", "server-2"])
  ami           = "ami-abc123"
  instance_type = "t3.micro"
  tags = { Name = each.key }
}
```

## Step-by-Step Migration Process

**Step 1: View current state addresses**

```bash
# List all current state addresses for the resource
tofu state list | grep aws_instance.app
# Output:
# aws_instance.app[0]
# aws_instance.app[1]
```

**Step 2: Update the HCL to use for_each**

Change the resource block from `count` to `for_each`, but do NOT apply yet.

```hcl
# New configuration using for_each
resource "aws_instance" "app" {
  for_each      = toset(["server-1", "server-2"])
  ami           = "ami-abc123"
  instance_type = "t3.micro"
  tags = { Name = each.key }
}
```

**Step 3: Move state entries before applying**

```bash
# Move state from count-based to for_each-based addresses
tofu state mv 'aws_instance.app[0]' 'aws_instance.app["server-1"]'
tofu state mv 'aws_instance.app[1]' 'aws_instance.app["server-2"]'
```

**Step 4: Verify with plan**

```bash
# Plan should show only tag changes, no destroy/recreate
tofu plan
# Expected: ~ update (Name tag change), no replacements
```

## Script for Bulk Migration

When migrating many instances, automate the state moves.

```bash
#!/bin/bash
# migrate_count_to_foreach.sh
# Usage: ./migrate_count_to_foreach.sh resource_type.resource_name key1 key2 key3

RESOURCE="$1"
shift
KEYS=("$@")

for i in "${!KEYS[@]}"; do
  OLD_ADDR="${RESOURCE}[${i}]"
  NEW_ADDR="${RESOURCE}[\"${KEYS[$i]}\"]"
  echo "Moving: ${OLD_ADDR} -> ${NEW_ADDR}"
  tofu state mv "${OLD_ADDR}" "${NEW_ADDR}"
done
```

```bash
# Run the migration script
./migrate_count_to_foreach.sh aws_instance.app server-1 server-2
```

## Handling the Intermediate State

During migration, the HCL has changed but state hasn't yet (or vice versa). Run `tofu plan` to catch any mismatches:

```bash
# If plan shows unexpected destroys, check that all state moves completed
tofu state list | grep aws_instance.app

# Verify old addresses are gone
tofu state show 'aws_instance.app[0]'  # Should error: not found
tofu state show 'aws_instance.app["server-1"]'  # Should show the resource
```

## Using moved Blocks

For team environments, document the state moves as `moved` blocks so all team members get the migration automatically.

```hcl
# Record the state moves in HCL for reproducibility
moved {
  from = aws_instance.app[0]
  to   = aws_instance.app["server-1"]
}

moved {
  from = aws_instance.app[1]
  to   = aws_instance.app["server-2"]
}
```

## Conclusion

Converting from `count` to `for_each` is safe as long as you move the state entries before running apply. The `moved` block approach is preferred for team environments as it makes migrations declarative and automatically applied. Always run `tofu plan` after state moves to confirm no unexpected changes before applying.
