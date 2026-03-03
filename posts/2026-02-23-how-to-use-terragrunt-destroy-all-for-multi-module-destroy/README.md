# How to Use Terragrunt destroy-all for Multi-Module Destroy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terragrunt, Infrastructure as Code, DevOps, Teardown, Multi-Module, Automation

Description: Learn how to use Terragrunt destroy-all and run-all destroy to safely tear down multi-module infrastructure in the correct reverse dependency order.

---

Tearing down infrastructure is the reverse of deploying it, and getting the order wrong can leave you with orphaned resources, dangling references, and broken state. Terragrunt's `destroy-all` command (now `run-all destroy`) handles this by reversing the dependency graph and destroying modules in the correct order.

## destroy-all vs run-all destroy

Like the other legacy commands, `destroy-all` has been replaced by `run-all`:

```bash
# Legacy (deprecated, still works)
terragrunt destroy-all

# Modern (recommended)
terragrunt run-all destroy
```

## How Reverse Ordering Works

When you apply, dependencies are applied first:

```text
Apply order: vpc -> rds -> ecs -> app
```

When you destroy, the order is reversed - dependents are destroyed first:

```text
Destroy order: app -> rds, ecs (parallel) -> vpc
```

This is critical because you cannot destroy a VPC while an RDS instance is still using its subnets. Terragrunt automatically figures out the correct reverse order from your `dependency` and `dependencies` blocks.

## Basic Usage

```bash
# Destroy all modules in the dev environment
cd live/dev
terragrunt run-all destroy
```

You will see a confirmation prompt:

```text
WARNING: Are you sure you want to run 'terragrunt destroy' in each folder of the stack described above?
There is no undo!
  Module /path/to/live/dev/app
  Module /path/to/live/dev/ecs
  Module /path/to/live/dev/rds
  Module /path/to/live/dev/vpc

Type 'yes' to confirm:
```

Notice the modules are listed in destroy order - `app` first, `vpc` last.

## Non-Interactive Destroy

For automated teardowns (like cleaning up CI/CD test environments):

```bash
# Auto-approve the destroy
terragrunt run-all destroy --terragrunt-non-interactive
```

Be very careful with this. There is no undo.

## Practical Use Cases

### Tearing Down Test Environments

The most common use case is cleaning up ephemeral environments after testing:

```bash
# Tear down the feature branch environment
cd live/feature-branch-123
terragrunt run-all destroy --terragrunt-non-interactive

# Remove the directory after destroy
rm -rf live/feature-branch-123
```

### Scheduled Environment Cleanup

Some teams spin up dev environments during business hours and tear them down at night:

```bash
#!/bin/bash
# destroy-dev.sh - runs on a cron schedule

cd /path/to/live/dev-ephemeral
terragrunt run-all destroy \
  --terragrunt-non-interactive \
  --terragrunt-parallelism 2 \
  2>&1 | tee /var/log/terraform/destroy-$(date +%Y%m%d).log
```

### Cleaning Up Before Restructuring

When reorganizing your Terragrunt structure, you may need to destroy and recreate modules:

```bash
# Destroy the old structure
cd live/dev/old-structure
terragrunt run-all destroy --terragrunt-non-interactive

# Now apply the new structure
cd live/dev/new-structure
terragrunt run-all apply --terragrunt-non-interactive
```

## Selective Destroy

You usually do not want to destroy everything. Use filters to target specific modules:

```bash
# Only destroy application modules, keep infrastructure
terragrunt run-all destroy \
  --terragrunt-include-dir "*/app" \
  --terragrunt-include-dir "*/worker" \
  --terragrunt-non-interactive

# Destroy everything except the VPC and database
terragrunt run-all destroy \
  --terragrunt-exclude-dir "*/vpc" \
  --terragrunt-exclude-dir "*/rds" \
  --terragrunt-non-interactive
```

### Destroying a Single Module

For surgical removal:

```bash
# Destroy just the monitoring stack
cd live/dev/monitoring
terragrunt destroy
```

This destroys only that module. If other modules depend on it, those dependencies are not affected (though they may break on the next apply if they reference destroyed outputs).

## Handling Destroy Failures

### Resources with Deletion Protection

Many production resources have deletion protection enabled:

```hcl
# modules/rds/main.tf
resource "aws_db_instance" "this" {
  # ...
  deletion_protection = var.enable_deletion_protection
}
```

If you try to destroy a module with deletion-protected resources, Terraform will fail. You have two options:

Option 1: Disable protection before destroying:

```bash
# First, disable deletion protection
cd live/dev/rds
terragrunt apply -var="enable_deletion_protection=false"

# Then destroy
terragrunt destroy
```

Option 2: Override the variable during destroy:

```bash
cd live/dev/rds
terragrunt destroy -var="enable_deletion_protection=false"
```

### Resources That Take a Long Time to Destroy

Some resources (like RDS instances with final snapshots or CloudFront distributions) take a long time to destroy. Increase the timeout:

```bash
# The default timeout is 2 minutes per module
# Use Terraform's own timeout configuration in the resource
```

### Dependent Resources Outside Terragrunt

If there are resources outside your Terragrunt project that depend on resources inside it (manually created security group rules, for example), the destroy will fail. Clean up those external dependencies first.

## Destroy with State Manipulation

Sometimes you need to remove a module from Terragrunt management without destroying the actual resources:

```bash
# Remove all resources from state without destroying them
cd live/dev/app
terragrunt state list | xargs -I {} terragrunt state rm {}
```

This removes the resources from Terraform's tracking. The actual cloud resources remain untouched. This is useful when migrating resources to a different state or module.

## CI/CD Pipeline for Destroy

```yaml
# GitHub Actions - Destroy ephemeral environment
name: Cleanup PR Environment

on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::111111111111:role/GitHubDeployRole
          aws-region: us-east-1

      - name: Destroy PR environment
        run: |
          BRANCH_SLUG=$(echo "${{ github.head_ref }}" | tr '/' '-' | tr '[:upper:]' '[:lower:]')
          if [ -d "live/pr-${BRANCH_SLUG}" ]; then
            cd "live/pr-${BRANCH_SLUG}"
            terragrunt run-all destroy \
              --terragrunt-non-interactive \
              --terragrunt-parallelism 2
          fi
```

## Safety Measures

### Dry Run First

Always plan the destroy before executing:

```bash
# See what will be destroyed
cd live/dev
terragrunt run-all plan -destroy

# If it looks correct, proceed
terragrunt run-all destroy --terragrunt-non-interactive
```

The `plan -destroy` command shows you exactly what will be removed without doing it.

### State Backup

Back up state files before destroying:

```bash
# Download state for all modules
cd live/dev
for dir in $(find . -name terragrunt.hcl -not -path "./.terragrunt-cache/*" -exec dirname {} \;); do
  echo "Backing up state for $dir"
  cd "$dir"
  terragrunt state pull > "state-backup-$(date +%Y%m%d).json"
  cd -
done
```

### Prevent Accidental Production Destroy

Add a safeguard in your root configuration:

```hcl
# Root terragrunt.hcl

locals {
  env_config  = read_terragrunt_config(find_in_parent_folders("env.hcl"))
  environment = local.env_config.locals.environment
}

# Prevent destroy in production
terraform {
  before_hook "prevent_prod_destroy" {
    commands = ["destroy"]
    execute  = ["bash", "-c",
      "if [ '${local.environment}' = 'prod' ]; then echo 'DESTROY BLOCKED: Cannot destroy production environment'; exit 1; fi"
    ]
  }
}
```

This hook blocks any destroy command in the production environment.

## Destroy Order Edge Cases

### Circular-ish Dependencies

If module A depends on module B and module B has a `dependencies` block pointing to A, Terragrunt will detect the cycle and error. Make sure your dependency graph is a DAG (directed acyclic graph).

### Modules with No Dependencies

Modules with no declared dependencies can be destroyed in any order. During `run-all destroy`, they are destroyed after all modules that depend on them.

### Cross-Environment Dependencies

If a module in dev depends on a module in shared:

```hcl
dependency "hub_vpc" {
  config_path = "../../shared/vpc"
}
```

Running `run-all destroy` from the dev directory will not destroy the shared VPC (it is outside the directory scope). But be aware that destroying the dev module may break the reference.

## Conclusion

`run-all destroy` is a powerful and potentially dangerous command. It correctly handles reverse dependency ordering, which is the hard part of infrastructure teardown. Use it for cleaning up test and ephemeral environments, and always plan the destroy first to review what will be removed.

For production environments, prefer destroying individual modules with careful review rather than blanket `run-all destroy`. Add safeguards like the pre-hook shown above to prevent accidental production teardowns.

For the broader context on multi-module operations, see [How to Use Terragrunt run-all Command](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terragrunt-run-all-command/view).
