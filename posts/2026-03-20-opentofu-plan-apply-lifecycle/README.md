# How to Explain OpenTofu Plan and Apply Lifecycle

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Plan, Apply, Lifecycle, Concept, Infrastructure as Code

Description: Understand the complete OpenTofu plan and apply lifecycle, from reading configuration to making cloud API calls.

## Introduction

Every OpenTofu operation follows a well-defined lifecycle. Understanding the stages of `tofu plan` and `tofu apply` helps you predict behavior, debug issues, and build reliable automation. The plan/apply separation is one of OpenTofu's most important safety features.

## The Full Lifecycle

```hcl
tofu plan lifecycle:

1. Load Configuration
   - Read all .tf and .tofu files
   - Parse HCL syntax
   - Validate configuration structure

2. Initialize Providers
   - Start provider binaries
   - Authenticate with cloud APIs

3. Refresh State (optional, default enabled)
   - Read current state file
   - Query cloud APIs for actual resource states
   - Detect drift between state and reality

4. Build Dependency Graph
   - Resolve all resource references
   - Determine creation/update order

5. Calculate Diff
   - Compare desired state (config) vs current state
   - Determine: create, update, replace, or destroy

6. Output Plan
   - Display planned changes
   - Save plan to file if -out flag used
```

## Stage 1: Configuration Loading

```bash
# OpenTofu reads all .tf files in the current directory

tofu plan

# You can specify variables at plan time
tofu plan -var="environment=prod" -var-file="prod.tfvars"

# Use a specific directory (-chdir is a global flag, placed before the subcommand)
tofu -chdir=environments/prod plan
```

## Stage 2: Plan Output Explained

Understanding the symbols in plan output.

```hcl
+ resource will be created
- resource will be destroyed
~ resource will be updated in-place
-/+ resource will be destroyed and recreated (replacement)
<= data source will be read

# Example plan output:
  # aws_s3_bucket.new will be created
  + resource "aws_s3_bucket" "new" {
      + bucket = "my-new-bucket"
      + region = (known after apply)
    }

  # aws_s3_bucket.existing will be updated in-place
  ~ resource "aws_s3_bucket" "existing" {
      ~ tags = {
          + "Team" = "platform"
        }
    }

Plan: 1 to add, 1 to change, 0 to destroy.
```

## Stage 3: Saving and Using Plan Files

Save a plan to ensure apply matches exactly what was reviewed.

```bash
# Save the plan to a binary file
tofu plan -out=reviewed-plan.tfplan

# Show the saved plan in human-readable format
tofu show reviewed-plan.tfplan

# Apply exactly the saved plan (no confirmation needed)
tofu apply reviewed-plan.tfplan
```

## Stage 4: Apply Lifecycle

```bash
# Interactive apply (shows plan, prompts for confirmation)
tofu apply

# Apply with auto-approval (CI/CD environments)
tofu apply -auto-approve

# Apply a saved plan file
tofu apply reviewed-plan.tfplan

# Apply with parallelism control (default is 10)
tofu apply -parallelism=5  # slower but less API pressure
```

## Stage 5: Apply Execution Order

OpenTofu respects the dependency graph when creating resources.

```text
Dependency graph resolution example:

aws_vpc.main
  └── aws_subnet.public (depends on VPC)
        └── aws_security_group.web (depends on VPC)
              └── aws_instance.web (depends on subnet + security group)

Apply order:
1. aws_vpc.main (created first, no dependencies)
2. aws_subnet.public + aws_security_group.web (created in parallel)
3. aws_instance.web (created last, after dependencies)
```

## Refresh vs Plan

Understanding when state refresh occurs.

```bash
# Standard plan: refreshes state from cloud APIs before planning
tofu plan  # queries all resources in state

# Skip refresh (faster, uses cached state)
tofu plan -refresh=false  # useful when APIs are slow

# Refresh only (update state without planning)
tofu apply -refresh-only  # syncs state to match reality
```

## Destroy Lifecycle

```bash
# Plan a destroy (shows what will be deleted)
tofu plan -destroy

# Apply a destroy (requires confirmation by default)
tofu destroy

# Destroy with auto-approval (use with caution)
tofu destroy -auto-approve

# Destroy only specific resources
tofu destroy -target=aws_s3_bucket.temp
```

## Summary

The OpenTofu plan/apply lifecycle gives you a safe, auditable path from configuration to infrastructure. Always review plans before applying, save plan files for production environments to ensure consistency between review and execution, and understand that OpenTofu refreshes state, builds a dependency graph, and calculates the minimal set of changes needed before making any API calls.
