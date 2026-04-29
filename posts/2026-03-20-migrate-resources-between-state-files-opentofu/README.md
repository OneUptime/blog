# How to Migrate Resources Between State Files in OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Terraform, State Migration, Tofu state mv, State Management

Description: Learn how to safely migrate resources between OpenTofu state files without destroying and recreating infrastructure, using state move operations and moved blocks.

## Introduction

As infrastructure grows, you may need to reorganize state files - moving resources from a monolithic state into component states, or from one module hierarchy to another. OpenTofu provides `tofu state mv` and the `moved` block to accomplish this without resource recreation.

## Using tofu state mv

The `state mv` command moves a resource from one state file to another.

```bash
# Step 1: Identify the source resource address

tofu -chdir=environments/prod state list
# aws_vpc.main
# aws_subnet.private[0]
# aws_subnet.private[1]
# aws_subnet.public[0]

# Step 2: Pull the source state to keep a backup before manipulating it
tofu -chdir=environments/prod state pull > /tmp/old-state.tfstate

# Step 3: Move resources to the new state file
# Format: tofu state mv -state=SOURCE -state-out=DESTINATION RESOURCE NEW_ADDRESS
tofu state mv \
  -state=environments/prod/terraform.tfstate \
  -state-out=environments/prod/networking/terraform.tfstate \
  aws_vpc.main \
  aws_vpc.main

tofu state mv \
  -state=environments/prod/terraform.tfstate \
  -state-out=environments/prod/networking/terraform.tfstate \
  'aws_subnet.private[0]' \
  'aws_subnet.private[0]'
```

## Scripted Migration for Many Resources

```bash
#!/bin/bash
# migrate_networking.sh - Move all networking resources to networking state

SOURCE="environments/prod/terraform.tfstate"
DEST="environments/prod/networking/terraform.tfstate"

# List of resources to migrate
RESOURCES=(
  "aws_vpc.main"
  "aws_internet_gateway.main"
  "aws_subnet.public[0]"
  "aws_subnet.public[1]"
  "aws_subnet.private[0]"
  "aws_subnet.private[1]"
  "aws_nat_gateway.main[0]"
  "aws_nat_gateway.main[1]"
  "aws_route_table.public"
  "aws_route_table.private[0]"
  "aws_route_table.private[1]"
)

for resource in "${RESOURCES[@]}"; do
  echo "Migrating: $resource"
  tofu state mv \
    -state="$SOURCE" \
    -state-out="$DEST" \
    "$resource" "$resource"
done

echo "Migration complete. Run 'tofu plan' in the new stack to verify."
```

## Using moved Blocks for In-Module Refactoring

The `moved` block is the declarative alternative to `state mv` for module-internal refactoring:

```hcl
# When renaming a resource within the same state file
moved {
  from = aws_subnet.main
  to   = aws_subnet.private
}

# When moving a resource into a module
moved {
  from = aws_vpc.main
  to   = module.networking.aws_vpc.main
}

# When moving between module versions
moved {
  from = module.old_vpc
  to   = module.networking
}
```

## Verification After Migration

```bash
# After migration, verify both state files are consistent
tofu -chdir=environments/prod/networking init
tofu -chdir=environments/prod/networking plan
# Expected output: No changes. Infrastructure is up-to-date.

# Also verify the source state no longer has the migrated resources
tofu -chdir=environments/prod state list | grep aws_vpc
# Should return nothing if the vpc was migrated
```

## Safe Migration Checklist

```hcl
1. [ ] Take a full backup of both state files before starting
2. [ ] Verify the new HCL configuration is correct before migrating state
3. [ ] Run state mv in a dry-run by checking with state list first
4. [ ] After migration, run tofu plan on BOTH stacks
5. [ ] Verify the destination stack plan shows "No changes" (resources migrated successfully)
6. [ ] Remove migrated resource definitions from the source HCL before applying (otherwise the source plan will show those resources as needing to be created, which would duplicate real infrastructure)
7. [ ] Run tofu plan on the source stack and confirm "No changes", then apply if needed
```

## Conclusion

Resource migration between state files requires careful sequencing: update HCL in the destination stack first, move state second, remove HCL from source third, apply source to confirm. The `moved` block is preferred for in-place refactoring as it's declarative and team-friendly. For cross-state-file migrations, `state mv` with the `-state` and `-state-out` flags is the right tool.
