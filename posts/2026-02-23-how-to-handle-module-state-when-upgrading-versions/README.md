# How to Handle Module State When Upgrading Versions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Modules, State Management, Upgrades, Infrastructure as Code

Description: Learn safe strategies for upgrading Terraform module versions without losing state, including state migration, moved blocks, import blocks, and rollback procedures.

---

Upgrading Terraform module versions is one of the riskiest operations in infrastructure management. A module upgrade can rename resources, change data structures, or add new required variables. If you do not handle the state carefully, Terraform might try to destroy and recreate resources that should just be updated in place. This post covers the strategies that make module upgrades safe and predictable.

## Understanding What Changes Between Versions

Before upgrading, you need to understand exactly what changed. This determines your migration strategy.

```bash
# Compare two versions of a module
# Clone the module repository and diff the versions
git clone https://github.com/myorg/terraform-aws-vpc.git
cd terraform-aws-vpc

# See what changed between v1.0.0 and v2.0.0
git diff v1.0.0..v2.0.0 -- '*.tf'

# Look specifically for renamed resources (indicates state moves needed)
git diff v1.0.0..v2.0.0 -- '*.tf' | grep -E '^\+.*resource|^\-.*resource'

# Check the CHANGELOG
git log v1.0.0..v2.0.0 --oneline
```

## Types of Changes and Their Impact

Different changes require different migration strategies:

```
| Change Type                | State Impact | Migration Required |
|----------------------------|--------------|-------------------|
| New optional variable      | None         | No                |
| New required variable      | None         | Add variable      |
| Removed variable           | None         | Remove variable   |
| New resource added         | None         | No                |
| Resource removed           | Destruction  | May need import   |
| Resource renamed           | Destroy/Create | State move needed |
| count changed to for_each  | Destroy/Create | State move needed |
| Provider version bump      | None         | No                |
| Output renamed             | None         | Update references |
```

## Safe Upgrade Workflow

Follow this process for every module upgrade:

### Step 1: Read the Changelog and Diff

```bash
# Always start by understanding what changed
# Good modules have CHANGELOG.md files
cat CHANGELOG.md

# If no changelog, diff the versions
git diff v1.2.0..v2.0.0
```

### Step 2: Update the Module Version

```hcl
# Before
module "vpc" {
  source = "git::https://github.com/myorg/terraform-aws-vpc.git?ref=v1.2.0"
  # ...
}

# After
module "vpc" {
  source = "git::https://github.com/myorg/terraform-aws-vpc.git?ref=v2.0.0"
  # ...
}
```

### Step 3: Initialize to Download the New Version

```bash
# Download the new module version
terraform init -upgrade

# If using a registry source
terraform init -upgrade
```

### Step 4: Plan and Analyze

```bash
# Run a plan and carefully review every change
terraform plan -out=upgrade.tfplan

# Look for unexpected destroys
terraform plan -no-color 2>&1 | grep "will be destroyed"
terraform plan -no-color 2>&1 | grep "must be replaced"
```

### Step 5: Handle State Moves If Needed

If the plan shows resources being destroyed and recreated due to address changes, use `moved` blocks or `terraform state mv`.

## Using Moved Blocks for Upgrades

The module author should include `moved` blocks when renaming resources. If they did not, you can add them in your root module.

```hcl
# The module author renamed aws_vpc.main to aws_vpc.this in v2.0.0
# Add moved blocks to handle the state migration

moved {
  from = module.vpc.aws_vpc.main
  to   = module.vpc.aws_vpc.this
}

moved {
  from = module.vpc.aws_subnet.public[0]
  to   = module.vpc.aws_subnet.public["us-east-1a"]
}

moved {
  from = module.vpc.aws_subnet.public[1]
  to   = module.vpc.aws_subnet.public["us-east-1b"]
}
```

```bash
# Plan should now show moves instead of destroy/create
terraform plan

# Output will show:
# module.vpc.aws_vpc.this will be moved from module.vpc.aws_vpc.main
# No changes. Your infrastructure matches the configuration.
```

## Handling count to for_each Migration

One of the most common breaking changes is when a module switches from `count` to `for_each`. This changes resource addresses from numeric indices to string keys.

```hcl
# v1: Used count
# State addresses: module.vpc.aws_subnet.private[0], [1], [2]

# v2: Uses for_each
# State addresses: module.vpc.aws_subnet.private["us-east-1a"], ["us-east-1b"], ["us-east-1c"]

# Add moved blocks to map the old indices to new keys
moved {
  from = module.vpc.aws_subnet.private[0]
  to   = module.vpc.aws_subnet.private["us-east-1a"]
}

moved {
  from = module.vpc.aws_subnet.private[1]
  to   = module.vpc.aws_subnet.private["us-east-1b"]
}

moved {
  from = module.vpc.aws_subnet.private[2]
  to   = module.vpc.aws_subnet.private["us-east-1c"]
}
```

## Using Import Blocks for New Resources

When a new module version adds resources that already exist in AWS (but not in state), use import blocks.

```hcl
# v2.0.0 of the module adds an aws_vpc_endpoint for S3 that you already
# created manually. Import it instead of letting Terraform create a duplicate.

import {
  to = module.vpc.aws_vpc_endpoint.s3
  id = "vpce-0abc123def456"
}
```

```bash
# Plan with imports
terraform plan

# Apply to import the resource into state
terraform apply
```

## Rolling Back a Failed Upgrade

If an upgrade goes wrong, you need a rollback plan.

```bash
# Before upgrading, always save a state backup
terraform state pull > state-backup-$(date +%Y%m%d-%H%M%S).json

# If the upgrade fails mid-apply, restore the backup
terraform state push state-backup-20260223-143000.json

# Revert the module version in code
# Change source back to the previous version
# Then re-initialize
terraform init -upgrade
terraform plan  # Should show no changes
```

## Staged Rollout Strategy

For production environments, upgrade modules in stages:

```hcl
# Stage 1: Upgrade in development
# environments/dev/main.tf
module "vpc" {
  source = "git::https://github.com/myorg/terraform-aws-vpc.git?ref=v2.0.0"
  # ...
}

# Stage 2: After dev is stable, upgrade staging
# environments/staging/main.tf
module "vpc" {
  source = "git::https://github.com/myorg/terraform-aws-vpc.git?ref=v2.0.0"
  # ...
}

# Stage 3: After staging is stable (wait at least a week), upgrade production
# environments/production/main.tf
module "vpc" {
  source = "git::https://github.com/myorg/terraform-aws-vpc.git?ref=v2.0.0"
  # ...
}
```

## Handling Variable Changes

When a module version changes its variable interface:

```hcl
# v1 had separate variables
module "vpc" {
  source = "git::https://github.com/myorg/terraform-aws-vpc.git?ref=v1.0.0"

  public_subnet_a_cidr = "10.0.1.0/24"
  public_subnet_b_cidr = "10.0.2.0/24"
}

# v2 consolidated into a list
module "vpc" {
  source = "git::https://github.com/myorg/terraform-aws-vpc.git?ref=v2.0.0"

  public_subnet_cidrs = ["10.0.1.0/24", "10.0.2.0/24"]
}
```

## Automated Upgrade Testing

Build automation to test module upgrades before applying them to real infrastructure.

```yaml
# .github/workflows/module-upgrade-test.yml
name: Test Module Upgrade

on:
  pull_request:
    paths:
      - '**/*.tf'

jobs:
  test-upgrade:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      # Initialize with the new module version
      - name: Init
        run: terraform init -upgrade

      # Plan and check for unexpected changes
      - name: Plan
        id: plan
        run: terraform plan -no-color -detailed-exitcode 2>&1 | tee plan-output.txt
        continue-on-error: true

      # Check for destructive changes
      - name: Check for destroys
        run: |
          if grep -q "will be destroyed" plan-output.txt; then
            echo "WARNING: Plan includes resource destruction!"
            grep "will be destroyed" plan-output.txt
            # Fail the check if production
            if [[ "${{ github.base_ref }}" == "production" ]]; then
              exit 1
            fi
          fi

      # Post plan output as PR comment
      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('plan-output.txt', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '## Terraform Plan\n```\n' + plan.substring(0, 65000) + '\n```'
            });
```

## State Locking During Upgrades

Always ensure state is locked during upgrade operations to prevent concurrent modifications.

```bash
# Verify state locking is working
terraform plan  # This acquires and releases a lock

# If you need to force-unlock after a failed operation
terraform force-unlock LOCK_ID
```

## Best Practices Summary

1. **Always read the changelog** before upgrading any module version.
2. **Back up state** before starting the upgrade process.
3. **Use moved blocks** instead of manual `terraform state mv` when possible.
4. **Test in development first** and wait before upgrading production.
5. **Never skip major versions** - upgrade v1 to v2, then v2 to v3, not v1 directly to v3.
6. **Pin exact versions** in production to prevent accidental upgrades.
7. **Automate upgrade testing** in your CI/CD pipeline to catch issues early.

## Conclusion

Module upgrades do not have to be stressful. With proper planning, state backups, moved blocks, and staged rollouts, you can upgrade modules safely even in production. The key is to always understand what changed, plan before applying, and have a rollback strategy ready. Treat module upgrades like any other production change - test thoroughly and deploy carefully.

For related topics, see our posts on [how to migrate from inline resources to modules in Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-migrate-from-inline-resources-to-modules-in-terraform/view) and [how to version Terraform modules with Git tags](https://oneuptime.com/blog/post/2026-02-23-how-to-version-terraform-modules-with-git-tags/view).
